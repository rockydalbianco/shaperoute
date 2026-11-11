"""The plans of the gym (TASK-411 part C, ADR-0341 point 3, docs/sports/
gym.md «Le schede»): a name, the days of the week it is for, its exercises
in order, each with the sets to do and the values aimed at.

A plan made with the guide is a program (`program`, migration 0066): its
workouts of the week, each on its day with its own exercises or a run
(TASK-433 C), and a cycle of weeks that changes as its owner chose; the
phone works out each week's values, the API keeps what it was given and
knows which days are planned.

GET /me/gym-plans lists the account's plans in their order; PUT
/me/gym-plans/{key} keeps one, with the key the phone chose, so a plan
made without a network goes up later and sent twice is one row (201, then
200); DELETE /me/gym-plans/{key} drops it, and dropping one that is not
there is no error. A plan sent older than the one kept does not replace
it: two phones of one account keep the latest. Only the owner: under /me;
they go with the account. At most MAX_PLANS plans of MAX_ITEMS exercises.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, FastAPI, Response
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
from shaperoute_api.activities import Key
from shaperoute_api.db import Database
from shaperoute_api.gym_catalog import EXERCISES_BY_KEY, SetKind
from shaperoute_api.gym_sessions import (
    ALLOWED,
    EXERCISE_PATTERN,
    MAX_NAME_LENGTH,
    VALUE_FIELDS,
)
from shaperoute_api.schemas import ErrorBody

MAX_PLANS = 20
MAX_ITEMS = 30
MAX_SETS = 20
PLANS_FULL = "An account keeps at most 20 plans."
MAX_WEEKS = 12
MAX_SESSIONS = 7
MAX_PROGRAM_ITEMS = 300

Goal = Literal["muscle", "strength", "tone", "fit"]
"""What the guide asked first: more muscle, more strength, tone, fitness."""
Mode = Literal["load", "reps", "alternate", "same"]
"""How the weeks change: more load each week, more reps each week, two
weeks in turn, or always the same."""


class GymPlanItemBody(BaseModel):
    """An exercise of a plan: packages/shared-types src/gym.ts,
    `GymPlanItem`. The values are those aimed at, each optional, of the
    fields of its kind only (as a set's, gym_sessions.py)."""

    model_config = ConfigDict(extra="forbid")

    exercise: str | None = Field(default=None, pattern=EXERCISE_PATTERN)
    name: str | None = Field(default=None, min_length=1, max_length=MAX_NAME_LENGTH)
    kind: SetKind
    sets: int = Field(ge=1, le=MAX_SETS)
    reps: int | None = Field(default=None, ge=1, le=10_000)
    load_kg: float | None = Field(default=None, ge=0, le=2_000, allow_inf_nan=False)
    duration_s: int | None = Field(default=None, ge=1, le=86_400)
    distance_m: int | None = Field(default=None, ge=0, le=1_000_000)
    speed_kmh: float | None = Field(default=None, ge=0, le=60, allow_inf_nan=False)
    incline_pct: float | None = Field(default=None, ge=-10, le=40, allow_inf_nan=False)
    level: int | None = Field(default=None, ge=1, le=100)
    floors: int | None = Field(default=None, ge=0, le=10_000)

    @model_validator(mode="after")
    def the_fields_of_its_kind(self) -> GymPlanItemBody:
        if (self.exercise is None) == (self.name is None):
            raise ValueError("an item is of an exercise of the catalog, or a named one")
        allowed = ALLOWED[self.kind]
        if self.exercise is not None:
            exercise = EXERCISES_BY_KEY.get(self.exercise)
            if exercise is None:
                raise ValueError(f"no exercise {self.exercise} in the catalog")
            if exercise.kind != self.kind:
                raise ValueError(f"{self.exercise} is of the kind {exercise.kind}")
            if self.kind == "cardio":
                allowed = frozenset({"duration_s", *exercise.fields})
        given = {field for field in VALUE_FIELDS if getattr(self, field) is not None}
        extra = given - allowed
        if extra:
            raise ValueError(f"a {self.kind} item has no {', '.join(sorted(extra))}")
        return self


def _days_once(sessions: list[GymPlanSessionBody]) -> None:
    days = [session.day for session in sessions]
    if len(set(days)) != len(days):
        raise ValueError("a day of the week has one workout")


RunKind = Literal["easy", "intervals", "long"]
"""A run day of a program (TASK-433 C): easy, intervals or long."""


class GymPlanRunBody(BaseModel):
    """The run of a run day: packages/shared-types src/gym.ts, `GymPlanRun`.
    An easy or long run is a distance or a time; intervals are how many,
    each a distance or a time."""

    model_config = ConfigDict(extra="forbid")

    kind: RunKind
    distance_m: int | None = Field(default=None, ge=100, le=100_000)
    duration_s: int | None = Field(default=None, ge=60, le=6 * 3600)
    reps: int | None = Field(default=None, ge=1, le=50)
    rep_m: int | None = Field(default=None, ge=50, le=5_000)
    rep_s: int | None = Field(default=None, ge=10, le=1_800)

    @model_validator(mode="after")
    def the_fields_of_its_kind(self) -> GymPlanRunBody:
        if self.kind == "intervals":
            if self.reps is None or (self.rep_m is None) == (self.rep_s is None):
                raise ValueError("intervals are reps, each in metres or seconds")
            if self.distance_m is not None or self.duration_s is not None:
                raise ValueError("intervals are given by their reps")
        else:
            if (self.distance_m is None) == (self.duration_s is None):
                raise ValueError(f"a {self.kind} run is a distance or a time")
            if any(value is not None for value in (self.reps, self.rep_m, self.rep_s)):
                raise ValueError(f"a {self.kind} run has no reps")
        return self


class GymPlanSessionBody(BaseModel):
    """A workout of a program: packages/shared-types src/gym.ts,
    `GymPlanSession`. A run day (TASK-433 C) has its `run` and no
    exercises."""

    model_config = ConfigDict(extra="forbid")

    day: int = Field(ge=1, le=7)
    """The day of the week it is for, 1 Monday to 7 Sunday."""
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    items: list[GymPlanItemBody] = Field(default_factory=list, max_length=MAX_ITEMS)
    run: GymPlanRunBody | None = None

    @model_validator(mode="after")
    def a_run_or_exercises(self) -> GymPlanSessionBody:
        if self.run is not None and self.items:
            raise ValueError("a run day has no exercises")
        return self


class GymPlanWeekBody(BaseModel):
    """A week of the cycle written by hand: `GymPlanWeek`."""

    model_config = ConfigDict(extra="forbid")

    week: int = Field(ge=2, le=MAX_WEEKS)
    sessions: list[GymPlanSessionBody] = Field(max_length=MAX_SESSIONS)

    @model_validator(mode="after")
    def one_workout_a_day(self) -> GymPlanWeekBody:
        _days_once(self.sessions)
        return self


class GymProgramBody(BaseModel):
    """The weeks of a plan made with the guide: `GymProgram`."""

    model_config = ConfigDict(extra="forbid")

    goal: Goal | None = None
    starts_on: date
    """Its first day: the week of the cycle is counted from its Monday."""
    weeks: int = Field(ge=1, le=MAX_WEEKS)
    mode: Mode
    step_kg: float = Field(default=0, ge=0, le=20, allow_inf_nan=False)
    rest_s: int | None = Field(default=None, ge=10, le=600)
    sessions: list[GymPlanSessionBody] = Field(min_length=1, max_length=MAX_SESSIONS)
    """The first week; the others are worked out from it by `mode`."""
    custom: list[GymPlanWeekBody] = Field(
        default_factory=list, max_length=MAX_WEEKS - 1
    )
    """The weeks written by hand, in place of the ones worked out."""

    @model_validator(mode="after")
    def weeks_of_the_cycle(self) -> GymProgramBody:
        _days_once(self.sessions)
        numbers = [week.week for week in self.custom]
        if len(set(numbers)) != len(numbers):
            raise ValueError("a week is written once")
        if any(number > self.weeks for number in numbers):
            raise ValueError("a week written is one of the cycle")
        count = sum(len(one.items) for one in self.sessions) + sum(
            len(one.items) for week in self.custom for one in week.sessions
        )
        if count > MAX_PROGRAM_ITEMS:
            raise ValueError(f"a program has at most {MAX_PROGRAM_ITEMS} exercises")
        return self

    def days(self) -> list[int]:
        """Every day of the week one of its weeks has a workout on."""
        every = [one.day for one in self.sessions] + [
            one.day for week in self.custom for one in week.sessions
        ]
        return sorted(set(every))

    def sessions_on(self, day: date) -> list[GymPlanSessionBody]:
        """The workout planned on `day`, if any: none before it starts."""
        if day < self.starts_on:
            return []
        monday = self.starts_on - timedelta(days=self.starts_on.weekday())
        week = (day - monday).days // 7 % self.weeks + 1
        written = next((one for one in self.custom if one.week == week), None)
        sessions = self.sessions if written is None else written.sessions
        return [one for one in sessions if one.day == day.isoweekday()]


def planned_on(days: int, program: GymProgramBody | None, day: date) -> bool:
    """Whether a plan kept with the days `days` (bit 0 Monday) and its
    `program` has a workout on `day`."""
    if program is None:
        return bool(days & (1 << day.weekday()))
    return bool(program.sessions_on(day))


def program_of(row: dict[str, Any]) -> GymProgramBody | None:
    """The program of a row of gym_plans; None for a plan of one workout."""
    kept = row["program"]
    return None if kept is None else GymProgramBody.model_validate(kept)


class GymPlanRequestBody(BaseModel):
    """PUT /me/gym-plans/{key}: packages/shared-types/fixtures/gym-plans.json,
    a plan of `plans`, without its key."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    days: list[int] = Field(default_factory=list, max_length=7)
    """The days of the week it is for, 1 Monday to 7 Sunday."""
    items: list[GymPlanItemBody] = Field(default_factory=list, max_length=MAX_ITEMS)
    position: int = Field(default=0, ge=0, le=100)
    updated_at: AwareDatetime
    """When the phone last changed it: an older one does not replace it."""
    program: GymProgramBody | None = None
    """Its weeks, when made with the guide; null makes it a plan of one
    workout again. Not sent (an app older than the guide) it stays as it
    was."""

    @model_validator(mode="after")
    def days_of_the_week(self) -> GymPlanRequestBody:
        if any(not 1 <= day <= 7 for day in self.days):
            raise ValueError("a day of the week is 1 (Monday) to 7 (Sunday)")
        if len(set(self.days)) != len(self.days):
            raise ValueError("a day is given once")
        return self


class GymPlanBody(GymPlanRequestBody):
    """A plan as kept: packages/shared-types src/gym.ts, `GymPlan`."""

    model_config = ConfigDict(extra="forbid")

    key: str


class GymPlansBody(BaseModel):
    """GET /me/gym-plans: packages/shared-types/fixtures/gym-plans.json."""

    plans: list[GymPlanBody] = Field(description="In their order, then by key.")


def days_mask(days: list[int]) -> int:
    """The days as kept: bit 0 Monday to bit 6 Sunday."""
    return sum(1 << (day - 1) for day in set(days))


def mask_days(mask: int) -> list[int]:
    return [day for day in range(1, 8) if mask & (1 << (day - 1))]


def _plan(row: dict[str, Any]) -> GymPlanBody:
    return GymPlanBody(
        key=row["key"],
        name=row["name"],
        days=mask_days(row["days"]),
        items=[GymPlanItemBody.model_validate(item) for item in row["items"]],
        position=row["position"],
        updated_at=row["updated_at"],
        program=program_of(row),
    )


PLAN_COLUMNS = "key, name, days, items, position, updated_at, program"


@dataclass
class GymPlans:
    """The plans, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]

    def all(self, owner: int) -> GymPlansBody:
        with self.database.connect() as conn:
            rows = conn.execute(
                f"SELECT {PLAN_COLUMNS} FROM gym_plans WHERE user_id = %s"
                " ORDER BY position, key",
                (owner,),
            ).fetchall()
        return GymPlansBody(plans=[_plan(row) for row in rows])

    def keep(
        self, owner: int, key: str, body: GymPlanRequestBody
    ) -> tuple[GymPlanBody, bool]:
        """The plan as kept, and whether it is new. 422 for one more than
        MAX_PLANS."""
        items = [item.model_dump(exclude_none=True) for item in body.items]
        days = body.days
        # The program is changed only when sent: an app older than the
        # guide leaves it as it was.
        sent = "program" in body.model_fields_set
        program = None
        if body.program is not None:
            program = Jsonb(body.program.model_dump(mode="json", exclude_none=True))
            days = body.program.days()
        with self.database.connect() as conn:
            # One account's plans change one at a time: the count below is
            # the count when the row goes in.
            conn.execute("SELECT 1 FROM users WHERE id = %s FOR UPDATE", (owner,))
            kept = conn.execute(
                f"SELECT {PLAN_COLUMNS} FROM gym_plans"
                " WHERE user_id = %s AND key = %s",
                (owner, key),
            ).fetchone()
            if kept is None:
                count = conn.execute(
                    "SELECT count(*) AS n FROM gym_plans WHERE user_id = %s",
                    (owner,),
                ).fetchone()
                assert count is not None
                if count["n"] >= MAX_PLANS:
                    raise AccountError(422, "invalid_request", PLANS_FULL)
            elif kept["updated_at"] > body.updated_at:
                return _plan(kept), False
            row = conn.execute(
                "INSERT INTO gym_plans"
                " (user_id, key, name, days, items, position, updated_at,"
                " created_at, program) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
                " ON CONFLICT (user_id, key) DO UPDATE SET name = EXCLUDED.name,"
                " days = EXCLUDED.days, items = EXCLUDED.items,"
                " position = EXCLUDED.position, updated_at = EXCLUDED.updated_at,"
                " program = CASE WHEN %s THEN EXCLUDED.program"
                " ELSE gym_plans.program END"
                f" RETURNING {PLAN_COLUMNS}",
                (
                    owner,
                    key,
                    body.name,
                    days_mask(days),
                    Jsonb(items),
                    body.position,
                    body.updated_at,
                    self.now(),
                    program,
                    sent,
                ),
            ).fetchone()
            assert row is not None
        return _plan(row), kept is None

    def drop(self, owner: int, key: str) -> None:
        with self.database.connect() as conn:
            conn.execute(
                "DELETE FROM gym_plans WHERE user_id = %s AND key = %s", (owner, key)
            )


