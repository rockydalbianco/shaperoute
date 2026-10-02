"""A word with the pen up through the API (TASK-197, ADR-0157): the request,
the walks of the result, its GPX, the score of its run, the routes kept."""

from __future__ import annotations

import json
import time
import xml.etree.ElementTree as ET
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.export_gpx import GPX_NAMESPACE, PAUSE, RESUME
from route_engine.geo import path_length_m
from route_engine.models import PEN_UP_WITHOUT_WORD, RouteRequest, RouteResult
from route_engine.nearby_starts import ShapeJob, plan_nearby
from route_engine.network import FileSource
from route_engine.optimizer import GraphLoader, Plan
from route_engine.pen_up import drawn_m, walks_problem

from shaperoute_api.app import create_app
from shaperoute_api.route_store import RouteStore

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
LEVICO_GRAPH = REPO / "services/route-engine/tests/fixtures/levico_walk_1km.graphml"
WHEN = datetime(2026, 10, 2, 18, 30, tzinfo=UTC)
NS = {"gpx": GPX_NAMESPACE}

LEVICO_IO = {
    "start": [46.0122, 11.2986],
    "word": "io",
    "distance_m": 6000,
    "activity": "running",
    "pen_up": True,
}


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _client(**options: Any) -> TestClient:
    app = create_app(FileSource(LEVICO_GRAPH), now=lambda: WHEN, **options)
    return TestClient(app)


def _refused(path: str, body: dict[str, Any]) -> None:
    def planner(request: object, source: GraphLoader) -> Plan:
        raise AssertionError("the engine must not run")

    response = _client(planner=planner).post(path, json=body)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_request"
    assert PEN_UP_WITHOUT_WORD in error["message"]


def test_the_pen_up_without_a_word_is_an_invalid_request() -> None:
    heart = {**_load("route-request.json"), "pen_up": True}
    _refused("/routes", heart)
    _refused("/route-jobs", heart)
    image = {**_load("image-route-request.json"), "pen_up": True}
    _refused("/image-route-jobs", image)
    gpx = _load("gpx-request.json")
    _refused("/gpx", {**gpx, "request": heart})


def test_a_word_with_the_pen_up_on_the_levico_test_graph() -> None:
    # The engine for real, as the API plans a word (images.plan_request),
    # with the nearby starts planned here, about 1 s. In the test's own
    # thread: on macOS, planning in the app's thread made the worker
    # processes of the tests after this one crash as they started.
    request = RouteRequest(
        start=(46.0122, 11.2986), word="io", distance_m=6000, pen_up=True
    )
    job = ShapeJob.of_request(request)
    plan = plan_nearby(job, request.start, FileSource(LEVICO_GRAPH), processes=False)
    asked: list[RouteRequest] = []

    def planner(request: RouteRequest, source: GraphLoader) -> Plan:
        asked.append(request)
        return plan.plan

    response = _client(planner=planner).post("/routes", json=LEVICO_IO)
    assert asked == [request]
    assert response.status_code == 200, response.json()
    result = response.json()
    assert result["word"] == "IO" and result["shape"] is None
    points = [tuple(p) for p in result["points"]]
    walks = [tuple(w) for w in result["walks"]]
    assert len(walks) == 1
    assert walks_problem(walks, len(points)) is None
    assert points[0] != points[-1]
    assert result["distance_m"] == pytest.approx(path_length_m(points), rel=1e-6)
    assert drawn_m(points, result["distance_m"], walks) < result["distance_m"]
    for other in result["alternatives"]:
        assert walks_problem(other["walks"], len(other["points"])) is None
    # Its GPX says where to pause and resume, around the one walk.
    gpx = _client().post("/gpx", json={"request": LEVICO_IO, "result": result})
    assert gpx.status_code == 200
    root = ET.fromstring(gpx.content)
    names = [w.findtext("gpx:name", namespaces=NS) for w in root.findall("gpx:wpt", NS)]
    assert names == [PAUSE, RESUME]


def test_the_gpx_of_an_older_app_has_no_waypoints() -> None:
    response = _client().post("/gpx", json=_load("gpx-request.json"))
    assert response.status_code == 200
    assert b"<wpt" not in response.content


def test_walks_that_are_not_in_the_route_are_an_invalid_request() -> None:
    gpx = _load("gpx-request.json")
    result = {**gpx["result"], "walks": [[3, 9]]}
    response = _client().post("/gpx", json={**gpx, "result": result})
    assert response.status_code == 422
    assert "is not a stretch" in response.json()["error"]["message"]
    score = {**_load("track-score-request-walks.json"), "walks": [[5, 2]]}
    response = _client().post("/track-scores", json=score)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_a_run_is_scored_on_the_letters_without_the_walks() -> None:
    # Two letters and a walk round below the base line; the run paused on
    # the walk, so its track jumps along the base line.
    data = _load("track-score-request-walks.json")
    response = _client().post("/track-scores", json=data)
    assert response.status_code == 200
    scored = response.json()
    assert scored["score"] == round(100 * data["similarity"])
    assert scored["covered"] == 1.0 and scored["on_route"] == 1.0
    # An older app sends no walks: the walk is not run, the jump is off it.
    older = {k: v for k, v in data.items() if k != "walks"}
    plain = _client().post("/track-scores", json=older).json()
    assert plain["score"] < scored["score"]
    assert plain["covered"] < 1.0 and plain["on_route"] < 1.0


def test_the_routes_kept_tell_the_pen_up_apart(tmp_path: Path) -> None:
    centre = (45.8906, 11.0401)
    word = RouteRequest(start=centre, word="io", distance_m=6000)
    pen_up = replace(word, pen_up=True)
    drawn = RouteResult(
        points=[(45.8906, 11.0401), (45.8915, 11.0420), (45.8930, 11.0420)],
        distance_m=420.0,
        similarity=0.9,
        shape=None,
        word="IO",
    )
    walked = replace(drawn, walks=[(1, 2)])
    kept = RouteStore(tmp_path, engine="engine-a")
    kept.learn([centre])
    assert kept.put(word, drawn) and kept.put(pen_up, walked)
    assert kept.get(word) == drawn
    assert kept.get(pen_up) == walked
    assert len(kept) == 2
    # A route kept before TASK-197 has no walks, and reads as before.
    for path in tmp_path.glob("*.json"):
        data = json.loads(path.read_text())
        data["result"].pop("walks")
        path.write_text(json.dumps(data))
    assert kept.get(word) == drawn
    found = kept.get(pen_up)
    assert found is not None and found.walks == []


def test_the_jobs_answer_the_walks_too() -> None:
    data = _load("route-result-pen-up.json")
    result = RouteResult(
        **{
            **data,
            "points": [tuple(p) for p in data["points"]],
            "walks": [tuple(w) for w in data["walks"]],
        }
    )

    def planner(request: RouteRequest, source: GraphLoader) -> Plan:
        assert request.pen_up
        return Plan(result=result, search=None)

    with _client(planner=planner) as client:  # the lifespan stops the workers
        job = client.post("/route-jobs", json=_load("route-request-pen-up.json"))
        job_id = job.json()["job_id"]
        deadline = time.monotonic() + 5
        while (body := client.get(f"/route-jobs/{job_id}").json())["status"] not in (
            "done",
            "failed",
        ):
            assert time.monotonic() < deadline, body
            time.sleep(0.01)
    assert body["status"] == "done", body
    assert body["result"]["walks"] == data["walks"]
