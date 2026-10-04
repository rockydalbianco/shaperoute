"""Plan a shape from a few road nodes near the start, keep the best route
(TASK-076, ADR-0071).

A few metres of GPS change the route the search finds: 25-100 m took the
10 km heart at Caldonazzo from 0.73 to 0.92 similarity (TASK-075). So the
shape is planned from the start and, at the same time in other processes,
from up to NEARBY_COUNT road nodes NEARBY_MIN_M-NEARBY_MAX_M away. The
best plan is kept (`score`); when it begins at a nearby node, the way there
from the start and back is added to the route, so it still begins and ends
at the start and its length counts in the distance and in the GPX.

The optimizer is not touched: the start gets a plain `plan_shape`, as the
API does today, and a nearby start its search from that node only
(`ShapeJob.here`).
"""

from __future__ import annotations

import logging
import multiprocessing
import os
import pickle
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass, replace
from multiprocessing.pool import AsyncResult
from typing import Any, Protocol

import networkx as nx
import numpy as np

from route_engine.alternatives import alternatives
from route_engine.geo import LatLon, latlon_to_local_array, path_length_m
from route_engine.memory import available_mb
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import (
    EDGE_REUSE_PENALTY,
    BBox,
    Graph,
    _edge_points,
    check_network,
    corner_indices,
    first_leg,
    nearest_nodes,
    on_foot_stretches,
    one_way_streets,
    step_cost,
    twice_drawn,
)
from route_engine.optimizer import (
    CORNER_SPARE,
    DISTANCE_FALLBACK_M,
    DISTANCE_TOLERANCE,
    MAX_TILT_DEG,
    MIN_SIMILARITY,
    PHASES,
    SHAPE_POINTS,
    START_OFFSET_M,
    STROKE_SPARE,
    W_DISTANCE,
    W_SHAPE,
    GraphLoader,
    Plan,
    ShapeNotDrawableError,
    doubled_weight,
    drawn_distance,
    plan_shape,
    planned_distance,
    required_area,
    search,
    tilt_limit,
)
from route_engine.pen_up import check_begins, drawn_m
from route_engine.pieces import compose_shape
from route_engine.projection import Point, start_at_phase
from route_engine.retracing import extra_doubled_share
from route_engine.shapes import get_shape
from route_engine.validation import check_closed, measure, validate
from route_engine.words import Word, compose

log = logging.getLogger(__name__)

# Nearby starts: road nodes this far from the start in a straight line, one
# per sector of 360 / NEARBY_COUNT degrees, the one whose way from the start
# is nearest to NEARBY_AIM_M. A node farther than APPROACH_MAX_M along the
# roads (across a river, behind a wall) is not nearby.
NEARBY_COUNT = 3
NEARBY_MIN_M = 25.0
NEARBY_MAX_M = 100.0
NEARBY_AIM_M = 60.0
APPROACH_MAX_M = 150.0
# Once the plan from the start is done, the nearby ones get at most this
# long to finish, and never past NEARBY_BUDGET_S from the request; those
# still running are dropped. A start slow to plan (a dense city, 15 km) is
# not made slower still (PRODUCT.md: 30 s at most).
NEARBY_GRACE_S = 8.0
NEARBY_BUDGET_S = 25.0
# When the start's own plan is already good, the nearby ones get this long:
# not for a better route but for the alternatives to choose from (TASK-093,
# ADR-0087). Nearby plans take 1-2 s on a zone in memory (Trento, 12-15 km).
NEARBY_GOOD_GRACE_S = 3.0
# The best shape wins, wherever it starts: the user's start, a nearby one,
# or where the search moved it ("Start here"; the user's choice, ADR-0071).
# Plans within this much of the best score count as equal, and of those the
# one that begins nearest the user wins. The eye saw 0.02 (TASK-076,
# Trento 15 km: 0.90 `yes`, 0.88 `almost`) but not always less (TASK-075:
# 0.85 judged both `yes` and `almost`).
TIE_MARGIN = 0.01
# No nearby starts on a graph this big: the search from one node alone
# outlasts NEARBY_BUDGET_S there (84 000 nodes at Milan, 15 km: 35 s), so it
# would only slow the start's own plan. Measured on the PC of the API.
NEARBY_MAX_NODES = 30_000
# A worker takes about WORKER_BASE_MB plus WORKER_PER_MB for each MB of the
# pickled graph (the graph, its search); only as many start as fit in the
# free memory, leaving MEMORY_RESERVE_MB to the start's own plan: with too
# many, the start's plan itself ran out of memory at Milan (ADR-0071).
WORKER_BASE_MB = 100.0
WORKER_PER_MB = 10.0
MEMORY_RESERVE_MB = 1000.0


