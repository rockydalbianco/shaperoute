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
from route_engine.metrics import (
    CORNER_PENALTY,
    COVER_TOLERANCE,
    SIMILARITIES,
    Similarity,
    coverage,
    precision,
)
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
    detail_scale,
    first_leg,
    nearest_nodes,
    snap_to_network,
    twice_drawn,
)
from route_engine.projection import (
    Point,
    initial_scale,
    perimeter,
    project_shape,
    start_at_phase,
)
from route_engine.shapes import FREE_ROTATION, get_shape
from route_engine.validation import check_closed, measure, validate
from route_engine.words import MAX_SHIFT, SHIFT_STEP, Word

# Where the start enters the shape, as arc-length fractions (TASK-015).
PHASES = (0.0, 0.25, 0.5, 0.75)
ROTATION_STEP_DEG = 15.0
# A shape with a top and a bottom tilts at most this much: tilted shapes
# were judged unrecognizable (TASK-035, ADR-0038). 180 lets it turn freely.
MAX_TILT_DEG = 15.0
FREE_TILT_DEG = 180.0
# Scale bounds, as multiples of the initial scale.
SCALE_RANGE = (0.4, 1.1)
# The shape may start this far from the requested point, on rings of these
# radii in as many directions, when that lets it close on the roads
# (TASK-015, ADR-0025).
START_OFFSET_M = 500.0
START_RINGS_M = (250.0, 500.0)
START_BEARINGS = 8
# When no route there is good, or the shape cannot be drawn there, a second
# search looks for a place up to FAR_OFFSET_M away, on these rings, with its
# own budget of traces (TASK-038, ADR-0040).
FAR_OFFSET_M = 2000.0
FAR_RINGS_M = (1000.0, 1500.0, 2000.0)
FAR_BEARINGS = 12
FAR_TRACES = 20
# Placements traced after the road count (while the budget lasts), and
# rescales for each of them. Tracing more placements once each, instead,
# scored a bit worse on the 14 drawable cases (TASK-016, docs/MAPS.md).
TOP_PLACEMENTS = 6
MAX_RESCALES = 4
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
# The letters of a word each move up to words.MAX_SHIFT, on a grid of
# words.SHIFT_STEP, to where their own strokes have most roads within
# LETTER_BAND letter heights (TASK-050, fit_letters). Moving a letter that
# far costs this share of its road count: a letter stays where it is unless
# the roads are clearly better elsewhere.
SHIFT_PENALTY = 0.05
LETTER_BAND = 1 / 16
# A word is judged letter by letter (word_similarity), within this many
# letter heights. The shape similarity looks at the whole line, gaps
# included, within 1% of its length (ADR-0039): some 150 m for letters 700 m
# high at 15 km, and it passed words whose letters the roads did not draw.
# Tracing zones and corridor this narrow were tried too, and dropped: at
# Trento the route lost the O (TASK-050).
WORD_TOLERANCE = 1 / 8
# Where a word goes back along itself (the I, the C, the gaps), the roads it
# has just used cost this much: it comes back on the same road, as the user
# asked for the I, instead of on a parallel one (TASK-050).
WORD_RETRACE = 0.5


def reach(shape: Sequence[Point], phases: Sequence[float] = PHASES) -> float:
    """Farthest a normalized shape gets from its start, over `phases`."""
    farthest = 0.0
    for phase in phases:
        points = start_at_phase(shape, phase)
        farthest = max(farthest, max(math.dist(p, points[0]) for p in points))
    return farthest


