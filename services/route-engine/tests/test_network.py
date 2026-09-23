import math
import shutil
from pathlib import Path

import networkx as nx
import pytest

from route_engine.geo import haversine_m, latlon_to_local, local_to_latlon
from route_engine.network import (
    FileSource,
    OsmnxSource,
    area_around,
    nearest_nodes,
    prune_spurs,
    snap_to_network,
)
from route_engine.projection import initial_scale, project_shape
from route_engine.shapes import get_shape

LEVICO = (46.0122, 11.2986)
FIXTURE = Path(__file__).parent / "fixtures" / "levico_walk_1km.graphml"
SPACING_M = 100.0


def _grid(size: int) -> nx.MultiDiGraph:
    """size × size nodes, SPACING_M apart, both directions, OSMnx attributes."""
    graph = nx.MultiDiGraph()
    for i in range(size):
        for j in range(size):
            lat, lon = local_to_latlon(LEVICO, i * SPACING_M, j * SPACING_M)
            graph.add_node((i, j), y=lat, x=lon)
    for i in range(size):
        for j in range(size):
            for di, dj in ((1, 0), (0, 1)):
                a, b = (i, j), (i + di, j + dj)
                if b in graph:
                    graph.add_edge(a, b, length=SPACING_M)
                    graph.add_edge(b, a, length=SPACING_M)
    return graph


def _at(i: float, j: float) -> tuple[float, float]:
    return local_to_latlon(LEVICO, i * SPACING_M, j * SPACING_M)


def _reused_edges(graph: nx.MultiDiGraph, points: list[tuple[float, float]]) -> int:
    lookup = {(d["y"], d["x"]): n for n, d in graph.nodes(data=True)}
    nodes = [lookup[p] for p in points]
    seen: set[frozenset[object]] = set()
    reused = 0
    for u, v in zip(nodes, nodes[1:], strict=False):
        key = frozenset((u, v))
        reused += key in seen
        seen.add(key)
    return reused


def test_nearest_nodes_picks_closest_and_measures_distance() -> None:
    graph = _grid(3)
    nodes, distances = nearest_nodes(graph, [_at(0, 0), _at(1.3, 0.1)])
    assert nodes == [(0, 0), (1, 0)]
    assert distances[0] == pytest.approx(0.0, abs=1e-6)
    assert distances[1] == pytest.approx(31.6, abs=0.1)  # hypot(30, 10)


def test_prune_spurs_removes_nested_out_and_back() -> None:
    assert prune_spurs(["a", "b", "c", "b", "a", "d"]) == ["a", "d"]
    assert prune_spurs(["a", "b", "c", "d", "a"]) == ["a", "b", "c", "d", "a"]


def _dead_end_block() -> nx.MultiDiGraph:
    """A 2×2 block with a dead-end street sticking out east of (1, 0)."""
    graph = _grid(2)
    graph.add_node((2, 0), y=_at(2, 0)[0], x=_at(2, 0)[1])
    graph.add_edge((1, 0), (2, 0), length=SPACING_M)
    graph.add_edge((2, 0), (1, 0), length=SPACING_M)
    return graph


def test_waypoint_on_a_dead_end_leaves_no_spike() -> None:
    # A smooth outline (12 points on an ellipse, no turn above 60°) with one
    # point nearest to the dead end: the out-and-back is pruned.
    graph = _dead_end_block()
    angles = [-0.75 * math.pi + 2 * math.pi * k / 12 for k in range(12)]
    shape = [_at(1 + math.cos(t), 0.5 + 0.5 * math.sin(t)) for t in angles]
    shape.append(shape[0])
    route = snap_to_network(graph, shape)
    assert _at(2, 0) not in route.points
    assert _reused_edges(graph, route.points) == 0
    assert route.distance_m == pytest.approx(400.0, rel=1e-3)


def test_a_corner_on_a_dead_end_keeps_its_spike() -> None:
    # The outline turns by 135° at (2, 0): that spike draws the corner, like
    # the tip of a heart, and survives the pruning.
    graph = _dead_end_block()
    shape = [_at(0, 0), _at(2, 0), _at(1, 1), _at(0, 1), _at(0, 0)]
    route = snap_to_network(graph, shape)
    assert _at(2, 0) in route.points
    assert route.distance_m == pytest.approx(600.0, rel=1e-3)


