"""«Approve followers» and following at once, in a real PostgreSQL
(TASK-459 part A, ADR-0370), with Expo faked: off from the start, a follow
is kept at once and the one followed is told; on, a request as before;
turning it off accepts the requests waiting and tells each one who asked;
the command after migration 0091 does the same for the accounts it leaves
open."""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from route_engine.network import FileSource
from test_push import (
    FAST_HASHER,
    KEY,
    FakeExpo,
    WallClock,
    _load,
    push_on,
    put_token,
    signed_up,
)

from shaperoute_api import accepted_after_0091
from shaperoute_api.accounts import Accounts
from shaperoute_api.app import create_app
from shaperoute_api.approve_followers import ApproveFollowersBody
from shaperoute_api.db import MIGRATIONS_DIR, Database
from shaperoute_api.expo_push import Expo
from shaperoute_api.notification_list import NotificationList
from shaperoute_api.push import Pusher

Headers = dict[str, str]
SOME_DRAWING = "0b7e5a94-6c1d-4f38-8e2a-9d4c1f6b3a57"
PHONES = {
    name: f"ExponentPushToken[phone-of-{name}]"
    for name in ("ada", "bob", "cleo", "dan")
}


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


@pytest.fixture
def expo() -> FakeExpo:
    return FakeExpo()


@pytest.fixture
def wall() -> WallClock:
    return WallClock()


def pusher_of(database: Database, expo: FakeExpo, wall: WallClock) -> Pusher:
    """Sends at once to the fake Expo; the bell keeps what it lets through."""
    pusher = Pusher(
        database, Expo(send=expo), run=lambda task: task(), later=lambda *_: None
    )
    pusher.listeners.append(NotificationList(database, wall).record)
    return pusher


@pytest.fixture
def client(database: Database, expo: FakeExpo, wall: WallClock) -> TestClient:
    accounts = Accounts(database, now=wall, hasher=FAST_HASHER)
    app = create_app(FileSource(Path("unused.graphml")), accounts=accounts)
    app.state.pusher = pusher_of(database, expo, wall)
    return TestClient(app)


def member(client: TestClient, name: str) -> Headers:
    """A member with a phone and «Push notifications» on."""
    headers = signed_up(client, name)
    put_token(client, headers, PHONES[name])
    push_on(client, headers)
    return headers


def public_id(client: TestClient, headers: Headers) -> str:
    return str(client.get("/me", headers=headers).json()["public_id"])


def follow(client: TestClient, who: Headers, whom: Headers) -> Any:
    return client.post(f"/users/{public_id(client, whom)}/follow", headers=who)


def turn(client: TestClient, who: Headers, on: bool) -> Any:
    return client.put(
        "/me/approve-followers", json={"approve_followers": on}, headers=who
    )


def told(expo: FakeExpo) -> list[tuple[str, str]]:
    return [
        (m["to"], m["body"]) for m in expo.sent if m["data"]["kind"] != "shape_unlocked"
    ]


def names(client: TestClient, who: Headers, path: str) -> list[str]:
    return [p["username"] for p in client.get(path, headers=who).json()["people"]]


def bell(client: TestClient, who: Headers) -> list[tuple[str, str]]:
    rows = client.get("/notifications", headers=who).json()["notifications"]
    return [(row["kind"], row["text"]) for row in rows]


def a_drawing(client: TestClient, who: Headers, visibility: str) -> None:
    client.put(
        f"/me/activities/{KEY}", json=_load("activity-request.json"), headers=who
    )
    body = {"title": "Sunday heart", "visibility": visibility}
    answer = client.put(f"/me/activities/{KEY}/drawing", json=body, headers=who)
    assert answer.status_code == 200, answer.text


# --- The contract ---


def test_the_example_of_shared_types_is_the_contract() -> None:
    kept = ApproveFollowersBody.model_validate(_load("approve-followers.json"))
    assert kept == ApproveFollowersBody(approve_followers=False)
    with pytest.raises(ValidationError):
        ApproveFollowersBody.model_validate({"approve_followers": True, "more": 1})


def test_the_switch_needs_an_account(client: TestClient) -> None:
    assert client.get("/me/approve-followers").status_code == 401
    assert turn(client, {}, True).status_code == 401


