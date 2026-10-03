"""Drawings: the runs an account shows the other members (TASK-117,
docs/API.md, «Drawings»).

A run saved in My activities (activities.py) is private. Its owner may give
it a title and make it public; then every member sees it as a drawing, on
the owner's profile and by its id. What they see is cut: the track without
its first and its last CUT_M metres along it, without times, without the
planned route, which begins at the runner's door (ADR-0114, point 4). The
owner keeps the whole run in My activities.

Score, metres and seconds are the run's, counted by the API when it was
saved: nothing here takes them from the app. Deleting the run, or the
account, deletes its drawing (ON DELETE CASCADE).
"""

from __future__ import annotations

import json
import unicodedata
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from psycopg.rows import DictRow
from pydantic import BaseModel, ConfigDict, Field
from route_engine.geo import (
    haversine_m,
    latlon_to_local,
    local_to_latlon,
    path_length_m,
)

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import (
    EPOCH,
    MICROSECOND,
    UNKNOWN_ACTIVITY,
    Key,
)
from shaperoute_api.db import Database
from shaperoute_api.recommended import preview
from shaperoute_api.schemas import ErrorBody

# What the others never see of a public run, from either end (ADR-0114).
CUT_M = 200.0
# Less is a rounding of the cut, not a drawing.
MIN_LEFT_M = 1.0
# Two points closer than this are one.
SAME_POINT_M = 0.01
MAX_TITLE_LENGTH = 60
PAGE_SIZE = 20
MAX_PAGE_SIZE = 50
# Where a page ended: the start of its last run, in microseconds, and the id
# of its drawing, which is random, so a cursor says nothing about the others.
CURSOR_PATTERN = r"^\d{1,17}-[0-9a-f]{32}$"

TITLE_TOO_LONG = f"A title is at most {MAX_TITLE_LENGTH} characters."
TITLE_NOT_TEXT = "A title is one line of words: it cannot hold control characters."
TOO_SHORT = (
    f"This run is too short to publish: its first and last {CUT_M:.0f} m are"
    " never shown, and nothing would be left."
)
NO_DRAWING = "No drawing with this id."
NO_PROFILE = "No profile with this id."

LatLon = tuple[float, float]


# --- What the others see of a track ---


def _after(points: Sequence[LatLon], metres: float) -> list[LatLon]:
    """The line from `metres` along it to its end; [] when it is shorter.
    The first point is where those metres end, on the segment they end in."""
    walked = 0.0
    for i, (a, b) in enumerate(zip(points, points[1:], strict=False)):
        step = haversine_m(a, b)
        if walked + step > metres:
            if walked + step - metres < SAME_POINT_M:
                # The cut falls on `b`, give or take a rounding: not twice.
                return list(points[i + 1 :])
            # In metres on the plane around `a`, never in degrees.
            share = (metres - walked) / step
            x_m, y_m = latlon_to_local(a, b)
            return [local_to_latlon(a, share * x_m, share * y_m), *points[i + 1 :]]
        walked += step
    return []


def cut_track(points: Sequence[LatLon], cut_m: float = CUT_M) -> list[LatLon]:
    """The track without its first and last `cut_m` metres along it; [] when
    less than MIN_LEFT_M is left of it."""
    if path_length_m(points) - 2 * cut_m < MIN_LEFT_M:
        return []
    head_cut = _after(points, cut_m)
    return _after(head_cut[::-1], cut_m)[::-1]


def checked_title(value: str | None) -> str | None:
    """The title as kept: without spaces at either end, None for none; or
    422 saying what is wrong with it."""
    if value is None:
        return None
    title = value.strip()
    if len(title) > MAX_TITLE_LENGTH:
        raise AccountError(422, "invalid_request", TITLE_TOO_LONG)
    if any(unicodedata.category(c) == "Cc" for c in title):
        raise AccountError(422, "invalid_request", TITLE_NOT_TEXT)
    return title or None


# --- The bodies ---