def zone_area(
    shape: Sequence[Point],
    start: LatLon,
    distance_m: float,
    offset_m: float = START_OFFSET_M,
    word: Word | None = None,
) -> BBox:
    """Square around `start` holding the shape at any rotation, phase and
    scale, from any start up to `offset_m` away; for a `word`, at its own
    phases and with its letters moved as far as they may.

    One graph of this area serves every attempt of the search (ADR-0023).
    """
    largest_scale = initial_scale(shape, distance_m) * SCALE_RANGE[1]
    far = reach(shape)
    if word is not None:
        far = reach(shape, word.phases) + MAX_SHIFT * word.height
    return area_around(
        [start],
        margin_m=far * largest_scale + offset_m + AREA_MARGIN_M,
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

    def fits_xy(
        self, line_xy: np.ndarray, moves: np.ndarray, band_m: float
    ) -> np.ndarray:
        """`fit_xy` of a line moved by each of `moves`, all in metres, at
        once: the line is sampled a single time (TASK-050)."""
        n = max(8, math.ceil(_perimeter_m(line_xy) / (band_m / 2)))
        steps = np.hypot(*np.diff(line_xy, axis=0).T)
        cumulative = np.concatenate([[0.0], np.cumsum(steps)])
        s = np.linspace(0.0, cumulative[-1], n, endpoint=False)
        pts = np.column_stack(
            [
                np.interp(s, cumulative, line_xy[:, 0]),
                np.interp(s, cumulative, line_xy[:, 1]),
            ]
        )
        moved = (pts[None] + moves[:, None]).reshape(-1, 2)
        return self.near_xy(moved, band_m).reshape(len(moves), n).mean(axis=1)

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
    # How far each letter of a word moved (fit_letters), in letter heights:
    # along the base line, then up.
    shifts: tuple[tuple[float, float], ...] = ()

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


def _tracer(graph: Graph, reuse_penalty: float, retrace: float = 1.0) -> Tracer:
    """Trace on the whole zone graph: the corridor already makes the roads
    far from the candidate too dear to use, so cropping first gains nothing."""

    def trace(projected: list[LatLon]) -> NetworkRoute:
        return snap_to_network(graph, projected, reuse_penalty, retrace=retrace)

    return trace


def candidate_starts(start: LatLon) -> list[tuple[LatLon, float]]:
    """The requested start, then points on rings around it, with their offset."""
    return [(start, 0.0), *_rings(start, START_RINGS_M, START_BEARINGS)]


def far_starts(start: LatLon) -> list[tuple[LatLon, float]]:
    """Where the second search starts the shape: farther rings (ADR-0040)."""
    return _rings(start, FAR_RINGS_M, FAR_BEARINGS)


def _rings(
    start: LatLon, radii: Sequence[float], bearings: int
) -> list[tuple[LatLon, float]]:
    starts = []
    for radius in radii:
        for k in range(bearings):
            bearing = 2 * math.pi * k / bearings
            x, y = radius * math.sin(bearing), radius * math.cos(bearing)
            starts.append((local_to_latlon(start, x, y), radius))
    return starts


def shift_grid() -> np.ndarray:
    """The moves a letter may try, in letter heights: every point of a grid
    of SHIFT_STEP within MAX_SHIFT, shortest first, staying put first."""
    k = round(MAX_SHIFT / SHIFT_STEP)
    moves = [
        (i * SHIFT_STEP, j * SHIFT_STEP)
        for i in range(-k, k + 1)
        for j in range(-k, k + 1)
        if i * i + j * j <= k * k
    ]
    return np.array(sorted(moves, key=lambda m: (math.hypot(*m), m)))


def letter_moves(
    word: Word,
    start: int,
    rotation_deg: float,
    scale: float,
    origin_xy: np.ndarray,
    mask: RoadMask,
    band_m: float,
) -> tuple[np.ndarray, np.ndarray]:
    """Where each letter of `word` has most roads (TASK-050): the move of
    `shift_grid` each letter keeps, in letter heights, and its score.

    The word is drawn from gap `start` (Word.line), turned by
    `rotation_deg` and scaled by `scale` like a placement, with its first
    point at `origin_xy`, in metres around `mask.origin`. A letter scores
    the share of its strokes with a road within `band_m`, less
    SHIFT_PENALTY for the longest move. Only the letter counts: a share of
    the whole word would reward the moves that shorten the gaps. A lone
    letter does not move: the search places the word.
    """
    grid = shift_grid() if len(word.letters) > 1 else np.zeros((1, 2))
    points, _ = word.line(start)
    theta = math.radians(rotation_deg)
    cos_t, sin_t = math.cos(theta), math.sin(theta)
    turn = scale * np.array([[cos_t, -sin_t], [sin_t, cos_t]])
    xy = (points - points[0]) @ turn.T + origin_xy
    moves = grid * word.height @ turn.T  # in metres
    costs = SHIFT_PENALTY * np.hypot(grid[:, 0], grid[:, 1]) / MAX_SHIFT
    chosen: list[int] = []
    scores: list[float] = []
    for rows in word.strokes(start):
        score = mask.fits_xy(xy[rows], moves, band_m) - costs
        chosen.append(int(np.argmax(score)))  # the shortest move on a tie
        scores.append(float(score[chosen[-1]]))
    return grid[chosen], np.array(scores)


def fit_letters(
    word: Word,
    start: int,
    rotation_deg: float,
    scale: float,
    origin_xy: np.ndarray,
    mask: RoadMask,
    band_m: float,
) -> tuple[list[Point], np.ndarray]:
    """Move each letter of `word` where its strokes have most roads
    (`letter_moves`, same arguments); the gaps stretch to follow, and the
    first point stays. Returns the normalized points, closed, and the moves
    in letter heights."""
    shifts, _ = letter_moves(word, start, rotation_deg, scale, origin_xy, mask, band_m)
    return word.moved(start, shifts), shifts


def word_similarity(
    word: Word,
    start: int,
    route: Sequence[LatLon],
    outline: Sequence[LatLon],
    height_m: float,
) -> float:
    """How well `route` writes `word`, placed as `outline` (in the order of
    Word.line(start)) with letters `height_m` high (TASK-050): the harmonic
    mean of the letters' coverage, on average over the letters, and of the
    precision on the whole word, within WORD_TOLERANCE letter heights."""
    tolerance = WORD_TOLERANCE * height_m
    covered = np.mean(
        [
            coverage(route, [outline[i] for i in rows], tolerance)
            for rows in word.strokes(start)
        ]
    )
    exact = precision(route, outline, tolerance)
    return (
        0.0 if covered + exact == 0 else float(2 * covered * exact / (covered + exact))
    )


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
    max_tilt_deg: float = FREE_TILT_DEG,
    starts: Sequence[tuple[LatLon, float]] | None = None,
    phases: Sequence[float] = PHASES,
    word: Word | None = None,
) -> Search:
    """Best route for `shape` near `distance_m` on `graph`, starting at
    `start` or, with `move_start`, up to START_OFFSET_M away from it; or
    from the given `starts`, each with its distance from `start`. The shape
    turns at most `max_tilt_deg` either way from how it is drawn, and the
    route enters it at one of `phases`.

    When `shape` is the `word`'s points and `phases` its phases, every
    trace first moves the letters to where the roads are (fit_letters)."""
    similarity = similarity or SIMILARITIES[SIMILARITY]

    def allowed(rotation_deg: float) -> bool:
        return _angle_gap(rotation_deg, 0.0) <= max_tilt_deg + 1e-9

    retrace = 1.0 if word is None else WORD_RETRACE
    trace = trace or _tracer(graph, reuse_penalty, retrace)
    mask = RoadMask(graph, start)
    base_scale = initial_scale(shape, distance_m)
    low, high = (base_scale * f for f in SCALE_RANGE)
    if starts is None:
        starts = candidate_starts(start) if move_start else [(start, 0.0)]
    attempts: list[Attempt] = []
    # The road count works in metres around `start`, without projecting.
    phase_xy = {phase: np.array(start_at_phase(shape, phase)) for phase in phases}
    phase_corners = {phase: corner_indices(pts[:-1]) for phase, pts in phase_xy.items()}
    start_xy = {s: latlon_to_local_array(start, np.array([s]))[0] for s, _ in starts}
    # A shape with strokes is judged finer (ADR-0039); normalized, its sides
    # drawn twice coincide exactly.
    band_share = CORRIDOR_BAND * detail_scale(np.array(shape), near_m=1e-9)
    # One band for every trace, so the letters share one grid of roads.
    letter_band = float(round(LETTER_BAND * base_scale * word.height)) if word else 0.0

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
        if word is not None:  # letter by letter, each where it may move
            _, scores = letter_moves(
                word,
                word.phases.index(p.phase),
                p.rotation_deg,
                scale,
                start_xy[p.start],
                mask,
                letter_band,
            )
            return (
                float(scores.mean()) - OFFSET_FIT_PENALTY * p.offset_m / START_OFFSET_M
            )
        # The band follows the scale alone, so every placement at one scale
        # shares the same grid. Moving the start must earn its keep.
        band = round(band_share * perimeter(shape) * scale, 3)
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
        shifts: tuple[tuple[float, float], ...] = ()
        if word is None:
            outline = placed(p, scale)
        else:
            drawn, moved = fit_letters(
                word,
                word.phases.index(p.phase),
                p.rotation_deg,
                scale,
                start_xy[p.start],
                mask,
                letter_band,
            )
            outline = project_shape(drawn, p.start, scale, p.rotation_deg)
            shifts = tuple((float(x), float(y)) for x, y in moved)
        route = trace(outline)
        if word is None:
            sim = similarity(route.points, outline)
        else:
            index = word.phases.index(p.phase)
            sim = word_similarity(
                word, index, route.points, outline, scale * word.height
            )
        ratio = route.distance_m / distance_m
        cost = (
            W_SHAPE * (1 - sim)
            + W_DISTANCE * abs(ratio - 1)
            + W_OFFSET * p.offset_m / START_OFFSET_M
        )
        result = Attempt(p, scale, outline, route, sim, ratio, cost, shifts)
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
            if allowed(r)
            for phase in phases
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

    scale = base_scale
    tried: list[Placement] = []
    for _ in range(TOP_PLACEMENTS):
        placement = best_placement(scale, tried)
        if placement is None or len(attempts) >= max_traces:
            break
        tried.append(placement)
        last, scale = rescale(placement, scale)
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
        (p for p in around if p not in traced and allowed(p.rotation_deg)),
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
# Along a stroke of the shape, as far as the route may be from it and still
# draw it (TASK-037): there, going out and back is the point.
STROKE_SPARE = COVER_TOLERANCE


