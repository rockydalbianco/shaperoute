"""Whiskers (TASK-131, TASK-139, TASK-140): the share of a route run twice over
the same street, beyond the strokes its shape draws twice on purpose, and
its weight for the shapes judged better with it."""

from __future__ import annotations

import pytest
from test_nearby_starts import ORIGIN

from route_engine.geo import local_to_latlon
from route_engine.models import RouteResult
from route_engine.nearby_starts import score
from route_engine.optimizer import W_DOUBLED, Plan, doubled_weight
from route_engine.retracing import doubled_share, extra_doubled_share


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


def test_only_the_shapes_judged_better_weigh_their_whiskers() -> None:
    for weighed in ("heart", "circle", "star", "horse", "moon", "butterfly", "snail"):
        assert doubled_weight(weighed) == W_DOUBLED[weighed] > 0
    # The user preferred them as they were (TASK-140); words and images too.
    for other in ("cat", "fish", "dog_head", "rabbit_head", "CIAO", "image", ""):
        assert doubled_weight(other) == 0.0


def plan(points: list[tuple[float, float]], shape: str | None) -> Plan:
    return Plan(RouteResult(points, 500.0, 0.9, shape), None)


def test_a_heart_with_whiskers_scores_less_and_other_shapes_do_not() -> None:
    clean, whiskered = plan(SQUARE, "heart"), plan(WHISKER, "heart")
    assert score(whiskered, 500.0) < score(clean, 500.0)
    loss = W_DOUBLED["heart"] / 3.0 * doubled_share(WHISKER)
    assert score(clean, 500.0) - score(whiskered, 500.0) == pytest.approx(loss)
    assert score(plan(WHISKER, "cat"), 500.0) == score(plan(SQUARE, "cat"), 500.0)
    assert score(plan(WHISKER, None), 500.0) == score(plan(SQUARE, None), 500.0)


# A square whose last side is a stroke drawn out and back on purpose.
STROKE = at((0, 0), (100, 0), (100, 100), (0, 100), (0, 0), (0, 50), (0, 0))


def test_a_stroke_the_shape_draws_twice_is_not_a_whisker() -> None:
    assert extra_doubled_share(STROKE, STROKE) == 0.0
    # The same route against a shape without the stroke: all of it extra.
    assert extra_doubled_share(STROKE, SQUARE) == pytest.approx(doubled_share(STROKE))
    assert extra_doubled_share(WHISKER) == pytest.approx(doubled_share(WHISKER))
