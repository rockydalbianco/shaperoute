"""Other routes to choose from (TASK-093, ADR-0087): the nearby starts'
routes that look different and almost as good as the one chosen."""

from __future__ import annotations

import pytest
from test_nearby_starts import ORIGIN, GridSource, LoopJob, _grid, _latlon

from route_engine.alternatives import (
    MAX_ALTERNATIVES,
    MAX_SIMILARITY_DROP,
    alternatives,
    same_route,
    share_along,
)
from route_engine.geo import LatLon, local_to_latlon
from route_engine.models import RouteResult
from route_engine.nearby_starts import plan_nearby
from route_engine.optimizer import Plan


def square(east_m: float, north_m: float, side_m: float = 300.0) -> list[LatLon]:
    corners = [(0, 0), (side_m, 0), (side_m, side_m), (0, side_m), (0, 0)]
    return [local_to_latlon(ORIGIN, east_m + x, north_m + y) for x, y in corners]


def plan_of(points: list[LatLon], similarity: float) -> Plan:
    result = RouteResult(points, 1200.0, similarity, "square")
    return Plan(result, None)


def test_a_route_a_few_metres_off_is_the_same_route() -> None:
    assert share_along(square(0, 0), square(0, 0)) == pytest.approx(1.0)
    assert same_route(square(0, 0), square(8, 5))
    # The other side of a wide road is still the same streets.
    assert same_route(square(0, 0), square(15, 0))
    assert not same_route(square(0, 0), square(60, 0))
    assert not same_route(square(0, 0), square(0, 0, side_m=200.0))


def test_alternatives_drop_the_same_route_and_a_much_worse_one() -> None:
    chosen = plan_of(square(0, 0), 0.80)
    same = plan_of(square(6, 0), 0.80)
    worse = plan_of(square(0, 90), 0.80 - MAX_SIMILARITY_DROP - 0.01)
    other = plan_of(square(90, 0), 0.75)
    assert alternatives(chosen, [same, worse, other]) == [other]


def test_alternatives_keep_two_at_most_best_first_and_unlike_each_other() -> None:
    chosen = plan_of(square(0, 0), 0.85)
    a = plan_of(square(90, 0), 0.84)
    a_again = plan_of(square(94, 3), 0.84)
    b = plan_of(square(0, 90), 0.80)
    c = plan_of(square(-90, 0), 0.79)
    assert alternatives(chosen, [a, a_again, b, c]) == [a, b]
    assert MAX_ALTERNATIVES == 2


def test_equal_routes_of_equal_quality_are_both_kept_when_they_differ() -> None:
    # ADR-0086: two routes as good as each other are both shown.
    chosen = plan_of(square(0, 0), 0.80)
    twin = plan_of(square(0, 90), 0.80)
    assert alternatives(chosen, [twin]) == [twin]


def test_plan_nearby_offers_the_other_starts_routes_from_the_user() -> None:
    job = LoopJob(similarity=(((2, 0), 0.90), ((-2, 0), 0.86), ((0, 2), 0.70)))
    found = plan_nearby(job, ORIGIN, GridSource(), count=4, processes=False)
    chosen = found.tried[found.chosen]
    # The route chosen is the one of before, unchanged.
    assert found.plan.result == chosen.plan.result  # type: ignore[union-attr]
    others = [p.result for p in found.plan.alternatives]
    assert len(others) == MAX_ALTERNATIVES
    # Best first: 0.86, then a route at the default 0.80; never 0.70.
    assert [r.similarity for r in others] == [0.86, 0.80]
    home = _latlon(_grid(), (0, 0))
    for result in others:
        assert result.points[0] == home and result.points[-1] == home
        assert result.alternatives == []


def test_plan_nearby_without_nearby_starts_has_no_alternatives() -> None:
    found = plan_nearby(LoopJob(), ORIGIN, GridSource(), count=0)
    assert found.plan.alternatives == []
