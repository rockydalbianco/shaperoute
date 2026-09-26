"""Nearby starts (TASK-076): which nodes, the approach, the choice.

On a synthetic street grid with a fake job, so no plan is searched: every
start gets a square loop from its nearest node, with a similarity chosen by
the test.
"""

from dataclasses import dataclass
from typing import Any

import networkx as nx
import pytest

from route_engine import nearby_starts as nearby_module
from route_engine import optimizer
from route_engine.geo import LatLon, haversine_m, local_to_latlon, path_length_m
from route_engine.models import RouteRequest, RouteResult
from route_engine.nearby_starts import (
    MEMORY_RESERVE_MB,
    SWITCH_MARGIN,
    WORKER_BASE_MB,
    WORKER_PER_MB,
    OneGraph,
    ShapeJob,
    Tried,
    _choose,
    free_memory_mb,
    nearby_starts,
    plan_nearby,
    score,
    with_approach,
    workers_that_fit,
)
from route_engine.network import BBox, Graph, NetworkRoute, nearest_nodes
from route_engine.optimizer import (
    MIN_SIMILARITY,
    Attempt,
    Placement,
    Plan,
    Search,
    ShapeNotDrawableError,
)

ORIGIN = (46.0122, 11.2986)
STEP_M = 30.0
LOOP_M = 4 * STEP_M
# The fake job's loops: long enough that 120 m of approach stays within the
# distance tolerance.
SIDE = 10
JOB_LOOP_M = 4 * SIDE * STEP_M


def _grid(half: int = 20) -> nx.MultiDiGraph:
    """Streets every STEP_M metres around ORIGIN; node (i, j) is i steps
    east and j north."""
    graph = nx.MultiDiGraph()
    for i in range(-half, half + 1):
        for j in range(-half, half + 1):
            lat, lon = local_to_latlon(ORIGIN, i * STEP_M, j * STEP_M)
            graph.add_node((i, j), y=lat, x=lon)
    for i in range(-half, half + 1):
        for j in range(-half, half + 1):
            for b in ((i + 1, j), (i, j + 1)):
                if b in graph:
                    graph.add_edge((i, j), b, length=STEP_M)
                    graph.add_edge(b, (i, j), length=STEP_M)
    return graph


@dataclass(frozen=True)
class GridSource:
    """GraphLoader that pickles: builds the grid on each load."""

    def load(self, bbox: BBox) -> Graph:
        return _grid()


@dataclass(frozen=True)
class LoopJob:
    """A Job whose plan is a square loop SIDE steps east and north of the
    start's node, with the similarity given for that node (default
    `otherwise`)."""

    similarity: tuple[tuple[tuple[int, int], float], ...] = ()
    otherwise: float = 0.80
    moved: tuple[tuple[int, int], ...] = ()
    refused: tuple[tuple[int, int], ...] = ()
    distance_m: int = int(JOB_LOOP_M + 60)
    converged: bool = False  # as the search says of a good plan

    def area(self, start: LatLon) -> BBox:
        return (0.0, 0.0, 0.0, 0.0)

    def plan(self, start: LatLon, source: Any) -> Plan:
        graph = source.load(self.area(start))
        [(i, j)], _ = nearest_nodes(graph, [start])
        if (i, j) in self.refused:
            raise ShapeNotDrawableError(f"no heart at {(i, j)}")
        east = [(i + k, j) for k in range(SIDE)]
        north = [(i + SIDE, j + k) for k in range(SIDE)]
        west = [(i + SIDE - k, j + SIDE) for k in range(SIDE)]
        south = [(i, j + SIDE - k) for k in range(SIDE + 1)]
        nodes = east + north + west + south
        return _plan(
            graph,
            nodes,
            dict(self.similarity).get((i, j), self.otherwise),
            300.0 if (i, j) in self.moved else 0.0,
            self.converged,
        )

    here = plan


