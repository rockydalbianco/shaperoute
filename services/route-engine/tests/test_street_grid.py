import math

import networkx as nx
import pytest

from route_engine.geo import local_to_latlon
from route_engine.optimizer import GRID_MAX_TILT_DEG, grid_turns, plan_shape
from route_engine.street_grid import StreetDirections
from route_engine.words import compose

TRENTO = (46.0671, 11.1214)


def _grid(
    turn_deg: float,
    spacing_m: float = 100.0,
    half_m: float = 2000.0,
    x0_m: float = 0.0,
    graph: nx.MultiDiGraph | None = None,
) -> nx.MultiDiGraph:
    """Streets every `spacing_m`, both ways, turned by `turn_deg`
    counterclockwise, around a point `x0_m` east of TRENTO."""
    graph = nx.MultiDiGraph() if graph is None else graph
    n = int(half_m / spacing_m)
    theta = math.radians(turn_deg)
    for i in range(-n, n + 1):
        for j in range(-n, n + 1):
            x, y = i * spacing_m, j * spacing_m
            east = x0_m + x * math.cos(theta) - y * math.sin(theta)
            north = x * math.sin(theta) + y * math.cos(theta)
            lat, lon = local_to_latlon(TRENTO, east, north)
            graph.add_node((x0_m, i, j), y=lat, x=lon)
    for key in [k for k in graph.nodes if k[0] == x0_m]:
        _, i, j = key
        for b in ((x0_m, i + 1, j), (x0_m, i, j + 1)):
            if b in graph:
                graph.add_edge(key, b, length=spacing_m)
                graph.add_edge(b, key, length=spacing_m)
    return graph


@pytest.mark.parametrize(
    ("turn", "direction"),
    [(0.0, 0.0), (20.0, 20.0), (-35.0, -35.0), (60.0, -30.0), (100.0, 10.0)],
)
def test_the_direction_of_a_grid_is_found_within_a_quarter_turn(
    turn: float, direction: float
) -> None:
    streets = StreetDirections(_grid(turn), TRENTO)
    [found] = streets.around((0.0, 0.0), 1500.0)
    assert found == pytest.approx(direction, abs=0.5)


def test_two_grids_give_two_directions_and_each_its_own_nearby() -> None:
    graph = _grid(0.0, x0_m=-2500.0)
    _grid(30.0, x0_m=2500.0, graph=graph)
    streets = StreetDirections(graph, TRENTO)
    both = streets.around((0.0, 0.0), 5000.0)
    assert sorted(both) == pytest.approx([0.0, 30.0], abs=0.5)
    assert streets.around((2500.0, 0.0), 1500.0) == pytest.approx([30.0], abs=0.5)
    assert streets.around((-2500.0, 0.0), 1500.0) == pytest.approx([0.0], abs=0.5)


def test_no_streets_no_direction() -> None:
    streets = StreetDirections(_grid(20.0), TRENTO)
    assert streets.around((50_000.0, 0.0), 1000.0) == []
    assert StreetDirections(nx.MultiDiGraph(), TRENTO).around((0, 0), 1e6) == []


def test_a_block_word_turns_with_the_grid_but_never_beyond_the_limit() -> None:
    starts = [(TRENTO, 0.0)]
    [[turn]] = grid_turns(_grid(20.0), TRENTO, starts, 1500.0).values()
    assert turn == pytest.approx(20.0, abs=0.5)
    [[turn]] = grid_turns(_grid(-25.0), TRENTO, starts, 1500.0).values()
    assert turn == pytest.approx(335.0, abs=0.5)
    steep = 40.0
    assert steep > GRID_MAX_TILT_DEG
    assert grid_turns(_grid(steep), TRENTO, starts, 1500.0) == {TRENTO: [0.0]}


class _Loader:
    def __init__(self, graph: nx.MultiDiGraph) -> None:
        self.graph = graph

    def load(self, bbox: tuple[float, float, float, float]) -> nx.MultiDiGraph:
        return self.graph


def test_a_block_word_is_placed_along_a_turned_grid() -> None:
    word = compose("IO", style="block")
    plan = plan_shape(
        list(word.points), word.text, TRENTO, 3000, _Loader(_grid(20.0)), word=word
    )
    assert plan.search is not None
    for attempt in plan.search.attempts:
        gap = abs((attempt.rotation_deg - 20.0 + 180.0) % 360.0 - 180.0)
        assert gap <= 5.0 + 1e-9


def test_a_round_word_stays_upright_on_a_turned_grid() -> None:
    word = compose("IO")
    plan = plan_shape(
        list(word.points), word.text, TRENTO, 3000, _Loader(_grid(20.0)), word=word
    )
    assert plan.search is not None
    for attempt in plan.search.attempts:
        tilt = abs((attempt.rotation_deg + 180.0) % 360.0 - 180.0)
        assert tilt <= 15.0 + 1e-9
