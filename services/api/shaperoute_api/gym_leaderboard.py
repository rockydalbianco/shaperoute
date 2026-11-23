"""The monthly leaderboard at the gym (TASK-385 part F, ADR-0327 point 9,
docs/sports/gym.md «La classifica»): for an exercise of the catalog and a
calendar month of Rome, each person's best set, the best first.

A set counts when it was logged live (during the workout, not after
«Stop»), under the cap of its scale, in a workout begun and published in
the month, for everyone, with its exercises shown, not hidden by the
moderation nor of a hidden account. One row a person, its value read as the
milestones read it (gym_levels.py: the kg of a load, absolute). A tie goes
to the set logged first. Never across a block (follows.apart_sql): a row
kept apart from who asks is not there, and the others keep their rank. A
row is reported by reporting its post: hidden, it no longer counts.

«Winner» (the user's choice of 2026-11-06): the first of an exercise in a
month that has ended, when at least three people are on its leaderboard;
counted with the contests won (accounts.contest_wins_sql), no push.

Counted at each reading, from gym_sets: no table of its own (ADR-0327,
precisazione F, says when one will be needed).
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

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
from shaperoute_api.follows import apart_sql
from shaperoute_api.gym_catalog import EXERCISES_BY_KEY, SCALES, Measure
from shaperoute_api.gym_levels import _CATALOG_SQL, _VALUE_SQL
from shaperoute_api.schemas import ErrorBody

# The rows shown; who asks sees its own row besides, whatever its rank.
TOP = 50
# The people a leaderboard needs for its first to be a «Winner».
WINNER_PEOPLE = 3
# The months are those of the calendar in Rome, as the contests'.
ZONE = "Europe/Rome"

UNKNOWN_EXERCISE = "unknown_exercise"
MONTH = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")


class LeaderboardPersonBody(BaseModel):
    """Who a row is of, as the profile says it: never the email."""

    public_id: UUID
    username: str


class GymLeaderboardRowBody(BaseModel):
    """packages/shared-types src/gym.ts, `GymLeaderboardRow`."""

    rank: int = Field(
        ge=1, description="1 is the first; a tie goes to the set logged first."
    )
    user: LeaderboardPersonBody
    value: float = Field(description="The best set, in the unit of `measure`.")
    drawing_id: UUID = Field(description="The post of the workout: open it, report it.")


class GymLeaderboardBody(BaseModel):
    """packages/shared-types src/gym.ts, `GymLeaderboard`."""

    month: str = Field(description="YYYY-MM, a calendar month of Rome.")
    exercise: str
    measure: Measure
    people: int = Field(ge=0, description="Everyone on it, the blocked too.")
    rows: list[GymLeaderboardRowBody] = Field(description=f"The first {TOP}.")
    mine: GymLeaderboardRowBody | None = Field(
        description="Who asks, whatever its rank; null when not on it."
    )


# The month of Rome held by the placeholders %(year)s and %(month)s: the
# sets of the posts published in it, of `exercise`, ranked.
_START = "make_timestamp(%(year)s, %(month)s, 1, 0, 0, 0)"


def _month_of(column: str) -> str:
    """The calendar month of Rome of the instant `column`."""
    return f"date_trunc('month', {column} AT TIME ZONE '{ZONE}')"


# The sets that count, on `s` (the set), `r` (its run), `d` (its post), `u`
# (its owner), `c` (its exercise in the catalog), `v` (its value).
_COUNTS = (
    "s.live AND v.value > 0 AND v.value <= c.cap"
    # The index of the feed holds the posts not «only me».
    " AND d.visibility <> 'only_me' AND d.visibility = 'everyone'"
    " AND d.hidden_at IS NULL AND u.hidden_at IS NULL AND g.show_exercises"
    " AND r.source = 'muw'"
    f" AND {_month_of('r.started_at')} = {_month_of('d.published_at')}"
)

_SETS = (
    "FROM drawings d JOIN runs r ON r.id = d.run_id AND r.activity = 'gym'"
    " JOIN users u ON u.id = r.user_id"
    " JOIN gym_sessions g ON g.run_id = r.id"
    " JOIN gym_sets s ON s.run_id = r.id"
    f" JOIN {_CATALOG_SQL} ON c.exercise = s.exercise AND c.kind = s.kind"
    f" CROSS JOIN LATERAL (SELECT {_VALUE_SQL} AS value) v"
)


def _best_sql(where: str) -> str:
    """Each person's best set of the sets `where` keeps besides the rule:
    user, post, value and when it was logged, then its rank and how many
    people there are."""
    return (
        "SELECT b.*, row_number() OVER (ORDER BY b.value DESC, b.at, b.user_id)"
        " AS rank, count(*) OVER () AS people FROM ("
        " SELECT DISTINCT ON (r.user_id) r.user_id, d.id AS drawing_id, v.value,"
        " r.started_at + s.at_s * interval '1 second' AS at"
        f" {_SETS} WHERE {_COUNTS} AND {where}"
        " ORDER BY r.user_id, v.value DESC, at, d.id) b"
    )


def gym_wins_sql(user_column: str) -> str:
    """How many monthly leaderboards at the gym the account in
    `user_column` won, as a subquery: an exercise and a month that has
    ended, at least WINNER_PEOPLE people, and it first. Only the months and
    exercises it took part in are looked at, from its own workouts."""
    winner = (
        "(SELECT CASE WHEN w.people >= "
        f"{WINNER_PEOPLE} THEN w.user_id END FROM ("
        + _best_sql(
            "s.exercise = mine.exercise"
            f" AND d.published_at >= (mine.month AT TIME ZONE '{ZONE}')"
            f" AND d.published_at < ((mine.month + interval '1 month')"
            f" AT TIME ZONE '{ZONE}')"
        )
        + ") w WHERE w.rank = 1)"
    )
    return (
        "(SELECT count(*) FROM (SELECT DISTINCT s.exercise,"
        f" {_month_of('d.published_at')} AS month"
        f" {_SETS} WHERE {_COUNTS} AND r.user_id = {user_column}"
        f" AND {_month_of('d.published_at')} < {_month_of('now()')}) mine"
        f" WHERE {winner} = {user_column})"
    )


def _row(row: dict[str, Any]) -> GymLeaderboardRowBody:
    return GymLeaderboardRowBody(
        rank=row["rank"],
        user=LeaderboardPersonBody(
            public_id=row["public_id"], username=row["username"]
        ),
        value=float(row["value"]),
        drawing_id=row["drawing_id"],
    )


@dataclass
class GymLeaderboards:
    """The leaderboards, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]

    def of(
        self, viewer: int, exercise: str, month: str | None
    ) -> GymLeaderboardBody | None:
        """The leaderboard of `exercise` in `month` (this month of Rome
        when None) as `viewer` sees it; None for an exercise without one."""
        found = EXERCISES_BY_KEY.get(exercise)
        if found is None or found.scale is None:
            return None
        with self.database.connect() as conn:
            if month is None:
                month = conn.execute(
                    f"SELECT to_char({_month_of('%s::timestamptz')}, 'YYYY-MM') AS m",
                    (self.now(),),
                ).fetchone()["m"]
            matched = MONTH.match(month)
            assert matched is not None
            params = {
                "year": int(matched.group(1)),
                "month": int(matched.group(2)),
                "exercise": exercise,
                "viewer": viewer,
                "top": TOP,
            }
            ranked = _best_sql(
                "s.exercise = %(exercise)s"
                f" AND d.published_at >= ({_START} AT TIME ZONE '{ZONE}')"
                f" AND d.published_at < (({_START} + interval '1 month')"
                f" AT TIME ZONE '{ZONE}')"
            )
            rows = conn.execute(
                f"WITH ranked AS ({ranked})"
                " SELECT ranked.*, p.public_id, p.username FROM ranked"
                " JOIN users p ON p.id = ranked.user_id"
                " WHERE (ranked.rank <= %(top)s OR ranked.user_id = %(viewer)s)"
                f" AND NOT {apart_sql('%(viewer)s', 'ranked.user_id')}"
                " ORDER BY ranked.rank",
                params,
            ).fetchall()
            # Every row may be kept apart from who asks: then they are
            # counted alone.
            people = (
                rows[0]["people"]
                if rows
                else conn.execute(
                    f"SELECT count(*) AS n FROM ({ranked}) x", params
                ).fetchone()["n"]
            )
        mine = next((row for row in rows if row["user_id"] == viewer), None)
        return GymLeaderboardBody(
            month=month,
            exercise=exercise,
            measure=SCALES[found.scale].measure,
            people=people,
            rows=[_row(row) for row in rows if row["rank"] <= TOP],
            mine=None if mine is None else _row(mine),
        )


# --- The endpoint ---


def gym_leaderboards_of(
    accounts: Annotated[Accounts, Depends(accounts_of)],
) -> GymLeaderboards:
    """In the database of the accounts, on the same clock."""
    return GymLeaderboards(accounts.database, accounts.now)


Boards = Annotated[GymLeaderboards, Depends(gym_leaderboards_of)]
Me = Annotated[UserBody, Depends(current_user)]


def gym_leaderboard_routes() -> APIRouter:
    router = APIRouter(tags=["gym"], responses=ACCOUNT_ERRORS)

    @router.get("/gym/leaderboard", responses={404: {"model": ErrorBody}})
    def gym_leaderboard(
        boards: Boards,
        user: Me,
        exercise: Annotated[str, Query(pattern=r"^[a-z0-9_]{1,40}$")],
        month: Annotated[str | None, Query(pattern=MONTH.pattern)] = None,
    ) -> GymLeaderboardBody:
        board = boards.of(user.id, exercise, month)
        if board is None:
            raise HTTPException(404, UNKNOWN_EXERCISE)
        return board

    return router


def install_gym_leaderboard(app: FastAPI) -> None:
    """Without a database the endpoint answers 503, as the others of the
    accounts."""
    app.include_router(gym_leaderboard_routes())
