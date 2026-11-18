"""The planned lives and the Feed's row of lives (TASK-468 part A2a,
ADR-0381, docs/API.md «Planned lives»).

A planned live is a live share made in advance, a race say: an activity, a
title, a day and time, who may follow it (the owner's followers or everyone
with an account) and whether they see the heart rate. Its owner starts it
from an hour before to three hours after its time (the user's choice 3):
POST /me/planned-lives/{id}/start makes its live share, with its audience,
and the share keeps the planned live's id. Once the activity is saved and
posted, PUT /me/planned-lives/{id}/post ties the post to it (choice 5) and
the row shows the post instead.

GET /lives is the Feed's row: one's own lives and those of the accounts one
follows (the user's choice 7: never a stranger's, even «everyone»), planned
or going on, together with the shares put in the Feed without planning
(«Live in the Feed», choice 6). The ones going on first, the latest first;
then the planned ones, the soonest first; a page at a time.

«Remind me» keeps who wants to be told when a live starts; the push comes
with part A2b. Never a position here: the points stay with the share.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from psycopg.rows import DictRow
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import RunActivity
from shaperoute_api.comment_filter import check_comment
from shaperoute_api.comments import CommentRejected
from shaperoute_api.db import Database
from shaperoute_api.follows import (
    MAX_PAGE_SIZE,
    NO_PROFILE,
    PAGE_SIZE,
    PersonBody,
    _account,
    _apart,
    _person,
    apart_sql,
    follows_sql,
)
from shaperoute_api.group_runs import _text
from shaperoute_api.live_shares import (
    LiveShareCreatedBody,
    LiveShareRequestBody,
    _status,
    insert_share,
)
from shaperoute_api.push import Pusher, PushEvent
from shaperoute_api.schemas import ErrorBody

log = logging.getLogger(__name__)

MAX_TITLE = 60
# When a live may be planned for, from the moment it is made or moved.
LATEST = timedelta(days=60)
# The user's choice 3: the start from an hour before to three hours after.
EARLY_START = timedelta(hours=1)
OVER_AFTER = timedelta(hours=3)
# Planned lives not over, per account: against spam.
MAX_UPCOMING = 10
# The lives of a profile: few by nature (MAX_UPCOMING and one going on).
PROFILE_SIZE = MAX_UPCOMING + 5
# Where a page of the row ended: 0 for the lives going on, 1 for the
# planned ones; a microsecond key (negative for the going on, latest
# first); the live's id.
CURSOR_PATTERN = r"^[01]_-?\d{1,17}_[0-9a-f]{32}$"

Audience = Literal["followers", "everyone"]
LiveItemState = Literal["planned", "live", "paused", "finished", "ended"]

NO_PLANNED_LIVE = "No planned live with this id."
TITLE_WRONG = f"A title is 1 to {MAX_TITLE} characters, on one line."
WHEN_WRONG = "A live is planned from now to 60 days ahead."
TOO_MANY = f"You can have {MAX_UPCOMING} planned lives at most."
STARTED = "The live has started: it cannot change any more."
NOT_NOW = "A planned live starts from an hour before its time to three hours after."
GOING_ON = "This live is already going on."
NO_POST = "No post of yours with this id."


# --- The bodies ---


class PlannedLiveRequestBody(BaseModel):
    """POST /me/planned-lives: fixtures/planned-live-request.json."""

    model_config = ConfigDict(extra="forbid")

    activity: RunActivity
    title: str = Field(max_length=200)
    starts_at: AwareDatetime
    audience_feed: Audience = "followers"
    heart_visible: bool = False


class PlannedLiveChangeBody(BaseModel):
    """PUT /me/planned-lives/{id}: what is given changes, before the start."""

    model_config = ConfigDict(extra="forbid")

    activity: RunActivity | None = None
    title: str | None = Field(default=None, max_length=200)
    starts_at: AwareDatetime | None = None
    audience_feed: Audience | None = None
    heart_visible: bool | None = None


class PlannedLiveStartBody(BaseModel):
    """POST /me/planned-lives/{id}/start: the share is made without its link
    unless asked (the Feed is what a planned live is for)."""

    model_config = ConfigDict(extra="forbid")

    link: bool = False
    pool_length_m: float | None = Field(
        default=None, ge=10, le=100, allow_inf_nan=False
    )


class PlannedLivePostBody(BaseModel):
    """PUT /me/planned-lives/{id}/post: the post the live became."""

    model_config = ConfigDict(extra="forbid")

    drawing_id: UUID


class LiveItemBody(BaseModel):
    """A live in the Feed's row, on a profile or on its own:
    packages/shared-types/fixtures/planned-live.json."""

    id: str
    """The planned live's id; for a live put in the Feed without planning,
    its share's id."""
    planned_live_id: str | None
    share_id: str | None
    """While going on or finished: GET /live-shares/{id} shows it."""
    owner: PersonBody
    activity: str
    title: str | None
    starts_at: datetime | None
    state: LiveItemState
    audience_feed: Audience
    heart_visible: bool
    distance_m: int | None = None
    duration_s: int | None = None
    """The last numbers of a live going on, for its card."""
    reminded: bool = False
    """The viewer asked «Remind me»."""
    can_start: bool = False
    """Only for its owner: now is between an hour before and three hours
    after, and it is not going on."""
    post_id: str | None = None


