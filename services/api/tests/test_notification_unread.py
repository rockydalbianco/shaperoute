"""The bell's number alone (TASK-499, addition to ADR-0311): GET
/notifications/unread says what GET /notifications says as `unread`, in a
real PostgreSQL, by the same rules, with one query and no picture."""

from __future__ import annotations

import base64
import io
import json
from datetime import timedelta
from pathlib import Path
from typing import Any

import psycopg
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from test_drawings import (
    KEY,
    OTHER_KEY,
    WallClock,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    drawn,
    follows,
    other,
    public_id,
    saved,
    signed_up,
    third,
    wall,  # noqa: F401
)

from shaperoute_api import game as game_module
from shaperoute_api.db import Database
from shaperoute_api.notification_list import (
    KEPT_DAYS,
    PAGE_SIZE,
    NotificationList,
    UnreadBody,
    rules_sql,
    shown_sql,
    unread_sql,
)
from shaperoute_api.push import PushEvent
from shaperoute_api.reads import EVERYTHING, reads_from

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)


@pytest.fixture(autouse=True)
def no_game_shapes(monkeypatch: pytest.MonkeyPatch) -> None:
    """As in test_notification_list.py: a saved run unlocks no shape here."""
    monkeypatch.setattr(game_module, "CATALOG", ())


def lines(app: TestClient, headers: dict[str, str]) -> tuple[list[dict[str, Any]], int]:
    """Every line of the list, page after page, and the list's `unread`."""
    found: list[dict[str, Any]] = []
    before: int | None = None
    while True:
        query = {} if before is None else {"before": before}
        answer = app.get("/notifications", params=query, headers=headers)
        assert answer.status_code == 200, answer.text
        page = answer.json()
        found += page["notifications"]
        before = page["before"]
        if before is None:
            return found, int(page["unread"])


def number(app: TestClient, headers: dict[str, str]) -> int:
    """The number alone, which is the list's `unread` and the unread lines
    the list shows."""
    answer = app.get("/notifications/unread", headers=headers)
    assert answer.status_code == 200, answer.text
    body = answer.json()
    assert set(body) == {"unread"}
    shown, unread = lines(app, headers)
    assert body["unread"] == unread
    assert body["unread"] == len([line for line in shown if not line["read"]])
    return int(body["unread"])


def posted(
    app: TestClient, headers: dict[str, str], key: str = KEY, **fields: Any
) -> str:
    saved(app, headers, key)
    return str(drawn(app, headers, key, **fields)["id"])


def user_id(database: Database, username: str) -> int:  # noqa: F811
    with database.connect() as conn:
        row = conn.execute(
            "SELECT id FROM users WHERE username = %s", (username,)
        ).fetchone()
    assert row is not None
    return int(row["id"])


def a_photo() -> str:
    picture = Image.new("RGB", (300, 300), (30, 160, 60))
    out = io.BytesIO()
    picture.save(out, "PNG")
    return base64.b64encode(out.getvalue()).decode("ascii")


# --- The same number as the list ---


