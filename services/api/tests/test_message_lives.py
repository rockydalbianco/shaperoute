"""A live share sent in a private message, in a real PostgreSQL (TASK-468
part A1b, ADR-0381): its owner sends it from the recording («Send in MuW»)
or as an attachment, only in a conversation open to it; the other may then
see it in the app; the card says how it goes, asked at every reading, and
is null once the share is gone or a block stands between them. An app that
does not say it reads a live reads «[Live]»; the push says that a live is
shared. The bodies are the examples of packages/shared-types/fixtures."""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from test_messages import (
    FAST_HASHER,
    Headers,
    WallClock,
    _load,
    follow,
    page,
    pid,
    rows,
    signed_up,
)
from test_push import FakeExpo, push_on, put_token

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.expo_push import Expo
from shaperoute_api.messages import (
    LIVE_ENDED,
    LIVE_NOT_YOURS,
    READS_LIVE,
    LiveCardBody,
    MessageRequestBody,
    MessagesBody,
)
from shaperoute_api.push import TEXTS, Pusher
from shaperoute_api.reads import READS_HEADER

BOB_PHONE = "ExponentPushToken[phone-of-bob]"
WITH = {"with": "attachments"}
# What an app that shows a live attached says.
READS = {READS_HEADER: READS_LIVE}


@pytest.fixture
def wall() -> WallClock:
    return WallClock()


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


@pytest.fixture
def expo() -> FakeExpo:
    return FakeExpo()


@pytest.fixture
def client(database: Database, wall: WallClock, expo: FakeExpo) -> TestClient:
    app = create_app(
        FileSource(Path("unused.graphml")),
        accounts=Accounts(database, now=wall, hasher=FAST_HASHER),
        run_places=PlaceNames(None),
    )
    app.state.pusher = Pusher(
        database, Expo(send=expo), run=lambda task: task(), later=lambda *_: None
    )
    return TestClient(app)


def friends(client: TestClient) -> tuple[Headers, Headers]:
    """Ada and Bob, Bob following Ada: her conversation with him is open."""
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    follow(client, bob, ada)
    return ada, bob


def live(client: TestClient, owner: Headers) -> str:
    body = {"activity": "running", "link": False}
    answer = client.post("/me/live-shares", json=body, headers=owner)
    assert answer.status_code == 201, answer.text
    return str(answer.json()["id"])


def moved(client: TestClient, owner: Headers, share_id: str, **changes: Any) -> None:
    body = {
        "points": [],
        "stats": {"distance_m": 3200, "duration_s": 1080},
        "state": "live",
        **changes,
    }
    answer = client.post(
        f"/me/live-shares/{share_id}/updates", json=body, headers=owner
    )
    assert answer.status_code == 200, answer.text


def sent_in_muw(
    client: TestClient, owner: Headers, share_id: str, *to: Headers
) -> Any:
    answer = client.post(
        f"/me/live-shares/{share_id}/send",
        json={"to": [pid(client, h) for h in to]},
        headers=owner,
    )
    client.app.state.accounts.now.later()  # type: ignore[attr-defined]
    return answer


def attach(client: TestClient, who: Headers, to: Headers, share_id: str) -> Any:
    answer = client.post(
        f"/conversations/{pid(client, to)}/messages",
        params=WITH,
        json={"text": "", "attachment": {"live_share_id": share_id}},
        headers={**who, **READS},
    )
    client.app.state.accounts.now.later()  # type: ignore[attr-defined]
    return answer


def latest(client: TestClient, who: Headers, other: Headers, **headers: str) -> Any:
    return page(client, {**who, **headers}, other, **WITH)["messages"][0]


def card(client: TestClient, who: Headers, other: Headers) -> Any:
    message = latest(client, who, other, **READS)
    assert message["attachment"]["kind"] == "live"
    return message["attachment"]["live"]


def error(answer: Any) -> str:
    return str(answer.json()["error"]["message"])


# --- The contract ---


def test_the_examples_are_the_bodies() -> None:
    example = _load("message-live.json")
    MessagesBody.model_validate(example)
    shown, gone = (m["attachment"] for m in example["messages"])
    assert set(shown["live"]) == set(LiveCardBody.model_fields)
    assert gone["live"] is None
    asked = {"text": "", "attachment": {"live_share_id": shown["live"]["share_id"]}}
    assert MessageRequestBody.model_validate(asked).attachment is not None
    with pytest.raises(ValueError):
        MessageRequestBody.model_validate(
            {
                "text": "",
                "attachment": {"live_share_id": str(uuid4()), "post_id": str(uuid4())},
            }
        )


# --- Sending ---


