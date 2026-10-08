"""A shape in pieces with the pen up through the API (TASK-223, ADR-0185):
the request reaches the engine as it is, and the walks come back. On the
water too (TASK-226): tests/test_paddling_pieces.py."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.models import (
    PEN_UP_WITHOUT_PIECES,
    RouteRequest,
    RouteResult,
)
from route_engine.network import FileSource
from route_engine.optimizer import GraphLoader, Plan
from route_engine.pieces import compose_shape

from shaperoute_api.app import create_app
from shaperoute_api.app import to_request as api_to_request
from shaperoute_api.on_phone import to_request
from shaperoute_api.schemas import (
    MAX_WALKS,
    PEN_UP_SHAPES,
    RouteRequestBody,
    RouteResultBody,
)

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _client(planner: Any) -> TestClient:
    app = create_app(FileSource(FIXTURES / "unused.graphml"), planner=planner)
    return TestClient(app)


def _smiley_result() -> RouteResult:
    # The walks of a word's fixture, on a smiley: what the engine answers.
    data = _load("route-result-pen-up.json")
    return RouteResult(
        **{
            **data,
            "points": [tuple(p) for p in data["points"]],
            "walks": [tuple(w) for w in data["walks"]],
            "shape": "smiley",
            "word": None,
        }
    )


def test_the_api_passes_a_shape_in_pieces_with_the_pen_up_on() -> None:
    asked: list[RouteRequest] = []

    def planner(request: RouteRequest, source: GraphLoader) -> Plan:
        asked.append(request)
        return Plan(result=_smiley_result(), search=None)

    body = _load("route-request-pen-up-shape.json")
    response = _client(planner).post("/routes", json=body)
    assert response.status_code == 200, response.json()
    assert asked[0].pen_up and asked[0].shape == "smiley"
    assert response.json()["walks"] == [list(w) for w in _smiley_result().walks]
    # The phone builds the same request (TASK-214).
    parsed = RouteRequestBody.model_validate(body)
    assert to_request(parsed) == api_to_request(parsed)


ON_WATER = {"activity": "paddling", "distance_m": 2000}


@pytest.mark.parametrize(
    ("body", "message"),
    [
        (
            {"shape": "heart", "pen_up": True},
            f"{PEN_UP_WITHOUT_PIECES}; heart has none",
        ),
        (
            {"shape": "heart", "pen_up": True, **ON_WATER},
            f"{PEN_UP_WITHOUT_PIECES}; heart has none",
        ),
    ],
)
def test_the_pen_up_is_refused_where_it_cannot_draw(
    body: dict[str, Any], message: str
) -> None:
    def planner(request: object, source: GraphLoader) -> Plan:
        raise AssertionError("the engine must not run")

    asked = {**_load("route-request.json"), **body}
    for path in ("/routes", "/route-jobs"):
        response = _client(planner).post(path, json=asked)
        assert response.status_code == 422
        error = response.json()["error"]
        assert error["code"] == "invalid_request"
        assert message in error["message"]


def test_every_walk_of_a_shape_in_pieces_fits_in_a_result() -> None:
    # The sun has 8 rays: one walk more than the longest word. On the water
    # the route also comes back to the outline (TASK-226): one more still.
    walks = {name: len(compose_shape(name).letters) - 1 for name in PEN_UP_SHAPES}
    assert max(walks.values()) == walks["sun"] == 8
    assert MAX_WALKS == 9
    points = [(46.0 + i / 1000, 11.0) for i in range(20)]
    rays = [(i, i + 1) for i in range(0, 18, 2)]
    sun = RouteResult(
        points=points, distance_m=2000.0, similarity=0.9, shape="sun", walks=rays
    )
    assert len(RouteResultBody.from_result(sun).walks) == 9
