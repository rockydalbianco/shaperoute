"""A paddling request, planned on the water and checked (TASK-191, ADR-0154,
ADR-0161).

On the water there is no road network: `water_fit.plan_on_water` places the
shape of the catalogue where it fits in the band of `water.py` and joins it
to a start on the shore, and `validation.check_on_water` checks the route.
`python -m route_engine --activity paddling` calls `plan_paddling`, and so
will the API (TASK-191 part B).

With the pen up a shape in pieces is drawn piece by piece (TASK-226,
ADR-0188): its outline, then each eye on its own, and the route paddles
from one to the next without drawing (`RouteResult.walks`), as a word's
letters on the roads. The distance asked is then the whole route's, walks
and legs included, as for every route on the water.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

from route_engine.models import WATER_ACTIVITIES, RouteRequest, RouteResult
from route_engine.shapes import FREE_ROTATION, get_shape
from route_engine.shapes.outline import Outline
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
    """The closed outline drawn on the water for `request`: with the pen up,
    without the pieces drawn after it (`water_pieces`)."""
    if request.activity not in WATER_ACTIVITIES:
        raise ValueError(f"a {request.activity} route is not drawn on the water")
    assert request.shape is not None  # RouteRequest refuses a word on the water
    if request.pen_up:
        return _pen_up_lines(request.shape)[0]
    return list(get_shape(request.shape)(WATER_SHAPE_POINTS))


def water_pieces(request: RouteRequest) -> list[list[XY]]:
    """The lines drawn after the outline with the pen up, in its frame: the
    pieces of a shape in pieces, such as its eyes. None with the pen down."""
    if not request.pen_up:
        return []
    assert request.shape is not None  # as water_shape
    return _pen_up_lines(request.shape)[1:]


def _pen_up_lines(name: str) -> list[list[XY]]:
    """`Outline.pen_up_lines` of the shape called `name`, every vertex
    kept and each side cut into pieces at most 1/WATER_SHAPE_POINTS of
    their length together (as pieces.compose cuts them on the roads)."""
    shape = get_shape(name)
    assert isinstance(shape, Outline)  # RouteRequest: pen up, so in pieces
    lines = shape.pen_up_lines()
    step = sum(_length(line) for line in lines) / WATER_SHAPE_POINTS
    return [_cut(line, step) for line in lines]


def _cut(line: Sequence[XY], step: float) -> list[XY]:
    out: list[XY] = [line[0]]
    for a, b in zip(line, line[1:], strict=False):
        n = max(1, math.ceil(math.dist(a, b) / step - 1e-9))
        out.extend(
            (a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n)
            for j in range(1, n)
        )
        out.append(b)
    return out


def _length(line: Sequence[XY]) -> float:
    return sum(math.dist(a, b) for a, b in zip(line, line[1:], strict=False))


def water_area(request: RouteRequest) -> BBox:
    """The area whose water `request` needs (water_fit.water_bbox)."""
    return water_bbox(
        request.start,
        water_shape(request),
        request.distance_m,
        water_pieces(request),
    )


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
        pieces=water_pieces(request),
        near=request.near,
    )
    check_on_water(measure(route.points, area), request.distance_m)
    result = RouteResult(
        points=route.points,
        distance_m=route.distance_m,
        similarity=1.0,
        shape=request.shape,
        walks=list(route.walks),
        centre=route.centre,
        # Within ±45°, counterclockwise; 0 for the circle (TASK-232).
        rotation_deg=route.rotation_deg + 0.0,
    )
    return WaterPlan(result, route, area)
