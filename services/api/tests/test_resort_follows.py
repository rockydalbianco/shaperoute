"""The ski resorts a member follows and the posts of a resort (TASK-406 part
D3, ADR-0338, migration 0062): «Your resorts» with PUT, DELETE and GET, and
GET /ski-resorts/{id}/drawings with the posts the asker sees.

The days are those of the day-of-skiing tests (test_ski_days_api.py); the
resorts those of the «Ski» search's tests.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from test_personal_bests import (
    FAST_HASHER,
    FIXTURES,
    KEYS,
    WallClock,
    database,  # noqa: F401  (the fixture of the bests' tests)
    five_k,
    follows,
    published,
    saved,
    signed_up,
)
from test_ski_days_api import DAY, TODAY
from test_ski_resorts_api import NOW, _resorts

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.resort_follows import install_resort_follows
from shaperoute_api.ski_days import install_ski_days
from shaperoute_api.ski_resorts import delete_missing, save_resorts
from shaperoute_api.ski_resorts_api import SkiResortsBody

SKIING = {"X-MuW-Reads": "skiing"}


@pytest.fixture
def clock() -> WallClock:
    return WallClock()


@pytest.fixture
def client(database: Database, clock: WallClock) -> TestClient:  # noqa: F811
    with database.connect() as conn:
        save_resorts(conn, _resorts(), NOW)
    app = create_app(
        FileSource(Path("unused.graphml")),
        accounts=Accounts(database, now=clock, hasher=FAST_HASHER),
        run_places=PlaceNames(None),
    )
    install_ski_days(app)
    install_resort_follows(app)
    return TestClient(app)


def _followed(client: TestClient, headers: dict[str, str]) -> list[str]:
    answer = client.get("/me/ski-resorts", headers=headers)
    assert answer.status_code == 200, answer.text
    return [resort["id"] for resort in answer.json()["resorts"]]


def _skied(
    client: TestClient,
    headers: dict[str, str],
    key: str,
    resort: str = "aaa1",
    visibility: str = "everyone",
    when: int = TODAY,
) -> str:
    saved(client, headers, key, five_k(30, day=when, activity="skiing"))
    kept = client.put(
        f"/me/activities/{key}/ski", json={**DAY, "resort_id": resort}, headers=headers
    )
    assert kept.status_code == 200, kept.text
    return published(client, headers, key, visibility)


def _posts(
    client: TestClient, headers: dict[str, str], resort: str = "aaa1", **params: Any
) -> Any:
    return client.get(
        f"/ski-resorts/{resort}/drawings", headers={**headers, **SKIING}, params=params
    )


def test_a_member_follows_and_unfollows_resorts(
    client: TestClient, clock: WallClock
) -> None:
    me, other = signed_up(client, 1), signed_up(client, 2)
    assert _followed(client, me) == []
    for resort in ("aaa1", "bbb2"):
        answer = client.put(f"/me/ski-resorts/{resort}/follow", headers=me)
        assert answer.status_code == 204, answer.text
        clock.t = clock.t.replace(minute=clock.t.minute + 1)
    # The last followed first; twice is once; only the member's own.
    assert client.put("/me/ski-resorts/aaa1/follow", headers=me).status_code == 204
    assert _followed(client, me) == ["bbb2", "aaa1"]
    assert _followed(client, other) == []
    assert client.delete("/me/ski-resorts/bbb2/follow", headers=me).status_code == 204
    assert client.delete("/me/ski-resorts/bbb2/follow", headers=me).status_code == 204
    assert _followed(client, me) == ["aaa1"]


def test_following_needs_an_account_and_a_resort(client: TestClient) -> None:
    me = signed_up(client, 1)
    assert client.put("/me/ski-resorts/nowhere/follow", headers=me).status_code == 404
    assert client.put("/me/ski-resorts/aaa1/follow").status_code == 401
    assert client.get("/me/ski-resorts").status_code == 401


def test_a_resort_gone_at_an_import_is_followed_no_more(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client, 1)
    client.put("/me/ski-resorts/aaa1/follow", headers=me)
    with database.connect() as conn:
        delete_missing(conn, ["bbb2"])
    assert _followed(client, me) == []


def test_the_resorts_posts_are_those_one_sees_the_latest_first(
    client: TestClient,
) -> None:
    a, b, viewer = (signed_up(client, n) for n in (1, 2, 3))
    old = _skied(client, a, KEYS[0], when=TODAY - 1)
    new = _skied(client, b, KEYS[0])
    # Not there: another resort, a post for the followers, a private one.
    _skied(client, a, KEYS[1], resort="bbb2")
    _skied(client, b, KEYS[1], visibility="followers", when=TODAY - 2)
    _skied(client, a, KEYS[2], visibility="only_me", when=TODAY - 3)
    answer = _posts(client, viewer)
    assert answer.status_code == 200, answer.text
    body = answer.json()
    assert [d["id"] for d in body["drawings"]] == [new, old]
    assert body["total"] == 2
    assert body["next"] is None
    # A follower of b sees the post for the followers too.
    follows(client, viewer, b)
    assert _posts(client, viewer).json()["total"] == 3


def test_the_resorts_posts_come_in_pages(client: TestClient) -> None:
    a, viewer = signed_up(client, 1), signed_up(client, 2)
    drawings = [_skied(client, a, key, when=TODAY - n) for n, key in enumerate(KEYS)]
    first = _posts(client, viewer, limit=2).json()
    assert [d["id"] for d in first["drawings"]] == drawings[:2]
    assert first["total"] == 3
    rest = _posts(client, viewer, limit=2, cursor=first["next"]).json()
    assert [d["id"] for d in rest["drawings"]] == drawings[2:]
    assert rest["next"] is None


def test_an_app_that_does_not_read_skiing_sees_no_posts(client: TestClient) -> None:
    a, viewer = signed_up(client, 1), signed_up(client, 2)
    _skied(client, a, KEYS[0])
    answer = client.get("/ski-resorts/aaa1/drawings", headers=viewer)
    assert answer.status_code == 200
    assert answer.json()["drawings"] == []
    assert _posts(client, viewer, resort="nowhere").status_code == 404
    assert client.get("/ski-resorts/aaa1/drawings").status_code == 401


def test_the_example_is_the_body() -> None:
    example = json.loads((FIXTURES / "followed-resorts.json").read_text("utf-8"))
    body = SkiResortsBody.model_validate(example)
    assert body.resorts and all(resort.away_m is None for resort in body.resorts)
