"""The pieces of an image with the pen up in the API (TASK-297 part C2,
ADR-0258): POST /image-outlines answers them when asked, POST
/image-route-jobs draws them one at a time. Without pen_up, as before.
Every image is drawn here with Pillow: no image files in the repository."""

from __future__ import annotations

import base64
import io
import time
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from route_engine.image_outline import MAX_SUBJECT_POINTS
from route_engine.models import RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import GraphLoader, Plan

from shaperoute_api.app import create_app
from shaperoute_api.images import (
    PEN_UP_WITHOUT_IMAGE_PIECES,
    AnyRequest,
    ImageRequest,
    image_job,
    outline_of,
)

START = [46.0671, 11.1214]
RESULT = RouteResult(
    points=[(46.0671, 11.1214), (46.0680, 11.1220), (46.0671, 11.1214)],
    distance_m=14800.0,
    similarity=0.93,
    shape=None,
    warnings=[],
)


def _png(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def _ring() -> Image.Image:
    """A dark ring: one subject with one hole, well over 3 % of it."""
    image = Image.new("RGB", (400, 400), "white")
    draw = ImageDraw.Draw(image)
    draw.ellipse((60, 60, 340, 340), fill="black")
    draw.ellipse((140, 140, 260, 260), fill="white")
    return image


def _two_discs() -> Image.Image:
    """A large disc and a small one apart: two subjects, no hole."""
    image = Image.new("RGB", (400, 300), "white")
    draw = ImageDraw.Draw(image)
    draw.ellipse((40, 60, 220, 240), fill="black")
    draw.ellipse((270, 110, 350, 190), fill="black")
    return image


@pytest.fixture
def client() -> Iterator[tuple[TestClient, list[AnyRequest]]]:
    asked: list[AnyRequest] = []

    def planner(request: AnyRequest, source: GraphLoader) -> Plan:
        asked.append(request)
        return Plan(result=RESULT, search=None)

    app = create_app(
        FileSource(Path("unused.graphml")),
        planner=planner,
        now=lambda: datetime(2026, 11, 23, 10, 0, tzinfo=UTC),
    )
    with TestClient(app) as test_client:
        yield test_client, asked


def _finished(client: TestClient, job_id: str) -> dict[str, Any]:
    deadline = time.monotonic() + 5
    while True:
        body: dict[str, Any] = client.get(f"/route-jobs/{job_id}").json()
        if body["status"] in ("done", "failed"):
            return body
        assert time.monotonic() < deadline, body
        time.sleep(0.01)


def test_without_pen_up_the_outline_is_as_before(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    image = _png(_two_discs())
    before = http.post("/image-outlines", json={"image": image}).json()
    asked_off = http.post("/image-outlines", json={"image": image, "pen_up": False})
    assert asked_off.json() == before
    # The second disc hung on the first as a stroke, no pieces.
    assert len(before["strokes"]) == 1
    assert before["pieces"] == [] and before["image_pieces"] == []


def test_with_pen_up_the_other_subject_is_a_piece_not_a_stroke(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    body = http.post(
        "/image-outlines", json={"image": _png(_two_discs()), "pen_up": True}
    ).json()
    assert body["strokes"] == [] and body["image_strokes"] == []
    assert len(body["pieces"]) == len(body["image_pieces"]) == 1
    # In the frame of points, within [-1, 1]; over the picture, in shares.
    assert all(abs(v) <= 1 for p in body["pieces"][0] for v in p)
    assert all(0 <= x <= 1 and 0 <= y <= 1 for x, y in body["image_pieces"][0])
    # The small disc is on the right of the picture.
    assert min(x for x, _ in body["image_pieces"][0]) > 0.6


def test_with_pen_up_a_hole_is_a_piece(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    image = _png(_ring())
    without = http.post("/image-outlines", json={"image": image}).json()
    assert without["pieces"] == [] and without["strokes"] == []
    body = http.post("/image-outlines", json={"image": image, "pen_up": True}).json()
    [hole] = body["image_pieces"]
    # The hole sits in the middle of the ring.
    xs = [x for x, _ in hole]
    assert 0.3 < min(xs) and max(xs) < 0.7


def test_the_pieces_go_on_to_a_route_job_with_the_pen_up(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, asked = client
    outline = http.post(
        "/image-outlines", json={"image": _png(_ring()), "pen_up": True}
    ).json()
    response = http.post(
        "/image-route-jobs",
        json={
            "start": START,
            "outline": outline["points"],
            "pieces": outline["pieces"],
            "pen_up": True,
            "distance_m": 15000,
        },
    )
    assert response.status_code == 202, response.json()
    assert _finished(http, response.json()["job_id"])["status"] == "done"
    [request] = asked
    assert isinstance(request, ImageRequest)
    assert request.pen_up is True
    assert request.outline.in_pieces
    assert len(request.outline.pieces) == 1


def test_the_pieces_without_the_pen_up_are_drawn_with_it_down(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, asked = client
    outline = http.post(
        "/image-outlines", json={"image": _png(_ring()), "pen_up": True}
    ).json()
    response = http.post(
        "/image-route-jobs",
        json={
            "start": START,
            "outline": outline["points"],
            "pieces": outline["pieces"],
            "distance_m": 15000,
        },
    )
    assert response.status_code == 202, response.json()
    _finished(http, response.json()["job_id"])
    [request] = asked
    assert isinstance(request, ImageRequest) and request.pen_up is False


def test_pen_up_without_pieces_is_refused_with_the_reason(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, asked = client
    outline = http.post("/image-outlines", json={"image": _png(_ring())}).json()
    response = http.post(
        "/image-route-jobs",
        json={
            "start": START,
            "outline": outline["points"],
            "pen_up": True,
            "distance_m": 15000,
        },
    )
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_request"
    assert PEN_UP_WITHOUT_IMAGE_PIECES in error["message"]
    assert asked == []


def test_too_many_piece_points_are_refused() -> None:
    square = [(-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0), (-1.0, -1.0)]
    line = [
        (-0.5 + i / (2 * MAX_SUBJECT_POINTS), 0.0) for i in range(MAX_SUBJECT_POINTS)
    ]
    with pytest.raises(Exception, match="pieces: at most"):
        outline_of(square, pieces=[line, [(0.0, 0.5), (0.1, 0.5)]])


def test_the_engine_job_draws_the_pieces_as_a_word() -> None:
    square = [(-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0), (-1.0, -1.0)]
    hole = [(-0.3, -0.3), (0.3, -0.3), (0.3, 0.3), (-0.3, 0.3), (-0.3, -0.3)]
    outline = outline_of(square, pieces=[hole])
    up = ImageRequest(
        start=(46.0671, 11.1214), outline=outline, distance_m=15000, pen_up=True
    )
    down = ImageRequest(start=(46.0671, 11.1214), outline=outline, distance_m=15000)
    assert image_job(up).word is not None
    assert image_job(down).word is None
