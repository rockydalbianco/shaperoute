"""A post sent in a private message, in a real PostgreSQL (TASK-455 part A,
ADR-0382): the message keeps the drawing's id and nothing of it; who sends
it must see the drawing; each reader is shown its card only while it may
open the post itself, asked again at every reading: not a follower of a
post for the followers, a follow taken back, a block either way, a post
whose owner changes who sees it, one hidden, one deleted. An app that does
not say it reads a post reads «[Post]»; the push says «🗺️ Post» and no
more. The bodies are the examples of packages/shared-types/fixtures."""

from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from route_engine.network import FileSource
from test_drawings import KEY, run
from test_messages import (
    FAST_HASHER,
    Headers,
    WallClock,
    _load,
    box,
    follow,
    page,
    pid,
    rows,
    sent,
    signed_up,
)
from test_push import FakeExpo, push_on, put_token

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.drawings import NO_DRAWING
from shaperoute_api.expo_push import Expo
from shaperoute_api.messages import (
    ATTACHMENT_IN_REQUEST,
    POST_ONLY_YOU,
    READS_POST,
    MessageRequestBody,
    MessagesBody,
    PostCardBody,
)
from shaperoute_api.push import Pusher
from shaperoute_api.reads import READS_HEADER

BOB_PHONE = "ExponentPushToken[phone-of-bob]"
WITH = {"with": "attachments"}
# What an app that shows a post attached says.
READS = {READS_HEADER: READS_POST}


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


def talking(client: TestClient) -> tuple[Headers, Headers]:
    """Ada and Bob in a conversation open to both: Ada wrote, Bob accepted."""
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    sent(client, ada, bob, "Hi Bob!")
    assert client.put(
        f"/conversations/{pid(client, ada)}/accept", headers=bob
    ).is_success
    return ada, bob


def posted(client: TestClient, who: Headers, visibility: str = "everyone") -> str:
    """A run of `who` saved and published for `visibility`: its drawing's id."""
    saved = client.put(f"/me/activities/{KEY}", json=run(), headers=who)
    assert saved.status_code == 201, saved.text
    return seen_by(client, who, visibility)


def seen_by(client: TestClient, who: Headers, visibility: str) -> str:
    """The owner says who sees its drawing; the drawing's id."""
    answer = client.put(
        f"/me/activities/{KEY}/drawing",
        json={"title": "Sunday star", "visibility": visibility},
        headers=who,
    )
    assert answer.status_code == 200, answer.text
    return str(answer.json()["id"])


def attach(
    client: TestClient, who: Headers, to: Headers, post_id: str, text: str = ""
) -> Any:
    answer = client.post(
        f"/conversations/{pid(client, to)}/messages",
        params=WITH,
        json={"text": text, "attachment": {"post_id": post_id}},
        headers={**who, **READS},
    )
    client.app.state.accounts.now.later()  # type: ignore[attr-defined]
    return answer


def attached(
    client: TestClient, who: Headers, to: Headers, post_id: str, text: str = ""
) -> Any:
    answer = attach(client, who, to, post_id, text)
    assert answer.status_code == 201, answer.text
    return answer.json()


def card(client: TestClient, who: Headers, other: Headers) -> Any:
    """The card of the post in the latest message, as `who` reads it now with
    an app that shows posts; None for a post it may not open."""
    latest = page(client, {**who, **READS}, other, **WITH)["messages"][0]
    assert latest["attachment"]["kind"] == "post"
    return latest["attachment"]["post"]


def error(answer: Any) -> str:
    return str(answer.json()["error"]["message"])


# --- The contract ---


def test_the_examples_are_the_bodies() -> None:
    example = _load("message-post.json")
    MessagesBody.model_validate(example)
    shown, gone = (m["attachment"] for m in example["messages"])
    assert set(shown["post"]) == set(PostCardBody.model_fields)
    assert gone["post"] is None
    asked = {"text": "", "attachment": {"post_id": shown["post"]["id"]}}
    assert MessageRequestBody.model_validate(asked).attachment is not None
    # One thing in a message: never a post with a photo or a drawing.
    with pytest.raises(ValidationError):
        MessageRequestBody.model_validate(
            {
                "text": "",
                "attachment": {"post_id": str(uuid4()), "media_id": str(uuid4())},
            }
        )


# --- Sending ---


