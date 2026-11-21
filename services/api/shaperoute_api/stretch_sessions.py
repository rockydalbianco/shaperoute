"""A stretching session (TASK-475, ADR-0386, docs/API.md, «Stretching»): a
run of the activity `stretching` saved without a track, the routine it
followed in place of a line.

PUT /me/stretch-sessions/{key} saves what the phone recorded: when the
session began and ended, its pauses, the routine (its key on the phone:
`morning`, `afterRun`, `afterGym`, TASK-466 part B), the minutes it was
chosen in and how many exercises were done. The API counts the seconds
itself, the time between start and end without the pauses. Sent twice, it
is saved once, as a run is (201, then 200). The run is in «My activities»
for an app that reads a stretching session (reads.py: `stretching` and
`trackless`) and is published as any other (drawings.py), without a line.

GET /me/stretch-sessions/{key} gives the session back to its owner. GET
/drawings/{id}/stretch gives its routine to whoever sees the drawing
(drawings.drawing_seen_sql), from an app that reads it; otherwise 404, as
for a drawing that is not there. Deleting the run, or the account, deletes
it.
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

STRETCHING = "stretching"
# A routine is minutes long; a session left open on the phone, a few hours.
MAX_SESSION = timedelta(hours=4)
MAX_MINUTES = 60
MAX_EXERCISES = 100
ROUTINE_PATTERN = r"^[A-Za-z0-9_]{1,40}$"

UNKNOWN_SESSION = "No stretching session with this key."
NO_STRETCH = "No stretching session to show for this drawing."
NOT_A_SESSION = "This key is of a run, not of a stretching session."


class StretchPauseBody(BaseModel):
    """A pause («Pause»), in seconds since the session began: out of its
    time."""

    model_config = ConfigDict(extra="forbid")

    from_s: float = Field(ge=0, allow_inf_nan=False)
    to_s: float = Field(ge=0, allow_inf_nan=False)

    @model_validator(mode="after")
    def in_order(self) -> StretchPauseBody:
        if self.to_s < self.from_s:
            raise ValueError("a pause ends after it begins")
        return self


class StretchSessionRequestBody(BaseModel):
    """PUT /me/stretch-sessions/{key}: the session as the phone recorded
    it: packages/shared-types/fixtures/stretch-session.json."""

    model_config = ConfigDict(extra="forbid")

    started_at: AwareDatetime
    ended_at: AwareDatetime
    pauses: list[StretchPauseBody] = Field(default_factory=list, max_length=MAX_PAUSES)
    routine: str = Field(pattern=ROUTINE_PATTERN)
    """The routine's key on the phone (`morning`, `afterRun`, `afterGym`)."""
    minutes: int = Field(ge=1, le=MAX_MINUTES)
    """The length it was chosen in: 3, 5 or 10 today."""
    exercises: int = Field(ge=0, le=MAX_EXERCISES)
    """How many of its exercises were done, «Skip» left out."""

    @model_validator(mode="after")
    def within_the_session(self) -> StretchSessionRequestBody:
        length = self.ended_at - self.started_at
        if not timedelta(0) < length <= MAX_SESSION:
            raise ValueError("a session ends after it begins, within four hours")
        length_s = length.total_seconds()
        if any(pause.to_s > length_s for pause in self.pauses):
            raise ValueError("a pause is inside the session")
        return self

    def duration_s(self) -> int:
        """The seconds of the session without its pauses, overlapping or
        not."""
        length_s = (self.ended_at - self.started_at).total_seconds()
        spans = sorted((pause.from_s, pause.to_s) for pause in self.pauses)
        paused, reached = 0.0, 0.0
        for start, end in spans:
            start = max(start, reached)
            if end > start:
                paused += end - start
            reached = max(reached, end)
        return max(0, round(length_s - paused))


class StretchSessionBody(BaseModel):
    """A stretching session as saved: packages/shared-types
    src/stretchSession.ts."""

    id: str
    """The key the app gave it."""
    started_at: datetime
    duration_s: int
    routine: str
    minutes: int
    exercises: int


class StretchFiguresBody(BaseModel):
    """GET /drawings/{id}/stretch: what the post of a session shows besides
    the run's time."""

    routine: str
    minutes: int
    exercises: int


def _kept_pauses(pauses: Sequence[StretchPauseBody]) -> list[dict[str, Any]]:
    """As the `pauses` column keeps a run's (activities._pause): asked for,
    not taken by the app on its own."""
    return [
        {"from_s": round(p.from_s, 3), "to_s": round(p.to_s, 3), "auto": False}
        for p in pauses
    ]


SESSION_SQL = (
    "SELECT r.key, r.started_at, r.duration_s, s.routine, s.minutes, s.exercises"
    " FROM runs r JOIN stretch_sessions s ON s.run_id = r.id"
    " WHERE r.user_id = %s AND r.key = %s"
)


def _body(row: DictRow) -> StretchSessionBody:
    return StretchSessionBody(
        id=row["key"],
        started_at=row["started_at"],
        duration_s=row["duration_s"],
        routine=row["routine"],
        minutes=row["minutes"],
        exercises=row["exercises"],
    )


