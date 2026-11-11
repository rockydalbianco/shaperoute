"""The calendar of one's own workouts at the gym (TASK-411 part B, ADR-0341
point 2, docs/sports/gym.md «Il calendario»): for a month of the calendar
on the phone's time zone, the days with a workout, each with its start, its
time and its post when there is one; the month's count and time; and the
last workout of all, for «Last workout» in Draw.

Only the owner: it is under /me. Read from `runs` with the activity
«gym», no table of its own and no migration.
"""

from __future__ import annotations

import re
from calendar import monthrange
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime
from typing import Annotated, Any
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.db import Database
from shaperoute_api.gym_plans import planned_on, program_of
from shaperoute_api.schemas import ErrorBody

MONTH = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")
UNKNOWN_ZONE = "unknown_time_zone"


class GymCalendarWorkoutBody(BaseModel):
    """packages/shared-types src/gym.ts, `GymCalendarWorkout`."""

    id: str = Field(description="The key the app gave it, as in /me/activities.")
    started_at: datetime
    duration_s: int = Field(ge=0, description="Pauses left out, rests in.")
    drawing_id: UUID | None = Field(description="Its post, when it has one.")
    plan: str | None = Field(
        default=None,
        description="The name of the plan it followed (TASK-411 C); null for none.",
    )


class GymCalendarSkippedBody(BaseModel):
    """packages/shared-types src/gym.ts, `GymCalendarSkipped`."""

    day: int = Field(ge=1, le=31)
    plan: str = Field(description="The name of the plan of that day.")


class GymCalendarDayBody(BaseModel):
    """packages/shared-types src/gym.ts, `GymCalendarDay`."""

    day: int = Field(ge=1, le=31, description="The day of the month, on `tz`.")
    workouts: list[GymCalendarWorkoutBody] = Field(description="The first first.")


class GymCalendarBody(BaseModel):
    """packages/shared-types src/gym.ts, `GymCalendar`."""

    month: str = Field(description="YYYY-MM, a month of the calendar on `tz`.")
    tz: str = Field(description="The time zone the days are counted on.")
    count: int = Field(ge=0, description="The workouts of the month.")
    duration_s: int = Field(ge=0, description="Their time, added up.")
    days: list[GymCalendarDayBody] = Field(description="Only days with a workout.")
    last: GymCalendarWorkoutBody | None = Field(
        description="The last workout of all, of any month; null for none."
    )
    skipped: list[GymCalendarSkippedBody] = Field(
        default_factory=list,
        description="The days of a plan gone by without a workout of it,"
        " since the plan was made (TASK-411 C).",
    )


def _workout(row: dict[str, Any]) -> GymCalendarWorkoutBody:
    return GymCalendarWorkoutBody(
        id=row["key"],
        started_at=row["started_at"],
        duration_s=row["duration_s"],
        drawing_id=row["drawing_id"],
        plan=row["plan"],
    )


# A workout's post (one a run at most), when the moderation has not hidden it.
# And the plan it followed, when the plan is still there (gym_plans.py).
_POST = (
    " LEFT JOIN drawings p ON p.run_id = r.id AND p.hidden_at IS NULL"
    " LEFT JOIN gym_sessions g ON g.run_id = r.id"
    " LEFT JOIN gym_plans gp ON gp.user_id = r.user_id AND gp.key = g.plan_key"
)
_COLUMNS = (
    "r.key, r.started_at, r.duration_s, p.id AS drawing_id,"
    " gp.name AS plan, g.plan_key"
)


