"""Directions on an unnamed road say the street it runs along (TASK-060,
ADR-0057), deduced by the engine (ADR-0054) and kept apart from `street`.

A small graph built here, in metres around a point in Milan: no network,
no saved file needed.
"""

from __future__ import annotations

import math
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import networkx as nx
import pytest
from fastapi.testclient import TestClient
from route_engine import network
from route_engine.geo import LatLon, local_to_latlon
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import BBox, Graph, OsmnxSource, write_named_roads
from route_engine.optimizer import GraphLoader, Plan
from route_engine.sidewalks import NamedRoad

from shaperoute_api.alongs import around
from shaperoute_api.app import create_app
from shaperoute_api.graphs import ZoneGraphs
from shaperoute_api.jobs import RouteJobs, with_directions

ORIGIN: LatLon = (45.46, 9.19)
# A sidewalk beside Via Dante (x = 0, left out of the graph), then the
# sidewalk beside Corso Magenta, which is in the graph.
PLACES = {
    1: (8, 0),
    2: (8, 200),
    3: (8, 260),
    4: (200, 260),
    5: (8, 266),
    6: (200, 266),
    7: (8, 400),
}
ROUTE = [1, 2, 3, 5, 6]
REQUEST_BODY = {"start": [45.46, 9.19], "shape": "heart", "distance_m": 5000}
RESULT = RouteResult(
    points=[(45.46, 9.19)], distance_m=460.0, similarity=0.9, shape="heart"
)


def at(x_m: float, y_m: float) -> LatLon:
    return local_to_latlon(ORIGIN, x_m, y_m)


DANTE = NamedRoad("Via Dante", (at(0, 0), at(0, 200)))


def _graph() -> Graph:
    g = nx.MultiDiGraph(crs="EPSG:4326")
    for node, (x, y) in PLACES.items():
        lat, lon = at(x, y)
        g.add_node(node, x=lon, y=lat)

    def edge(u: int, v: int, **tags: str) -> None:
        length = math.dist(PLACES[u], PLACES[v])
        g.add_edge(u, v, length=length, **tags)
        g.add_edge(v, u, length=length, **tags)

    edge(1, 2, highway="footway")
    edge(2, 3, highway="footway")
    edge(3, 4, highway="secondary", name="Corso Magenta")
    edge(3, 5, highway="footway")
    edge(5, 6, highway="footway")
    edge(5, 7, highway="footway")
    return g


def _plan() -> Plan:
    search: Any = SimpleNamespace(
        best=SimpleNamespace(route=SimpleNamespace(nodes=ROUTE))
    )
    return Plan(result=RESULT, search=search)


def _said(result: RouteResult) -> list[tuple[Any, str | None, str | None]]:
    return [(d.node, d.street, d.along) for d in result.directions]


def test_an_unnamed_road_gets_the_street_it_runs_along() -> None:
    result = with_directions(_plan(), [_graph()], lambda bbox: [DANTE])
    assert _said(result) == [
        (1, None, "Via Dante"),  # a street left out of the graph
        (5, None, "Corso Magenta"),  # a street of the graph
    ]


def test_without_the_names_file_the_streets_of_the_graph_still_count() -> None:
    result = with_directions(_plan(), [_graph()])
    assert _said(result) == [(1, None, None), (5, None, "Corso Magenta")]


def test_names_that_cannot_be_read_do_not_fail_the_route() -> None:
    def broken(bbox: BBox) -> list[NamedRoad]:
        raise OSError("names file unreadable")

    result = with_directions(_plan(), [_graph()], broken)
    assert _said(result) == [(1, None, None), (5, None, "Corso Magenta")]


def test_a_road_with_a_name_of_its_own_gets_no_along() -> None:
    g = _graph()
    g[1][2][0]["name"] = g[2][1][0]["name"] = "Via Uno"
    result = with_directions(_plan(), [g], lambda bbox: [DANTE])
    assert _said(result)[0] == (1, "Via Uno", None)


def test_names_are_asked_for_around_the_route() -> None:
    asked: list[BBox] = []

    def names(bbox: BBox) -> list[NamedRoad]:
        asked.append(bbox)
        return [DANTE]

    with_directions(_plan(), [_graph()], names)
    [(south, west, north, east)] = asked
    for x, y in (PLACES[node] for node in ROUTE):
        lat, lon = at(x, y)
        assert south < lat < north and west < lon < east
    assert asked[0] == around(_graph(), ROUTE)
    # ... and not asked for at all when every road has a name.
    g = _graph()
    for u, v, data in g.edges(data=True):
        data["name"] = f"Via {u}{v}"
    with_directions(_plan(), [g], names)
    assert len(asked) == 1


class _NamedGraphs:
    """A graph source that knows the names its graph leaves out."""

    def load(self, bbox: BBox) -> Graph:
        return _graph()

    def named_roads(self, bbox: BBox) -> list[NamedRoad]:
        return [DANTE]


def test_the_api_answers_with_along_apart_from_street() -> None:
    def planner(request: RouteRequest, source: GraphLoader) -> Plan:
        source.load((45.4, 9.1, 45.5, 9.2))
        return _plan()

    jobs = RouteJobs(_NamedGraphs(), planner)
    try:
        client = TestClient(create_app(_NamedGraphs(), jobs=jobs))
        job_id = client.post("/route-jobs", json=REQUEST_BODY).json()["job_id"]
        deadline = time.monotonic() + 5
        while (body := client.get(f"/route-jobs/{job_id}").json())["status"] != "done":
            assert body["status"] != "failed", body
            assert time.monotonic() < deadline, body
            time.sleep(0.01)
    finally:
        jobs.shutdown()
    said = [(d["street"], d["along"]) for d in body["result"]["directions"]]
    assert said == [(None, "Via Dante"), (None, "Corso Magenta")]


def test_zone_graphs_read_the_names_file_and_never_download_it(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def no_network(query: str) -> dict[str, Any]:
        raise AssertionError("Overpass asked for names during a route")

    monkeypatch.setattr(network, "_overpass", no_network)
    source = OsmnxSource(tmp_path)
    graphs = ZoneGraphs(source)
    bbox = (45.45, 9.18, 45.47, 9.20)
    assert graphs.named_roads(bbox) == []
    write_named_roads([DANTE], source.names_path((45.4, 9.1, 45.5, 9.3)))
    assert [road.name for road in graphs.named_roads(bbox)] == ["Via Dante"]


def test_zone_graphs_without_names_have_none() -> None:
    class _Plain:
        def covering_path(self, bbox: BBox) -> Path | None:
            return None

        def cache_path(self, bbox: BBox) -> Path:
            return Path("unused.graphml")

        def load(self, bbox: BBox) -> Graph:
            return _graph()

    assert ZoneGraphs(_Plain()).named_roads((45.4, 9.1, 45.5, 9.2)) == []