class Job(Protocol):
    """What to plan, without the start. Sent to the worker processes, so it
    must pickle: plain data, no graph and no open source."""

    @property
    def distance_m(self) -> int: ...

    def area(self, start: LatLon) -> BBox: ...

    def plan(self, start: LatLon, source: GraphLoader) -> Plan:
        """The plan from `start`, as today: the search may move the start."""
        ...

    def here(self, start: LatLon, source: GraphLoader) -> Plan:
        """The plan from exactly `start`: what a nearby start needs."""
        ...


@dataclass(frozen=True)
class ShapeJob:
    """`plan_shape` from any start: a catalogue shape, an outline or a word.
    `word_result` marks a word asked through the API, whose result carries
    the word instead of the shape, as `plan_route` returns it."""

    shape: tuple[Point, ...]
    name: str
    distance_m: int
    reuse_penalty: float = EDGE_REUSE_PENALTY
    max_tilt_deg: float = MAX_TILT_DEG
    one_way: bool = False
    word: Word | None = None
    word_result: bool = False
    # The network the graphs must be of (network.check_network, ADR-0153).
    activity: str = "running"

    @classmethod
    def of_request(cls, request: RouteRequest) -> ShapeJob:
        """What `plan_route` plans for `request`, from any start."""
        if request.word is not None:
            word = compose(request.word, style=request.style, pen_up=request.pen_up)
            return cls(
                tuple(word.points),
                word.text,
                request.distance_m,
                word=word,
                word_result=True,
                activity=request.activity,
            )
        assert request.shape is not None  # RouteRequest has one of the two
        if request.pen_up:  # a shape in pieces (TASK-223)
            pieces = compose_shape(request.shape)
            return cls(
                tuple(pieces.points),
                request.shape,
                request.distance_m,
                max_tilt_deg=tilt_limit(request.shape),
                word=pieces,
                activity=request.activity,
            )
        return cls(
            tuple(get_shape(request.shape)(SHAPE_POINTS)),
            request.shape,
            request.distance_m,
            max_tilt_deg=tilt_limit(request.shape),
            activity=request.activity,
        )

    @property
    def planned_m(self) -> float:
        return planned_distance(self.distance_m, self.one_way)

    def area(self, start: LatLon) -> BBox:
        return required_area(self.shape, start, self.planned_m, word=self.word)

    def plan(self, start: LatLon, source: GraphLoader) -> Plan:
        plan = plan_shape(
            self.shape,
            self.name,
            start,
            self.distance_m,
            source,
            reuse_penalty=self.reuse_penalty,
            max_tilt_deg=self.max_tilt_deg,
            one_way=self.one_way,
            word=self.word,
            activity=self.activity,
        )
        return self._as_asked(plan)

    def here(self, start: LatLon, source: GraphLoader) -> Plan:
        """`plan_shape` with the start kept where it is.

        Only the search around `start` (`move_start` False): no rings
        250-500 m away and no second search 2 km away (ADR-0040), whose
        routes begin elsewhere and would be dropped anyway; that saves about
        half the time of a plan. The steps after the search repeat
        `plan_shape`'s for this case: optimizer.py belongs to TASK-071 while
        this is written, and a switch there would replace this copy
        (ADR-0071).
        """
        kept = 0.5 if self.one_way else 1.0
        phases = PHASES if not self.one_way else (0.0,)
        if self.word is not None:
            phases = self.word.phases
        graph = source.load(self.area(start))
        check_network(graph, self.activity)
        found = search(
            graph,
            self.shape,
            start,
            self.planned_m,
            reuse_penalty=self.reuse_penalty,
            move_start=False,
            max_tilt_deg=self.max_tilt_deg,
            phases=phases,
            word=self.word,
            doubled=doubled_weight(self.name),
        )
        best = found.best
        gap = (drawn_distance(best.route) - self.planned_m) * kept
        if best.similarity < MIN_SIMILARITY or abs(gap) > DISTANCE_FALLBACK_M:
            raise ShapeNotDrawableError(
                # No position: the message ends in the log (TASK-091).
                f"from this start: similarity {best.similarity:.2f}, "
                f"{gap / 1000:+.1f} km from the target"
            )
        route, placed = best.route, best.shape
        [first], _ = nearest_nodes(graph, [start])
        begins = (graph.nodes[first]["y"], graph.nodes[first]["x"])
        # A word with the pen up ends at its last letter (TASK-197).
        pen_up = self.word is not None and self.word.pen_up
        check = check_begins if pen_up else check_closed
        check(route.points, begins, start, start, START_OFFSET_M)
        if self.one_way:  # the far end is half-way along the shape
            route = first_leg(graph, route, start_at_phase(placed, 0.5)[0])
        outline = latlon_to_local_array(placed[0], np.array(placed))
        corners = [placed[i] for i in corner_indices(outline[:-1])]
        strokes = [
            (placed[i], placed[i + 1]) for i in np.flatnonzero(twice_drawn(outline))
        ]
        size = float(np.hypot(*np.diff(outline, axis=0).T).sum())
        measures = measure(
            graph,
            route.points,
            route.nodes,
            corners,
            CORNER_SPARE * size,
            strokes,
            STROKE_SPARE * size,
        )
        warnings = list(found.warnings)
        warnings.extend(issue.message for issue in validate(measures))
        result = RouteResult(
            points=route.points,
            distance_m=route.distance_m,
            similarity=best.similarity,
            shape=self.name,
            warnings=warnings,
            walks=list(route.walks),
            on_foot=on_foot_stretches(graph, route.nodes),
        )
        if route is not best.route:
            found = replace(found, best=replace(best, route=route))
        return self._as_asked(Plan(result, found, measures))

    def _as_asked(self, plan: Plan) -> Plan:
        if not self.word_result:
            return plan
        result = replace(plan.result, shape=None, word=self.name)
        return replace(plan, result=result)


