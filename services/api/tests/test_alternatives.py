"""Other routes to choose from, over HTTP (TASK-093, ADR-0087): each a whole
result with its own directions, recorded in the request log, and taken
back by /gpx from an app that chose one."""

from __future__ import annotations

import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.models import RouteResult
from route_engine.network import FileSource, Graph
from route_engine.optimizer import GraphLoader, Plan

from shaperoute_api import jobs
from shaperoute_api.app import create_app
from shaperoute_api.images import AnyRequest
from shaperoute_api.request_log import FILE_NAME, RequestLog, fingerprint, read_entries

HEART = {"start": [46.0671, 11.1214], "shape": "heart", "distance_m": 5000}


def result(similarity: float, east: float) -> RouteResult:
    start = (46.0671, 11.1214)
    points = [start, (46.0680, 11.1214 + east), start]
    return RouteResult(points, 5000.0 + east, similarity, "heart")


CHOSEN = result(0.85, 0.001)
OTHERS = [result(0.84, 0.002), result(0.80, 0.003)]


def planner(request: AnyRequest, source: GraphLoader) -> Plan:
    return Plan(CHOSEN, None, alternatives=[Plan(r, None) for r in OTHERS])


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    app = create_app(
        FileSource(Path("unused.graphml")),
        planner=planner,
        request_log=RequestLog(tmp_path),
    )
    with TestClient(app) as http:
        yield http


def done(client: TestClient) -> dict[str, Any]:
    job_id = client.post("/route-jobs", json=HEART).json()["job_id"]
    deadline = time.monotonic() + 5
    while (body := client.get(f"/route-jobs/{job_id}").json())["status"] != "done":
        assert time.monotonic() < deadline, body
        time.sleep(0.01)
    result: dict[str, Any] = body["result"]
    return result


def test_a_job_answers_the_route_and_its_alternatives_best_first(
    client: TestClient,
) -> None:
    body = done(client)
    assert body["similarity"] == 0.85
    assert [other["similarity"] for other in body["alternatives"]] == [0.84, 0.80]
    for other in body["alternatives"]:
        assert set(other) == set(body)
        assert other["alternatives"] == []


def test_the_one_go_route_has_the_alternatives_too(client: TestClient) -> None:
    body = client.post("/routes", json=HEART).json()
    assert [other["distance_m"] for other in body["alternatives"]] == [
        r.distance_m for r in OTHERS
    ]


def test_each_alternative_gets_its_own_directions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seen: list[RouteResult] = []

    def with_directions(plan: Plan, graphs: list[Graph], named: Any = None) -> Any:
        seen.append(plan.result)
        return plan.result

    monkeypatch.setattr(jobs, "with_directions", with_directions)
    chosen = jobs.with_choices(planner(None, None), [])  # type: ignore[arg-type]
    assert seen == [CHOSEN, *OTHERS]
    assert chosen.alternatives == OTHERS


def test_the_request_log_records_the_alternatives(
    client: TestClient, tmp_path: Path
) -> None:
    done(client)
    deadline = time.monotonic() + 5
    while not (tmp_path / FILE_NAME).exists() or not read_entries(tmp_path / FILE_NAME):
        assert time.monotonic() < deadline
        time.sleep(0.01)
    [line] = read_entries(tmp_path / FILE_NAME)
    assert [o["route"] for o in line["outcome"]["alternatives"]] == [
        fingerprint(r.points) for r in OTHERS
    ]


def test_the_gpx_of_an_alternative_the_app_chose(client: TestClient) -> None:
    chosen = done(client)["alternatives"][1]
    response = client.post("/gpx", json={"request": HEART, "result": chosen})
    assert response.status_code == 200
    assert response.text.count("<trkpt") == len(OTHERS[1].points)
    # An older app sends a result without the field.
    older = {k: v for k, v in chosen.items() if k != "alternatives"}
    assert (
        client.post("/gpx", json={"request": HEART, "result": older}).status_code == 200
    )
