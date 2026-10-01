"""POST /route-directions: the directions of a route the app has only as
points, a route of "Explore" (TASK-145, ADR-0117), on the made-up graph of
services/route-engine/tests/fixtures/make_directions_graph.py."""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from fastapi.testclient import TestClient
from route_engine.models import RouteResult
from route_engine.network import BBox, FileSource, Graph
from route_engine.optimizer import Plan
from route_engine.sidewalks import NamedRoad

from shaperoute_api.app import create_app
from shaperoute_api.graphs import MapDataUnavailableError
from shaperoute_api.jobs import with_directions
from shaperoute_api.line_directions import MARGIN_M, RouteDirectionsBody, bbox_around

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
GRAPH = REPO / "services/route-engine/tests/fixtures/directions_junctions.graphml"
# The route of fixtures/route-directions-request.json: W, T, E, F, H.
ROUTE = [1, 2, 3, 4, 10]


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text("utf-8"))


def _graph() -> Graph:
    return FileSource(GRAPH).load((0.0, 0.0, 0.0, 0.0))


class _Graphs:
    """The graph of the made-up junctions, whatever the area; the areas
    asked are kept."""

    def __init__(self) -> None:
        self.asked: list[BBox] = []

    def load(self, bbox: BBox) -> Graph:
        self.asked.append(bbox)
        return _graph()


class _NamedGraphs(_Graphs):
    def __init__(self) -> None:
        super().__init__()
        self.names_asked: list[BBox] = []

    def named_roads(self, bbox: BBox) -> list[NamedRoad]:
        self.names_asked.append(bbox)
        return []


def _post(source: Any, body: Any) -> Any:
    return TestClient(create_app(source)).post("/route-directions", json=body)


def test_the_answer_is_the_contract_fixture() -> None:
    response = _post(_Graphs(), _load("route-directions-request.json"))
    assert response.status_code == 200
    assert response.json() == _load("route-directions.json")
    RouteDirectionsBody.model_validate(response.json())


def test_the_directions_are_those_the_planned_route_had() -> None:
    planned: Any = SimpleNamespace(
        best=SimpleNamespace(route=SimpleNamespace(nodes=ROUTE))
    )
    result = RouteResult(points=[], distance_m=770.0, similarity=0.9, shape="heart")
    expected = with_directions(Plan(result=result, search=planned), [_graph()])
    body = _post(_Graphs(), _load("route-directions-request.json")).json()
    said = [(d["node"], d["turn"], d["street"]) for d in body["directions"]]
    assert said == [(d.node, d.turn, d.street) for d in expected.directions]
    assert [d["turn"] for d in body["directions"]] == ["depart", "straight", "right"]


def test_the_graph_is_asked_around_the_route() -> None:
    source = _Graphs()
    points = _load("route-directions-request.json")["points"]
    _post(source, {"points": points})
    [(south, west, north, east)] = source.asked
    assert (south, west, north, east) == bbox_around(points, MARGIN_M)
    for lat, lon in points:
        assert south < lat < north and west < lon < east


def test_an_unnamed_road_asks_for_the_street_beside_it() -> None:
    source = _NamedGraphs()
    graph = _graph()
    # W, T, E, then left onto the footway to S: a road without a name.
    points = [[graph.nodes[n]["y"], graph.nodes[n]["x"]] for n in (1, 2, 3, 5)]
    body = _post(source, {"points": points}).json()
    assert body["directions"][-1]["street"] is None
    assert len(source.names_asked) == 1


def test_a_route_off_the_map_is_refused() -> None:
    response = _post(_Graphs(), {"points": [[45.0, 10.0], [45.001, 10.001]]})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_request"
    assert "roads of this map" in error["message"]


def test_without_the_zone_the_map_is_unavailable() -> None:
    class _Offline:
        def load(self, bbox: BBox) -> Graph:
            raise MapDataUnavailableError("Overpass did not answer")

    response = _post(_Offline(), _load("route-directions-request.json"))
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "map_data_unavailable"


def test_a_body_that_is_not_a_route_is_invalid() -> None:
    for body in (
        {"points": [[46.0, 11.0]]},
        {"points": [[91.0, 11.0], [46.0, 11.0]]},
        {"points": [[46.0, 11.0], [46.0, 11.1]], "shape": "heart"},
    ):
        response = _post(_Graphs(), body)
        assert response.status_code == 422, body
        assert response.json()["error"]["code"] == "invalid_request"
