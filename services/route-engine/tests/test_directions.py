from pathlib import Path

import networkx as nx
import pytest

from route_engine.directions import (
    MIN_BRANCHES,
    SHARP_MIN_DEG,
    TURN_MIN_DEG,
    U_TURN_MIN_DEG,
    branch_count,
    directions,
    turn_of,
)
from route_engine.network import FileSource

FIXTURES = Path(__file__).parent / "fixtures"
# Node ids of the made-up graph, as in fixtures/make_directions_graph.py.
W, T, E, F, S, P, Q, R, G, H, K, U1, U2 = range(1, 14)
ANYWHERE = (0.0, 0.0, 0.0, 0.0)  # FileSource ignores the area


@pytest.fixture(scope="module")
def graph() -> nx.MultiDiGraph:
    return FileSource(FIXTURES / "directions_junctions.graphml").load(ANYWHERE)


def test_the_middle_of_a_two_way_road_is_no_junction_whatever_its_degree(
    graph: nx.MultiDiGraph,
) -> None:
    # Two edges in and two out look like four roads: they are two.
    assert graph.degree(P) == 4
    assert branch_count(graph, P) == 2
    assert directions(graph, [T, P, Q]) == []  # Via Verdi turns 90° at P


def test_a_change_of_name_off_a_junction_says_nothing(graph: nx.MultiDiGraph) -> None:
    assert directions(graph, [P, Q, R]) == []  # Via Verdi → Via Bianchi


def test_straight_through_a_t_junction_on_the_same_road_says_nothing(
    graph: nx.MultiDiGraph,
) -> None:
    # Via Roma's chord from T to E points 45° to the right; at T it goes on.
    assert directions(graph, [W, T, E]) == []


@pytest.mark.parametrize(
    ("route", "turn", "angle"),
    [([W, T, P], "left", -90.0), ([E, T, P], "right", 90.0)],
)
def test_turning_at_the_t_junction_gives_one_direction(
    graph: nx.MultiDiGraph, route: list[int], turn: str, angle: float
) -> None:
    [found] = directions(graph, route)
    assert (found.node, found.turn, found.street) == (T, turn, "Via Verdi")
    assert found.angle_deg == pytest.approx(angle, abs=1.0)
    assert found.branches == 3


def test_a_change_of_name_going_straight_gives_one_direction(
    graph: nx.MultiDiGraph,
) -> None:
    [found] = directions(graph, [T, E, F])
    assert (found.node, found.turn, found.street) == (E, "straight", "Corso Italia")
    assert found.angle_deg == pytest.approx(0.0, abs=1.0)


def test_a_road_without_a_name_is_called_by_its_type(graph: nx.MultiDiGraph) -> None:
    [found] = directions(graph, [T, E, S])
    assert (found.turn, found.street, found.road_type) == ("left", None, "footway")


def test_a_road_with_only_a_ref_is_called_by_it(graph: nx.MultiDiGraph) -> None:
    [found] = directions(graph, [E, F, H])
    assert (found.turn, found.street, found.road_type) == ("right", "SP12", "tertiary")


def test_an_edge_merging_two_names_goes_on_with_the_one_it_shares(
    graph: nx.MultiDiGraph,
) -> None:
    assert directions(graph, [E, F, G]) == []  # Corso Italia, then Viale Dante


def test_sharp_turns_and_u_turns(graph: nx.MultiDiGraph) -> None:
    [sharp] = directions(graph, [E, F, K])
    assert sharp.turn == "sharp-left"
    assert sharp.angle_deg == pytest.approx(-150.0, abs=1.0)
    [back] = directions(graph, [W, T, W])
    assert (back.turn, back.angle_deg, back.street) == ("u-turn", 180.0, "Via Roma")


