"""The photos of a drawing in a real PostgreSQL (TASK-208, ADR-0170): up to
three besides the map, each in its place; kept upright, at most 1080 px a
side, without the EXIF of the phone; read by whoever may see the drawing and
by nobody else; gone with the run and with the account."""

from __future__ import annotations

import base64
import io
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from PIL import Image
from route_engine.models import InvalidRequestError
from route_engine.network import FileSource

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import UNKNOWN_ACTIVITY, PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.drawing_photos import (
    CACHE_CONTROL,
    MAX_UPLOADS_PER_MINUTE,
    NO_PHOTO,
    PHOTO_SIDE,
    DrawingPhotoRequestBody,
    fitted_jpeg,
)
from shaperoute_api.drawings import MAX_PHOTOS, NO_DRAWING

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
# Cheap parameters: every test signs up.
FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)
KEY = "7c2e91a4b05d3f68"
OTHER_KEY = "e5d0a83f19c7b246"

RED = (220, 30, 30)
GREEN = (30, 160, 60)
BLUE = (30, 60, 220)
# JPEG moves a flat colour by a few levels.
NEAR = 12


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def file_of(picture: Image.Image, kind: str = "JPEG", **options: Any) -> bytes:
    out = io.BytesIO()
    picture.save(out, kind, **options)
    return out.getvalue()


