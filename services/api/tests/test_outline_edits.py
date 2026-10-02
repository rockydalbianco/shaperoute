"""Edits of an image's outline in the API (TASK-079, ADR-0074): POST
/image-outline-edits adds a part or a detail drawn over the picture, and
POST /image-route-jobs takes the details back as strokes."""

from __future__ import annotations

import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.models import RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import GraphLoader, Plan
from route_engine.outline_edits import MAX_DETAIL_POINTS

from shaperoute_api.app import create_app
from shaperoute_api.images import AnyRequest, ImageRequest

START = [46.0671, 11.1214]
RESULT = RouteResult(
    points=[(46.0671, 11.1214), (46.0680, 11.1220), (46.0671, 11.1214)],
    distance_m=14800.0,
    similarity=0.93,
    shape=None,
    warnings=[],
)
# A square in the middle of a picture twice as wide as high, as shares of
# the picture from the top left: 0.2 of the width is 0.4 of the height.
SQUARE = [[0.4, 0.2], [0.6, 0.2], [0.6, 0.6], [0.4, 0.6], [0.4, 0.2]]
ASPECT = 2.0
BOW_TIE = [[0.4, 0.2], [0.6, 0.6], [0.6, 0.2], [0.4, 0.6], [0.4, 0.2]]


@pytest.fixture
def client() -> Iterator[tuple[TestClient, list[AnyRequest]]]:
    asked: list[AnyRequest] = []

    def planner(request: AnyRequest, source: GraphLoader) -> Plan:
        asked.append(request)
        return Plan(result=RESULT, search=None)

    app = create_app(FileSource(Path("unused.graphml")), planner=planner)
    with TestClient(app) as test_client:
        yield test_client, asked


def _edit(http: TestClient, **fields: Any) -> Any:
    body = {
        "image_points": SQUARE,
        "image_strokes": [],
        "aspect": ASPECT,
        **fields,
    }
    return http.post("/image-outline-edits", json=body)


