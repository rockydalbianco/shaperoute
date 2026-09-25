from collections import Counter
from pathlib import Path

import networkx as nx
import numpy as np
import osmnx as ox
import pytest

from route_engine.geo import haversine_m, local_to_latlon
from route_engine.network import nearest_nodes, snap_to_network
from route_engine.optimizer import WORD_RETRACE, _tracer
from route_engine.projection import project_shape
from route_engine.retrace import point_ids, snap_retraced
from route_engine.shapes import get_shape
from route_engine.words import compose

LEVICO = (46.0122, 11.2986)
FIXTURE = Path(__file__).parent / "fixtures" / "levico_walk_1km.graphml"
SPACING_M = 100.0


def _at(i: float, j: float) -> tuple[float, float]:
    return local_to_latlon(LEVICO, i * SPACING_M, j * SPACING_M)


def _street_and_shortcut(shortcut_m: float) -> nx.MultiDiGraph:
    """A street of three nodes along x, and a one-way road from its far end
    back to its first node, `shortcut_m` long, 30 m beside it."""
    graph = nx.MultiDiGraph()
    for i in range(3):
        graph.add_node((i, 0), y=_at(i, 0)[0], x=_at(i, 0)[1])
    for a, b in (((0, 0), (1, 0)), ((1, 0), (2, 0))):
        graph.add_edge(a, b, length=SPACING_M)
        graph.add_edge(b, a, length=SPACING_M)
    beside = local_to_latlon(LEVICO, SPACING_M, 30.0)
    graph.add_node("beside", y=beside[0], x=beside[1])
    graph.add_edge((2, 0), "beside", length=shortcut_m / 2)
    graph.add_edge("beside", (0, 0), length=shortcut_m / 2)
    return graph


def test_the_way_back_is_the_way_out_even_where_another_road_is_shorter() -> None:
    # The street costs 200 m back, half as much for a word (TASK-050); the
    # road beside only 80. snap_to_network takes it and draws a loop; a word
    # comes back on the street, one thin line (TASK-071).
    graph = _street_and_shortcut(80.0)
    shape = [_at(0, 0), _at(2, 0), _at(0, 0)]
    loop = snap_to_network(graph, shape, corridor=0.0, retrace=0.5)
    assert local_to_latlon(LEVICO, SPACING_M, 30.0) in loop.points
    route = snap_retraced(graph, shape, retrace=WORD_RETRACE)
    assert route.points == [_at(0, 0), _at(1, 0), _at(2, 0), _at(1, 0), _at(0, 0)]
    assert route.distance_m == pytest.approx(400.0, rel=1e-3)


def test_points_a_centimetre_apart_are_one_point() -> None:
    xy = np.array([(0.0, 0.0), (10.0, 0.0), (0.004, 0.003), (10.0, 0.02), (0.0, 0.0)])
    assert point_ids(xy) == [0, 1, 0, 3, 0]


@pytest.fixture(scope="module")
def levico() -> nx.MultiDiGraph:
    return ox.load_graphml(FIXTURE)


def _middle(graph: nx.MultiDiGraph) -> tuple[float, float]:
    lats = [data["y"] for _, data in graph.nodes(data=True)]
    lons = [data["x"] for _, data in graph.nodes(data=True)]
    return (min(lats) + max(lats)) / 2, (min(lons) + max(lons)) / 2


@pytest.mark.parametrize(
    ("text", "scale_m"), [("MAX", 350.0), ("LIVE", 250.0), ("KIWI", 350.0)]
)
def test_a_word_without_loops_runs_every_road_it_uses_twice(
    levico: nx.MultiDiGraph, text: str, scale_m: float
) -> None:
    # Letters without loops, and the base between them, are drawn out and
    # back: every road comes back as many times as it went. On this graph
    # snap_to_network leaves «MAX» with 151 m of roads run once, a loop
    # where the X crosses (TASK-071).
    word = compose(text)
    shape = project_shape(list(word.points), _middle(levico), scale_m, 0.0)
    route = snap_retraced(levico, shape, retrace=WORD_RETRACE)
    runs = Counter(frozenset(step) for step in zip(route.nodes, route.nodes[1:]))
    assert all(count % 2 == 0 for count in runs.values())
    assert haversine_m(route.points[0], route.points[-1]) < 1e-6
    [first], _ = nearest_nodes(levico, [shape[0]])
    assert route.nodes[0] == route.nodes[-1] == first


def test_a_word_with_loops_is_closed_and_draws_its_loops_once(
    levico: nx.MultiDiGraph,
) -> None:
    # The O and the top of the A are drawn once: some roads run once there.
    word = compose("CIAO")
    shape = project_shape(list(word.points), _middle(levico), 300.0, 0.0)
    route = snap_retraced(levico, shape, retrace=WORD_RETRACE)
    runs = Counter(frozenset(step) for step in zip(route.nodes, route.nodes[1:]))
    assert any(count == 1 for count in runs.values())
    assert route.nodes[0] == route.nodes[-1]
    assert not route.warnings


def test_only_words_are_traced_the_new_way(levico: nx.MultiDiGraph) -> None:
    # Every other shape keeps snap_to_network, route for route (TASK-071).
    heart = project_shape(get_shape("heart")(64), _middle(levico), 300.0, 0.0)
    assert _tracer(levico, 2.0)(heart).points == snap_to_network(levico, heart).points
    word = project_shape(list(compose("MAX").points), _middle(levico), 350.0, 0.0)
    assert _tracer(levico, 2.0, word=True)(word).points == (
        snap_retraced(levico, word, retrace=WORD_RETRACE).points
    )