class LivesPageBody(BaseModel):
    """GET /lives: fixtures/lives-page.json."""

    lives: list[LiveItemBody]
    next: str | None
    """The `cursor` of the next page; null on the last."""


# --- In the SQL ---

# A planned live `pl` with its owner and its latest share `s` (none before
# the start), as the viewer %(viewer)s sees it.
PLANNED_SQL = (
    "SELECT pl.id AS item_id, pl.id AS planned_live_id, s.id AS share_id,"
    " pl.owner_id, u.public_id, u.username, p.jpeg, pl.activity, pl.title,"
    " pl.starts_at, pl.audience_feed, pl.heart_visible, pl.post_id,"
    " s.created_at, s.expires_at, s.finished_at, s.stopped_at, s.paused, s.stats,"
    " EXISTS (SELECT 1 FROM planned_live_reminders r"
    " WHERE r.planned_live_id = pl.id AND r.user_id = %(viewer)s) AS reminded"
    " FROM planned_lives pl JOIN users u ON u.id = pl.owner_id"
    " LEFT JOIN profile_photos p ON p.user_id = u.id"
    " LEFT JOIN LATERAL (SELECT * FROM live_shares s0"
    " WHERE s0.planned_live_id = pl.id ORDER BY s0.created_at DESC LIMIT 1) s"
    " ON TRUE"
)

# A share put in the Feed without planning.
SHARE_SQL = (
    "SELECT s.id AS item_id, NULL::uuid AS planned_live_id, s.id AS share_id,"
    " s.user_id AS owner_id, u.public_id, u.username, p.jpeg, s.activity,"
    " NULL::text AS title, NULL::timestamptz AS starts_at, s.audience_feed,"
    " s.heart_visible, NULL::uuid AS post_id, s.created_at, s.expires_at,"
    " s.finished_at, s.stopped_at, s.paused, s.stats, false AS reminded"
    " FROM live_shares s JOIN users u ON u.id = s.user_id"
    " LEFT JOIN profile_photos p ON p.user_id = u.id"
    " WHERE s.planned_live_id IS NULL AND s.audience_feed <> 'none'"
)

# The share `s` shows something still: going on, paused, finished this hour.
SHARE_ON = "(s.stopped_at IS NULL AND s.expires_at > %(now)s)"
# Not over: a planned live not posted, before its three hours or with its
# share still on.
PLANNED_ON = (
    "(pl.post_id IS NULL AND ((s.id IS NULL AND pl.starts_at > %(over_before)s)"
    f" OR (s.id IS NOT NULL AND {SHARE_ON})))"
)


