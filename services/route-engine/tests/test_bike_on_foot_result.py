"""Where the bike is walked, in the result (TASK-206 part B, ADR-0167).

`RouteResult.on_foot` says which stretches of the points are walked with
the bike on foot: [from, to] indices, both included, as the `walks` of a
word with the pen up. The app draws them apart and the voice announces
them (part C). No network: the town of test_bike_network.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import networkx as nx
import pytest
from shapely.geometry import LineString
from test_bike_network import TOWN
from test_bike_on_foot import _stub, bike_town, downloads  # noqa: F401

from route_engine.geo import LatLon, local_to_latlon, path_length_m
from route_engine.models import RouteRequest, RouteResult
from route_engine.nearby_starts import ShapeJob, plan_nearby, with_approach
from route_engine.network import (
    BIKE_NETWORK_NAME,
    Graph,
    NetworkRoute,
    OsmnxSource,
    _edge_coords,
    on_foot_edge,
    on_foot_stretches,
)
from route_engine.optimizer import Attempt, Placement, Plan, Search, plan_route
from route_engine.pen_up import walks_problem


def _segments(graph: Graph) -> dict[tuple[LatLon, LatLon], set[bool]]:
    """Each piece of every edge, from point to point in its direction, and
    whether it is walked: what a route's points are made of."""
    pieces: dict[tuple[LatLon, LatLon], set[bool]] = {}
    for u, v, data in graph.edges(data=True):
        coords = _edge_coords(graph, u, v, data)
        for a, b in zip(coords, coords[1:], strict=False):
            pieces.setdefault((a, b), set()).add(on_foot_edge(data))
    return pieces


def _assert_on_foot_is_where_walked(graph: Graph, result: RouteResult) -> None:
    """Every piece of the route inside an `on_foot` stretch is a walked edge's,
    every piece outside a ridden one's."""
    assert walks_problem(result.on_foot, len(result.points)) is None
    walked = {i for a, b in result.on_foot for i in range(a, b)}
    pieces = _segments(graph)
    points = result.points
    for i, piece in enumerate(zip(points, points[1:], strict=False)):
        assert (i in walked) in pieces[piece], i


def _with_geometry(walk_first: bool) -> Graph:
    """A bike graph 1 → 2 → 3 → 4 → 5: the edge 2 → 3 bends through two
    points of its own; 2 → 3 and 3 → 4 walked, and 1 → 2 too when
    `walk_first`; 4 → 5 ridden."""
    graph: Graph = nx.MultiDiGraph(
        crs="epsg:4326", network=BIKE_NETWORK_NAME, on_foot=True
    )
    xs = {1: 0.0, 2: 100.0, 3: 300.0, 4: 400.0, 5: 500.0}
    for node, x in xs.items():
        lat, lon = local_to_latlon(TOWN, x, 0.0)
        graph.add_node(node, y=lat, x=lon)

    def lonlat(x: float, y: float) -> tuple[float, float]:
        lat, lon = local_to_latlon(TOWN, x, y)
        return lon, lat

    bend = LineString(
        [lonlat(100, 0), lonlat(150, 30), lonlat(250, 30), lonlat(300, 0)]
    )
    graph.add_edge(1, 2, length=100.0, highway="footway", walk=walk_first)
    graph.add_edge(2, 3, length=210.0, highway="footway", walk=True, geometry=bend)
    graph.add_edge(3, 4, length=100.0, highway="footway", walk=True)
    graph.add_edge(4, 5, length=100.0, highway="residential", walk=False)
    return graph


def test_a_walked_edge_is_a_stretch_of_the_points() -> None:
    # Points 0, 1, 2 for the nodes 1, 2, 3: the second step walked.
    assert on_foot_stretches(_stub(walk=True, marked=True), [1, 2, 3]) == [(1, 2)]


def test_walked_edges_in_a_row_are_one_stretch_through_their_own_points() -> None:
    # Points: 0 node 1, 1 node 2, 2-3 the bend, 4 node 3, 5 node 4, 6 node 5.
    graph = _with_geometry(walk_first=False)
    assert on_foot_stretches(graph, [1, 2, 3, 4, 5]) == [(1, 5)]
    assert on_foot_stretches(_with_geometry(walk_first=True), [1, 2, 3, 4, 5]) == [
        (0, 5)
    ]
    # A ridden edge between two walked ones: two stretches.
    graph.add_edge(5, 6, length=100.0, highway="footway", walk=True)
    lat, lon = local_to_latlon(TOWN, 600.0, 0.0)
    graph.add_node(6, y=lat, x=lon)
    assert on_foot_stretches(graph, [1, 2, 3, 4, 5, 6]) == [(1, 5), (6, 7)]