def test_a_body_that_is_not_the_switch_is_refused(client: TestClient) -> None:
    ada = member(client, "ada")
    for body in (
        {},
        {"approve_followers": [True]},
        {"approve_followers": True, "x": 1},
    ):
        answer = client.put("/me/approve-followers", json=body, headers=ada)
        assert answer.status_code == 422, body


# --- Off: at once ---


def test_a_new_account_is_followed_at_once_and_told_once(
    client: TestClient, expo: FakeExpo
) -> None:
    ada, bob = member(client, "ada"), member(client, "bob")
    assert client.get("/me/approve-followers", headers=ada).json() == {
        "approve_followers": False
    }
    assert follow(client, bob, ada).json() == {"follow": "following"}
    assert told(expo) == [(PHONES["ada"], "bob started following you.")]
    seen = client.get(f"/users/{public_id(client, ada)}", headers=bob).json()
    assert (seen["followers"], seen["follow"]) == (1, "following")
    assert names(client, ada, "/me/followers") == ["bob"]
    assert names(client, ada, "/me/follow-requests") == []
    # Asked again: nothing changes, nobody is told again.
    assert follow(client, bob, ada).json() == {"follow": "following"}
    assert len(told(expo)) == 1
    assert bell(client, ada) == [("new_follower", "bob started following you.")]
    # The push opens the profile of who follows.
    assert expo.sent[-1]["data"] == {
        "kind": "new_follower",
        "public_id": public_id(client, bob),
        "username": "bob",
    }


def test_a_new_follower_leaves_the_bell_when_it_stops_following(
    client: TestClient,
) -> None:
    ada, bob = member(client, "ada"), member(client, "bob")
    follow(client, bob, ada)
    assert client.delete(
        f"/users/{public_id(client, ada)}/follow", headers=bob
    ).is_success
    assert bell(client, ada) == []


# --- On: a request ---


def test_with_the_switch_on_a_follow_is_a_request(
    client: TestClient, expo: FakeExpo
) -> None:
    ada, bob = member(client, "ada"), member(client, "bob")
    assert turn(client, ada, True).json() == {"approve_followers": True}
    assert client.get("/me/approve-followers", headers=ada).json() == {
        "approve_followers": True
    }
    assert follow(client, bob, ada).json() == {"follow": "requested"}
    assert told(expo) == [(PHONES["ada"], "bob asked to follow you.")]
    assert names(client, ada, "/me/follow-requests") == ["bob"]


def test_turning_it_on_keeps_who_follows(client: TestClient) -> None:
    ada, bob, cleo = (
        member(client, "ada"),
        member(client, "bob"),
        member(client, "cleo"),
    )
    follow(client, bob, ada)
    turn(client, ada, True)
    assert names(client, ada, "/me/followers") == ["bob"]
    assert follow(client, cleo, ada).json() == {"follow": "requested"}


# --- Turned off: the requests waiting accepted ---


def test_turning_it_off_accepts_the_requests_waiting_and_tells_each(
    client: TestClient, expo: FakeExpo
) -> None:
    ada, bob = member(client, "ada"), member(client, "bob")
    cleo, dan = member(client, "cleo"), member(client, "dan")
    turn(client, ada, True)
    for who in (bob, cleo, dan):
        assert follow(client, who, ada).json() == {"follow": "requested"}
    # Cleo's request declined: gone, and it stays so.
    decline = f"/me/follow-requests/{public_id(client, cleo)}/decline"
    assert client.post(decline, headers=ada).status_code == 204
    expo.sent.clear()
    assert turn(client, ada, False).json() == {"approve_followers": False}
    assert sorted(told(expo)) == [
        (PHONES["bob"], "ada accepted your follow request."),
        (PHONES["dan"], "ada accepted your follow request."),
    ]
    assert sorted(names(client, ada, "/me/followers")) == ["bob", "dan"]
    assert names(client, ada, "/me/follow-requests") == []
    assert bell(client, bob) == [
        ("follow_accepted", "ada accepted your follow request.")
    ]
    # Turned off again: nothing waits, nobody is told.
    expo.sent.clear()
    turn(client, ada, False)
    assert told(expo) == []


def test_a_request_waiting_for_an_account_open_now_follows_when_asked_again(
    client: TestClient, database: Database, expo: FakeExpo
) -> None:
    ada, bob = member(client, "ada"), member(client, "bob")
    turn(client, ada, True)
    follow(client, bob, ada)
    # Open without the switch's route, as migration 0091 leaves an account.
    with database.connect() as conn:
        conn.execute("UPDATE users SET approve_followers = false")
    expo.sent.clear()
    assert follow(client, bob, ada).json() == {"follow": "following"}
    assert told(expo) == [(PHONES["ada"], "bob started following you.")]


