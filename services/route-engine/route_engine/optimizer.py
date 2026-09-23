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

from route_engine.geo import LatLon, latlon_to_local_array, local_to_latlon
from route_engine.metrics import CORNER_PENALTY, SIMILARITIES, Similarity
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import (
    AREA_MARGIN_M,
    CORRIDOR_BAND,
    EDGE_REUSE_PENALTY,
    BBox,
    Graph,
    NetworkRoute,
    area_around,
    corner_indices,
    nearest_nodes,
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
from route_engine.validation import check_closed, measure, validate

# Where the start enters the shape, as arc-length fractions (TASK-015).
PHASES = (0.0, 0.25, 0.5, 0.75)
ROTATION_STEP_DEG = 15.0
# Scale bounds, as multiples of the initial scale.
SCALE_RANGE = (0.4, 1.1)
# The shape may start this far from the requested point, on rings of these
# radii in as many directions, when that lets it close on the roads
# (TASK-015, ADR-0025).
START_OFFSET_M = 500.0
START_RINGS_M = (250.0, 500.0)
START_BEARINGS = 8
# Placements traced after the road count (while the budget lasts), rescales
# of the first one, and traces kept for refining the best one.
TOP_PLACEMENTS = 12
MAX_RESCALES = 4
RESERVED_TRACES = 4
SCREEN_ONCE = True  # TEMPORARY: comparison switch
# Rotation refinement around the best placement.
REFINE_SPAN_DEG = 15.0
REFINE_STEP_DEG = 5.0
MAX_TRACES = 20
# Stop when both hold (ROUTE_ENGINE.md §5). Metric and threshold come from
# the eye judgement of the first results (TASK-015, docs/MAPS.md): the
# routes judged good covered 90% of the outline or more, the others less.
DISTANCE_TOLERANCE = 0.10
# When no placement gets both right, the route may miss the target distance
# by up to this much to keep the shape; beyond it, no route (ADR-0025).
DISTANCE_FALLBACK_M = 2000.0
SIMILARITY_THRESHOLD = 0.90
SIMILARITY = "shape"
# cost = W_SHAPE · (1 − similarity) + W_DISTANCE · |real − target| / target;
# the shape matters most.
W_SHAPE = 3.0
W_DISTANCE = 1.0
# Moving the start by START_OFFSET_M costs as much as 5% of coverage, both
# when ranking placements by roads and when choosing among traced routes.
OFFSET_FIT_PENALTY = 0.05
W_OFFSET = W_SHAPE * OFFSET_FIT_PENALTY


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
    return area_around(
        [start],
        margin_m=reach(shape) * largest_scale + START_OFFSET_M + AREA_MARGIN_M,
    )


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
        self._grids: dict[float, tuple[np.ndarray, int, int]] = {}

    def _grid(self, band_m: float) -> tuple[np.ndarray, int, int]:
        """Boolean grid of cells within a band of a road, and its first cell."""
        if band_m not in self._grids:
            cell = band_m / 2
            r = 2  # a band is two cells
            idx = np.floor(self.samples / cell).astype(int)
            x0, y0 = idx.min(axis=0)
            occupied = np.zeros(tuple(idx.max(axis=0) - (x0, y0) + 1), bool)
            occupied[idx[:, 0] - x0, idx[:, 1] - y0] = True
            w, h = occupied.shape
            near = np.zeros((w + 2 * r, h + 2 * r), bool)
            for dx in range(-r, r + 1):
                for dy in range(-r, r + 1):
                    if dx * dx + dy * dy <= r * r:
                        near[r + dx : r + dx + w, r + dy : r + dy + h] |= occupied
            self._grids[band_m] = (near, int(x0) - r, int(y0) - r)
        return self._grids[band_m]

    def fit_xy(self, outline_xy: np.ndarray, band_m: float) -> float:
        """Share of a closed outline, in metres around `origin`, that has a
        road within about `band_m`."""
        n = max(8, math.ceil(_perimeter_m(outline_xy) / (band_m / 2)))
        steps = np.hypot(*np.diff(outline_xy, axis=0).T)
        cumulative = np.concatenate([[0.0], np.cumsum(steps)])
        s = np.linspace(0.0, cumulative[-1], n, endpoint=False)
        pts = np.column_stack(
            [
                np.interp(s, cumulative, outline_xy[:, 0]),
                np.interp(s, cumulative, outline_xy[:, 1]),
            ]
        )
        near, x0, y0 = self._grid(band_m)
        cells = np.floor(pts / (band_m / 2)).astype(int) - (x0, y0)
        inside = (
            (cells >= 0).all(axis=1)
            & (cells[:, 0] < near.shape[0])
            & (cells[:, 1] < near.shape[1])
        )
        return float(near[cells[inside, 0], cells[inside, 1]].sum()) / n

    def near_xy(self, points_xy: np.ndarray, band_m: float) -> np.ndarray:
        """Whether each point, in metres around `origin`, has a road within
        about `band_m`."""
        near, x0, y0 = self._grid(band_m)
        cells = np.floor(points_xy / (band_m / 2)).astype(int) - (x0, y0)
        inside = (
            (cells >= 0).all(axis=1)
            & (cells[:, 0] < near.shape[0])
            & (cells[:, 1] < near.shape[1])
        )
        result = np.zeros(len(points_xy), bool)
        result[inside] = near[cells[inside, 0], cells[inside, 1]]
        return result

    def fit(self, outline: Sequence[LatLon], band_m: float) -> float:
        """`fit_xy` for an outline in WGS84."""
        return self.fit_xy(
            latlon_to_local_array(self.origin, np.array(outline)), band_m
        )


@dataclass(frozen=True)
class Placement:
    """Where the shape goes: its start (maybe moved), rotation and phase."""

    start: LatLon
    offset_m: float  # how far `start` is from the requested one
    rotation_deg: float
    phase: float


@dataclass
class Attempt:
    placement: Placement
    scale_m: float
    shape: list[LatLon]
    route: NetworkRoute
    similarity: float
    ratio: float  # distance on roads / target
    cost: float

    @property
    def rotation_deg(self) -> float:
        return self.placement.rotation_deg

    @property
    def phase(self) -> float:
        return self.placement.phase

    @property
    def offset_m(self) -> float:
        return self.placement.offset_m


@dataclass
class Search:
    best: Attempt
    attempts: list[Attempt]
    converged: bool
    warnings: list[str] = field(default_factory=list)


Tracer = Callable[[list[LatLon]], NetworkRoute]


def _tracer(graph: Graph, reuse_penalty: float) -> Tracer:
    """Trace on the whole zone graph: the corridor already makes the roads
    far from the candidate too dear to use, so cropping first gains nothing."""

    def trace(projected: list[LatLon]) -> NetworkRoute:
        return snap_to_network(graph, projected, reuse_penalty)

    return trace


def candidate_starts(start: LatLon) -> list[tuple[LatLon, float]]:
    """The requested start, then points on rings around it, with their offset."""
    starts = [(start, 0.0)]
    for radius in START_RINGS_M:
        for k in range(START_BEARINGS):
            bearing = 2 * math.pi * k / START_BEARINGS
            x, y = radius * math.sin(bearing), radius * math.cos(bearing)
            starts.append((local_to_latlon(start, x, y), radius))
    return starts


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
    move_start: bool = True,
) -> Search:
    """Best route for `shape` near `distance_m` on `graph`, starting at
    `start` or, with `move_start`, up to START_OFFSET_M away from it."""
    similarity = similarity or SIMILARITIES[SIMILARITY]
    trace = trace or _tracer(graph, reuse_penalty)
    mask = RoadMask(graph, start)
    base_scale = initial_scale(shape, distance_m)
    low, high = (base_scale * f for f in SCALE_RANGE)
    starts = candidate_starts(start) if move_start else [(start, 0.0)]
    attempts: list[Attempt] = []
    # The road count works in metres around `start`, without projecting.
    phase_xy = {phase: np.array(start_at_phase(shape, phase)) for phase in PHASES}
    phase_corners = {phase: corner_indices(pts[:-1]) for phase, pts in phase_xy.items()}
    start_xy = {s: latlon_to_local_array(start, np.array([s]))[0] for s, _ in starts}

    def outline_xy(p: Placement, scale: float) -> np.ndarray:
        """`project_shape` in metres around `start` (same scale and rotation)."""
        pts = phase_xy[p.phase]
        theta = math.radians(p.rotation_deg)
        cos_t, sin_t = math.cos(theta), math.sin(theta)
        local = scale * np.column_stack(
            [
                pts[:, 0] * cos_t - pts[:, 1] * sin_t,
                pts[:, 0] * sin_t + pts[:, 1] * cos_t,
            ]
        )
        return local - local[0] + start_xy[p.start]

    def placed(p: Placement, scale: float) -> list[LatLon]:
        return project_shape(shape, p.start, scale, p.rotation_deg, p.phase)

    def road_fit(p: Placement, scale: float) -> float:
        # The band follows the scale alone, so every placement at one scale
        # shares the same grid. Moving the start must earn its keep.
        band = round(CORRIDOR_BAND * perimeter(shape) * scale, 3)
        outline = outline_xy(p, scale)
        fit = mask.fit_xy(outline, band)
        corners = outline[phase_corners[p.phase]]
        bare = int((~mask.near_xy(corners, band)).sum()) if len(corners) else 0
        return (
            fit
            - CORNER_PENALTY * bare
            - OFFSET_FIT_PENALTY * p.offset_m / START_OFFSET_M
        )

    def attempt(p: Placement, scale: float) -> Attempt:
        outline = placed(p, scale)
        route = trace(outline)
        sim = similarity(route.points, outline)
        ratio = route.distance_m / distance_m
        cost = (
            W_SHAPE * (1 - sim)
            + W_DISTANCE * abs(ratio - 1)
            + W_OFFSET * p.offset_m / START_OFFSET_M
        )
        result = Attempt(p, scale, outline, route, sim, ratio, cost)
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

    def rescale(p: Placement, scale: float) -> tuple[Attempt | None, float]:
        """Trace, rescale towards the target, repeat; returns the next scale."""
        history: list[Attempt] = []
        for _ in range(MAX_RESCALES):
            if len(attempts) >= max_traces:
                break
            history.append(attempt(p, scale))
            if abs(history[-1].ratio - 1) <= DISTANCE_TOLERANCE:
                break
            new_scale = next_scale(history)
            if math.isclose(new_scale, scale):
                break  # at a bound
            scale = new_scale
        return (history[-1] if history else None), scale

    def polish(best: Attempt) -> bool:
        """Spend the budget left on the distance of the best placement.

        Between a trace too short and one too long of the same placement,
        interpolate; otherwise take the secant through the two closest.
        Stops as soon as the distance is right: if the shape is still
        wrong then, rescaling will not fix it.
        """
        p = best.placement
        while len(attempts) < max_traces:
            same = [a for a in attempts if a.placement == p]
            if any(abs(a.ratio - 1) <= DISTANCE_TOLERANCE for a in same):
                return any(good(a) for a in same)
            short = [a for a in same if a.ratio < 1]
            long = [a for a in same if a.ratio > 1]
            if short and long:
                a = max(short, key=lambda x: x.ratio)
                b = min(long, key=lambda x: x.ratio)
                da, db = a.route.distance_m, b.route.distance_m
                scale = a.scale_m + (distance_m - da) * (b.scale_m - a.scale_m) / (
                    db - da
                )
            else:
                closest = sorted(same, key=lambda x: abs(x.ratio - 1))[:2]
                scale = next_scale(closest[::-1])
            scale = min(high, max(low, scale))
            if any(math.isclose(scale, a.scale_m, rel_tol=1e-3) for a in same):
                return False
            if good(attempt(p, scale)):
                return True
        return False

    def best_placement(scale: float, tried: list[Placement]) -> Placement | None:
        """Placement with most roads along the outline at `scale`, away from
        the tried ones (same start and phase, within two rotation steps)."""
        candidates = [
            Placement(s, offset, float(r), phase)
            for s, offset in starts
            for r in np.arange(0.0, 360.0, ROTATION_STEP_DEG)
            for phase in PHASES
        ]
        ranked = sorted(
            range(len(candidates)),
            key=lambda i: (
                -road_fit(candidates[i], scale),
                candidates[i].offset_m,
                i,
            ),
        )
        for i in ranked:
            p = candidates[i]
            near = any(
                t.start == p.start
                and t.phase == p.phase
                and _angle_gap(t.rotation_deg, p.rotation_deg) < 2 * ROTATION_STEP_DEG
                for t in tried
            )
            if not near:
                return p
        return None

    # The first placement learns the scale; the next ones are traced once at
    # that scale, so the budget explores many placements, and the best of
    # them gets the refinement and the polish (TASK-016).
    scale = base_scale
    tried: list[Placement] = []
    screening = max(1, max_traces - RESERVED_TRACES)
    for k in range(TOP_PLACEMENTS):
        placement = best_placement(scale, tried)
        if placement is None or (k > 0 and len(attempts) >= screening):
            break
        tried.append(placement)
        if k == 0 or not SCREEN_ONCE:
            last, scale = rescale(placement, scale)
        else:
            last = attempt(placement, scale)
        if last is not None and good(last):
            return _done(attempts, good, distance_m)

    best = min(attempts, key=lambda a: a.cost)
    turns = np.arange(-REFINE_SPAN_DEG, REFINE_SPAN_DEG + 1e-9, REFINE_STEP_DEG)
    traced = {a.placement for a in attempts}
    around = [
        Placement(
            best.placement.start,
            best.offset_m,
            float((best.rotation_deg + t) % 360),
            best.phase,
        )
        for t in turns
    ]
    refined = sorted(
        (p for p in around if p not in traced),
        key=lambda p: (-road_fit(p, best.scale_m), p.rotation_deg),
    )
    if refined and len(attempts) < max_traces:
        last, _ = rescale(refined[0], best.scale_m)
        if last is not None and good(last):
            return _done(attempts, good, distance_m)
    polish(min(attempts, key=lambda a: a.cost))
    return _done(attempts, good, distance_m)


