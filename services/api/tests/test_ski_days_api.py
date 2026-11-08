"""A day of skiing's resort, gear and snow (TASK-406 part D1, ADR-0338,
migration 0056): written by the skier with PUT /me/activities/{key}/ski,
read on the post with GET /drawings/{id}/ski-day by whoever sees it, and
counted at the resort with GET /ski-resorts/{id}/snow, numbers only.

The days are the 5.1 km of the bests' tests (test_personal_bests.py); the
resorts those of the «Ski» search's tests (test_ski_resorts_api.py).
"""

from __future__ import annotations

import json
from datetime import timedelta
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
from test_ski_resorts_api import NOW, _resorts

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.ski_days import (
    ResortSnowBody,
    SkiDayBody,
    SkiDayRequestBody,
    install_ski_days,
    snow_counts,
)
from shaperoute_api.ski_resorts import delete_missing, save_resorts

SKIING = {"X-MuW-Reads": "skiing"}
DAY = {"resort_id": "aaa1", "gear": "Ski Atomic Redster", "snow": "powder"}
# The clock of the bests' tests is 2026-11-03 09:00 UTC; five_k(day=2)
# starts at 00:00 that day and lasts 26 minutes.
TODAY = 2


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
    return TestClient(app)


def _resort_name(database: Database, resort_id: str) -> str:  # noqa: F811
    with database.connect() as conn:
        row = conn.execute(
            "SELECT name FROM ski_resorts WHERE id = %s", (resort_id,)
        ).fetchone()
    assert row is not None
    return str(row["name"])


def _keep(
    client: TestClient, headers: dict[str, str], key: str, body: dict[str, Any]
) -> Any:
    return client.put(f"/me/activities/{key}/ski", json=body, headers=headers)


def _skied(
    client: TestClient,
    headers: dict[str, str],
    key: str,
    day: dict[str, Any],
    visibility: str = "everyone",
    when: int = TODAY,
) -> str:
    saved(client, headers, key, five_k(30, day=when, activity="skiing"))
    answer = _keep(client, headers, key, day)
    assert answer.status_code == 200, answer.text
    return published(client, headers, key, visibility)


def _snow(client: TestClient, headers: dict[str, str], resort: str = "aaa1") -> Any:
    return client.get(f"/ski-resorts/{resort}/snow", headers=headers)


def test_the_skier_keeps_the_resort_gear_and_snow(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client, 1)
    saved(client, me, KEYS[0], five_k(30, day=TODAY, activity="skiing"))
    answer = _keep(client, me, KEYS[0], DAY)
    assert answer.status_code == 200, answer.text
    assert answer.json() == {
        "resort": {"id": "aaa1", "name": _resort_name(database, "aaa1")},
        "gear": "Ski Atomic Redster",
        "snow": "powder",
    }
    # Written whole: the last one wins, and what is left out is none.
    again = _keep(client, me, KEYS[0], {"gear": "  Snowboard   Burton  "})
    assert again.json() == {"resort": None, "gear": "Snowboard Burton", "snow": None}
    blank = _keep(client, me, KEYS[0], {"gear": "   ", "snow": "icy"})
    assert blank.json() == {"resort": None, "gear": None, "snow": "icy"}


