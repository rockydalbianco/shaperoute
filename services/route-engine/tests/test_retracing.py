"""Whiskers (TASK-131): the share of a route run twice over the same street,
and its weight in the choice of a heart only."""

from __future__ import annotations

import pytest
from test_nearby_starts import ORIGIN

from route_engine.geo import local_to_latlon
from route_engine.models import RouteResult
from route_engine.nearby_starts import score
from route_engine.optimizer import W_DOUBLED, Plan, doubled_weight
from route_engine.retracing import doubled_share


def at(*xy: tuple[float, float]) -> list[tuple[float, float]]:
    return [local_to_latlon(ORIGIN, x, y) for x, y in xy]


SQUARE = at((0, 0), (100, 0), (100, 100), (0, 100), (0, 0))
# The same square with a 50 m whisker out of its far corner and back.
WHISKER = at((0, 0), (100, 0), (100, 100), (150, 100), (100, 100), (0, 100), (0, 0))


def test_a_loop_runs_nothing_twice() -> None:
    assert doubled_share(SQUARE) == 0.0


def test_a_whisker_is_its_two_ways_over_the_length() -> None:
    assert doubled_share(WHISKER) == pytest.approx(100 / 500, abs=1e-6)


def test_a_road_run_back_the_other_way_counts_too() -> None:
    out_and_back = at((0, 0), (100, 0), (0, 0))
    assert doubled_share(out_and_back) == pytest.approx(1.0)
    assert doubled_share(at((0, 0))) == 0.0


def test_only_the_heart_weighs_its_whiskers() -> None:
    assert doubled_weight("heart") == W_DOUBLED["heart"] > 0
    for other in ("circle", "star", "cat", "CIAO", "image", ""):
        assert doubled_weight(other) == 0.0


def plan(points: list[tuple[float, float]], shape: str | None) -> Plan:
    return Plan(RouteResult(points, 500.0, 0.9, shape), None)


def test_a_heart_with_whiskers_scores_less_and_other_shapes_do_not() -> None:
    clean, whiskered = plan(SQUARE, "heart"), plan(WHISKER, "heart")
    assert score(whiskered, 500.0) < score(clean, 500.0)
    loss = W_DOUBLED["heart"] / 3.0 * doubled_share(WHISKER)
    assert score(clean, 500.0) - score(whiskered, 500.0) == pytest.approx(loss)
    assert score(plan(WHISKER, "star"), 500.0) == score(plan(SQUARE, "star"), 500.0)
    assert score(plan(WHISKER, None), 500.0) == score(plan(SQUARE, None), 500.0)
