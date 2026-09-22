"""Road network access, snapping and routing (docs/ROUTE_ENGINE.md §4, ADR-0020).

The only module that talks to OSMnx. Graphs follow the OSMnx convention:
nodes carry `y` (lat) and `x` (lon), edges carry `length` in metres and,
when the road is not straight, a `geometry` LineString in (lon, lat).
"""

from __future__ import annotations

import math
from collections.abc import Sequence
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
# Fractions of the shape perimeter, tuned in TASK-017 (docs/MAPS.md).
ZONE_RADIUS = 0.02
CORRIDOR_BAND = 0.02
CORRIDOR_WEIGHT = 2.0

# OSMnx 2.1 "walk" filter without its `cycleway` exclusion: in Trentino most
# cycle paths are shared with pedestrians (ADR-0022). The name keeps these
# graphs apart from the plain "walk" ones cached by TASK-014.
FOOT_NETWORK_NAME = "foot"
FOOT_FILTER = (
    '["highway"]["area"!~"yes"]["access"!~"private"]'
    '["highway"!~"abandoned|bus_guideway|construction|motor|no|planned|platform'
    '|proposed|raceway|razed|rest_area|services"]'
    '["foot"!~"no"]["service"!~"private"]["sidewalk"!~"separate"]'
    '["sidewalk:both"!~"separate"]["sidewalk:left"!~"separate"]'
    '["sidewalk:right"!~"separate"]'
)

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
    """Foot network from OpenStreetMap, cached as GraphML in `cache_dir`."""

    def __init__(
        self,
        cache_dir: Path,
        network_name: str = FOOT_NETWORK_NAME,
        custom_filter: str = FOOT_FILTER,
    ) -> None:
        self.cache_dir = cache_dir
        self.network_name = network_name
        self.custom_filter = custom_filter

    def cache_path(self, bbox: BBox) -> Path:
        south, west, north, east = bbox
        name = f"{self.network_name}_{south:.5f}_{west:.5f}_{north:.5f}_{east:.5f}"
        return self.cache_dir / f"{name}.graphml"

    def covering_path(self, bbox: BBox) -> Path | None:
        """Smallest cached graph of this network whose area contains `bbox`."""
        exact = self.cache_path(bbox)
        if exact.exists():
            return exact
        south, west, north, east = bbox
        eps = 1e-5  # names are rounded to 5 decimals
        best: tuple[float, Path] | None = None
        for path in self.cache_dir.glob(f"{self.network_name}_*.graphml"):
            parts = path.stem.split("_")[1:]
            try:
                s, w, n, e = (float(p) for p in parts)
            except ValueError:
                continue
            if (
                s <= south + eps
                and w <= west + eps
                and n >= north - eps
                and e >= east - eps
            ):
                size = (n - s) * (e - w)
                if best is None or size < best[0]:
                    best = (size, path)
        return None if best is None else best[1]

    def is_cached(self, bbox: BBox) -> bool:
        return self.covering_path(bbox) is not None

    def load(self, bbox: BBox) -> Graph:
        """Graph of `bbox`: from its cache file, cropped from a larger cached
        graph (and saved under its own name), or downloaded."""
        import osmnx as ox

        path = self.cache_path(bbox)
        if path.exists():
            return ox.load_graphml(path)
        covering = self.covering_path(bbox)
        if covering is not None:
            graph = crop(ox.load_graphml(covering), bbox)
            ox.save_graphml(graph, path)
            return graph
        ox.settings.cache_folder = str(self.cache_dir / "http")
        south, west, north, east = bbox
        # network_type="walk" keeps every edge two-way: one-way streets do
        # not bind pedestrians. The filter picks the ways.
        graph = ox.graph_from_bbox(
            bbox=(west, south, east, north),
            network_type="walk",
            custom_filter=self.custom_filter,
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


def crop(graph: Graph, bbox: BBox) -> Graph:
    """Nodes inside `bbox`, the edges between them, largest connected piece.

    Close to what downloading `bbox` gives: OSMnx also keeps only the
    largest piece, but simplifies the ways before cutting them at the border.
    """
    south, west, north, east = bbox
    inside = [
        n
        for n, d in graph.nodes(data=True)
        if south <= d["y"] <= north and west <= d["x"] <= east
    ]
    pieces = nx.weakly_connected_components(graph.subgraph(inside))
    return graph.subgraph(max(pieces, key=len)).copy()


@dataclass
class NetworkRoute:
    points: list[LatLon]
    distance_m: float
    warnings: list[str] = field(default_factory=list)
    waypoints: list[Any] = field(default_factory=list)  # node reached per zone


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


def distance_to_polyline(polyline: np.ndarray, points: np.ndarray) -> np.ndarray:
    """Distance in metres from each (x, y) point to the nearest polyline segment."""
    a, b = polyline[:-1], polyline[1:]
    ab = b - a
    ab2 = np.maximum((ab**2).sum(axis=1), 1e-12)
    result = np.empty(len(points))
    chunk = 4096
    for s in range(0, len(points), chunk):
        p = points[s : s + chunk]
        ap = p[:, None, :] - a[None]
        t = np.clip((ap * ab[None]).sum(axis=2) / ab2[None], 0.0, 1.0)
        closest = a[None] + t[..., None] * ab[None]
        d = np.hypot(p[:, None, 0] - closest[..., 0], p[:, None, 1] - closest[..., 1])
        result[s : s + chunk] = d.min(axis=1)
    return result


def _edge_key(u: Any, v: Any) -> frozenset[Any]:
    return frozenset((u, v))


def _node_latlon(graph: Graph, node: Any) -> LatLon:
    return graph.nodes[node]["y"], graph.nodes[node]["x"]


def _edge_coords(graph: Graph, u: Any, v: Any, data: dict[str, Any]) -> list[LatLon]:
    """All points of one u→v edge, from u to v, both ends included."""
    start, end = _node_latlon(graph, u), _node_latlon(graph, v)
    geometry = data.get("geometry")
    if geometry is None:
        return [start, end]
    coords = [(lat, lon) for lon, lat in geometry.coords]
    if math.dist(coords[-1], start) < math.dist(coords[0], start):
        coords.reverse()
    return coords


def _edge_points(graph: Graph, u: Any, v: Any) -> list[LatLon]:
    """Points of the shortest u→v edge, from u to v, excluding u itself."""
    data = min(graph[u][v].values(), key=lambda d: float(d["length"]))
    return _edge_coords(graph, u, v, data)[1:]


def _corridor_costs(
    graph: Graph, origin: LatLon, outline: np.ndarray, weight: float, band_m: float
) -> dict[tuple[Any, Any], float]:
    """Cost of each u→v step: its length × (1 + weight · excess / band).

    `excess` is how far the road runs from the shape outline beyond
    `band_m`, measured at its two ends and its middle point. Roads inside
    the band cost their length, so zig-zagging to stay closer gains nothing;
    roads outside cost more the farther they are, so the route follows the
    contour instead of cutting through the shape.
    """
    edges = list(graph.edges(data=True))
    costs: dict[tuple[Any, Any], float] = {}
    if weight > 0:
        samples = []
        for u, v, data in edges:
            coords = _edge_coords(graph, u, v, data)
            samples.extend((coords[0], coords[len(coords) // 2], coords[-1]))
        xy = np.array([latlon_to_local(origin, p) for p in samples])
        distance = distance_to_polyline(outline, xy).reshape(-1, 3).mean(axis=1)
        excess = np.maximum(0.0, distance - band_m) / max(band_m, 1.0)
        factors = 1.0 + weight * excess
    else:
        factors = np.ones(len(edges))
    for (u, v, data), factor in zip(edges, factors, strict=True):
        cost = float(data["length"]) * float(factor)
        costs[(u, v)] = min(cost, costs.get((u, v), math.inf))
    return costs


_SINK = ("zone-sink",)


def _route_through_zones(
    graph: Graph,
    origin: LatLon,
    first: Any,
    anchors: Sequence[LatLon],
    radius_m: float,
    costs: dict[tuple[Any, Any], float],
    reuse_penalty: float,
) -> tuple[list[Any], list[Any], list[int]]:
    """Closed route from `first` through a zone around each anchor, back to `first`.

    A zone is every node within `radius_m` of its anchor, or the nearest
    one if none is that close. Reaching a zone node costs, on top of the
    road, its distance from the anchor: the route takes the node that is
    cheap to reach instead of the single nearest one, which may lie across
    a river or a railway. Used roads cost `reuse_penalty` times more.

    Each leg adds a temporary sink node to `graph`, linked from the zone,
    and removes it afterwards. Returns the route nodes, the node reached in
    each zone and the indices of the anchors that could not be reached.
    """
    node_ids = list(graph.nodes)
    xy = np.array([latlon_to_local(origin, _node_latlon(graph, n)) for n in node_ids])
    used: set[frozenset[Any]] = set()

    def weight(u: Any, v: Any, edges: dict[Any, dict[str, Any]]) -> float:
        cost = costs[(u, v)]
        return cost * reuse_penalty if _edge_key(u, v) in used else cost

    def walk(path: list[Any]) -> None:
        for u, v in zip(path, path[1:], strict=False):
            used.add(_edge_key(u, v))
        route_nodes.extend(path[1:])

    route_nodes = [first]
    reached = [first]
    skipped: list[int] = []
    for index, anchor in enumerate(anchors, start=1):
        ax, ay = latlon_to_local(origin, anchor)
        d = np.hypot(xy[:, 0] - ax, xy[:, 1] - ay)
        zone = np.flatnonzero(d <= radius_m)
        if len(zone) == 0:
            zone = np.array([int(np.argmin(d))])
        graph.add_node(_SINK)
        try:
            for i in zone:
                graph.add_edge(node_ids[i], _SINK)
                costs[(node_ids[i], _SINK)] = float(d[i])
            path = nx.shortest_path(graph, route_nodes[-1], _SINK, weight=weight)
        except nx.NetworkXNoPath:
            skipped.append(index)
            continue
        finally:
            graph.remove_node(_SINK)
            for i in zone:
                costs.pop((node_ids[i], _SINK), None)
        walk(path[:-1])
        if path[-2] != reached[-1]:
            reached.append(path[-2])
    try:
        walk(nx.shortest_path(graph, route_nodes[-1], first, weight=weight))
    except nx.NetworkXNoPath:
        skipped.append(0)
    return route_nodes, reached, skipped


def snap_to_network(
    graph: Graph,
    shape_points: Sequence[LatLon],
    reuse_penalty: float = EDGE_REUSE_PENALTY,
    sparse_threshold_m: float = SPARSE_THRESHOLD_M,
    *,
    zone_radius: float = ZONE_RADIUS,
    corridor: float = CORRIDOR_WEIGHT,
    band: float = CORRIDOR_BAND,
) -> NetworkRoute:
    """Turn a projected shape into a closed route on the road network.

    `shape_points[0]` is the user's start: the route begins and ends at the
    node nearest to it. Every other point is reached through a zone of
    nodes around it, and roads far from the outline cost more
    (docs/ROUTE_ENGINE.md §4). `zone_radius` and `band` are fractions of
    the shape perimeter, so they scale with the requested distance.
    """
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
    outline = np.array([latlon_to_local(origin, p) for p in shape_points])
    if not np.allclose(outline[0], outline[-1]):
        outline = np.vstack([outline, outline[:1]])
    perimeter = float(np.hypot(*np.diff(outline, axis=0).T).sum())
    anchors = list(shape_points[1:])
    if anchors and anchors[-1] == shape_points[0]:
        anchors.pop()

    costs = _corridor_costs(graph, origin, outline, corridor, band * perimeter)
    route_nodes, reached, skipped = _route_through_zones(
        graph,
        origin,
        nodes[0],
        anchors,
        zone_radius * perimeter,
        costs,
        reuse_penalty,
    )
    for index in skipped:
        warnings.append(f"no road path to shape point {index}; skipped")

    pruned = prune_spurs(route_nodes)
    if len(set(pruned)) >= 3:  # keep it only if a loop survives
        route_nodes = pruned
    points: list[LatLon] = [_node_latlon(graph, route_nodes[0])]
    for u, v in zip(route_nodes, route_nodes[1:], strict=False):
        points.extend(_edge_points(graph, u, v))
    return NetworkRoute(
        points=points,
        distance_m=path_length_m(points),
        warnings=warnings,
        waypoints=reached,
    )