def _latlon(graph: Graph, node: Any) -> LatLon:
    return graph.nodes[node]["y"], graph.nodes[node]["x"]


def _plan(
    graph: Graph,
    nodes: list[Any],
    similarity: float,
    offset_m: float,
    converged: bool = False,
) -> Plan:
    points = [_latlon(graph, n) for n in nodes]
    route = NetworkRoute(points, path_length_m(points), nodes=nodes)
    placement = Placement(points[0], offset_m, 0.0, 0.0)
    best = Attempt(placement, 1.0, points, route, similarity, 1.0, 0.0)
    result = RouteResult(points, route.distance_m, similarity, "square")
    return Plan(result, Search(best, [best], converged))


def test_nearby_starts_are_one_road_node_per_sector_near_the_aim() -> None:
    graph = _grid()
    chosen = nearby_starts(graph, ORIGIN, count=4)
    assert [n.node for n in chosen] == [(0, 2), (2, 0), (0, -2), (-2, 0)]
    for n in chosen:
        assert n.path[0] == (0, 0) and n.path[-1] == n.node
        assert n.length_m == pytest.approx(60.0)
        assert 25.0 <= haversine_m(ORIGIN, n.point) <= 100.0


def test_nearby_starts_skip_nodes_far_away_along_the_roads() -> None:
    """A river north of the start: the bank opposite is 60 m away in a
    straight line and 360 m along the roads, over the bridge."""
    graph = _grid()
    for i in range(-20, 20):  # every crossing but the one at i = 20
        for u, v in (((i, 1), (i, 2)), ((i, 2), (i, 1))):
            graph.remove_edge(u, v)
    north = nearby_starts(graph, ORIGIN, count=4)[0]
    assert north.node[1] <= 1  # on this bank
    assert north.length_m <= 150.0


def test_nearby_starts_keep_apart() -> None:
    chosen = nearby_starts(_grid(), ORIGIN, count=8)
    for a in chosen:
        for b in chosen:
            if a is not b:
                assert haversine_m(a.point, b.point) >= 25.0


def test_with_approach_begins_and_ends_at_the_start() -> None:
    graph = _grid()
    loop = [(0, 2), (1, 2), (1, 3), (0, 3), (0, 2)]
    plan = _plan(graph, loop, 0.9, 0.0)
    reached = with_approach(graph, plan, [(0, 0), (0, 1), (0, 2)])
    home = _latlon(graph, (0, 0))
    assert reached.result.points[0] == home and reached.result.points[-1] == home
    assert reached.result.distance_m == pytest.approx(LOOP_M + 2 * 60.0, rel=1e-3)
    assert reached.search is not None
    route = reached.search.best.route
    assert route.nodes == [(0, 0), (0, 1), *loop, (0, 1), (0, 0)]
    assert route.points == reached.result.points
    assert reached.result.similarity == 0.9  # the shape is the same


def test_with_approach_refuses_a_way_to_elsewhere() -> None:
    graph = _grid()
    plan = _plan(graph, [(0, 2), (1, 2), (1, 3), (0, 3), (0, 2)], 0.9, 0.0)
    with pytest.raises(ValueError):
        with_approach(graph, plan, [(0, 0), (1, 0)])


def _tried(*scores: float | None) -> list[Tried]:
    return [Tried(ORIGIN, 0.0, None, s, 1.0) for s in scores]


def test_choose_keeps_the_start_unless_a_nearby_one_is_clearly_better() -> None:
    assert _choose(_tried(0.85, 0.85 + SWITCH_MARGIN / 2)) == 0
    assert _choose(_tried(0.85, 0.85 + SWITCH_MARGIN, 0.90)) == 2
    assert _choose(_tried(None, 0.70)) == 1
    assert _choose(_tried(None, None)) is None


def test_score_counts_distance_only_beyond_the_tolerance() -> None:
    graph = _grid()
    plan = _plan(graph, [(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)], 0.9, 0.0)
    assert score(plan, LOOP_M * 1.05) == pytest.approx(0.9)
    assert score(plan, LOOP_M / 1.5) < 0.9 - 0.05