def test_route_that_is_only_a_spur_is_kept_rather_than_emptied() -> None:
    graph = _grid(2)
    route = snap_to_network(graph, [_at(0, 0), _at(1, 0), _at(0, 0)], 1.0)
    assert route.distance_m == pytest.approx(200.0, rel=1e-3)


def test_route_is_closed_and_starts_at_node_nearest_to_start() -> None:
    graph = _grid(4)
    shape = [_at(0.2, 0.1), _at(3, 0), _at(3, 3), _at(0, 3), _at(0.2, 0.1)]
    route = snap_to_network(graph, shape)
    assert route.points[0] == route.points[-1] == _at(0, 0)
    assert route.distance_m == pytest.approx(1200.0, rel=1e-3)
    assert route.warnings == []


def test_route_follows_edges_only() -> None:
    graph = _grid(4)
    shape = [_at(0, 0), _at(3, 1), _at(1, 3), _at(0, 0)]
    route = snap_to_network(graph, shape)
    for a, b in zip(route.points, route.points[1:], strict=False):
        assert haversine_m(a, b) == pytest.approx(SPACING_M, rel=1e-3)


def test_penalty_avoids_reusing_an_edge_when_an_alternative_exists() -> None:
    # Out and back between two neighbours: without penalty the return trip
    # reuses the same edge (100 m); with a strong penalty it goes around
    # the cell (300 m < 4 × 100 m). No corridor: going around the cell
    # leaves the outline, which the corridor alone would forbid.
    graph = _grid(2)
    shape = [_at(0, 0), _at(1, 0), _at(0, 0)]
    plain = snap_to_network(graph, shape, reuse_penalty=1.0, corridor=0.0)
    penalized = snap_to_network(graph, shape, reuse_penalty=4.0, corridor=0.0)
    assert _reused_edges(graph, plain.points) == 1
    assert _reused_edges(graph, penalized.points) == 0
    assert penalized.distance_m == pytest.approx(400.0, rel=1e-3)


def _river_grid() -> nx.MultiDiGraph:
    """Two streets 200 m apart along j = 0 and j = 2, joined only at i = 0 and 4."""
    graph = nx.MultiDiGraph()
    for i in range(5):
        for j in (0, 2):
            lat, lon = _at(i, j)
            graph.add_node((i, j), y=lat, x=lon)
    for j in (0, 2):
        for i in range(4):
            graph.add_edge((i, j), (i + 1, j), length=SPACING_M)
            graph.add_edge((i + 1, j), (i, j), length=SPACING_M)
    for i in (0, 4):
        graph.add_edge((i, 0), (i, 2), length=2 * SPACING_M)
        graph.add_edge((i, 2), (i, 0), length=2 * SPACING_M)
    return graph


def test_zone_reaches_a_near_node_on_this_side_of_the_river() -> None:
    # The middle shape point is 90 m from (2, 2), across the river, and
    # 110 m from (2, 0), on the street the route is already on.
    graph = _river_grid()
    shape = [_at(0, 0), _at(2, 1.1), _at(4, 0), _at(0, 0)]
    nearest_only = snap_to_network(graph, shape, 1.0, zone_radius=0.0)
    zoned = snap_to_network(graph, shape, 1.0, zone_radius=0.15)  # ≈ 128 m
    assert _at(2, 2) in nearest_only.points
    assert nearest_only.distance_m == pytest.approx(1200.0, rel=1e-3)
    assert _at(2, 2) not in zoned.points
    assert zoned.distance_m < nearest_only.distance_m


def _link(
    graph: nx.MultiDiGraph,
    a: tuple[float, float],
    b: tuple[float, float],
    **attrs: object,
) -> None:
    for node in (a, b):
        if node not in graph:
            lat, lon = _at(*node)
            graph.add_node(node, y=lat, x=lon)
    if "length" not in attrs:
        attrs["length"] = haversine_m(_at(*a), _at(*b))
    graph.add_edge(a, b, **attrs)
    graph.add_edge(b, a, **attrs)


