"""The personal challenges and the streak in the database (TASK-423 part C,
ADR-0351, docs/GIOCO.md §6.6–6.7): the steps a saved run reached, written in
its transaction, and GET /game/personal. The rules are game_personal.py.

A step is written only when a run is saved (game.after_run_saved): the
backfill does not write them, so the medals start with the week the part
went out. The streak needs no row: it is computed from game_runs, the whole
history of the account.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, FastAPI, Query
from psycopg import Connection
from psycopg.rows import DictRow
from pydantic import BaseModel, Field

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.db import Database
from shaperoute_api.game_personal import (
    CHALLENGES,
    Challenge,
    Outing,
    in_month,
    in_week,
    month_challenges,
    month_end,
    month_of,
    standings,
    streaks,
    week_challenges,
    week_end,
    week_of,
)

# The phone's offset from UTC, in minutes: from UTC−14 to UTC+14.
MIN_OFFSET_MIN, MAX_OFFSET_MIN = -840, 840
# A period on the runner's clock lies within this of the same period in UTC.
_ZONE_SLACK = timedelta(minutes=MAX_OFFSET_MIN)
# The finished challenges shown: those of the last weeks.
FINISHED_WEEKS = 8


# --- The bodies ---


class ChallengeBody(BaseModel):
    id: str
    unit: Literal["m", "count", "days", "pace_s"] = Field(
        description="metres, a count, days, or seconds a km (lower is better)."
    )
    tiers: list[float] = Field(description="Bronze, silver, gold.")


class StandingBody(ChallengeBody):
    value: float | None = Field(
        description="Where the account is: metres, a count, days, or its best "
        "pace in seconds a km (null: no run of that distance yet)."
    )
    tier: int = Field(description="0 to 3: the steps reached.")


class PeriodBody(BaseModel):
    start: date = Field(description="Its first day, on the runner's clock.")
    end: date = Field(description="The day after its last.")
    challenges: list[StandingBody]


class StreakBody(BaseModel):
    runs: int = Field(description="Outings a week the line asks: 1, 2 or 3.")
    current: int
    best: int


class FinishedBody(ChallengeBody):
    period: Literal["week", "month"]
    start: date
    tier: int = Field(description="1 bronze, 2 silver, 3 gold.")
    done_at: datetime


class GamePersonalBody(BaseModel):
    """GET /game/personal: this week's and this month's challenges, the
    streak, and the steps reached in the last weeks."""

    week: PeriodBody
    month: PeriodBody
    streaks: list[StreakBody]
    finished: list[FinishedBody]


def _challenge(challenge: Challenge) -> dict[str, object]:
    return {
        "id": challenge.id,
        "unit": challenge.unit,
        "tiers": list(challenge.tiers),
    }


# --- Reading the runs ---


def _outings(
    conn: Connection[DictRow],
    user_id: int,
    since: datetime | None = None,
    until: datetime | None = None,
) -> list[Outing]:
    """The counted runs of the account, between two UTC times if given."""
    sql = (
        "SELECT g.started_at, g.utc_offset_min, g.counted_m, g.best_s,"
        " r.activity = 'running' AS running"
        " FROM game_runs g JOIN runs r ON r.id = g.run_id"
        " WHERE g.user_id = %s AND g.counted"
    )
    args: list[object] = [user_id]
    if since is not None:
        sql += " AND g.started_at >= %s"
        args.append(since)
    if until is not None:
        sql += " AND g.started_at < %s"
        args.append(until)
    rows = conn.execute(sql, args).fetchall()
    return [
        Outing(
            started_at=row["started_at"],
            utc_offset_min=row["utc_offset_min"],
            counted_m=row["counted_m"],
            running=bool(row["running"]),
            best_s={int(d): float(s) for d, s in row["best_s"].items()},
        )
        for row in rows
    ]


def _around(start: date, end: date) -> tuple[datetime, datetime]:
    """UTC times that hold every run whose local day is in [start, end)."""
    begin = datetime(start.year, start.month, start.day, tzinfo=UTC)
    after = datetime(end.year, end.month, end.day, tzinfo=UTC)
    return begin - _ZONE_SLACK, after + _ZONE_SLACK


# --- Writing a run's steps ---


def record_personal(
    conn: Connection[DictRow], user_id: int, run_id: int, now: datetime
) -> None:
    """In the transaction that saved the run, after its game row: the steps
    the challenges of its week and of its month reached, by the run's own
    local day (a run sent late from the phone's queue counts in its week).
    A step only goes up."""
    row = conn.execute(
        "SELECT g.started_at, g.utc_offset_min, g.counted_m, g.counted,"
        " r.activity = 'running' AS running"
        " FROM game_runs g JOIN runs r ON r.id = g.run_id WHERE g.run_id = %s",
        (run_id,),
    ).fetchone()
    if row is None or not row["counted"]:
        return
    local_day = Outing(
        row["started_at"], row["utc_offset_min"], row["counted_m"], row["running"]
    ).local.date()
    monday, first = week_of(local_day), month_of(local_day)
    # The week may begin in the month before, or end in the next.
    since, until = _around(min(monday, first), max(week_end(monday), month_end(first)))
    runs = _outings(conn, user_id, since, until)
    reached = [
        (monday, s) for s in standings(week_challenges(monday), in_week(runs, monday))
    ] + [(first, s) for s in standings(month_challenges(first), in_month(runs, first))]
    for start, standing in reached:
        if standing.tier == 0:
            continue
        conn.execute(
            "INSERT INTO game_personal (user_id, period_start, challenge_id, tier,"
            " done_at, run_id) VALUES (%s, %s, %s, %s, %s, %s)"
            " ON CONFLICT (user_id, period_start, challenge_id) DO UPDATE SET"
            " tier = EXCLUDED.tier, done_at = EXCLUDED.done_at,"
            " run_id = EXCLUDED.run_id WHERE game_personal.tier < EXCLUDED.tier",
            (user_id, start, standing.challenge.id, standing.tier, now, run_id),
        )


# --- Reading the challenges of an account ---


@dataclass
class Personal:
    database: Database
    now: Callable[[], datetime]

    def of(self, user_id: int, utc_offset_min: int | None) -> GamePersonalBody:
        """The account's challenges on its clock: the offset the phone sends,
        else the one of its newest run, else UTC."""
        with self.database.connect() as conn:
            runs = _outings(conn, user_id)
            if utc_offset_min is None:
                newest = max(runs, key=lambda r: r.started_at, default=None)
                utc_offset_min = newest.utc_offset_min if newest else None
            today = Outing(self.now(), utc_offset_min, 0, False).local.date()
            monday, first = week_of(today), month_of(today)
            finished = conn.execute(
                "SELECT period_start, challenge_id, tier, done_at FROM game_personal"
                " WHERE user_id = %s AND period_start >= %s"
                " ORDER BY period_start DESC, challenge_id",
                (user_id, monday - timedelta(weeks=FINISHED_WEEKS)),
            ).fetchall()
        return GamePersonalBody(
            week=_period(
                monday, week_end(monday), week_challenges(monday), in_week(runs, monday)
            ),
            month=_period(
                first, month_end(first), month_challenges(first), in_month(runs, first)
            ),
            streaks=[
                StreakBody(runs=s.runs, current=s.current, best=s.best)
                for s in streaks(runs, monday)
            ],
            finished=[
                FinishedBody(
                    **_challenge(CHALLENGES[row["challenge_id"]]),
                    period=CHALLENGES[row["challenge_id"]].period,
                    start=row["period_start"],
                    tier=row["tier"],
                    done_at=row["done_at"],
                )
                for row in finished
                if row["challenge_id"] in CHALLENGES
                and not _current(
                    row["period_start"], row["challenge_id"], monday, first
                )
            ],
        )


def _period(
    start: date, end: date, challenges: Sequence[Challenge], runs: Sequence[Outing]
) -> PeriodBody:
    return PeriodBody(
        start=start,
        end=end,
        challenges=[
            StandingBody(**_challenge(s.challenge), value=s.value, tier=s.tier)
            for s in standings(challenges, runs)
        ],
    )


def _current(start: date, challenge_id: str, monday: date, first: date) -> bool:
    """A step of this week or this month: shown with its period, not as
    finished."""
    period = CHALLENGES[challenge_id].period
    return start == (monday if period == "week" else first)


# --- The endpoint ---


def personal_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> Personal:
    return Personal(accounts.database, accounts.now)


def personal_routes() -> APIRouter:
    router = APIRouter(tags=["game"])

    @router.get("/game/personal", responses=ACCOUNT_ERRORS)
    def game_personal(
        personal: Annotated[Personal, Depends(personal_of)],
        user: Annotated[UserBody, Depends(current_user)],
        utc_offset_min: Annotated[
            int | None, Query(ge=MIN_OFFSET_MIN, le=MAX_OFFSET_MIN)
        ] = None,
    ) -> GamePersonalBody:
        return personal.of(user.id, utc_offset_min)

    return router


def install_game_personal(app: FastAPI) -> None:
    app.include_router(personal_routes())