def test_only_a_day_of_skiing_of_ones_own(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, other = signed_up(client, 1), signed_up(client, 2)
    saved(client, me, KEYS[0], five_k(30, day=TODAY))
    assert _keep(client, me, KEYS[0], DAY).status_code == 422
    saved(client, me, KEYS[1], five_k(30, day=TODAY, activity="skiing"))
    assert _keep(client, other, KEYS[1], DAY).status_code == 404
    assert _keep(client, me, KEYS[2], DAY).status_code == 404
    assert _keep(client, {}, KEYS[1], DAY).status_code == 401


def test_an_unknown_resort_or_snow_is_refused(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client, 1)
    saved(client, me, KEYS[0], five_k(30, day=TODAY, activity="skiing"))
    assert (
        _keep(client, me, KEYS[0], {**DAY, "resort_id": "nowhere"}).status_code == 422
    )
    assert _keep(client, me, KEYS[0], {**DAY, "snow": "slush"}).status_code == 422
    assert _keep(client, me, KEYS[0], {**DAY, "gear": "x" * 61}).status_code == 422
    assert _keep(client, me, KEYS[0], {**DAY, "brand": "Atomic"}).status_code == 422


def test_the_post_gives_the_day_to_whoever_sees_it(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, other = signed_up(client, 1), signed_up(client, 2)
    drawing = _skied(client, me, KEYS[0], DAY)
    for viewer in (me, other):
        answer = client.get(
            f"/drawings/{drawing}/ski-day", headers={**viewer, **SKIING}
        )
        assert answer.status_code == 200, answer.text
        assert answer.json()["snow"] == "powder"
        assert answer.json()["resort"]["id"] == "aaa1"
    # An app that does not read skiing finds nothing, as for the post itself.
    assert client.get(f"/drawings/{drawing}/ski-day", headers=me).status_code == 404


def test_who_cannot_see_the_post_finds_nothing(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, other = signed_up(client, 1), signed_up(client, 2)
    drawing = _skied(client, me, KEYS[0], DAY, visibility="only_me")
    path = f"/drawings/{drawing}/ski-day"
    assert client.get(path, headers={**me, **SKIING}).status_code == 200
    assert client.get(path, headers={**other, **SKIING}).status_code == 404
    assert client.get("/drawings/not-an-id/ski-day", headers=me).status_code == 404


def test_a_run_or_a_day_without_them_has_none(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client, 1)
    saved(client, me, KEYS[0], five_k(30, day=TODAY))
    run = published(client, me, KEYS[0], "everyone")
    saved(client, me, KEYS[1], five_k(30, day=TODAY, activity="skiing"))
    day = published(client, me, KEYS[1], "everyone")
    none = {"resort": None, "gear": None, "snow": None}
    for drawing in (run, day):
        answer = client.get(f"/drawings/{drawing}/ski-day", headers={**me, **SKIING})
        assert answer.json() == none


def test_a_resort_gone_at_an_import_leaves_the_day_without_one(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client, 1)
    drawing = _skied(client, me, KEYS[0], DAY)
    with database.connect() as conn:
        delete_missing(conn, ["bbb2"])
    answer = client.get(f"/drawings/{drawing}/ski-day", headers={**me, **SKIING})
    assert answer.json() == {
        "resort": None,
        "gear": "Ski Atomic Redster",
        "snow": "powder",
    }


def test_the_resorts_snow_counts_the_posts_one_sees_in_the_last_day(
    client: TestClient, database: Database, clock: WallClock  # noqa: F811
) -> None:
    a, b, c, viewer = (signed_up(client, n) for n in (1, 2, 3, 4))
    _skied(client, a, KEYS[0], DAY)
    _skied(client, b, KEYS[0], DAY)
    _skied(client, c, KEYS[0], {**DAY, "snow": "groomed"})
    # Not counted: another resort, no snow marked, two days ago, a post for
    # the followers only, a day never posted.
    _skied(client, a, KEYS[1], {**DAY, "resort_id": "bbb2"}, when=TODAY - 1)
    _skied(client, b, KEYS[1], {**DAY, "snow": None}, when=TODAY - 1)
    _skied(client, c, KEYS[1], {**DAY, "snow": "icy"}, when=TODAY - 2)
    _skied(client, c, KEYS[2], {**DAY, "snow": "heavy"}, visibility="followers")
    saved(client, a, KEYS[2], five_k(30, day=TODAY, activity="skiing"))
    assert _keep(client, a, KEYS[2], {**DAY, "snow": "spring"}).status_code == 200

    answer = _snow(client, viewer)
    assert answer.status_code == 200, answer.text
    body = answer.json()
    assert body["resort_id"] == "aaa1"
    assert body["since"] == "2026-11-02T09:00:00Z"
    assert body["snow"] == [
        {"snow": "powder", "days": 2},
        {"snow": "groomed", "days": 1},
    ]
    # A follower sees the post for the followers too.
    follows(client, viewer, c)
    assert {"snow": "heavy", "days": 1} in _snow(client, viewer).json()["snow"]
    # A day later, today's days are gone.
    clock.t += timedelta(days=1)
    assert _snow(client, viewer).json()["snow"] == []


def test_the_resorts_snow_needs_an_account_and_a_resort(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client, 1)
    assert _snow(client, {}).status_code == 401
    assert _snow(client, me, "nowhere").status_code == 404
    assert _snow(client, me).json()["snow"] == []


def test_ties_keep_the_order_of_the_choice() -> None:
    counted = snow_counts([("heavy", 1), ("powder", 1), ("icy", 3)])
    assert [(c.snow, c.days) for c in counted] == [
        ("icy", 3),
        ("powder", 1),
        ("heavy", 1),
    ]


@pytest.mark.parametrize(
    ("name", "body"),
    [
        ("ski-day-request.json", SkiDayRequestBody),
        ("ski-day.json", SkiDayBody),
        ("resort-snow.json", ResortSnowBody),
    ],
)
def test_the_examples_are_the_bodies(name: str, body: type[Any]) -> None:
    example = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    assert set(example) == set(body.model_fields)
    body.model_validate(example)