@dataclass
class StretchSessions:
    """The stretching sessions, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]

    def get(self, user_id: int, key: str) -> StretchSessionBody | None:
        with self.database.connect() as conn:
            row = conn.execute(SESSION_SQL, (user_id, key)).fetchone()
            return None if row is None else _body(row)

    def save(
        self, user_id: int, key: str, body: StretchSessionRequestBody
    ) -> tuple[StretchSessionBody, bool]:
        """The session, and whether it is new: one already saved stays as
        it was. 409 for a run of the key that is no stretching session."""
        now = self.now()
        if not EARLIEST_RUN <= body.started_at <= now + CLOCK_AHEAD:
            raise AccountError(422, "invalid_request", BAD_CLOCK)
        with self.database.connect() as conn:
            # One account's runs change one at a time, as activities.py
            # saves them: the count below is the count when the row goes in.
            conn.execute("SELECT 1 FROM users WHERE id = %s FOR UPDATE", (user_id,))
            saved = conn.execute(SESSION_SQL, (user_id, key)).fetchone()
            if saved is not None:
                return _body(saved), False
            other = conn.execute(
                "SELECT 1 FROM runs WHERE user_id = %s AND key = %s", (user_id, key)
            ).fetchone()
            if other is not None:
                raise AccountError(409, "http_error", NOT_A_SESSION)
            count = conn.execute(
                "SELECT count(*) AS n FROM runs WHERE user_id = %s", (user_id,)
            ).fetchone()
            assert count is not None
            if count["n"] >= MAX_ACTIVITIES:
                raise AccountError(422, "invalid_request", ACTIVITIES_FULL)
            run = conn.execute(
                "INSERT INTO runs (user_id, key, track, pauses, started_at,"
                " distance_m, duration_s, created_at, activity)"
                " VALUES (%s, %s, NULL, %s, %s, 0, %s, %s, %s) RETURNING id",
                (
                    user_id,
                    key,
                    Jsonb(_kept_pauses(body.pauses)),
                    body.started_at,
                    body.duration_s(),
                    now,
                    STRETCHING,
                ),
            ).fetchone()
            assert run is not None
            conn.execute(
                "INSERT INTO stretch_sessions (run_id, routine, minutes, exercises)"
                " VALUES (%s, %s, %s, %s)",
                (run["id"], body.routine, body.minutes, body.exercises),
            )
            row = conn.execute(SESSION_SQL, (user_id, key)).fetchone()
            assert row is not None
            return _body(row), True

    def of_drawing(
        self, viewer_id: int, drawing_id: str, reads: Reads = EVERYTHING
    ) -> StretchFiguresBody | None:
        """The routine of a drawing `viewer_id` sees, of an activity
        `reads` shows; None otherwise."""
        try:
            wanted = UUID(drawing_id)
        except ValueError:
            return None
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT s.routine, s.minutes, s.exercises FROM drawings d"
                " JOIN runs r ON r.id = d.run_id"
                " JOIN stretch_sessions s ON s.run_id = r.id"
                f" WHERE d.id = %s AND {drawing_seen_sql('%s')}"
                f" AND {reads.sql('r.activity', 'r.track IS NOT NULL')}",
                (wanted, viewer_id),
            ).fetchone()
        if row is None:
            return None
        return StretchFiguresBody(
            routine=row["routine"], minutes=row["minutes"], exercises=row["exercises"]
        )


# --- The endpoints ---


def stretch_sessions_of(
    accounts: Annotated[Accounts, Depends(accounts_of)],
) -> StretchSessions:
    """In the database of the accounts, on the same clock."""
    return StretchSessions(accounts.database, accounts.now)


Stretch = Annotated[StretchSessions, Depends(stretch_sessions_of)]
Me = Annotated[UserBody, Depends(current_user)]


def stretch_session_routes() -> APIRouter:
    router = APIRouter(tags=["stretching"], responses=ACCOUNT_ERRORS)

    @router.get(
        "/me/stretch-sessions/{key}",
        responses={404: {"model": ErrorBody}},
    )
    def get_stretch_session(key: Key, stretch: Stretch, user: Me) -> StretchSessionBody:
        session = stretch.get(user.id, key)
        if session is None:
            raise HTTPException(404, UNKNOWN_SESSION)
        return session

    # Sending a session twice saves it once: 201 the first time, then 200.
    @router.put(
        "/me/stretch-sessions/{key}",
        responses={201: {"model": StretchSessionBody}},
    )
    def save_stretch_session(
        key: Key,
        body: StretchSessionRequestBody,
        response: Response,
        stretch: Stretch,
        user: Me,
    ) -> StretchSessionBody:
        session, created = stretch.save(user.id, key, body)
        if created:
            response.status_code = 201
        return session

    @router.get(
        "/drawings/{drawing_id}/stretch",
        responses={404: {"model": ErrorBody}},
    )
    def drawing_stretch(
        drawing_id: str, stretch: Stretch, user: Me, reads: Shown
    ) -> StretchFiguresBody:
        figures = stretch.of_drawing(user.id, drawing_id, reads)
        if figures is None:
            raise HTTPException(404, NO_STRETCH)
        return figures

    return router


def install_stretch_sessions(app: FastAPI) -> None:
    """Without a database the endpoints answer 503, as the others of the
    accounts."""
    app.include_router(stretch_session_routes())