class OneGraph:
    """GraphLoader for the worker processes: the graph of the start's area,
    whatever the area asked. A nearby start is at most NEARBY_MAX_M from the
    start, so its own area is the start's moved as much, well within its
    margin (AREA_MARGIN_M, 500 m). A worker gets this crop rather than
    reading the whole zone: on the PC of the API, with little memory free,
    four processes holding a zone each slowed down every plan (ADR-0071).

    The graph is pickled once, here, and sent as bytes: pickling it again
    for every worker held up the start's own plan in a big city."""

    def __init__(self, graph: Graph) -> None:
        self._data = pickle.dumps(graph, protocol=pickle.HIGHEST_PROTOCOL)
        self._graph: Graph | None = None

    @property
    def size_mb(self) -> float:
        return len(self._data) / 2**20

    def __getstate__(self) -> bytes:
        return self._data

    def __setstate__(self, data: bytes) -> None:
        self._data, self._graph = data, None

    def load(self, bbox: BBox) -> Graph:
        if self._graph is None:
            self._graph = pickle.loads(self._data)
        return self._graph


@dataclass(frozen=True)
class Nearby:
    """A road node near the start and the way to it along the roads."""

    node: Any
    point: LatLon
    path: list[Any]  # nodes from the start's node to `node`
    length_m: float


