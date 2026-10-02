"""Favorites in a real PostgreSQL (TASK-171, ADR-0139): keep a route, list,
open and remove it; each account sees only its own; the bodies are the
examples of packages/shared-types/fixtures. A word with the pen up keeps its
walks (TASK-199)."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api import favorites as favorites_module
from shaperoute_api.accounts import Accounts
from shaperoute_api.app import create_app
from shaperoute_api.db import Database, migrations
from shaperoute_api.favorites import (
    MAX_POINTS,
    FavoriteBody,
    FavoriteDetailBody,
    FavoriteRequestBody,
    FavoritesBody,
)
from shaperoute_api.recommended import PREVIEW_POINTS

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
# Cheap parameters: every test signs up.
FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)
KEY = "3f9a1c0e7b2d4a65"
OTHER_KEY = "a41b77c2d09e5f13"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class WallClock:
    """A clock the test moves by hand."""

    def __init__(self) -> None:
        self.t = datetime(2026, 10, 2, 8, 30, tzinfo=UTC)

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


def request(**changes: Any) -> dict[str, Any]:
    return {**_load("favorite-request.json"), **changes}


def code(answer: Any) -> str:
    return str(answer.json()["error"]["code"])


# --- The contract, without a database ---


def test_the_fixtures_are_the_contract() -> None:
    # Written before TASK-199: the request of an older app, the answer of an
    # older API, without the walks.
    body = _load("favorite-request.json")
    assert set(body) == set(FavoriteRequestBody.model_fields) - {"walks"}
    FavoriteRequestBody.model_validate(body)
    listed = _load("favorites.json")
    assert set(listed["favorites"][0]) == set(FavoriteBody.model_fields)
    FavoritesBody.model_validate(listed)
    whole = _load("favorite.json")
    assert set(whole) == set(FavoriteDetailBody.model_fields) - {"walks"}
    # A word with the pen up (TASK-199): every field.
    walked = _load("favorite-request-walks.json")
    assert set(walked) == set(FavoriteRequestBody.model_fields)
    FavoriteRequestBody.model_validate(walked)
    whole_walked = _load("favorite-walks.json")
    assert set(whole_walked) == set(FavoriteDetailBody.model_fields)
    FavoriteDetailBody.model_validate(whole_walked)


def test_the_migration_comes_after_the_accounts() -> None:
    names = [path.name for path in migrations()]
    assert names.index("0002_favorites.sql") > names.index("0001_users_sessions.sql")


# --- Keeping, listing, opening, removing ---


def test_a_route_kept_is_listed_as_the_example(client: TestClient) -> None:
    me = signed_up(client)
    kept = client.put(f"/me/favorites/{KEY}", json=request(), headers=me)
    assert kept.status_code == 201
    expected = _load("favorites.json")["favorites"][0]
    assert kept.json() == expected
    listed = client.get("/me/favorites", headers=me)
    assert listed.status_code == 200
    assert listed.json() == {"favorites": [expected]}


def test_a_favorite_opens_whole_as_the_example(client: TestClient) -> None:
    me = signed_up(client)
    client.put(f"/me/favorites/{KEY}", json=request(), headers=me)
    whole = client.get(f"/me/favorites/{KEY}", headers=me)
    assert whole.status_code == 200
    # The example of before TASK-199, and no walks.
    assert whole.json() == {**_load("favorite.json"), "walks": []}


def test_the_line_comes_back_digit_for_digit(client: TestClient) -> None:
    me = signed_up(client)
    points = [[46.06712345678, 11.12198765432], [46.070000001, 11.1230000009]]
    client.put(f"/me/favorites/{KEY}", json=request(points=points), headers=me)
    assert client.get(f"/me/favorites/{KEY}", headers=me).json()["points"] == points


def test_keeping_twice_keeps_once(client: TestClient, wall: WallClock) -> None:
    me = signed_up(client)
    first = client.put(f"/me/favorites/{KEY}", json=request(), headers=me)
    wall.t += timedelta(hours=1)
    again = client.put(
        f"/me/favorites/{KEY}", json=request(city="rovereto"), headers=me
    )
    assert again.status_code == 200
    # As it was kept the first time: neither the city nor the date moves.
    assert again.json() == first.json()
    assert len(client.get("/me/favorites", headers=me).json()["favorites"]) == 1


def test_the_newest_comes_first(client: TestClient, wall: WallClock) -> None:
    me = signed_up(client)
    client.put(f"/me/favorites/{KEY}", json=request(), headers=me)
    wall.t += timedelta(minutes=5)
    word = request(city="", shape=None, word="CIAO", style="block")
    client.put(f"/me/favorites/{OTHER_KEY}", json=word, headers=me)
    listed = client.get("/me/favorites", headers=me).json()["favorites"]
    assert [favorite["id"] for favorite in listed] == [OTHER_KEY, KEY]
    assert listed[0]["word"] == "CIAO"
    assert listed[0]["style"] == "block"


def test_a_long_line_is_listed_light_and_opened_whole(client: TestClient) -> None:
    me = signed_up(client)
    points = [[46.0 + i * 1e-5, 11.0 + i * 1e-5] for i in range(1000)]
    kept = client.put(f"/me/favorites/{KEY}", json=request(points=points), headers=me)
    preview = kept.json()["preview"]
    assert len(preview) == PREVIEW_POINTS
    assert preview[0] == kept.json()["start"] == [46.0, 11.0]
    assert preview[-1] == [round(46.0 + 999e-5, 5), round(11.0 + 999e-5, 5)]
    whole = client.get(f"/me/favorites/{KEY}", headers=me).json()
    assert len(whole["points"]) == 1000


def test_removing_is_done_once_or_twice(client: TestClient) -> None:
    me = signed_up(client)
    client.put(f"/me/favorites/{KEY}", json=request(), headers=me)
    assert client.delete(f"/me/favorites/{KEY}", headers=me).status_code == 204
    assert client.get("/me/favorites", headers=me).json() == {"favorites": []}
    assert client.delete(f"/me/favorites/{KEY}", headers=me).status_code == 204
    gone = client.get(f"/me/favorites/{KEY}", headers=me)
    assert gone.status_code == 404
    assert code(gone) == "http_error"


# --- A word with the pen up (TASK-199) ---


def walked(**changes: Any) -> dict[str, Any]:
    return {**_load("favorite-request-walks.json"), **changes}


def test_a_favorite_keeps_its_walks(client: TestClient) -> None:
    me = signed_up(client)
    kept = client.put(f"/me/favorites/{KEY}", json=walked(), headers=me)
    assert kept.status_code == 201
    # The list is as before: no walks in it.
    assert "walks" not in kept.json()
    listed = client.get("/me/favorites", headers=me).json()["favorites"]
    assert "walks" not in listed[0]
    whole = client.get(f"/me/favorites/{KEY}", headers=me)
    assert whole.status_code == 200
    assert whole.json() == _load("favorite-walks.json")


@pytest.mark.parametrize(
    "walks",
    [
        [[2, 8]],
        [[5, 2]],
        [[-1, 2]],
        [[2, 5], [3, 6]],
        [[2, 5, 7]],
        [[2, 5]] * 40,
        "[2, 5]",
    ],
)
def test_walks_that_are_not_of_the_route_are_refused(
    client: TestClient, walks: Any
) -> None:
    me = signed_up(client)
    answer = client.put(f"/me/favorites/{KEY}", json=walked(walks=walks), headers=me)
    assert answer.status_code == 422
    assert code(answer) == "invalid_request"
    assert client.get("/me/favorites", headers=me).json() == {"favorites": []}


# --- Whose they are ---


def test_favorites_need_an_account(client: TestClient) -> None:
    for answer in (
        client.get("/me/favorites"),
        client.get(f"/me/favorites/{KEY}"),
        client.put(f"/me/favorites/{KEY}", json=request()),
        client.delete(f"/me/favorites/{KEY}"),
    ):
        assert answer.status_code == 401
        assert code(answer) == "not_signed_in"


def test_an_account_sees_only_its_own(client: TestClient) -> None:
    me = signed_up(client)
    them = other(client)
    client.put(f"/me/favorites/{KEY}", json=request(), headers=me)
    assert client.get("/me/favorites", headers=them).json() == {"favorites": []}
    assert client.get(f"/me/favorites/{KEY}", headers=them).status_code == 404
    # The same route kept by two accounts is two favorites, and removing
    # one's leaves the other's.
    assert (
        client.put(f"/me/favorites/{KEY}", json=request(), headers=them).status_code
        == 201
    )
    client.delete(f"/me/favorites/{KEY}", headers=them)
    assert len(client.get("/me/favorites", headers=me).json()["favorites"]) == 1


def test_deleting_the_account_deletes_its_favorites(
    client: TestClient, database: Database
) -> None:
    me = signed_up(client)
    them = other(client)
    client.put(f"/me/favorites/{KEY}", json=request(), headers=me)
    client.put(f"/me/favorites/{KEY}", json=request(), headers=them)
    assert client.delete("/me", headers=me).status_code == 204
    with database.connect() as conn:
        left = conn.execute("SELECT count(*) AS n FROM favorites").fetchone()
    assert left is not None and left["n"] == 1
    assert len(client.get("/me/favorites", headers=them).json()["favorites"]) == 1


# --- What is refused ---


@pytest.mark.parametrize(
    "changes",
    [
        {"points": [[46.067, 11.1215]]},
        {"points": [[96.0, 11.0], [46.0, 11.0]]},
        {"points": [[46.0, 191.0], [46.0, 11.0]]},
        {"points": [[46.0, 11.0]] * (MAX_POINTS + 1)},
        {"distance_m": 0},
        {"route_m": 100_001},
        {"similarity": 1.2},
        {"style": "italic"},
        {"title": "x" * 61},
        {"city": "x" * 81},
        {"user_id": 1},
    ],
)
def test_a_route_that_is_not_one_is_refused(
    client: TestClient, changes: dict[str, Any]
) -> None:
    me = signed_up(client)
    answer = client.put(f"/me/favorites/{KEY}", json=request(**changes), headers=me)
    assert answer.status_code == 422
    assert code(answer) == "invalid_request"
    assert client.get("/me/favorites", headers=me).json() == {"favorites": []}


@pytest.mark.parametrize("key", ["short", "UPPERCASE1234", "with-dash-1234", "x" * 41])
def test_a_key_that_is_not_one_is_refused(client: TestClient, key: str) -> None:
    me = signed_up(client)
    answer = client.put(f"/me/favorites/{key}", json=request(), headers=me)
    assert answer.status_code == 422
    assert code(answer) == "invalid_request"


def test_the_list_has_an_end(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(favorites_module, "MAX_FAVORITES", 2)
    me = signed_up(client)
    for key in ("favorite1", "favorite2"):
        assert (
            client.put(f"/me/favorites/{key}", json=request(), headers=me).status_code
            == 201
        )
    full = client.put("/me/favorites/favorite3", json=request(), headers=me)
    assert full.status_code == 422
    assert code(full) == "invalid_request"
    assert "remove one" in full.json()["error"]["message"]
    # One already kept is still answered, and room is made by removing.
    assert (
        client.put("/me/favorites/favorite1", json=request(), headers=me).status_code
        == 200
    )
    client.delete("/me/favorites/favorite1", headers=me)
    assert (
        client.put("/me/favorites/favorite3", json=request(), headers=me).status_code
        == 201
    )


def test_without_a_database_favorites_are_off() -> None:
    client = TestClient(create_app(FileSource(Path("unused.graphml"))))
    answer = client.get("/me/favorites", headers={"Authorization": "Bearer x"})
    assert answer.status_code == 503
    assert code(answer) == "accounts_unavailable"
