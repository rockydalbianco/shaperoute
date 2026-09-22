"""Search for the route that best matches shape and target distance.

docs/ROUTE_ENGINE.md §5: rotate the shape around the start, move the start
along the shape and rescale it until the roads follow the outline and the
distance on roads is close to the target.

1. For every rotation and phase, count how much of the outline has a road
   nearby (`RoadMask`): no routing, so trying 96 placements is cheap.
2. Trace the best few with `snap_to_network`.
3. Rescale by target / real distance and trace again.
4. Refine the rotation around the best placement.
5. Stop when distance and similarity are good enough, or when the budget of
   traces runs out, and return the best route found.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any, Protocol

import numpy as np

from route_engine.geo import LatLon, latlon_to_local_array
from route_engine.metrics import SIMILARITIES, Similarity
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import (
    AREA_MARGIN_M,
    CORRIDOR_BAND,
    EDGE_REUSE_PENALTY,
    BBox,
    Graph,
    NetworkRoute,
    area_around,
    crop,
    snap_to_network,
)
from route_engine.projection import (
    Point,
    initial_scale,
    perimeter,
    project_shape,
    start_at_phase,
)
from route_engine.shapes import get_shape

# Where the start enters the shape, as arc-length fractions (TASK-015).
PHASES = (0.0, 0.25, 0.5, 0.75)
ROTATION_STEP_DEG = 15.0
# Scale bounds, as multiples of the initial scale.
SCALE_RANGE = (0.4, 1.1)
# Placements traced after the road count, and rescales for each of them.
TOP_PLACEMENTS = 3
MAX_RESCALES = 4
# Rotation refinement around the best placement.
REFINE_SPAN_DEG = 15.0
REFINE_STEP_DEG = 5.0
MAX_TRACES = 20
# Stop when both hold (ROUTE_ENGINE.md §5, TASK-015).
DISTANCE_TOLERANCE = 0.10
SIMILARITY_THRESHOLD = 0.80
SIMILARITY = "coverage"
# cost = W_SHAPE · (1 − similarity) + W_DISTANCE · |real − target| / target
W_SHAPE = 2.0
W_DISTANCE = 1.0


def reach(shape: Sequence[Point], phases: Sequence[float] = PHASES) -> float:
    """Farthest a normalized shape gets from its start, over `phases`."""
    farthest = 0.0
    for phase in phases:
        points = start_at_phase(shape, phase)
        farthest = max(farthest, max(math.dist(p, points[0]) for p in points))
    return farthest


def zone_area(shape: Sequence[Point], start: LatLon, distance_m: float) -> BBox:
    """Square around `start` holding the shape at any rotation, phase and scale.

    One graph of this area serves every attempt of the search (ADR-0023).
    """
    largest_scale = initial_scale(shape, distance_m) * SCALE_RANGE[1]
    return area_around([start], margin_m=reach(shape) * largest_scale + AREA_MARGIN_M)


def _perimeter_m(xy: np.ndarray) -> float:
    return float(np.hypot(*np.diff(xy, axis=0).T).sum())


class RoadMask:
    """Which places lie within a band of some road, on a grid around `origin`.

    The roads are sampled once; each band width gets its own grid of cells
    half a band wide, marked when a road sample falls within the band.
    """

    def __init__(self, graph: Graph, origin: LatLon, step_m: float = 10.0) -> None:
        self.origin = origin
        coords: list[tuple[float, float]] = []
        segments: list[tuple[int, int]] = []
        seen: set[frozenset[Any]] = set()
        for u, v, data in graph.edges(data=True):
            if frozenset((u, v)) in seen:
                continue
            seen.add(frozenset((u, v)))
            geometry = data.get("geometry")
            if geometry is None:
                line = [
                    (graph.nodes[u]["y"], graph.nodes[u]["x"]),
                    (graph.nodes[v]["y"], graph.nodes[v]["x"]),
                ]
            else:
                line = [(lat, lon) for lon, lat in geometry.coords]
            segments.extend(
                (len(coords) + i, len(coords) + i + 1) for i in range(len(line) - 1)
            )
            coords.extend(line)
        xy = latlon_to_local_array(origin, np.array(coords))
        idx = np.array(segments)
        a, b = xy[idx[:, 0]], xy[idx[:, 1]]
        counts = np.maximum(1, np.ceil(np.hypot(*(b - a).T) / step_m).astype(int))
        seg = np.repeat(np.arange(len(a)), counts)
        t = (
            np.arange(counts.sum()) - np.repeat(np.cumsum(counts) - counts, counts)
        ) / np.repeat(counts, counts)
        self.samples = np.vstack([a[seg] + (b - a)[seg] * t[:, None], b])
        self._grids: dict[float, set[tuple[int, int]]] = {}

    def _grid(self, band_m: float) -> set[tuple[int, int]]:
        if band_m not in self._grids:
            cell = band_m / 2
            cells = np.unique(np.floor(self.samples / cell).astype(int), axis=0)
            near: set[tuple[int, int]] = set()
            reach_cells = 2  # a band is two cells
            offsets = [
                (dx, dy)
                for dx in range(-reach_cells, reach_cells + 1)
                for dy in range(-reach_cells, reach_cells + 1)
                if dx * dx + dy * dy <= reach_cells * reach_cells
            ]
            for cx, cy in map(tuple, cells):
                near.update((cx + dx, cy + dy) for dx, dy in offsets)
            self._grids[band_m] = near
        return self._grids[band_m]

    def fit(self, outline: Sequence[LatLon], band_m: float) -> float:
        """Share of the closed `outline` that has a road within about `band_m`."""
        xy = latlon_to_local_array(self.origin, np.array(outline))
        n = max(8, math.ceil(_perimeter_m(xy) / (band_m / 2)))
        cumulative = np.concatenate(
            [[0.0], np.cumsum(np.hypot(*np.diff(xy, axis=0).T))]
        )
        s = np.linspace(0.0, cumulative[-1], n, endpoint=False)
        pts = np.column_stack(
            [np.interp(s, cumulative, xy[:, 0]), np.interp(s, cumulative, xy[:, 1])]
        )
        near = self._grid(band_m)
        cells = np.floor(pts / (band_m / 2)).astype(int)
        return sum((cx, cy) in near for cx, cy in map(tuple, cells)) / n


@dataclass
class Attempt:
    rotation_deg: float
    phase: float
    scale_m: float
    shape: list[LatLon]
    route: NetworkRoute
    similarity: float
    ratio: float  # distance on roads / target
    cost: float


@dataclass
class Search:
    best: Attempt
    attempts: list[Attempt]
    converged: bool
    warnings: list[str] = field(default_factory=list)


Tracer = Callable[[list[LatLon]], NetworkRoute]


def _tracer(graph: Graph, reuse_penalty: float) -> Tracer:
    """Trace on the crop around each candidate, as a download of it would give."""

    def trace(projected: list[LatLon]) -> NetworkRoute:
        return snap_to_network(
            crop(graph, area_around(projected)), projected, reuse_penalty
        )

    return trace


def search(
    graph: Graph,
    shape: Sequence[Point],
    start: LatLon,
    distance_m: float,
    *,
    max_traces: int = MAX_TRACES,
    similarity: Similarity | None = None,
    trace: Tracer | None = None,
    reuse_penalty: float = EDGE_REUSE_PENALTY,
) -> Search:
    """Best route for `shape` from `start` near `distance_m` on `graph`."""
    similarity = similarity or SIMILARITIES[SIMILARITY]
    trace = trace or _tracer(graph, reuse_penalty)
    mask = RoadMask(graph, start)
    base_scale = initial_scale(shape, distance_m)
    low, high = (base_scale * f for f in SCALE_RANGE)
    attempts: list[Attempt] = []

    def placed(rotation: float, phase: float, scale: float) -> list[LatLon]:
        return project_shape(shape, start, scale, rotation, phase)

    def road_fit(rotation: float, phase: float, scale: float) -> float:
        # The band follows the scale alone, so every placement at one scale
        # shares the same grid.
        band = round(CORRIDOR_BAND * perimeter(shape) * scale, 3)
        return mask.fit(placed(rotation, phase, scale), band)

    def attempt(rotation: float, phase: float, scale: float) -> Attempt:
        outline = placed(rotation, phase, scale)
        route = trace(outline)
        sim = similarity(route.points, outline)
        ratio = route.distance_m / distance_m
        cost = W_SHAPE * (1 - sim) + W_DISTANCE * abs(ratio - 1)
        result = Attempt(rotation, phase, scale, outline, route, sim, ratio, cost)
        attempts.append(result)
        return result

    def good(a: Attempt) -> bool:
        return (
            abs(a.ratio - 1) <= DISTANCE_TOLERANCE
            and a.similarity >= SIMILARITY_THRESHOLD
        )

    def next_scale(history: list[Attempt]) -> float:
        """Scale expected to hit the target distance, within the bounds.

        After two traces of one placement, the secant through them; the
        distance is not proportional to the scale (a smaller shape fits
        differently on the roads), so a plain proportion overshoots.
        """
        last = history[-1]
        guess = last.scale_m / last.ratio
        if len(history) >= 2:
            prev = history[-2]
            d0, d1 = prev.route.distance_m, last.route.distance_m
            if not math.isclose(d0, d1):
                slope = (last.scale_m - prev.scale_m) / (d1 - d0)
                secant = last.scale_m + (distance_m - d1) * slope
                if secant > 0:
                    guess = secant
        return min(high, max(low, guess))

    def rescale(
        rotation: float, phase: float, scale: float
    ) -> tuple[Attempt | None, float]:
        """Trace, rescale towards the target, repeat; returns the next scale."""
        history: list[Attempt] = []
        for _ in range(MAX_RESCALES):
            if len(attempts) >= max_traces:
                break
            history.append(attempt(rotation, phase, scale))
            if abs(history[-1].ratio - 1) <= DISTANCE_TOLERANCE:
                break
            new_scale = next_scale(history)
            if math.isclose(new_scale, scale):
                break  # at a bound
            scale = new_scale
        return (history[-1] if history else None), scale

    def best_placement(
        scale: float, tried: list[tuple[float, float]]
    ) -> tuple[float, float] | None:
        """Placement with most roads along the outline at `scale`, away from
        the tried ones (same phase and within two rotation steps)."""
        ranked = sorted(
            (
                (road_fit(float(r), p, scale), float(r), p)
                for r in np.arange(0.0, 360.0, ROTATION_STEP_DEG)
                for p in PHASES
            ),
            key=lambda item: (-item[0], item[1], item[2]),
        )
        for _, rotation, phase in ranked:
            near = any(
                p == phase and _angle_gap(r, rotation) < 2 * ROTATION_STEP_DEG
                for r, p in tried
            )
            if not near:
                return rotation, phase
        return None

    scale = base_scale
    tried: list[tuple[float, float]] = []
    for _ in range(TOP_PLACEMENTS):
        placement = best_placement(scale, tried)
        if placement is None or len(attempts) >= max_traces:
            break
        tried.append(placement)
        last, scale = rescale(*placement, scale)
        if last is not None and good(last):
            return _done(attempts, True)

    best = min(attempts, key=lambda a: a.cost)
    offsets = np.arange(-REFINE_SPAN_DEG, REFINE_SPAN_DEG + 1e-9, REFINE_STEP_DEG)
    tried = {(a.rotation_deg % 360, a.phase) for a in attempts}
    refined = sorted(
        (
            (
                road_fit((best.rotation_deg + o) % 360, best.phase, best.scale_m),
                (best.rotation_deg + o) % 360,
            )
            for o in offsets
            if ((best.rotation_deg + o) % 360, best.phase) not in tried
        ),
        key=lambda item: (-item[0], item[1]),
    )
    if refined and len(attempts) < max_traces:
        last, _ = rescale(refined[0][1], best.phase, best.scale_m)
        if last is not None and good(last):
            return _done(attempts, True)
    return _done(attempts, False)


def _angle_gap(a: float, b: float) -> float:
    return abs((a - b + 180.0) % 360.0 - 180.0)


def _done(attempts: list[Attempt], converged: bool) -> Search:
    best = min(attempts, key=lambda a: a.cost)
    warnings = list(best.route.warnings)
    if not converged:
        if abs(best.ratio - 1) > DISTANCE_TOLERANCE:
            warnings.append(
                f"distance on roads is {best.ratio - 1:+.0%} from the target "
                f"after {len(attempts)} attempts"
            )
        if best.similarity < SIMILARITY_THRESHOLD:
            warnings.append(
                f"shape similarity {best.similarity:.2f} is below "
                f"{SIMILARITY_THRESHOLD:.2f} after {len(attempts)} attempts"
            )
    return Search(best, attempts, converged, warnings)


# Vertices of the normalized shape (docs/ROUTE_ENGINE.md §2), to be tuned.
SHAPE_POINTS = 64


class GraphLoader(Protocol):
    def load(self, bbox: BBox) -> Graph: ...


def required_area(
    shape: Sequence[Point], start: LatLon, distance_m: float, optimize: bool = True
) -> BBox:
    """Area whose graph a request needs: the zone, or just the initial shape."""
    if optimize:
        return zone_area(shape, start, distance_m)
    return area_around(project_shape(shape, start, initial_scale(shape, distance_m)))


@dataclass
class Plan:
    result: RouteResult
    search: Search | None  # None when the shape was not optimized


def plan_route(
    request: RouteRequest,
    source: GraphLoader,
    optimize: bool = True,
    reuse_penalty: float = EDGE_REUSE_PENALTY,
) -> Plan:
    """RouteRequest in, RouteResult out (docs/ARCHITECTURE.md §3).

    With `optimize` the shape is rotated, moved and rescaled to fit the
    roads (`search`); without, it is traced once at its initial placement,
    as in TASK-017.
    """
    shape = get_shape(request.shape)(SHAPE_POINTS)
    similarity = SIMILARITIES[SIMILARITY]
    graph = source.load(
        required_area(shape, request.start, request.distance_m, optimize)
    )
    if optimize:
        found = search(
            graph,
            shape,
            request.start,
            request.distance_m,
            reuse_penalty=reuse_penalty,
        )
        route, sim, warnings = found.best.route, found.best.similarity, found.warnings
    else:
        found = None
        projected = project_shape(
            shape, request.start, initial_scale(shape, request.distance_m)
        )
        route = snap_to_network(graph, projected, reuse_penalty)
        sim, warnings = similarity(route.points, projected), route.warnings
    result = RouteResult(
        points=route.points,
        distance_m=route.distance_m,
        similarity=sim,
        shape=request.shape,
        warnings=list(warnings),
    )
    return Plan(result, found)
