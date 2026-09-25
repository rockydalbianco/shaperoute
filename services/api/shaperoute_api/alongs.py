"""The street each unnamed road of a route runs along (TASK-060, ADR-0057).

The engine deduces it (sidewalks.py, ADR-0054); here it is put on the
directions the API answers with, as `along`, never in `street`. The names
of the roads the foot graph leaves out come from the zone's cached file
only: a request never waits for Overpass for them. Without the file, the
named roads of the graph still count.
"""

from __future__ import annotations

import logging
from collections.abc import Callable, Sequence
from dataclasses import replace
from typing import Any

from route_engine.directions import Direction
from route_engine.geo import local_to_latlon
from route_engine.network import BBox, Graph
from route_engine.sidewalks import (
    MAX_DISTANCE_M,
    NamedRoad,
    StreetIndex,
    alongs,
    graph_roads,
)

log = logging.getLogger(__name__)

# Named roads are looked for this far around the route: a sidewalk's street
# is within MAX_DISTANCE_M of it, and a road's segment may start further.
MARGIN_M = 4 * MAX_DISTANCE_M

NamedRoads = Callable[[BBox], list[NamedRoad]]


def with_alongs(
    graph: Graph,
    nodes: Sequence[Any],
    directions: Sequence[Direction],
    named_roads: NamedRoads | None = None,
) -> list[Direction]:
    """`directions` of `nodes` on `graph`, each unnamed one with the street
    its road runs along, when there is one. Names that cannot be read leave
    the graph's alone: an `along` is never worth failing a route."""
    if not any(direction.street is None for direction in directions):
        return list(directions)
    bbox = around(graph, nodes)
    roads = graph_roads(graph.subgraph(_inside(graph, bbox)))
    if named_roads is not None:
        try:
            roads.extend(named_roads(bbox))
        except Exception:
            log.warning("names of the roads around the route unread", exc_info=True)
    found = alongs(graph, nodes, directions, StreetIndex(roads))
    return [
        replace(direction, along=along)
        for direction, along in zip(directions, found, strict=True)
    ]


def around(graph: Graph, nodes: Sequence[Any]) -> BBox:
    """The route's nodes' box, MARGIN_M wider on every side."""
    lats = [float(graph.nodes[node]["y"]) for node in nodes]
    lons = [float(graph.nodes[node]["x"]) for node in nodes]
    south, west = local_to_latlon((min(lats), min(lons)), -MARGIN_M, -MARGIN_M)
    north, east = local_to_latlon((max(lats), max(lons)), MARGIN_M, MARGIN_M)
    return (south, west, north, east)


def _inside(graph: Graph, bbox: BBox) -> list[Any]:
    south, west, north, east = bbox
    return [
        node
        for node, data in graph.nodes(data=True)
        if south <= data["y"] <= north and west <= data["x"] <= east
    ]