def seen_sql(owner: str, audience: str) -> str:
    """An SQL condition: the viewer %(viewer)s may see a live of `owner`
    for `audience`: its own, or not kept apart and (everyone or a
    follower)."""
    return (
        f"({owner} = %(viewer)s OR (NOT {apart_sql('%(viewer)s', owner)}"
        f" AND ({audience} = 'everyone' OR {follows_sql('%(viewer)s', owner)})))"
    )


def mine_or_followed_sql(owner: str) -> str:
    """The row's accounts (the user's choice 7): one's own and those one
    follows, the request accepted, never across a block or a hidden one."""
    return (
        f"({owner} = %(viewer)s OR ({owner} IN (SELECT f.followed_id FROM follows f"
        " WHERE f.follower_id = %(viewer)s AND f.status = 'accepted')"
        f" AND NOT {apart_sql('%(viewer)s', owner)}))"
    )


# The order of the row: the going on first (rank 0), the latest first; then
# the planned ones (rank 1), the soonest first.
ORDER_SQL = (
    "CASE WHEN share_id IS NOT NULL AND stopped_at IS NULL"
    " AND expires_at > %(now)s THEN 0 ELSE 1 END"
)
KEY_SQL = (
    "CASE WHEN share_id IS NOT NULL AND stopped_at IS NULL"
    " AND expires_at > %(now)s"
    " THEN -((extract(epoch FROM created_at) * 1000000)::bigint)"
    " ELSE (extract(epoch FROM starts_at) * 1000000)::bigint END"
)


def _cursor(row: DictRow) -> str:
    item: UUID = row["item_id"]
    return f"{row['rank']}_{row['sort_key']}_{item.hex}"


def _after_cursor(cursor: str) -> tuple[int, int, UUID]:
    rank, key, item = cursor.split("_")
    return int(rank), int(key), UUID(item)


def _state(row: DictRow, now: datetime) -> LiveItemState:
    if row["share_id"] is not None:
        status = _status(row, now)
        if status in ("live", "paused", "finished"):
            return status
        return "ended"
    starts_at: datetime | None = row["starts_at"]
    if starts_at is not None and now < starts_at + OVER_AFTER:
        return "planned"
    return "ended"


def _can_start(row: DictRow, viewer_id: int, now: datetime) -> bool:
    starts_at: datetime | None = row["starts_at"]
    if row["owner_id"] != viewer_id or starts_at is None:
        return False
    if row["post_id"] is not None:
        return False
    if not starts_at - EARLY_START <= now <= starts_at + OVER_AFTER:
        return False
    return _state(row, now) in ("planned", "ended")


def _item(row: DictRow, viewer_id: int, now: datetime) -> LiveItemBody:
    state = _state(row, now)
    stats: dict[str, Any] = row["stats"] or {}
    going = state in ("live", "paused", "finished")
    return LiveItemBody(
        id=str(row["item_id"]),
        planned_live_id=(
            None if row["planned_live_id"] is None else str(row["planned_live_id"])
        ),
        share_id=str(row["share_id"]) if going else None,
        owner=_person(row),
        activity=row["activity"],
        title=row["title"],
        starts_at=row["starts_at"],
        state=state,
        audience_feed=row["audience_feed"],
        heart_visible=row["heart_visible"],
        distance_m=stats.get("distance_m") if going else None,
        duration_s=stats.get("duration_s") if going else None,
        reminded=row["reminded"],
        can_start=_can_start(row, viewer_id, now),
        post_id=None if row["post_id"] is None else str(row["post_id"]),
    )


def _title(value: str) -> str:
    title = _text(value, MAX_TITLE, TITLE_WRONG, needed=True) or ""
    reason = check_comment(title)
    if reason is not None:
        raise CommentRejected(reason)
    return title


def _check_when(starts_at: datetime, now: datetime) -> None:
    if not now <= starts_at <= now + LATEST:
        raise AccountError(422, "invalid_request", WHEN_WRONG)


