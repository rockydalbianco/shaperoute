"""The detours of a piece are walked, not drawn (TASK-242, ADR-0208)."""

from typing import Any

import networkx as nx
import numpy as np
import pytest
from shapely.geometry import LineString

from route_engine import detours, pen_up
from route_engine.detours import Detour, Strays
from route_engine.geo import LatLon, latlon_to_local_array, local_to_latlon
from route_engine.network import EDGE_REUSE_PENALTY
from route_engine.optimizer import WORD_RETRACE, WORD_TOLERANCE, drawn_distance
from route_engine.pieces import compose
from route_engine.shapes.outline import parse_outline
from route_engine.words import Word

TRENTO = (46.0671, 11.1214)
STREET_M = 100.0
# The face is 2 km wide on the map: its first corner on TRENTO, a street
# under every side of it, and under the mouth.
SCALE_M = 1000.0
# A mouth one piece height is 500 m: on its line within 62.5 m, a detour
# beyond 187.5 m.
HEIGHT_M = 500.0
FACE = [[100, 100], [100, 120], [120, 120], [120, 100], [100, 100]]
# 1.2 km long, 500 m above the lower side: streets 4 to 16 of row 5.
MOUTH = [[104, 105], [116, 105]]
EYE = [[104, 112], [104, 116], [108, 116], [108, 112], [104, 112]]


def _town(railway: bool = True) -> nx.MultiDiGraph:
    """Streets every 100 m, 3 km around the first corner of the face, both
    directions. A railway runs up between columns 9 and 10, half-way along
    the mouth: the streets cross it only along the lower side of the face
    and below, 500 m under the mouth, and along its upper side and above."""
    graph = nx.MultiDiGraph()
    span = range(-10, 31)
    for i in span:
        for j in span:
            lat, lon = local_to_latlon(TRENTO, i * STREET_M, j * STREET_M)
            graph.add_node((i, j), y=lat, x=lon)
    for i, j in list(graph.nodes):
        for b in ((i + 1, j), (i, j + 1)):
            cut = railway and b[0] == 10 and i == 9 and 0 < j < 20
            if b in graph and not cut:
                graph.add_edge((i, j), b, length=STREET_M)
                graph.add_edge(b, (i, j), length=STREET_M)
    return graph


def _face(*pieces: list[list[int]]) -> tuple[Word, list[LatLon]]:
    """A square face with `pieces`, and its line placed on the town."""
    data = {
        "name": "face",
        "source": "a test",
        "license": "none",
        "points": FACE,
        "pieces": list(pieces),
    }
    word = compose(parse_outline(data), "face")
    return word, pen_up.place_line(list(word.points), TRENTO, SCALE_M)


def _row(j: int, first: int, last: int) -> list[Any]:
    step = 1 if last >= first else -1
    return [(i, j) for i in range(first, last + step, step)]


def _column(i: int, first: int, last: int) -> list[Any]:
    step = 1 if last >= first else -1
    return [(i, j) for j in range(first, last + step, step)]


def _mouth_line() -> list[LatLon]:
    return [
        local_to_latlon(TRENTO, 400.0, 500.0),
        local_to_latlon(TRENTO, 1600.0, 500.0),
    ]


def _strays(nodes: list[Any], closed: bool = False) -> Strays:
    """Where a route leaves the mouth's line, in a town with no railway:
    any street may be taken."""
    graph = _town(railway=False)
    return detours.strays(graph, nodes, _mouth_line(), 62.5, 187.5, closed=closed)


# --- Where a route leaves its line ---


def test_the_lift_is_as_wide_as_the_similarity_is() -> None:
    # What is drawn between two nodes on the line is what the similarity
    # counts; a detour is three times as far.
    assert detours.LIFT_NEAR == WORD_TOLERANCE
    assert detours.LIFT_FAR == 3 * detours.LIFT_NEAR


def test_a_route_along_its_line_has_no_detours() -> None:
    nodes = _row(5, 4, 16)
    assert _strays(nodes) == Strays(0, len(nodes) - 1)


def test_a_stretch_far_from_the_line_between_two_nodes_on_it_is_a_detour() -> None:
    # Down to the crossing 500 m below, across, and up again.
    under = [*_column(9, 5, 0), *_column(10, 0, 5)]
    nodes = [*_row(5, 4, 9), *under[1:], *_row(5, 11, 16)]
    found = _strays(nodes)
    assert (found.begin, found.end) == (0, len(nodes) - 1)
    assert found.detours == (Detour(5, 16, pytest.approx(500.0)),)
    assert nodes[5] == (9, 5) and nodes[16] == (10, 5)