def test_the_number_is_the_list_s_as_events_come_and_are_read(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me, bob, cleo = signed_up(client), other(client), third(client)
    assert number(client, me) == 0
    mine = posted(client, me)
    client.post(f"/users/{public_id(client, me)}/follow", headers=bob)
    wall.t += timedelta(minutes=1)
    follows(client, me, cleo)
    client.put(f"/drawings/{mine}/reaction", json={"kind": "fire"}, headers=bob)
    client.post(f"/drawings/{mine}/comments", json={"text": "Great run"}, headers=bob)
    posted(client, cleo, OTHER_KEY, tags=[public_id(client, me)])
    assert number(client, me) == 5

    # Read up to the third newest; then one more comes.
    shown, _ = lines(client, me)
    read = client.post(
        "/notifications/read", json={"up_to": shown[2]["id"]}, headers=me
    )
    assert read.status_code == 204
    assert number(client, me) == 2
    client.post(f"/drawings/{mine}/comments", json={"text": "Again"}, headers=cleo)
    assert number(client, me) == 3
    # Each account its own: the ones who acted were told nothing.
    assert number(client, bob) == 0


def test_what_is_not_true_any_more_is_not_counted(
    client: TestClient,  # noqa: F811
) -> None:
    me, bob, cleo = signed_up(client), other(client), third(client)
    mine = posted(client, me)
    # A request, a reaction and a comment of bob; a comment of cleo.
    client.post(f"/users/{public_id(client, me)}/follow", headers=bob)
    client.put(f"/drawings/{mine}/reaction", json={"kind": "wow"}, headers=bob)
    said = client.post(f"/drawings/{mine}/comments", json={"text": "x"}, headers=bob)
    client.post(f"/drawings/{mine}/comments", json={"text": "Hey"}, headers=cleo)
    assert number(client, me) == 4
    client.delete(f"/users/{public_id(client, me)}/follow", headers=bob)
    assert number(client, me) == 3
    client.delete(f"/drawings/{mine}/reaction", headers=bob)
    assert number(client, me) == 2
    client.delete(f"/comments/{said.json()['id']}", headers=bob)
    assert number(client, me) == 1
    # Nothing across a block.
    blocked = client.put(f"/users/{public_id(client, cleo)}/block", headers=me)
    assert blocked.status_code in (200, 204)
    assert number(client, me) == 0


def test_a_tag_in_a_drawing_no_longer_seen_is_not_counted(
    client: TestClient,  # noqa: F811
) -> None:
    me, cleo = signed_up(client), third(client)
    posted(client, cleo, tags=[public_id(client, me)])
    assert number(client, me) == 1
    drawn(client, cleo, visibility="followers", tags=[public_id(client, me)])
    assert number(client, me) == 0


def test_more_than_a_page_and_past_the_kept_days(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    me_id = user_id(database, "Runner_42")
    rows = NotificationList(database, wall)
    for n in range(PAGE_SIZE + 2):
        rows.record(PushEvent("piece_done", me_id, me_id, number=n + 1))
    # The number is of every line, not of the first page.
    assert number(client, me) == PAGE_SIZE + 2
    wall.t += timedelta(days=KEPT_DAYS)
    assert number(client, me) == 0


def test_the_list_and_the_number_read_the_same_rules() -> None:
    for reads in (EVERYTHING, reads_from([])):
        rules = rules_sql(reads)
        assert rules in shown_sql(reads) and rules in unread_sql(reads)
    # An app that reads less is shown less: the two must not be the same.
    assert rules_sql(EVERYTHING) != rules_sql(reads_from([]))


# --- One query, no picture ---


def test_the_number_is_one_query_without_pictures(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    me, bob = signed_up(client), other(client)
    assert client.put("/me/photo", json={"image": a_photo()}, headers=bob).is_success
    client.post(f"/users/{public_id(client, me)}/follow", headers=bob)
    # The list carries who acted, with its picture; the number does not.
    shown, _ = lines(client, me)
    assert shown[0]["actor"]["photo"]
    answer = client.get("/notifications/unread", headers=me)
    assert answer.json() == {"unread": 1}
    assert len(answer.content) < 40

    me_id = user_id(database, "Runner_42")
    asked: list[str] = []
    real = psycopg.Connection.execute

    def spy(self: Any, query: Any, *args: Any, **kwargs: Any) -> Any:
        asked.append(str(query))
        return real(self, query, *args, **kwargs)

    monkeypatch.setattr(psycopg.Connection, "execute", spy)
    assert NotificationList(database, wall).unread(me_id) == 1
    assert len(asked) == 1
    for word in ("jpeg", "profile_photos", "LATERAL", "language"):
        assert word not in asked[0]


def test_the_number_needs_an_account(
    client: TestClient,  # noqa: F811
) -> None:
    assert client.get("/notifications/unread").status_code == 401


def test_the_fixture_is_an_answer() -> None:
    fixture = json.loads(
        (FIXTURES / "notifications-unread.json").read_text(encoding="utf-8")
    )
    assert set(fixture) == set(UnreadBody.model_fields)
    UnreadBody.model_validate(fixture)
