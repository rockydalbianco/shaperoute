"""A run saved with a score is an event (TASK-241): the app no longer asks
POST /track-scores at the end of a run, which was where `run_scored` came
from. Against a real PostgreSQL, as test_activities."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.insights import Insights
from shaperoute_api.insights.events import EventLog, read_events

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"

FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)
KEY = "7c2e91a4b05d3f68"
OTHER_KEY = "e5d0a83f19c7b246"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def no_place(url: str) -> Any:
    return {"results": []}


@pytest.fixture
def client(database_url: str, tmp_path: Path) -> TestClient:
    database = Database(database_url)
    database.migrate()
    return TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            accounts=Accounts(database, hasher=FAST_HASHER),
            run_places=PlaceNames("test-key", fetch=no_place),
            insights=Insights(EventLog(tmp_path)),
        )
    )


def signed_up(client: TestClient) -> dict[str, str]:
    answer = client.post("/accounts", json=_load("sign-up-request.json"))
    assert answer.status_code == 201
    return {"Authorization": f"Bearer {answer.json()['token']}"}


def scored(tmp_path: Path) -> list[dict[str, Any]]:
    return [event for event in read_events(tmp_path) if event["kind"] == "run_scored"]


def test_a_new_run_with_a_score_is_an_event_with_its_quality_alone(
    client: TestClient, tmp_path: Path
) -> None:
    me = signed_up(client)
    saved = client.put(
        f"/me/activities/{KEY}", json=_load("activity-request.json"), headers=me
    )
    assert saved.status_code == 201
    score = saved.json()["score"]
    assert score is not None
    (event,) = scored(tmp_path)
    assert event["quality"] == round(score / 100, 3)
    # Nothing of who ran it, where, or what it was called.
    assert set(event) <= {"kind", "ts", "quality", "vocab", "outcome"}


def test_the_same_run_sent_again_is_not_a_second_event(
    client: TestClient, tmp_path: Path
) -> None:
    me = signed_up(client)
    body = _load("activity-request.json")
    assert client.put(f"/me/activities/{KEY}", json=body, headers=me).status_code == 201
    assert client.put(f"/me/activities/{KEY}", json=body, headers=me).status_code == 200
    assert len(scored(tmp_path)) == 1


def test_a_run_without_a_route_has_no_score_and_is_no_event(
    client: TestClient, tmp_path: Path
) -> None:
    me = signed_up(client)
    free = {
        **_load("activity-request.json"),
        "points": None,
        "similarity": None,
        "shape": None,
    }
    saved = client.put(f"/me/activities/{OTHER_KEY}", json=free, headers=me)
    assert saved.status_code == 201 and saved.json()["score"] is None
    assert scored(tmp_path) == []


def test_without_a_log_the_run_is_saved_all_the_same(database_url: str) -> None:
    database = Database(database_url)
    database.migrate()
    quiet = TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            accounts=Accounts(database, hasher=FAST_HASHER),
            run_places=PlaceNames("test-key", fetch=no_place),
        )
    )
    me = signed_up(quiet)
    saved = quiet.put(
        f"/me/activities/{KEY}", json=_load("activity-request.json"), headers=me
    )
    assert saved.status_code == 201
