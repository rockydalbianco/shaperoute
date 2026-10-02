"""A city's examples over HTTP: drawn once for the first phone, answered at
once to the next (route_store.py). No network."""

from __future__ import annotations

import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import GraphLoader, Plan

from shaperoute_api.app import create_app
from shaperoute_api.cities import CitySearch
from shaperoute_api.route_store import RouteStore

ROVERETO = [45.8906, 11.0401]
HEART = {"start": ROVERETO, "shape": "heart", "distance_m": 5000}
CITY = {
    "name": "Rovereto",
    "city": "Rovereto",
    "state": "Trentino-Alto Adige",
    "country": "Italy",
    "lat": ROVERETO[0],
    "lon": ROVERETO[1],
    "result_type": "city",
}
STREET = {
    "name": "Via Dante",
    "city": "Rovereto",
    "country": "Italy",
    "lat": 45.8871,
    "lon": 11.0362,
    "result_type": "street",
}


class Counting:
    """A planner that counts what the engine was asked."""

    def __init__(self) -> None:
        self.asked: list[RouteRequest] = []

    def __call__(self, request: RouteRequest, source: GraphLoader) -> Plan:
        self.asked.append(request)
        result = RouteResult(
            points=[request.start, (45.8915, 11.0420), request.start],
            distance_m=5100.0,
            similarity=0.9,
            shape=request.shape,
        )
        return Plan(result=result, search=None)


@pytest.fixture
def api(tmp_path: Path) -> Iterator[tuple[TestClient, Counting, Path]]:
    planner = Counting()
    app = create_app(
        FileSource(Path("unused.graphml")),
        planner=planner,
        cities=CitySearch("K", fetch=lambda url: {"results": [CITY, STREET]}),
        route_store=RouteStore(tmp_path / "routes", engine="engine-a"),
    )
    with TestClient(app) as client:  # the lifespan stops the workers after
        yield client, planner, tmp_path / "routes"


def finished(client: TestClient, job: dict[str, Any]) -> dict[str, Any]:
    deadline = time.monotonic() + 5
    while job["status"] not in ("done", "failed"):
        assert time.monotonic() < deadline, job
        time.sleep(0.01)
        job = client.get(f"/route-jobs/{job['job_id']}").json()
    return job


def kept_files(folder: Path) -> list[Path]:
    deadline = time.monotonic() + 5
    while not (files := sorted(folder.glob("*.json"))):
        assert time.monotonic() < deadline, "the route was not kept"
        time.sleep(0.01)
    return files


def test_the_second_phone_in_a_city_does_not_wait(
    api: tuple[TestClient, Counting, Path],
) -> None:
    client, planner, folder = api
    # The first phone searches the city, then asks for its heart.
    assert client.get("/cities", params={"q": "Rovereto"}).status_code == 200
    first = finished(client, client.post("/route-jobs", json=HEART).json())
    assert first["status"] == "done"
    assert len(kept_files(folder)) == 1

    # The next gets it in the answer to its POST: nothing to wait for.
    response = client.post("/route-jobs", json=HEART)
    assert response.status_code == 202
    second = response.json()
    assert second["status"] == "done"
    assert second["result"] == first["result"]
    assert second["job_id"] != first["job_id"]
    assert len(planner.asked) == 1
    # Another shape is another route.
    star = finished(
        client, client.post("/route-jobs", json={**HEART, "shape": "star"}).json()
    )
    assert star["result"]["shape"] == "star"
    assert len(planner.asked) == 2


def test_a_city_typed_is_a_city_too(api: tuple[TestClient, Counting, Path]) -> None:
    client, planner, folder = api
    assert client.get("/city-suggestions", params={"q": "Rov"}).status_code == 200
    finished(client, client.post("/route-jobs", json=HEART).json())
    kept_files(folder)
    assert client.post("/route-jobs", json=HEART).json()["status"] == "done"
    assert len(planner.asked) == 1


def test_a_route_from_where_someone_is_leaves_nothing_on_disk(
    api: tuple[TestClient, Counting, Path],
) -> None:
    client, planner, folder = api
    client.get("/city-suggestions", params={"q": "Via Dante"})
    # A street suggested is not a city's centre; nor is a phone's position.
    for start in ([STREET["lat"], STREET["lon"]], [45.8800, 11.0300]):
        request = {**HEART, "start": start}
        assert finished(client, client.post("/route-jobs", json=request).json())
        again = client.post("/route-jobs", json=request).json()
        assert finished(client, again)["status"] == "done"
    assert len(planner.asked) == 4
    assert list(folder.glob("*.json")) == []


def test_without_a_store_every_request_is_drawn() -> None:
    planner = Counting()
    app = create_app(FileSource(Path("unused.graphml")), planner=planner)
    with TestClient(app) as client:
        for _ in range(2):
            finished(client, client.post("/route-jobs", json=HEART).json())
    assert len(planner.asked) == 2
