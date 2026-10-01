"""Directions for a route the app has only as points (TASK-145, ADR-0117).

The routes of "Explore" reach the app without directions: the catalogue
keeps only points, and a theme's route and a city's examples are shown the
same way. POST /route-directions finds the route's nodes on the zone's graph
(route_engine.route_nodes) and answers the directions a planned route would
have had, with the street an unnamed road runs along (ADR-0057). The zone is
the one the routes use: in memory, from the cache, or downloaded.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import asdict
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field
from route_engine.directions import Direction, guidance
from route_engine.geo import LatLon, local_to_latlon
from route_engine.network import BBox
from route_engine.optimizer import GraphLoader
from route_engine.route_nodes import nodes_along

from shaperoute_api.alongs import with_alongs
from shaperoute_api.jobs import KnowsNames
from shaperoute_api.schemas import DirectionBody

# The graph is cut this far around the route: every road at a node of the
# route is in it, with the 20 m its heading is taken along (directions.py).
MARGIN_M = 250.0
# As the planned route of a run's score (schemas.MAX_ROUTE_POINTS): a 21 km
# route has a few thousand.
MAX_POINTS = 50_000

Latitude = Annotated[float, Field(ge=-90.0, le=90.0)]
Longitude = Annotated[float, Field(ge=-180.0, le=180.0)]


class RouteDirectionsRequestBody(BaseModel):
    """What the app sends to POST /route-directions:
    packages/shared-types/fixtures/route-directions-request.json."""

    model_config = ConfigDict(extra="forbid")

    points: list[tuple[Latitude, Longitude]] = Field(
        min_length=2,
        max_length=MAX_POINTS,
        description="The route as [lat, lon] points, as the engine drew it.",
    )


class RouteDirectionsBody(BaseModel):
    """What the app gets back: fixtures/route-directions.json."""

    directions: list[DirectionBody] = Field(
        description="Turn by turn, the start first: as RouteResult.directions."
    )

    @classmethod
    def of(cls, directions: Sequence[Direction]) -> RouteDirectionsBody:
        return cls(directions=[DirectionBody(**asdict(d)) for d in directions])


def bbox_around(points: Sequence[LatLon], margin_m: float = MARGIN_M) -> BBox:
    """The route's box, `margin_m` wider on every side."""
    lats = [lat for lat, _ in points]
    lons = [lon for _, lon in points]
    south, west = local_to_latlon((min(lats), min(lons)), -margin_m, -margin_m)
    north, east = local_to_latlon((max(lats), max(lons)), margin_m, margin_m)
    return (south, west, north, east)


def directions_of(source: GraphLoader, points: Sequence[LatLon]) -> list[Direction]:
    """The directions of the route of `points`, on the graph `source` gives
    around it. RouteNotOnGraphError when the route is not on that map."""
    graph = source.load(bbox_around(points))
    nodes = nodes_along(graph, points)
    names = source.named_roads if isinstance(source, KnowsNames) else None
    return with_alongs(graph, nodes, guidance(graph, nodes), names)
