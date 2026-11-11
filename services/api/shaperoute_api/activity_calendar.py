"""The calendar of all one's own activities (TASK-462 part A, ADR-0372,
docs/API.md «Il calendario delle attività»): for a month of the calendar on
the phone's time zone, the days with an activity of any sport, each with its
sport, start, metres, time and calories; the month's count, metres and time;
the twelve months up to it, for the bars of «storico tempi»; and the sports
the owner has, for the filter.

Only the owner: it is under /me. Read from `runs`, with the calories the
phone sent in `run_stats`: no table of its own and no migration, as the
calendar of the gym (gym_calendar.py). Only what the app of the request
reads (X-MuW-Reads, reads.py), as «My activities»: a day never shows an
activity its list would not open.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import RunActivity
from shaperoute_api.db import Database
from shaperoute_api.gym_calendar import MONTH, UNKNOWN_ZONE, known_zone
from shaperoute_api.reads import Reads, Shown
from shaperoute_api.schemas import ErrorBody

# The months of the bars: the one asked and the eleven before it.
TREND_MONTHS = 12


class CalendarActivityBody(BaseModel):
    """packages/shared-types src/activityCalendar.ts, `CalendarActivity`."""

    id: str = Field(description="The key the app gave it, as in /me/activities.")
    activity: RunActivity
    started_at: datetime
    distance_m: float = Field(ge=0)
    duration_s: int = Field(ge=0, description="Pauses left out.")
    kcal: int | None = Field(
        ge=0, description="What the phone sent at the end; null when it sent none."
    )
    shape: str | None
    word: str | None
    title: str | None
    place: str | None


class CalendarDayBody(BaseModel):
    """packages/shared-types src/activityCalendar.ts, `CalendarDay`."""

    day: int = Field(ge=1, le=31, description="The day of the month, on `tz`.")
    activities: list[CalendarActivityBody] = Field(description="The first first.")


class CalendarMonthBody(BaseModel):
    """packages/shared-types src/activityCalendar.ts, `CalendarMonth`."""

    month: str = Field(description="YYYY-MM on `tz`.")
    count: int = Field(ge=0)
    distance_m: float = Field(ge=0)
    duration_s: int = Field(ge=0)


class ActivityCalendarBody(BaseModel):
    """packages/shared-types src/activityCalendar.ts, `ActivityCalendar`."""

    month: str = Field(description="YYYY-MM, a month of the calendar on `tz`.")
    tz: str = Field(description="The time zone the days are counted on.")
    sport: RunActivity | None = Field(description="The sport asked; null for all.")
    count: int = Field(ge=0, description="The activities of the month.")
    distance_m: float = Field(ge=0, description="Their metres, added up.")
    duration_s: int = Field(ge=0, description="Their time, added up.")
    days: list[CalendarDayBody] = Field(description="Only days with an activity.")
    trend: list[CalendarMonthBody] = Field(
        description="The twelve months up to `month`, the oldest first, each"
        " one even without activities; of `sport` when asked."
    )
    sports: list[RunActivity] = Field(
        description="The sports the owner has activities of, of any month and"
        " whatever `sport` is: the most first."
    )


def _activity(row: dict[str, Any]) -> CalendarActivityBody:
    return CalendarActivityBody(
        id=row["key"],
        activity=row["activity"],
        started_at=row["started_at"],
        distance_m=round(float(row["distance_m"]), 1),
        duration_s=row["duration_s"],
        kcal=row["kcal"],
        shape=row["shape"],
        word=row["word"],
        title=row["title"],
        place=row["place"],
    )


def _shifted(year: int, month: int, by: int) -> tuple[int, int]:
    """The month `by` months from (`year`, `month`)."""
    index = year * 12 + month - 1 + by
    return index // 12, index % 12 + 1


@dataclass
class ActivityCalendars:
    """The calendars, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]

    def of(
        self,
        owner: int,
        tz: str,
        month: str | None,
        sport: RunActivity | None,
        reads: Reads,
    ) -> ActivityCalendarBody:
        """The calendar of `owner` for `month` on `tz` (this month there
        when None), of `sport` (all when None), of what `reads` shows."""
        if month is None:
            month = self.now().astimezone(ZoneInfo(tz)).strftime("%Y-%m")
        matched = MONTH.match(month)
        assert matched is not None
        year, number = int(matched.group(1)), int(matched.group(2))
        first_year, first_month = _shifted(year, number, 1 - TREND_MONTHS)
        params = {
            "owner": owner,
            "tz": tz,
            "year": year,
            "month": number,
            "first_year": first_year,
            "first_month": first_month,
            "sport": sport,
        }
        start = "make_timestamp(%(year)s, %(month)s, 1, 0, 0, 0)"
        first = "make_timestamp(%(first_year)s, %(first_month)s, 1, 0, 0, 0)"
        shown = reads.sql("r.activity", "r.track IS NOT NULL")
        mine = f"r.user_id = %(owner)s AND {shown}"
        of_sport = " AND r.activity = %(sport)s" if sport is not None else ""
        with self.database.connect() as conn:
            rows = conn.execute(
                "SELECT r.key, r.activity, r.started_at, r.distance_m,"
                " r.duration_s, r.shape, r.word, r.title, r.place,"
                " CASE WHEN jsonb_typeof(s.stats -> 'kcal') = 'number'"
                " THEN (s.stats ->> 'kcal')::numeric::int END AS kcal,"
                " extract(day FROM r.started_at AT TIME ZONE %(tz)s)::int AS day"
                " FROM runs r LEFT JOIN run_stats s ON s.run_id = r.id"
                f" WHERE {mine}{of_sport}"
                f" AND r.started_at >= ({start} AT TIME ZONE %(tz)s)"
                f" AND r.started_at < (({start} + interval '1 month')"
                " AT TIME ZONE %(tz)s)"
                " ORDER BY r.started_at, r.id",
                params,
            ).fetchall()
            months = conn.execute(
                "SELECT to_char(r.started_at AT TIME ZONE %(tz)s, 'YYYY-MM')"
                " AS month, count(*) AS count,"
                " coalesce(sum(r.distance_m), 0) AS distance_m,"
                " coalesce(sum(r.duration_s), 0) AS duration_s"
                f" FROM runs r WHERE {mine}{of_sport}"
                f" AND r.started_at >= ({first} AT TIME ZONE %(tz)s)"
                f" AND r.started_at < (({start} + interval '1 month')"
                " AT TIME ZONE %(tz)s)"
                " GROUP BY 1",
                params,
            ).fetchall()
            sports = conn.execute(
                "SELECT r.activity FROM runs r"
                f" WHERE {mine} GROUP BY r.activity"
                " ORDER BY count(*) DESC, r.activity",
                params,
            ).fetchall()
        days: dict[int, list[CalendarActivityBody]] = {}
        for row in rows:
            days.setdefault(row["day"], []).append(_activity(row))
        counted = {row["month"]: row for row in months}
        trend = []
        for by in range(TREND_MONTHS):
            label_year, label_month = _shifted(first_year, first_month, by)
            label = f"{label_year:04d}-{label_month:02d}"
            row = counted.get(label)
            trend.append(
                CalendarMonthBody(
                    month=label,
                    count=0 if row is None else row["count"],
                    distance_m=0 if row is None else round(float(row["distance_m"]), 1),
                    duration_s=0 if row is None else int(row["duration_s"]),
                )
            )
        return ActivityCalendarBody(
            month=month,
            tz=tz,
            sport=sport,
            count=len(rows),
            distance_m=round(sum(float(row["distance_m"]) for row in rows), 1),
            duration_s=sum(row["duration_s"] for row in rows),
            days=[
                CalendarDayBody(day=day, activities=activities)
                for day, activities in sorted(days.items())
            ],
            trend=trend,
            sports=[row["activity"] for row in sports],
        )