def nearby_starts(
    graph: Graph,
    start: LatLon,
    count: int = NEARBY_COUNT,
    min_m: float = NEARBY_MIN_M,
    max_m: float = NEARBY_MAX_M,
) -> list[Nearby]:
    """Up to `count` road nodes min_m-max_m from `start`, one per sector
    around it (the first centred on north), each within APPROACH_MAX_M of the
    start's node along the roads and min_m from the others. In a sector, the
    node whose way is nearest to NEARBY_AIM_M, then nearest to the middle."""
    if count < 1:
        return []
    [home], _ = nearest_nodes(graph, [start])
    lengths, paths = nx.single_source_dijkstra(
        graph, home, cutoff=APPROACH_MAX_M, weight="length"
    )
    reachable = [n for n in lengths if n != home]
    if not reachable:
        return []
    xy = latlon_to_local_array(
        start,
        np.array([(graph.nodes[n]["y"], graph.nodes[n]["x"]) for n in reachable]),
    )
    straight = np.hypot(xy[:, 0], xy[:, 1])
    bearing = np.degrees(np.arctan2(xy[:, 0], xy[:, 1])) % 360.0
    width = 360.0 / count
    sector = np.floor(((bearing + width / 2) % 360.0) / width).astype(int)
    chosen: list[Nearby] = []
    taken: list[np.ndarray] = []
    for k in range(count):
        inside = [
            i
            for i in range(len(reachable))
            if sector[i] == k and min_m <= straight[i] <= max_m
            # Two starts a few metres apart would give the same route.
            and all(np.hypot(*(xy[i] - t)) >= min_m for t in taken)
        ]
        if not inside:
            continue
        centre = k * width
        i = min(
            inside,
            key=lambda j: (
                abs(lengths[reachable[j]] - NEARBY_AIM_M),
                abs((bearing[j] - centre + 180.0) % 360.0 - 180.0),
                str(reachable[j]),
            ),
        )
        node = reachable[i]
        point = (graph.nodes[node]["y"], graph.nodes[node]["x"])
        chosen.append(Nearby(node, point, paths[node], float(lengths[node])))
        taken.append(xy[i])
    return chosen


def with_approach(graph: Graph, plan: Plan, approach: list[Any]) -> Plan:
    """`plan` reached along `approach` (nodes from the start's node to where
    the route begins) and, when the route closes, back along it; with
    one-way streets (the bike network) back along the shortest way allowed,
    which may be another (NetworkXNoPath if there is none), riding rather
    than on foot (`step_cost`, TASK-206). The walks of a
    word with the pen up (TASK-197) move along with the points: the
    approach is run, not walked. The stretches with the bike on foot are
    those of the whole line, approach and way back included."""
    if len(approach) < 2 or plan.search is None:
        return plan
    best = plan.search.best
    route = best.route
    if route.nodes[0] != approach[-1]:
        raise ValueError("the approach does not lead to the start of the route")
    if route.nodes[-1] != route.nodes[0]:
        back = [approach[-1]]
    elif one_way_streets(graph):
        back = nx.shortest_path(graph, approach[-1], approach[0], weight=step_cost)
    else:
        back = approach[::-1]
    nodes = approach[:-1] + list(route.nodes) + back[1:]
    points = [(graph.nodes[approach[0]]["y"], graph.nodes[approach[0]]["x"])]
    for u, v in zip(approach, approach[1:], strict=False):
        points.extend(_edge_points(graph, u, v))
    ahead = len(points) - 1  # points before the route's own first one
    points.extend(plan.result.points[1:])
    for u, v in zip(back, back[1:], strict=False):
        points.extend(_edge_points(graph, u, v))
    distance_m = path_length_m(points)
    walks = [(a + ahead, b + ahead) for a, b in plan.result.walks]
    reached = replace(
        route, points=points, distance_m=distance_m, nodes=nodes, walks=walks
    )
    search = replace(plan.search, best=replace(best, route=reached))
    far = search if plan.far is plan.search else plan.far
    # The approach and the way back may be walked too (TASK-206).
    on_foot = on_foot_stretches(graph, nodes)
    result = replace(
        plan.result,
        points=points,
        distance_m=distance_m,
        walks=walks,
        on_foot=on_foot,
    )
    return replace(plan, result=result, search=search, far=far)


