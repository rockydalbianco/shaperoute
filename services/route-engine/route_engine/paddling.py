"""A paddling request, planned on the water and checked (TASK-191, ADR-0154,
ADR-0161).

On the water there is no road network: `water_fit.plan_on_water` places the
shape of the catalogue where it fits in the band of `water.py` and joins it
to a start on the shore, and `validation.check_on_water` checks the route.
`python -m route_engine --activity paddling` calls `plan_paddling`, and so
will the API (TASK-191 part B).
"""

from __future__ import annotations

from dataclasses import dataclass

from route_engine.models import WATER_ACTIVITIES, RouteRequest, RouteResult
from route_engine.shapes import FREE_ROTATION, get_shape
from route_engine.validation import check_on_water
from route_engine.water import XY, BBox, WaterArea, WaterSource
from route_engine.water_fit import WaterRoute, measure, plan_on_water, water_bbox

# On the water the outline is the route itself: twice the points of a shape
# on roads (optimizer.SHAPE_POINTS), as the samples of ADR-0154.
WATER_SHAPE_POINTS = 128


@dataclass(frozen=True)
class WaterPlan:
    """The route of a request, and how it lies on the water."""

    result: RouteResult
    route: WaterRoute
    area: WaterArea


def water_shape(request: RouteRequest) -> list[XY]:
    """The closed outline drawn on the water for `request`."""
    if request.activity not in WATER_ACTIVITIES:
        raise ValueError(f"a {request.activity} route is not drawn on the water")
    assert request.shape is not None  # RouteRequest refuses a word on the water
    return list(get_shape(request.shape)(WATER_SHAPE_POINTS))


def water_area(request: RouteRequest) -> BBox:
    """The area whose water `request` needs (water_fit.water_bbox)."""
    return water_bbox(request.start, water_shape(request), request.distance_m)


def plan_paddling(request: RouteRequest, source: WaterSource) -> WaterPlan:
    """The route of a paddling `request` on the water `source` gives:
    closed, from a start on the shore, checked. The similarity is the
    shape's with itself, 1: how much it had to shrink and move is in the
    WaterRoute.

    NoWaterError and WaterFitError (both ShapeNotDrawableError) when there
    is no water near the start or the shape does not fit on it."""
    shape = water_shape(request)
    route, area = plan_on_water(
        shape,
        request.distance_m,
        request.start,
        source,
        name=str(request.shape),
        free_rotation=request.shape in FREE_ROTATION,
    )
    check_on_water(measure(route.points, area), request.distance_m)
    result = RouteResult(
        points=route.points,
        distance_m=route.distance_m,
        similarity=1.0,
        shape=request.shape,
    )
    return WaterPlan(result, route, area)
