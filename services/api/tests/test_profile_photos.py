"""The profile picture in a real PostgreSQL (TASK-178, ADR-0146): set it,
read it, replace it, remove it; each account has only its own; what is kept
is a small square JPEG with nothing of the file it came from."""

from __future__ import annotations

import base64
import io
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import psycopg
import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from PIL import Image
from route_engine.models import InvalidRequestError
from route_engine.network import FileSource

from shaperoute_api import profile_photos as photos_module
from shaperoute_api.accounts import Accounts
from shaperoute_api.app import create_app
from shaperoute_api.db import Database, migrations
from shaperoute_api.profile_photos import (
    MAX_UPLOADS_PER_MINUTE,
    PHOTO_SIDE,
    ProfilePhotoBody,
    square_jpeg,
)
from shaperoute_api.schemas import MAX_IMAGE_BASE64

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
# Cheap parameters: every test signs up.
FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)

RED = (220, 30, 30)
GREEN = (30, 160, 60)
BLUE = (30, 60, 220)
WHITE = (255, 255, 255)
# JPEG moves a flat colour by a few levels.
NEAR = 12


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def file_of(picture: Image.Image, kind: str = "PNG", **options: Any) -> bytes:
    out = io.BytesIO()
    picture.save(out, kind, **options)
    return out.getvalue()