def score(plan: Plan, distance_m: float) -> float:
    """How good a finished plan is, higher is better: its similarity, less
    the distance beyond DISTANCE_TOLERANCE of `distance_m`, weighed as the
    search weighs it against the shape (optimizer.search). Within the
    tolerance the shape alone counts: the user judges the drawing, and
    TASK-075's cuts closest to 10 km were not the ones judged best. Where
    the route starts does not count here (`_choose`), nor do the walks of a
    word with the pen up (TASK-197)."""
    result = plan.result
    ratio = drawn_m(result.points, result.distance_m, result.walks) / distance_m
    whiskers = doubled_weight(plan.result.shape or "") / W_SHAPE
    return (
        plan.result.similarity
        - W_DISTANCE / W_SHAPE * max(0.0, abs(ratio - 1) - DISTANCE_TOLERANCE)
        - whiskers * extra_doubled_share(plan.result.points, _placed(plan))
    )


def _placed(plan: Plan) -> list[LatLon] | None:
    """The shape as the search placed it, strokes and all; None without a
    search."""
    return None if plan.search is None else list(plan.search.best.shape)


def _good(plan: Plan | None) -> bool:
    """A plan whose search met both its thresholds without moving the start
    (optimizer.search): the user does not wait on the nearby starts for it,
    as the search does not trace more once it has one."""
    return (
        plan is not None
        and plan.search is not None
        and plan.search.converged
        and plan.far is None
        and plan.search.best.offset_m == 0
    )


def _moved(plan: Plan) -> bool:
    return plan.search is not None and plan.search.best.offset_m > 0


def free_memory_mb() -> float | None:
    """Memory a new process can take now, in MB; None where it is not
    known."""
    if sys.platform == "win32":
        import ctypes

        class Status(ctypes.Structure):
            _fields_ = [("length", ctypes.c_ulong), ("load", ctypes.c_ulong)] + [
                (name, ctypes.c_ulonglong)
                for name in (
                    "total",
                    "free",
                    "total_page",
                    "free_page",
                    "total_virtual",
                    "free_virtual",
                    "free_extended",
                )
            ]

        status = Status()
        status.length = ctypes.sizeof(status)
        kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
        if not kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
            return None
        return status.free / 2**20
    if sys.platform.startswith("linux"):
        # Not the free pages: they leave out the page cache (memory.py).
        available = available_mb()
        if available is not None:
            return available
    try:
        return os.sysconf("SC_AVPHYS_PAGES") * os.sysconf("SC_PAGE_SIZE") / 2**20
    except (ValueError, OSError, AttributeError):
        return None


