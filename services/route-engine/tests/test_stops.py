"""Deterministic tests for route_engine/stops.py (TASK-129): fake plans, no
road graph."""

from __future__ import annotations

import pytest

from route_engine.geo import LatLon, local_to_latlon
from route_engine.models import RouteResult
from route_engine.optimizer import Plan, ShapeNotDrawableError
from route_engine.stops import (
    MIN_START_GAP_M,
    Stop,
    passed_stops,
    plan_through_stops,
    starts_for,
)

CENTRE: LatLon = (45.0712, 7.6853)


def at(x_m: float, y_m: float) -> LatLon:
    return local_to_latlon(CENTRE, x_m, y_m)


def plan_of(points: list[LatLon], similarity: float) -> Plan:
    result = RouteResult(
        points=points, distance_m=1000.0, similarity=similarity, shape="heart"
    )
    return Plan(result=result, search=None)


def test_passed_stops_near_the_line_in_the_order_met() -> None:
    route = [at(0, 0), at(1000, 0), at(1000, 1000)]
    stops = [
        Stop("far", at(500, 300)),
        Stop("second", at(1050, 600)),  # 50 m off the second leg
        Stop("first", at(400, -70)),  # 70 m off the first leg
    ]
    got = passed_stops(route, stops)
    assert [s.name for s in got] == ["first", "second"]


def test_starts_centre_first_then_the_most_crowded_far_apart() -> None:
    lonely = Stop("lonely", at(3000, 3000))
    crowd = [Stop(f"c{i}", at(1500 + 50 * i, 0)) for i in range(4)]
    near_centre = Stop("near", at(100, 0))  # too close to the centre
    starts = starts_for(CENTRE, [lonely, near_centre, *crowd], count=3)
    assert starts[0] == CENTRE
    assert starts[1] == crowd[0].point
    assert starts[2] == lonely.point
    assert len(starts_for(CENTRE, [], count=4)) == 1
    assert MIN_START_GAP_M > 100


def test_keeps_the_route_through_most_stops_if_it_still_reads() -> None:
    stops = [Stop("a", at(1500, 0)), Stop("b", at(1500, 500)), Stop("c", at(0, 900))]
    routes = {
        CENTRE: plan_of([at(0, 0), at(0, 1000)], 0.97),  # passes c
        stops[0].point: plan_of([at(1500, 0), at(1500, 600)], 0.90),  # a and b
    }

    def plan_from(start: LatLon) -> Plan:
        if start in routes:
            return routes[start]
        raise ShapeNotDrawableError("no roads")

    got = plan_through_stops(CENTRE, stops, plan_from, max_starts=3)
    assert [s.name for s in got.passed] == ["a", "b"]
    assert got.plan is routes[stops[0].point]
    assert (got.tried, got.drawn) == (3, 2)


def test_a_shape_that_does_not_read_is_not_kept_for_its_stops() -> None:
    stops = [Stop("a", at(0, 500))]

    def plan_from(start: LatLon) -> Plan:
        return plan_of([at(0, 0), at(0, 1000)], 0.70)

    with pytest.raises(ShapeNotDrawableError):
        plan_through_stops(CENTRE, stops, plan_from)
