"""POST /routes end to end, and every error the API can return (docs/API.md)."""

from __future__ import annotations

from dataclasses import fields
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import GraphLoader, Plan, ShapeNotDrawableError
from route_engine.validation import InvalidRouteError

from shaperoute_api.app import create_app
from shaperoute_api.graphs import MapDataUnavailableError

REPO = Path(__file__).resolve().parents[3]
LEVICO_GRAPH = REPO / "services/route-engine/tests/fixtures/levico_walk_1km.graphml"

LEVICO_CIRCLE = {
    "start": [46.0122, 11.2986],
    "shape": "circle",
    "distance_m": 1500,
    "activity": "running",
}

TRENTO_HEART = {
    "start": [46.0671, 11.1214],
    "shape": "heart",
    "distance_m": 5000,
    "activity": "running",
}


def failing_with(exc: Exception):  # type: ignore[no-untyped-def]
    def planner(request: RouteRequest, source: GraphLoader) -> Plan:
        raise exc

    return planner


def client_failing_with(exc: Exception) -> TestClient:
    app = create_app(source=FileSource(LEVICO_GRAPH), planner=failing_with(exc))
    # A 500 is an answer to check here, not an error of the test.
    return TestClient(app, raise_server_exceptions=False)


def test_health() -> None:
    client = TestClient(create_app(FileSource(LEVICO_GRAPH)))
    assert client.get("/health").json() == {"status": "ok"}


def test_a_route_on_the_levico_test_graph() -> None:
    # The only real run of the engine here: about 5 s.
    client = TestClient(create_app(FileSource(LEVICO_GRAPH)))
    response = client.post("/routes", json=LEVICO_CIRCLE)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {f.name for f in fields(RouteResult)}
    assert body["shape"] == "circle"
    assert body["points"][0] == body["points"][-1]
    assert len(body["points"]) > 10
    assert 0.0 <= body["similarity"] <= 1.0
    assert body["distance_m"] > 0


@pytest.mark.parametrize(
    ("body", "fragment"),
    [
        ({k: v for k, v in TRENTO_HEART.items() if k != "distance_m"}, "distance_m"),
        ({**TRENTO_HEART, "distance": 5000}, "distance"),
        ({**TRENTO_HEART, "start": [46.0671]}, "start"),
        ({**TRENTO_HEART, "distance_m": "far"}, "distance_m"),
        ({**TRENTO_HEART, "distance_m": 100}, "distance must be between"),
        ({**TRENTO_HEART, "shape": "house"}, "unknown shape 'house'"),
        ({**TRENTO_HEART, "start": [91.0, 11.1]}, "latitude must be between"),
    ],
)
def test_invalid_requests(body: dict[str, object], fragment: str) -> None:
    client = client_failing_with(AssertionError("the engine must not run"))
    response = client.post("/routes", json=body)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"
    assert fragment in response.json()["error"]["message"]


def test_malformed_json() -> None:
    client = client_failing_with(AssertionError("the engine must not run"))
    response = client.post(
        "/routes", content=b"{not json", headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


@pytest.mark.parametrize(
    ("exc", "status", "code", "message"),
    [
        (
            ShapeNotDrawableError("a 5 km heart cannot be drawn here: too few roads"),
            422,
            "shape_not_drawable",
            "a 5 km heart cannot be drawn here: too few roads",
        ),
        (
            MapDataUnavailableError("OpenStreetMap data could not be downloaded"),
            503,
            "map_data_unavailable",
            "OpenStreetMap data could not be downloaded",
        ),
        (
            InvalidRouteError("the route does not close"),
            500,
            "engine_error",
            "The route engine failed; see the API log.",
        ),
        (
            KeyError("anything unexpected"),
            500,
            "engine_error",
            "The route engine failed; see the API log.",
        ),
    ],
)
def test_engine_errors(exc: Exception, status: int, code: str, message: str) -> None:
    response = client_failing_with(exc).post("/routes", json=TRENTO_HEART)
    assert response.status_code == status
    assert response.json() == {"error": {"code": code, "message": message}}


def test_unknown_paths_use_the_same_error_shape() -> None:
    response = client_failing_with(AssertionError()).get("/nowhere")
    assert response.status_code == 404
    assert response.json() == {"error": {"code": "http_error", "message": "Not Found"}}
