"""The graph nodes of a route given only as its points (TASK-145, ADR-0117).

The routes of "Explore" (the catalogue, a theme's, a city's examples) reach
the app as points, without directions. The engine drew those points from
graph nodes and the shortest edge between each two (network.py,
`_edge_points`): every node of the route is one of its points, to the
rounding of a file (6 decimals, about 0.1 m). Matched back to the nodes of
the zone's graph, the route gets its directions (directions.guidance) as a
planned one does.

A point of an edge's geometry can lie on a node of another road, where the
route passes over or beside it: such a node is dropped when the next one
joins on. Two nodes with no road between them, because the zone was
downloaded again and changed, are joined by the shortest way when it is not
much longer than the line between them.

Works in metres on the plane tangent at the route's first point.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Any

import networkx as nx
import numpy as np

from route_engine.geo import LatLon, latlon_to_local_array
from route_engine.models import InvalidRequestError

# A point this close to a node is that node: a file's 6 decimals move it by
# about 0.1 m, and two nodes of a simplified graph are rarely this close.
MATCH_M = 1.0
# A gap between two nodes of the route is closed by the shortest way when it
# is at most GAP_FACTOR times the route between them plus GAP_SLACK_M: a
# road gone from the map, not a different route.
GAP_FACTOR = 2.0
GAP_SLACK_M = 50.0


class RouteNotOnGraphError(InvalidRequestError):
    """Fewer than two of the route's points are nodes of the graph: the
    route is not on this map."""


def nodes_along(graph: nx.MultiDiGraph, points: Sequence[LatLon]) -> list[Any]:
    """The nodes of `graph` the route of `points` passes, in order, each
    joined to the next by a road, ready for directions.guidance."""
    if len(points) < 2:
        raise RouteNotOnGraphError("A route needs at least 2 points.")
    origin = points[0]
    xy = latlon_to_local_array(origin, np.asarray(points, dtype=float))
    along = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(xy, axis=0).T))])
    matched = _matched(graph, origin, xy)
    if len({node for _, node in matched}) < 2:
        raise RouteNotOnGraphError("The route does not follow the roads of this map.")
    path = [matched[0][1]]
    reached = matched[0][0]  # the point of the last node on the path
    for k in range(1, len(matched)):
        index, node = matched[k]
        last = path[-1]
        if node == last:
            continue
        if graph.has_edge(last, node):
            path.append(node)
            reached = index
            continue
        # A node only near the line: the next one joins on without it.
        following = matched[k + 1][1] if k + 1 < len(matched) else None
        if following is not None and graph.has_edge(last, following):
            continue
        way = _gap(graph, last, node, float(along[index] - along[reached]))
        if way is not None:
            path.extend(way[1:])
            reached = index
    return path


def _matched(
    graph: nx.MultiDiGraph, origin: LatLon, xy: np.ndarray
) -> list[tuple[int, Any]]:
    """(point index, node) for each point within MATCH_M of a node, the
    nearest; the same node on consecutive points once."""
    ids = list(graph.nodes)
    if not ids:
        return []
    nodes_xy = latlon_to_local_array(
        origin,
        np.array([(graph.nodes[n]["y"], graph.nodes[n]["x"]) for n in ids], float),
    )
    # Only the nodes around the route are hashed: a zone has many more.
    low, high = xy.min(axis=0) - MATCH_M, xy.max(axis=0) + MATCH_M
    near = np.flatnonzero(np.all((nodes_xy >= low) & (nodes_xy <= high), axis=1))
    cells: dict[tuple[int, int], list[int]] = {}
    for i in near:
        x, y = nodes_xy[i]
        cells.setdefault((math.floor(x / MATCH_M), math.floor(y / MATCH_M)), []).append(
            int(i)
        )
    matched: list[tuple[int, Any]] = []
    for index, (x, y) in enumerate(xy):
        cx, cy = math.floor(x / MATCH_M), math.floor(y / MATCH_M)
        best: int | None = None
        best_m = MATCH_M
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for i in cells.get((cx + dx, cy + dy), ()):
                    d = math.hypot(nodes_xy[i, 0] - x, nodes_xy[i, 1] - y)
                    if d <= best_m:
                        best, best_m = i, d
        if best is not None and (not matched or matched[-1][1] != ids[best]):
            matched.append((index, ids[best]))
    return matched


def _gap(
    graph: nx.MultiDiGraph, start: Any, end: Any, route_m: float
) -> list[Any] | None:
    """The shortest way from `start` to `end`, None when there is none
    within GAP_FACTOR times `route_m` plus GAP_SLACK_M."""
    try:
        _, way = nx.single_source_dijkstra(
            graph,
            start,
            target=end,
            cutoff=GAP_FACTOR * route_m + GAP_SLACK_M,
            weight="length",
        )
    except nx.NetworkXNoPath:
        return None
    nodes: list[Any] = way
    return nodes
