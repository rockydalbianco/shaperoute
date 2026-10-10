"""The points on the water whose «Paddle» shapes the API keeps (TASK-246
part B, ADR-0211): the app's lists of lakes and beaches, read as the API
starts, and a phone's request from one of them answered at once the second
time. No network: the planner is the test's."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import Plan

from shaperoute_api.activity_graphs import ActivityGraphs, Ground
from shaperoute_api.app import create_app
from shaperoute_api.images import AnyRequest
from shaperoute_api.route_store import RouteStore
from shaperoute_api.water_spots import LISTS, WaterSpot, read_spots


def test_the_lists_of_the_app_are_read_whole() -> None:
    spots = read_spots()
    lakes = json.loads(LISTS[0][0].read_text())["lakes"]
    beaches = json.loads(LISTS[1][0].read_text())["beaches"]
    assert len(spots) == len(lakes) + len(beaches) > 700
    first = lakes[0]
    assert spots[0] == WaterSpot(
        first["name"], (first["point"][0], first["point"][1]), first["distance_m"]
    )
    # As the app draws them: 2 km, less on a small lake; all in Italy.
    assert all(500 <= spot.distance_m <= 2000 for spot in spots)
    assert all(35 < spot.point[0] < 48 and 6 < spot.point[1] < 19 for spot in spots)


def test_a_list_not_there_or_broken_is_left_out(tmp_path: Path) -> None:
    broken = tmp_path / "beaches.json"
    broken.write_text('{"beaches": [{"name": "Alassio"}]}')
    lakes = tmp_path / "lakes.json"
    lakes.write_text(
        '{"lakes": [{"name": "Lago di Levico", "point": [46.00869, 11.27722],'
        ' "distance_m": 2000}]}'
    )
    found = read_spots(
        [(tmp_path / "none.json", "lakes"), (broken, "beaches"), (lakes, "lakes")]
    )
    assert found == [WaterSpot("Lago di Levico", (46.00869, 11.27722), 2000)]


def test_a_phones_shape_from_a_point_is_drawn_once(tmp_path: Path) -> None:
    spot = read_spots()[0]
    drawn: list[str] = []

    def planner(request: AnyRequest, ground: Ground) -> Plan:
        assert isinstance(request, RouteRequest)
        drawn.append(str(request.start))
        result = RouteResult(
            points=[request.start, (46.0, 11.0), request.start],
            distance_m=float(request.distance_m),
            similarity=0.9,
            shape=request.shape or "",
            walks=[(0, 1)] if request.pen_up else [],
        )
        return Plan(result=result, search=None)

    store = RouteStore(
        tmp_path / "routes", engine="engine-a", water=[s.point for s in read_spots()]
    )
    # Never read by this planner: only there for a request on the water.
    lake: Any = object()
    graphs = ActivityGraphs({"running": FileSource(Path("unused.graphml"))}, lake)
    # As aheadExamples.ts asks it.
    asked: dict[str, Any] = {
        "shape": "rabbit_head",
        "pen_up": True,
        "distance_m": spot.distance_m,
        "start": list(spot.point),
        "activity": "paddling",
    }

    def finished(client: TestClient, job: dict[str, Any]) -> dict[str, Any]:
        deadline = time.monotonic() + 10
        while job["status"] not in ("done", "failed") and time.monotonic() < deadline:
            time.sleep(0.02)
            job = client.get(f"/route-jobs/{job['job_id']}").json()
        return job

    with TestClient(create_app(graphs, planner=planner, route_store=store)) as client:
        first = finished(client, client.post("/route-jobs", json=asked).json())
        assert first["status"] == "done"
        # Another phone, the same request: done in the answer, no engine.
        again = client.post("/route-jobs", json=asked).json()
        assert again["status"] == "done"
        assert again["result"]["points"] == first["result"]["points"]
        assert again["result"]["walks"] == [[0, 1]]
        # From anywhere else by the lake it is drawn, and not kept.
        here = {**asked, "start": [spot.point[0] + 0.001, spot.point[1]]}
        elsewhere = finished(client, client.post("/route-jobs", json=here).json())
        assert elsewhere["status"] == "done"
    assert len(drawn) == 2
    assert store.kept_on_water() == 1
