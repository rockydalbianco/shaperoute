"""A swim in a pool (TASK-400, ADR-0334, docs/API.md, «Pool swim»): a run of
the activity `swimming` saved without a track, its pool and its lengths in
place of a line.

PUT /me/pool-swims/{key} saves what the phone recorded: when the swim began
and ended, its pauses, the length of the pool chosen before it and the
lengths the swimmer wrote at the end. The API counts the seconds itself, the
time between start and end without the pauses, and the metres, lengths times
the pool. Sent twice, it is saved once, as a run is (201, then 200). The run
is in «My activities» for an app that reads a swim without a track
(reads.py) and is published as any other (drawings.py), without a line.

GET /me/pool-swims/{key} gives the swim back to its owner. GET
/drawings/{id}/pool-swim gives its pool and lengths to whoever sees the
drawing (drawings.drawing_seen_sql), from an app that reads it; otherwise
404, as for a drawing that is not there. Deleting the run, or the account,
deletes them.

The heart rate (TASK-409 part B, ADR-0334 precisazione D): the phone may
send, with the swim, the average and maximum beats a minute its watch wrote
in Apple Health, and whether others see them («Show heart rate»). They are
kept on the run (runs.heart_*), given back to the owner always and, with the
pool and lengths, to others only when shown. A swim without them answers
without the fields.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Response
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import (
    ACTIVITIES_FULL,
    BAD_CLOCK,
    CLOCK_AHEAD,
    EARLIEST_RUN,
    MAX_ACTIVITIES,
    MAX_PAUSES,
    Key,
)
from shaperoute_api.db import Database
from shaperoute_api.drawings import drawing_seen_sql
from shaperoute_api.reads import EVERYTHING, Reads, Shown
from shaperoute_api.schemas import ErrorBody

SWIMMING = "swimming"
# A long day in the water.
MAX_SWIM = timedelta(hours=24)
MIN_POOL_LENGTH_M = 10
MAX_POOL_LENGTH_M = 100
MAX_LENGTHS = 1_000
# Faster than the world records over 50 m (about 2.4 m/s): the lengths or
# the pool were written wrong.
MAX_SPEED_M_S = 2.5
# Beats a minute a watch can have written for a person swimming.
MIN_HEART_BPM = 30
MAX_HEART_BPM = 230

UNKNOWN_SWIM = "No swim in a pool with this key."
NO_POOL_SWIM = "No swim in a pool to show for this drawing."
NOT_A_POOL_SWIM = "This key is of a run, not of a swim in a pool."
TOO_FAST = "Faster than any swimmer: check the lengths and the pool."


class PoolPauseBody(BaseModel):
    """A pause («Pause»), in seconds since the swim began: out of its
    time."""

    model_config = ConfigDict(extra="forbid")

    from_s: float = Field(ge=0, allow_inf_nan=False)
    to_s: float = Field(ge=0, allow_inf_nan=False)

    @model_validator(mode="after")
    def in_order(self) -> PoolPauseBody:
        if self.to_s < self.from_s:
            raise ValueError("a pause ends after it begins")
        return self


class PoolSwimRequestBody(BaseModel):
    """PUT /me/pool-swims/{key}: the swim as the phone recorded it:
    packages/shared-types/fixtures/pool-swim.json."""

    model_config = ConfigDict(extra="forbid")

    started_at: AwareDatetime
    ended_at: AwareDatetime
    pauses: list[PoolPauseBody] = Field(default_factory=list, max_length=MAX_PAUSES)
    pool_length_m: float = Field(
        ge=MIN_POOL_LENGTH_M, le=MAX_POOL_LENGTH_M, allow_inf_nan=False
    )
    """25, 50, or one the swimmer wrote («Other»); kept to the centimetre."""
    lengths: int = Field(ge=1, le=MAX_LENGTHS)
    """What the swimmer wrote at the end («How many lengths?»)."""
    heart_avg_bpm: int | None = Field(None, ge=MIN_HEART_BPM, le=MAX_HEART_BPM)
    heart_max_bpm: int | None = Field(None, ge=MIN_HEART_BPM, le=MAX_HEART_BPM)
    """The swim's heart rate from the watch, both or neither."""
    heart_shown: bool = True
    """«Show heart rate»: whether others see it."""

    @model_validator(mode="after")
    def within_the_swim(self) -> PoolSwimRequestBody:
        length = self.ended_at - self.started_at
        if not timedelta(0) < length <= MAX_SWIM:
            raise ValueError("a swim ends after it begins, within a day")
        length_s = length.total_seconds()
        if any(pause.to_s > length_s for pause in self.pauses):
            raise ValueError("a pause is inside the swim")
        return self

    @model_validator(mode="after")
    def one_heart_rate(self) -> PoolSwimRequestBody:
        if (self.heart_avg_bpm is None) != (self.heart_max_bpm is None):
            raise ValueError("the average and the maximum heart rate go together")
        if (
            self.heart_avg_bpm is not None
            and self.heart_max_bpm is not None
            and self.heart_avg_bpm > self.heart_max_bpm
        ):
            raise ValueError("the average heart rate is not above the maximum")
        return self

    def pool_m(self) -> float:
        """The pool as kept: to the centimetre."""
        return round(self.pool_length_m, 2)

    def distance_m(self) -> int:
        """The lengths times the pool, to the metre."""
        return round(self.lengths * self.pool_m())

    def duration_s(self) -> int:
        """The seconds of the swim without its pauses, overlapping or not."""
        length_s = (self.ended_at - self.started_at).total_seconds()
        spans = sorted((pause.from_s, pause.to_s) for pause in self.pauses)
        paused, reached = 0.0, 0.0
        for start, end in spans:
            start = max(start, reached)
            if end > start:
                paused += end - start
            reached = max(reached, end)
        return max(0, round(length_s - paused))