def _reminded(conn: Any, row: DictRow) -> list[int]:
    """Who asked «Remind me» and may still see the live: not its owner,
    nobody kept apart from it, a follower for a live for the followers."""
    values = {"id": row["planned_live_id"], "owner": row["owner_id"]}
    follower = (
        "TRUE"
        if row["audience_feed"] == "everyone"
        else follows_sql("r.user_id", "%(owner)s")
    )
    found = conn.execute(
        "SELECT r.user_id FROM planned_live_reminders r"
        " WHERE r.planned_live_id = %(id)s AND r.user_id <> %(owner)s"
        f" AND NOT {apart_sql('r.user_id', '%(owner)s')} AND {follower}"
        " ORDER BY r.user_id",
        values,
    ).fetchall()
    return [r["user_id"] for r in found]


def _id(planned_live_id: str) -> UUID:
    try:
        return UUID(planned_live_id)
    except ValueError:
        raise AccountError(404, "http_error", NO_PLANNED_LIVE) from None


# --- In the database ---


@dataclass
class PlannedLives:
    """The planned lives, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]
    # The app's pusher, for «Remind me» (part A2b); None: nobody is told.
    pusher_of: Callable[[], Pusher | None] = lambda: None

    def _values(self, viewer_id: int, **more: Any) -> dict[str, Any]:
        now = self.now()
        return {
            "viewer": viewer_id,
            "now": now,
            "over_before": now - OVER_AFTER,
            **more,
        }

    def _own(self, conn: Any, user_id: int, planned_live_id: str) -> DictRow:
        """One's own planned live, locked, with its latest share: 404 for
        another's or none."""
        values = self._values(user_id, id=_id(planned_live_id))
        row: DictRow | None = conn.execute(
            f"{PLANNED_SQL} WHERE pl.id = %(id)s AND pl.owner_id = %(viewer)s"
            " FOR UPDATE OF pl",
            values,
        ).fetchone()
        if row is None:
            raise AccountError(404, "http_error", NO_PLANNED_LIVE)
        return row

    def _seen(self, conn: Any, viewer_id: int, planned_live_id: str) -> DictRow:
        values = self._values(viewer_id, id=_id(planned_live_id))
        row: DictRow | None = conn.execute(
            f"{PLANNED_SQL} WHERE pl.id = %(id)s"
            f" AND {seen_sql('pl.owner_id', 'pl.audience_feed')}",
            values,
        ).fetchone()
        if row is None:
            raise AccountError(404, "http_error", NO_PLANNED_LIVE)
        return row

    # --- Reading ---

    def get(self, viewer_id: int, planned_live_id: str) -> LiveItemBody:
        """404 to whoever may not see it, as for none."""
        with self.database.connect() as conn:
            row = self._seen(conn, viewer_id, planned_live_id)
        return _item(row, viewer_id, self.now())

    def mine(self, user_id: int) -> list[LiveItemBody]:
        """One's planned lives not over and not posted, the soonest first:
        what the sheet at the start of a recording looks at (choice 3).
        One whose share was stopped may start again within its hours."""
        values = self._values(user_id)
        with self.database.connect() as conn:
            rows = conn.execute(
                f"{PLANNED_SQL} WHERE pl.owner_id = %(viewer)s"
                " AND pl.post_id IS NULL AND (pl.starts_at > %(over_before)s"
                f" OR (s.id IS NOT NULL AND {SHARE_ON}))"
                " ORDER BY pl.starts_at, pl.id",
                values,
            ).fetchall()
        now = self.now()
        return [_item(r, user_id, now) for r in rows]

    def row(
        self, viewer_id: int, limit: int = PAGE_SIZE, cursor: str | None = None
    ) -> LivesPageBody:
        """The Feed's row: one's own and the followed accounts' lives not
        over, the going on first, a page at a time."""
        values = self._values(viewer_id, limit=limit + 1)
        after = ""
        if cursor is not None:
            rank, key, item = _after_cursor(cursor)
            values.update(a_rank=rank, a_key=key, a_item=item)
            after = (
                " WHERE (rank, sort_key, item_id)"
                " > (%(a_rank)s, %(a_key)s, %(a_item)s)"
            )
        sql = (
            f"SELECT * FROM (SELECT *, {ORDER_SQL} AS rank, {KEY_SQL} AS sort_key"
            f" FROM ({PLANNED_SQL} WHERE {PLANNED_ON}"
            f" AND {mine_or_followed_sql('pl.owner_id')}"
            f" UNION ALL {SHARE_SQL} AND {SHARE_ON}"
            f" AND {mine_or_followed_sql('s.user_id')}) items) ranked{after}"
            " ORDER BY rank, sort_key, item_id LIMIT %(limit)s"
        )
        with self.database.connect() as conn:
            rows = conn.execute(sql, values).fetchall()
        more = len(rows) > limit
        page = rows[:limit]
        now = self.now()
        return LivesPageBody(
            lives=[_item(r, viewer_id, now) for r in page],
            next=_cursor(page[-1]) if more else None,
        )

    def of_profile(self, viewer_id: int, public_id: str) -> list[LiveItemBody]:
        """A profile's lives not over that `viewer_id` may see: 404 as for
        the profile itself, across a block or for none."""
        with self.database.connect() as conn:
            owner = _account(conn, public_id)
            if owner != viewer_id and _apart(conn, viewer_id, owner):
                raise AccountError(404, "http_error", NO_PROFILE)
            values = self._values(viewer_id, owner=owner, limit=PROFILE_SIZE)
            rows = conn.execute(
                f"SELECT *, {ORDER_SQL} AS rank, {KEY_SQL} AS sort_key"
                f" FROM ({PLANNED_SQL} WHERE pl.owner_id = %(owner)s"
                f" AND {PLANNED_ON} AND {seen_sql('pl.owner_id', 'pl.audience_feed')}"
                f" UNION ALL {SHARE_SQL} AND s.user_id = %(owner)s AND {SHARE_ON}"
                f" AND {seen_sql('s.user_id', 's.audience_feed')}) items"
                " ORDER BY rank, sort_key, item_id LIMIT %(limit)s",
                values,
            ).fetchall()
        now = self.now()
        return [_item(r, viewer_id, now) for r in rows]

    # --- Writing ---

    def create(self, user_id: int, body: PlannedLiveRequestBody) -> LiveItemBody:
        title = _title(body.title)
        now = self.now()
        _check_when(body.starts_at, now)
        with self.database.connect() as conn:
            # One account's planned lives change one at a time.
            conn.execute("SELECT 1 FROM users WHERE id = %s FOR UPDATE", (user_id,))
            upcoming = conn.execute(
                "SELECT count(*) AS n FROM planned_lives WHERE owner_id = %s"
                " AND post_id IS NULL AND starts_at > %s",
                (user_id, now - OVER_AFTER),
            ).fetchone()
            assert upcoming is not None
            if upcoming["n"] >= MAX_UPCOMING:
                raise AccountError(422, "invalid_request", TOO_MANY)
            made = conn.execute(
                "INSERT INTO planned_lives (owner_id, activity, title, starts_at,"
                " audience_feed, heart_visible, created_at, updated_at)"
                " VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (
                    user_id,
                    body.activity,
                    title,
                    body.starts_at,
                    body.audience_feed,
                    body.heart_visible,
                    now,
                    now,
                ),
            ).fetchone()
            assert made is not None
            row = self._own(conn, user_id, str(made["id"]))
        return _item(row, user_id, now)

    def change(
        self, user_id: int, planned_live_id: str, body: PlannedLiveChangeBody
    ) -> LiveItemBody:
        """Before its start only: once started, the share's PATCH changes
        who sees it."""
        now = self.now()
        with self.database.connect() as conn:
            row = self._own(conn, user_id, planned_live_id)
            if row["share_id"] is not None or _state(row, now) != "planned":
                raise AccountError(422, "invalid_request", STARTED)
            title = row["title"] if body.title is None else _title(body.title)
            starts_at = row["starts_at"] if body.starts_at is None else body.starts_at
            if body.starts_at is not None:
                _check_when(starts_at, now)
            conn.execute(
                "UPDATE planned_lives SET activity = %s, title = %s, starts_at = %s,"
                " audience_feed = %s, heart_visible = %s, updated_at = %s"
                " WHERE id = %s",
                (
                    body.activity or row["activity"],
                    title,
                    starts_at,
                    body.audience_feed or row["audience_feed"],
                    (
                        row["heart_visible"]
                        if body.heart_visible is None
                        else body.heart_visible
                    ),
                    now,
                    row["planned_live_id"],
                ),
            )
            changed = self._own(conn, user_id, planned_live_id)
        return _item(changed, user_id, now)

    def delete(self, user_id: int, planned_live_id: str) -> None:
        """Gone with its reminders; a share it started goes on as it is,
        out of the planned live."""
        with self.database.connect() as conn:
            row = self._own(conn, user_id, planned_live_id)
            conn.execute(
                "DELETE FROM planned_lives WHERE id = %s", (row["planned_live_id"],)
            )

    def start(
        self, user_id: int, planned_live_id: str, body: PlannedLiveStartBody
    ) -> LiveShareCreatedBody:
        """Its live share, with its audience and heart rate: from an hour
        before its time to three hours after, once at a time."""
        now = self.now()
        with self.database.connect() as conn:
            row = self._own(conn, user_id, planned_live_id)
            if row["post_id"] is not None or not (
                row["starts_at"] - EARLY_START <= now <= row["starts_at"] + OVER_AFTER
            ):
                raise AccountError(422, "invalid_request", NOT_NOW)
            if _state(row, now) in ("live", "paused"):
                raise AccountError(422, "invalid_request", GOING_ON)
            request = LiveShareRequestBody(
                activity=row["activity"],
                pool_length_m=body.pool_length_m,
                link=body.link,
                audience_feed=row["audience_feed"],
                heart_visible=row["heart_visible"],
            )
            # «Remind me» only at its first start: a start again after a
            # stop tells nobody twice.
            first = row["share_id"] is None
            made = insert_share(
                conn, user_id, request, now, planned_live_id=row["planned_live_id"]
            )
            told = _reminded(conn, row) if first else []
        self._tell(user_id, row, UUID(made.id), told)
        return made

    def _tell(self, owner: int, row: DictRow, share_id: UUID, told: list[int]) -> None:
        """The pushes of «Remind me», after the write; never raises."""
        pusher = self.pusher_of()
        if pusher is None:
            return
        for recipient in told:
            try:
                pusher.notify(
                    PushEvent(
                        "planned_live_started",
                        owner,
                        recipient,
                        text=row["title"],
                        key=str(row["planned_live_id"]),
                        planned_live_id=row["planned_live_id"],
                        live_share_id=share_id,
                    )
                )
            except Exception:
                log.exception("planned lives: a reminder was not sent")

    def post(
        self, user_id: int, planned_live_id: str, body: PlannedLivePostBody
    ) -> None:
        """The post the live became (choice 5): one of the owner's."""
        with self.database.connect() as conn:
            row = self._own(conn, user_id, planned_live_id)
            mine = conn.execute(
                "SELECT 1 FROM drawings d JOIN runs r ON r.id = d.run_id"
                " WHERE d.id = %s AND r.user_id = %s",
                (body.drawing_id, user_id),
            ).fetchone()
            if mine is None:
                raise AccountError(404, "http_error", NO_POST)
            conn.execute(
                "UPDATE planned_lives SET post_id = %s, updated_at = %s WHERE id = %s",
                (body.drawing_id, self.now(), row["planned_live_id"]),
            )

    def remind(self, viewer_id: int, planned_live_id: str, wanted: bool) -> None:
        """«Remind me», or not any more: for a live one sees, not started.
        Twice is once."""
        now = self.now()
        with self.database.connect() as conn:
            row = self._seen(conn, viewer_id, planned_live_id)
            if not wanted:
                conn.execute(
                    "DELETE FROM planned_live_reminders"
                    " WHERE planned_live_id = %s AND user_id = %s",
                    (row["planned_live_id"], viewer_id),
                )
                return
            if _state(row, now) != "planned":
                raise AccountError(422, "invalid_request", STARTED)
            conn.execute(
                "INSERT INTO planned_live_reminders (planned_live_id, user_id,"
                " created_at) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (row["planned_live_id"], viewer_id, now),
            )


