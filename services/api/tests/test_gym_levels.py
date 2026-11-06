"""The milestones at the gym (TASK-385 E, ADR-0327 point 9), in a real
PostgreSQL: the level of each exercise on the profile, of every workout,
private ones too, and the levels a post reached first. The SQL of
gym_levels.py must agree with gym_catalog.measured and level_of."""

from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient
from test_drawings import (
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    drawn,
    other,
    public_id,
    signed_up,
    wall,  # noqa: F401
)
from test_gym import GYM_KEY, after_the_workout, kept, reading, workout  # noqa: F401

from shaperoute_api.gym_catalog import EXERCISES_BY_KEY, SCALES, level_of, measured
from shaperoute_api.gym_levels import GymLevelBody
from shaperoute_api.profiles import PublicProfileBody

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
# A workout of the day before the example's, and its key.
DAY_BEFORE = {
    "started_at": "2026-11-04T17:00:00Z",
    "ended_at": "2026-11-04T18:05:00Z",
    "pauses": [],
}
EARLIER_KEY = "1a2b3c4d5e6f7081"
LATER_KEY = "2b3c4d5e6f708192"


def expected(sets: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """The levels gym_catalog gives these sets: the rule the SQL follows."""
    best: dict[str, float] = {}
    for item in sets:
        exercise = EXERCISES_BY_KEY.get(item.get("exercise", ""))
        if exercise is None or exercise.kind != item["kind"]:
            continue
        value = measured(exercise, item)
        if value is not None and value > best.get(exercise.key, 0):
            best[exercise.key] = value
    order = list(EXERCISES_BY_KEY)
    levels = [
        {
            "exercise": key,
            "level": level_of(EXERCISES_BY_KEY[key], value),
            "value": value,
            "measure": SCALES[EXERCISES_BY_KEY[key].scale or ""].measure,
        }
        for key, value in best.items()
    ]
    return sorted(
        (level for level in levels if level["level"] >= 1),
        key=lambda level: (-level["level"], order.index(level["exercise"])),
    )


def profile_levels(
    app: TestClient, owner: dict[str, str], viewer: dict[str, str]
) -> Any:
    answer = app.get(f"/users/{public_id(app, owner)}", headers=viewer)
    assert answer.status_code == 200, answer.text
    return answer.json()["gym_levels"]


def sets(*items: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {**item, "at_s": 60 * (n + 1), "live": True} for n, item in enumerate(items)
    ]


def bench(kg: float, reps: int = 1) -> dict[str, Any]:
    return {"exercise": "bench_press", "kind": "load", "reps": reps, "load_kg": kg}


def new_levels(app: TestClient, headers: dict[str, str], key: str) -> Any:
    drawing = drawn(app, headers, key, title="Gym")
    answer = app.get(f"/drawings/{drawing['id']}/exercises", headers=reading(headers))
    assert answer.status_code == 200, answer.text
    return answer.json()["new_levels"]


# --- The contract, without a database ---


def test_the_example_levels_are_the_contract() -> None:
    example = json.loads((FIXTURES / "gym-levels.json").read_text(encoding="utf-8"))
    levels = [GymLevelBody.model_validate(level) for level in example["gym_levels"]]
    for level in levels:
        exercise = EXERCISES_BY_KEY[level.exercise]
        assert exercise.scale is not None
        assert SCALES[exercise.scale].measure == level.measure
        assert level_of(exercise, level.value) == level.level
    assert "gym_levels" in PublicProfileBody.model_fields


# --- In the database ---


def test_no_workout_no_level(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    assert profile_levels(client, me, me) == []


def test_the_profile_holds_the_best_of_each_exercise_as_the_catalog_says(
    client: TestClient,  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    kept(client, me)
    levels = profile_levels(client, me, reader)
    assert levels == expected(workout()["sets"])
    # The heaviest bench press of the example, 80 kg × 5: level 4, the wolf.
    assert {
        "exercise": "bench_press",
        "level": 4,
        "value": 80.0,
        "measure": "load_kg",
    } in levels
    # A name of the runner's own («Sled push») has no scale.
    assert all(level["exercise"] in EXERCISES_BY_KEY for level in levels)


def test_a_private_workout_counts_but_only_the_figure_shows(
    client: TestClient,  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    kept(client, me)
    drawn(client, me, GYM_KEY, visibility="only_me")
    levels = profile_levels(client, me, reader)
    assert levels == expected(workout()["sets"])
    assert all(
        set(level) == {"exercise", "level", "value", "measure"} for level in levels
    )


def test_a_set_above_the_cap_or_without_reps_counts_for_none(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    kept(
        client,
        me,
        sets=sets(
            bench(400),  # above the 360 kg of the bench press
            {"exercise": "plank", "kind": "timed", "duration_s": 20},  # below 30 s
            {
                "exercise": "treadmill",
                "kind": "cardio",
                "duration_s": 600,
                "distance_m": 0,
            },
            bench(61),
        ),
    )
    assert profile_levels(client, me, me) == [
        {"exercise": "bench_press", "level": 3, "value": 61.0, "measure": "load_kg"}
    ]


def test_the_highest_level_comes_first(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    chosen = sets(
        bench(21),
        {"exercise": "pull_up", "kind": "bodyweight", "reps": 30},
        {"exercise": "dumbbell_curl", "kind": "load", "reps": 8, "load_kg": 12.5},
    )
    kept(client, me, sets=chosen)
    levels = profile_levels(client, me, me)
    assert [level["exercise"] for level in levels] == [
        "pull_up",
        "dumbbell_curl",
        "bench_press",
    ]
    assert levels == expected(chosen)


def test_a_post_shows_the_levels_its_workout_reached_first(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    # The first workout reaches all its levels first.
    kept(
        client,
        me,
        sets=sets(bench(80), {"exercise": "plank", "kind": "timed", "duration_s": 90}),
    )
    first = new_levels(client, me, GYM_KEY)
    assert [level["exercise"] for level in first] == ["bench_press", "plank"]
    # A workout begun after: the bench press climbs, the plank stays.
    kept(
        client,
        me,
        LATER_KEY,
        started_at="2026-11-05T18:06:00Z",
        ended_at="2026-11-05T18:09:00Z",
        pauses=[],
        sets=sets(
            bench(100), {"exercise": "plank", "kind": "timed", "duration_s": 100}
        ),
    )
    assert new_levels(client, me, LATER_KEY) == [
        {"exercise": "bench_press", "level": 5, "value": 100.0, "measure": "load_kg"}
    ]


def test_a_workout_added_later_but_begun_before_moves_the_line(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    kept(client, me, sets=sets(bench(80)))
    kept(client, me, EARLIER_KEY, **DAY_BEFORE, sets=sets(bench(85)))
    # The day before already had level 4: the example reached nothing first.
    assert new_levels(client, me, GYM_KEY) == []
    assert [level["level"] for level in new_levels(client, me, EARLIER_KEY)] == [4]


def test_the_levels_are_of_their_owner_only(client: TestClient) -> None:  # noqa: F811
    me, reader = signed_up(client), other(client)
    kept(client, reader, sets=sets(bench(140)))
    kept(client, me, sets=sets(bench(80)))
    assert [level["level"] for level in profile_levels(client, me, reader)] == [4]
    assert [level["level"] for level in new_levels(client, me, GYM_KEY)] == [4]
