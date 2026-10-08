"""Push notifications in a real PostgreSQL, with Expo faked (TASK-262 part
A, ADR-0226): the tokens of the phones kept and taken back, and exactly one
send to a recipient who wants it, none to one who does not, none to who
acted; dead tokens deleted from the tickets and from the receipts."""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.accounts import Accounts
from shaperoute_api.app import create_app
from shaperoute_api.db import Database, migrations
from shaperoute_api.expo_push import DEVICE_NOT_REGISTERED, Expo
from shaperoute_api.push import (
    RECEIPT_DELAY_S,
    RECEIPT_KEPT_S,
    SAME_EVENT_S,
    TEXTS,
    Pusher,
    PushEvent,
    PushTokenRequestBody,
    data_of,
    quoted,
    text_of,
)
from shaperoute_api.strava_client import Call, Reply

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)
# The migration of the tokens, whatever its number when merged.
(PUSH_TOKENS,) = [
    path for path in migrations() if path.name.endswith("_push_tokens.sql")
]
PHONE = "ExponentPushToken[phone-of-ada]"
OTHER_PHONE = "ExponentPushToken[phone-of-bob]"
TABLET = "ExponentPushToken[tablet-of-ada]"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class Clock:
    """Seconds, moved by hand."""

    def __init__(self) -> None:
        self.t = 1000.0

    def __call__(self) -> float:
        return self.t


class FakeExpo:
    """Expo on the wire, faked: every message sent and every receipt asked
    are recorded; the tickets and receipts say what `dead` says."""

    def __init__(self) -> None:
        self.sent: list[dict[str, Any]] = []
        self.asked: list[str] = []
        # Tokens Expo calls dead at once, in the ticket.
        self.dead_now: set[str] = set()
        # Tokens Apple or Google call dead later, in the receipt.
        self.dead_later: set[str] = set()
        self.ready = True
        self._tokens: dict[str, str] = {}

    def __call__(self, call: Call) -> Reply:
        body = json.loads(call.body or b"")
        if call.url.endswith("/send"):
            data = []
            for m in body:
                self.sent.append(m)
                if m["to"] in self.dead_now:
                    data.append(
                        {"status": "error", "details": {"error": DEVICE_NOT_REGISTERED}}
                    )
                else:
                    ticket = f"ticket-{len(self.sent)}"
                    self._tokens[ticket] = m["to"]
                    data.append({"status": "ok", "id": ticket})
            return Reply(200, {}, json.dumps({"data": data}).encode())
        self.asked.extend(body["ids"])
        receipts: dict[str, Any] = {}
        if self.ready:
            for ticket in body["ids"]:
                if self._tokens.get(ticket) in self.dead_later:
                    receipts[ticket] = {
                        "status": "error",
                        "details": {"error": DEVICE_NOT_REGISTERED},
                    }
                else:
                    receipts[ticket] = {"status": "ok"}
        return Reply(200, {}, json.dumps({"data": receipts}).encode())

    def to(self) -> list[str]:
        return [m["to"] for m in self.sent]


class WallClock:
    def __call__(self) -> datetime:
        return datetime(2026, 10, 8, 12, 0, tzinfo=UTC)


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


@pytest.fixture
def expo() -> FakeExpo:
    return FakeExpo()


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def later() -> list[tuple[float, Callable[[], None]]]:
    return []


@pytest.fixture
def pusher(
    database: Database,
    expo: FakeExpo,
    clock: Clock,
    later: list[tuple[float, Callable[[], None]]],
) -> Pusher:
    """Sends at once, in the test's thread; the receipts when asked."""
    return Pusher(
        database,
        Expo(send=expo),
        run=lambda task: task(),
        later=lambda delay, task: later.append((delay, task)),
        clock=clock,
    )


@pytest.fixture
def client(database: Database, pusher: Pusher) -> TestClient:
    accounts = Accounts(database, now=WallClock(), hasher=FAST_HASHER)
    app = create_app(FileSource(Path("unused.graphml")), accounts=accounts)
    app.state.pusher = pusher
    return TestClient(app)


def signed_up(client: TestClient, name: str) -> dict[str, str]:
    body = {
        **_load("sign-up-request.json"),
        "email": f"{name}@example.com",
        "username": name,
    }
    answer = client.post("/accounts", json=body)
    assert answer.status_code == 201
    return {"Authorization": f"Bearer {answer.json()['token']}"}


def user_id(client: TestClient, headers: dict[str, str]) -> int:
    return int(client.get("/me", headers=headers).json()["id"])