def workers_that_fit(wanted: int, pickled_mb: float, free_mb: float | None) -> int:
    """How many of `wanted` workers fit in `free_mb`, all of them when the
    free memory is not known."""
    if free_mb is None:
        return wanted
    each = WORKER_BASE_MB + WORKER_PER_MB * pickled_mb
    return max(0, min(wanted, int((free_mb - MEMORY_RESERVE_MB) // each)))


def _lower_priority() -> None:
    """Worker initializer: the start's own plan, in the calling process,
    keeps its speed; the nearby ones use what is left."""
    if sys.platform == "win32":
        import ctypes

        below_normal = 0x4000  # BELOW_NORMAL_PRIORITY_CLASS
        kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
        kernel32.SetPriorityClass(kernel32.GetCurrentProcess(), below_normal)
    else:
        os.nice(5)


def _plan_in_worker(
    job: Job, start: LatLon, source: GraphLoader
) -> tuple[Plan | str, float]:
    """One nearby plan, in a worker process: the plan, or why there is
    none; and how long it took."""
    began = time.perf_counter()
    try:
        outcome: Plan | str = job.here(start, source)
    except (ShapeNotDrawableError, ValueError) as exc:
        outcome = f"{type(exc).__name__}: {exc}"
    return outcome, time.perf_counter() - began


@dataclass
class Tried:
    """One start that was planned, for the log and the samples."""

    start: LatLon
    approach_m: float
    plan: Plan | None  # with the approach; None when dropped
    score: float | None
    seconds: float | None
    note: str = ""
    error: ShapeNotDrawableError | None = None

    @property
    def away_m(self) -> float:
        """How far from the user the route begins: the approach of a nearby
        start, or how far the search moved the start."""
        moved = 0.0
        if self.plan is not None and self.plan.search is not None:
            moved = self.plan.search.best.offset_m
        return self.approach_m + moved


@dataclass
class NearbyPlan:
    plan: Plan
    chosen: int  # index in `tried`; 0 is the start itself
    tried: list[Tried]
    # The graph of a nearby start's route and of its approach, for the
    # directions: the start's own; None when the start's plan is kept, whose
    # graphs the source saw load as they do without nearby starts.
    graph: Graph | None = None
    skipped: str = ""  # why fewer nearby starts were planned, if so


class _First:
    """The source, with the graph already loaded for the start's area
    handed out again instead of cropped twice."""

    def __init__(self, source: GraphLoader, bbox: BBox, graph: Graph) -> None:
        self._source, self._bbox, self._graph = source, bbox, graph

    def load(self, bbox: BBox) -> Graph:
        if bbox == self._bbox:
            return self._graph
        return self._source.load(bbox)


def plan_nearby(
    job: Job,
    start: LatLon,
    source: GraphLoader,
    *,
    count: int = NEARBY_COUNT,
    grace_s: float = NEARBY_GRACE_S,
    budget_s: float = NEARBY_BUDGET_S,
    good_grace_s: float = NEARBY_GOOD_GRACE_S,
    processes: bool = True,
    free_mb: Callable[[], float | None] = free_memory_mb,
) -> NearbyPlan:
    """The best of `job` planned from `start` and from the nearby starts.

    `source` loads for the start, in this process: it may download, and the
    API reports it. The nearby starts are planned at the same time in
    `count` worker processes, on the start's graph (OneGraph); with
    `processes` False they are planned here after the start (the tests).
    With `count` 0 only the start is planned; also on a graph of more than
    NEARBY_MAX_NODES, and with fewer workers when `free_mb` says they do not
    fit. Raises the start's ShapeNotDrawableError when no start can draw the
    shape.
    """
    began = time.monotonic()
    distance_m = float(job.distance_m)
    area = job.area(start)
    graph = source.load(area)
    skipped = ""
    if len(graph) > NEARBY_MAX_NODES:
        count, skipped = 0, f"no nearby starts: {len(graph)} nodes"
    nearby = nearby_starts(graph, start, count)
    here = OneGraph(graph) if nearby else None
    if here is not None and processes:
        fit = workers_that_fit(len(nearby), here.size_mb, free_mb())
        if fit < len(nearby):
            skipped = f"{len(nearby) - fit} nearby starts left: memory"
            nearby = nearby[:fit]
    if skipped:
        log.info(skipped)
    pool = None
    pending: list[AsyncResult[tuple[Plan | str, float]]] = []
    if nearby and processes:
        pool = multiprocessing.get_context("spawn").Pool(
            len(nearby), initializer=_lower_priority
        )
        pending = [
            pool.apply_async(_plan_in_worker, (job, n.point, here)) for n in nearby
        ]
    try:
        tried = [_start_tried(job, start, _First(source, area, graph), distance_m)]
        done = time.monotonic()
        deadline = max(done, min(done + grace_s, began + budget_s))
        if _good(tried[0].plan):
            # Waited for briefly, for the alternatives only (TASK-093).
            deadline = min(deadline, done + good_grace_s)
        for i, n in enumerate(nearby):
            if pool is None:
                assert here is not None  # there are nearby starts
                outcome = _plan_in_worker(job, n.point, here)
            else:
                try:
                    outcome = pending[i].get(max(0.0, deadline - time.monotonic()))
                except multiprocessing.TimeoutError:
                    late = f"still running {deadline - began:.0f} s in"
                    outcome = (late, float("nan"))
            tried.append(_nearby_tried(graph, n, *outcome, distance_m))
    finally:
        if pool is not None:
            pool.terminate()  # drops the late ones
            pool.join()
    for i, t in enumerate(tried):
        what = t.note or f"score {t.score:.3f}, approach {t.approach_m:.0f} m"
        # Not t.start: where the user is stays out of the log (TASK-091).
        log.info("start %d: %s", i, what)
    chosen = _choose(tried)
    if chosen is None:
        first = tried[0]
        raise first.error or ShapeNotDrawableError(first.note)
    plan = tried[chosen].plan
    assert plan is not None
    # The other starts' routes, best first, to choose from (TASK-093).
    others = sorted(
        (
            (t.score, -t.away_m, -i, t.plan)
            for i, t in enumerate(tried)
            if i != chosen and t.plan is not None and t.score is not None
        ),
        key=lambda other: other[:3],
        reverse=True,
    )
    plan = replace(plan, alternatives=alternatives(plan, [o[3] for o in others]))
    return NearbyPlan(plan, chosen, tried, None if chosen == 0 else graph, skipped)


def _choose(tried: list[Tried]) -> int | None:
    """The best shape; of those within TIE_MARGIN of it, the one that
    begins nearest the user, then the first tried."""
    scored = [i for i, t in enumerate(tried) if t.score is not None]
    if not scored:
        return None
    top = max(tried[i].score for i in scored)  # type: ignore[type-var]
    equal = [i for i in scored if tried[i].score >= top - TIE_MARGIN]  # type: ignore[operator]
    return min(equal, key=lambda i: (tried[i].away_m, i))


def _start_tried(
    job: Job, start: LatLon, source: GraphLoader, distance_m: float
) -> Tried:
    began = time.perf_counter()
    try:
        plan = job.plan(start, source)
    except ShapeNotDrawableError as exc:
        seconds = time.perf_counter() - began
        return Tried(start, 0.0, None, None, seconds, str(exc), exc)
    seconds = time.perf_counter() - began
    return Tried(start, 0.0, plan, score(plan, distance_m), seconds)


def _nearby_tried(
    graph: Graph,
    nearby: Nearby,
    outcome: Plan | str,
    seconds: float,
    distance_m: float,
) -> Tried:
    def dropped(note: str) -> Tried:
        return Tried(nearby.point, nearby.length_m, None, None, seconds, note)

    if isinstance(outcome, str):
        return dropped(outcome)
    if _moved(outcome):
        # The shape does not close here either: the start's own plan says
        # where it does, measured from the start itself.
        return dropped("the search moved this start")
    if outcome.search is None or outcome.search.best.route.nodes[0] != nearby.node:
        # Not the node asked for (a small piece the crop left out): the way
        # there is not known.
        return dropped("the route begins elsewhere")
    try:
        plan = with_approach(graph, outcome, nearby.path)
    except nx.NetworkXNoPath:  # one-way streets only
        return dropped("no way back to the start")
    return Tried(nearby.point, nearby.length_m, plan, score(plan, distance_m), seconds)
