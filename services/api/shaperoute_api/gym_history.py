"""The history of one exercise at the gym (TASK-483 part A, ADR-0392,
docs/sports/gym.md): every workout of who asks that has it, with its sets,
one point a workout for the chart, and the records.

Only the account's own sets, never another's: the leaderboard and the
milestones stay as they are. Every set counts, those added after «Stop»
and those of a workout written by hand too: the history is of who trains.

The same exercise is one of the catalog by its key, or one the runner named
by its name without the spaces at its ends, with the inner runs of spaces
made one, in lower case (the user's choice of 2026-11-22).

What a workout's point is depends on the kind of the exercise: for a load,
the best estimated one-rep max (Epley, kg × (1 + reps / 30), the kg itself
for one rep), from the sets of at most 12 reps; a workout with none shows
its heaviest kg, marked as not estimated. For a set of the body the reps,
for a timed one the seconds, for a cardio block the metres when the machine
shows them, otherwise the seconds.

The points and the records cover the whole history, so «All» and the
records are right without reading every set; the workouts with their sets
come a page at a time, the newest first. Read at each request, from
gym_sets through the index of the runs by account (runs_user_started_idx): no
table of its own.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import KEY_PATTERN, RunSource
from shaperoute_api.db import Database
from shaperoute_api.gym_catalog import EXERCISES_BY_KEY, SetKind
from shaperoute_api.gym_sessions import MAX_NAME_LENGTH, GymSetBody, _set
from shaperoute_api.schemas import ErrorBody

# The workouts of a page, unless asked otherwise, and the most.
PAGE = 20
MAX_PAGE = 100
# The most reps a set may have for its one-rep max to be estimated.
MAX_ESTIMATED_REPS = 12

UNKNOWN_EXERCISE = "unknown_exercise"
UNKNOWN_WORKOUT = "unknown_workout"

HistoryMeasure = Literal["estimated_1rm_kg", "reps", "duration_s", "distance_m"]
RecordKind = Literal[
    "best_estimate_kg",
    "heaviest_kg",
    "most_reps",
    "best_volume_kg",
    "longest_s",
    "farthest_m",
]

_SPACES = re.compile(r"\s+")

# gym_sessions.SET_COLUMNS, on the set `s`.
_SET_COLUMNS = (
    "s.exercise, s.name, s.kind, s.reps, s.load_kg::float8 AS load_kg,"
    " s.duration_s, s.distance_m, s.speed_kmh::float8 AS speed_kmh,"
    " s.incline_pct::float8 AS incline_pct, s.level, s.floors, s.at_s, s.live"
)


def same_name(name: str) -> str:
    """The form two named exercises are the same by: no spaces at the
    ends, one space for each inner run, lower case. Written in SQL in
    _NAME_SQL; test_gym_history.py checks the two agree."""
    return _SPACES.sub(" ", name.strip()).lower()


# same_name in SQL, on the column `name` of gym_sets.
_NAME_SQL = "lower(regexp_replace(btrim(s.name), '\\s+', ' ', 'g'))"


def estimated_1rm(load_kg: float, reps: int) -> float:
    """Epley's estimate of the most one could lift once; the kg itself for
    a single rep."""
    return load_kg if reps == 1 else load_kg * (1 + reps / 30)


class GymHistoryPointBody(BaseModel):
    """packages/shared-types src/gymHistory.ts, `GymHistoryPoint`."""

    workout: str = Field(description="The key of the workout.")
    started_at: datetime
    value: float = Field(description="Its best, in the unit of `measure`.")
    estimated: bool = Field(
        description="For a load, false when no set had at most 12 reps and"
        " the value is the heaviest kg; true otherwise."
    )
    record: bool = Field(description="Better than every workout before it.")


class GymHistoryRecordBody(BaseModel):
    """packages/shared-types src/gymHistory.ts, `GymHistoryRecord`."""

    kind: RecordKind
    value: float
    workout: str
    started_at: datetime
    set: GymSetBody | None = Field(
        default=None,
        description="The set that made it; left out for the volume, a workout's.",
    )


class GymHistoryWorkoutBody(BaseModel):
    """packages/shared-types src/gymHistory.ts, `GymHistoryWorkout`."""

    id: str = Field(description="The key the app gave the workout.")
    started_at: datetime
    source: RunSource
    value: float | None = Field(
        default=None,
        description="Its point's value; left out when no set is of `kind`.",
    )
    sets: list[GymSetBody] = Field(description="Its sets of this exercise, in order.")


class GymHistoryBody(BaseModel):
    """packages/shared-types src/gymHistory.ts, `GymHistory`."""

    exercise: str | None = Field(
        default=None, description="Its key in the catalog; left out for a named one."
    )
    name: str | None = Field(
        default=None,
        description="A named exercise as last written; left out for one of the"
        " catalog.",
    )
    kind: SetKind | None = Field(
        default=None,
        description="The kind of the catalog, or of the last set of a named"
        " exercise; left out for a named one never done.",
    )
    measure: HistoryMeasure | None = None
    workouts_count: int = Field(ge=0, description="Every workout with it.")
    points: list[GymHistoryPointBody] = Field(description="All of them, oldest first.")
    records: list[GymHistoryRecordBody]
    workouts: list[GymHistoryWorkoutBody] = Field(
        description="A page, the newest first."
    )
    next: str | None = Field(
        default=None, description="`before` for the next page; left out on the last."
    )


@dataclass
class _Workout:
    key: str
    started_at: datetime
    source: RunSource
    sets: list[GymSetBody]


def _measure_of(
    kind: SetKind, exercise: str | None, sets: Sequence[GymSetBody]
) -> HistoryMeasure:
    if kind == "load":
        return "estimated_1rm_kg"
    if kind == "bodyweight":
        return "reps"
    if kind == "timed":
        return "duration_s"
    found = EXERCISES_BY_KEY.get(exercise) if exercise is not None else None
    shows_metres = (
        "distance_m" in found.fields
        if found is not None
        else any(item.distance_m is not None for item in sets)
    )
    return "distance_m" if shows_metres else "duration_s"


def _best_of(
    sets: Sequence[GymSetBody], measure: HistoryMeasure
) -> tuple[float, bool] | None:
    """A workout's value and whether it is estimated; None without a set
    that says it."""
    if measure == "estimated_1rm_kg":
        loads = [item for item in sets if item.load_kg and item.reps]
        few = [item for item in loads if (item.reps or 0) <= MAX_ESTIMATED_REPS]
        if few:
            return (
                max(estimated_1rm(item.load_kg or 0, item.reps or 1) for item in few),
                True,
            )
        if loads:
            return max(item.load_kg or 0 for item in loads), False
        return None
    values = [getattr(item, measure) for item in sets]
    known = [value for value in values if value]
    return (float(max(known)), True) if known else None


class _Best:
    """The best of a record so far: the first to reach it keeps it."""

    def __init__(self, kind: RecordKind) -> None:
        self.kind: RecordKind = kind
        self.found: GymHistoryRecordBody | None = None
        # The value as it was, before rounding, so that a tie is a tie.
        self.exact = 0.0

    def offer(
        self, value: float | None, workout: _Workout, item: GymSetBody | None
    ) -> None:
        if not value or (self.found is not None and value <= self.exact):
            return
        self.exact = value
        self.found = GymHistoryRecordBody(
            kind=self.kind,
            value=round(value, 2),
            workout=workout.key,
            started_at=workout.started_at,
            set=item,
        )


def _records(
    workouts: Sequence[_Workout], kind: SetKind, measure: HistoryMeasure
) -> list[GymHistoryRecordBody]:
    """The records of the exercise's kind, oldest workout first so that a
    tie goes to who reached it first."""
    wanted: tuple[RecordKind, ...] = {
        "load": ("best_estimate_kg", "heaviest_kg", "most_reps", "best_volume_kg"),
        "bodyweight": ("most_reps", "heaviest_kg"),
        "timed": ("longest_s",),
        "cardio": (
            ("farthest_m", "longest_s") if measure == "distance_m" else ("longest_s",)
        ),
    }[kind]
    bests = {record: _Best(record) for record in wanted}
    for workout in workouts:
        sets = [item for item in workout.sets if item.kind == kind]
        for item in sets:
            if "best_estimate_kg" in bests and item.load_kg and item.reps:
                if item.reps <= MAX_ESTIMATED_REPS:
                    bests["best_estimate_kg"].offer(
                        estimated_1rm(item.load_kg, item.reps), workout, item
                    )
            if "heaviest_kg" in bests:
                bests["heaviest_kg"].offer(item.load_kg, workout, item)
            if "most_reps" in bests:
                bests["most_reps"].offer(item.reps, workout, item)
            if "longest_s" in bests:
                bests["longest_s"].offer(item.duration_s, workout, item)
            if "farthest_m" in bests:
                bests["farthest_m"].offer(item.distance_m, workout, item)
        if "best_volume_kg" in bests:
            volume = sum((item.load_kg or 0) * (item.reps or 0) for item in sets)
            bests["best_volume_kg"].offer(volume, workout, None)
    return [best.found for best in bests.values() if best.found is not None]


@dataclass
class GymHistories:
    """The histories, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]

    def _workouts(
        self, user_id: int, exercise: str | None, name: str | None
    ) -> list[_Workout]:
        """Every workout of `user_id` with the exercise, oldest first, with
        its sets of it."""
        where = "s.exercise = %s" if exercise is not None else f"{_NAME_SQL} = %s"
        wanted = exercise if exercise is not None else same_name(name or "")
        with self.database.connect() as conn:
            rows = conn.execute(
                f"SELECT r.key AS workout_key, r.started_at AS workout_started,"
                f" r.source AS workout_source, {_SET_COLUMNS}"
                " FROM runs r JOIN gym_sets s ON s.run_id = r.id"
                f" WHERE r.user_id = %s AND r.activity = 'gym' AND {where}"
                " ORDER BY r.started_at, r.id, s.n",
                (user_id, wanted),
            ).fetchall()
        workouts: list[_Workout] = []
        for row in rows:
            if not workouts or workouts[-1].key != row["workout_key"]:
                workouts.append(
                    _Workout(
                        key=row["workout_key"],
                        started_at=row["workout_started"],
                        source=row["workout_source"],
                        sets=[],
                    )
                )
            workouts[-1].sets.append(
                _set({k: v for k, v in row.items() if not k.startswith("workout_")})
            )
        return workouts

    def of(
        self,
        user_id: int,
        *,
        exercise: str | None,
        name: str | None,
        before: str | None,
        limit: int,
    ) -> GymHistoryBody | None:
        """The history as `user_id` sees it; None for a page after a
        workout that is not in it. `exercise` is a key of the catalog."""
        workouts = self._workouts(user_id, exercise, name)
        every_set = [item for workout in workouts for item in workout.sets]
        kind: SetKind | None
        if exercise is not None:
            kind = EXERCISES_BY_KEY[exercise].kind
        else:
            kind = every_set[-1].kind if every_set else None
        measure = None if kind is None else _measure_of(kind, exercise, every_set)
        points: list[GymHistoryPointBody] = []
        values: dict[str, float] = {}
        top: float | None = None
        for workout in workouts:
            if kind is None or measure is None:
                break
            best = _best_of([s for s in workout.sets if s.kind == kind], measure)
            if best is None:
                continue
            value, estimated = round(best[0], 2), best[1]
            values[workout.key] = value
            points.append(
                GymHistoryPointBody(
                    workout=workout.key,
                    started_at=workout.started_at,
                    value=value,
                    estimated=estimated,
                    record=top is None or value > top,
                )
            )
            top = value if top is None else max(top, value)
        newest = list(reversed(workouts))
        start = 0
        if before is not None:
            keys = [workout.key for workout in newest]
            if before not in keys:
                return None
            start = keys.index(before) + 1
        page = newest[start : start + limit]
        more = start + limit < len(newest)
        return GymHistoryBody(
            exercise=exercise,
            name=(
                next((item.name for item in reversed(every_set) if item.name), None)
                if exercise is None
                else None
            ),
            kind=kind,
            measure=measure,
            workouts_count=len(workouts),
            points=points,
            records=(
                []
                if kind is None or measure is None
                else _records(workouts, kind, measure)
            ),
            workouts=[
                GymHistoryWorkoutBody(
                    id=workout.key,
                    started_at=workout.started_at,
                    source=workout.source,
                    value=values.get(workout.key),
                    sets=workout.sets,
                )
                for workout in page
            ],
            next=page[-1].key if more and page else None,
        )