def _angle_gap(a: float, b: float) -> float:
    return abs((a - b + 180.0) % 360.0 - 180.0)


def _done(
    attempts: list[Attempt], good: Callable[[Attempt], bool], distance_m: float
) -> Search:
    """The cheapest attempt that meets both thresholds; failing that, the
    cheapest within DISTANCE_FALLBACK_M of the target, if there is one."""
    good_ones = [a for a in attempts if good(a)]
    converged = bool(good_ones)
    within = [
        a
        for a in attempts
        if abs(a.route.distance_m - distance_m) <= DISTANCE_FALLBACK_M
    ]
    best = min(good_ones or within or attempts, key=lambda a: a.cost)
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
# Below this similarity no route is returned: better none than one that does
# not look like the shape (TASK-015, ADR-0025).
MIN_SIMILARITY = 0.60


# Around each corner of the shape, this share of its perimeter may be drawn
# twice without counting as retraced: the spike to a corner draws it.
CORNER_SPARE = 0.05


def _scale_of(placed: Sequence[LatLon], shape: Sequence[Point]) -> float:
    """Metres per normalized unit of a placed shape."""
    xy = latlon_to_local_array(placed[0], np.array(placed))
    return _perimeter_m(xy) / perimeter(shape)


class ShapeNotDrawableError(ValueError):
    """The roads around the start cannot draw the requested shape."""


