"""The API bodies mirror the shared-types contract (ADR-0028, ADR-0030).

The same JSON examples in packages/shared-types/fixtures are read by tsc,
by the engine's test_contract.py and here: if one side changes, a test fails.
"""

from __future__ import annotations

import json
from dataclasses import fields
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient
from pydantic import BaseModel
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import GraphLoader, Plan

from shaperoute_api.app import create_app
from shaperoute_api.schemas import RouteRequestBody, RouteResultBody

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _names(model: type[BaseModel]) -> set[str]:
    return set(model.model_fields)


def test_bodies_have_the_fields_of_the_dataclasses() -> None:
    assert _names(RouteRequestBody) == {f.name for f in fields(RouteRequest)}
    assert _names(RouteResultBody) == {f.name for f in fields(RouteResult)}


def test_request_fixture_is_a_valid_body() -> None:
    data = _load("route-request.json")
    assert set(data) == _names(RouteRequestBody)
    body = RouteRequestBody.model_validate(data)
    assert body.start == (46.0671, 11.1214)


def test_result_fixture_is_a_valid_body() -> None:
    data = _load("route-result.json")
    assert set(data) == _names(RouteResultBody)
    body = RouteResultBody.model_validate(data)
    assert body.points[0] == body.points[-1]


def test_the_api_answers_the_result_fixture_unchanged() -> None:
    data = _load("route-result.json")
    result = RouteResult(**{**data, "points": [tuple(p) for p in data["points"]]})

    def planner(request: RouteRequest, source: GraphLoader) -> Plan:
        return Plan(result=result, search=None)

    app = create_app(FileSource(FIXTURES / "unused.graphml"), planner=planner)
    response = TestClient(app).post("/routes", json=_load("route-request.json"))
    assert response.status_code == 200
    assert response.json() == data