def test_a_post_is_sent_as_a_pointer(client: TestClient, database: Database) -> None:
    ada, bob = talking(client)
    cleo = signed_up(client, "cleo")
    post_id = posted(client, cleo)
    message = attached(client, ada, bob, post_id, "Shall we run this?")
    # The message keeps the id and nothing of the drawing.
    assert rows(
        database,
        "SELECT attachment, post_id, drawing, drawing_card FROM messages"
        " WHERE attachment IS NOT NULL",
    ) == [
        {
            "attachment": "post",
            "post_id": UUID(post_id),
            "drawing": None,
            "drawing_card": None,
        }
    ]
    assert message["attachment"]["post"]["id"] == post_id
    for reader, other in ((bob, ada), (ada, bob)):
        shown = card(client, reader, other)
        assert shown["id"] == post_id
        assert shown["author"]["username"] == "cleo"
        assert shown["author"]["public_id"] == pid(client, cleo)
        assert (shown["title"], shown["activity"]) == ("Sunday star", "running")
        assert shown["distance_m"] > 0
        assert 2 <= len(shown["preview"]) <= 64
    # The post itself opens as ever, by its id.
    assert client.get(f"/drawings/{post_id}", headers=bob).status_code == 200
    kinds = page(client, {**bob, **READS}, ada, **WITH)["attachments"]["kinds"]
    assert kinds == ["drawing", "post"]
    last = box(client, {**bob, **READS}, **WITH)["conversations"][0]["last"]
    assert last["text"] == "Shall we run this?"
    assert last["attachment"]["post"]["id"] == post_id


def test_ones_own_post_is_sent_too(client: TestClient) -> None:
    ada, bob = talking(client)
    post_id = posted(client, ada)
    attached(client, ada, bob, post_id)
    assert card(client, bob, ada)["author"]["username"] == "ada"


def test_who_does_not_see_a_post_cannot_send_it(
    client: TestClient, database: Database
) -> None:
    ada, bob = talking(client)
    cleo = signed_up(client, "cleo")
    post_id = posted(client, cleo, "followers")
    # Ada does not follow Cleo: as an id that is not there.
    for unseen in (post_id, str(uuid4())):
        refused = attach(client, ada, bob, unseen)
        assert refused.status_code == 404
        assert error(refused) == NO_DRAWING
    seen_by(client, cleo, "only_me")
    assert attach(client, ada, bob, post_id).status_code == 404
    # Its owner sees it, and nobody else would. Ada follows Cleo now, so
    # Cleo writes to her freely.
    follow(client, ada, cleo)
    alone = attach(client, cleo, ada, post_id)
    assert alone.status_code == 422
    assert error(alone) == POST_ONLY_YOU
    assert rows(database, "SELECT 1 FROM messages WHERE attachment IS NOT NULL") == []


def test_a_request_carries_no_post(client: TestClient) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = posted(client, ada)
    refused = attach(client, ada, bob, post_id, "Look")
    assert refused.status_code == 409
    assert error(refused) == ATTACHMENT_IN_REQUEST


# --- Reading: the permissions are the reader's, at every reading ---


def test_a_post_for_the_followers_opens_only_for_a_follower(
    client: TestClient,
) -> None:
    ada, bob = talking(client)
    cleo = signed_up(client, "cleo")
    post_id = posted(client, cleo, "followers")
    follow(client, ada, cleo)
    attached(client, ada, bob, post_id, "Look at Cleo's")
    # Bob does not follow Cleo: the message, and no card.
    assert card(client, bob, ada) is None
    assert card(client, ada, bob)["id"] == post_id
    last = box(client, {**bob, **READS}, **WITH)["conversations"][0]["last"]
    assert (last["attachment"]["kind"], last["attachment"]["post"]) == ("post", None)
    assert client.get(f"/drawings/{post_id}", headers=bob).status_code == 404
    follow(client, bob, cleo)
    assert card(client, bob, ada)["id"] == post_id
    # The follow taken back, the card goes at the next reading.
    assert client.delete(f"/users/{pid(client, cleo)}/follow", headers=bob).is_success
    assert card(client, bob, ada) is None
    # And for who sent it, once it stops following.
    assert client.delete(f"/users/{pid(client, cleo)}/follow", headers=ada).is_success
    assert card(client, ada, bob) is None


def test_a_block_either_way_closes_the_card(client: TestClient) -> None:
    ada, bob = talking(client)
    cleo = signed_up(client, "cleo")
    post_id = posted(client, cleo)
    attached(client, ada, bob, post_id)
    assert card(client, bob, ada)["id"] == post_id
    # Bob blocks Cleo: Bob reads no card, Ada still does.
    assert client.put(f"/users/{pid(client, cleo)}/block", headers=bob).is_success
    assert card(client, bob, ada) is None
    assert card(client, ada, bob)["id"] == post_id
    assert client.delete(f"/users/{pid(client, cleo)}/block", headers=bob).is_success
    assert card(client, bob, ada)["id"] == post_id
    # Cleo blocks Bob: the same.
    assert client.put(f"/users/{pid(client, bob)}/block", headers=cleo).is_success
    assert card(client, bob, ada) is None
    assert card(client, ada, bob)["id"] == post_id


