"""Route jobs answer with the route's directions (TASK-048), computed on the
graph the route was traced on."""

from __future__ import annotations

import time
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from route_engine.models import RouteRequest, RouteResult
from route_engine.network import BBox, FileSource, Graph
from route_engine.optimizer import GraphLoader, Plan

from shaperoute_api.jobs import RouteJobs, with_directions

REPO = Path(__file__).resolve().parents[3]
GRAPH = REPO / "services" / "route-engine" / "tests" / "fixtures"
GRAPH /= "directions_junctions.graphml"
# Nodes of that graph (tests/fixtures/make_directions_graph.py): W, T, E, F, H.
ROUTE = [1, 2, 3, 4, 10]
REQUEST = RouteRequest(start=(46.0, 11.0), shape="heart", distance_m=5000)
RESULT = RouteResult(
    points=[(46.0, 11.0)], distance_m=770.0, similarity=0.9, shape="heart"
)


def _plan(nodes: list[Any], far: bool = False) -> Plan:
    search: Any = SimpleNamespace(
        best=SimpleNamespace(route=SimpleNamespace(nodes=nodes))
    )
    return Plan(result=RESULT, search=search, far=search if far else None)


def _graph() -> Graph:
    return FileSource(GRAPH).load((0.0, 0.0, 0.0, 0.0))


def test_the_result_gets_the_directions_of_its_nodes() -> None:
    result = with_directions(_plan(ROUTE), [_graph()])
    said = [(d.node, d.turn, d.street) for d in result.directions]
    assert said == [
        (1, "depart", "Via Roma"),
        (3, "straight", "Corso Italia"),
        (4, "right", "SP12"),
    ]
    assert result.points == RESULT.points


def test_a_route_from_the_far_search_uses_the_last_graph() -> None:
    empty = Graph()  # the first graph does not have the route's nodes
    result = with_directions(_plan(ROUTE, far=True), [empty, _graph()])
    assert [d.turn for d in result.directions] == ["depart", "straight", "right"]


def test_a_route_that_was_not_searched_has_no_directions() -> None:
    plan = Plan(result=RESULT, search=None)
    assert with_directions(plan, [_graph()]).directions == []


class _FileGraphs:
    def load(self, bbox: BBox) -> Graph:
        return _graph()


def test_a_finished_job_carries_the_directions() -> None:
    def planner(request: RouteRequest, source: GraphLoader) -> Plan:
        source.load((46.0, 11.0, 46.1, 11.1))
        return _plan(ROUTE)

    jobs = RouteJobs(_FileGraphs(), planner)
    try:
        job = jobs.submit(REQUEST)
        deadline = time.monotonic() + 5
        while (done := jobs.get(job.job_id)) is not None and done.status != "done":
            assert time.monotonic() < deadline, "the job did not finish"
            time.sleep(0.01)
        assert done is not None and done.result is not None
        assert [d.turn for d in done.result.directions] == [
            "depart",
            "straight",
            "right",
        ]
    finally:
        jobs.shutdown()