def _scale_of(placed: Sequence[LatLon], shape: Sequence[Point]) -> float:
    """Metres per normalized unit of a placed shape."""
    xy = latlon_to_local_array(placed[0], np.array(placed))
    return _perimeter_m(xy) / perimeter(shape)


class ShapeNotDrawableError(ValueError):
    """The roads around the start cannot draw the requested shape.

    best_distance_m is the length of the best route found when it followed
    the shape but missed the distance: that distance the shape fits
    (TASK-031). None when the best route did not follow the shape.
    """

    def __init__(self, message: str, best_distance_m: float | None = None) -> None:
        super().__init__(message)
        self.best_distance_m = best_distance_m


def _compass(origin: LatLon, point: LatLon) -> str:
    x, y = latlon_to_local_array(origin, np.array([point]))[0]
    names = ("north", "north-east", "east", "south-east")
    names += ("south", "south-west", "west", "north-west")
    return names[round(math.degrees(math.atan2(x, y)) / 45.0) % 8]


class GraphLoader(Protocol):
    def load(self, bbox: BBox) -> Graph: ...


def planned_distance(distance_m: float, one_way: bool) -> float:
    """What the engine plans for: a one-way shape is planned out and back,
    twice as long, and the way out is kept (TASK-041)."""
    return 2 * distance_m if one_way else distance_m