class DrawingRequestBody(BaseModel):
    """PUT /me/activities/{key}/drawing: the drawing as it should be now:
    packages/shared-types/fixtures/drawing-request.json."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(
        default=None,
        description=f"At most {MAX_TITLE_LENGTH} characters; null or empty: none.",
    )
    public: bool


class MyDrawingBody(BaseModel):
    """What the owner chose for one of its runs:
    packages/shared-types/fixtures/my-drawing.json."""

    key: str
    """The run's, as in My activities."""
    id: UUID | None
    """What the others open it with; null for a run never titled nor
    published."""
    title: str | None
    public: bool
    published_at: datetime | None
    """When it was last made public; null while private."""


class MyDrawingsBody(BaseModel):
    """GET /me/drawings: every run of the account with a title or made
    public, the latest run first."""

    drawings: list[MyDrawingBody]


class AuthorBody(BaseModel):
    """Who published a drawing, as the profile says it: never the email."""

    public_id: UUID
    username: str


class SeenFields(BaseModel):
    """What the others see of a drawing, in a list and whole."""

    id: UUID
    title: str | None
    """The owner's; null: none."""
    started_at: datetime
    published_at: datetime | None
    """Null only for its owner, on a private one."""
    place: str | None
    shape: str | None
    word: str | None
    style: str | None
    route_title: str | None
    """What the planned route draws, when neither a shape nor a word says it:
    the run's `title` in My activities."""
    distance_m: int
    duration_s: int
    score: int | None
    fidelity: float | None


class DrawingBody(SeenFields):
    """A drawing as the others see it in a list, with a light preview of its
    cut track: packages/shared-types/fixtures/drawings.json."""

    track_preview: list[LatLon]


class DrawingsBody(BaseModel):
    """A page of a profile's drawings, the latest run first."""

    drawings: list[DrawingBody]
    next: str | None
    """The `cursor` of the next page; null on the last one."""
    total: int
    """How many drawings the profile has published, on every page."""


class DrawingDetailBody(SeenFields):
    """GET /drawings/{id}: one drawing whole, to show on the map:
    packages/shared-types/fixtures/drawing.json."""

    author: AuthorBody
    public: bool
    """Always true for the others; false only for its owner."""
    track: list[LatLon]
    """The cut track, every point of it; empty only for its owner's private
    run too short to publish."""


# --- The drawings in the database ---

SEEN_COLUMNS = (
    "d.id, d.title, d.public, d.published_at,"
    " ST_AsGeoJSON(d.track, 15) AS track,"
    " r.started_at, r.place, r.shape, r.word, r.style, r.title AS route_title,"
    " r.distance_m, r.duration_s, r.score, r.fidelity"
)
MINE_COLUMNS = "r.key, d.id, d.title, d.public, d.published_at"


def _line(geojson: str | None) -> list[LatLon]:
    if geojson is None:
        return []
    coordinates: list[list[float]] = json.loads(geojson)["coordinates"]
    return [(lat, lon) for lon, lat in coordinates]


def _line_wkt(points: Sequence[LatLon]) -> str:
    """The line as PostGIS reads it: (lon lat), every digit kept."""
    return "LINESTRING(" + ",".join(f"{lon!r} {lat!r}" for lat, lon in points) + ")"


def _seen(row: DictRow) -> dict[str, Any]:
    fidelity = row["fidelity"]
    return {
        "id": row["id"],
        "title": row["title"],
        "started_at": row["started_at"],
        "published_at": row["published_at"],
        "place": row["place"],
        "shape": row["shape"],
        "word": row["word"],
        "style": row["style"],
        "route_title": row["route_title"],
        "distance_m": row["distance_m"],
        "duration_s": row["duration_s"],
        "score": row["score"],
        # A `real` column: without rounding 0.83 comes back as 0.8299999833.
        "fidelity": None if fidelity is None else round(fidelity, 4),
    }


def _cursor(row: DictRow) -> str:
    started_at: datetime = row["started_at"]
    return f"{(started_at - EPOCH) // MICROSECOND}-{row['id'].hex}"


def _after_cursor(cursor: str) -> tuple[datetime, UUID]:
    micros, drawing_id = cursor.split("-")
    return EPOCH + int(micros) * MICROSECOND, UUID(drawing_id)


def _mine(key: str, row: DictRow | None) -> MyDrawingBody:
    if row is None or row["id"] is None:
        return MyDrawingBody(
            key=key, id=None, title=None, public=False, published_at=None
        )
    return MyDrawingBody.model_validate(row)


