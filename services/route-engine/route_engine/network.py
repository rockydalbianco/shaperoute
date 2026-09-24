"""Road network access, snapping and routing (docs/ROUTE_ENGINE.md §4, ADR-0020).

The only module that talks to OSMnx. Graphs follow the OSMnx convention:
nodes carry `y` (lat) and `x` (lon), edges carry `length` in metres and,
when the road is not straight, a `geometry` LineString in (lon, lat).
"""

from __future__ import annotations

import math
import pickle
import weakref
from collections.abc import Collection, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

import networkx as nx
import numpy as np

from route_engine.geo import (
    LatLon,
    latlon_to_local,
    latlon_to_local_array,
    local_to_latlon,
    path_length_m,
)

# Where a route drawn out and back turns (first_leg): a metre from the far
# end of the shape weighs as much as ten from half-way along the route. The
# way back may take other roads than the way out, and be some hundred metres
# longer or shorter; an earlier pass near the far end is kilometres before
# half-way (TASK-041).
HALF_WAY_WEIGHT = 0.1

# Starting values, to be tuned on samples (docs/MAPS.md).
AREA_MARGIN_M = 500.0
EDGE_REUSE_PENALTY = 2.0
SPARSE_THRESHOLD_M = 150.0
# Fractions of the shape perimeter, tuned in TASK-017 (docs/MAPS.md).
ZONE_RADIUS = 0.02
CORRIDOR_BAND = 0.02
CORRIDOR_WEIGHT = 2.0
# A vertex where the outline turns more than this is a corner of the shape,
# like the heart's tip and dip (TASK-015); the circle has none.
CORNER_TURN_DEG = 60.0
# Out-and-back on parallel roads (TASK-016, ADR-0026): a return within
# SPUR_NEAR_M after at least SPUR_MIN_M, over at most SPUR_MAX_SHARE of the
# route, on a stretch that runs beside itself for SPUR_THIN_SHARE of it.
SPUR_NEAR_M = 20.0
SPUR_MIN_M = 60.0
SPUR_MAX_SHARE = 0.15
SPUR_THIN_SHARE = 0.7
# Distances from the outline are exact up to this far beyond its band.
CORRIDOR_EXACT_M = 1000.0
# A side of a shape this close to another side is drawn twice on purpose: a
# stroke, out and back (TASK-037). Other sides are never this close.
TWICE_NEAR_M = 1.0
# A shape with strokes has details about as wide as ZONE_RADIUS and
# CORRIDOR_BAND of its perimeter: for it these fractions, and the tolerance
# of the similarity, shrink by this much, so the search sees the details
# (TASK-037, ADR-0039).
STROKE_DETAIL = 0.5

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
            return read_graph(path)
        covering = self.covering_path(bbox)
        if covering is not None:
            graph = crop(read_graph(covering), bbox)
            _write_graph(graph, path)
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
        _write_graph(graph, path)
        return graph


def read_graph(path: Path) -> Graph:
    """A cached graph: from its pickle when there is one, else from GraphML.

    GraphML is the cache of record (readable, what OSMnx writes); the pickle
    beside it only saves time, since parsing a zone's GraphML takes up to a
    minute. Both are written by this module into the ignored cache folder.
    """
    import osmnx as ox

    fast = path.with_suffix(".pickle")
    if fast.exists() and fast.stat().st_mtime >= path.stat().st_mtime:
        with fast.open("rb") as file:
            graph: Graph = pickle.load(file)
        return graph
    graph = ox.load_graphml(path)
    with fast.open("wb") as file:
        pickle.dump(graph, file, protocol=pickle.HIGHEST_PROTOCOL)
    return graph


def _write_graph(graph: Graph, path: Path) -> None:
    import osmnx as ox

    ox.save_graphml(graph, path)
    with path.with_suffix(".pickle").open("wb") as file:
        pickle.dump(graph, file, protocol=pickle.HIGHEST_PROTOCOL)


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
    nodes: list[Any] = field(default_factory=list)  # graph nodes, in order


