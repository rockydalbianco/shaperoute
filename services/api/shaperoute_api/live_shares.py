"""«Share live activity» (TASK-424, ADR-0352, docs/API.md, «Live shares»): a
link that shows a recording live, on a page of the site, to whoever has it,
without the app or an account.

POST /me/live-shares makes the link: a random token of 128 bits, kept only
as its SHA-256, given back once inside the page's address
(`https://getmuw.app/live/#<token>`). A new link stops the account's links
of activities not finished yet. At most MAX_SHARES_PER_DAY a day.

POST /me/live-shares/{id}/updates is what the phone sends every 15 s: the
new points, the numbers of the moment and whether the activity goes on, is
paused or is finished. The first «finished» leaves the link one hour more
(AFTER_FINISH), with its summary; no link lasts more than LINK_LIFE.

DELETE /me/live-shares/{id} stops it: the link shows nothing from then on,
and its points and numbers are deleted at once.

GET /live?t=<token>&after=<seq> is the page's, open without the API key
(access.OPEN_PATHS): what the link shows, with the points after `after`.
The token goes in the query, which the access log does not write
(ADR-0096); the answer may be read by the site only (SITE_ORIGIN). An
unknown token and an expired one answer the same.

LiveShareSweep deletes, every SWEEP_EVERY_S, the points and numbers of the
links that expired, and the rows a day later. The log never writes a
position (ADR-0092). Deleting the account deletes its links.
"""

from __future__ import annotations

import hashlib
import logging
import math
import re
import secrets
import threading
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request, Response
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from shaperoute_api.access import RateLimiter, refuse
from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import CLOCK_AHEAD, RunActivity
from shaperoute_api.db import Database
from shaperoute_api.schemas import ErrorBody

log = logging.getLogger(__name__)

SITE_ORIGIN = "https://getmuw.app"
# After the `#` the token never reaches the site's server nor a Referer.
LIVE_PAGE = f"{SITE_ORIGIN}/live/#"
TOKEN_BYTES = 16
# What secrets.token_urlsafe(TOKEN_BYTES) gives: 22 characters.
TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{22}$")
# The user's choices of 2026-11-09 (tasks/TASK-424.md).
LINK_LIFE = timedelta(hours=24)
AFTER_FINISH = timedelta(hours=1)
# The empty row of a link that ended, so its page can say it was stopped.
KEEP_ROW = timedelta(hours=24)
MAX_SHARES_PER_DAY = 20
MAX_POINTS_PER_UPDATE = 200
# A day at one point every 5 s is 17 280.
MAX_POINTS = 20_000
POINTS_PER_PAGE = 2_000
# A page asks every 10 s: a family of viewers stays far below.
VIEWS_PER_MINUTE = 120
# Points a little older than the link: the fix that came while it was made.
EARLY_POINT = timedelta(minutes=5)
SWEEP_EVERY_S = 300.0

UNKNOWN_SHARE = "No live share with this id."
SHARE_ENDED = "This live share has ended: make a new one."
TOO_MANY_SHARES = f"At most {MAX_SHARES_PER_DAY} live shares a day: try again tomorrow."
TOO_MANY_VIEWS = "Too many requests for this link in a minute: wait a moment."
POINT_OUT_OF_TIME = "A point is from before the link or from the future."

LiveState = Literal["live", "paused", "finished"]
LiveStatus = Literal["live", "paused", "finished", "stopped", "expired"]


