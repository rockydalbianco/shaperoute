"""POST /track-scores: the engine's score of a run (ADR-0090, ADR-0092)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from route_engine.track_score import TrackPoint, score_track

from shaperoute_api.app import create_app
from shaperoute_api.schemas import (
    MAX_TRACK_FIXES,
    TrackFixBody,
    TrackScoreBody,
    TrackScoreRequestBody,
)

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def body() -> Any:
    return _load("track-score-request.json")


def client() -> TestClient:
    return TestClient(create_app(FileSource(Path("unused.graphml"))))


def _names(model: type) -> set[str]:
    return set(model.model_fields)  # type: ignore[attr-defined]


def test_the_fixtures_are_the_contract() -> None:
    request = body()
    assert set(request) == _names(TrackScoreRequestBody)
    assert set(request["track"][0]) == _names(TrackFixBody)
    TrackScoreRequestBody.model_validate(request)
    answer = _load("track-score.json")
    assert set(answer) == _names(TrackScoreBody)
    TrackScoreBody.model_validate(answer)


def test_the_route_run_exactly_scores_what_the_route_scored() -> None:
    data = body()
    response = client().post("/track-scores", json=data)
    assert response.status_code == 200
    scored = response.json()
    assert scored["score"] == round(data["similarity"] * 100)
    assert scored == pytest.approx(_load("track-score.json"), abs=0.05)


def test_the_score_is_the_engines() -> None:
    data = body()
    data["track"] = data["track"][:3]
    track = [
        TrackPoint(*fix["point"], fix["time_ms"] / 1000, fix["accuracy_m"])
        for fix in data["track"]
    ]
    points = [tuple(point) for point in data["points"]]
    expected = score_track(track, points, data["similarity"])
    scored = client().post("/track-scores", json=data).json()
    assert scored["score"] == expected.score < round(data["similarity"] * 100)
    assert scored["covered"] == pytest.approx(expected.covered)
    assert scored["covered"] == pytest.approx(0.5, abs=0.05)


def test_a_fix_may_come_without_its_accuracy() -> None:
    data = body()
    for fix in data["track"]:
        del fix["accuracy_m"]
    assert client().post("/track-scores", json=data).status_code == 200


@pytest.mark.parametrize(
    ("track", "reason"),
    [
        ([], "0 usable positions"),
        (body()["track"][:1], "1 usable positions"),
        (
            [
                {"point": [46.0671, 11.1214], "time_ms": 0},
                {"point": [46.0671, 11.1224], "time_ms": 30_000},
            ],
            "less than 10%",
        ),
    ],
)
def test_a_run_too_short_is_refused_with_the_reason(
    track: list[Any], reason: str
) -> None:
    response = client().post("/track-scores", json={**body(), "track": track})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_request"
    assert error["message"].startswith("This run cannot be scored: ")
    assert reason in error["message"]


@pytest.mark.parametrize(
    "change",
    [
        {"similarity": 1.2},
        {"similarity": None},
        {"points": [[46.0671]]},
        {"track": [{"point": [46.0671, 11.1214]}]},
        {"track": [{"point": [46.0671, 11.1214], "time_ms": 0, "speed": 3}]},
        {"track": [{"point": [46.0, 11.0], "time_ms": 0}] * (MAX_TRACK_FIXES + 1)},
        {"shape": "heart"},
    ],
)
def test_a_malformed_body_is_an_invalid_request(change: dict[str, Any]) -> None:
    response = client().post("/track-scores", json={**body(), **change})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_a_route_of_one_point_is_refused() -> None:
    data = {**body(), "points": [[46.0671, 11.1214]]}
    response = client().post("/track-scores", json=data)
    assert response.status_code == 422
    assert "planned route" in response.json()["error"]["message"]
