"""A line drawn twice comes back on the roads of its first pass (TASK-071).

`network.snap_to_network` reaches every point of a shape through a zone of
nodes around it, and where the shape goes back along itself the roads just
used cost less (TASK-050). For a word that is not enough: within the zone
the way back may take another road, and a stroke run out and back comes out
as a loop or a smudge instead of one thin line.

`snap_retraced` traces the lines of `words.compose`, whose strokes drawn
twice have the same points both ways, with two more rules:

- a point of the line keeps the road node it was first reached at: every
  later pass through the same point goes to that node;
- a side the line has already drawn the other way is not routed again: the
  route takes the nodes of that first pass, in reverse.

Without the first rule the second rarely applies: the way back reaches the
point at another node of its zone, and goes on from there. The rest is
snap_to_network's: corridor, zones, used roads dearer except on the first
pass of a side drawn twice (`retrace`), spurs pruned (docs/ROUTE_ENGINE.md
§4).
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import networkx as nx
import numpy as np

from route_engine.geo import LatLon, latlon_to_local_array, path_length_m
from route_engine.network import (
    CORRIDOR_BAND,
    CORRIDOR_WEIGHT,
    EDGE_REUSE_PENALTY,
    SPARSE_THRESHOLD_M,
    STROKE_DETAIL,
    ZONE_RADIUS,
    Graph,
    NetworkRoute,
    _corridor_costs,
    _edge_points,
    corner_indices,
    nearest_nodes,
    prune_parallel_spurs,
    prune_spurs,
    twice_drawn,
)

# Two points of the line this close, in metres, are one point.
SAME_POINT_M = 0.01

_SINK = ("retrace-sink",)


def point_ids(xy: np.ndarray, near_m: float = SAME_POINT_M) -> list[int]:
    """For each point, the index of the first point within `near_m` of it."""
    ids: list[int] = []
    for i, point in enumerate(xy):
        if i > 0:
            gaps = np.hypot(*(xy[:i] - point).T)
            j = int(np.argmin(gaps))
            if gaps[j] <= near_m:
                ids.append(ids[j])
                continue
        ids.append(i)
    return ids


def snap_retraced(
    graph: Graph,
    shape_points: Sequence[LatLon],
    reuse_penalty: float = EDGE_REUSE_PENALTY,
    sparse_threshold_m: float = SPARSE_THRESHOLD_M,
    retrace: float = 1.0,
) -> NetworkRoute:
    """A closed route on `graph` through `shape_points`, like
    snap_to_network, where every side drawn twice is run on the same roads
    both ways. On the first pass of such a side the roads already used cost
    `retrace` times as much, as in snap_to_network."""
    warnings: list[str] = []
    nodes, distances = nearest_nodes(graph, shape_points)
    if len(set(nodes)) < 2:
        raise ValueError("the shape collapses onto a single road node")
    mean_distance = sum(distances) / len(distances)
    if mean_distance > sparse_threshold_m:
        warnings.append(
            f"sparse road network: shape points are {mean_distance:.0f} m from "
            f"the nearest road on average (threshold {sparse_threshold_m:.0f} m)"
        )
    if distances[0] > sparse_threshold_m:
        warnings.append(
            f"start is {distances[0]:.0f} m from the nearest road; "
            "the route begins there"
        )

    origin = shape_points[0]
    outline = latlon_to_local_array(origin, np.array(shape_points))
    if not np.allclose(outline[0], outline[-1]):
        outline = np.vstack([outline, outline[:1]])
    twice = twice_drawn(outline)
    fine = STROKE_DETAIL if twice.any() else 1.0
    perimeter = fine * float(np.hypot(*np.diff(outline, axis=0).T).sum())
    costs = _corridor_costs(
        graph, origin, outline, CORRIDOR_WEIGHT, CORRIDOR_BAND * perimeter
    )
    radius = ZONE_RADIUS * perimeter
    node_ids = list(graph.nodes)
    node_xy = latlon_to_local_array(
        origin, np.array([(graph.nodes[n]["y"], graph.nodes[n]["x"]) for n in node_ids])
    )
    sides = len(outline) - 1
    corners = set(corner_indices(outline[:-1]))
    ids = point_ids(outline)
    used: set[frozenset[Any]] = set()
    penalty = reuse_penalty

    def weight(u: Any, v: Any, edges: dict[Any, dict[str, Any]]) -> float:
        cost = costs[(u, v)]
        return cost * penalty if frozenset((u, v)) in used else cost

    def to_zone(k: int, source: Any) -> list[Any]:
        """Cheapest path from `source` to a node near point `k` (the zones
        of snap_to_network)."""
        d = np.hypot(*(node_xy - outline[k]).T)
        zone = np.flatnonzero(d <= radius)
        if len(zone) == 0:
            zone = np.array([int(np.argmin(d))])
        graph.add_node(_SINK)
        try:
            for i in zone:
                graph.add_edge(node_ids[i], _SINK)
                costs[(node_ids[i], _SINK)] = float(d[i])
            path: list[Any] = nx.shortest_path(graph, source, _SINK, weight=weight)
        finally:
            graph.remove_node(_SINK)
            for i in zone:
                costs.pop((node_ids[i], _SINK), None)
        return path[:-1]

    reached = {ids[0]: nodes[0]}  # the node of each point of the line
    drawn: dict[tuple[int, int], list[Any]] = {}  # the nodes of each side
    route = [nodes[0]]
    corner_nodes: set[Any] = {nodes[0]} if 0 in corners else set()
    for k in range(1, sides + 1):
        a, b = ids[k - 1], ids[k]
        back = drawn.get((b, a))
        penalty = retrace if twice[k - 1] else reuse_penalty
        try:
            if back is not None and back[-1] == route[-1]:
                path = back[::-1]
            elif b in reached:
                path = nx.shortest_path(graph, route[-1], reached[b], weight=weight)
            else:
                path = to_zone(k, route[-1])
                reached[b] = path[-1]
        except nx.NetworkXNoPath:
            warnings.append(f"no road path to shape point {k % sides}; skipped")
            continue
        used.update(frozenset(step) for step in zip(path, path[1:], strict=False))
        route.extend(path[1:])
        drawn.setdefault((a, b), path)
        if k % sides in corners:
            corner_nodes.add(path[-1])

    pruned = list(route)
    while True:  # removing one kind of spur can expose the other
        before = pruned
        pruned = prune_spurs(pruned, keep=corner_nodes)
        pruned = prune_parallel_spurs(graph, pruned, keep=corner_nodes)
        if pruned == before:
            break
    if len(set(pruned)) >= 3:  # keep it only if a loop survives
        route = pruned
    points: list[LatLon] = [(graph.nodes[route[0]]["y"], graph.nodes[route[0]]["x"])]
    for u, v in zip(route, route[1:], strict=False):
        points.extend(_edge_points(graph, u, v))
    return NetworkRoute(
        points=points,
        distance_m=path_length_m(points),
        warnings=warnings,
        waypoints=list(dict.fromkeys(reached.values())),
        nodes=route,
    )
