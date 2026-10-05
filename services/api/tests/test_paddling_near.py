"""A shape on the water moved by the user, through the API (TASK-238): a
paddling result says where the centre of its shape is, and a request with
`near` asks for the shape there; the engine places it at the nearest place
where it fits. A moved route is the user's own: the API does not keep it.

No network: the engine's hand-built coast in a cache folder, as
test_paddling.py.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import pytest
from route_engine import water
from route_engine.geo import LatLon, latlon_to_local, local_to_latlon
from route_engine.models import NEAR_ON_WATER_ONLY, RouteRequest, RouteResult
from route_engine.paddling import plan_paddling
from route_engine.water import FileWaterSource
from route_engine.water_fit import MAX_CELL_M, NEAR_FREE_M
from test_paddling import COAST, COAST_START, api, body, cached, finished, points_of

from shaperoute_api.route_store import RouteStore, result_from


@pytest.fixture(autouse=True)
def _no_download(monkeypatch: pytest.MonkeyPatch) -> None:
    def refused(query: str) -> dict[str, Any]:
        raise AssertionError("downloaded")

    monkeypatch.setattr(water, "overpass", refused)


def _request(near: LatLon | None = None) -> RouteRequest:
    return RouteRequest(
        start=COAST_START,
        shape="heart",
        distance_m=2000,
        activity="paddling",
        near=near,
    )


def _moved(centre: list[float], east_m: float, north_m: float) -> LatLon:
    x, y = latlon_to_local(COAST_START, (centre[0], centre[1]))
    return local_to_latlon(COAST_START, x + east_m, y + north_m)


def _apart(a: list[float], b: LatLon) -> float:
    return math.dist(
        latlon_to_local(COAST_START, (a[0], a[1])), latlon_to_local(COAST_START, b)
    )


def test_a_route_on_the_water_says_where_its_shape_is(tmp_path: Path) -> None:
    client = api(cached(tmp_path, COAST, _request()))
    response = client.post("/routes", json=body(COAST_START))
    assert response.status_code == 200, response.json()
    engine = plan_paddling(_request(), FileWaterSource(COAST))
    assert response.json()["centre"] == pytest.approx(list(engine.route.centre))


def test_asked_near_a_point_the_shape_is_drawn_there(tmp_path: Path) -> None:
    client = api(cached(tmp_path, COAST, _request()))
    first = client.post("/routes", json=body(COAST_START)).json()
    wanted = _moved(first["centre"], 150.0, 0.0)

    response = client.post("/routes", json={**body(COAST_START), "near": list(wanted)})
    assert response.status_code == 200, response.json()
    moved = response.json()
    assert _apart(moved["centre"], wanted) <= NEAR_FREE_M + MAX_CELL_M
    assert points_of(moved) != points_of(first)
    engine = plan_paddling(_request(wanted), FileWaterSource(COAST)).result
    assert points_of(moved) == pytest.approx(engine.points)
    # As any route on the water.
    assert moved["directions"] == [] and moved["alternatives"] == []
    assert abs(moved["distance_m"] - 2000) <= 200


def test_asked_where_it_is_the_answer_is_the_same(tmp_path: Path) -> None:
    client = api(cached(tmp_path, COAST, _request()))
    first = client.post("/routes", json=body(COAST_START)).json()
    again = client.post(
        "/routes", json={**body(COAST_START), "near": first["centre"]}
    ).json()
    assert again == first


def test_a_job_moves_the_shape_too(tmp_path: Path) -> None:
    client = api(cached(tmp_path, COAST, _request()))
    first = client.post("/routes", json=body(COAST_START)).json()
    asked = {**body(COAST_START), "near": list(_moved(first["centre"], -150.0, 0.0))}
    job = client.post("/route-jobs", json=asked).json()
    done = finished(client, job["job_id"])
    assert done["status"] == "done", done
    assert done["result"] == client.post("/routes", json=asked).json()


def test_a_shape_on_the_roads_is_not_moved(tmp_path: Path) -> None:
    client = api(tmp_path)
    asked = {
        "start": list(COAST_START),
        "shape": "heart",
        "distance_m": 5000,
        "near": list(COAST_START),
    }
    response = client.post("/routes", json=asked)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_request"
    assert NEAR_ON_WATER_ONLY in error["message"]


def test_a_point_that_is_not_a_place_is_refused(tmp_path: Path) -> None:
    client = api(tmp_path)
    response = client.post("/routes", json={**body(COAST_START), "near": [91.0, 12.0]})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_a_moved_route_is_not_kept_nor_served_for_the_one_asked_first(
    tmp_path: Path,
) -> None:
    """A place's examples are kept by the request (route_store): a shape
    moved by one user must not come back to the next who asks for it."""
    store = RouteStore(tmp_path / "routes")
    moved = _request(near=COAST_START)
    assert store._path(_request()) is not None
    assert store._path(moved) is None
    result = RouteResult(
        points=[COAST_START, COAST_START],
        distance_m=2000.0,
        similarity=1.0,
        shape="heart",
        centre=COAST_START,
    )
    assert store.put(moved, result) is False
    assert store.get(moved) is None


def test_a_kept_route_keeps_its_centre() -> None:
    kept = {
        "points": [[45.0, 12.0], [45.0, 12.0]],
        "distance_m": 2000.0,
        "similarity": 1.0,
        "shape": "heart",
        "warnings": [],
        "directions": [],
        "word": None,
        "alternatives": [],
    }
    assert result_from(kept).centre is None  # kept before TASK-238
    assert result_from({**kept, "centre": [45.001, 12.002]}).centre == (45.001, 12.002)