@dataclass
class Drawings:
    """The drawings in the database."""

    database: Database
    now: Callable[[], datetime]

    def mine(self, user_id: int, key: str) -> MyDrawingBody | None:
        """What the owner chose for its run; None: it has no such run."""
        with self.database.connect() as conn:
            row = conn.execute(
                f"SELECT {MINE_COLUMNS} FROM runs r"
                " LEFT JOIN drawings d ON d.run_id = r.id"
                " WHERE r.user_id = %s AND r.key = %s",
                (user_id, key),
            ).fetchone()
        return None if row is None else _mine(key, row)

    def all_mine(self, user_id: int) -> MyDrawingsBody:
        with self.database.connect() as conn:
            rows = conn.execute(
                f"SELECT {MINE_COLUMNS} FROM drawings d"
                " JOIN runs r ON r.id = d.run_id WHERE r.user_id = %s"
                " ORDER BY r.started_at DESC, r.id DESC",
                (user_id,),
            ).fetchall()
        return MyDrawingsBody(drawings=[_mine(row["key"], row) for row in rows])

    def keep(
        self, user_id: int, key: str, body: DrawingRequestBody
    ) -> MyDrawingBody | None:
        """The run's drawing as `body` wants it; None: no such run. 422 for a
        title refused, or a run too short to publish."""
        title = checked_title(body.title)
        now = self.now()
        with self.database.connect() as conn:
            run = conn.execute(
                "SELECT id, ST_AsGeoJSON(ST_Force2D(track), 15) AS track FROM runs"
                " WHERE user_id = %s AND key = %s FOR UPDATE",
                (user_id, key),
            ).fetchone()
            if run is None:
                return None
            # Cut again on every change, from the run as it is kept: the
            # same run, the same line.
            cut = cut_track(_line(run["track"]))
            if body.public and not cut:
                raise AccountError(422, "invalid_request", TOO_SHORT)
            before = conn.execute(
                "SELECT published_at FROM drawings WHERE run_id = %s AND public",
                (run["id"],),
            ).fetchone()
            # A title changed on a public drawing does not publish it again.
            published_at = None
            if body.public:
                published_at = now if before is None else before["published_at"]
            conn.execute(
                "INSERT INTO drawings (run_id, title, public, track, published_at,"
                " updated_at) VALUES (%s, %s, %s, ST_GeomFromText(%s, 4326), %s, %s)"
                " ON CONFLICT (run_id) DO UPDATE SET title = EXCLUDED.title,"
                " public = EXCLUDED.public, track = EXCLUDED.track,"
                " published_at = EXCLUDED.published_at,"
                " updated_at = EXCLUDED.updated_at",
                (
                    run["id"],
                    title,
                    body.public,
                    _line_wkt(cut) if cut else None,
                    published_at,
                    now,
                ),
            )
            row = conn.execute(
                f"SELECT {MINE_COLUMNS} FROM drawings d"
                " JOIN runs r ON r.id = d.run_id WHERE d.run_id = %s",
                (run["id"],),
            ).fetchone()
        return _mine(key, row)

    def of_profile(
        self, public_id: str, limit: int = PAGE_SIZE, cursor: str | None = None
    ) -> DrawingsBody | None:
        """A page of the public drawings of a profile, the latest run first;
        None: no such profile."""
        try:
            wanted = UUID(public_id)
        except ValueError:
            return None
        with self.database.connect() as conn:
            user = conn.execute(
                "SELECT id FROM users WHERE public_id = %s", (wanted,)
            ).fetchone()
            if user is None:
                return None
            where = "r.user_id = %s AND d.public"
            values: list[Any] = [user["id"]]
            if cursor is not None:
                where += " AND (r.started_at, d.id) < (%s, %s)"
                values += _after_cursor(cursor)
            rows = conn.execute(
                f"SELECT {SEEN_COLUMNS} FROM drawings d"
                f" JOIN runs r ON r.id = d.run_id WHERE {where}"
                " ORDER BY r.started_at DESC, d.id DESC LIMIT %s",
                (*values, limit + 1),
            ).fetchall()
            count = conn.execute(
                "SELECT count(*) AS n FROM drawings d JOIN runs r ON r.id = d.run_id"
                " WHERE r.user_id = %s AND d.public",
                (user["id"],),
            ).fetchone()
        assert count is not None
        page, more = rows[:limit], len(rows) > limit
        return DrawingsBody(
            drawings=[
                DrawingBody(**_seen(row), track_preview=preview(_line(row["track"])))
                for row in page
            ],
            next=_cursor(page[-1]) if more else None,
            total=count["n"],
        )

    def seen(self, viewer_id: int, drawing_id: str) -> DrawingDetailBody | None:
        """The drawing as `viewer_id` may see it: public, or its own; None
        otherwise, as for an id that is not there."""
        try:
            wanted = UUID(drawing_id)
        except ValueError:
            return None
        with self.database.connect() as conn:
            row = conn.execute(
                f"SELECT {SEEN_COLUMNS}, u.public_id, u.username FROM drawings d"
                " JOIN runs r ON r.id = d.run_id JOIN users u ON u.id = r.user_id"
                " WHERE d.id = %s AND (d.public OR r.user_id = %s)",
                (wanted, viewer_id),
            ).fetchone()
        if row is None:
            return None
        return DrawingDetailBody(
            **_seen(row),
            author=AuthorBody(public_id=row["public_id"], username=row["username"]),
            public=row["public"],
            track=_line(row["track"]),
        )


