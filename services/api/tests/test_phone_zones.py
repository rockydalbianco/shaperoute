"""The zone files of the phone: written and read back the same graph
(phone_zones.py, TASK-214, ADR-0177)."""

from __future__ import annotations

import gzip
import json
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import networkx as nx
import numpy as np
import osmnx as ox
import pytest
from route_engine.network import Graph
from route_engine.sidewalks import NamedRoad
from shapely.geometry import LineString

from shaperoute_api.graphs import MapDataUnavailableError
from shaperoute_api.phone_zones import (
    SUFFIX,
    PhoneZones,
    ZoneFormatError,
    read_zone,
    write_zone,
    zone_bbox,
    zone_name,
)

REPO = Path(__file__).resolve().parents[3]
LEVICO_GRAPH = REPO / "services/route-engine/tests/fixtures/levico_walk_1km.graphml"
BBOX = (45.95, 11.2, 46.07, 11.4)
ROADS = [
    NamedRoad("Via Dante", ((46.0122, 11.2986), (46.0130, 11.2990))),
    NamedRoad("Far away", ((40.0, 10.0), (40.1, 10.1))),
]


def same_graph(a: Graph, b: Graph) -> None:
    """Equal, and in the same order: what the engine's ties depend on."""
    assert type(a) is type(b)
    assert a.graph == b.graph
    assert list(a.nodes(data=True)) == list(b.nodes(data=True))
    for u in a:
        assert list(a.succ[u]) == list(b.succ[u])
        assert list(a.pred[u]) == list(b.pred[u])
    edges_a = list(a.edges(keys=True, data=True))
    edges_b = list(b.edges(keys=True, data=True))
    assert [e[:3] for e in edges_a] == [e[:3] for e in edges_b]
    for (*_, da), (*_, db) in zip(edges_a, edges_b, strict=True):
        assert list(da) == list(db)
        for name, value in da.items():
            assert same_value(value, db[name]), (name, value, db[name])


def same_value(a: Any, b: Any) -> bool:
    if isinstance(a, LineString):
        return isinstance(b, LineString) and list(a.coords) == list(b.coords)
    return type(a) is type(b) and a == b


def round_trip(graph: Graph, tmp_path: Path, names: Sequence[NamedRoad] = ()) -> Path:
    path = tmp_path / f"{zone_name('foot', BBOX)}{SUFFIX}"
    write_zone(graph, names, "foot", BBOX, path)
    return path


def test_a_real_zone_comes_back_the_same(tmp_path: Path) -> None:
    graph = ox.load_graphml(LEVICO_GRAPH)
    assert any(
        isinstance(d.get("geometry"), LineString) for *_, d in graph.edges(data=True)
    )
    back, names = read_zone(round_trip(graph, tmp_path, ROADS))
    same_graph(graph, back)
    assert names == ROADS


def test_the_order_of_successors_and_predecessors_is_kept(tmp_path: Path) -> None:
    # Added so that no node order gives these predecessors: 3 before 1.
    graph = nx.MultiDiGraph()
    graph.add_nodes_from([1, 2, 3, 4])
    graph.add_edge(3, 2, length=1.0)
    graph.add_edge(1, 4, length=2.0)
    graph.add_edge(1, 2, length=3.0)
    graph.add_edge(1, 2, length=4.0)  # a parallel edge, key 1
    graph.add_edge(2, 2, length=5.0)  # a loop
    graph.add_edge(4, 1, length=6.0)
    graph.add_edge(3, 4, length=7.0)
    assert list(graph.pred[2]) == [3, 1, 2]
    back, _ = read_zone(round_trip(graph, tmp_path))
    same_graph(graph, back)


def test_values_and_their_types(tmp_path: Path) -> None:
    graph = nx.MultiDiGraph(crs="epsg:4326", simplified=True)
    graph.add_node((0, 1), x=11.0, y=46.0, street_count=3)
    graph.add_node((1, 1), x=11.001, y=46.0, highway="crossing")
    graph.add_edge(
        (0, 1),
        (1, 1),
        length=np.float64(77.123456789),
        osmid=[1, 2],
        highway=["footway", "path"],
        oneway=False,
        reversed=[True, False],
        name=None,
        geometry=LineString([(11.0, 46.0), (11.0005, 46.0001), (11.001, 46.0)]),
    )
    back, _ = read_zone(round_trip(graph, tmp_path))
    same_graph(graph, back)
    assert type(back.edges[(0, 1), (1, 1), 0]["length"]) is np.float64


def test_numpy_integers_and_booleans_come_back_as_python_ones(tmp_path: Path) -> None:
    graph = nx.MultiDiGraph()
    graph.add_edge(1, 2, lanes=np.int64(2), lit=np.bool_(True))
    back, _ = read_zone(round_trip(graph, tmp_path))
    assert back.edges[1, 2, 0] == {"lanes": 2, "lit": True}


def test_a_value_that_is_not_data_is_refused(tmp_path: Path) -> None:
    graph = nx.MultiDiGraph()
    graph.add_edge(1, 2, call=print)
    with pytest.raises(TypeError, match="builtin_function_or_method"):
        round_trip(graph, tmp_path)
    assert list(tmp_path.iterdir()) == []


def test_another_format_or_version_is_refused(tmp_path: Path) -> None:
    path = round_trip(nx.MultiDiGraph(), tmp_path)
    with gzip.open(path, "rt", encoding="utf-8") as file:
        document = json.load(file)
    document["version"] = 2
    with gzip.open(path, "wt", encoding="utf-8") as file:
        json.dump(document, file)
    with pytest.raises(ZoneFormatError):
        read_zone(path)


def test_the_name_says_the_area() -> None:
    name = zone_name("bike", (45.9828, 10.9999, 46.1514, 11.2429))
    assert name == "bike_45.98280_10.99990_46.15140_11.24290"
    assert zone_bbox(Path(f"{name}{SUFFIX}")) == (45.9828, 10.9999, 46.1514, 11.2429)
    assert zone_bbox(Path(f"{name}.graphml")) is None
    assert zone_bbox(Path(f"bike_x{SUFFIX}")) is None


def test_the_smallest_zone_of_the_network_that_covers_the_area(tmp_path: Path) -> None:
    for network, bbox in [
        ("foot", (45.0, 11.0, 47.0, 12.0)),
        ("foot", (45.9, 11.1, 46.1, 11.4)),
        ("bike", (45.95, 11.2, 46.05, 11.35)),
    ]:
        (tmp_path / f"{zone_name(network, bbox)}{SUFFIX}").touch()
    zones = PhoneZones(tmp_path, "foot")
    found = zones.covering_path((46.0, 11.25, 46.02, 11.3))
    assert found == tmp_path / f"{zone_name('foot', (45.9, 11.1, 46.1, 11.4))}{SUFFIX}"
    assert zones.covering_path((44.0, 11.0, 44.1, 11.1)) is None


def test_the_phone_does_not_download(tmp_path: Path) -> None:
    with pytest.raises(MapDataUnavailableError):
        PhoneZones(tmp_path, "foot").load(BBOX)


def test_the_names_around_an_area_from_its_zone(tmp_path: Path) -> None:
    round_trip(nx.MultiDiGraph(), tmp_path, ROADS)
    zones = PhoneZones(tmp_path, "foot")
    assert zones.named_roads((46.0, 11.29, 46.02, 11.30)) == ROADS[:1]
    assert zones.named_roads((44.0, 11.0, 44.1, 11.1)) == []