def push_on(client: TestClient, headers: dict[str, str], on: bool = True) -> None:
    answer = client.put("/me/notifications", json={"push": on}, headers=headers)
    assert answer.status_code == 200


def put_token(
    client: TestClient, headers: dict[str, str], token: str, **more: Any
) -> Any:
    body = {"token": token, "platform": "ios", **more}
    return client.put("/me/push-token", json=body, headers=headers)


def tokens(database: Database) -> list[tuple[str, int, str, str | None]]:
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT token, user_id, platform, language FROM push_tokens"
            " ORDER BY token"
        ).fetchall()
    return [(r["token"], r["user_id"], r["platform"], r["language"]) for r in rows]


# --- The contract, without a database ---


def test_the_example_of_shared_types_is_the_contract() -> None:
    request = _load("push-token-request.json")
    assert set(request) == set(PushTokenRequestBody.model_fields)
    body = PushTokenRequestBody.model_validate(request)
    assert body.platform in ("ios", "android")


def test_the_data_of_a_notification_is_the_contract() -> None:
    drawing, profile = _load("push-data.json")
    who = UUID(profile["public_id"])
    comment = PushEvent("comment", 1, 2, drawing_id=UUID(drawing["drawing_id"]))
    assert data_of(comment, who, "ada") == drawing
    assert data_of(PushEvent("follow_request", 1, 2), who, "ada") == profile


def test_every_text_is_in_the_five_languages_with_the_same_marks() -> None:
    for kind, texts in TEXTS.items():
        assert set(texts) == {"en", "de", "it", "es", "fr"}, kind
        marks = {m for m in ("{name}", "{emoji}", "{text}") if m in texts["en"]}
        for language, text in texts.items():
            found = {m for m in ("{name}", "{emoji}", "{text}") if m in text}
            assert found == marks, (kind, language)


def test_the_texts_name_who_acted_in_the_phone_s_language() -> None:
    reaction = PushEvent("reaction", 1, 2, reaction="fire")
    assert text_of(reaction, "ada", "en") == "ada reacted 🔥 to your post."
    assert text_of(reaction, "ada", "it") == "ada ha reagito con 🔥 al tuo post."
    # Without a language, or one the API does not have: English.
    assert text_of(reaction, "ada", None) == "ada reacted 🔥 to your post."
    assert text_of(reaction, "ada", "pt") == "ada reacted 🔥 to your post."
    heart = PushEvent("reaction", 1, 2, reaction="super_like", text="Great  run!")
    assert text_of(heart, "ada", "en") == "ada gave your post a MuW heart: Great run!"


def test_a_long_comment_is_cut_on_one_line() -> None:
    assert quoted("one\ntwo") == "one two"
    long = quoted("x" * 300)
    assert len(long) == 100 and long.endswith("…")


# --- The tokens ---


def test_a_token_is_kept_with_its_account_platform_and_language(
    client: TestClient, database: Database
) -> None:
    ada = signed_up(client, "ada")
    answer = put_token(client, ada, PHONE, language="it")
    assert answer.status_code == 204
    assert tokens(database) == [(PHONE, user_id(client, ada), "ios", "it")]
    # Sent again: still one row, with what the app says now.
    assert put_token(client, ada, PHONE, platform="android").status_code == 204
    assert tokens(database) == [(PHONE, user_id(client, ada), "android", None)]