def published_count_sql(user_column: str) -> str:
    """How many drawings the account in `user_column` has made public, as a
    subquery: the number on its profile (profiles.py)."""
    return (
        "(SELECT count(*) FROM drawings d JOIN runs r ON r.id = d.run_id"
        f" WHERE r.user_id = {user_column} AND d.public)"
    )


def drawings_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> Drawings:
    """In the database of the accounts, on the same clock."""
    return Drawings(accounts.database, accounts.now)


def drawing_routes() -> APIRouter:
    router = APIRouter(tags=["drawings"], responses=ACCOUNT_ERRORS)

    @router.get("/me/drawings")
    def my_drawings(
        drawings: Annotated[Drawings, Depends(drawings_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> MyDrawingsBody:
        return drawings.all_mine(user.id)

    @router.get("/me/activities/{key}/drawing", responses={404: {"model": ErrorBody}})
    def my_drawing(
        key: Key,
        drawings: Annotated[Drawings, Depends(drawings_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> MyDrawingBody:
        found = drawings.mine(user.id, key)
        if found is None:
            raise HTTPException(404, UNKNOWN_ACTIVITY)
        return found

    # The whole choice every time: the app may send it again after a phone
    # without network, and the second time changes nothing.
    @router.put("/me/activities/{key}/drawing", responses={404: {"model": ErrorBody}})
    def keep_drawing(
        key: Key,
        body: DrawingRequestBody,
        drawings: Annotated[Drawings, Depends(drawings_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> MyDrawingBody:
        kept = drawings.keep(user.id, key, body)
        if kept is None:
            raise HTTPException(404, UNKNOWN_ACTIVITY)
        return kept

    @router.get("/users/{public_id}/drawings", responses={404: {"model": ErrorBody}})
    def profile_drawings(
        public_id: str,
        drawings: Annotated[Drawings, Depends(drawings_of)],
        _: Annotated[UserBody, Depends(current_user)],
        limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = PAGE_SIZE,
        cursor: Annotated[str | None, Query(pattern=CURSOR_PATTERN)] = None,
    ) -> DrawingsBody:
        found = drawings.of_profile(public_id, limit, cursor)
        if found is None:
            raise HTTPException(404, NO_PROFILE)
        return found

    @router.get("/drawings/{drawing_id}", responses={404: {"model": ErrorBody}})
    def drawing(
        drawing_id: str,
        drawings: Annotated[Drawings, Depends(drawings_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> DrawingDetailBody:
        found = drawings.seen(user.id, drawing_id)
        if found is None:
            raise HTTPException(404, NO_DRAWING)
        return found

    return router


def install_drawings(app: FastAPI) -> None:
    """The drawings of the accounts; after install_accounts, which sets the
    database and the errors."""
    app.include_router(drawing_routes())
