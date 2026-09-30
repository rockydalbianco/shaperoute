"""ZoneCrop: the graph of network.crop, in the same order, without touching
the zone (TASK-087, ADR-0082)."""

from __future__ import annotations

import pickle
import random
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import networkx as nx
import pytest

from route_engine.network import (
    _SINK,
    BBox,
    FileSource,
    Graph,
    crop,
    snap_to_network,
)
from route_engine.projection import initial_scale, project_shape
from route_engine.shapes import get_shape
from route_engine.zone_crop import ZoneCrop

LEVICO = (46.0122, 11.2986)
FIXTURE = Path(__file__).parent / "fixtures" / "levico_walk_1km.graphml"


def _layout(graph: Graph) -> dict[str, Any]:
    """Everything the engine can see of a graph, order included: nodes,
    edges out and in, keys and attributes."""

    def side(adjacency: Any) -> list[Any]:
        return [
            (
                u,
                [
                    (v, [(k, list(d.items())) for k, d in keys.items()])
                    for v, keys in nbrs.items()
                ],
            )
            for u, nbrs in adjacency.items()
        ]

    return {
        "graph": list(graph.graph.items()),
        "nodes": [(n, list(d.items())) for n, d in graph.nodes(data=True)],
        "succ": side(graph._succ),
        "pred": side(graph._pred),
        "edges": list(graph.edges(keys=True)),
    }


def _town(
    seed: int, nodes: int, *, islands: tuple[int, ...] = (), hub: int = 0
) -> Graph:
    """A made-up zone: `nodes` crossings with OSM-like ids scattered over
    0.01° × 0.01°, each joined both ways to the ones before it, with some
    roads doubled; then `islands`, pieces of that many nodes joined to
    nothing else, and a crossing of `hub` roads."""
    rng = random.Random(seed)
    graph: Graph = nx.MultiDiGraph(crs="epsg:4326", name=f"town {seed}")

    def piece(size: int) -> list[int]:
        ids: list[int] = []
        for _ in range(size):
            node = rng.randrange(10**8, 10**10)
            graph.add_node(
                node, y=46.0 + rng.random() / 100, x=11.0 + rng.random() / 100
            )
            for other in rng.sample(ids, min(len(ids), rng.choice((1, 1, 2, 3)))):
                for _ in range(rng.choice((1, 1, 1, 2))):
                    length = rng.uniform(10, 200)
                    graph.add_edge(node, other, length=length, highway="footway")
                    graph.add_edge(other, node, length=length, name="Via Roma")
            ids.append(node)
        return ids

    town = piece(nodes)
    for size in islands:
        piece(size)
    for other in rng.sample(town, hub):
        graph.add_edge(town[0], other, length=50.0)
        graph.add_edge(other, town[0], length=50.0)
    return graph


WHOLE: BBox = (45.0, 10.0, 47.0, 12.0)
MOST: BBox = (46.001, 11.001, 46.0095, 11.0095)
CORNER: BBox = (46.0, 11.0, 46.004, 11.004)
SLIVER: BBox = (46.0, 11.0, 46.0012, 11.0012)


@pytest.mark.parametrize("seed", range(6))
@pytest.mark.parametrize("bbox", [WHOLE, MOST, CORNER, SLIVER])
def test_the_crop_is_the_one_of_network_crop_in_the_same_order(
    seed: int, bbox: BBox
) -> None:
    # Sparse towns: the crop falls apart in many pieces, and both orders of
    # a NetworkX view come up (more, and less, than half of the zone).
    zone = _town(seed, 400, islands=(30, 7, 7))
    assert _layout(ZoneCrop(zone).crop(bbox)) == _layout(crop(zone, bbox))


def test_of_two_largest_pieces_the_same_one_is_kept() -> None:
    zone = _town(1, 0, islands=(40, 40, 40))
    for bbox in (WHOLE, MOST):
        assert _layout(ZoneCrop(zone).crop(bbox)) == _layout(crop(zone, bbox))