# --- The endpoint ---


def activity_calendars_of(
    accounts: Annotated[Accounts, Depends(accounts_of)],
) -> ActivityCalendars:
    """In the database of the accounts, on the same clock."""
    return ActivityCalendars(accounts.database, accounts.now)


Calendars = Annotated[ActivityCalendars, Depends(activity_calendars_of)]
Me = Annotated[UserBody, Depends(current_user)]


def activity_calendar_routes() -> APIRouter:
    router = APIRouter(tags=["activities"], responses=ACCOUNT_ERRORS)

    @router.get("/me/activity-calendar", responses={422: {"model": ErrorBody}})
    def activity_calendar(
        calendars: Calendars,
        user: Me,
        reads: Shown,
        tz: Annotated[str, Query(pattern=r"^[A-Za-z0-9_+\-/]{1,64}$")],
        month: Annotated[str | None, Query(pattern=MONTH.pattern)] = None,
        sport: RunActivity | None = None,
    ) -> ActivityCalendarBody:
        if not known_zone(tz):
            raise HTTPException(422, UNKNOWN_ZONE)
        return calendars.of(user.id, tz, month, sport, reads)

    return router


def install_activity_calendar(app: FastAPI) -> None:
    """Without a database the endpoint answers 503, as the others of the
    accounts."""
    app.include_router(activity_calendar_routes())