class PoolSwimBody(BaseModel):
    """A swim in a pool as saved: packages/shared-types src/poolSwim.ts."""

    id: str
    """The key the app gave it."""
    started_at: datetime
    duration_s: int
    distance_m: int
    pool_length_m: float
    lengths: int
    heart_avg_bpm: int | None = None
    heart_max_bpm: int | None = None
    heart_shown: bool | None = None
    """The three only for a swim with its heart rate."""


class PoolSwimFiguresBody(BaseModel):
    """GET /drawings/{id}/pool-swim: what the post of a swim in a pool shows
    besides the run's time and metres; the heart rate when its owner shows
    it, or to the owner."""

    pool_length_m: float
    lengths: int
    heart_avg_bpm: int | None = None
    heart_max_bpm: int | None = None


def _kept_pauses(pauses: Sequence[PoolPauseBody]) -> list[dict[str, Any]]:
    """As the `pauses` column keeps a run's (activities._pause): asked for,
    not taken by the app on its own."""
    return [
        {"from_s": round(p.from_s, 3), "to_s": round(p.to_s, 3), "auto": False}
        for p in pauses
    ]


SWIM_SQL = (
    "SELECT r.key, r.started_at, r.duration_s, r.distance_m,"
    " p.pool_length_m::float8 AS pool_length_m, p.lengths,"
    " r.heart_avg_bpm, r.heart_max_bpm, r.heart_shown"
    " FROM runs r JOIN pool_swims p ON p.run_id = r.id"
    " WHERE r.user_id = %s AND r.key = %s"
)


def _body(row: DictRow) -> PoolSwimBody:
    heart = row["heart_avg_bpm"] is not None
    return PoolSwimBody(
        id=row["key"],
        started_at=row["started_at"],
        duration_s=row["duration_s"],
        distance_m=row["distance_m"],
        pool_length_m=row["pool_length_m"],
        lengths=row["lengths"],
        heart_avg_bpm=row["heart_avg_bpm"],
        heart_max_bpm=row["heart_max_bpm"],
        heart_shown=row["heart_shown"] if heart else None,
    )