def bands(size: tuple[int, int]) -> Image.Image:
    """Red, green and blue thirds, side by side."""
    width, height = size
    picture = Image.new("RGB", size, GREEN)
    picture.paste(RED, (0, 0, width // 3, height))
    picture.paste(BLUE, (width - width // 3, 0, width, height))
    return picture


def opened(jpeg: bytes) -> Image.Image:
    picture = Image.open(io.BytesIO(jpeg))
    assert picture.format == "JPEG"
    return picture


def near(pixel: Any, colour: tuple[int, int, int]) -> bool:
    return all(abs(a - b) <= NEAR for a, b in zip(pixel, colour, strict=True))


def sent(image: bytes) -> dict[str, str]:
    return {"image": base64.b64encode(image).decode("ascii")}


PHOTO = file_of(bands((1600, 1200)))


class WallClock:
    """A clock the test moves by hand."""

    def __init__(self) -> None:
        self.t = datetime(2026, 10, 3, 9, 15, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.t


@pytest.fixture
def wall() -> WallClock:
    return WallClock()


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


@pytest.fixture
def client(database: Database, wall: WallClock) -> TestClient:
    return TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            accounts=Accounts(database, now=wall, hasher=FAST_HASHER),
            run_places=PlaceNames(None),
        )
    )


def signed_up(client: TestClient, **changes: Any) -> dict[str, str]:
    """A new account, as the header its requests carry."""
    body = {**_load("sign-up-request.json"), **changes}
    answer = client.post("/accounts", json=body)
    assert answer.status_code == 201
    return {"Authorization": f"Bearer {answer.json()['token']}"}


def other(client: TestClient) -> dict[str, str]:
    return signed_up(client, email="other@example.com", username="other_runner")


def third(client: TestClient) -> dict[str, str]:
    return signed_up(client, email="third@example.com", username="third_runner")


def public_id(client: TestClient, headers: dict[str, str]) -> str:
    return str(client.get("/me", headers=headers).json()["public_id"])


def saved(client: TestClient, headers: dict[str, str], key: str = KEY) -> None:
    body = _load("activity-request.json")
    answer = client.put(f"/me/activities/{key}", json=body, headers=headers)
    assert answer.status_code == 201


def seen_by(
    client: TestClient, headers: dict[str, str], visibility: str
) -> dict[str, Any]:
    answer = client.put(
        f"/me/activities/{KEY}/drawing",
        json={"title": "Sunday star", "visibility": visibility},
        headers=headers,
    )
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def photo_path(n: int, key: str = KEY) -> str:
    return f"/me/activities/{key}/drawing/photos/{n}"


def put_photo(
    client: TestClient,
    headers: dict[str, str],
    n: int,
    image: bytes = PHOTO,
    key: str = KEY,
) -> dict[str, Any]:
    answer = client.put(photo_path(n, key), json=sent(image), headers=headers)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def photo_rows(database: Database) -> int:
    with database.connect() as conn:
        row = conn.execute("SELECT count(*) AS n FROM drawing_photos").fetchone()
    assert row is not None
    return int(row["n"])


def code(answer: Any) -> str:
    return str(answer.json()["error"]["code"])


def message(answer: Any) -> str:
    return str(answer.json()["error"]["message"])


# --- The photo, without a database ---


def test_the_example_of_shared_types_is_a_request() -> None:
    body = DrawingPhotoRequestBody.model_validate(_load("drawing-photo-request.json"))
    assert opened(base64.b64decode(body.image)).size == (4, 3)


def test_a_large_photo_is_kept_at_1080_px_on_its_longer_side() -> None:
    kept = fitted_jpeg(PHOTO)
    picture = opened(kept.jpeg)
    assert picture.size == (kept.width, kept.height) == (PHOTO_SIDE, 810)
    assert near(picture.getpixel((10, 405)), RED)
    assert near(picture.getpixel((540, 405)), GREEN)
    assert near(picture.getpixel((1070, 405)), BLUE)


def test_a_small_photo_is_never_enlarged() -> None:
    kept = fitted_jpeg(file_of(bands((300, 200)), "PNG"))
    assert (kept.width, kept.height) == (300, 200)


def test_a_photo_taken_sideways_comes_out_upright_and_without_its_exif() -> None:
    # Lying on its side: the phone says turn it by 90° (orientation 6).
    lying = bands((1200, 1600)).rotate(90, expand=True)
    exif = Image.Exif()
    exif[0x0112] = 6
    exif[0x010F] = "A phone"
    exif.get_ifd(0x8825)[2] = (46.0, 4.0, 1.0)
    sideways = file_of(lying, exif=exif, quality=95)
    assert opened(sideways).getexif().get(0x0112) == 6
    kept = fitted_jpeg(sideways)
    picture = opened(kept.jpeg)
    assert (kept.width, kept.height) == (810, PHOTO_SIDE)
    assert dict(picture.getexif()) == {}
    assert picture.getexif().get_ifd(0x8825) == {}
    assert b"Exif" not in kept.jpeg


@pytest.mark.parametrize(
    "image",
    [b"not a picture", file_of(Image.new("RGB", (8, 8)), "GIF")],
)
def test_what_is_not_a_photo_is_refused(image: bytes) -> None:
    with pytest.raises(InvalidRequestError):
        fitted_jpeg(image)


# --- In the database ---


def test_a_photo_is_kept_in_its_place_and_read_by_its_address(
    client: TestClient,
) -> None:
    me = signed_up(client)
    saved(client, me)
    seen_by(client, me, "everyone")
    sideways = Image.Exif()
    sideways.get_ifd(0x8825)[2] = (46.0, 4.0, 1.0)
    mine = put_photo(client, me, 2, file_of(bands((1600, 1200)), exif=sideways))
    (photo,) = mine["photos"]
    assert photo["n"] == 2
    assert (photo["width"], photo["height"]) == (PHOTO_SIDE, 810)
    assert photo["url"].startswith(f"/drawings/{mine['id']}/photos/2?v=")
    them = other(client)
    answer = client.get(photo["url"], headers=them)
    assert answer.status_code == 200
    assert answer.headers["content-type"] == "image/jpeg"
    assert answer.headers["cache-control"] == CACHE_CONTROL
    picture = opened(answer.content)
    assert picture.size == (PHOTO_SIDE, 810)
    assert dict(picture.getexif()) == {}
    # The drawing says it to the others too.
    seen = client.get(f"/drawings/{mine['id']}", headers=them).json()
    assert seen["photos"] == mine["photos"]


def test_a_place_emptied_stays_empty_and_the_others_stay_where_they_are(
    client: TestClient, wall: WallClock
) -> None:
    me = signed_up(client)
    saved(client, me)
    seen_by(client, me, "everyone")
    for n in range(1, MAX_PHOTOS + 1):
        put_photo(client, me, n)
    removed = client.delete(photo_path(2), headers=me)
    assert removed.status_code == 204
    # Removed twice: the same.
    assert client.delete(photo_path(2), headers=me).status_code == 204
    mine = client.get(f"/me/activities/{KEY}/drawing", headers=me).json()
    assert [photo["n"] for photo in mine["photos"]] == [1, 3]
    empty = client.get(f"/drawings/{mine['id']}/photos/2", headers=me)
    assert empty.status_code == 404
    assert message(empty) == NO_PHOTO
    # A new photo in a place has a new address.
    before = mine["photos"][0]["url"]
    wall.t += timedelta(minutes=1)
    again = put_photo(client, me, 1, file_of(bands((900, 900))))
    assert again["photos"][0]["url"] != before
    assert (again["photos"][0]["width"], again["photos"][0]["height"]) == (900, 900)


@pytest.mark.parametrize("n", [0, MAX_PHOTOS + 1])
def test_a_fourth_photo_is_refused(
    client: TestClient, database: Database, n: int
) -> None:
    me = signed_up(client)
    saved(client, me)
    answer = client.put(photo_path(n), json=sent(PHOTO), headers=me)
    assert answer.status_code == 422
    assert code(answer) == "invalid_request"
    assert client.delete(photo_path(n), headers=me).status_code == 422
    assert photo_rows(database) == 0


def test_a_photo_on_a_run_with_no_drawing_keeps_it_to_its_owner(
    client: TestClient,
) -> None:
    me = signed_up(client)
    saved(client, me)
    mine = put_photo(client, me, 1)
    assert mine["id"] is not None
    assert mine["visibility"] == "only_me"
    assert mine["title"] is None
    url = mine["photos"][0]["url"]
    assert client.get(url, headers=me).status_code == 200
    hidden = client.get(url, headers=other(client))
    assert hidden.status_code == 404
    assert message(hidden) == NO_DRAWING


def test_the_photos_follow_who_can_see_the_drawing(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    url = put_photo(client, me, 1)["photos"][0]["url"]
    follower, stranger = other(client), third(client)
    asked = client.post(f"/users/{public_id(client, me)}/follow", headers=follower)
    assert asked.status_code == 200
    accepted = client.post(
        f"/me/follow-requests/{public_id(client, follower)}/accept", headers=me
    )
    assert accepted.status_code == 204
    for visibility, follower_sees, stranger_sees in (
        ("everyone", 200, 200),
        ("followers", 200, 404),
        ("only_me", 404, 404),
    ):
        seen_by(client, me, visibility)
        assert client.get(url, headers=follower).status_code == follower_sees
        assert client.get(url, headers=stranger).status_code == stranger_sees
        assert client.get(url, headers=me).status_code == 200
    for drawing_id in (str(uuid4()), "42"):
        answer = client.get(f"/drawings/{drawing_id}/photos/1", headers=me)
        assert answer.status_code == 404
        assert message(answer) == NO_DRAWING


def test_only_the_owner_puts_and_removes_its_photos(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    them = other(client)
    for answer in (
        client.put(photo_path(1), json=sent(PHOTO), headers=them),
        client.delete(photo_path(1), headers=them),
        client.put(photo_path(1, OTHER_KEY), json=sent(PHOTO), headers=me),
        client.delete(photo_path(1, OTHER_KEY), headers=me),
    ):
        assert answer.status_code == 404
        assert message(answer) == UNKNOWN_ACTIVITY


def test_a_picture_the_api_cannot_use_is_refused_and_the_old_one_stays(
    client: TestClient,
) -> None:
    me = signed_up(client)
    saved(client, me)
    kept = put_photo(client, me, 1)
    for body in (
        sent(b"not a picture"),
        {"image": "%%% not base64"},
        {"image": sent(PHOTO)["image"], "exif": "kept"},
    ):
        answer = client.put(photo_path(1), json=body, headers=me)
        assert answer.status_code == 422
        assert code(answer) == "invalid_request"
    mine = client.get(f"/me/activities/{KEY}/drawing", headers=me).json()
    assert mine["photos"] == kept["photos"]


def test_deleting_the_run_or_the_account_deletes_the_photos(
    client: TestClient, database: Database
) -> None:
    me = signed_up(client)
    saved(client, me)
    saved(client, me, OTHER_KEY)
    put_photo(client, me, 1)
    put_photo(client, me, 1, key=OTHER_KEY)
    assert photo_rows(database) == 2
    assert client.delete(f"/me/activities/{KEY}", headers=me).status_code == 204
    assert photo_rows(database) == 1
    assert client.delete("/me", headers=me).status_code == 204
    assert photo_rows(database) == 0


def test_every_photo_needs_a_token(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    url = put_photo(client, me, 1)["photos"][0]["url"]
    for method, path, body in (
        ("PUT", photo_path(1), sent(PHOTO)),
        ("DELETE", photo_path(1), None),
        ("GET", url, None),
    ):
        answer = client.request(method, path, json=body)
        assert answer.status_code == 401, path
        assert code(answer) == "not_signed_in"


def test_too_many_photos_in_a_minute_wait(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    small = file_of(Image.new("RGB", (8, 8), GREEN))
    for _ in range(MAX_UPLOADS_PER_MINUTE):
        put_photo(client, me, 1, small)
    answer = client.put(photo_path(1), json=sent(small), headers=me)
    assert answer.status_code == 429
    assert code(answer) == "too_many_requests"
    assert int(answer.headers["retry-after"]) >= 1
