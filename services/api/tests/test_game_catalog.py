"""The shapes of the game (TASK-296 part A, ADR-0255; TASK-423 part A,
ADR-0351; docs/GIOCO.md §5.3): the user's examples are in it, every shape
has its five names, its collection and a closed outline on the card, and
every requirement of the approved scales is one shape."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.app import create_app
from shaperoute_api.game_catalog import (
    BY_ID,
    CATALOG,
    COLLECTIONS,
    LANGUAGES,
    PACE_DISTANCES_M,
    SINGLE_RUN_PACE_S,
)
from shaperoute_api.game_rules import DistanceGoal, PaceGoal

API_KEY = "a-long-enough-test-key"

# The scales the user approved on 2026-11-08 (docs/tasks/TASK-423-proposta.md
# §3), written out again here: a shape lost or moved is a failure.
KM_STEPS = (1, 3, 5, 10, 15, 20, 30, 42, 50, 75, 100, 150, 200, 250, 300, 400)
KM_STEPS += (500, 750, 1_000, 1_500, 2_000, 3_000, 5_000, 10_000)
SINGLE_RUNS_M = (5_000, 10_000, 21_097, 30_000, 42_195, 50_000)
PACE_LEVELS = {
    400: ("6:00", "5:00", "4:30", "4:00", "3:30", "3:00"),
    1_000: ("7:00", "6:30", "6:00", "5:30", "5:00", "4:30", "4:00", "3:30"),
    1_609: ("7:00", "6:00", "5:00", "4:30", "4:00"),
    3_000: ("7:00", "6:00", "5:30", "5:00", "4:30", "4:00"),
    5_000: ("7:30", "7:00", "6:30", "6:00", "5:30", "5:00", "4:30", "4:00"),
    10_000: ("7:30", "7:00", "6:30", "6:00", "5:30", "5:00", "4:30", "4:00"),
    15_000: ("7:00", "6:00", "5:30", "5:00", "4:30"),
    21_097: ("7:30", "7:00", "6:30", "6:00", "5:30", "5:00", "4:30"),
    30_000: ("7:00", "6:00", "5:30", "5:00"),
    42_195: ("7:30", "7:00", "6:30", "6:00", "5:30", "5:00", "4:30"),
}
SIZES = {
    "geometry": 10,
    "animals": 13,
    "sea": 5,
    "sky": 9,
    "nature": 12,
    "city": 13,
    "milestones": 7,
    "seasons": 7,
    "legends": 11,
    "greece": 7,
}
# The 12 shapes of TASK-296, as they were: nobody loses one.
BEFORE = {
    "triangle": DistanceGoal(5_000),
    "square": DistanceGoal(10_000),
    "hexagon": DistanceGoal(20_000),
    "circle": DistanceGoal(42_000),
    "star": DistanceGoal(100_000),
    "heart": DistanceGoal(250_000),
    "moon": DistanceGoal(500_000),
    "sun": DistanceGoal(1_000_000),
    "lightning": PaceGoal(1_000, 300),
    "diamond": PaceGoal(5_000, 330),
    "arrow": PaceGoal(10_000, 360),
    "crown": PaceGoal(21_097, 360),
}


def _seconds(pace: str) -> int:
    minutes, seconds = pace.split(":")
    return int(minutes) * 60 + int(seconds)


def test_the_catalog_needs_the_app_key_but_no_session(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """«No account» is no session: the app's key is still asked (ADR-0255).
    Without a database the catalog answers all the same."""
    monkeypatch.setenv("SHAPEROUTE_API_KEY", API_KEY)
    client = TestClient(create_app(FileSource(Path("unused.graphml"))))
    refused = client.get("/game/catalog")
    assert refused.status_code == 401
    assert refused.json()["error"]["code"] == "unauthorized"
    answer = client.get("/game/catalog", headers={"X-API-Key": API_KEY})
    assert answer.status_code == 200
    assert len(answer.json()["shapes"]) == len(CATALOG)
    # The rest of the game wants a session too.
    assert client.get("/game/me", headers={"X-API-Key": API_KEY}).status_code != 200


def test_the_user_examples_are_in_the_catalog() -> None:
    # The request of 2026-10-23: 5 km a triangle, 20 km a hexagon, 100 km a
    # star; 1 km under 5:00, 5 km under 5:30.
    assert BY_ID["triangle"].goal == DistanceGoal(5_000)
    assert BY_ID["hexagon"].goal == DistanceGoal(20_000)
    assert BY_ID["star"].goal == DistanceGoal(100_000)
    assert BY_ID["lightning"].goal == PaceGoal(1_000, 300)
    assert BY_ID["diamond"].goal == PaceGoal(5_000, 330)


def test_the_shapes_of_before_keep_what_they_ask_and_their_names() -> None:
    for shape_id, goal in BEFORE.items():
        assert BY_ID[shape_id].goal == goal, shape_id
    assert BY_ID["heart"].names["it"] == "Cuore"
    assert BY_ID["crown"].names["fr"] == "Couronne"


def test_each_shape_once_with_its_names() -> None:
    assert len(BY_ID) == len(CATALOG) == 94
    for shape in CATALOG:
        assert set(shape.names) == set(LANGUAGES)
        assert all(name.strip() for name in shape.names.values())


def test_ten_collections_each_with_its_names_and_shapes() -> None:
    assert [c.id for c in COLLECTIONS] == list(SIZES)
    for collection in COLLECTIONS:
        assert set(collection.names) == set(LANGUAGES)
        assert all(name.strip() for name in collection.names.values())
    assert Counter(shape.collection for shape in CATALOG) == SIZES


def test_the_shapes_come_collection_by_collection() -> None:
    # The app of today shows the catalog in its order: one collection after
    # the other, in the order of the collections.
    order = [c.id for c in COLLECTIONS]
    positions = [order.index(shape.collection) for shape in CATALOG]
    assert positions == sorted(positions)


def test_each_outline_is_closed_on_the_card() -> None:
    for shape in CATALOG:
        outline = shape.outline
        assert len(outline) >= 4, shape.id
        assert outline[0] == outline[-1], shape.id
        assert all(0 <= x <= 1 and 0 <= y <= 1 for x, y in outline), shape.id


def test_each_outline_fills_the_card() -> None:
    # Fitted, not a dot in a corner: the longer side spans most of the card
    # (the square of TASK-296, inscribed in the circle, spans 0.71).
    for shape in CATALOG:
        xs = [x for x, _ in shape.outline]
        ys = [y for _, y in shape.outline]
        assert max(max(xs) - min(xs), max(ys) - min(ys)) >= 0.7, shape.id


def test_the_triangle_points_up() -> None:
    # y grows downwards: the top corner has the smallest y.
    top = min(BY_ID["triangle"].outline, key=lambda p: p[1])
    assert top == (0.5, 0.0)


def test_the_km_scale_is_one_shape_a_step() -> None:
    totals = [s.goal.total_m for s in CATALOG if isinstance(s.goal, DistanceGoal)]
    assert sorted(totals) == [km * 1000 for km in KM_STEPS]


def test_the_km_shapes_grow_in_order_inside_a_collection() -> None:
    for collection in COLLECTIONS:
        totals = [
            s.goal.total_m
            for s in CATALOG
            if s.collection == collection.id and isinstance(s.goal, DistanceGoal)
        ]
        assert totals == sorted(totals), collection.id


def test_the_single_runs_are_six_slow_paces() -> None:
    singles = [
        s.goal for s in CATALOG if isinstance(s.goal, PaceGoal) and s.goal.single_run
    ]
    assert sorted(g.distance_m for g in singles) == list(SINGLE_RUNS_M)
    assert all(g.pace_s == SINGLE_RUN_PACE_S for g in singles)
    assert {s.collection for s in CATALOG if s.goal in singles} == {"milestones"}


def test_the_pace_levels_are_one_shape_each() -> None:
    levels: dict[int, set[int]] = {}
    for shape in CATALOG:
        goal = shape.goal
        if isinstance(goal, PaceGoal) and not goal.single_run:
            assert goal.pace_s not in levels.get(goal.distance_m, set()), shape.id
            levels.setdefault(goal.distance_m, set()).add(goal.pace_s)
    assert levels == {
        d: {_seconds(p) for p in paces} for d, paces in PACE_LEVELS.items()
    }
    assert sum(len(paces) for paces in levels.values()) == 64


def test_every_pace_asks_a_distance_the_rules_will_time() -> None:
    for shape in CATALOG:
        if isinstance(shape.goal, PaceGoal):
            assert shape.goal.distance_m in PACE_DISTANCES_M, shape.id


def test_the_drawn_outlines_enclose_something() -> None:
    # Shoelace area of the outline on the card: a drawing, not a line.
    for shape in CATALOG:
        points = shape.outline
        area = (
            abs(
                sum(
                    x0 * y1 - x1 * y0
                    for (x0, y0), (x1, y1) in zip(points, points[1:], strict=False)
                )
            )
            / 2
        )
        assert area > 0.05, shape.id