# --- The endpoint ---


def gym_histories_of(
    accounts: Annotated[Accounts, Depends(accounts_of)],
) -> GymHistories:
    """In the database of the accounts, on the same clock."""
    return GymHistories(accounts.database, accounts.now)


Histories = Annotated[GymHistories, Depends(gym_histories_of)]
Me = Annotated[UserBody, Depends(current_user)]


def gym_history_routes() -> APIRouter:
    router = APIRouter(tags=["gym"], responses=ACCOUNT_ERRORS)

    # As a workout's: a set has the fields of its kind only, and what is
    # empty is left out, not null (packages/shared-types src/gymHistory.ts).
    @router.get(
        "/me/gym-history",
        responses={404: {"model": ErrorBody}, 422: {"model": ErrorBody}},
        response_model_exclude_none=True,
    )
    def gym_history(
        histories: Histories,
        user: Me,
        exercise: Annotated[str | None, Query(pattern=r"^[a-z0-9_]{1,40}$")] = None,
        name: Annotated[
            str | None, Query(min_length=1, max_length=MAX_NAME_LENGTH)
        ] = None,
        before: Annotated[str | None, Query(pattern=KEY_PATTERN)] = None,
        limit: Annotated[int, Query(ge=1, le=MAX_PAGE)] = PAGE,
    ) -> GymHistoryBody:
        if (exercise is None) == (name is None or not name.strip()):
            raise HTTPException(422, "exercise_or_name")
        if exercise is not None and exercise not in EXERCISES_BY_KEY:
            raise HTTPException(404, UNKNOWN_EXERCISE)
        history = histories.of(
            user.id, exercise=exercise, name=name, before=before, limit=limit
        )
        if history is None:
            raise HTTPException(404, UNKNOWN_WORKOUT)
        return history

    return router


def install_gym_history(app: FastAPI) -> None:
    """Without a database the endpoint answers 503, as the others of the
    accounts."""
    app.include_router(gym_history_routes())
