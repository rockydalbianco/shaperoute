"""Images in the API (TASK-073, ADR-0069): POST /image-outlines traces the
outline with the engine, POST /image-route-jobs draws it. Every image is
drawn here with Pillow: no image files in the repository."""

from __future__ import annotations

import base64
import io
import math
import random
import time
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from route_engine.models import InvalidRequestError, RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import MAX_TILT_DEG, GraphLoader, Plan
from shapely.geometry import Polygon

import shaperoute_api.images as images
from shaperoute_api.app import create_app
from shaperoute_api.images import (
    AnyRequest,
    ImageRequest,
    outline_of,
    plan_request,
)

START = [46.0671, 11.1214]
RESULT = RouteResult(
    points=[(46.0671, 11.1214), (46.0680, 11.1220), (46.0671, 11.1214)],
    distance_m=14800.0,
    similarity=0.93,
    shape=None,
    warnings=[],
)
SQUARE = [[-1.0, -1.0], [1.0, -1.0], [1.0, 1.0], [-1.0, 1.0], [-1.0, -1.0]]


def _png(image: Image.Image, kind: str = "PNG", **options: object) -> str:
    buffer = io.BytesIO()
    image.save(buffer, kind, **options)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def _disc(size: tuple[int, int] = (400, 300)) -> Image.Image:
    """A dark disc in the left half of a white picture."""
    image = Image.new("RGB", size, "white")
    ImageDraw.Draw(image).ellipse((60, 70, 220, 230), fill="black")
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
        now=lambda: datetime(2026, 9, 26, 10, 0, tzinfo=UTC),
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


