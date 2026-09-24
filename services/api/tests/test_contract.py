"""The API bodies mirror the shared-types contract (ADR-0028, ADR-0030).

The same JSON examples in packages/shared-types/fixtures are read by tsc,
by the engine's test_contract.py and here: if one side changes, a test fails.
"""

from __future__ import annotations

import json
from dataclasses import fields
from pathlib import Path
from typing import Any, get_args

from fastapi.testclient import TestClient
from pydantic import BaseModel
from route_engine.directions import Direction
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import GraphLoader, Plan
from shaperoute_ai.reading import MAX_TEXT_LENGTH

from shaperoute_api.app import create_app
from shaperoute_api.schemas import (
    DirectionBody,
    ErrorBody,
    ErrorCode,
    ErrorDetail,
    GpxRequestBody,
    JobStatus,
    RouteJobBody,
    RouteRequestBody,
    RouteResultBody,
    ShapeReadingBody,
    ShapeReadingRequestBody,
)

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _names(model: type[BaseModel]) -> set[str]:
    return set(model.model_fields)


def test_bodies_have_the_fields_of_the_dataclasses() -> None:
    assert _names(RouteRequestBody) == {f.name for f in fields(RouteRequest)}
    assert _names(RouteResultBody) == {f.name for f in fields(RouteResult)}
    assert _names(DirectionBody) == {f.name for f in fields(Direction)}


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


def test_error_fixture_is_a_valid_error_body() -> None:
    data = _load("api-error.json")
    assert set(data) == _names(ErrorBody)
    assert set(data["error"]) == _names(ErrorDetail)
    assert ErrorBody.model_validate(data).error.code == "shape_not_drawable"


def test_error_codes_match_shared_types() -> None:
    assert list(get_args(ErrorCode)) == _load("api-error-codes.json")


def test_route_job_fixtures_are_valid_bodies() -> None:
    for name in (
        "route-job-running.json",
        "route-job-done.json",
        "route-job-failed.json",
    ):
        data = _load(name)
        assert set(data) == _names(RouteJobBody), name
        RouteJobBody.model_validate(data)
    assert RouteJobBody.model_validate(_load("route-job-done.json")).result is not None
    assert RouteJobBody.model_validate(_load("route-job-failed.json")).error is not None


def test_job_statuses_match_shared_types() -> None:
    assert list(get_args(JobStatus)) == _load("route-job-statuses.json")


def test_gpx_request_fixture_is_a_valid_body() -> None:
    data = _load("gpx-request.json")
    assert set(data) == _names(GpxRequestBody)
    assert set(data["request"]) == _names(RouteRequestBody)
    assert set(data["result"]) == _names(RouteResultBody)
    GpxRequestBody.model_validate(data)


def test_shape_reading_fixtures_are_valid_bodies() -> None:
    request = _load("shape-reading-request.json")
    assert set(request) == _names(ShapeReadingRequestBody)
    ShapeReadingRequestBody.model_validate(request)
    for name in ("shape-reading.json", "shape-reading-none.json"):
        data = _load(name)
        assert set(data) == _names(ShapeReadingBody), name
        ShapeReadingBody.model_validate(data)


def test_shape_text_limit_matches_shared_types() -> None:
    assert _load("shape-reading-limits.json") == {"max_text_length": MAX_TEXT_LENGTH}


def test_word_fixtures_are_valid_bodies() -> None:
    # A word instead of a shape, the other null (TASK-056).
    request = _load("route-request-word.json")
    assert set(request) == _names(RouteRequestBody)
    assert RouteRequestBody.model_validate(request).word == "ciao"
    result = _load("route-result-word.json")
    assert set(result) == _names(RouteResultBody)
    body = RouteResultBody.model_validate(result)
    assert body.shape is None
    assert body.word == "CIAO"