def _compass(origin: LatLon, point: LatLon) -> str:
    x, y = latlon_to_local_array(origin, np.array([point]))[0]
    names = ("north", "north-east", "east", "south-east")
    names += ("south", "south-west", "west", "north-west")
    return names[round(math.degrees(math.atan2(x, y)) / 45.0) % 8]


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
    checks: dict[str, float] = field(default_factory=dict)  # validation.measure


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
        best = found.best
        what = f"a {request.distance_m / 1000:g} km {request.shape}"
        if best.similarity < MIN_SIMILARITY:
            raise ShapeNotDrawableError(
                f"{what} cannot be drawn here: the best route scores "
                f"{best.similarity:.2f} for shape, {MIN_SIMILARITY:.2f} needed"
            )
        gap = best.route.distance_m - request.distance_m
        if abs(gap) > DISTANCE_FALLBACK_M:
            raise ShapeNotDrawableError(
                f"{what} cannot be drawn here: the best shape is "
                f"{gap / 1000:+.1f} km from the target, at most "
                f"{DISTANCE_FALLBACK_M / 1000:g} km allowed"
            )
        route, sim, warnings = best.route, best.similarity, list(found.warnings)
        placed, chosen_start = best.shape, best.placement.start
        if best.offset_m > 0:
            direction = _compass(request.start, best.placement.start)
            warnings.insert(
                0,
                f"start moved {best.offset_m:.0f} m {direction} of the requested "
                "point, where the shape closes on the roads",
            )
    else:
        found = None
        projected = project_shape(
            shape, request.start, initial_scale(shape, request.distance_m)
        )
        route = snap_to_network(graph, projected, reuse_penalty)
        sim, warnings = similarity(route.points, projected), list(route.warnings)
        placed, chosen_start = projected, request.start
    [first], _ = nearest_nodes(graph, [chosen_start])
    check_closed(
        route.points,
        (graph.nodes[first]["y"], graph.nodes[first]["x"]),
        request.start,
        chosen_start,
        START_OFFSET_M,
    )
    outline = latlon_to_local_array(placed[0], np.array(placed[:-1]))
    corners = [placed[i] for i in corner_indices(outline)]
    spare = CORNER_SPARE * perimeter(shape) * _scale_of(placed, shape)
    measures = measure(graph, route.points, route.nodes, corners, spare)
    warnings.extend(issue.message for issue in validate(measures))
    result = RouteResult(
        points=route.points,
        distance_m=route.distance_m,
        similarity=sim,
        shape=request.shape,
        warnings=warnings,
    )
    return Plan(result, found, measures)