def required_area(
    shape: Sequence[Point],
    start: LatLon,
    distance_m: float,
    optimize: bool = True,
    word: Word | None = None,
) -> BBox:
    """Area whose graph a request needs: the zone, or just the initial shape.
    `distance_m` is the planned one (`planned_distance`)."""
    if optimize:
        return zone_area(shape, start, distance_m, word=word)
    return area_around(project_shape(shape, start, initial_scale(shape, distance_m)))


@dataclass
class Plan:
    result: RouteResult
    search: Search | None  # None when the shape was not optimized
    checks: dict[str, float] = field(default_factory=dict)  # validation.measure
    far: Search | None = None  # the second search, when there was one


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
    return plan_shape(
        get_shape(request.shape)(SHAPE_POINTS),
        request.shape,
        request.start,
        request.distance_m,
        source,
        optimize,
        reuse_penalty,
        tilt_limit(request.shape),
    )


def tilt_limit(name: str) -> float:
    """How far a shape may turn: freely if it looks the same at any angle,
    otherwise it stays upright (ADR-0038)."""
    return FREE_TILT_DEG if name in FREE_ROTATION else MAX_TILT_DEG


def plan_shape(
    shape: Sequence[Point],
    name: str,
    start: LatLon,
    distance_m: int,
    source: GraphLoader,
    optimize: bool = True,
    reuse_penalty: float = EDGE_REUSE_PENALTY,
    max_tilt_deg: float = MAX_TILT_DEG,
    one_way: bool = False,
    word: Word | None = None,
) -> Plan:
    """plan_route for any normalized shape, also an outline read from a file
    (TASK-032). `name` only labels the result and its messages; start and
    distance are the caller's to check, as RouteRequest does. An outline
    stays upright unless told otherwise (ADR-0038).

    A `one_way` shape is drawn out and back (Outline.one_way): it is planned
    as a closed shape twice `distance_m` long, entered at its first point,
    and the route keeps the way out, which ends at the shape's far end
    (TASK-041). Shares and scores are the same for the whole and the half.

    A `word` is a closed line whose `points` are `shape`: the search enters
    it half-way along a gap between letters, and moves the letters to where
    the roads are (TASK-050).
    """
    similarity = SIMILARITIES[SIMILARITY]
    planned_m = planned_distance(distance_m, one_way)
    kept = 0.5 if one_way else 1.0  # of the planned route
    phases = (0.0,) if one_way else PHASES
    if word is not None:
        phases = word.phases
    graph = source.load(required_area(shape, start, planned_m, optimize, word))
    far: Search | None = None
    if optimize:
        found = search(
            graph,
            shape,
            start,
            planned_m,
            reuse_penalty=reuse_penalty,
            max_tilt_deg=max_tilt_deg,
            phases=phases,
            word=word,
        )
        if not found.converged:
            # Not good here: look for a place farther away (ADR-0040).
            far_graph = source.load(
                zone_area(shape, start, planned_m, FAR_OFFSET_M, word)
            )
            far = search(
                far_graph,
                shape,
                start,
                planned_m,
                max_traces=FAR_TRACES,
                reuse_penalty=reuse_penalty,
                max_tilt_deg=max_tilt_deg,
                starts=far_starts(start),
                phases=phases,
                word=word,
            )
            if far.converged or (
                not _drawable(found.best, planned_m, kept)
                and _drawable(far.best, planned_m, kept)
            ):
                found, graph = far, far_graph
        best = found.best
        what = f"a {distance_m / 1000:g} km {name} cannot be drawn here"
        if far is not None:  # looked farther too
            what += f", nor within {FAR_OFFSET_M / 1000:g} km"
        if best.similarity < MIN_SIMILARITY:
            raise ShapeNotDrawableError(
                f"{what}: the best route scores "
                f"{best.similarity:.2f} for shape, {MIN_SIMILARITY:.2f} needed"
            )
        gap = (best.route.distance_m - planned_m) * kept
        if abs(gap) > DISTANCE_FALLBACK_M:
            raise ShapeNotDrawableError(
                f"{what}: the best shape is "
                f"{gap / 1000:+.1f} km from the target, at most "
                f"{DISTANCE_FALLBACK_M / 1000:g} km allowed",
                best_distance_m=best.route.distance_m * kept,
            )
        route, sim, warnings = best.route, best.similarity, list(found.warnings)
        placed, chosen_start = best.shape, best.placement.start
        if best.offset_m > 0:
            direction = _compass(start, best.placement.start)
            moved = (
                f"{best.offset_m:.0f} m"
                if best.offset_m < 1000
                else f"{best.offset_m / 1000:g} km"
            )
            warnings.insert(
                0,
                f"start moved {moved} {direction} of the requested point, "
                "where the shape closes on the roads",
            )
    else:
        found = None
        projected = project_shape(shape, start, initial_scale(shape, planned_m))
        retrace = 1.0 if word is None else WORD_RETRACE
        route = snap_to_network(graph, projected, reuse_penalty, retrace=retrace)
        sim, warnings = similarity(route.points, projected), list(route.warnings)
        if word is not None:
            height_m = initial_scale(shape, planned_m) * word.height
            sim = word_similarity(word, 0, route.points, projected, height_m)
        placed, chosen_start = projected, start
    [first], _ = nearest_nodes(graph, [chosen_start])
    check_closed(
        route.points,
        (graph.nodes[first]["y"], graph.nodes[first]["x"]),
        start,
        chosen_start,
        FAR_OFFSET_M if far is not None and found is far else START_OFFSET_M,
    )
    if one_way:  # the far end is half-way along the shape
        route = first_leg(graph, route, start_at_phase(placed, 0.5)[0])
    outline = latlon_to_local_array(placed[0], np.array(placed))
    corners = [placed[i] for i in corner_indices(outline[:-1])]
    strokes = [(placed[i], placed[i + 1]) for i in np.flatnonzero(twice_drawn(outline))]
    size = perimeter(shape) * _scale_of(placed, shape)
    measures = measure(
        graph,
        route.points,
        route.nodes,
        corners,
        CORNER_SPARE * size,
        strokes,
        STROKE_SPARE * size,
    )
    warnings.extend(issue.message for issue in validate(measures))
    result = RouteResult(
        points=route.points,
        distance_m=route.distance_m,
        similarity=sim,
        shape=name,
        warnings=warnings,
    )
    return Plan(result, found, measures, far)


def _drawable(best: Attempt, distance_m: float, kept: float = 1.0) -> bool:
    """Whether plan_shape would return this attempt rather than refuse it,
    keeping that share of its route."""
    return (
        best.similarity >= MIN_SIMILARITY
        and abs(best.route.distance_m - distance_m) * kept <= DISTANCE_FALLBACK_M
    )