def test_the_owner_changes_who_sees_it_after_it_was_sent(client: TestClient) -> None:
    ada, bob = talking(client)
    cleo = signed_up(client, "cleo")
    post_id = posted(client, cleo)
    follow(client, bob, cleo)
    attached(client, ada, bob, post_id)
    assert card(client, ada, bob)["id"] == post_id
    # For the followers: Bob follows Cleo, Ada who sent it does not.
    seen_by(client, cleo, "followers")
    assert card(client, bob, ada)["id"] == post_id
    assert card(client, ada, bob) is None
    seen_by(client, cleo, "only_me")
    assert card(client, bob, ada) is None
    assert card(client, ada, bob) is None
    seen_by(client, cleo, "everyone")
    assert card(client, bob, ada)["id"] == post_id
    assert card(client, ada, bob)["id"] == post_id


def test_a_post_hidden_is_shown_to_nobody(
    client: TestClient, database: Database
) -> None:
    ada, bob = talking(client)
    cleo = signed_up(client, "cleo")
    post_id = posted(client, cleo)
    attached(client, ada, bob, post_id)
    # Hidden from a report's email (TASK-291).
    with database.connect() as conn:
        conn.execute("UPDATE drawings SET hidden_at = now() WHERE id = %s", (post_id,))
    assert card(client, bob, ada) is None
    assert card(client, ada, bob) is None
    with database.connect() as conn:
        conn.execute("UPDATE drawings SET hidden_at = NULL WHERE id = %s", (post_id,))
        conn.execute("UPDATE users SET hidden_at = now() WHERE username = 'cleo'")
    # Its owner hidden: apart from everybody, as behind a block.
    assert card(client, bob, ada) is None
    assert card(client, ada, bob) is None


def test_a_post_deleted_leaves_the_message(
    client: TestClient, database: Database
) -> None:
    ada, bob = talking(client)
    cleo = signed_up(client, "cleo")
    post_id = posted(client, cleo)
    attached(client, ada, bob, post_id, "Look")
    assert client.delete(f"/me/activities/{KEY}", headers=cleo).is_success
    assert rows(
        database, "SELECT text, attachment, post_id FROM messages WHERE text = 'Look'"
    ) == [{"text": "Look", "attachment": "post", "post_id": None}]
    for reader, other in ((bob, ada), (ada, bob)):
        assert card(client, reader, other) is None
    latest = page(client, {**bob, **READS}, ada, **WITH)["messages"][0]
    assert latest["text"] == "Look"


# --- An app of before, and the push ---


def test_an_app_that_does_not_read_posts_reads_its_label(client: TestClient) -> None:
    ada, bob = talking(client)
    cleo = signed_up(client, "cleo")
    attached(client, ada, bob, posted(client, cleo), "Look")
    # With ?with=attachments, as the apps before TASK-455; and without.
    for query in (WITH, {}):
        read = page(client, bob, ada, **query)
        assert read["messages"][0]["text"] == "[Post] Look"
        assert read["messages"][0]["attachment"] is None
        last = box(client, bob, **query)["conversations"][0]["last"]
        assert (last["text"], last["attachment"]) == ("[Post] Look", None)
    assert page(client, bob, ada, **WITH)["attachments"]["kinds"] == ["drawing"]
    # The header is read without case, among the other kinds.
    mixed = {**bob, READS_HEADER: "hiking, Post ,gym"}
    assert page(client, mixed, ada, **WITH)["messages"][0]["attachment"]["post"]


def test_the_push_says_a_post_and_nothing_of_it(
    client: TestClient, expo: FakeExpo
) -> None:
    ada, bob = talking(client)
    cleo = signed_up(client, "cleo")
    post_id = posted(client, cleo, "followers")
    follow(client, ada, cleo)
    push_on(client, bob)
    put_token(client, bob, BOB_PHONE)
    # Bob does not follow Cleo: the push names neither her nor her drawing.
    attached(client, ada, bob, post_id)
    attached(client, ada, bob, post_id, "Her best\nso far")
    assert [m["body"] for m in expo.sent[-2:]] == [
        "ada: 🗺️ Post",
        "ada: 🗺️ Her best so far",
    ]
    assert expo.sent[-1]["data"]["kind"] == "message"
