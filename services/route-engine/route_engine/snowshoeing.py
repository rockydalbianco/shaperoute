"""A snowshoe request, planned on the snow and checked (TASK-413, ADR-0342).

On the snow there is no network: `snow.build_area` makes the snow one may
walk on into a `water.WaterArea`, `water_fit.fit_shape` places the shape of
the catalogue where it fits on it, as on the water, and joins it to a way
in (a minor road, a track, a path) by a straight leg over the snow.
`check_on_snow` checks the route. `python -m route_engine --activity
snowshoeing` calls `plan_snowshoeing`, and so will the API (TASK-413 part
A2).

With the pen up a shape in pieces is drawn piece by piece, as on the water
(TASK-226): the distance asked is then the whole route's, walks and legs
included.
"""

from __future__ import annotations

from dataclasses import dataclass

from route_engine.heights import Heights
from route_engine.models import SNOW_ACTIVITIES, RouteRequest, RouteResult
from route_engine.paddling import WATER_SHAPE_POINTS, _pen_up_lines
from route_engine.shapes import FREE_ROTATION, get_shape
from route_engine.snow import (
    CHOSEN,
    CountsBuildings,
    SnowArea,
    SnowRules,
    SnowSource,
    as_snow_error,
    build_area,
    built_up,
    no_snow_error,
    snow_bbox,
    town_bbox,
)
from route_engine.validation import InvalidRouteError
from route_engine.water import XY, BBox, NoWaterError, WaterFitError
from route_engine.water_fit import (
    DISTANCE_TOLERANCE,
    WaterMeasures,
    WaterRoute,
    fit_shape,
    measure,
)


@dataclass(frozen=True)
class SnowPlan:
    """The route of a request, and how it lies on the snow."""

    result: RouteResult
    route: WaterRoute
    area: SnowArea


def snow_shape(request: RouteRequest) -> list[XY]:
    """The closed outline drawn on the snow for `request`: with the pen up,
    without the pieces drawn after it (`snow_pieces`)."""
    if request.activity not in SNOW_ACTIVITIES:
        raise ValueError(f"a {request.activity} route is not drawn on the snow")
    assert request.shape is not None  # RouteRequest refuses a word on the snow
    if request.pen_up:
        return _pen_up_lines(request.shape)[0]
    return list(get_shape(request.shape)(WATER_SHAPE_POINTS))


def snow_pieces(request: RouteRequest) -> list[list[XY]]:
    """The lines drawn after the outline with the pen up, in its frame."""
    if not request.pen_up:
        return []
    assert request.shape is not None  # as snow_shape
    return _pen_up_lines(request.shape)[1:]


def snow_area(request: RouteRequest) -> BBox:
    """The area whose snow and heights `request` needs (snow.snow_bbox)."""
    return snow_bbox(
        request.start, snow_shape(request), request.distance_m, snow_pieces(request)
    )


def check_on_snow(measures: WaterMeasures, distance_m: float) -> None:
    """Raise unless a route on the snow (water_fit.measure on the snow
    area) ends where it begins, is nowhere off the snow allowed (but for the
    half metre where a leg leaves a way in, water_fit.ON_LAND_M), and is
    within DISTANCE_TOLERANCE of `distance_m`, as on roads. Unlike the
    water, no shore to stay near: the snow is all band."""
    if not measures.closed:
        raise InvalidRouteError("the route does not end where it begins")
    if measures.on_land_m > 0.0:
        raise InvalidRouteError(
            f"{measures.on_land_m:.1f} m of the route on the snow is off it"
        )
    if abs(measures.distance_m - distance_m) > DISTANCE_TOLERANCE * distance_m:
        raise InvalidRouteError(
            f"the route on the snow is {measures.distance_m:.0f} m long, "
            f"not within {DISTANCE_TOLERANCE:.0%} of {distance_m:.0f} m"
        )


def plan_snowshoeing(
    request: RouteRequest,
    source: SnowSource,
    heights: Heights,
    rules: SnowRules = CHOSEN,
) -> SnowPlan:
    """The route of a snowshoe `request` on the snow `source` and `heights`
    give: closed, from a way in, checked. The similarity is the shape's with
    itself, 1: how much it had to shrink and move is in the WaterRoute.

    NoSnowError and SnowFitError (both ShapeNotDrawableError) when there is
    no snow to walk on near the start or the shape does not fit on it.
    NoSnowError before the snow is read when the source counts the
    buildings and the start is in a town (snow.built_up on snow.town_bbox,
    TASK-413 A3)."""
    shape = snow_shape(request)
    pieces = snow_pieces(request)
    bbox = snow_area(request)
    if isinstance(source, CountsBuildings):
        town = town_bbox(request.start)
        if built_up(source.buildings(town), town):
            raise no_snow_error()
    area = build_area(source.elements(bbox), heights, request.start, bbox, rules)
    name = str(request.shape)
    try:
        route = fit_shape(
            shape,
            request.distance_m,
            area.water,
            name=name,
            free_rotation=request.shape in FREE_ROTATION,
            pieces=pieces,
            near=request.near,
        )
    except (NoWaterError, WaterFitError) as exc:
        raise as_snow_error(exc, name, request.distance_m) from None
    check_on_snow(measure(route.points, area.water), request.distance_m)
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
    return SnowPlan(result, route, area)