def test_send_in_muw_is_a_message_with_its_card(client: TestClient) -> None:
    ada, bob = friends(client)
    share = live(client, ada)
    moved(client, ada, share)
    answer = sent_in_muw(client, ada, share, bob)
    assert answer.json() == {"sent": [pid(client, bob)], "skipped": []}
    shown = card(client, bob, ada)
    assert shown["share_id"] == share and shown["status"] == "live"
    assert shown["distance_m"] == 3200 and shown["duration_s"] == 1080
    # The owner sees its own card too.
    assert card(client, ada, bob)["share_id"] == share
    # And Bob may open it in the app.
    assert client.get(f"/live-shares/{share}", headers=bob).status_code == 200


def test_attached_in_a_message_too(client: TestClient) -> None:
    ada, bob = friends(client)
    share = live(client, ada)
    answer = attach(client, ada, bob, share)
    assert answer.status_code == 201, answer.text
    assert answer.json()["attachment"]["live"]["share_id"] == share
    assert client.get(f"/live-shares/{share}", headers=bob).status_code == 200


def test_only_ones_own_share_going_on(client: TestClient) -> None:
    ada, bob = friends(client)
    follow(client, ada, bob)
    hers = live(client, ada)
    answer = attach(client, bob, ada, hers)
    assert answer.status_code == 404 and error(answer) == LIVE_NOT_YOURS
    assert attach(client, ada, bob, str(uuid4())).status_code == 404
    moved(client, ada, hers, state="finished")
    ended = attach(client, ada, bob, hers)
    assert ended.status_code == 422 and error(ended) == LIVE_ENDED
    assert sent_in_muw(client, ada, hers, bob).status_code == 410


def test_never_in_a_request(client: TestClient, database: Database) -> None:
    ada, cleo = signed_up(client, "ada"), signed_up(client, "cleo")
    share = live(client, ada)
    assert attach(client, ada, cleo, share).status_code == 409
    skipped = sent_in_muw(client, ada, share, cleo).json()
    assert skipped == {"sent": [], "skipped": [pid(client, cleo)]}
    assert rows(database, "SELECT * FROM live_share_recipients") == []
    assert client.get(f"/live-shares/{share}", headers=cleo).status_code == 404


# --- Reading ---


def test_the_card_follows_the_share_and_ends(
    client: TestClient, wall: WallClock, database: Database
) -> None:
    ada, bob = friends(client)
    share = live(client, ada)
    sent_in_muw(client, ada, share, bob)
    moved(client, ada, share, state="paused")
    assert card(client, bob, ada)["status"] == "paused"
    moved(client, ada, share, state="finished")
    assert card(client, bob, ada)["status"] == "finished"
    wall.t += timedelta(hours=2)
    assert card(client, bob, ada)["status"] == "expired"
    # The share's row goes a day later: «Live ended», the message stays.
    with database.connect() as conn:
        conn.execute("DELETE FROM live_shares")
    assert card(client, bob, ada) is None


def test_a_block_takes_the_card_away(client: TestClient) -> None:
    ada, bob = friends(client)
    share = live(client, ada)
    sent_in_muw(client, ada, share, bob)
    # A block deletes the conversation (messages.on_block): nothing to read,
    # and the share is out of reach.
    assert client.put(f"/users/{pid(client, bob)}/block", headers=ada).is_success
    assert client.get(f"/live-shares/{share}", headers=bob).status_code == 404


def test_an_app_of_before_reads_live_as_text(client: TestClient) -> None:
    ada, bob = friends(client)
    share = live(client, ada)
    sent_in_muw(client, ada, share, bob)
    old = latest(client, bob, ada)
    assert old["text"] == "[Live]" and old["attachment"] is None
    oldest = page(client, bob, ada)["messages"][0]
    assert oldest["text"] == "[Live]" and oldest["attachment"] is None
    listed = client.get(
        "/me/conversations", params=WITH, headers={**bob, **READS}
    ).json()
    assert listed["conversations"][0]["last"]["attachment"]["kind"] == "live"


# --- The push ---


def test_the_push_says_a_live_is_shared(client: TestClient, expo: FakeExpo) -> None:
    ada, bob = friends(client)
    push_on(client, bob)
    put_token(client, bob, BOB_PHONE)
    share = live(client, ada)
    sent_in_muw(client, ada, share, bob)
    assert expo.sent[-1]["body"] == "ada is sharing a live activity with you"
    assert expo.sent[-1]["data"]["kind"] == "message"


def test_the_push_is_in_every_language() -> None:
    for which in ("message_live", "message_live_text"):
        assert set(TEXTS[which]) == {"en", "de", "it", "es", "fr"}
    assert TEXTS["message_live"]["it"] == "{name} ti condivide un'attività dal vivo"