# --- The endpoints ---


def planned_lives_of(
    request: Request, accounts: Annotated[Accounts, Depends(accounts_of)]
) -> PlannedLives:
    """In the database of the accounts, on the same clock, with the app's
    pusher."""
    return PlannedLives(
        accounts.database,
        accounts.now,
        lambda: getattr(request.app.state, "pusher", None),
    )


Them = Annotated[PlannedLives, Depends(planned_lives_of)]
Me = Annotated[UserBody, Depends(current_user)]
NOT_FOUND: dict[int | str, dict[str, Any]] = {404: {"model": ErrorBody}}


def planned_live_routes() -> APIRouter:
    router = APIRouter(tags=["live"], responses=ACCOUNT_ERRORS)

    @router.post("/me/planned-lives", status_code=201)
    def create_planned_live(
        body: PlannedLiveRequestBody, lives: Them, user: Me
    ) -> LiveItemBody:
        return lives.create(user.id, body)

    @router.get("/me/planned-lives")
    def my_planned_lives(lives: Them, user: Me) -> list[LiveItemBody]:
        return lives.mine(user.id)

    @router.put("/me/planned-lives/{planned_live_id}", responses=NOT_FOUND)
    def change_planned_live(
        planned_live_id: str, body: PlannedLiveChangeBody, lives: Them, user: Me
    ) -> LiveItemBody:
        return lives.change(user.id, planned_live_id, body)

    @router.delete(
        "/me/planned-lives/{planned_live_id}", status_code=204, responses=NOT_FOUND
    )
    def delete_planned_live(planned_live_id: str, lives: Them, user: Me) -> Response:
        lives.delete(user.id, planned_live_id)
        return Response(status_code=204)

    @router.post(
        "/me/planned-lives/{planned_live_id}/start",
        status_code=201,
        responses=NOT_FOUND,
    )
    def start_planned_live(
        planned_live_id: str, body: PlannedLiveStartBody, lives: Them, user: Me
    ) -> LiveShareCreatedBody:
        return lives.start(user.id, planned_live_id, body)

    @router.put(
        "/me/planned-lives/{planned_live_id}/post",
        status_code=204,
        responses=NOT_FOUND,
    )
    def post_planned_live(
        planned_live_id: str, body: PlannedLivePostBody, lives: Them, user: Me
    ) -> Response:
        lives.post(user.id, planned_live_id, body)
        return Response(status_code=204)

    @router.get("/planned-lives/{planned_live_id}", responses=NOT_FOUND)
    def get_planned_live(planned_live_id: str, lives: Them, user: Me) -> LiveItemBody:
        return lives.get(user.id, planned_live_id)

    @router.put(
        "/planned-lives/{planned_live_id}/reminder",
        status_code=204,
        responses=NOT_FOUND,
    )
    def remind_me(planned_live_id: str, lives: Them, user: Me) -> Response:
        lives.remind(user.id, planned_live_id, True)
        return Response(status_code=204)

    @router.delete(
        "/planned-lives/{planned_live_id}/reminder",
        status_code=204,
        responses=NOT_FOUND,
    )
    def do_not_remind_me(planned_live_id: str, lives: Them, user: Me) -> Response:
        lives.remind(user.id, planned_live_id, False)
        return Response(status_code=204)

    @router.get("/lives")
    def lives_row(
        lives: Them,
        user: Me,
        limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = PAGE_SIZE,
        cursor: Annotated[str | None, Query(pattern=CURSOR_PATTERN)] = None,
    ) -> LivesPageBody:
        return lives.row(user.id, limit, cursor)

    @router.get("/users/{public_id}/lives", responses=NOT_FOUND)
    def lives_of_profile(public_id: str, lives: Them, user: Me) -> list[LiveItemBody]:
        return lives.of_profile(user.id, public_id)

    return router