def test_plan_nearby_takes_a_nearby_start_that_draws_better() -> None:
    job = LoopJob(similarity=(((2, 0), 0.95),))
    found = plan_nearby(job, ORIGIN, GridSource(), count=4, processes=False)
    assert found.tried[found.chosen].start == _latlon(_grid(), (2, 0))
    result = found.plan.result
    home = _latlon(_grid(), (0, 0))
    assert result.points[0] == home and result.points[-1] == home
    assert result.distance_m == pytest.approx(JOB_LOOP_M + 2 * 60.0, rel=1e-3)
    assert result.similarity == 0.95


def test_plan_nearby_keeps_the_start_when_nothing_is_clearly_better() -> None:
    job = LoopJob(similarity=(((2, 0), 0.81),))
    found = plan_nearby(job, ORIGIN, GridSource(), count=4, processes=False)
    assert found.chosen == 0
    assert found.plan.result.points[0] == _latlon(_grid(), (0, 0))


def test_plan_nearby_drops_starts_the_search_moved() -> None:
    job = LoopJob(similarity=(((2, 0), 0.99),), moved=((2, 0),))
    found = plan_nearby(job, ORIGIN, GridSource(), count=4, processes=False)
    assert found.chosen == 0
    assert "moved" in found.tried[2].note


def test_plan_nearby_draws_from_nearby_when_the_start_cannot() -> None:
    job = LoopJob(refused=((0, 0),))
    found = plan_nearby(job, ORIGIN, GridSource(), processes=False)
    assert found.chosen != 0
    assert found.plan.result.points[0] == _latlon(_grid(), (0, 0))


def test_plan_nearby_raises_the_start_error_when_no_start_draws() -> None:
    refused = tuple((i, j) for i in range(-20, 21) for j in range(-20, 21))
    with pytest.raises(ShapeNotDrawableError, match=r"\(0, 0\)"):
        plan_nearby(
            LoopJob(refused=refused),
            ORIGIN,
            GridSource(),
            processes=False,
        )


def test_plan_nearby_with_no_count_plans_the_start_only() -> None:
    found = plan_nearby(LoopJob(), ORIGIN, GridSource(), count=0)
    assert len(found.tried) == 1 and found.chosen == 0


def test_plan_nearby_in_worker_processes() -> None:
    """Room enough for the workers to start on a busy machine."""
    job = LoopJob(similarity=(((0, 2), 0.95),))
    found = plan_nearby(
        job,
        ORIGIN,
        GridSource(),
        count=2,
        grace_s=120,
        budget_s=120,
        free_mb=lambda: None,
    )
    assert found.tried[found.chosen].start == _latlon(_grid(), (0, 2))
    assert all(t.seconds is not None for t in found.tried)


def test_here_plans_from_the_start_it_is_given() -> None:
    """A real search on the grid: the route begins and ends at that node,
    and no attempt moved it."""
    start = _latlon(_grid(), (3, -2))
    job = ShapeJob.of_request(
        RouteRequest(start=start, shape="circle", distance_m=3000)
    )
    plan = job.here(start, GridSource())
    assert plan.search is not None and plan.far is None
    assert all(a.offset_m == 0 for a in plan.search.attempts)
    assert plan.search.best.route.nodes[0] == (3, -2)
    assert plan.result.points[0] == plan.result.points[-1] == start
    assert plan.result.similarity >= MIN_SIMILARITY
    assert plan.result.shape == "circle" and plan.checks


