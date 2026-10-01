from pathlib import Path
from typing import Any

import networkx as nx
import pytest

from route_engine.directions import guidance
from route_engine.geo import LatLon, local_to_latlon
from route_engine.models import InvalidRequestError
from route_engine.network import FileSource, _edge_points, _node_latlon
from route_engine.route_nodes import MATCH_M, RouteNotOnGraphError, nodes_along

FIXTURES = Path(__file__).parent / "fixtures"
ANYWHERE = (0.0, 0.0, 0.0, 0.0)  # FileSource ignores the area
ORIGIN: LatLon = (46.0, 11.0)


def points_of(graph: nx.MultiDiGraph, nodes: list[Any]) -> list[LatLon]:
    """The points the engine draws for `nodes` (network.snap_to_network)."""
    points = [_node_latlon(graph, nodes[0])]
    for u, v in zip(nodes, nodes[1:], strict=False):
        points.extend(_edge_points(graph, u, v))
    return points


def grid() -> nx.MultiDiGraph:
    """Nine nodes 100 m apart, rows 1-2-3, 4-5-6, 7-8-9 from the south,
    joined both ways to the nodes beside them."""
    graph = nx.MultiDiGraph()
    for node in range(1, 10):
        row, col = divmod(node - 1, 3)
        lat, lon = local_to_latlon(ORIGIN, col * 100.0, row * 100.0)
        graph.add_node(node, y=lat, x=lon)
    for node in range(1, 10):
        row, col = divmod(node - 1, 3)
        for other in ([node + 1] if col < 2 else []) + ([node + 3] if row < 2 else []):
            graph.add_edge(node, other, length=100.0)
            graph.add_edge(other, node, length=100.0)
    return graph


@pytest.fixture(scope="module")
def levico() -> nx.MultiDiGraph:
    return FileSource(FIXTURES / "levico_walk_1km.graphml").load(ANYWHERE)


def levico_routes(graph: nx.MultiDiGraph) -> list[list[Any]]:
    """Shortest ways between nodes far apart in the id order: many roads."""
    ends = sorted(graph)
    routes = []
    for a, b in zip(ends[::7], ends[::-7], strict=False):
        if a != b and nx.has_path(graph, a, b):
            route = nx.shortest_path(graph, a, b, weight="length")
            if len(route) >= 5:
                routes.append(route)
    return routes


def test_a_route_drawn_by_the_engine_comes_back_to_its_nodes(
    levico: nx.MultiDiGraph,
) -> None:
    routes = levico_routes(levico)
    assert len(routes) > 20
    for route in routes:
        assert nodes_along(levico, points_of(levico, route)) == route


def test_points_rounded_to_six_decimals_as_in_a_file_find_the_same_nodes(
    levico: nx.MultiDiGraph,
) -> None:
    for route in levico_routes(levico):
        points = [
            (round(lat, 6), round(lon, 6)) for lat, lon in points_of(levico, route)
        ]
        assert nodes_along(levico, points) == route


def test_the_directions_are_those_of_the_route_planned(
    levico: nx.MultiDiGraph,
) -> None:
    for route in levico_routes(levico):
        found = nodes_along(levico, points_of(levico, route))
        assert guidance(levico, found) == guidance(levico, route)


def test_a_loop_and_a_stroke_out_and_back_keep_every_pass() -> None:
    graph = grid()
    route = [1, 2, 5, 4, 1, 2, 3, 2]  # round the square, then out to 3 and back
    assert nodes_along(graph, points_of(graph, route)) == route


def test_a_node_only_near_the_line_is_left_out() -> None:
    graph = grid()
    graph.remove_edges_from([(2, 5), (5, 2), (4, 5), (5, 4), (5, 6), (6, 5)])
    graph.add_edge(1, 9, length=283.0)  # a straight road across, over 5
    graph.add_edge(9, 1, length=283.0)
    points = points_of(graph, [1, 9])
    # The road's line passes over node 5, whose roads it does not meet.
    with_middle = [points[0], _node_latlon(graph, 5), points[1]]
    assert nodes_along(graph, with_middle) == [1, 9]


def test_a_road_gone_from_the_map_is_closed_by_the_shortest_way() -> None:
    graph = grid()
    route = [1, 2, 3, 6, 9]
    points = points_of(graph, route)
    graph.remove_edges_from([(2, 3), (3, 2)])
    found = nodes_along(graph, points)
    assert found[0] == 1 and found[-1] == 9
    assert all(graph.has_edge(u, v) for u, v in zip(found, found[1:], strict=False))


def test_a_gap_far_longer_than_the_route_is_not_closed() -> None:
    graph = grid()
    points = points_of(graph, [1, 2, 3])
    graph.remove_edges_from([(2, 3), (3, 2)])  # 2 to 3 is now 300 m around
    assert nodes_along(graph, points) == [1, 2]


def test_points_a_little_off_the_nodes_still_match() -> None:
    graph = grid()
    shifted = [
        local_to_latlon(point, MATCH_M * 0.6, 0.0)
        for point in points_of(graph, [1, 2, 5])
    ]
    assert nodes_along(graph, shifted) == [1, 2, 5]


def test_a_route_off_the_map_is_refused() -> None:
    graph = grid()
    far = [local_to_latlon(ORIGIN, 50.0, 50.0), local_to_latlon(ORIGIN, 150.0, 50.0)]
    with pytest.raises(RouteNotOnGraphError, match="roads of this map"):
        nodes_along(graph, far)
    with pytest.raises(InvalidRequestError):  # what the API answers 422 for
        nodes_along(graph, [ORIGIN])
    with pytest.raises(RouteNotOnGraphError):
        nodes_along(nx.MultiDiGraph(), far)