def bands(size: tuple[int, int], across: bool) -> Image.Image:
    """Red, green and blue thirds: side by side when `across`, else stacked."""
    width, height = size
    picture = Image.new("RGB", size, GREEN)
    if across:
        picture.paste(RED, (0, 0, width // 3, height))
        picture.paste(BLUE, (width - width // 3, 0, width, height))
    else:
        picture.paste(RED, (0, 0, width, height // 3))
        picture.paste(BLUE, (0, height - height // 3, width, height))
    return picture


def opened(jpeg: bytes) -> Image.Image:
    picture = Image.open(io.BytesIO(jpeg))
    assert picture.format == "JPEG"
    return picture


def near(pixel: Any, colour: tuple[int, int, int]) -> bool:
    return all(abs(a - b) <= NEAR for a, b in zip(pixel, colour, strict=True))


def sent(image: bytes) -> dict[str, str]:
    return {"image": base64.b64encode(image).decode("ascii")}


PHOTO = file_of(bands((600, 300), across=True))


class WallClock:
    """A clock the test moves by hand."""

    def __init__(self) -> None:
        self.t = datetime(2026, 10, 2, 16, 30, tzinfo=UTC)

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
    accounts = Accounts(database, now=wall, hasher=FAST_HASHER)
    return TestClient(create_app(FileSource(Path("unused.graphml")), accounts=accounts))


def signed_up(client: TestClient, **changes: Any) -> dict[str, str]:
    """A new account, as the header its requests carry."""
    body = {**_load("sign-up-request.json"), **changes}
    answer = client.post("/accounts", json=body)
    assert answer.status_code == 201
    return {"Authorization": f"Bearer {answer.json()['token']}"}


def other(client: TestClient) -> dict[str, str]:
    return signed_up(client, email="other@example.com", username="other_runner")


def rows(database: Database) -> list[dict[str, Any]]:
    with psycopg.connect(database.url, row_factory=psycopg.rows.dict_row) as conn:
        return conn.execute("SELECT * FROM profile_photos").fetchall()


def code(answer: Any) -> str:
    return str(answer.json()["error"]["code"])


# --- The contract and the picture, without a database ---


def test_the_example_of_shared_types_is_a_picture_as_the_api_keeps_it() -> None:
    body = ProfilePhotoBody.model_validate(_load("profile-photo.json"))
    picture = opened(base64.b64decode(body.image, validate=True))
    assert picture.size == (PHOTO_SIDE, PHOTO_SIDE)


def test_the_migration_comes_after_strava() -> None:
    names = [path.name for path in migrations()]
    assert names.index("0005_profile_photos.sql") > names.index("0004_strava.sql")


def test_a_wide_picture_is_cropped_to_the_square_in_its_middle() -> None:
    picture = opened(square_jpeg(PHOTO))
    assert picture.size == (PHOTO_SIDE, PHOTO_SIDE)
    assert picture.mode == "RGB"
    # 600 x 300: the middle 300 keeps a quarter of red and of blue at its sides.
    assert near(picture.getpixel((10, 128)), RED)
    assert near(picture.getpixel((128, 128)), GREEN)
    assert near(picture.getpixel((245, 128)), BLUE)


def test_a_tall_picture_is_cropped_too_and_a_small_one_is_enlarged() -> None:
    tall = opened(square_jpeg(file_of(bands((300, 600), across=False), "JPEG")))
    assert tall.size == (PHOTO_SIDE, PHOTO_SIDE)
    assert near(tall.getpixel((128, 10)), RED)
    assert near(tall.getpixel((128, 245)), BLUE)
    small = opened(square_jpeg(file_of(Image.new("RGB", (10, 10), BLUE))))
    assert small.size == (PHOTO_SIDE, PHOTO_SIDE)
    assert near(small.getpixel((128, 128)), BLUE)


def test_a_photo_taken_sideways_comes_out_upright_and_without_its_exif() -> None:
    # As the camera saves a portrait: the pixels lie on their side, and the
    # EXIF says to turn them (orientation 6) and where the photo was taken.
    lying = bands((300, 300), across=True)
    exif = Image.Exif()
    exif[0x0112] = 6
    exif[0x010F] = "A phone"
    exif.get_ifd(0x8825)[2] = (46.0, 4.0, 1.0)
    sideways = file_of(lying, "JPEG", exif=exif, quality=95)
    assert opened(sideways).getexif().get(0x0112) == 6

    picture = opened(square_jpeg(sideways))
    # Turned a quarter clockwise: the red third, at the left, is now on top.
    assert near(picture.getpixel((128, 10)), RED)
    assert near(picture.getpixel((128, 245)), BLUE)
    assert dict(picture.getexif()) == {}
    assert picture.getexif().get_ifd(0x8825) == {}


def test_a_transparent_picture_gets_a_white_background() -> None:
    clear = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
    clear.paste((*RED, 255), (0, 0, 150, 300))
    picture = opened(square_jpeg(file_of(clear)))
    assert near(picture.getpixel((20, 128)), RED)
    assert near(picture.getpixel((235, 128)), WHITE)


def test_the_same_picture_gives_the_same_bytes() -> None:
    assert square_jpeg(PHOTO) == square_jpeg(PHOTO)
    assert len(square_jpeg(PHOTO)) < 50_000


def test_what_is_not_a_picture_is_refused_with_the_reason(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with pytest.raises(InvalidRequestError, match="cannot read the picture"):
        square_jpeg(b"not a picture at all")
    with pytest.raises(InvalidRequestError, match="cannot read the picture"):
        square_jpeg(PHOTO[: len(PHOTO) // 2])
    # Said once, as it is: not «cannot read the picture: image: …».
    with pytest.raises(
        InvalidRequestError, match="^image: only JPEG and PNG pictures are supported"
    ):
        square_jpeg(file_of(Image.new("RGB", (40, 40), RED), "GIF"))
    monkeypatch.setattr(photos_module, "MAX_PIXELS", 1_000_000)
    with pytest.raises(InvalidRequestError, match="^image: at most 1 megapixels"):
        square_jpeg(file_of(Image.new("RGB", (2000, 1000), RED)))


# --- The endpoints ---


def test_every_endpoint_needs_an_account(client: TestClient) -> None:
    for method, json_body in (("GET", None), ("PUT", sent(PHOTO)), ("DELETE", None)):
        answer = client.request(method, "/me/photo", json=json_body)
        assert (answer.status_code, code(answer)) == (401, "not_signed_in")
        wrong = {"Authorization": "Bearer not-a-token"}
        answer = client.request(method, "/me/photo", json=json_body, headers=wrong)
        assert (answer.status_code, code(answer)) == (401, "not_signed_in")


def test_without_a_database_the_pictures_are_unavailable() -> None:
    client = TestClient(create_app(FileSource(Path("unused.graphml"))))
    answer = client.get("/me/photo", headers={"Authorization": "Bearer any"})
    assert (answer.status_code, code(answer)) == (503, "accounts_unavailable")


def test_a_new_account_has_no_picture(client: TestClient, database: Database) -> None:
    me = signed_up(client)
    answer = client.get("/me/photo", headers=me)
    assert (answer.status_code, code(answer)) == (404, "http_error")
    assert rows(database) == []


def test_a_picture_set_is_kept_small_and_read_back(
    client: TestClient, database: Database, wall: WallClock
) -> None:
    me = signed_up(client)
    answer = client.put("/me/photo", json=sent(PHOTO), headers=me)
    assert answer.status_code == 200
    body = ProfilePhotoBody.model_validate(answer.json())
    assert body.updated_at == wall.t
    jpeg = base64.b64decode(body.image, validate=True)
    assert jpeg == square_jpeg(PHOTO)
    assert opened(jpeg).size == (PHOTO_SIDE, PHOTO_SIDE)

    assert client.get("/me/photo", headers=me).json() == answer.json()
    (row,) = rows(database)
    assert bytes(row["jpeg"]) == jpeg
    assert row["updated_at"] == wall.t


def test_a_new_picture_takes_the_place_of_the_one_before(
    client: TestClient, database: Database, wall: WallClock
) -> None:
    me = signed_up(client)
    client.put("/me/photo", json=sent(PHOTO), headers=me)
    wall.t += timedelta(hours=1)
    blue = file_of(Image.new("RGB", (400, 400), BLUE), "JPEG")
    answer = client.put("/me/photo", json=sent(blue), headers=me)
    assert answer.status_code == 200
    assert answer.json()["updated_at"] != ""
    (row,) = rows(database)
    assert row["updated_at"] == wall.t
    assert near(opened(bytes(row["jpeg"])).getpixel((10, 128)), BLUE)
    assert client.get("/me/photo", headers=me).json() == answer.json()


def test_each_account_has_only_its_own_picture(client: TestClient) -> None:
    me = signed_up(client)
    them = other(client)
    client.put("/me/photo", json=sent(PHOTO), headers=me)
    assert client.get("/me/photo", headers=them).status_code == 404
    # Removing theirs, which is not there, leaves mine.
    assert client.delete("/me/photo", headers=them).status_code == 204
    assert client.get("/me/photo", headers=me).status_code == 200


def test_a_picture_removed_is_gone_and_removing_twice_is_the_same(
    client: TestClient, database: Database
) -> None:
    me = signed_up(client)
    client.put("/me/photo", json=sent(PHOTO), headers=me)
    answer = client.delete("/me/photo", headers=me)
    assert (answer.status_code, answer.content) == (204, b"")
    assert client.get("/me/photo", headers=me).status_code == 404
    assert rows(database) == []
    assert client.delete("/me/photo", headers=me).status_code == 204


def test_deleting_the_account_deletes_its_picture(
    client: TestClient, database: Database
) -> None:
    me = signed_up(client)
    them = other(client)
    client.put("/me/photo", json=sent(PHOTO), headers=me)
    client.put("/me/photo", json=sent(PHOTO), headers=them)
    assert len(rows(database)) == 2
    assert client.delete("/me", headers=me).status_code == 204
    assert len(rows(database)) == 1
    assert client.get("/me/photo", headers=them).status_code == 200


@pytest.mark.parametrize(
    ("body", "said"),
    [
        ({}, "image"),
        ({"image": "not base64!"}, "not valid base64"),
        ({"image": base64.b64encode(b"some text").decode()}, "cannot read"),
        ({**sent(PHOTO), "user_id": 2}, "user_id"),
        ({"image": "A" * (MAX_IMAGE_BASE64 + 4)}, "image"),
    ],
    ids=["no image", "not base64", "not a picture", "an extra field", "too large"],
)
def test_a_picture_the_api_cannot_use_is_refused_and_the_old_one_stays(
    client: TestClient, database: Database, body: dict[str, Any], said: str
) -> None:
    me = signed_up(client)
    client.put("/me/photo", json=sent(PHOTO), headers=me)
    before = rows(database)
    answer = client.put("/me/photo", json=body, headers=me)
    assert (answer.status_code, code(answer)) == (422, "invalid_request")
    assert said in answer.json()["error"]["message"]
    assert rows(database) == before


def test_too_many_pictures_in_a_minute_wait(client: TestClient) -> None:
    me = signed_up(client)
    them = other(client)
    small = sent(file_of(Image.new("RGB", (8, 8), RED)))
    for _ in range(MAX_UPLOADS_PER_MINUTE):
        assert client.put("/me/photo", json=small, headers=me).status_code == 200
    answer = client.put("/me/photo", json=small, headers=me)
    assert (answer.status_code, code(answer)) == (429, "too_many_requests")
    assert 0 < int(answer.headers["Retry-After"]) <= 60
    # The limit is each account's own, and reading is never limited.
    assert client.put("/me/photo", json=small, headers=them).status_code == 200
    assert client.get("/me/photo", headers=me).status_code == 200