def test_a_stretch_that_strays_less_stays_drawn() -> None:
    # One street below the line and back: 100 m off, within 187.5 m.
    nodes = [*_row(5, 4, 6), (6, 4), (7, 4), (7, 5), *_row(5, 8, 16)]
    assert _strays(nodes).detours == ()


def test_the_depth_is_measured_on_the_points_not_on_the_nodes() -> None:
    # A road that leaves the line and comes back between two nodes on it.
    graph = _town(railway=False)
    bend = [
        local_to_latlon(TRENTO, x, y) for x, y in ((600, 500), (650, 200), (700, 500))
    ]
    graph.remove_edge((6, 5), (7, 5))
    graph.add_edge(
        (6, 5),
        (7, 5),
        length=610.0,
        geometry=LineString([(lon, lat) for lat, lon in bend]),
    )
    found = detours.strays(graph, _row(5, 4, 16), _mouth_line(), 62.5, 187.5)
    assert found.detours == (Detour(2, 3, pytest.approx(300.0, abs=1.0)),)


def test_a_piece_begins_and_ends_on_its_line() -> None:
    # It comes up from the lower side, and leaves the same way.
    nodes = [*_column(4, 0, 5), *_row(5, 5, 16), *_column(16, 4, 0)]
    found = _strays(nodes)
    assert (found.begin, found.end) == (5, 17)
    assert nodes[found.begin] == (4, 5) and nodes[found.end] == (16, 5)
    assert detours.parts(nodes, found, []) == [_row(5, 4, 16)]


def test_a_short_way_to_the_line_stays_drawn() -> None:
    nodes = [(4, 4), *_row(5, 4, 16), (16, 6)]
    found = _strays(nodes)
    assert (found.begin, found.end) == (0, len(nodes) - 1)


def test_a_closed_piece_leaves_out_the_detour_through_its_start() -> None:
    # It begins 500 m below the line and ends one street below it.
    nodes = [*_column(4, 0, 5), *_row(5, 5, 16), (16, 4)]
    found = _strays(nodes)
    assert (found.begin, found.end) == (5, len(nodes) - 1)
    # Closed, it ends where it began: the two are one stretch off the line.
    found = _strays(nodes, closed=True)
    assert nodes[found.begin] == (4, 5) and nodes[found.end] == (16, 5)


def test_a_route_that_never_meets_its_line_is_kept_whole() -> None:
    nodes = _row(0, 4, 16)
    found = _strays(nodes)
    assert found == Strays(0, len(nodes) - 1)
    assert detours.parts(nodes, found, []) == [nodes]


# --- What stays drawn ---


def test_a_lifted_detour_cuts_the_route_in_two() -> None:
    under = [*_column(9, 5, 0), *_column(10, 0, 5)]
    nodes = [*_row(5, 4, 9), *under[1:], *_row(5, 11, 16)]
    found = _strays(nodes)
    assert detours.parts(nodes, found, found.detours) == [
        _row(5, 4, 9),
        _row(5, 10, 16),
    ]
    # Not lifted, it stays.
    assert detours.parts(nodes, found, []) == [nodes]


def test_a_detour_back_to_the_same_node_is_cut_out() -> None:
    # 300 m down a street and back up it, to the node it left.
    nodes = [*_row(5, 4, 7), *_column(7, 4, 2), *_column(7, 3, 5), *_row(5, 8, 16)]
    found = _strays(nodes)
    assert found.detours == (Detour(3, 9, pytest.approx(300.0)),)
    assert detours.loops(nodes, found) == list(found.detours)
    # No walk: the line goes on from that node.
    assert detours.parts(nodes, found, found.detours) == [_row(5, 4, 16)]


def test_a_node_alone_between_two_detours_draws_nothing() -> None:
    below = [*_column(7, 4, 2), *_column(8, 2, 5)]
    above = [*_column(8, 6, 8), *_column(9, 8, 5)]
    nodes = [*_row(5, 4, 7), *below, *above, *_row(5, 10, 16)]
    found = _strays(nodes)
    assert [(nodes[d.first], nodes[d.last]) for d in found.detours] == [
        ((7, 5), (8, 5)),
        ((8, 5), (9, 5)),
    ]
    assert detours.loops(nodes, found) == []
    # One walk, from the first part to the last.
    assert detours.parts(nodes, found, found.detours) == [
        _row(5, 4, 7),
        _row(5, 9, 16),
    ]


def test_the_points_of_a_part_are_those_of_its_roads() -> None:
    graph = _town(railway=False)
    points = detours.points_of(graph, _row(5, 4, 7))
    assert points == [(graph.nodes[n]["y"], graph.nodes[n]["x"]) for n in _row(5, 4, 7)]


# --- On the roads ---