def token_hash(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()


class LiveShareRequestBody(BaseModel):
    """POST /me/live-shares: packages/shared-types/fixtures/live-share-request.json."""

    model_config = ConfigDict(extra="forbid")

    activity: RunActivity
    pool_length_m: float | None = Field(
        default=None, ge=10, le=100, allow_inf_nan=False
    )
    """A swim in a pool: its pool, and the page shows lengths with no map."""


class LivePointBody(BaseModel):
    """A fix, exact as the phone took it."""

    model_config = ConfigDict(extra="forbid")

    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lon: float = Field(ge=-180, le=180, allow_inf_nan=False)
    at: AwareDatetime


class LiveStatsBody(BaseModel):
    """The numbers of the moment, as the recording screen has them. The page
    works out the average pace or speed from distance and time."""

    model_config = ConfigDict(extra="forbid")

    distance_m: int = Field(default=0, ge=0, le=2_000_000)
    duration_s: int = Field(default=0, ge=0, le=200_000)
    """Without the pauses, at the time of the update."""
    climb_m: int | None = Field(default=None, ge=0, le=50_000)
    kcal: int | None = Field(default=None, ge=0, le=50_000)
    heart_bpm: int | None = Field(default=None, ge=25, le=250)
    """From a watch, when it sends it: shown, the user's choice 3."""
    lengths: int | None = Field(default=None, ge=0, le=1_000)
    """A swim in a pool: the lengths the app estimates."""
    exercise: str | None = Field(default=None, min_length=1, max_length=80)
    """At the gym: the exercise in progress."""
    # A paragliding flight (TASK-305 parts R, ADR-0375, the user's choice
    # «Sì, numeri del volo»): the numbers of the flight. Optional, so an app
    # that does not send them and a page that does not read them work as
    # before; a server without them refuses them (extra="forbid"), so the
    # server goes out before the app and the page.
    alt_m: int | None = Field(default=None, ge=-500, le=9_000)
    """The height now, metres above the sea, from the phone's fixes."""
    max_alt_m: int | None = Field(default=None, ge=-500, le=9_000)
    """The highest so far."""
    vario_mps: float | None = Field(default=None, ge=-30, le=30, allow_inf_nan=False)
    """Climbing (+) or sinking (-), metres a second, over the last seconds."""
    speed_mps: float | None = Field(default=None, ge=0, le=100, allow_inf_nan=False)
    """The speed over the ground now, metres a second."""


class LiveUpdateBody(BaseModel):
    """POST /me/live-shares/{id}/updates: fixtures/live-share-update.json."""

    model_config = ConfigDict(extra="forbid")

    points: list[LivePointBody] = Field(
        default_factory=list, max_length=MAX_POINTS_PER_UPDATE
    )
    stats: LiveStatsBody
    state: LiveState


class LiveShareCreatedBody(BaseModel):
    """The new link: `url` carries the token, never given again."""

    id: str
    url: str
    expires_at: datetime


class LiveShareBody(BaseModel):
    """A link as its owner sees it after an update."""

    id: str
    status: LiveStatus
    expires_at: datetime


class LiveViewBody(BaseModel):
    """GET /live: what the page shows. For a link stopped, expired or never
    made, only `status`. `points` are [lat, lon, epoch seconds]."""

    status: LiveStatus
    activity: str | None = None
    pool_length_m: float | None = None
    started_at: datetime | None = None
    updated_at: datetime | None = None
    finished_at: datetime | None = None
    expires_at: datetime | None = None
    stats: LiveStatsBody | None = None
    points: list[tuple[float, float, float]] = Field(default_factory=list)
    last_seq: int = 0
    """The `after` of the next request."""
    more: bool = False
    """More points than one answer holds: ask again at once."""


def _status(row: DictRow, now: datetime) -> LiveStatus:
    if row["stopped_at"] is not None:
        return "stopped"
    if now >= row["expires_at"]:
        return "expired"
    if row["finished_at"] is not None:
        return "finished"
    return "paused" if row["paused"] else "live"


SHARE_COLUMNS = (
    "id, user_id, activity, pool_length_m::float8 AS pool_length_m, created_at,"
    " expires_at, finished_at, stopped_at, paused, stats, updated_at"
)


@dataclass
class LiveShares:
    """The live links, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]

    def create(self, user_id: int, body: LiveShareRequestBody) -> LiveShareCreatedBody:
        now = self.now()
        token = secrets.token_urlsafe(TOKEN_BYTES)
        pool = body.pool_length_m if body.activity == "swimming" else None
        with self.database.connect() as conn:
            # One account's links change one at a time: the count is right.
            conn.execute("SELECT 1 FROM users WHERE id = %s FOR UPDATE", (user_id,))
            made = conn.execute(
                "SELECT count(*) AS n FROM live_shares"
                " WHERE user_id = %s AND created_at > %s",
                (user_id, now - timedelta(days=1)),
            ).fetchone()
            assert made is not None
            if made["n"] >= MAX_SHARES_PER_DAY:
                raise AccountError(429, "too_many_requests", TOO_MANY_SHARES)
            # The links of earlier activities never finished: one at a time.
            open_ids = [
                r["id"]
                for r in conn.execute(
                    "SELECT id FROM live_shares WHERE user_id = %s"
                    " AND stopped_at IS NULL AND finished_at IS NULL"
                    " AND expires_at > %s",
                    (user_id, now),
                ).fetchall()
            ]
            for share_id in open_ids:
                _stop(conn, share_id, now)
            row = conn.execute(
                "INSERT INTO live_shares (user_id, token_hash, activity,"
                " pool_length_m, created_at, expires_at)"
                " VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, expires_at",
                (
                    user_id,
                    token_hash(token),
                    body.activity,
                    None if pool is None else round(pool, 2),
                    now,
                    now + LINK_LIFE,
                ),
            ).fetchone()
            assert row is not None
        return LiveShareCreatedBody(
            id=str(row["id"]), url=LIVE_PAGE + token, expires_at=row["expires_at"]
        )

    def _owned(self, conn: Any, user_id: int, share_id: str) -> DictRow:
        try:
            wanted = UUID(share_id)
        except ValueError:
            raise HTTPException(404, UNKNOWN_SHARE) from None
        row: DictRow | None = conn.execute(
            f"SELECT {SHARE_COLUMNS} FROM live_shares"
            " WHERE id = %s AND user_id = %s FOR UPDATE",
            (wanted, user_id),
        ).fetchone()
        if row is None:
            raise HTTPException(404, UNKNOWN_SHARE)
        return row

    def update(
        self, user_id: int, share_id: str, body: LiveUpdateBody
    ) -> LiveShareBody:
        """410 once the link has ended: stopped, expired or finished."""
        now = self.now()
        with self.database.connect() as conn:
            row = self._owned(conn, user_id, share_id)
            if _status(row, now) in ("stopped", "expired", "finished"):
                raise HTTPException(410, SHARE_ENDED)
            earliest = row["created_at"] - EARLY_POINT
            if any(not earliest <= p.at <= now + CLOCK_AHEAD for p in body.points):
                raise AccountError(422, "invalid_request", POINT_OUT_OF_TIME)
            kept = conn.execute(
                "SELECT count(*) AS n FROM live_share_points WHERE share_id = %s",
                (row["id"],),
            ).fetchone()
            assert kept is not None
            room = max(0, MAX_POINTS - kept["n"])
            points = body.points[:room]
            if points:
                with conn.cursor() as cur:
                    cur.executemany(
                        "INSERT INTO live_share_points (share_id, lat, lon, at)"
                        " VALUES (%s, %s, %s, %s)",
                        [(row["id"], p.lat, p.lon, p.at) for p in points],
                    )
            finished = body.state == "finished"
            expires_at = (
                min(row["expires_at"], now + AFTER_FINISH)
                if finished
                else row["expires_at"]
            )
            updated = conn.execute(
                "UPDATE live_shares SET stats = %s, updated_at = %s, paused = %s,"
                " finished_at = %s, expires_at = %s WHERE id = %s"
                f" RETURNING {SHARE_COLUMNS}",
                (
                    Jsonb(body.stats.model_dump(exclude_none=True)),
                    now,
                    body.state == "paused",
                    now if finished else None,
                    expires_at,
                    row["id"],
                ),
            ).fetchone()
            assert updated is not None
        return LiveShareBody(
            id=str(updated["id"]),
            status=_status(updated, now),
            expires_at=updated["expires_at"],
        )

    def stop(self, user_id: int, share_id: str) -> None:
        """Stopped twice, stopped once."""
        now = self.now()
        with self.database.connect() as conn:
            row = self._owned(conn, user_id, share_id)
            if row["stopped_at"] is None:
                _stop(conn, row["id"], now)

    def view(self, token: str, after: int) -> LiveViewBody:
        now = self.now()
        if not TOKEN_PATTERN.match(token):
            return LiveViewBody(status="expired")
        with self.database.connect() as conn:
            row = conn.execute(
                f"SELECT {SHARE_COLUMNS} FROM live_shares WHERE token_hash = %s",
                (token_hash(token),),
            ).fetchone()
            if row is None:
                return LiveViewBody(status="expired")
            status = _status(row, now)
            if status in ("stopped", "expired"):
                return LiveViewBody(status=status)
            points = conn.execute(
                "SELECT id, lat, lon, extract(epoch FROM at)::float8 AS t"
                " FROM live_share_points WHERE share_id = %s AND id > %s"
                " ORDER BY id LIMIT %s",
                (row["id"], after, POINTS_PER_PAGE + 1),
            ).fetchall()
        more = len(points) > POINTS_PER_PAGE
        points = points[:POINTS_PER_PAGE]
        return LiveViewBody(
            status=status,
            activity=row["activity"],
            pool_length_m=row["pool_length_m"],
            started_at=row["created_at"],
            updated_at=row["updated_at"],
            finished_at=row["finished_at"],
            expires_at=row["expires_at"],
            stats=None if row["stats"] is None else LiveStatsBody(**row["stats"]),
            points=[(p["lat"], p["lon"], p["t"]) for p in points],
            last_seq=points[-1]["id"] if points else after,
            more=more,
        )

    def sweep(self) -> int:
        """The points and numbers of the links that ended, then the empty
        rows a day later: how many points went."""
        now = self.now()
        with self.database.connect() as conn:
            conn.execute(
                "UPDATE live_shares SET stats = NULL"
                " WHERE expires_at <= %s AND stats IS NOT NULL",
                (now,),
            )
            gone = conn.execute(
                "DELETE FROM live_share_points p USING live_shares s"
                " WHERE p.share_id = s.id AND s.expires_at <= %s",
                (now,),
            ).rowcount
            conn.execute(
                "DELETE FROM live_shares WHERE expires_at <= %s", (now - KEEP_ROW,)
            )
        return gone


def _stop(conn: Any, share_id: UUID, now: datetime) -> None:
    """The link shows nothing from now on; its points and numbers go."""
    conn.execute("DELETE FROM live_share_points WHERE share_id = %s", (share_id,))
    conn.execute(
        "UPDATE live_shares SET stopped_at = %s, expires_at = greatest(created_at, %s),"
        " stats = NULL, updated_at = %s WHERE id = %s",
        (now, now, now, share_id),
    )


class LiveShareSweep:
    """`sweep` every SWEEP_EVERY_S, in a thread of its own, while the app
    serves: started and stopped around its lifespan (install_live_shares),
    so it never runs on a database already closed."""

    def __init__(self, shares: LiveShares, every_s: float = SWEEP_EVERY_S) -> None:
        self.shares = shares
        self.every_s = every_s
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread is not None:
            return
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._run, name="live-shares", daemon=True
        )
        self._thread.start()

    def stop(self) -> None:
        """No more rounds; one under way ends before this returns."""
        self._stop.set()
        thread, self._thread = self._thread, None
        if thread is not None:
            thread.join()

    def _run(self) -> None:
        while not self._stop.wait(self.every_s):
            try:
                gone = self.shares.sweep()
                if gone:
                    log.info("live shares: %d point(s) deleted", gone)
            except Exception:
                log.exception("live shares: the round failed")


# --- The endpoints ---


def live_shares_of(
    accounts: Annotated[Accounts, Depends(accounts_of)],
) -> LiveShares:
    """In the database of the accounts, on the same clock."""
    return LiveShares(accounts.database, accounts.now)


Shares = Annotated[LiveShares, Depends(live_shares_of)]
Me = Annotated[UserBody, Depends(current_user)]

# The page is on the site, the API on its own host: only the site reads it.
VIEW_HEADERS = {
    "Access-Control-Allow-Origin": SITE_ORIGIN,
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
}


def live_share_routes() -> APIRouter:
    router = APIRouter(tags=["live"], responses=ACCOUNT_ERRORS)

    @router.post("/me/live-shares", status_code=201)
    def create_live_share(
        body: LiveShareRequestBody, shares: Shares, user: Me
    ) -> LiveShareCreatedBody:
        return shares.create(user.id, body)

    @router.post(
        "/me/live-shares/{share_id}/updates",
        responses={404: {"model": ErrorBody}, 410: {"model": ErrorBody}},
    )
    def update_live_share(
        share_id: str, body: LiveUpdateBody, shares: Shares, user: Me
    ) -> LiveShareBody:
        return shares.update(user.id, share_id, body)

    @router.delete(
        "/me/live-shares/{share_id}",
        status_code=204,
        responses={404: {"model": ErrorBody}},
    )
    def stop_live_share(share_id: str, shares: Shares, user: Me) -> Response:
        shares.stop(user.id, share_id)
        return Response(status_code=204)

    @router.get(
        "/live", response_model=LiveViewBody, responses={429: {"model": ErrorBody}}
    )
    def view_live_share(
        request: Request,
        response: Response,
        shares: Shares,
        t: Annotated[str, Query(max_length=64)],
        after: Annotated[int, Query(ge=0)] = 0,
    ) -> Any:
        limiter: RateLimiter = request.app.state.live_view_limiter
        wait = limiter.wait_s(token_hash(t).hex())
        if wait > 0:
            # With the site's headers, so the page reads it and waits.
            return refuse(
                429,
                "too_many_requests",
                TOO_MANY_VIEWS,
                **VIEW_HEADERS,
                **{"Retry-After": str(math.ceil(wait))},
            )
        response.headers.update(VIEW_HEADERS)
        return shares.view(t, after)

    return router


def install_live_shares(app: FastAPI) -> None:
    """After install_accounts. Without a database the endpoints answer 503,
    as the others of the accounts, and there is no round. With one, the
    round runs only while the app serves: started and stopped around the
    app's lifespan, before the database closes."""
    app.state.live_view_limiter = RateLimiter(VIEWS_PER_MINUTE)
    accounts: Accounts | None = app.state.accounts
    if accounts is not None:
        sweep = LiveShareSweep(LiveShares(accounts.database, accounts.now))
        app.state.live_share_sweep = sweep
        _around_lifespan(app, sweep)
    app.include_router(live_share_routes())


def _around_lifespan(app: FastAPI, sweep: LiveShareSweep) -> None:
    inner = app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(app_: FastAPI) -> AsyncIterator[Any]:
        async with inner(app_) as state:
            sweep.start()
            try:
                yield state
            finally:
                sweep.stop()

    app.router.lifespan_context = lifespan
