"""The nights of sleep a person publishes (TASK-467 part B1, ADR-0380,
docs/API.md, «Sleep»).

MuW works its sleep score out on the phone, from what Apple Health holds
(ADR-0379). The server keeps only the summary of a night its owner
published, never the samples and no hour of going to bed or of waking: the
day the person woke up, the score, the minutes asleep and awake and, when a
watch told them, the minutes in each stage. A night is published in two
ways, each with a switch of its own:

- on the profile: PUT /me/sleep/{night} with `shared` true, off until the
  owner turns it on. GET /users/{id}/sleep gives the latest night shared to
  whoever can open the profile (profiles.py), across a block nobody;
- in the post of an activity («Sleep last night»): PUT
  /me/activities/{key}/sleep with `shown`, on unless the owner turns it
  off. GET /drawings/{id}/sleep gives it to whoever sees the drawing
  (drawings.drawing_seen_sql) while it is shown, and always to its owner.

To anyone but its owner a night not shared, or not shown, is as one that
is not there: the same 404, and no answer counts them.

A night nobody publishes is not kept: turning `shared` off, or taking the
night away from the last activity that carried it (migration 0072 does it
for a deleted activity too), deletes it; the answer is then 204 in place of
the night. DELETE /me/sleep/{night} takes a night off the server at once,
profile and posts; deleting the account deletes them all.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Response
from psycopg.rows import DictRow
from pydantic import BaseModel, ConfigDict, Field, model_validator

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
    now_utc,
)
from shaperoute_api.activities import EARLIEST_RUN, UNKNOWN_ACTIVITY, Key
from shaperoute_api.db import Database, DictConnection
from shaperoute_api.drawings import drawing_seen_sql
from shaperoute_api.follows import apart_sql
from shaperoute_api.reads import EVERYTHING, Reads, Shown
from shaperoute_api.schemas import ErrorBody
from shaperoute_api.sleep_seen import (
    MAX_NIGHT_MIN,
    SleepStagesBody,
    SleepSummaryBody,
)

MAX_SCORE = 100
EARLIEST_NIGHT = EARLIEST_RUN.date()
# A phone east of the API is a day ahead of it at most.
NIGHT_AHEAD = timedelta(days=1)
# «Sleep last night» is the night before the activity: the day the person
# woke up is the activity's, or the one before for an activity after
# midnight; a day more each way for the phone's time zone.
ACTIVITY_NIGHT_APART = timedelta(days=2)

BAD_NIGHT = "This is not the day of a night MuW can keep."
NO_NIGHT = "No night of sleep kept for this day."
NO_ACTIVITY_SLEEP = "No sleep kept for this activity."
NO_SLEEP = "No sleep to show."
NOT_LAST_NIGHT = "This is not the night before this activity."


class SleepFiguresBody(BaseModel):
    """What the phone worked out of a night (apps/mobile src/health)."""

    model_config = ConfigDict(extra="forbid")

    score: int = Field(ge=0, le=MAX_SCORE, description="MuW's sleep score.")
    asleep_min: int = Field(ge=1, le=MAX_NIGHT_MIN)
    awake_min: int = Field(
        ge=0, le=MAX_NIGHT_MIN, description="Awake between falling asleep and waking."
    )
    stages: SleepStagesBody | None = Field(
        None, description="Left out for a night no watch told the stages of."
    )

    @model_validator(mode="after")
    def stages_within_the_sleep(self) -> SleepFiguresBody:
        # Sleep of no told stage is in asleep_min only.
        stages = self.stages
        if stages is not None and (
            stages.rem_min + stages.light_min + stages.deep_min > self.asleep_min
        ):
            raise ValueError("the stages add up to the time asleep at most")
        return self


class SleepNightRequestBody(SleepFiguresBody):
    """PUT /me/sleep/{night}: fixtures/sleep-night-request.json."""

    shared: bool | None = Field(
        None,
        description="On the profile or not; left out, as it was (off for a"
        " night not kept yet).",
    )


class SleepSharedRequestBody(BaseModel):
    """PATCH /me/sleep/{night}."""

    model_config = ConfigDict(extra="forbid")

    shared: bool


class ActivitySleepRequestBody(SleepFiguresBody):
    """PUT /me/activities/{key}/sleep: fixtures/sleep-activity-request.json."""

    night: date = Field(description="The day the person woke up.")
    shown: bool = Field(
        True, description="«Sleep last night»: whether others see it in the post."
    )


class SleepShownRequestBody(BaseModel):
    """PATCH /me/activities/{key}/sleep."""

    model_config = ConfigDict(extra="forbid")

    shown: bool


class SleepNightBody(SleepSummaryBody):
    """A night as its owner reads it: fixtures/sleep-night.json."""

    shared: bool


class ActivitySleepBody(SleepSummaryBody):
    """The night of an activity as its owner reads it:
    fixtures/sleep-activity.json."""

    shown: bool


NIGHT_COLUMNS = (
    "n.night, n.score, n.asleep_min, n.awake_min," " n.rem_min, n.light_min, n.deep_min"
)


def _figures(row: DictRow) -> dict[str, Any]:
    stages = None
    if row["rem_min"] is not None:
        stages = SleepStagesBody(
            rem_min=row["rem_min"],
            light_min=row["light_min"],
            deep_min=row["deep_min"],
        )
    return {
        "night": row["night"],
        "score": row["score"],
        "asleep_min": row["asleep_min"],
        "awake_min": row["awake_min"],
        "stages": stages,
    }


def _keep(
    conn: DictConnection,
    user_id: int,
    night: date,
    figures: SleepFiguresBody,
    shared: bool | None,
    now: datetime,
) -> int:
    """The night with these figures, over the ones it had; `shared` as
    given, or as it was. Its id."""
    stages = figures.stages
    row = conn.execute(
        "INSERT INTO sleep_nights (user_id, night, score, asleep_min, awake_min,"
        " rem_min, light_min, deep_min, shared, saved_at)"
        " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, false), %s)"
        " ON CONFLICT (user_id, night) DO UPDATE SET score = EXCLUDED.score,"
        " asleep_min = EXCLUDED.asleep_min, awake_min = EXCLUDED.awake_min,"
        " rem_min = EXCLUDED.rem_min, light_min = EXCLUDED.light_min,"
        " deep_min = EXCLUDED.deep_min,"
        " shared = COALESCE(%s, sleep_nights.shared),"
        " saved_at = EXCLUDED.saved_at"
        " RETURNING id",
        (
            user_id,
            night,
            figures.score,
            figures.asleep_min,
            figures.awake_min,
            None if stages is None else stages.rem_min,
            None if stages is None else stages.light_min,
            None if stages is None else stages.deep_min,
            shared,
            now,
            shared,
        ),
    ).fetchone()
    assert row is not None
    return int(row["id"])


def _drop_unpublished(conn: DictConnection, user_id: int) -> None:
    """Only what is published stays: the account's nights that are neither
    on the profile nor carried by an activity go."""
    conn.execute(
        "DELETE FROM sleep_nights n WHERE n.user_id = %s AND NOT n.shared"
        " AND NOT EXISTS (SELECT 1 FROM runs r WHERE r.sleep_night_id = n.id)",
        (user_id,),
    )


def _one_at_a_time(conn: DictConnection, user_id: int) -> None:
    """One account's sleep changes one request at a time, as its runs do
    (activities.py): what is kept is decided on what is there."""
    conn.execute("SELECT 1 FROM users WHERE id = %s FOR UPDATE", (user_id,))


@dataclass
class Sleep:
    """The nights of sleep, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime] = now_utc

    def _checked(self, night: date) -> None:
        if not EARLIEST_NIGHT <= night <= self.now().date() + NIGHT_AHEAD:
            raise AccountError(422, "invalid_request", BAD_NIGHT)

    # --- The night, and the profile ---

    def _night(
        self, conn: DictConnection, user_id: int, night: date
    ) -> SleepNightBody | None:
        row = conn.execute(
            f"SELECT {NIGHT_COLUMNS}, n.shared FROM sleep_nights n"
            " WHERE n.user_id = %s AND n.night = %s",
            (user_id, night),
        ).fetchone()
        if row is None:
            return None
        return SleepNightBody(**_figures(row), shared=row["shared"])

    def night(self, user_id: int, night: date) -> SleepNightBody | None:
        with self.database.connect() as conn:
            return self._night(conn, user_id, night)

    def save(
        self, user_id: int, night: date, body: SleepNightRequestBody
    ) -> SleepNightBody | None:
        """The night as kept, or None: neither on the profile nor in a
        post, nothing publishes it and it is not kept."""
        self._checked(night)
        with self.database.connect() as conn:
            _one_at_a_time(conn, user_id)
            _keep(conn, user_id, night, body, body.shared, self.now())
            _drop_unpublished(conn, user_id)
            return self._night(conn, user_id, night)

    def share(
        self, user_id: int, night: date, shared: bool
    ) -> tuple[bool, SleepNightBody | None]:
        """Whether there was a night to change, and the night as kept: None
        when, off the profile, nothing publishes it any more."""
        with self.database.connect() as conn:
            _one_at_a_time(conn, user_id)
            changed = conn.execute(
                "UPDATE sleep_nights SET shared = %s"
                " WHERE user_id = %s AND night = %s RETURNING id",
                (shared, user_id, night),
            ).fetchone()
            if changed is None:
                return False, None
            _drop_unpublished(conn, user_id)
            return True, self._night(conn, user_id, night)

    def share_none(self, user_id: int) -> None:
        """«Stop sharing»: no night of the account is on its profile."""
        with self.database.connect() as conn:
            _one_at_a_time(conn, user_id)
            conn.execute(
                "UPDATE sleep_nights SET shared = false WHERE user_id = %s AND shared",
                (user_id,),
            )
            _drop_unpublished(conn, user_id)

    def forget(self, user_id: int, night: date) -> None:
        """Off the server: off the profile, and off the posts that carried
        it, which stay as they were without it."""
        with self.database.connect() as conn:
            conn.execute(
                "DELETE FROM sleep_nights WHERE user_id = %s AND night = %s",
                (user_id, night),
            )

    def of_profile(self, viewer_id: int, public_id: str) -> SleepSummaryBody | None:
        """The latest night the account with this id shares, as `viewer_id`
        reads it, its owner too; None for no profile, none across a block
        (follows.apart_sql) and no night shared, all alike."""
        try:
            wanted = UUID(public_id)
        except ValueError:
            return None
        with self.database.connect() as conn:
            row = conn.execute(
                f"SELECT {NIGHT_COLUMNS} FROM users u"
                " JOIN sleep_nights n ON n.user_id = u.id"
                " WHERE u.public_id = %s AND n.shared"
                f" AND NOT {apart_sql('%s', 'u.id')}"
                " ORDER BY n.night DESC LIMIT 1",
                (wanted, viewer_id),
            ).fetchone()
        return None if row is None else SleepSummaryBody(**_figures(row))

    # --- The night of an activity, and its post ---

    def _of_activity(
        self, conn: DictConnection, user_id: int, key: str
    ) -> ActivitySleepBody | None:
        row = conn.execute(
            f"SELECT {NIGHT_COLUMNS}, r.sleep_shown FROM runs r"
            " JOIN sleep_nights n ON n.id = r.sleep_night_id"
            " WHERE r.user_id = %s AND r.key = %s",
            (user_id, key),
        ).fetchone()
        if row is None:
            return None
        return ActivitySleepBody(**_figures(row), shown=row["sleep_shown"])

    def of_activity(self, user_id: int, key: str) -> ActivitySleepBody | None:
        with self.database.connect() as conn:
            return self._of_activity(conn, user_id, key)

    def attach(
        self, user_id: int, key: str, body: ActivitySleepRequestBody
    ) -> ActivitySleepBody:
        """The night kept with these figures and given to the activity, in
        place of the one it had; on the profile or not, as it was. 404 for
        no activity, 422 for a night that is not the one before it."""
        self._checked(body.night)
        with self.database.connect() as conn:
            _one_at_a_time(conn, user_id)
            run = conn.execute(
                "SELECT started_at FROM runs WHERE user_id = %s AND key = %s",
                (user_id, key),
            ).fetchone()
            if run is None:
                raise HTTPException(404, UNKNOWN_ACTIVITY)
            if abs(body.night - run["started_at"].date()) > ACTIVITY_NIGHT_APART:
                raise AccountError(422, "invalid_request", NOT_LAST_NIGHT)
            night_id = _keep(conn, user_id, body.night, body, None, self.now())
            # The night it had before, left by its last activity and not on
            # the profile, goes (migration 0072).
            conn.execute(
                "UPDATE runs SET sleep_night_id = %s, sleep_shown = %s"
                " WHERE user_id = %s AND key = %s",
                (night_id, body.shown, user_id, key),
            )
            kept = self._of_activity(conn, user_id, key)
        assert kept is not None
        return kept

    def show(self, user_id: int, key: str, shown: bool) -> ActivitySleepBody | None:
        """The switch alone; None for an activity without a night."""
        with self.database.connect() as conn:
            conn.execute(
                "UPDATE runs SET sleep_shown = %s WHERE user_id = %s AND key = %s"
                " AND sleep_night_id IS NOT NULL",
                (shown, user_id, key),
            )
            return self._of_activity(conn, user_id, key)

    def detach(self, user_id: int, key: str) -> None:
        """The activity without a night, its switch as at the start; the
        night goes too unless another publishes it (migration 0072)."""
        with self.database.connect() as conn:
            _one_at_a_time(conn, user_id)
            conn.execute(
                "UPDATE runs SET sleep_night_id = NULL, sleep_shown = true"
                " WHERE user_id = %s AND key = %s AND sleep_night_id IS NOT NULL",
                (user_id, key),
            )

    def of_drawing(
        self, viewer_id: int, drawing_id: str, reads: Reads = EVERYTHING
    ) -> SleepSummaryBody | None:
        """The night of the activity of a drawing `viewer_id` sees, of an
        activity `reads` shows, while its owner shows it or `viewer_id` is
        the owner; None otherwise, all alike."""
        try:
            wanted = UUID(drawing_id)
        except ValueError:
            return None
        with self.database.connect() as conn:
            row = conn.execute(
                f"SELECT {NIGHT_COLUMNS} FROM drawings d"
                " JOIN runs r ON r.id = d.run_id"
                " JOIN sleep_nights n ON n.id = r.sleep_night_id"
                f" WHERE d.id = %s AND {drawing_seen_sql('%s')}"
                " AND (r.sleep_shown OR r.user_id = %s)"
                f" AND {reads.sql('r.activity', 'r.track IS NOT NULL')}",
                (wanted, viewer_id, viewer_id),
            ).fetchone()
        return None if row is None else SleepSummaryBody(**_figures(row))


