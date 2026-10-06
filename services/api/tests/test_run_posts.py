"""The post of a run kept on the server (TASK-258, ADR-0222): what the app
laid on the picture it shared, written whole at each share, read back with
the run. Against a real PostgreSQL, as test_activities."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import (
    MAX_POST_EMOJI,
    PlaceNames,
    RunPostBody,
    RunPostRequestBody,
)
from shaperoute_api.app import create_app
from shaperoute_api.db import Database

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"

FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)
KEY = "7c2e91a4b05d3f68"
OTHER_KEY = "e5d0a83f19c7b246"
SHARED_AT = datetime(2026, 10, 6, 10, 15, tzinfo=UTC)


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def no_place(url: str) -> Any:
    return {"results": []}


@pytest.fixture
def client(database_url: str) -> TestClient:
    database = Database(database_url)
    database.migrate()
    return TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            accounts=Accounts(database, now=lambda: SHARED_AT, hasher=FAST_HASHER),
            run_places=PlaceNames("test-key", fetch=no_place),
        )
    )


def signed_up(client: TestClient, **changes: Any) -> dict[str, str]:
    body = {**_load("sign-up-request.json"), **changes}
    answer = client.post("/accounts", json=body)
    assert answer.status_code == 201
    return {"Authorization": f"Bearer {answer.json()['token']}"}


def with_a_run(client: TestClient, me: dict[str, str], key: str = KEY) -> None:
    saved = client.put(
        f"/me/activities/{key}", json=_load("activity-request.json"), headers=me
    )
    assert saved.status_code == 201


# --- The contract, without a database ---


def test_the_fixtures_are_the_contract() -> None:
    request = _load("run-post-request.json")
    assert set(request) == set(RunPostRequestBody.model_fields)
    RunPostRequestBody.model_validate(request)
    kept = _load("run-post.json")
    assert set(kept) == set(RunPostBody.model_fields)
    RunPostBody.model_validate(kept)
    assert {k: v for k, v in kept.items() if k != "shared_at"} == request


@pytest.mark.parametrize(
    "change",
    [
        {"results": ["distance", "distance"]},
        {"results": ["score"]},
        {"emoji": [{"emoji": "🔥", "x": 0.5, "y": 0.5}] * (MAX_POST_EMOJI + 1)},
        {"emoji": [{"emoji": "🔥", "x": 1.2, "y": 0.5}]},
        {"emoji": [{"emoji": "", "x": 0.5, "y": 0.5}]},
        {"title": "x" * 121},
        {"picture": "data:image/png;base64,AAAA"},
    ],
)
def test_what_is_not_a_post_is_refused(change: dict[str, Any]) -> None:
    with pytest.raises(ValueError):
        RunPostRequestBody.model_validate({**_load("run-post-request.json"), **change})


# --- With a database ---


def test_the_post_is_kept_with_the_run_and_comes_back_whole(client: TestClient) -> None:
    me = signed_up(client)
    with_a_run(client, me)
    # Before any share: a run without a post.
    assert client.get(f"/me/activities/{KEY}", headers=me).json()["post"] is None

    request = _load("run-post-request.json")
    kept = client.put(f"/me/activities/{KEY}/post", json=request, headers=me)
    assert kept.status_code == 200
    assert kept.json() == {**request, "shared_at": "2026-10-06T10:15:00Z"}
    # The whole run has it; the list does not.
    assert client.get(f"/me/activities/{KEY}", headers=me).json()["post"] == kept.json()
    (listed,) = client.get("/me/activities", headers=me).json()["activities"]
    assert "post" not in listed


def test_sharing_again_writes_the_post_whole_over_the_one_before(
    client: TestClient,
) -> None:
    me = signed_up(client)
    with_a_run(client, me)
    client.put(
        f"/me/activities/{KEY}/post", json=_load("run-post-request.json"), headers=me
    )
    plain = {"title": None, "results": ["distance"], "emoji": []}
    again = client.put(f"/me/activities/{KEY}/post", json=plain, headers=me)
    assert again.status_code == 200
    assert again.json() == {**plain, "shared_at": "2026-10-06T10:15:00Z"}
    assert (
        client.get(f"/me/activities/{KEY}", headers=me).json()["post"] == again.json()
    )


def test_a_post_needs_a_run_of_this_account(client: TestClient) -> None:
    me = signed_up(client)
    other = signed_up(client, email="other@example.com", username="other_runner")
    with_a_run(client, me)
    request = _load("run-post-request.json")
    missing = client.put(f"/me/activities/{OTHER_KEY}/post", json=request, headers=me)
    assert missing.status_code == 404
    assert missing.json()["error"]["message"] == "No activity with this key."
    # Another account's run is not this one's.
    not_mine = client.put(f"/me/activities/{KEY}/post", json=request, headers=other)
    assert not_mine.status_code == 404
    assert client.get(f"/me/activities/{KEY}", headers=me).json()["post"] is None


def test_the_post_goes_with_the_run(client: TestClient) -> None:
    me = signed_up(client)
    with_a_run(client, me)
    client.put(
        f"/me/activities/{KEY}/post", json=_load("run-post-request.json"), headers=me
    )
    assert client.delete(f"/me/activities/{KEY}", headers=me).status_code == 204
    # The same key saved again starts without a post.
    with_a_run(client, me)
    assert client.get(f"/me/activities/{KEY}", headers=me).json()["post"] is None