@pytest.mark.parametrize(
    ("route", "turn"), [([E, S, U1], "left"), ([E, S, U2], "right")]
)
def test_at_a_fork_a_slight_turn_is_named_by_its_side(
    graph: nx.MultiDiGraph, route: list[int], turn: str
) -> None:
    [found] = directions(graph, route)
    assert (found.node, found.turn, found.street) == (S, turn, None)
    assert abs(found.angle_deg) <= TURN_MIN_DEG


def test_distances_add_up_the_roads_taken(graph: nx.MultiDiGraph) -> None:
    route = [W, T, E, F, H]
    found = directions(graph, route)
    lengths = [graph[u][v][0]["length"] for u, v in zip(route, route[1:], strict=False)]
    assert [d.node for d in found] == [E, F]
    assert [d.distance_m for d in found] == pytest.approx(
        [sum(lengths[:2]), sum(lengths[:3])]
    )
    assert found[0].point == (graph.nodes[E]["y"], graph.nodes[E]["x"])


def test_nothing_is_said_on_the_first_and_last_node(graph: nx.MultiDiGraph) -> None:
    assert directions(graph, [T, P]) == []  # T is a junction
    assert directions(graph, [E, T]) == []
    assert directions(graph, [T]) == []
    assert directions(graph, []) == []


def test_nodes_not_joined_by_a_road_are_refused(graph: nx.MultiDiGraph) -> None:
    with pytest.raises(ValueError, match="not joined by a road"):
        directions(graph, [W, T, F])


def test_branches_are_roads_not_edges() -> None:
    graph = nx.MultiDiGraph()
    graph.add_edge(0, 1, length=100.0)  # a two-way road
    graph.add_edge(1, 0, length=100.0)
    graph.add_edge(0, 2, length=100.0)  # two roads to the same neighbour
    graph.add_edge(2, 0, length=100.0)
    graph.add_edge(0, 2, length=150.0)
    graph.add_edge(3, 0, length=80.0)  # one-way, towards 0
    graph.add_edge(0, 0, length=300.0)  # a loop: two ends at 0
    assert branch_count(graph, 0) == 1 + 2 + 1 + 2
    assert branch_count(graph, 1) == 1


@pytest.mark.parametrize(
    ("angle", "turn"),
    [
        (0.0, "straight"),
        (TURN_MIN_DEG, "straight"),
        (-TURN_MIN_DEG, "straight"),
        (TURN_MIN_DEG + 0.1, "right"),
        (-TURN_MIN_DEG - 0.1, "left"),
        (SHARP_MIN_DEG - 0.1, "right"),
        (SHARP_MIN_DEG, "sharp-right"),
        (-SHARP_MIN_DEG, "sharp-left"),
        (U_TURN_MIN_DEG - 0.1, "sharp-right"),
        (U_TURN_MIN_DEG, "u-turn"),
        (-U_TURN_MIN_DEG, "u-turn"),
        (180.0, "u-turn"),
    ],
)
def test_turn_names(angle: float, turn: str) -> None:
    assert turn_of(angle) == turn


def test_on_a_real_graph_every_direction_is_at_a_real_junction() -> None:
    graph = FileSource(FIXTURES / "levico_walk_1km.graphml").load(ANYWHERE)
    # Nodes of the simplified graph with two roads: cut borders, ways joined.
    trap = {n for n in graph if graph.degree(n) == 4 and branch_count(graph, n) == 2}
    ends = sorted(graph)
    passed: set[int] = set()
    found = []
    for a, b in zip(ends[::5], ends[::-5], strict=False):
        if a == b or not nx.has_path(graph, a, b):
            continue
        route = nx.shortest_path(graph, a, b, weight="length")
        passed.update(route[1:-1])
        found.extend(directions(graph, route))
    assert len(found) > 50
    assert trap & passed  # the trap is on the way, and says nothing
    assert not trap & {d.node for d in found}
    for d in found:
        assert d.branches >= MIN_BRANCHES
        # OSMnx's own count of the streets at the node, from OSM itself.
        assert graph.nodes[d.node]["street_count"] >= MIN_BRANCHES
