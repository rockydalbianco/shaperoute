"""An item of gear past its limit, in the bell (TASK-486 part G, ADR-0393,
the user's choice 5), in a real PostgreSQL.

When the gear of an activity takes an item from under its limit to at or
over it, its owner reads one line in the bell: no phone rings
(push.BELL_ONLY). The same limit is one line; an item already past, or
without a limit, says nothing. A deleted item takes its line along.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient
from test_drawings import (
    KEY,
    OTHER_KEY,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    saved,
    signed_up,
    wall,  # noqa: F401
)
from test_gear import add, put_on, run_numbers

from shaperoute_api import game as game_module
from shaperoute_api.db import Database
from shaperoute_api.push import BELL_ONLY, OWN_KINDS, TEXTS

Headers = dict[str, str]


@pytest.fixture(autouse=True)
def no_game_shapes(monkeypatch: pytest.MonkeyPatch) -> None:
    """A saved run unlocks no shape of the game here: its line is not these
    tests' (as test_notification_list.py)."""
    monkeypatch.setattr(game_module, "CATALOG", ())


def limit_lines(app: TestClient, headers: Headers) -> list[dict[str, Any]]:
    answer = app.get("/notifications", headers=headers)
    assert answer.status_code == 200, answer.text
    return [
        line for line in answer.json()["notifications"] if line["kind"] == "gear_limit"
    ]


def test_it_is_told_in_the_bell_only() -> None:
    assert "gear_limit" in BELL_ONLY and "gear_limit" in OWN_KINDS
    assert set(TEXTS["gear_limit"]) == {"en", "de", "it", "es", "fr"}


def test_an_activity_past_the_limit_is_told_once(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    saved(client, me, OTHER_KEY)
    metres, _ = run_numbers(database, KEY)
    shoes = add(client, me, limit_m=metres)
    put_on(client, me, [shoes["id"]])
    (line,) = limit_lines(client, me)
    assert line["text"] == "The red ones reached the limit you set."
    assert line["opens"] == {"kind": "gear_limit", "gear_id": shoes["id"]}
    assert line["read"] is False
    # The same list again, and a second activity past it: still one line.
    put_on(client, me, [shoes["id"]])
    put_on(client, me, [shoes["id"]], key=OTHER_KEY)
    assert len(limit_lines(client, me)) == 1


def test_under_the_limit_or_without_one_nothing(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    metres, _ = run_numbers(database, KEY)
    far = add(client, me, limit_m=metres + 1_000)
    free = add(client, me, brand="Asics", name=None)
    put_on(client, me, [far["id"], free["id"]])
    assert limit_lines(client, me) == []


def test_a_name_of_its_own_or_brand_and_model(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    metres, _ = run_numbers(database, KEY)
    shoes = add(client, me, name=None, limit_m=metres)
    put_on(client, me, [shoes["id"]])
    (line,) = limit_lines(client, me)
    assert line["text"] == "Nike Pegasus 41 reached the limit you set."


def test_a_deleted_item_takes_its_line(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    metres, _ = run_numbers(database, KEY)
    shoes = add(client, me, limit_m=metres)
    put_on(client, me, [shoes["id"]])
    assert len(limit_lines(client, me)) == 1
    assert client.delete(f"/me/gear/{shoes['id']}", headers=me).status_code == 204
    assert limit_lines(client, me) == []
