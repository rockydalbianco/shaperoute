"""A shape in pieces on the water through the API (TASK-226, ADR-0188): a
paddling request with the pen up draws the outline and each piece on its
own, and the stretches paddled without drawing come back as `walks`, as a
word's on the roads. With the pen down the answer is the one of before.

No network: the engine's hand-built lake and coast in a cache folder, as
test_paddling.py.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import pytest
from route_engine import water
from route_engine.geo import LatLon
from route_engine.models import RouteRequest
from route_engine.paddling import plan_paddling
from route_engine.water import FileWaterSource
from test_paddling import (
    COAST,
    COAST_START,
    LAKE,
    LAKE_START,
    api,
    cached,
    finished,
    points_of,
)

from shaperoute_api.route_store import RouteStore


@pytest.fixture(autouse=True)
def _no_download(monkeypatch: pytest.MonkeyPatch) -> None:
    def refused(query: str) -> dict[str, Any]:
        raise AssertionError("downloaded")

    monkeypatch.setattr(water, "overpass", refused)


def _body(start: LatLon, shape: str, pen_up: bool = True) -> dict[str, Any]:
    asked: dict[str, Any] = {
        "start": list(start),
        "shape": shape,
        "distance_m": 2000,
        "activity": "paddling",
    }
    return {**asked, "pen_up": True} if pen_up else asked


def _request(start: LatLon, shape: str, pen_up: bool = True) -> RouteRequest:
    return RouteRequest(
        start=start, shape=shape, distance_m=2000, activity="paddling", pen_up=pen_up
    )


@pytest.mark.parametrize(
    ("start", "fixture", "shape", "walks"),
    [
        (LAKE_START, LAKE, "cat", 3),
        (LAKE_START, LAKE, "fish", 2),
        (COAST_START, COAST, "dog_head", 3),
        (COAST_START, COAST, "smiley", 4),
    ],
)
def test_the_pieces_come_back_with_the_walks_between_them(
    tmp_path: Path, start: LatLon, fixture: Path, shape: str, walks: int
) -> None:
    request = _request(start, shape)
    client = api(cached(tmp_path, fixture, request))
    response = client.post("/routes", json=_body(start, shape))
    assert response.status_code == 200, response.json()
    result = response.json()
    engine = plan_paddling(request, FileWaterSource(fixture)).result
    assert points_of(result) == pytest.approx(engine.points)
    assert result["walks"] == [list(walk) for walk in engine.walks]
    assert len(result["walks"]) == walks
    assert result["shape"] == shape and result["similarity"] == 1.0
    # No roads: no turns, no other routes, nothing with a bike on foot.
    assert result["directions"] == [] and result["alternatives"] == []
    assert result["on_foot"] == []


def test_a_job_answers_the_same(tmp_path: Path) -> None:
    request = _request(LAKE_START, "rabbit_head")
    client = api(cached(tmp_path, LAKE, request))
    job = client.post("/route-jobs", json=_body(LAKE_START, "rabbit_head")).json()
    done = finished(client, job["job_id"])
    assert done["status"] == "done", done
    assert len(done["result"]["walks"]) == 3
    assert (
        done["result"]
        == client.post("/routes", json=_body(LAKE_START, "rabbit_head")).json()
    )


def test_with_the_pen_down_the_answer_has_no_walks(tmp_path: Path) -> None:
    down = _request(LAKE_START, "cat", pen_up=False)
    client = api(cached(tmp_path, LAKE, down))
    result = client.post("/routes", json=_body(LAKE_START, "cat", pen_up=False)).json()
    engine = plan_paddling(down, FileWaterSource(LAKE)).result
    assert result["walks"] == []
    assert points_of(result) == pytest.approx(engine.points)


def test_a_shape_in_one_line_is_refused_with_the_pen_up_on_the_water(
    tmp_path: Path,
) -> None:
    client = api(cached(tmp_path, LAKE, _request(LAKE_START, "cat")))
    response = client.post("/routes", json=_body(LAKE_START, "heart"))
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_request"
    assert "heart has none" in error["message"]


def test_the_gpx_says_where_the_drawing_pauses(tmp_path: Path) -> None:
    client = api(cached(tmp_path, LAKE, _request(LAKE_START, "cat")))
    asked = _body(LAKE_START, "cat")
    result = client.post("/routes", json=asked).json()
    gpx = client.post("/gpx", json={"request": asked, "result": result})
    assert gpx.status_code == 200, gpx.text
    ns = {"g": "http://www.topografix.com/GPX/1/1"}
    root = ET.fromstring(gpx.content)
    names = [w.findtext("g:name", namespaces=ns) for w in root.iterfind("g:wpt", ns)]
    assert names == ["Pause", "Resume"] * 3
    assert len(root.findall(".//g:trkpt", ns)) == len(result["points"])


def test_the_pen_up_and_the_pen_down_are_kept_apart(tmp_path: Path) -> None:
    """A place's examples kept by the API: the same shape with the pen up is
    another route (route_store, as a word's)."""
    store = RouteStore(tmp_path / "routes")
    up, down = _request(LAKE_START, "cat"), _request(LAKE_START, "cat", pen_up=False)
    assert store._path(up) != store._path(down)