# --- The endpoints ---


def gym_plans_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> GymPlans:
    """In the database of the accounts, on the same clock."""
    return GymPlans(accounts.database, accounts.now)


Plans = Annotated[GymPlans, Depends(gym_plans_of)]
Me = Annotated[UserBody, Depends(current_user)]


def gym_plan_routes() -> APIRouter:
    router = APIRouter(tags=["gym"], responses=ACCOUNT_ERRORS)

    # The values of an item are left out when not aimed at, not null.
    @router.get("/me/gym-plans", response_model_exclude_none=True)
    def list_gym_plans(plans: Plans, user: Me) -> GymPlansBody:
        return plans.all(user.id)

    # Sent twice it is kept once: 201 the first time, then 200.
    @router.put(
        "/me/gym-plans/{key}",
        responses={201: {"model": GymPlanBody}, 422: {"model": ErrorBody}},
        response_model_exclude_none=True,
    )
    def keep_gym_plan(
        key: Key, body: GymPlanRequestBody, response: Response, plans: Plans, user: Me
    ) -> GymPlanBody:
        plan, created = plans.keep(user.id, key, body)
        if created:
            response.status_code = 201
        return plan

    @router.delete("/me/gym-plans/{key}", status_code=204)
    def drop_gym_plan(key: Key, plans: Plans, user: Me) -> Response:
        plans.drop(user.id, key)
        return Response(status_code=204)

    return router


def install_gym_plans(app: FastAPI) -> None:
    """Without a database the endpoints answer 503, as the others of the
    accounts."""
    app.include_router(gym_plan_routes())
