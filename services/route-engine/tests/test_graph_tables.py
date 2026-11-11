"""The two tables a search works out once for its graph, made in blocks
(TASK-436, ADR-0362): the three points of every edge (network.
_work_out_samples) and the points of every road of the mask (optimizer.
RoadMask) read every geometry in one call to shapely instead of one call
an edge. The numbers are those of before, bit for bit: `samples_before` and
`mask_samples_before` are the code of before the change, kept here as the
reference.
"""

import math
from pathlib import Path
from typing import Any

import networkx as nx
import numpy as np
import pytest
from shapely.geometry import LineString

from route_engine import network
from route_engine.errors import NoRoadsError
from route_engine.geo import LatLon, latlon_to_local_array
from route_engine.network import FileSource, area_around
from route_engine.optimizer import RoadMask

LEVICO = (46.0122, 11.2986)
FIXTURE = Path(__file__).parent / "fixtures" / "levico_walk_1km.graphml"


def _edge_coords_before(
    graph: nx.MultiDiGraph, u: Any, v: Any, data: dict[str, Any]
) -> list[LatLon]:
    start = graph.nodes[u]["y"], graph.nodes[u]["x"]
    end = graph.nodes[v]["y"], graph.nodes[v]["x"]
    geometry = data.get("geometry")
    if geometry is None:
        return [start, end]
    coords = [(lat, lon) for lon, lat in geometry.coords]
    if math.dist(coords[-1], start) < math.dist(coords[0], start):
        coords.reverse()
    return coords