def nearest_nodes(
    graph: Graph, points: Sequence[LatLon]
) -> tuple[list[Any], list[float]]:
    """Nearest graph node for each point, and its distance in metres."""
    origin = points[0]
    node_ids = list(graph.nodes)
    local = latlon_to_local_array(
        origin, np.array([(graph.nodes[n]["y"], graph.nodes[n]["x"]) for n in node_ids])
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


def prune_spurs(
    route_nodes: Sequence[Any], keep: Collection[Any] = frozenset()
) -> list[Any]:
    """Remove out-and-back detours: every A → B → A becomes A, repeatedly,
    unless B is in `keep`.

    Reaching a waypoint down a side street and coming back draws a spike
    that is not part of the shape; dropping it keeps the outer contour. A
    spike out to a corner of the shape, such as the heart's tip, is what
    draws the corner: those nodes go in `keep`.
    """
    result: list[Any] = []
    for node in route_nodes:
        if len(result) >= 2 and result[-2] == node and result[-1] not in keep:
            result.pop()
        else:
            result.append(node)
    return result


def prune_parallel_spurs(
    graph: Graph,
    route_nodes: Sequence[Any],
    keep: Collection[Any] = frozenset(),
    near_m: float = SPUR_NEAR_M,
    min_m: float = SPUR_MIN_M,
    max_share: float = SPUR_MAX_SHARE,
) -> list[Any]:
    """Remove out-and-back detours that return on a parallel road.

    `prune_spurs` catches A → B → A; going out on one side of a street and
    back on the other (or on a footway beside it) uses different nodes and
    still draws a spike. A stretch from node i to a later node j is such a
    spike when j is within `near_m` of i after at least `min_m` along the
    route (at most `max_share` of it), most of the stretch runs within
    `near_m` of itself, no node of it is in `keep` (corners of the shape),
    and a road joins i and j in at most 3 × `near_m`: then that road
    replaces the stretch.
    """
    nodes = list(route_nodes)
    if len(nodes) < 4:
        return nodes
    origin = _node_latlon(graph, nodes[0])
    xy = latlon_to_local_array(
        origin, np.array([_node_latlon(graph, n) for n in nodes])
    )
    steps = [0.0] + [
        min(float(d["length"]) for d in graph[u][v].values())
        for u, v in zip(nodes, nodes[1:], strict=False)
    ]
    along = np.cumsum(steps)
    total = float(along[-1])
    result: list[Any] = []
    i = 0
    while i < len(nodes):
        result.append(nodes[i])
        gap = np.hypot(xy[:, 0] - xy[i, 0], xy[:, 1] - xy[i, 1])
        spans = along - along[i]
        candidates = np.flatnonzero(
            (np.arange(len(nodes)) > i)
            & (gap <= near_m)
            & (spans >= min_m)
            & (spans <= max_share * total)
        )
        for j in candidates[::-1]:
            inner = nodes[i + 1 : j]
            if any(n in keep for n in inner):
                continue
            if not _thin(xy[i : j + 1], along[i : j + 1], near_m):
                continue
            if nodes[j] == nodes[i]:  # a thin loop back to the same node
                i = int(j) + 1
                break
            try:
                link = nx.shortest_path(graph, nodes[i], nodes[j], weight="length")
            except nx.NetworkXNoPath:
                continue
            link_m = sum(
                min(float(d["length"]) for d in graph[u][v].values())
                for u, v in zip(link, link[1:], strict=False)
            )
            if link_m > 3 * near_m:
                continue
            result.extend(link[1:-1])
            i = int(j)
            break
        else:
            i += 1
    return result


def _thin(xy: np.ndarray, along: np.ndarray, near_m: float) -> bool:
    """Whether most of a stretch (by length) runs within `near_m` of another
    part of itself at least 2 × `near_m` away along it: a spike."""
    if len(xy) < 3:
        return False
    d = np.hypot(xy[:, None, 0] - xy[None, :, 0], xy[:, None, 1] - xy[None, :, 1])
    apart = np.abs(along[:, None] - along[None, :]) >= 2 * near_m
    d[~apart] = np.inf
    close = d.min(axis=1) <= 1.5 * near_m
    weights = np.diff(along, prepend=along[0]) + np.diff(along, append=along[-1])
    return bool(weights[close].sum() >= SPUR_THIN_SHARE * weights.sum())


def corner_indices(xy: np.ndarray) -> list[int]:
    """Indices of the vertices of a closed polyline (no repeated closing
    point) where the outline turns by more than CORNER_TURN_DEG."""
    before = xy - np.roll(xy, 1, axis=0)
    after = np.roll(xy, -1, axis=0) - xy
    cross = before[:, 0] * after[:, 1] - before[:, 1] * after[:, 0]
    dot = (before * after).sum(axis=1)
    turn = np.degrees(np.abs(np.arctan2(cross, dot)))
    return [int(i) for i in np.flatnonzero(turn > CORNER_TURN_DEG)]


def distance_to_polyline(polyline: np.ndarray, points: np.ndarray) -> np.ndarray:
    """Distance in metres from each (x, y) point to the nearest polyline segment."""
    return distance_to_segments(polyline[:-1], polyline[1:], points)


def distance_to_segments(
    a: np.ndarray, b: np.ndarray, points: np.ndarray
) -> np.ndarray:
    """Distance in metres from each (x, y) point to the nearest segment a-b."""
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


def twice_drawn(xy: np.ndarray, near_m: float = TWICE_NEAR_M) -> np.ndarray:
    """For each side of a closed polyline (last point repeating the first),
    whether its middle lies on a side going the other way: the shape draws
    it twice, like a stroke out and back (TASK-037). A side cut in two where
    the route starts goes on the same way, and does not count."""
    a, b = xy[:-1], xy[1:]
    ab = b - a
    middles = (a + b) / 2
    twice = np.zeros(len(a), bool)
    for i, middle in enumerate(middles):
        back = (ab @ ab[i]) < 0
        if back.any():
            d = distance_to_segments(a[back], b[back], middle[None])
            twice[i] = bool(d[0] <= near_m)
    return twice


def detail_scale(xy: np.ndarray, near_m: float = TWICE_NEAR_M) -> float:
    """STROKE_DETAIL for a shape with strokes (a side drawn twice), 1 for a
    plain outline: what the tolerances of a shape are multiplied by."""
    return STROKE_DETAIL if twice_drawn(xy, near_m).any() else 1.0


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
    edges = list(graph.edges(data="length"))
    costs: dict[tuple[Any, Any], float] = {}
    if weight > 0:
        xy = latlon_to_local_array(origin, _edge_samples(graph))
        distance = _distance_to_outline(outline, xy, CORRIDOR_EXACT_M + band_m)
        distance = distance.reshape(-1, 3).mean(axis=1)
        excess = np.maximum(0.0, distance - band_m) / max(band_m, 1.0)
        factors = 1.0 + weight * excess
    else:
        factors = np.ones(len(edges))
    for (u, v, length), factor in zip(edges, factors, strict=True):
        cost = float(length) * float(factor)
        costs[(u, v)] = min(cost, costs.get((u, v), math.inf))
    return costs


# Edge samples per graph, kept while its edges stay the same (zone graphs
# are traced up to 20 times). A weak mapping, so nothing outlives the graph
# or ends up in a GraphML file.
_samples_cache: weakref.WeakKeyDictionary[Graph, tuple[int, np.ndarray]] = (
    weakref.WeakKeyDictionary()
)


def _edge_samples(graph: Graph) -> np.ndarray:
    """(lat, lon) of both ends and the middle point of every edge, three rows
    per edge in `graph.edges()` order."""
    cached = _samples_cache.get(graph)
    if cached is not None and cached[0] == graph.number_of_edges():
        return cached[1]
    samples = []
    for u, v, data in graph.edges(data=True):
        coords = _edge_coords(graph, u, v, data)
        samples.extend((coords[0], coords[len(coords) // 2], coords[-1]))
    array = np.array(samples).reshape(-1, 2)
    _samples_cache[graph] = (graph.number_of_edges(), array)
    return array


def _distance_to_outline(
    outline: np.ndarray, points: np.ndarray, exact_within_m: float
) -> np.ndarray:
    """Distance of each point from the outline, exact within `exact_within_m`
    of its bounding box; farther out, the distance from the box (a lower
    bound, already beyond any road the corridor lets the route use)."""
    low, high = outline.min(axis=0), outline.max(axis=0)
    gap = np.maximum(0.0, np.maximum(low - points, points - high))
    to_box = np.hypot(gap[:, 0], gap[:, 1])
    result = to_box.copy()
    near = to_box <= exact_within_m
    result[near] = distance_to_polyline(outline, points[near])
    return result


_SINK = ("zone-sink",)


def _route_through_zones(
    graph: Graph,
    origin: LatLon,
    first: Any,
    anchors: Sequence[LatLon],
    radius_m: float,
    costs: dict[tuple[Any, Any], float],
    reuse_penalty: float,
    corners: Collection[int] = frozenset(),
    twice: Collection[int] = frozenset(),
) -> tuple[list[Any], list[Any], list[int], set[Any]]:
    """Closed route from `first` through a zone around each anchor, back to `first`.

    A zone is every node within `radius_m` of its anchor, or the nearest
    one if none is that close. Reaching a zone node costs, on top of the
    road, its distance from the anchor: the route takes the node that is
    cheap to reach instead of the single nearest one, which may lie across
    a river or a railway. Used roads cost `reuse_penalty` times more, except
    on the way to the anchors in `twice` (1-based, 0 for the way home),
    which the shape draws twice on purpose.

    Each leg adds a temporary sink node to `graph`, linked from the zone,
    and removes it afterwards. Returns the route nodes, the node reached in
    each zone, the indices of the anchors that could not be reached, and the
    nodes reached for the anchors listed in `corners` (1-based, like the
    indices of the unreached ones).
    """
    node_ids = list(graph.nodes)
    xy = latlon_to_local_array(
        origin, np.array([_node_latlon(graph, n) for n in node_ids])
    )
    used: set[frozenset[Any]] = set()
    penalty = reuse_penalty

    def weight(u: Any, v: Any, edges: dict[Any, dict[str, Any]]) -> float:
        cost = costs[(u, v)]
        return cost * penalty if _edge_key(u, v) in used else cost

    def walk(path: list[Any]) -> None:
        for u, v in zip(path, path[1:], strict=False):
            used.add(_edge_key(u, v))
        route_nodes.extend(path[1:])

    route_nodes = [first]
    reached = [first]
    skipped: list[int] = []
    corner_nodes: set[Any] = set()
    for index, anchor in enumerate(anchors, start=1):
        penalty = 1.0 if index in twice else reuse_penalty
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
        if index in corners:
            corner_nodes.add(path[-2])
        if path[-2] != reached[-1]:
            reached.append(path[-2])
    penalty = 1.0 if 0 in twice else reuse_penalty
    try:
        walk(nx.shortest_path(graph, route_nodes[-1], first, weight=weight))
    except nx.NetworkXNoPath:
        skipped.append(0)
    return route_nodes, reached, skipped, corner_nodes


def first_leg(graph: Graph, route: NetworkRoute, turn: LatLon) -> NetworkRoute:
    """The way out of a route drawn out and back (TASK-041): from its start
    to the node nearest to `turn`, the far end of the shape.

    The route may pass near `turn` on its way there too, like a word that
    ends where one of its letters begins; so the node chosen is the one
    nearest to `turn` plus, weighed HALF_WAY_WEIGHT, nearest to half-way
    along the route, both in metres.
    """
    nodes = route.nodes
    xy = latlon_to_local_array(
        turn, np.array([_node_latlon(graph, node) for node in nodes])
    )
    along = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(xy, axis=0).T))])
    cost = np.hypot(xy[:, 0], xy[:, 1]) + HALF_WAY_WEIGHT * np.abs(
        along - along[-1] / 2
    )
    kept = nodes[: max(1, int(np.argmin(cost))) + 1]
    points: list[LatLon] = [_node_latlon(graph, kept[0])]
    for u, v in zip(kept, kept[1:], strict=False):
        points.extend(_edge_points(graph, u, v))
    reached = set(kept)
    return NetworkRoute(
        points=points,
        distance_m=path_length_m(points),
        warnings=list(route.warnings),
        waypoints=[node for node in route.waypoints if node in reached],
        nodes=kept,
    )


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
    outline = latlon_to_local_array(origin, np.array(shape_points))
    if not np.allclose(outline[0], outline[-1]):
        outline = np.vstack([outline, outline[:1]])
    drawn_twice = twice_drawn(outline)
    # Strokes have small details: finer zones and corridor (ADR-0039).
    fine = STROKE_DETAIL if drawn_twice.any() else 1.0
    perimeter = fine * float(np.hypot(*np.diff(outline, axis=0).T).sum())
    anchors = list(shape_points[1:])
    if anchors and anchors[-1] == shape_points[0]:
        anchors.pop()

    costs = _corridor_costs(graph, origin, outline, corridor, band * perimeter)
    corners = set(corner_indices(outline[:-1]))
    # Side i - 1 of the outline leads to anchor i; the last one leads home.
    sides = len(outline) - 1
    twice = {(i + 1) % sides for i in np.flatnonzero(drawn_twice)}
    route_nodes, reached, skipped, corner_nodes = _route_through_zones(
        graph,
        origin,
        nodes[0],
        anchors,
        zone_radius * perimeter,
        costs,
        reuse_penalty,
        corners,
        twice,
    )
    for index in skipped:
        warnings.append(f"no road path to shape point {index}; skipped")

    if 0 in corners:
        corner_nodes.add(route_nodes[0])
    pruned = list(route_nodes)
    while True:  # removing one kind of spur can expose the other
        before = pruned
        pruned = prune_spurs(pruned, keep=corner_nodes)
        pruned = prune_parallel_spurs(graph, pruned, keep=corner_nodes)
        if pruned == before:
            break
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
        nodes=route_nodes,
    )