def test_an_image_gives_its_outline_for_the_route_and_for_the_picture(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    response = http.post("/image-outlines", json={"image": _png(_disc())})
    assert response.status_code == 200, response.json()
    body = response.json()
    assert set(body) == {"points", "image_points", "aspect"}
    assert body["aspect"] == pytest.approx(4 / 3, rel=1e-4)
    points, over = body["points"], body["image_points"]
    assert points[0] == points[-1]
    assert len(points) == len(over)
    assert 8 <= len(points) - 1 <= images.MAX_POINTS
    # Normalized: centred, the longer side from -1 to 1.
    xs, ys = [x for x, _ in points], [y for _, y in points]
    assert max(xs) == pytest.approx(1) and min(xs) == pytest.approx(-1)
    assert max(ys) == pytest.approx(1, abs=0.02)
    # Over the picture: the disc, 60-220 of 400 across and 70-230 of 300 down.
    drawn = Polygon([(x * 400, y * 300) for x, y in over])
    disc = Polygon(
        [
            (
                140 + 80 * math.cos(a / 50 * math.tau),
                150 + 80 * math.sin(a / 50 * math.tau),
            )
            for a in range(50)
        ]
    )
    assert drawn.intersection(disc).area / drawn.union(disc).area > 0.95


def test_a_large_photo_turned_by_exif_gives_the_upright_aspect(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    # Stored 1600 x 1200, shown on its side: 1200 x 1600.
    photo = _disc((1600, 1200)).transpose(Image.Transpose.ROTATE_270)
    stored = photo.transpose(Image.Transpose.ROTATE_90)
    exif = Image.Exif()
    exif[0x0112] = 6  # rotate 90° clockwise to show
    image = _png(stored, "JPEG", exif=exif, quality=90)
    body = http.post("/image-outlines", json={"image": image}).json()
    assert body["aspect"] == pytest.approx(3 / 4, rel=1e-4)
    over = Polygon(body["image_points"])
    assert 0 < over.bounds[0] and over.bounds[2] < 1
    assert 0 < over.bounds[1] and over.bounds[3] < 1


@pytest.mark.parametrize(
    ("draw", "reason"),
    [
        ("noise", "background"),
        ("two", "scattered"),
        ("empty", "no_subject"),
        ("gif", "format"),
    ],
)
def test_an_image_without_one_clear_subject_is_refused_with_the_reason(
    client: tuple[TestClient, list[AnyRequest]], draw: str, reason: str
) -> None:
    http, _ = client
    kind = "PNG"
    image = Image.new("RGB", (400, 300), "white")
    pen = ImageDraw.Draw(image)
    if draw == "noise":
        rng = random.Random(7)
        image.putdata(
            [(rng.randrange(256),) * 3 for _ in range(image.width * image.height)]
        )
    elif draw == "two":
        pen.ellipse((40, 80, 160, 200), fill="black")
        pen.ellipse((240, 80, 360, 200), fill="black")
    elif draw == "gif":
        pen.ellipse((60, 70, 220, 230), fill="black")
        kind = "GIF"
    response = http.post("/image-outlines", json={"image": _png(image, kind)})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "image_not_usable"
    assert error["reason"] == reason
    assert error["suggested_distance_m"] is None
    assert error["message"]


def test_not_base64_is_an_invalid_request(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    response = http.post("/image-outlines", json={"image": "not base64!"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"
    assert "base64" in response.json()["error"]["message"]


def test_an_image_over_the_limit_is_an_invalid_request(
    client: tuple[TestClient, list[AnyRequest]], monkeypatch: pytest.MonkeyPatch
) -> None:
    http, _ = client
    monkeypatch.setattr(images, "MAX_IMAGE_BYTES", 1_000)
    response = http.post("/image-outlines", json={"image": _png(_disc())})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"
    assert "at most" in response.json()["error"]["message"]


def test_base64_longer_than_the_limit_is_refused_before_decoding(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    too_long = "A" * (images.MAX_IMAGE_BYTES // 3 * 4 + 8)
    response = http.post("/image-outlines", json={"image": too_long})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_the_outline_comes_back_as_an_image_route_job(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, asked = client
    outline = http.post("/image-outlines", json={"image": _png(_disc())}).json()
    response = http.post(
        "/image-route-jobs",
        json={"start": START, "outline": outline["points"], "distance_m": 15000},
    )
    assert response.status_code == 202, response.json()
    body = _finished(http, response.json()["job_id"])
    assert body["status"] == "done"
    assert body["result"]["shape"] is None
    assert body["result"]["word"] is None
    [request] = asked
    assert isinstance(request, ImageRequest)
    assert request.name == "image"
    assert request.distance_m == 15000
    assert len(request.outline.points) == len(outline["points"])


@pytest.mark.parametrize(
    ("outline", "words"),
    [
        (SQUARE[:-1], "open"),
        ([[-1, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], "crosses itself"),
        ([[0, 0], [2, 0], [0, 2], [0, 0]], "within [-1, 1]"),
        ([[0, 0], [1, 0], [0, 0], [0, 0]], "at least 3"),
    ],
)
def test_an_outline_that_is_not_one_is_an_invalid_request(
    client: tuple[TestClient, list[AnyRequest]], outline: list[Any], words: str
) -> None:
    http, asked = client
    response = http.post(
        "/image-route-jobs",
        json={"start": START, "outline": outline, "distance_m": 15000},
    )
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_request"
    assert words in error["message"]
    assert asked == []


def test_an_outline_with_too_many_corners_is_an_invalid_request(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    n = images.MAX_POINTS + 1
    ring = [[math.cos(k / n * math.tau), math.sin(k / n * math.tau)] for k in range(n)]
    response = http.post(
        "/image-route-jobs",
        json={"start": START, "outline": [*ring, ring[0]], "distance_m": 15000},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_start_and_distance_are_checked_as_for_a_shape(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    for body in (
        {"start": [95.0, 11.1], "outline": SQUARE, "distance_m": 15000},
        {"start": START, "outline": SQUARE, "distance_m": 500},
        {"start": START, "outline": SQUARE, "distance_m": 15000, "shape": "heart"},
    ):
        response = http.post("/image-route-jobs", json=body)
        assert response.status_code == 422, body
        assert response.json()["error"]["code"] == "invalid_request"


def test_points_that_are_not_finite_are_refused() -> None:
    with pytest.raises(InvalidRequestError, match="finite"):
        outline_of([(0.0, 0.0), (math.nan, 0.0), (0.0, 1.0), (0.0, 0.0)])
    with pytest.raises(InvalidRequestError, match="finite"):
        outline_of([(0.0, 0.0), (math.inf, 0.0), (0.0, 1.0), (0.0, 0.0)])


def test_an_image_route_is_planned_upright_and_names_no_shape(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    called: dict[str, Any] = {}

    def plan_shape(
        shape: Any, name: str, start: Any, distance_m: int, source: Any, **options: Any
    ) -> Plan:
        called.update(name=name, start=start, distance_m=distance_m, **options)
        called["points"] = len(shape)
        result = RouteResult(
            points=RESULT.points, distance_m=15100.0, similarity=0.9, shape=name
        )
        return Plan(result=result, search=None)

    monkeypatch.setattr(images, "plan_shape", plan_shape)
    request = ImageRequest(
        start=(46.0671, 11.1214), outline=outline_of(SQUARE), distance_m=15000
    )
    plan = plan_request(request, FileSource(Path("unused.graphml")))
    assert called["name"] == "image"
    assert called["max_tilt_deg"] == MAX_TILT_DEG
    assert called["points"] == images.SHAPE_POINTS + 1
    assert plan.result.shape is None
    assert plan.result.word is None


def test_the_gpx_of_an_image_route_is_named_image(
    client: tuple[TestClient, list[AnyRequest]],
) -> None:
    http, _ = client
    result = {
        "points": [list(p) for p in RESULT.points],
        "distance_m": RESULT.distance_m,
        "similarity": RESULT.similarity,
        "shape": None,
        "warnings": [],
        "directions": [],
        "word": None,
    }
    response = http.post(
        "/gpx",
        json={
            "request": {"start": START, "outline": SQUARE, "distance_m": 15000},
            "result": result,
        },
    )
    assert response.status_code == 200, response.text
    disposition = response.headers["content-disposition"]
    assert 'filename="shaperoute-image-15km-2026-09-26.gpx"' in disposition