def samples_before(graph: nx.MultiDiGraph) -> np.ndarray:
    """network._work_out_samples as it was before TASK-436."""
    samples = []
    for u, v, data in graph.edges(data=True):
        coords = _edge_coords_before(graph, u, v, data)
        samples.extend((coords[0], coords[len(coords) // 2], coords[-1]))
    return np.array(samples).reshape(-1, 2)


def mask_samples_before(
    graph: nx.MultiDiGraph, origin: LatLon, step_m: float = 10.0
) -> np.ndarray:
    """RoadMask's samples as RoadMask.__init__ made them before TASK-436."""
    coords: list[tuple[float, float]] = []
    segments: list[tuple[int, int]] = []
    seen: set[frozenset[Any]] = set()
    for u, v, data in graph.edges(data=True):
        if frozenset((u, v)) in seen:
            continue
        seen.add(frozenset((u, v)))
        geometry = data.get("geometry")
        if geometry is None:
            line = [
                (graph.nodes[u]["y"], graph.nodes[u]["x"]),
                (graph.nodes[v]["y"], graph.nodes[v]["x"]),
            ]
        else:
            line = [(lat, lon) for lon, lat in geometry.coords]
        segments.extend(
            (len(coords) + i, len(coords) + i + 1) for i in range(len(line) - 1)
        )
        coords.extend(line)
    if not segments:
        raise NoRoadsError()
    xy = latlon_to_local_array(origin, np.array(coords))
    idx = np.array(segments)
    a, b = xy[idx[:, 0]], xy[idx[:, 1]]
    counts = np.maximum(1, np.ceil(np.hypot(*(b - a).T) / step_m).astype(int))
    seg = np.repeat(np.arange(len(a)), counts)
    t = (
        np.arange(counts.sum()) - np.repeat(np.cumsum(counts) - counts, counts)
    ) / np.repeat(counts, counts)
    return np.vstack([a[seg] + (b - a)[seg] * t[:, None], b])


# (lat, lon) of the nodes of the small graphs.
NODES = {
    "a": (46.0100, 11.3000),
    "b": (46.0108, 11.3013),
    "c": (46.0121, 11.3004),
    "d": (46.0113, 11.2987),
    "e": (46.0095, 11.2979),
}


def _line(*points: LatLon) -> LineString:
    """A geometry through (lat, lon) `points`, written as OSMnx writes it:
    (lon, lat)."""
    return LineString([(lon, lat) for lat, lon in points])


def _bare(nodes: dict[str, LatLon] = NODES) -> nx.MultiDiGraph:
    graph = nx.MultiDiGraph()
    for name, (lat, lon) in nodes.items():
        graph.add_node(name, y=lat, x=lon)
    return graph


def plain_graph() -> nx.MultiDiGraph:
    """Edges without a geometry, one of them one way only."""
    graph = _bare()
    for u, v in (("a", "b"), ("b", "a"), ("b", "c"), ("c", "b"), ("d", "a")):
        graph.add_edge(u, v, length=100.0)
    return graph


def drawn_graph() -> nx.MultiDiGraph:
    """Edges with a geometry of two, three, four and five points, written
    from u to v."""
    a, b, c, d, e = (NODES[name] for name in "abcde")
    graph = _bare()
    graph.add_edge("a", "b", length=100.0, geometry=_line(a, b))
    graph.add_edge("b", "c", length=100.0, geometry=_line(b, (46.0115, 11.3012), c))
    graph.add_edge(
        "c",
        "d",
        length=100.0,
        geometry=_line(c, (46.0120, 11.2999), (46.0117, 11.2991), d),
    )
    graph.add_edge(
        "d",
        "e",
        length=100.0,
        geometry=_line(
            d, (46.0109, 11.2985), (46.0104, 11.2984), (46.0099, 11.2981), e
        ),
    )
    return graph


def backwards_graph() -> nx.MultiDiGraph:
    """Each road both ways, with one geometry for the two: the edge that
    runs against it finds it written backwards. And one edge alone whose
    geometry is written backwards."""
    a, b, c, d, e = (NODES[name] for name in "abcde")
    graph = _bare()
    bend = _line(a, (46.0102, 11.3008), (46.0106, 11.3011), b)
    graph.add_edge("a", "b", length=100.0, geometry=bend)
    graph.add_edge("b", "a", length=100.0, geometry=bend)
    curve = _line(b, (46.0111, 11.3015), (46.0116, 11.3013), c)
    graph.add_edge("c", "b", length=100.0, geometry=curve)
    graph.add_edge("b", "c", length=100.0, geometry=curve)
    graph.add_edge("d", "e", length=100.0, geometry=_line(e, (46.0103, 11.2980), d))
    # Its ends are not exactly the nodes', as after a simplification.
    graph.add_edge(
        "e",
        "a",
        length=100.0,
        geometry=_line((46.01001, 11.29998), (46.0097, 11.2990), (46.00951, 11.29791)),
    )
    return graph


def mixed_graph() -> nx.MultiDiGraph:
    """Edges with and without a geometry in turn, parallel edges (the mask
    takes the first of a road, the samples all of them) and loops."""
    a, b, c, d, e = (NODES[name] for name in "abcde")
    graph = _bare()
    graph.add_edge("a", "b", length=100.0)
    graph.add_edge("a", "b", length=140.0, geometry=_line(a, (46.0101, 11.3010), b))
    graph.add_edge("b", "a", length=100.0)
    graph.add_edge("b", "c", length=120.0, geometry=_line(c, (46.0117, 11.3011), b))
    graph.add_edge("b", "c", length=100.0)
    graph.add_edge("c", "b", length=100.0)
    # A loop with a geometry: it ends where it begins.
    graph.add_edge(
        "c",
        "c",
        length=80.0,
        geometry=_line(
            c, (46.0124, 11.3006), (46.0125, 11.3002), (46.0122, 11.3001), c
        ),
    )
    # A loop without one, and twice the same loop.
    graph.add_edge("d", "d", length=10.0)
    graph.add_edge(
        "e",
        "e",
        length=60.0,
        geometry=_line(e, (46.0093, 11.2976), (46.0092, 11.2981), e),
    )
    graph.add_edge(
        "e",
        "e",
        length=60.0,
        geometry=_line(e, (46.0092, 11.2981), (46.0093, 11.2976), e),
    )
    graph.add_edge("d", "e", length=100.0)
    graph.add_edge("e", "d", length=130.0, geometry=_line(e, (46.0104, 11.2977), d))
    return graph


def whole_number_graph() -> nx.MultiDiGraph:
    """Nodes at whole degrees, as some graphs made by hand have them, with
    and without a geometry."""
    graph = _bare({"a": (46, 11), "b": (46, 12), "c": (47, 12)})
    graph.add_edge("a", "b", length=100.0)
    graph.add_edge("b", "a", length=100.0)
    graph.add_edge(
        "b", "c", length=100.0, geometry=LineString([(12, 47), (12.5, 46.5), (12, 46)])
    )
    return graph


def near_ties_graph() -> nx.MultiDiGraph:
    """Geometries whose two ends are as far from the edge's first node, or
    apart by the last digits only: which end comes first is the engine's
    `math.dist` to say, to the last digit."""
    rng = np.random.default_rng(436)
    graph = nx.MultiDiGraph()
    for i in range(600):
        # The first node at (0, 0), where a coordinate keeps all its digits
        # as a distance; the two ends on one circle around it, then the
        # last one moved by a digit or two.
        first = rng.uniform(-1e-3, 1e-3, size=2)
        radius = math.hypot(*first)
        lat = float(rng.uniform(-radius, radius))
        lon = math.sqrt(first[0] ** 2 + first[1] ** 2 - lat**2)
        nudge = int(rng.integers(-2, 3))
        for _ in range(abs(nudge)):
            lon = math.nextafter(lon, math.inf * nudge)
        graph.add_node(("u", i), y=0.0, x=0.0)
        graph.add_node(("v", i), y=lat, x=lon)
        graph.add_edge(
            ("u", i),
            ("v", i),
            length=100.0,
            geometry=_line(
                (float(first[0]), float(first[1])), (2 * lat, -lon), (lat, lon)
            ),
        )
    return graph


def levico_graph() -> nx.MultiDiGraph:
    return FileSource(FIXTURE).load(area_around([LEVICO], 1000.0))


GRAPHS = {
    "plain": plain_graph,
    "drawn": drawn_graph,
    "backwards": backwards_graph,
    "mixed": mixed_graph,
    "whole numbers": whole_number_graph,
    "near ties": near_ties_graph,
    "levico": levico_graph,
}


@pytest.mark.parametrize("name", GRAPHS)
def test_edge_samples_are_those_of_before(name: str) -> None:
    graph = GRAPHS[name]()
    before = samples_before(graph)
    now = network._work_out_samples(graph)
    assert now.shape == (3 * graph.number_of_edges(), 2)
    assert np.array_equal(now, before)
    # And as the search reads them, kept for the graph.
    assert np.array_equal(network._edge_samples(graph), before)


@pytest.mark.parametrize("name", GRAPHS)
@pytest.mark.parametrize("step_m", [10.0, 3.0])
def test_mask_samples_are_those_of_before(name: str, step_m: float) -> None:
    graph = GRAPHS[name]()
    origin = LEVICO if name != "whole numbers" else (46.5, 11.5)
    before = mask_samples_before(graph, origin, step_m)
    now = RoadMask(graph, origin, step_m).samples
    assert now.dtype == before.dtype
    assert np.array_equal(now, before)


def test_the_small_graphs_say_what_they_are_for() -> None:
    """The cases the tables must get right are in the graphs above."""
    backwards = backwards_graph()
    turned = [
        (u, v)
        for u, v, data in backwards.edges(data=True)
        if _edge_coords_before(backwards, u, v, data)
        != [(lat, lon) for lon, lat in data["geometry"].coords]
    ]
    assert turned == [("b", "a"), ("c", "b"), ("d", "e"), ("e", "a")]
    mixed = mixed_graph()
    assert mixed.number_of_edges("a", "b") == 2 and mixed.number_of_edges("e", "e") == 2
    assert nx.number_of_selfloops(mixed) == 4
    levico = levico_graph()
    drawn = [d for _, _, d in levico.edges(data=True) if "geometry" in d]
    assert 0 < len(drawn) < levico.number_of_edges()


def test_a_reversed_middle_point_is_the_one_of_before() -> None:
    """Four points: the middle one is the third from the edge's first
    node, so not the same point for the edge that runs against the
    geometry as for the one that runs along it."""
    graph = backwards_graph()
    samples = network._work_out_samples(graph).reshape(-1, 3, 2)
    row = list(graph.edges()).index(("b", "c"))
    assert tuple(samples[row, 0]) == NODES["b"]
    assert tuple(samples[row, 1]) == (46.0116, 11.3013)
    assert tuple(samples[row, 2]) == NODES["c"]
    row = list(graph.edges()).index(("c", "b"))
    assert tuple(samples[row, 0]) == NODES["c"]
    assert tuple(samples[row, 1]) == (46.0111, 11.3015)
    assert tuple(samples[row, 2]) == NODES["b"]


def test_near_ties_need_the_engines_own_distance() -> None:
    """The graph of near ties has edges a plain square root of the sum of
    the squares would turn the other way: the reason `math.dist` has the
    last word on them."""
    graph = near_ties_graph()
    apart = 0
    for u, _, data in graph.edges(data=True):
        start = np.array([graph.nodes[u]["y"], graph.nodes[u]["x"]])
        coords = np.array(data["geometry"].coords)[:, ::-1]
        plain = np.sqrt(((coords[[0, -1]] - start) ** 2).sum(axis=1))
        exact = math.dist(coords[-1], start) < math.dist(coords[0], start)
        apart += bool(plain[1] < plain[0]) != exact
    assert apart > 0


def test_a_graph_without_edges_has_no_samples() -> None:
    for graph in (nx.MultiDiGraph(), _bare()):
        samples = network._work_out_samples(graph)
        before = samples_before(graph)
        assert samples.shape == before.shape == (0, 2)
        assert samples.dtype == before.dtype
        assert np.array_equal(network._edge_samples(graph), before)


def test_a_graph_without_roads_has_no_mask() -> None:
    for graph in (nx.MultiDiGraph(), _bare()):
        with pytest.raises(NoRoadsError):
            mask_samples_before(graph, LEVICO)
        with pytest.raises(NoRoadsError):
            RoadMask(graph, LEVICO)


def test_a_road_of_one_point_is_no_road() -> None:
    """A geometry of a single point has no segment: alone, no roads; next
    to a road, nothing of its own in the mask."""
    from shapely.geometry import Point

    a, b = NODES["a"], NODES["b"]
    alone = _bare()
    alone.add_edge("a", "a", length=0.0, geometry=Point(a[1], a[0]))
    with pytest.raises(NoRoadsError):
        mask_samples_before(alone, LEVICO)
    with pytest.raises(NoRoadsError):
        RoadMask(alone, LEVICO)
    beside = _bare()
    beside.add_edge("a", "a", length=0.0, geometry=Point(a[1], a[0]))
    beside.add_edge("a", "b", length=100.0, geometry=_line(a, (46.0103, 11.3009), b))
    beside.add_edge("c", "c", length=0.0, geometry=Point(11.3004, 46.0121))
    beside.add_edge("b", "c", length=100.0)
    assert np.array_equal(
        RoadMask(beside, LEVICO).samples, mask_samples_before(beside, LEVICO)
    )