def test_across_a_block_there_is_nobody_to_follow(client: TestClient) -> None:
    ada, bob = member(client, "ada"), member(client, "bob")
    blocked = client.put(f"/users/{public_id(client, bob)}/block", headers=ada)
    assert blocked.is_success, blocked.text
    assert follow(client, bob, ada).status_code == 404


# --- Migration 0091 and the command after it ---


def test_the_migration_turns_it_on_only_for_who_has_a_drawing_for_followers(
    client: TestClient, database: Database
) -> None:
    ada, bob, cleo = (
        member(client, "ada"),
        member(client, "bob"),
        member(client, "cleo"),
    )
    a_drawing(client, ada, "followers")
    a_drawing(client, bob, "everyone")
    del cleo
    migration = (MIGRATIONS_DIR / "0091_approve_followers.sql").read_text()
    with database.connect() as conn:
        # The database of before 0091, then 0091 again.
        conn.execute("ALTER TABLE users DROP COLUMN approve_followers")
        conn.execute(migration)
        rows = conn.execute(
            "SELECT username, approve_followers FROM users ORDER BY username"
        ).fetchall()
    assert [(r["username"], r["approve_followers"]) for r in rows] == [
        ("ada", True),
        ("bob", False),
        ("cleo", False),
    ]


def test_the_email_of_the_notices_keeps_a_new_follower_without_a_drawing(
    client: TestClient, database: Database
) -> None:
    ada, bob = member(client, "ada"), member(client, "bob")
    del ada, bob
    with database.connect() as conn:
        ids = [
            r["id"]
            for r in conn.execute("SELECT id FROM users ORDER BY username").fetchall()
        ]
    insert = (
        "INSERT INTO email_notices (recipient_id, actor_id, kind, drawing_id, at)"
        " VALUES (%s, %s, 'new_follower', %s, now())"
    )
    with database.connect() as conn:
        conn.execute(insert, (ids[0], ids[1], None))
    with pytest.raises(Exception, match="email_notices_check"):
        with database.connect() as conn:
            conn.execute(insert, (ids[1], ids[0], SOME_DRAWING))


def test_the_command_after_0091_accepts_what_waits_for_open_accounts(
    client: TestClient, database: Database, expo: FakeExpo, wall: WallClock
) -> None:
    ada, bob = member(client, "ada"), member(client, "bob")
    cleo, dan = member(client, "cleo"), member(client, "dan")
    for owner in (ada, dan):
        turn(client, owner, True)
    follow(client, bob, ada)
    follow(client, cleo, ada)
    follow(client, bob, dan)
    # Ada left open by 0091, Dan kept on.
    with database.connect() as conn:
        conn.execute(
            "UPDATE users SET approve_followers = false" " WHERE username = 'ada'"
        )
    expo.sent.clear()
    out = io.StringIO()
    assert accepted_after_0091.main(["--count"], database=database, out=out) == 0
    assert out.getvalue() == (
        "accepted_after_0091: 1 open account(s), 2 request(s) waiting\n"
    )
    assert told(expo) == []
    out = io.StringIO()
    pusher = pusher_of(database, expo, wall)
    assert accepted_after_0091.main([], database=database, pusher=pusher, out=out) == 0
    assert out.getvalue() == (
        "accepted_after_0091: 2 request(s) accepted for 1 account(s)\n"
    )
    assert sorted(told(expo)) == [
        (PHONES["bob"], "ada accepted your follow request."),
        (PHONES["cleo"], "ada accepted your follow request."),
    ]
    assert sorted(names(client, ada, "/me/followers")) == ["bob", "cleo"]
    assert names(client, dan, "/me/follow-requests") == ["bob"]
    # Run twice: nothing more.
    out = io.StringIO()
    assert accepted_after_0091.main([], database=database, pusher=pusher, out=out) == 0
    assert out.getvalue() == (
        "accepted_after_0091: 0 request(s) accepted for 0 account(s)\n"
    )


def test_the_command_needs_the_database(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SHAPEROUTE_DATABASE_URL", raising=False)
    assert accepted_after_0091.main(["--count"]) == 2