@dataclass
class GymCalendars:
    """The calendars, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]

    def of(self, owner: int, tz: str, month: str | None) -> GymCalendarBody:
        """The calendar of `owner` for `month` on `tz` (this month there
        when None)."""
        if month is None:
            month = self.now().astimezone(ZoneInfo(tz)).strftime("%Y-%m")
        matched = MONTH.match(month)
        assert matched is not None
        params = {
            "owner": owner,
            "tz": tz,
            "year": int(matched.group(1)),
            "month": int(matched.group(2)),
            "now": self.now(),
        }
        start = "make_timestamp(%(year)s, %(month)s, 1, 0, 0, 0)"
        with self.database.connect() as conn:
            rows = conn.execute(
                f"SELECT {_COLUMNS},"
                " extract(day FROM r.started_at AT TIME ZONE %(tz)s)::int AS day"
                f" FROM runs r{_POST}"
                " WHERE r.user_id = %(owner)s AND r.activity = 'gym'"
                f" AND r.started_at >= ({start} AT TIME ZONE %(tz)s)"
                f" AND r.started_at < (({start} + interval '1 month')"
                " AT TIME ZONE %(tz)s)"
                " ORDER BY r.started_at, r.id",
                params,
            ).fetchall()
            last = conn.execute(
                f"SELECT {_COLUMNS} FROM runs r{_POST}"
                " WHERE r.user_id = %(owner)s AND r.activity = 'gym'"
                " AND r.started_at <= %(now)s"
                " ORDER BY r.started_at DESC, r.id DESC LIMIT 1",
                params,
            ).fetchone()
            # The days with a run: a run day of a plan done (TASK-433 C).
            ran = {
                row["day"]
                for row in conn.execute(
                    "SELECT DISTINCT extract(day FROM r.started_at AT TIME ZONE"
                    " %(tz)s)::int AS day FROM runs r"
                    " WHERE r.user_id = %(owner)s AND r.activity = 'running'"
                    f" AND r.started_at >= ({start} AT TIME ZONE %(tz)s)"
                    f" AND r.started_at < (({start} + interval '1 month')"
                    " AT TIME ZONE %(tz)s)",
                    params,
                ).fetchall()
            }
            kept = conn.execute(
                "SELECT key, name, days, created_at, program FROM gym_plans"
                " WHERE user_id = %(owner)s ORDER BY position, key",
                params,
            ).fetchall()
        plans = [{**plan, "program": program_of(plan)} for plan in kept]
        days: dict[int, list[GymCalendarWorkoutBody]] = {}
        followed: set[tuple[int, str]] = set()
        for row in rows:
            days.setdefault(row["day"], []).append(_workout(row))
            if row["plan_key"] is not None:
                followed.add((row["day"], row["plan_key"]))
        zone = ZoneInfo(tz)
        today = self.now().astimezone(zone).date()
        year, number = params["year"], params["month"]

        def missed(plan: dict[str, Any], day: int) -> bool:
            """Whether `plan` had a workout on `day` not done: a run day
            done by any run, a workout of the gym by one that followed it."""
            on = date(year, number, day)
            program = plan["program"]
            if program is None:
                return (
                    planned_on(plan["days"], None, on)
                    and (
                        day,
                        plan["key"],
                    )
                    not in followed
                )
            return any(
                (
                    day not in ran
                    if session.run is not None
                    else (day, plan["key"]) not in followed
                )
                for session in program.sessions_on(on)
            )

        skipped = [
            GymCalendarSkippedBody(day=day, plan=plan["name"])
            for day in range(1, monthrange(year, number)[1] + 1)
            for plan in plans
            if plan["created_at"].astimezone(zone).date()
            <= date(year, number, day)
            < today
            and missed(plan, day)
        ]
        return GymCalendarBody(
            month=month,
            tz=tz,
            count=len(rows),
            duration_s=sum(row["duration_s"] for row in rows),
            days=[
                GymCalendarDayBody(day=day, workouts=workouts)
                for day, workouts in sorted(days.items())
            ],
            last=None if last is None else _workout(last),
            skipped=skipped,
        )


# --- The endpoint ---


def gym_calendars_of(
    accounts: Annotated[Accounts, Depends(accounts_of)],
) -> GymCalendars:
    """In the database of the accounts, on the same clock."""
    return GymCalendars(accounts.database, accounts.now)


Calendars = Annotated[GymCalendars, Depends(gym_calendars_of)]
Me = Annotated[UserBody, Depends(current_user)]


def known_zone(tz: str) -> bool:
    """Whether `tz` is a time zone of the IANA database, as the phone
    sends it («Europe/Rome»)."""
    try:
        ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError):
        return False
    return True


def gym_calendar_routes() -> APIRouter:
    router = APIRouter(tags=["gym"], responses=ACCOUNT_ERRORS)

    @router.get("/me/gym-calendar", responses={422: {"model": ErrorBody}})
    def gym_calendar(
        calendars: Calendars,
        user: Me,
        tz: Annotated[str, Query(pattern=r"^[A-Za-z0-9_+\-/]{1,64}$")],
        month: Annotated[str | None, Query(pattern=MONTH.pattern)] = None,
    ) -> GymCalendarBody:
        if not known_zone(tz):
            raise HTTPException(422, UNKNOWN_ZONE)
        return calendars.of(user.id, tz, month)

    return router


def install_gym_calendar(app: FastAPI) -> None:
    """Without a database the endpoint answers 503, as the others of the
    accounts."""
    app.include_router(gym_calendar_routes())
