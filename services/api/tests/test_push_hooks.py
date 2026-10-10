"""The five events notified through the real routes (TASK-262 part A,
ADR-0226), with Expo faked: a follow request, a request accepted, a
reaction, a comment, a tag. Each sends exactly once to a recipient with
«Push notifications» on; nothing with it off, nothing between blocked
people (TASK-121), nothing to who acted."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
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

from shaperoute_api.accounts import Accounts
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.expo_push import Expo
from shaperoute_api.push import Pusher

ADA_PHONE = "ExponentPushToken[phone-of-ada]"
BOB_PHONE = "ExponentPushToken[phone-of-bob]"


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


@pytest.fixture
def expo() -> FakeExpo:
    return FakeExpo()


@pytest.fixture
def client(database: Database, expo: FakeExpo) -> TestClient:
    accounts = Accounts(database, now=WallClock(), hasher=FAST_HASHER)
    app = create_app(FileSource(Path("unused.graphml")), accounts=accounts)
    app.state.pusher = Pusher(
        database, Expo(send=expo), run=lambda task: task(), later=lambda *_: None
    )
    return TestClient(app)


def public_id(client: TestClient, headers: dict[str, str]) -> str:
    return str(client.get("/me", headers=headers).json()["public_id"])


def people(client: TestClient, push: bool = True) -> tuple[Any, Any]:
    """Ada and Bob, each with a phone, «Push notifications» on or off."""
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    put_token(client, ada, ADA_PHONE)
    put_token(client, bob, BOB_PHONE)
    if push:
        push_on(client, ada)
        push_on(client, bob)
    return ada, bob


def drawing_of(
    client: TestClient, headers: dict[str, str], tags: list[str] | None = None
) -> str:
    run = _load("activity-request.json")
    client.put(f"/me/activities/{KEY}", json=run, headers=headers)
    body: dict[str, Any] = {"title": "Sunday heart", "visibility": "everyone"}
    if tags is not None:
        body["tags"] = tags
    answer = client.put(f"/me/activities/{KEY}/drawing", json=body, headers=headers)
    assert answer.status_code == 200, answer.text
    return str(answer.json()["id"])


def told(expo: FakeExpo) -> list[tuple[str, str]]:
    return [(m["to"], m["body"]) for m in expo.sent]


def test_a_follow_request_and_its_acceptance_are_told_once(
    client: TestClient, expo: FakeExpo
) -> None:
    ada, bob = people(client)
    assert client.post(
        f"/users/{public_id(client, ada)}/follow", headers=bob
    ).is_success
    # Asked again: still one request, not told again.
    assert client.post(
        f"/users/{public_id(client, ada)}/follow", headers=bob
    ).is_success
    assert told(expo) == [(ADA_PHONE, "bob asked to follow you.")]
    accept = f"/me/follow-requests/{public_id(client, bob)}/accept"
    assert client.post(accept, headers=ada).status_code == 204
    assert told(expo)[1:] == [(BOB_PHONE, "ada accepted your follow request.")]
    # Asking someone already followed tells nothing.
    assert client.post(
        f"/users/{public_id(client, ada)}/follow", headers=bob
    ).is_success
    assert len(expo.sent) == 2


def test_a_reaction_and_each_comment_are_told_to_the_owner(
    client: TestClient, expo: FakeExpo
) -> None:
    ada, bob = people(client)
    drawing = drawing_of(client, ada)
    reaction = f"/drawings/{drawing}/reaction"
    assert client.put(reaction, json={"kind": "fire"}, headers=bob).is_success
    # Another kind the same day is the same news.
    assert client.put(reaction, json={"kind": "clap"}, headers=bob).is_success
    comments = f"/drawings/{drawing}/comments"
    assert client.post(comments, json={"text": "Great run"}, headers=bob).is_success
    assert client.post(
        comments, json={"text": "See you Sunday"}, headers=bob
    ).is_success
    # The owner's own comment tells nobody.
    assert client.post(comments, json={"text": "Thanks"}, headers=ada).is_success
    assert told(expo) == [
        (ADA_PHONE, "bob reacted 🔥 to your post."),
        (ADA_PHONE, "bob commented on your post: Great run"),
        (ADA_PHONE, "bob commented on your post: See you Sunday"),
    ]
    assert expo.sent[0]["data"] == {"kind": "reaction", "drawing_id": drawing}


def test_a_tag_is_told_once_to_the_member_tagged(
    client: TestClient, expo: FakeExpo
) -> None:
    ada, bob = people(client)
    drawing = drawing_of(client, ada, tags=[public_id(client, bob)])
    # Kept again with the same tag: nothing new.
    drawing_of(client, ada, tags=[public_id(client, bob)])
    assert told(expo) == [(BOB_PHONE, "ada tagged you in a post.")]
    assert expo.sent[0]["data"] == {"kind": "tag", "drawing_id": drawing}


def test_nothing_is_told_with_push_notifications_off(
    client: TestClient, expo: FakeExpo
) -> None:
    ada, bob = people(client, push=False)
    client.post(f"/users/{public_id(client, ada)}/follow", headers=bob)
    client.post(f"/me/follow-requests/{public_id(client, bob)}/accept", headers=ada)
    drawing = drawing_of(client, ada, tags=[public_id(client, bob)])
    client.put(f"/drawings/{drawing}/reaction", json={"kind": "wow"}, headers=bob)
    client.post(f"/drawings/{drawing}/comments", json={"text": "Nice"}, headers=bob)
    assert expo.sent == []


def test_nothing_is_told_between_blocked_people(
    client: TestClient, expo: FakeExpo
) -> None:
    ada, bob = people(client)
    drawing = drawing_of(client, ada)
    # Ada blocks Bob (TASK-121): whatever reaches the database, nothing is
    # told, either way.
    block = client.put(f"/users/{public_id(client, bob)}/block", headers=ada)
    assert block.status_code == 204
    client.post(f"/users/{public_id(client, ada)}/follow", headers=bob)
    client.put(f"/drawings/{drawing}/reaction", json={"kind": "wow"}, headers=bob)
    client.post(f"/drawings/{drawing}/comments", json={"text": "Hi"}, headers=bob)
    client.post(f"/users/{public_id(client, bob)}/follow", headers=ada)
    assert expo.sent == []


def test_a_notification_never_changes_the_answer(
    database: Database, client: TestClient
) -> None:
    def down(_call: Any) -> Any:
        raise OSError("Expo is down")

    client.app.state.pusher = Pusher(  # type: ignore[attr-defined]
        database, Expo(send=down), run=lambda task: task(), later=lambda *_: None
    )
    ada, bob = people(client)
    asked = client.post(f"/users/{public_id(client, ada)}/follow", headers=bob)
    assert asked.status_code == 200
    assert asked.json() == {"follow": "requested"}