def _ring_with_chord() -> nx.MultiDiGraph:
    """Border of a 300 m square whose east side winds, plus an inner chord.

    From (3, 1) to (3, 2) the border zig-zags up to 40 m outside the square
    (412 m); a street 100–150 m inside joins the same corners in 400 m.
    """
    from shapely.geometry import LineString

    graph = nx.MultiDiGraph()
    ring = [(0, 0), (1, 0), (2, 0), (3, 0), (3, 1), (3, 2), (3, 3)]
    ring += [(2, 3), (1, 3), (0, 3), (0, 2), (0, 1), (0, 0)]
    for a, b in zip(ring, ring[1:], strict=False):
        if (a, b) != ((3, 1), (3, 2)):
            _link(graph, a, b)
    zigzag = [(3 + 0.4 * (k % 2), 1 + k / 10) for k in range(11)]
    geometry = LineString([_at(i, j)[::-1] for i, j in zigzag])
    length = sum(
        haversine_m(_at(*p), _at(*q)) for p, q in zip(zigzag, zigzag[1:], strict=False)
    )
    _link(graph, (3, 1), (3, 2), length=length, geometry=geometry)
    _link(graph, (3, 1), (1.5, 1))
    _link(graph, (1.5, 1), (1.5, 2))
    _link(graph, (1.5, 2), (3, 2))
    return graph


def test_corridor_keeps_the_route_on_the_outline() -> None:
    graph = _ring_with_chord()
    shape = [_at(0, 0), _at(3, 0), _at(3, 3), _at(0, 3), _at(0, 0)]
    plain = snap_to_network(graph, shape, corridor=0.0)
    corridor = snap_to_network(graph, shape, corridor=2.0)
    assert _at(1.5, 1) in plain.points
    assert plain.distance_m == pytest.approx(1500.0, rel=1e-3)
    assert _at(1.5, 1) not in corridor.points
    assert corridor.distance_m == pytest.approx(1512.3, rel=1e-3)


def test_sparse_network_raises_warnings() -> None:
    # Each shape point sits ≈ 283 m diagonally outside a different corner.
    graph = _grid(3)
    far = [_at(-2, -2), _at(4, -2), _at(4, 4), _at(-2, 4), _at(-2, -2)]
    route = snap_to_network(graph, far, sparse_threshold_m=150.0)
    assert any("sparse road network" in w for w in route.warnings)
    assert any("start is" in w for w in route.warnings)


def test_shape_collapsing_onto_one_node_is_rejected() -> None:
    graph = _grid(2)
    with pytest.raises(ValueError, match="single road node"):
        snap_to_network(graph, [_at(0, 0), _at(0.1, 0), _at(0, 0)])


def test_area_around_contains_shape_plus_margin() -> None:
    shape = [_at(0, 0), _at(10, 0), _at(10, 5), _at(0, 0)]
    south, west, north, east = area_around(shape, margin_m=500.0)
    sw = latlon_to_local(LEVICO, (south, west))
    ne = latlon_to_local(LEVICO, (north, east))
    assert sw[0] == pytest.approx(-500.0, abs=15.0)
    assert sw[1] == pytest.approx(-500.0, abs=15.0)
    assert ne[0] == pytest.approx(1500.0, abs=15.0)
    assert ne[1] == pytest.approx(1000.0, abs=15.0)


def test_real_fixture_route_is_closed_and_on_the_network() -> None:
    graph = FileSource(FIXTURE).load(area_around([LEVICO]))
    circle = get_shape("circle")(64)
    shape = project_shape(circle, LEVICO, initial_scale(circle, 1500.0))
    route = snap_to_network(graph, shape)
    [start_node], _ = nearest_nodes(graph, [LEVICO])
    start = (graph.nodes[start_node]["y"], graph.nodes[start_node]["x"])
    assert route.points[0] == route.points[-1] == start
    assert route.distance_m > 1500.0 * 0.8
    assert route.warnings == []


def test_cached_graph_is_loaded_without_downloading(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import osmnx as ox

    def no_download(*args: object, **kwargs: object) -> None:
        raise AssertionError("graph was downloaded instead of read from cache")

    monkeypatch.setattr(ox, "graph_from_bbox", no_download)
    source = OsmnxSource(tmp_path)
    bbox = area_around([LEVICO])
    shutil.copy(FIXTURE, source.cache_path(bbox))
    assert source.is_cached(bbox)
    assert len(source.load(bbox)) > 0


@pytest.mark.network
def test_download_then_cache(tmp_path: Path) -> None:
    source = OsmnxSource(tmp_path)
    bbox = area_around([LEVICO], margin_m=150.0)
    assert not source.is_cached(bbox)
    assert len(source.load(bbox)) > 0
    assert source.is_cached(bbox)