@dataclass
class PoolSwims:
    """The swims in a pool, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]

    def get(self, user_id: int, key: str) -> PoolSwimBody | None:
        with self.database.connect() as conn:
            row = conn.execute(SWIM_SQL, (user_id, key)).fetchone()
            return None if row is None else _body(row)

    def save(
        self, user_id: int, key: str, body: PoolSwimRequestBody
    ) -> tuple[PoolSwimBody, bool]:
        """The swim, and whether it is new: one already saved stays as it
        was. 409 for a run of the key that is no swim in a pool."""
        now = self.now()
        if not EARLIEST_RUN <= body.started_at <= now + CLOCK_AHEAD:
            raise AccountError(422, "invalid_request", BAD_CLOCK)
        duration_s, distance_m = body.duration_s(), body.distance_m()
        if distance_m > MAX_SPEED_M_S * max(duration_s, 1):
            raise AccountError(422, "invalid_request", TOO_FAST)
        with self.database.connect() as conn:
            # One account's runs change one at a time, as activities.py
            # saves them: the count below is the count when the row goes in.
            conn.execute("SELECT 1 FROM users WHERE id = %s FOR UPDATE", (user_id,))
            saved = conn.execute(SWIM_SQL, (user_id, key)).fetchone()
            if saved is not None:
                return _body(saved), False
            other = conn.execute(
                "SELECT 1 FROM runs WHERE user_id = %s AND key = %s", (user_id, key)
            ).fetchone()
            if other is not None:
                raise AccountError(409, "http_error", NOT_A_POOL_SWIM)
            count = conn.execute(
                "SELECT count(*) AS n FROM runs WHERE user_id = %s", (user_id,)
            ).fetchone()
            assert count is not None
            if count["n"] >= MAX_ACTIVITIES:
                raise AccountError(422, "invalid_request", ACTIVITIES_FULL)
            run = conn.execute(
                "INSERT INTO runs (user_id, key, track, pauses, started_at,"
                " distance_m, duration_s, created_at, activity,"
                " heart_avg_bpm, heart_max_bpm, heart_shown)"
                " VALUES (%s, %s, NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
                " RETURNING id",
                (
                    user_id,
                    key,
                    Jsonb(_kept_pauses(body.pauses)),
                    body.started_at,
                    distance_m,
                    duration_s,
                    now,
                    SWIMMING,
                    body.heart_avg_bpm,
                    body.heart_max_bpm,
                    body.heart_shown,
                ),
            ).fetchone()
            assert run is not None
            conn.execute(
                "INSERT INTO pool_swims (run_id, pool_length_m, lengths)"
                " VALUES (%s, %s, %s)",
                (run["id"], body.pool_m(), body.lengths),
            )
            row = conn.execute(SWIM_SQL, (user_id, key)).fetchone()
            assert row is not None
            return _body(row), True

    def of_drawing(
        self, viewer_id: int, drawing_id: str, reads: Reads = EVERYTHING
    ) -> PoolSwimFiguresBody | None:
        """The pool and lengths of a drawing `viewer_id` sees, of an
        activity `reads` shows, with the heart rate when its owner shows it
        or `viewer_id` is the owner; None otherwise."""
        try:
            wanted = UUID(drawing_id)
        except ValueError:
            return None
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT p.pool_length_m::float8 AS pool_length_m, p.lengths,"
                " CASE WHEN r.heart_shown OR r.user_id = %s"
                " THEN r.heart_avg_bpm END AS heart_avg_bpm,"
                " CASE WHEN r.heart_shown OR r.user_id = %s"
                " THEN r.heart_max_bpm END AS heart_max_bpm"
                " FROM drawings d"
                " JOIN runs r ON r.id = d.run_id"
                " JOIN pool_swims p ON p.run_id = r.id"
                f" WHERE d.id = %s AND {drawing_seen_sql('%s')}"
                f" AND {reads.sql('r.activity', 'r.track IS NOT NULL')}",
                (viewer_id, viewer_id, wanted, viewer_id),
            ).fetchone()
        if row is None:
            return None
        return PoolSwimFiguresBody(
            pool_length_m=row["pool_length_m"],
            lengths=row["lengths"],
            heart_avg_bpm=row["heart_avg_bpm"],
            heart_max_bpm=row["heart_max_bpm"],
        )


# --- The endpoints ---


def pool_swims_of(
    accounts: Annotated[Accounts, Depends(accounts_of)],
) -> PoolSwims:
    """In the database of the accounts, on the same clock."""
    return PoolSwims(accounts.database, accounts.now)


Pool = Annotated[PoolSwims, Depends(pool_swims_of)]
Me = Annotated[UserBody, Depends(current_user)]


def pool_swim_routes() -> APIRouter:
    router = APIRouter(tags=["pool"], responses=ACCOUNT_ERRORS)

    # A swim without its heart rate answers without the fields, as before.
    @router.get(
        "/me/pool-swims/{key}",
        responses={404: {"model": ErrorBody}},
        response_model_exclude_none=True,
    )
    def get_pool_swim(key: Key, pool: Pool, user: Me) -> PoolSwimBody:
        swim = pool.get(user.id, key)
        if swim is None:
            raise HTTPException(404, UNKNOWN_SWIM)
        return swim

    # Sending a swim twice saves it once: 201 the first time, then 200.
    @router.put(
        "/me/pool-swims/{key}",
        responses={201: {"model": PoolSwimBody}},
        response_model_exclude_none=True,
    )
    def save_pool_swim(
        key: Key,
        body: PoolSwimRequestBody,
        response: Response,
        pool: Pool,
        user: Me,
    ) -> PoolSwimBody:
        swim, created = pool.save(user.id, key, body)
        if created:
            response.status_code = 201
        return swim

    @router.get(
        "/drawings/{drawing_id}/pool-swim",
        responses={404: {"model": ErrorBody}},
        response_model_exclude_none=True,
    )
    def drawing_pool_swim(
        drawing_id: str, pool: Pool, user: Me, reads: Shown
    ) -> PoolSwimFiguresBody:
        figures = pool.of_drawing(user.id, drawing_id, reads)
        if figures is None:
            raise HTTPException(404, NO_POOL_SWIM)
        return figures

    return router


def install_pool_swims(app: FastAPI) -> None:
    """Without a database the endpoints answer 503, as the others of the
    accounts."""
    app.include_router(pool_swim_routes())