def test_a_route_ridden_all_the_way_has_no_stretch_on_foot() -> None:
    assert on_foot_stretches(_stub(walk=False, marked=False), [1, 2, 3]) == []
    assert on_foot_stretches(_stub(walk=True, marked=True), [1, 2]) == []
    assert on_foot_stretches(_stub(walk=True, marked=True), [1]) == []


def test_a_cycling_route_says_where_it_walks(
    tmp_path: Path, bike_town: Graph  # noqa: F811
) -> None:
    request = RouteRequest(
        start=TOWN, shape="circle", distance_m=10_000, activity="cycling"
    )
    plan = plan_route(request, OsmnxSource.for_activity(tmp_path, "cycling"))
    result = plan.result
    assert result.on_foot  # one block, 300 m of 10 km (test_bike_on_foot)
    _assert_on_foot_is_where_walked(bike_town, result)
    walked_m = sum(path_length_m(result.points[a : b + 1]) for a, b in result.on_foot)
    assert walked_m == pytest.approx(plan.checks["on_foot"], rel=0.02)


def test_from_a_nearby_start_the_approach_is_in_the_stretches_too(
    tmp_path: Path, bike_town: Graph  # noqa: F811
) -> None:
    # As the API plans (plan_nearby), alternatives included: each result's
    # stretches are those of its own points, approach and way back too.
    request = RouteRequest(
        start=TOWN, shape="circle", distance_m=10_000, activity="cycling"
    )
    source = OsmnxSource.for_activity(tmp_path, "cycling")
    found = plan_nearby(
        ShapeJob.of_request(request), request.start, source, processes=False
    )
    results = [found.plan.result, *(p.result for p in found.plan.alternatives)]
    assert any(result.on_foot for result in results)
    for result in results:
        _assert_on_foot_is_where_walked(bike_town, result)


def _approached() -> tuple[Graph, list[Any]]:
    """A bike graph: a footway A - B, walked both ways, to the road B - C,
    and a square C D E F ridden but for E → F, walked."""
    graph: Graph = nx.MultiDiGraph(
        crs="epsg:4326", network=BIKE_NETWORK_NAME, on_foot=True
    )
    at = {
        "A": (0.0, 0.0),
        "B": (0.0, 50.0),
        "C": (0.0, 100.0),
        "D": (100.0, 100.0),
        "E": (100.0, 200.0),
        "F": (0.0, 200.0),
    }
    for node, (x, y) in at.items():
        lat, lon = local_to_latlon(TOWN, x, y)
        graph.add_node(node, y=lat, x=lon)
    for u, v, walk in (
        ("A", "B", True),
        ("B", "A", True),
        ("B", "C", False),
        ("C", "B", False),
        ("C", "D", False),
        ("D", "E", False),
        ("E", "F", True),
        ("F", "C", False),
    ):
        graph.add_edge(u, v, length=100.0, highway="residential", walk=walk)
    return graph, ["C", "D", "E", "F", "C"]


def test_the_approach_and_the_way_back_are_walked_where_their_edges_are() -> None:
    graph, loop = _approached()
    points = [(graph.nodes[n]["y"], graph.nodes[n]["x"]) for n in loop]
    route = NetworkRoute(points, path_length_m(points), nodes=loop)
    placement = Placement(points[0], 0.0, 0.0, 0.0)
    best = Attempt(placement, 1.0, points, route, 0.9, 1.0, 0.0)
    own = on_foot_stretches(graph, loop)
    assert own == [(2, 3)]  # E → F
    result = RouteResult(points, route.distance_m, 0.9, "square", on_foot=own)
    plan = Plan(result, Search(best, [best], False))
    reached = with_approach(graph, plan, ["A", "B", "C"]).result
    # A B C D E F C B A: the footway out and back, E → F moved by two.
    assert reached.on_foot == [(0, 1), (4, 5), (7, 8)]
    _assert_on_foot_is_where_walked(graph, reached)


def test_a_run_walks_nowhere(tmp_path: Path, downloads: Any) -> None:  # noqa: F811
    request = RouteRequest(start=TOWN, shape="circle", distance_m=5_000)
    plan = plan_route(request, OsmnxSource(tmp_path))
    assert plan.result.on_foot == []
    assert all(other.result.on_foot == [] for other in plan.alternatives)