def test_a_crop_smaller_than_a_crossing_is_still_the_same() -> None:
    # A crossing with more roads than twice the nodes left: NetworkX lists
    # its neighbours another way, and ZoneCrop leaves the job to crop.
    zone = _town(2, 120, hub=60)
    bbox = (46.0, 11.0, 46.0025, 11.0025)
    inside = [
        n
        for n, d in zone.nodes(data=True)
        if bbox[0] <= d["y"] <= bbox[2] and bbox[1] <= d["x"] <= bbox[3]
    ]
    assert 0 < 2 * len(inside) < 60
    assert _layout(ZoneCrop(zone).crop(bbox)) == _layout(crop(zone, bbox))


def test_no_node_inside_fails_like_crop() -> None:
    zone = _town(3, 50)
    nowhere = (10.0, 10.0, 11.0, 11.0)
    with pytest.raises(ValueError):
        crop(zone, nowhere)
    with pytest.raises(ValueError):
        ZoneCrop(zone).crop(nowhere)


@pytest.fixture(scope="module")
def levico() -> Graph:
    return FileSource(FIXTURE).load((0.0, 0.0, 0.0, 0.0))


def _around(graph: Graph, share: float) -> BBox:
    """The middle `share` of the area of `graph`."""
    ys = [d["y"] for _, d in graph.nodes(data=True)]
    xs = [d["x"] for _, d in graph.nodes(data=True)]
    dy = (max(ys) - min(ys)) * (1 - share) / 2
    dx = (max(xs) - min(xs)) * (1 - share) / 2
    return (min(ys) + dy, min(xs) + dx, max(ys) - dy, max(xs) - dx)


@pytest.mark.parametrize("share", [1.0, 0.8, 0.5, 0.3, 0.1])
def test_real_roads_are_cropped_the_same(levico: Graph, share: float) -> None:
    bbox = _around(levico, share)
    assert _layout(ZoneCrop(levico).crop(bbox)) == _layout(crop(levico, bbox))


def test_changing_a_crop_leaves_the_zone_and_the_next_crop_alone(
    levico: Graph,
) -> None:
    before = pickle.dumps(_layout(levico))
    zone = ZoneCrop(levico)
    bbox = _around(levico, 0.8)
    expected = _layout(crop(levico, bbox))

    first = zone.crop(bbox)
    node = next(iter(first))
    first.add_node(_SINK)
    first.add_edge(node, _SINK)
    first.nodes[node]["y"] = 0.0
    u, v, key = next(iter(first.edges(keys=True)))
    first[u][v][key]["length"] = -1.0
    first.add_edge(u, v, length=1.0)
    first.remove_node(next(n for n in first if n not in (node, u, v, _SINK)))

    assert _SINK not in levico
    assert pickle.dumps(_layout(levico)) == before
    assert _layout(zone.crop(bbox)) == expected


def _heart(graph: Graph) -> Any:
    shape = project_shape(
        get_shape("heart")(24), LEVICO, initial_scale(get_shape("heart")(24), 1500)
    )
    return snap_to_network(graph, shape)


def test_two_routes_in_a_row_on_a_zone_are_the_route_of_the_old_crop(
    levico: Graph,
) -> None:
    bbox = _around(levico, 0.9)
    expected = _heart(crop(levico, bbox))
    assert len(expected.points) > 20
    before = pickle.dumps(_layout(levico))
    zone = ZoneCrop(levico)
    for _ in range(2):
        graph = zone.crop(bbox)
        route = _heart(graph)
        assert route.points == expected.points
        assert route.nodes == expected.nodes
        assert route.distance_m == expected.distance_m
        # The engine's sink node is gone from the crop, and never was in
        # the zone.
        assert _SINK not in graph
        assert _SINK not in levico
    assert pickle.dumps(_layout(levico)) == before


def test_routes_traced_at_the_same_time_on_a_zone_do_not_mix(levico: Graph) -> None:
    boxes = [_around(levico, share) for share in (0.95, 0.9, 0.85)]
    expected = [_heart(crop(levico, bbox)).points for bbox in boxes]
    before = pickle.dumps(_layout(levico))
    zone = ZoneCrop(levico)

    def trace(i: int) -> list[Any]:
        return _heart(zone.crop(boxes[i % len(boxes)])).points

    with ThreadPoolExecutor(6) as pool:
        traced = list(pool.map(trace, range(12)))
    assert traced == [expected[i % len(boxes)] for i in range(12)]
    assert pickle.dumps(_layout(levico)) == before