def test_a_phone_that_changes_hands_is_the_new_account_s(
    client: TestClient, database: Database
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    put_token(client, ada, PHONE)
    put_token(client, bob, PHONE)
    assert [row[1] for row in tokens(database)] == [user_id(client, bob)]


def test_a_token_is_taken_back_by_its_account_only(
    client: TestClient, database: Database
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    put_token(client, ada, PHONE)
    put_token(client, ada, TABLET)
    # Another account cannot take Ada's phone away.
    assert client.delete(f"/me/push-token/{PHONE}", headers=bob).status_code == 204
    assert len(tokens(database)) == 2
    assert client.delete(f"/me/push-token/{PHONE}", headers=ada).status_code == 204
    assert [row[0] for row in tokens(database)] == [TABLET]
    # Done already: the same answer.
    assert client.delete(f"/me/push-token/{PHONE}", headers=ada).status_code == 204


def test_deleting_the_account_deletes_its_tokens(
    client: TestClient, database: Database
) -> None:
    ada = signed_up(client, "ada")
    put_token(client, ada, PHONE)
    assert client.delete("/me", headers=ada).status_code == 204
    assert tokens(database) == []


@pytest.mark.parametrize(
    "body",
    [
        {"token": "not-a-token", "platform": "ios"},
        {"token": "ExponentPushToken[]", "platform": "ios"},
        {"token": PHONE, "platform": "windows"},
        {"token": PHONE, "platform": "ios", "language": "pt"},
        {"token": PHONE, "platform": "ios", "extra": 1},
        {"platform": "ios"},
    ],
)
def test_what_is_not_a_token_is_refused(
    client: TestClient, database: Database, body: dict[str, Any]
) -> None:
    ada = signed_up(client, "ada")
    answer = client.put("/me/push-token", json=body, headers=ada)
    assert answer.status_code == 422
    assert answer.json()["error"]["code"] == "invalid_request"
    assert tokens(database) == []


def test_the_tokens_want_a_session(client: TestClient) -> None:
    answer = client.put("/me/push-token", json={"token": PHONE, "platform": "ios"})
    assert answer.status_code == 401
    assert client.delete(f"/me/push-token/{PHONE}").status_code == 401


def test_without_a_database_there_is_no_pusher() -> None:
    app = create_app(FileSource(Path("unused.graphml")))
    assert app.state.pusher is None
    answer = TestClient(app).put(
        "/me/push-token",
        json={"token": PHONE, "platform": "ios"},
        headers={"Authorization": "Bearer x"},
    )
    assert answer.status_code == 503


def test_the_migration_is_one_table_tied_to_the_accounts() -> None:
    sql = PUSH_TOKENS.read_text(encoding="utf-8")
    assert "CREATE TABLE push_tokens" in sql
    assert "ON DELETE CASCADE" in sql
    assert "ALTER TABLE" not in sql


# --- What is sent ---


def two(client: TestClient) -> tuple[dict[str, str], int, dict[str, str], int]:
    """Ada, who acts, and Bob, who is told, with his phone."""
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    put_token(client, bob, OTHER_PHONE)
    return ada, user_id(client, ada), bob, user_id(client, bob)


@pytest.mark.parametrize(
    ("kind", "expected"),
    [
        ("follow_request", "ada asked to follow you."),
        ("follow_accepted", "ada accepted your follow request."),
    ],
)
def test_a_follow_event_is_sent_once_with_the_profile_to_open(
    client: TestClient, pusher: Pusher, expo: FakeExpo, kind: Any, expected: str
) -> None:
    ada, ada_id, bob, bob_id = two(client)
    push_on(client, bob)
    pusher.notify(PushEvent(kind, ada_id, bob_id))
    assert expo.to() == [OTHER_PHONE]
    (sent,) = expo.sent
    assert sent["body"] == expected
    public_id = client.get("/me", headers=ada).json()["public_id"]
    assert sent["data"] == {"kind": kind, "public_id": public_id, "username": "ada"}


def test_nothing_is_sent_with_push_notifications_off(
    client: TestClient, pusher: Pusher, expo: FakeExpo
) -> None:
    _, ada_id, bob, bob_id = two(client)
    # Off from the start (TASK-185), and off again after on.
    pusher.notify(PushEvent("follow_request", ada_id, bob_id))
    push_on(client, bob)
    push_on(client, bob, False)
    pusher.notify(PushEvent("follow_accepted", ada_id, bob_id))
    assert expo.sent == []


def test_nothing_is_sent_to_who_acted(
    client: TestClient, pusher: Pusher, expo: FakeExpo
) -> None:
    ada = signed_up(client, "ada")
    put_token(client, ada, PHONE)
    push_on(client, ada)
    ada_id = user_id(client, ada)
    pusher.notify(PushEvent("comment", ada_id, ada_id, text="mine"))
    assert expo.sent == []


def test_nothing_is_sent_between_blocked_people(
    database: Database, client: TestClient, expo: FakeExpo
) -> None:
    _, ada_id, bob, bob_id = two(client)
    push_on(client, bob)
    blocked = Pusher(
        database,
        Expo(send=expo),
        run=lambda task: task(),
        later=lambda _d, _t: None,
        blocked=lambda _conn, a, b: {a, b} == {ada_id, bob_id},
    )
    blocked.notify(PushEvent("follow_request", ada_id, bob_id))
    assert expo.sent == []


def test_every_phone_of_the_recipient_gets_one_in_its_language(
    client: TestClient, pusher: Pusher, expo: FakeExpo
) -> None:
    _, ada_id, bob, bob_id = two(client)
    put_token(client, bob, TABLET, language="it")
    push_on(client, bob)
    pusher.notify(PushEvent("follow_request", ada_id, bob_id))
    assert sorted((m["to"], m["body"]) for m in expo.sent) == [
        (OTHER_PHONE, "ada asked to follow you."),
        (TABLET, "ada ha chiesto di seguirti."),
    ]


def test_the_same_event_is_sent_once_a_day(
    client: TestClient, pusher: Pusher, expo: FakeExpo, clock: Clock
) -> None:
    _, ada_id, bob, bob_id = two(client)
    push_on(client, bob)
    asked = PushEvent("follow_request", ada_id, bob_id)
    pusher.notify(asked)
    pusher.notify(asked)
    assert len(expo.sent) == 1
    # Another reaction of the same person to the same drawing is the same
    # event too.
    pusher.notify(PushEvent("reaction", ada_id, bob_id, reaction="fire"))
    pusher.notify(PushEvent("reaction", ada_id, bob_id, reaction="clap"))
    assert len(expo.sent) == 2
    expo.sent.pop()
    clock.t += SAME_EVENT_S
    pusher.notify(asked)
    assert len(expo.sent) == 2
    # Two comments are two events.
    pusher.notify(PushEvent("comment", ada_id, bob_id, text="a", key="1"))
    pusher.notify(PushEvent("comment", ada_id, bob_id, text="b", key="2"))
    assert len(expo.sent) == 4


def test_a_recipient_without_a_phone_costs_no_send(
    client: TestClient, pusher: Pusher, expo: FakeExpo
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    push_on(client, bob)
    pusher.notify(
        PushEvent("follow_request", user_id(client, ada), user_id(client, bob))
    )
    assert expo.sent == []


def test_a_failure_never_reaches_the_caller(
    client: TestClient, database: Database
) -> None:
    def broken(_call: Call) -> Reply:
        raise OSError("down")

    _, ada_id, bob, bob_id = two(client)
    push_on(client, bob)
    pusher = Pusher(database, Expo(send=broken), run=lambda task: task())
    # Expo down: logged, not raised; the token stays.
    pusher.notify(PushEvent("follow_request", ada_id, bob_id))
    # An account that does not exist: nothing to send, nothing raised.
    pusher.notify(PushEvent("follow_request", ada_id, 10_000))
    assert [row[0] for row in tokens(database)] == [OTHER_PHONE]


# --- Dead tokens ---


def test_a_dead_ticket_deletes_its_token(
    client: TestClient, pusher: Pusher, expo: FakeExpo, database: Database
) -> None:
    _, ada_id, bob, bob_id = two(client)
    put_token(client, bob, TABLET)
    push_on(client, bob)
    expo.dead_now = {OTHER_PHONE}
    pusher.notify(PushEvent("follow_request", ada_id, bob_id))
    assert [row[0] for row in tokens(database)] == [TABLET]


def test_a_dead_receipt_deletes_its_token_after_the_delay(
    client: TestClient,
    pusher: Pusher,
    expo: FakeExpo,
    database: Database,
    clock: Clock,
    later: list[tuple[float, Callable[[], None]]],
) -> None:
    _, ada_id, bob, bob_id = two(client)
    put_token(client, bob, TABLET)
    push_on(client, bob)
    expo.dead_later = {TABLET}
    pusher.notify(PushEvent("follow_request", ada_id, bob_id))
    # The receipts are asked for later, once.
    assert [delay for delay, _ in later] == [RECEIPT_DELAY_S]
    assert pusher.check_receipts() == []
    assert expo.asked == []
    clock.t += RECEIPT_DELAY_S
    _, check = later.pop()
    check()
    assert expo.asked == ["ticket-1", "ticket-2"]
    assert [row[0] for row in tokens(database)] == [OTHER_PHONE]
    # Read once: nothing waits any more.
    assert later == []
    assert pusher.check_receipts() == []
    assert expo.asked == ["ticket-1", "ticket-2"]


def test_a_receipt_not_ready_is_asked_again_until_expo_forgets_it(
    client: TestClient,
    pusher: Pusher,
    expo: FakeExpo,
    clock: Clock,
    later: list[tuple[float, Callable[[], None]]],
) -> None:
    _, ada_id, bob, bob_id = two(client)
    push_on(client, bob)
    expo.ready = False
    pusher.notify(PushEvent("follow_request", ada_id, bob_id))
    clock.t += RECEIPT_DELAY_S
    later.pop()[1]()
    assert expo.asked == ["ticket-1"]
    # Still waiting: asked again later.
    assert len(later) == 1
    clock.t += RECEIPT_KEPT_S
    later.pop()[1]()
    assert expo.asked == ["ticket-1", "ticket-1"]
    # Expo keeps a receipt a day: then it is given up.
    assert later == []
