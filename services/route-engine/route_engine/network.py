"""Road network access, snapping and routing (docs/ROUTE_ENGINE.md §4, ADR-0020).

The only module that talks to OSMnx. Graphs follow the OSMnx convention:
nodes carry `y` (lat) and `x` (lon), edges carry `length` in metres and,
when the road is not straight, a `geometry` LineString in (lon, lat).
"""

from __future__ import annotations

import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

import networkx as nx
import numpy as np

from route_engine.geo import LatLon, latlon_to_local, local_to_latlon, path_length_m

# Starting values, to be tuned on samples (docs/MAPS.md).
AREA_MARGIN_M = 500.0
EDGE_REUSE_PENALTY = 2.0
SPARSE_THRESHOLD_M = 150.0

# (south, west, north, east) in degrees.
BBox = tuple[float, float, float, float]
Graph = nx.MultiDiGraph


class GraphSource(Protocol):
    def load(self, bbox: BBox) -> Graph: ...


class FileSource:
    """A graph saved as GraphML; the requested area is ignored. Used by tests."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def load(self, bbox: BBox) -> Graph:
        import osmnx as ox

        return ox.load_graphml(self.path)


class OsmnxSource:
    """Walk network from OpenStreetMap, cached as GraphML in `cache_dir`."""

    def __init__(self, cache_dir: Path, network_type: str = "walk") -> None:
        self.cache_dir = cache_dir
        self.network_type = network_type

    def cache_path(self, bbox: BBox) -> Path:
        south, west, north, east = bbox
        name = f"{self.network_type}_{south:.5f}_{west:.5f}_{north:.5f}_{east:.5f}"
        return self.cache_dir / f"{name}.graphml"

    def is_cached(self, bbox: BBox) -> bool:
        return self.cache_path(bbox).exists()

    def load(self, bbox: BBox) -> Graph:
        import osmnx as ox

        path = self.cache_path(bbox)
        if path.exists():
            return ox.load_graphml(path)
        ox.settings.cache_folder = str(self.cache_dir / "http")
        south, west, north, east = bbox
        graph = ox.graph_from_bbox(
            bbox=(west, south, east, north), network_type=self.network_type
        )
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        ox.save_graphml(graph, path)
        return graph


def area_around(points: Sequence[LatLon], margin_m: float = AREA_MARGIN_M) -> BBox:
    """Bounding box of `points` grown by `margin_m` on every side, rounded outward.

    Rounding to 1e-4° (≈ 10 m) keeps cache names stable across float noise.
    """
    origin = points[0]
    local = [latlon_to_local(origin, p) for p in points]
    xs = [x for x, _ in local]
    ys = [y for _, y in local]
    south, west = local_to_latlon(origin, min(xs) - margin_m, min(ys) - margin_m)
    north, east = local_to_latlon(origin, max(xs) + margin_m, max(ys) + margin_m)
    step = 1e-4
    return (
        math.floor(south / step) * step,
        math.floor(west / step) * step,
        math.ceil(north / step) * step,
        math.ceil(east / step) * step,
    )


@dataclass
class NetworkRoute:
    points: list[LatLon]
    distance_m: float
    warnings: list[str] = field(default_factory=list)


def nearest_nodes(
    graph: Graph, points: Sequence[LatLon]
) -> tuple[list[Any], list[float]]:
    """Nearest graph node for each point, and its distance in metres."""
    origin = points[0]
    node_ids = list(graph.nodes)
    local = np.array(
        [
            latlon_to_local(origin, (graph.nodes[n]["y"], graph.nodes[n]["x"]))
            for n in node_ids
        ]
    )
    nearest: list[Any] = []
    distances: list[float] = []
    for point in points:
        x, y = latlon_to_local(origin, point)
        d = np.hypot(local[:, 0] - x, local[:, 1] - y)
        i = int(np.argmin(d))
        nearest.append(node_ids[i])
        distances.append(float(d[i]))
    return nearest, distances


def dedupe_consecutive(nodes: Sequence[Any]) -> list[Any]:
    """Drop consecutive repeats, including the closing repeat of the first node."""
    result: list[Any] = []
    for node in nodes:
        if not result or node != result[-1]:
            result.append(node)
    while len(result) > 1 and result[-1] == result[0]:
        result.pop()
    return result


def prune_spurs(route_nodes: Sequence[Any]) -> list[Any]:
    """Remove out-and-back detours: every A → B → A becomes A, repeatedly.

    Reaching a waypoint down a side street and coming back draws a spike
    that is not part of the shape; dropping it keeps the outer contour.
    """
    result: list[Any] = []
    for node in route_nodes:
        if len(result) >= 2 and result[-2] == node:
            result.pop()
        else:
            result.append(node)
    return result


def _edge_key(u: Any, v: Any) -> frozenset[Any]:
    return frozenset((u, v))


def _penalized_weight(
    used: set[frozenset[Any]], penalty: float
) -> Callable[[Any, Any, dict[Any, dict[str, Any]]], float]:
    def weight(u: Any, v: Any, edges: dict[Any, dict[str, Any]]) -> float:
        length = min(float(data["length"]) for data in edges.values())
        return length * penalty if _edge_key(u, v) in used else length

    return weight


def _edge_points(graph: Graph, u: Any, v: Any) -> list[LatLon]:
    """Points of the shortest u→v edge, from u to v, excluding u itself."""
    data = min(graph[u][v].values(), key=lambda d: float(d["length"]))
    geometry = data.get("geometry")
    if geometry is None:
        return [(graph.nodes[v]["y"], graph.nodes[v]["x"])]
    coords = [(lat, lon) for lon, lat in geometry.coords]
    start = (graph.nodes[u]["y"], graph.nodes[u]["x"])
    if math.dist(coords[-1], start) < math.dist(coords[0], start):
        coords.reverse()
    return coords[1:]


def snap_to_network(
    graph: Graph,
    shape_points: Sequence[LatLon],
    reuse_penalty: float = EDGE_REUSE_PENALTY,
    sparse_threshold_m: float = SPARSE_THRESHOLD_M,
) -> NetworkRoute:
    """Turn a projected shape into a closed route on the road network.

    `shape_points[0]` is the user's start: the route begins and ends at the
    node nearest to it.
    """
    warnings: list[str] = []
    nodes, distances = nearest_nodes(graph, shape_points)

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

    waypoints = dedupe_consecutive(nodes)
    if len(waypoints) < 2:
        raise ValueError("the shape collapses onto a single road node")

    used: set[frozenset[Any]] = set()
    weight = _penalized_weight(used, reuse_penalty)
    first = waypoints[0]
    route_nodes = [first]
    for target in waypoints[1:] + [first]:
        source = route_nodes[-1]
        try:
            path = nx.shortest_path(graph, source, target, weight=weight)
        except nx.NetworkXNoPath:
            warnings.append(f"no path to waypoint node {target}; skipped")
            continue
        for u, v in zip(path, path[1:], strict=False):
            used.add(_edge_key(u, v))
        route_nodes.extend(path[1:])
    pruned = prune_spurs(route_nodes)
    if len(set(pruned)) >= 3:  # keep it only if a loop survives
        route_nodes = pruned

    points: list[LatLon] = [(graph.nodes[first]["y"], graph.nodes[first]["x"])]
    for u, v in zip(route_nodes, route_nodes[1:], strict=False):
        points.extend(_edge_points(graph, u, v))
    return NetworkRoute(
        points=points, distance_m=path_length_m(points), warnings=warnings
    )
