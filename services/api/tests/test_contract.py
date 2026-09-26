"""The API bodies mirror the shared-types contract (ADR-0028, ADR-0030).

The same JSON examples in packages/shared-types/fixtures are read by tsc,
by the engine's test_contract.py and here: if one side changes, a test fails.
"""

from __future__ import annotations

import inspect
import json
import re
from dataclasses import fields
from pathlib import Path
from typing import Any, get_args

from fastapi.testclient import TestClient
from pydantic import BaseModel
from route_engine import image_outline
from route_engine.directions import Direction
from route_engine.image_outline import MAX_POINTS
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import GraphLoader, Plan
from shaperoute_ai.reading import MAX_TEXT_LENGTH

from shaperoute_api.app import create_app
from shaperoute_api.schemas import (
    MAX_IMAGE_BYTES,
    DirectionBody,
    ErrorBody,
    ErrorCode,
    ErrorDetail,
    GpxRequestBody,
    ImageOutlineBody,
    ImageOutlineRequestBody,
    ImageReason,
    ImageRouteRequestBody,
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


def test_the_api_passes_the_word_on_and_answers_its_result_unchanged() -> None:
    data = _load("route-result-word.json")
    result = RouteResult(**{**data, "points": [tuple(p) for p in data["points"]]})
    asked: list[RouteRequest] = []

    def planner(request: RouteRequest, source: GraphLoader) -> Plan:
        asked.append(request)
        return Plan(result=result, search=None)

    app = create_app(FileSource(FIXTURES / "unused.graphml"), planner=planner)
    response = TestClient(app).post("/routes", json=_load("route-request-word.json"))
    assert response.status_code == 200
    assert response.json() == data
    assert asked[0].word == "ciao"


def test_image_fixtures_are_valid_bodies() -> None:
    # TASK-073, ADR-0069: the outline of an image, its route, its refusal.
    request = _load("image-outline-request.json")
    assert set(request) == _names(ImageOutlineRequestBody)
    ImageOutlineRequestBody.model_validate(request)
    outline = _load("image-outline.json")
    assert set(outline) == _names(ImageOutlineBody)
    ImageOutlineBody.model_validate(outline)
    route = _load("image-route-request.json")
    assert set(route) == _names(ImageRouteRequestBody)
    assert ImageRouteRequestBody.model_validate(route).outline == [
        tuple(p) for p in outline["points"]
    ]
    result = _load("route-result-image.json")
    assert set(result) == _names(RouteResultBody)
    body = RouteResultBody.model_validate(result)
    assert body.shape is None and body.word is None
    error = _load("image-error.json")
    assert set(error["error"]) == _names(ErrorDetail)
    assert ErrorBody.model_validate(error).error.reason == "background"


def test_an_image_route_request_is_a_route_request_with_an_outline() -> None:
    engine = {f.name for f in fields(RouteRequest)} - {"shape", "word"}
    assert _names(ImageRouteRequestBody) == engine | {"outline"}


def test_image_reasons_and_limits_match_shared_types() -> None:
    assert list(get_args(ImageReason)) == _load("image-reasons.json")
    assert _load("image-limits.json") == {
        "max_image_bytes": MAX_IMAGE_BYTES,
        "max_outline_points": MAX_POINTS,
    }


def test_every_reason_of_the_engine_is_in_the_contract() -> None:
    source = inspect.getsource(image_outline)
    raised = set(re.findall(r'InvalidImageError\(\s*"(\w+)"', source))
    assert raised == set(get_args(ImageReason))