def test_here_matches_plan_shape_when_that_may_not_move_the_start(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """`here` repeats what plan_shape does after its search: with the
    search kept at the start, both give the same result and checks."""
    start = _latlon(_grid(), (3, -2))
    job = ShapeJob.of_request(
        RouteRequest(start=start, shape="circle", distance_m=3000)
    )
    monkeypatch.setattr(optimizer, "candidate_starts", lambda s: [(s, 0.0)])
    monkeypatch.setattr(optimizer, "far_starts", lambda s: [(s, 0.0)])
    plan, here = job.plan(start, GridSource()), job.here(start, GridSource())
    assert here.result == plan.result
    assert here.checks == plan.checks


def test_a_word_from_the_api_comes_back_as_a_word() -> None:
    job = ShapeJob.of_request(RouteRequest(start=ORIGIN, word="ciao", distance_m=15000))
    assert job.name == "CIAO" and job.word is not None and job.word_result
    plan = _plan(_grid(), [(0, 0), (1, 0), (1, 1), (0, 0)], 0.9, 0.0)
    result = job._as_asked(plan).result
    assert result.shape is None and result.word == "CIAO"


def test_a_nearby_choice_brings_the_graph_of_its_route() -> None:
    job = LoopJob(similarity=(((2, 0), 0.95),))
    found = plan_nearby(job, ORIGIN, GridSource(), count=4, processes=False)
    assert found.chosen != 0 and found.graph is not None
    assert found.plan.search is not None
    assert all(n in found.graph for n in found.plan.search.best.route.nodes)
    kept = plan_nearby(LoopJob(), ORIGIN, GridSource(), count=4, processes=False)
    assert kept.chosen == 0 and kept.graph is None


def test_nearby_starts_past_the_budget_are_dropped() -> None:
    job = LoopJob(similarity=(((0, 2), 0.95),))
    found = plan_nearby(
        job, ORIGIN, GridSource(), count=2, budget_s=0, free_mb=lambda: None
    )
    assert found.chosen == 0
    assert all("still running" in t.note for t in found.tried[1:])


def test_a_good_start_waits_for_nobody() -> None:
    """The start's plan is good (`converged`), so a nearby one that is not
    ready at once is left, better as it may be."""
    job = SlowNearbyJob(similarity=(((0, 2), 0.99),), converged=True)
    found = plan_nearby(
        job,
        ORIGIN,
        GridSource(),
        count=2,
        grace_s=120,
        budget_s=120,
        free_mb=lambda: None,
    )
    assert found.chosen == 0
    assert all("still running" in t.note for t in found.tried[1:])


def test_one_graph_pickles_as_the_same_graph() -> None:
    import pickle

    graph = _grid(2)
    copy = pickle.loads(pickle.dumps(OneGraph(graph))).load((0.0, 0.0, 0.0, 0.0))
    assert set(copy.nodes) == set(graph.nodes)
    assert copy.number_of_edges() == graph.number_of_edges()


@dataclass(frozen=True)
class SlowNearbyJob(LoopJob):
    """A LoopJob whose nearby plans take a while."""

    def here(self, start: LatLon, source: Any) -> Plan:
        import time

        time.sleep(3)
        return self.plan(start, source)


def test_workers_fit_in_the_free_memory() -> None:
    assert workers_that_fit(3, 10.0, None) == 3
    each = WORKER_BASE_MB + WORKER_PER_MB * 10.0
    assert workers_that_fit(3, 10.0, MEMORY_RESERVE_MB + 2.5 * each) == 2
    assert workers_that_fit(3, 10.0, MEMORY_RESERVE_MB / 2) == 0


def test_no_memory_no_workers_but_the_start_still_plans() -> None:
    found = plan_nearby(LoopJob(), ORIGIN, GridSource(), count=2, free_mb=lambda: 0.0)
    assert len(found.tried) == 1 and "memory" in found.skipped


def test_free_memory_is_known_here() -> None:
    free = free_memory_mb()
    assert free is None or free > 0


def test_a_big_graph_gets_no_nearby_starts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(nearby_module, "NEARBY_MAX_NODES", 10)
    found = plan_nearby(LoopJob(), ORIGIN, GridSource(), processes=False)
    assert len(found.tried) == 1 and "nodes" in found.skipped
