"""The plans of the gym (TASK-411 part C, ADR-0341 point 3, docs/sports/
gym.md «Le schede»): a name, the days of the week it is for, its exercises
in order, each with the sets to do and the values aimed at.

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
from datetime import datetime
from typing import Annotated, Any

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
    )


PLAN_COLUMNS = "key, name, days, items, position, updated_at"


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
                " created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
                " ON CONFLICT (user_id, key) DO UPDATE SET name = EXCLUDED.name,"
                " days = EXCLUDED.days, items = EXCLUDED.items,"
                " position = EXCLUDED.position, updated_at = EXCLUDED.updated_at"
                f" RETURNING {PLAN_COLUMNS}",
                (
                    owner,
                    key,
                    body.name,
                    days_mask(body.days),
                    Jsonb(items),
                    body.position,
                    body.updated_at,
                    self.now(),
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