# --- The endpoints ---


def sleep_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> Sleep:
    """In the database of the accounts, on their clock."""
    return Sleep(accounts.database, accounts.now)


Nights = Annotated[Sleep, Depends(sleep_of)]
Me = Annotated[UserBody, Depends(current_user)]
NOT_FOUND: dict[int | str, dict[str, Any]] = {404: {"model": ErrorBody}}
# 204: nothing publishes the night any more, and it is not kept.
NOT_KEPT: dict[int | str, dict[str, Any]] = {
    204: {"description": "Nothing publishes the night: it is not kept."}
}


def sleep_routes() -> APIRouter:
    router = APIRouter(tags=["sleep"], responses=ACCOUNT_ERRORS)

    # Before /me/sleep/{night}: «shared» is no day.
    @router.delete("/me/sleep/shared", status_code=204)
    def stop_sharing_sleep(nights: Nights, user: Me) -> Response:
        nights.share_none(user.id)
        return Response(status_code=204)

    @router.get(
        "/me/sleep/{night}", responses=NOT_FOUND, response_model_exclude_none=True
    )
    def read_night(night: date, nights: Nights, user: Me) -> SleepNightBody:
        found = nights.night(user.id, night)
        if found is None:
            raise HTTPException(404, NO_NIGHT)
        return found

    @router.put(
        "/me/sleep/{night}",
        response_model=SleepNightBody,
        responses=NOT_KEPT,
        response_model_exclude_none=True,
    )
    def save_night(
        night: date, body: SleepNightRequestBody, nights: Nights, user: Me
    ) -> SleepNightBody | Response:
        kept = nights.save(user.id, night, body)
        return Response(status_code=204) if kept is None else kept

    @router.patch(
        "/me/sleep/{night}",
        response_model=SleepNightBody,
        responses={**NOT_FOUND, **NOT_KEPT},
        response_model_exclude_none=True,
    )
    def share_night(
        night: date, body: SleepSharedRequestBody, nights: Nights, user: Me
    ) -> SleepNightBody | Response:
        found, kept = nights.share(user.id, night, body.shared)
        if not found:
            raise HTTPException(404, NO_NIGHT)
        return Response(status_code=204) if kept is None else kept

    @router.delete("/me/sleep/{night}", status_code=204)
    def forget_night(night: date, nights: Nights, user: Me) -> Response:
        nights.forget(user.id, night)
        return Response(status_code=204)

    @router.get(
        "/users/{public_id}/sleep",
        responses=NOT_FOUND,
        response_model_exclude_none=True,
    )
    def profile_sleep(public_id: str, nights: Nights, user: Me) -> SleepSummaryBody:
        found = nights.of_profile(user.id, public_id)
        if found is None:
            raise HTTPException(404, NO_SLEEP)
        return found

    @router.get(
        "/me/activities/{key}/sleep",
        responses=NOT_FOUND,
        response_model_exclude_none=True,
    )
    def read_activity_sleep(key: Key, nights: Nights, user: Me) -> ActivitySleepBody:
        found = nights.of_activity(user.id, key)
        if found is None:
            raise HTTPException(404, NO_ACTIVITY_SLEEP)
        return found

    @router.put(
        "/me/activities/{key}/sleep",
        responses=NOT_FOUND,
        response_model_exclude_none=True,
    )
    def attach_activity_sleep(
        key: Key, body: ActivitySleepRequestBody, nights: Nights, user: Me
    ) -> ActivitySleepBody:
        return nights.attach(user.id, key, body)

    @router.patch(
        "/me/activities/{key}/sleep",
        responses=NOT_FOUND,
        response_model_exclude_none=True,
    )
    def show_activity_sleep(
        key: Key, body: SleepShownRequestBody, nights: Nights, user: Me
    ) -> ActivitySleepBody:
        found = nights.show(user.id, key, body.shown)
        if found is None:
            raise HTTPException(404, NO_ACTIVITY_SLEEP)
        return found

    @router.delete("/me/activities/{key}/sleep", status_code=204)
    def detach_activity_sleep(key: Key, nights: Nights, user: Me) -> Response:
        nights.detach(user.id, key)
        return Response(status_code=204)

    @router.get(
        "/drawings/{drawing_id}/sleep",
        responses=NOT_FOUND,
        response_model_exclude_none=True,
    )
    def drawing_sleep(
        drawing_id: str, nights: Nights, user: Me, reads: Shown
    ) -> SleepSummaryBody:
        found = nights.of_drawing(user.id, drawing_id, reads)
        if found is None:
            raise HTTPException(404, NO_SLEEP)
        return found

    return router


def install_sleep(app: FastAPI) -> None:
    """After install_accounts, which sets the database and the errors;
    without a database the endpoints answer 503, as the others of the
    accounts."""
    app.include_router(sleep_routes())
