"""The milestones at the gym (TASK-385 part E, ADR-0327 point 9,
docs/sports/gym.md «Le scale»): for each exercise of the catalog, the best
set an account logged, under the cap of its scale, and the level it reaches,
one of seven figures.

Every workout counts, private ones too, as the personal bests do (the
user's choice of 2026-11-06): the profile shows the figure, the exercise and
the value, never the workout. An exercise the runner named has no scale and
counts for none. Counted at each reading, from gym_sets: no table of its
own. The rule of a set is gym_catalog.measured and level_of, written here in
SQL; test_gym_levels.py checks the two agree.
"""

from __future__ import annotations

import math
from typing import Any

from pydantic import BaseModel, Field

from shaperoute_api.gym_catalog import EXERCISES, SCALES, Measure


class GymLevelBody(BaseModel):
    """packages/shared-types src/gym.ts, `GymLevel`."""

    exercise: str = Field(description="Its key in the catalog.")
    level: int = Field(ge=1, le=7, description="The figure: FIGURES[level - 1].")
    value: float = Field(description="The best set, in the unit of `measure`.")
    measure: Measure = Field(
        description="load_kg (per hand for a dumbbell), reps, duration_s or"
        " distance_m."
    )


def _steps(levels: tuple[float, ...]) -> str:
    return "ARRAY[" + ", ".join(str(step) for step in levels) + "]::float8[]"


def _cap(cap: float | None) -> str:
    return "'Infinity'::float8" if cap is None or math.isinf(cap) else f"{cap}::float8"


# The exercises with a scale, in the order of the catalog: an exercise's
# kind, what its milestones read, its cap and the seven steps.
_CATALOG_SQL = (
    "(VALUES "
    + ", ".join(
        f"('{e.key}', {n}, '{e.kind}', '{SCALES[e.scale].measure}',"
        f" {_cap(e.capped_at())}, {_steps(SCALES[e.scale].levels)})"
        for n, e in enumerate(EXERCISES)
        if e.scale is not None
    )
    + ") AS c (exercise, n, kind, measure, cap, steps)"
)

# What a set reads: the kg of a load with at least one rep, the reps of a
# set of the body, the seconds of a timed one, the metres or the seconds of
# a cardio block (gym_catalog.measured).
_VALUE_SQL = (
    "CASE c.measure"
    " WHEN 'load_kg' THEN CASE WHEN s.reps >= 1 THEN s.load_kg::float8 END"
    " WHEN 'reps' THEN s.reps::float8"
    " WHEN 'duration_s' THEN s.duration_s::float8"
    " ELSE s.distance_m::float8 END"
)


def _measured_sql(where: str) -> str:
    """The sets that count, of the workouts `where` keeps (on `r`, the runs):
    run, exercise, its place in the catalog, measure, steps and value."""
    return (
        "SELECT s.run_id, c.exercise, c.n, c.measure, c.steps, v.value"
        " FROM gym_sets s JOIN runs r ON r.id = s.run_id AND r.activity = 'gym'"
        f" JOIN {_CATALOG_SQL} ON c.exercise = s.exercise AND c.kind = s.kind"
        f" CROSS JOIN LATERAL (SELECT {_VALUE_SQL} AS value) v"
        f" WHERE v.value > 0 AND v.value <= c.cap AND {where}"
    )


def _level_sql(value: str) -> str:
    """The level `value` reaches on the steps `b.steps`, 0 to 7."""
    return f"(SELECT count(*)::int FROM unnest(b.steps) AS step WHERE {value} >= step)"


def gym_levels_sql(user_column: str) -> str:
    """The levels of the account in `user_column`, as a subquery: a JSON
    array of GymLevelBody, the highest level first, then in the order of the
    catalog; only the exercises at level 1 or more, empty without one."""
    return (
        "(SELECT COALESCE(json_agg(json_build_object('exercise', l.exercise,"
        " 'level', l.level, 'value', l.value, 'measure', l.measure)"
        " ORDER BY l.level DESC, l.n), '[]'::json)"
        f" FROM (SELECT b.exercise, b.n, b.measure, b.value, {_level_sql('b.value')}"
        " AS level"
        " FROM (SELECT m.exercise, m.n, m.measure, m.steps, max(m.value) AS value"
        f" FROM ({_measured_sql(f'r.user_id = {user_column}')}) m"
        " GROUP BY m.exercise, m.n, m.measure, m.steps) b) l"
        " WHERE l.level >= 1)"
    )


def new_levels(conn: Any, run_id: int) -> list[GymLevelBody]:
    """The levels the workout `run_id` reached first: those above what its
    owner's workouts begun before it reached. The highest level first, then
    in the order of the catalog."""
    rows = conn.execute(
        f"SELECT b.exercise, b.measure, b.value, {_level_sql('b.value')} AS level,"
        f" {_level_sql('COALESCE(b.before, 0)')} AS was"
        " FROM (SELECT m.exercise, m.n, m.measure, m.steps,"
        " max(m.value) FILTER (WHERE m.run_id = w.id) AS value,"
        " max(m.value) FILTER (WHERE m.run_id <> w.id) AS before"
        " FROM runs w, LATERAL ("
        + _measured_sql(
            "r.user_id = w.user_id" " AND (r.started_at, r.id) <= (w.started_at, w.id)"
        )
        + ") m"
        " WHERE w.id = %s"
        " GROUP BY m.exercise, m.n, m.measure, m.steps) b"
        " WHERE b.value IS NOT NULL"
        " ORDER BY level DESC, b.n",
        (run_id,),
    ).fetchall()
    return [
        GymLevelBody(
            exercise=row["exercise"],
            level=row["level"],
            value=row["value"],
            measure=row["measure"],
        )
        for row in rows
        if row["level"] > row["was"]
    ]