def _trace(word: Word, line: list[LatLon], graph: nx.MultiDiGraph) -> Any:
    return pen_up.trace(graph, word, line, EDGE_REUSE_PENALTY, WORD_RETRACE)


def _metres(points: list[LatLon]) -> np.ndarray:
    return latlon_to_local_array(TRENTO, np.array(points))


def test_a_mouth_across_the_railway_is_drawn_in_two_parts() -> None:
    word, line = _face(MOUTH)
    route = _trace(word, line, _town())
    # The walk to the mouth, and the one under the railway.
    assert len(route.walks) == 2
    assert pen_up.walks_problem(route.walks, len(route.points)) is None
    face, left, right = (
        _metres(part) for part in pen_up.drawn_pieces(route.points, route.walks)
    )
    assert face[0] == pytest.approx((0.0, 0.0), abs=0.5)
    # Each part stays on the mouth's street, on its side of the railway.
    for part, (west, east) in ((left, (400.0, 900.0)), (right, (1000.0, 1600.0))):
        assert part[:, 1] == pytest.approx(500.0, abs=0.5)
        assert sorted((part[0, 0], part[-1, 0])) == pytest.approx([west, east], abs=0.5)
    # The walk between them goes down to the crossing and up: 1.1 km.
    begin, end = route.walks[1]
    under = _metres(route.points[begin : end + 1])
    assert under[:, 1].min() == pytest.approx(0.0, abs=0.5)
    assert float(np.hypot(*np.diff(under, axis=0).T).sum()) == pytest.approx(
        1100.0, abs=1.0
    )
    # The face and the two parts are drawn; the search still sizes the shape
    # with the detour, as when it was drawn.
    drawn = pen_up.drawn_m(route.points, route.distance_m, route.walks)
    assert drawn == pytest.approx(8000.0 + 1100.0, abs=1.0)
    assert isinstance(route, pen_up.LiftedRoute)
    assert route.lifted_m == pytest.approx(1100.0, abs=1.0)
    assert drawn_distance(route) == pytest.approx(drawn + 1100.0, abs=1.0)


def test_the_lift_draws_the_shape_better(monkeypatch: pytest.MonkeyPatch) -> None:
    word, line = _face(MOUTH)
    tolerance = WORD_TOLERANCE * HEIGHT_M
    lifted = _trace(word, line, _town())
    monkeypatch.setattr(detours, "LIFT_FAR", float("inf"))
    whole = _trace(word, line, _town())
    # Without the lift the mouth hangs from the lower side of the face.
    assert len(whole.walks) == 1 and whole.nodes == lifted.nodes
    assert not isinstance(whole, pen_up.LiftedRoute)
    assert drawn_distance(whole) == pytest.approx(drawn_distance(lifted))
    assert pen_up.similarity(
        word, lifted.points, lifted.walks, line, tolerance
    ) > pen_up.similarity(word, whole.points, whole.walks, line, tolerance)


def test_without_a_railway_nothing_changes(monkeypatch: pytest.MonkeyPatch) -> None:
    word, line = _face(EYE, MOUTH)
    route = _trace(word, line, _town(railway=False))
    assert len(route.walks) == 2
    monkeypatch.setattr(detours, "LIFT_FAR", float("inf"))
    before = _trace(word, line, _town(railway=False))
    assert (route.points, route.walks, route.nodes) == (
        before.points,
        before.walks,
        before.nodes,
    )
    assert route.warnings == before.warnings and route.waypoints == before.waypoints
    assert not isinstance(route, pen_up.LiftedRoute)


def test_the_outline_is_never_lifted() -> None:
    # A face whose lower side runs where the mouth's street did: its way
    # round the railway is drawn, as before.
    word, line = _face(MOUTH)
    graph = _town()
    for j in (0, 20):  # the face's own sides cross only farther out
        for a, b in (((9, j), (10, j)), ((10, j), (9, j))):
            graph.remove_edge(a, b)
    route = _trace(word, line, graph)
    face = _metres(pen_up.drawn_pieces(route.points, route.walks)[0])
    assert face[0] == pytest.approx(face[-1], abs=0.5)
    assert face[:, 1].min() == pytest.approx(-100.0, abs=0.5)


def test_the_walks_are_never_more_than_a_result_holds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    word, line = _face(EYE, MOUTH)
    monkeypatch.setattr(detours, "MAX_WALKS", 2)
    route = _trace(word, line, _town())
    # Two pieces, two walks: no walk is left for the mouth's detour.
    assert len(route.walks) == 2
    under = _metres(pen_up.drawn_pieces(route.points, route.walks)[2])
    assert under[:, 1].min() == pytest.approx(0.0, abs=0.5)