def test_a_part_joins_the_outline_in_both_frames(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    part = [[0.55, 0.3], [0.8, 0.3], [0.8, 0.5], [0.55, 0.5]]
    response = _edit(http, kind="part", line=part)
    assert response.status_code == 200, response.json()
    body = response.json()
    assert max(x for x, _ in body["image_points"]) == pytest.approx(0.8)
    assert body["image_points"][0] == body["image_points"][-1]
    assert len(body["points"]) == len(body["image_points"])
    assert all(abs(v) <= 1 for p in body["points"] for v in p)
    # Wider than high now: the normalized outline spans x from -1 to 1.
    xs = [x for x, _ in body["points"]]
    assert min(xs) == pytest.approx(-1) and max(xs) == pytest.approx(1)
    assert body["strokes"] == [] and body["image_strokes"] == []
    assert body["aspect"] == ASPECT


def test_a_detail_comes_back_as_a_stroke_in_both_frames(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    response = _edit(http, kind="detail", line=[[0.41, 0.4], [0.5, 0.4]])
    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["image_points"] == SQUARE
    assert body["image_strokes"] == [[[0.4, 0.4], [0.5, 0.4]]]
    [stroke] = body["strokes"]
    assert stroke == [[-1.0, 0.0], [0.0, 0.0]]


def test_edits_add_up_and_their_route_follows_the_details(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, asked = client
    first = _edit(http, kind="detail", line=[[0.4, 0.4], [0.5, 0.4]]).json()
    second = http.post(
        "/image-outline-edits",
        json={
            "image_points": first["image_points"],
            "image_strokes": first["image_strokes"],
            "aspect": first["aspect"],
            "kind": "detail",
            "line": [[0.45, 0.41], [0.45, 0.55]],
        },
    ).json()
    assert len(second["strokes"]) == 2
    response = http.post(
        "/image-route-jobs",
        json={
            "start": START,
            "outline": second["points"],
            "strokes": second["strokes"],
            "distance_m": 15000,
        },
    )
    assert response.status_code == 202, response.json()
    deadline = time.monotonic() + 5
    while not asked:
        assert time.monotonic() < deadline
        time.sleep(0.01)
    [request] = asked
    assert isinstance(request, ImageRequest)
    assert len(request.outline.strokes) == 2
    # The route goes along each detail to its end and back.
    path = request.outline.path()
    assert path.count((0.0, 0.0)) == 1
    assert path.count((-0.5, -0.75)) == 1
    assert path.count((-0.5, 0.0)) == 2  # out to the second detail and back


def test_a_refused_drawing_says_why(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    response = _edit(http, kind="detail", line=[[0.4, 0.4], [0.401, 0.4]])
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "outline_edit_rejected"
    assert error["reason"] == "short"


def test_lines_may_cross_and_their_route_is_accepted(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, asked = client
    # From the left side, across the square and out through the right one.
    line = [[0.4, 0.4], [0.5, 0.4], [0.8, 0.4]]
    response = _edit(http, kind="detail", line=line)
    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["image_strokes"] == [[[0.4, 0.4], [0.8, 0.4]]]
    job = http.post(
        "/image-route-jobs",
        json={
            "start": START,
            "outline": body["points"],
            "strokes": body["strokes"],
            "distance_m": 15000,
        },
    )
    assert job.status_code == 202, job.json()


def test_a_drawing_away_from_the_outline_is_joined_to_it(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    # An eye in the middle of the square, started away from every line.
    body = _edit(http, kind="detail", line=[[0.47, 0.4], [0.53, 0.4]]).json()
    assert body["image_strokes"] == [[[0.4, 0.4], [0.53, 0.4]]]
    # A closed shape beside the square hangs on it as a loop.
    part = [[0.7, 0.3], [0.9, 0.3], [0.9, 0.5], [0.7, 0.5]]
    body = _edit(http, kind="part", line=part).json()
    assert body["image_points"] == SQUARE
    [stroke] = body["image_strokes"]
    assert stroke[0][0] == 0.6 and stroke[-1] == stroke[1]


@pytest.mark.parametrize(
    ("fields", "words"),
    [
        ({"aspect": 0.0}, "aspect"),
        ({"aspect": 100.0}, "aspect"),
        ({"line": [[0.4, 0.4], [1.2, 0.4]]}, "within [0, 1]"),
        ({"image_points": BOW_TIE}, "crosses itself"),
        ({"image_strokes": [[[0.5, 0.4], [0.55, 0.4]]]}, "outline"),
        ({"kind": "eraser"}, "kind"),
        ({"line": [[0.4, 0.4]]}, "line"),
    ],
)
def test_an_input_out_of_shape_is_an_invalid_request(
    client: tuple[TestClient, list[AnyRequest]], fields: dict[str, Any], words: str
) -> None:
    http, _ = client
    body = {"kind": "detail", "line": [[0.4, 0.4], [0.5, 0.4]], **fields}
    response = _edit(http, **body)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_request"
    assert words in error["message"]


def test_the_strokes_of_a_route_request_are_checked(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, asked = client
    outline = [[-1.0, -1.0], [1.0, -1.0], [1.0, 1.0], [-1.0, 1.0], [-1.0, -1.0]]

    def post(strokes: list[Any]) -> Any:
        return http.post(
            "/image-route-jobs",
            json={
                "start": START,
                "outline": outline,
                "strokes": strokes,
                "distance_m": 15000,
            },
        )

    away = post([[[0.0, 0.0], [0.5, 0.0]]]).json()["error"]
    assert away["code"] == "invalid_request"
    assert "does not start on the outline" in away["message"]
    many = [[-1.0, 0.0]] + [[-0.9 + 0.01 * k, 0.0] for k in range(MAX_DETAIL_POINTS)]
    assert "at most" in post([many]).json()["error"]["message"]
    assert asked == []


def test_the_gpx_of_a_route_with_details_is_named_image(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    outline = [[-1.0, -1.0], [1.0, -1.0], [1.0, 1.0], [-1.0, 1.0], [-1.0, -1.0]]
    request = {
        "start": START,
        "outline": outline,
        "strokes": [[[-1.0, 0.0], [0.0, 0.0]]],
        "distance_m": 15000,
        "activity": "running",
    }
    result = {
        "points": [list(p) for p in RESULT.points],
        "distance_m": RESULT.distance_m,
        "similarity": RESULT.similarity,
        "shape": None,
        "word": None,
        "warnings": [],
        "directions": [],
        "approach_m": 0.0,
    }
    response = http.post("/gpx", json={"request": request, "result": result})
    assert response.status_code == 200, response.json()
    assert "sgrava-image-15km" in response.headers["content-disposition"]
