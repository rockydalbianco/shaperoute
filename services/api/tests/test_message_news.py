"""What came after a place in a conversation, in a real PostgreSQL
(TASK-498): the first page says `latest`, and `?after=<latest>` answers the
messages after it and nothing else — the check an open conversation makes
every few seconds. The page of before answers as it did; the state is the
page's in every case; nobody reads a conversation it is not in; nothing new
costs two queries after the token's. The bodies are the examples of
packages/shared-types/fixtures."""

from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import UUID

import psycopg
import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from test_message_posts import READS, WITH, attached, posted
from test_messages import (
    FAST_HASHER,
    Headers,
    WallClock,
    _load,
    cleared,
    follow,
    page,
    pid,
    sent,
    signed_up,
)

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.follows import NO_PROFILE
from shaperoute_api.messages import (
    AFTER_OR_CURSOR,
    NOT_YOURSELF,
    NOTHING_YET,
    MessageNewsBody,
    MessagesBody,
)


@pytest.fixture
def wall() -> WallClock:
    return WallClock()


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


@pytest.fixture
def client(database: Database, wall: WallClock) -> TestClient:
    return TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            accounts=Accounts(database, now=wall, hasher=FAST_HASHER),
            run_places=PlaceNames(None),
        )
    )


def news(
    client: TestClient, who: Headers, other: Headers, after: str, **query: Any
) -> Any:
    answer = client.get(
        f"/conversations/{pid(client, other)}/messages",
        params={"after": after, **query},
        headers=who,
    )
    assert answer.status_code == 200, answer.text
    return answer.json()


def talking(client: TestClient) -> tuple[Headers, Headers]:
    """Ada and Bob, each following the other: open both ways, nothing
    written yet."""
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    follow(client, ada, bob)
    follow(client, bob, ada)
    return ada, bob


# --- The contract ---


def test_the_example_is_the_body() -> None:
    body = _load("message-news.json")
    assert set(body) == set(MessageNewsBody.model_fields)
    MessageNewsBody.model_validate(body)
    # The page's example says where the next check starts.
    first = MessagesBody.model_validate(_load("messages.json"))
    assert first.latest is not None and first.latest != NOTHING_YET


# --- The page says where the news start ---


def test_the_first_page_says_the_place_of_its_newest_message(
    client: TestClient,
) -> None:
    ada, bob = talking(client)
    # Before the first message: every message is after this place.
    assert page(client, ada, bob)["latest"] == NOTHING_YET
    for n in range(3):
        sent(client, ada, bob, f"Message {n}")
    first = page(client, bob, ada, limit=2)
    newest = first["messages"][0]
    assert first["latest"].endswith("-" + UUID(newest["id"]).hex)
    # The page of the older ones is not where a check starts.
    older = page(client, bob, ada, limit=2, cursor=first["next"])
    assert older["latest"] is None
    # What the page said before, it still says.
    assert set(first) == set(MessagesBody.model_fields)
    assert first["person"]["username"] == "ada" and first["state"] == "open"


# --- Only what came after ---


def test_nothing_new_is_an_empty_answer_at_the_same_place(
    client: TestClient,
) -> None:
    ada, bob = talking(client)
    sent(client, ada, bob, "Hi Bob!")
    latest = page(client, bob, ada)["latest"]
    assert news(client, bob, ada, latest) == {
        "state": "open",
        "messages": [],
        "more": False,
        "latest": latest,
    }
    # And in a conversation nobody wrote in yet.
    carl = signed_up(client, "carl")
    assert news(client, carl, ada, NOTHING_YET) == {
        "state": "first",
        "messages": [],
        "more": False,
        "latest": NOTHING_YET,
    }


def test_the_messages_after_the_place_come_the_latest_first(
    client: TestClient,
) -> None:
    ada, bob = talking(client)
    sent(client, ada, bob, "Hi Bob!")
    latest = page(client, bob, ada)["latest"]
    theirs = sent(client, ada, bob, "Are you coming?")
    # One's own too, written from another phone.
    mine = sent(client, bob, ada, "On my way")
    answer = news(client, bob, ada, latest)
    assert [(m["text"], m["mine"]) for m in answer["messages"]] == [
        ("On my way", True),
        ("Are you coming?", False),
    ]
    assert answer["messages"][0]["id"] == mine["id"]
    assert answer["messages"][1]["id"] == theirs["id"]
    assert answer["more"] is False
    # The place moves to the newest: asked again, nothing.
    assert answer["latest"] == page(client, bob, ada)["latest"]
    assert news(client, bob, ada, answer["latest"])["messages"] == []
    # From the start of a conversation, all of it.
    assert len(news(client, bob, ada, NOTHING_YET)["messages"]) == 3


def test_more_than_a_page_of_news_says_so(client: TestClient) -> None:
    ada, bob = talking(client)
    sent(client, ada, bob, "Hi Bob!")
    latest = page(client, bob, ada)["latest"]
    for n in range(3):
        sent(client, ada, bob, f"Message {n}")
    answer = news(client, bob, ada, latest, limit=2)
    # The newest two, and the word that one is missing between.
    assert [m["text"] for m in answer["messages"]] == ["Message 2", "Message 1"]
    assert answer["more"] is True
    assert news(client, bob, ada, latest, limit=3)["more"] is False


def test_a_message_deleted_or_hidden_or_cleared_is_no_news(
    client: TestClient, database: Database
) -> None:
    ada, bob = talking(client)
    sent(client, ada, bob, "Hi Bob!")
    latest = page(client, bob, ada)["latest"]
    gone = sent(client, ada, bob, "Wrong chat, sorry")
    bad = sent(client, ada, bob, "Something reported")
    kept = sent(client, ada, bob, "See you at seven")
    assert client.delete(f"/messages/{gone['id']}", headers=ada).status_code == 204
    with database.connect() as conn:
        conn.execute(
            "UPDATE messages SET hidden_at = now() WHERE id = %s", (UUID(bad["id"]),)
        )
    # Bob reads what its page would show; Ada still sees the one it wrote.
    assert [m["id"] for m in news(client, bob, ada, latest)["messages"]] == [kept["id"]]
    mine = news(client, ada, bob, NOTHING_YET)["messages"]
    assert [m["text"] for m in mine] == [
        "See you at seven",
        "Something reported",
        "Hi Bob!",
    ]
    # Out of one's view, the messages of before never come back as news.
    cleared(client, bob, ada)
    assert news(client, bob, ada, NOTHING_YET)["messages"] == []
    assert page(client, bob, ada)["latest"] == NOTHING_YET
    after = sent(client, ada, bob, "Still there?")
    assert [m["id"] for m in news(client, bob, ada, NOTHING_YET)["messages"]] == [
        after["id"]
    ]


def test_the_news_carry_what_the_page_carries(client: TestClient) -> None:
    ada, bob = talking(client)
    sent(client, ada, bob, "Hi Bob!")
    latest = page(client, bob, ada)["latest"]
    post_id = posted(client, ada)
    attached(client, ada, bob, post_id, "Look at this one")
    # An app that shows a post attached reads its card, as on the page.
    shown = news(client, {**bob, **READS}, ada, latest, **WITH)["messages"]
    on_page = page(client, {**bob, **READS}, ada, **WITH)["messages"][0]
    assert shown == [on_page]
    assert shown[0]["attachment"]["post"]["id"] == post_id
    # An app of before reads the label and no card.
    plain = news(client, bob, ada, latest)["messages"]
    assert plain[0]["text"] == "[Post] Look at this one"
    assert plain[0]["attachment"] is None


# --- The state is the page's ---


def test_the_state_is_the_one_of_the_page_in_every_case(
    client: TestClient,
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")

    def both(who: Headers, other: Headers) -> str:
        """The state the two answers say, which must be one."""
        state = page(client, who, other)["state"]
        assert news(client, who, other, NOTHING_YET)["state"] == state
        return str(state)

    # Nobody wrote: each may write one message, a request.
    assert both(ada, bob) == "first" and both(bob, ada) == "first"
    sent(client, ada, bob, "Hi Bob!")
    assert both(ada, bob) == "waiting" and both(bob, ada) == "request"
    # The request's message is news for who received it.
    assert len(news(client, bob, ada, NOTHING_YET)["messages"]) == 1
    accept = f"/conversations/{pid(client, ada)}/accept"
    assert client.put(accept, headers=bob).status_code == 204
    # Accepted: Ada writes freely; Bob too once Ada has him in «Messages».
    assert both(ada, bob) == "open" and both(bob, ada) == "open"
    # Open because the other follows who writes, without a conversation.
    carl = signed_up(client, "carl")
    follow(client, carl, ada)
    assert both(ada, carl) == "open" and both(carl, ada) == "first"
    # A request deleted by who received it: the writer waits no more.
    dora = signed_up(client, "dora")
    sent(client, dora, bob, "Hello!")
    cleared(client, bob, dora)
    assert both(dora, bob) == "first"
    both(bob, dora)


# --- Who may ask ---


def test_nobody_reads_a_conversation_it_is_not_in(client: TestClient) -> None:
    ada, bob = talking(client)
    sent(client, ada, bob, "Only for Bob")
    latest = page(client, bob, ada)["latest"]
    eve = signed_up(client, "eve")
    # Eve asks with the place of their conversation, and from the start:
    # what she gets is her own conversation with each, which is empty.
    for other in (ada, bob):
        for after in (NOTHING_YET, latest):
            assert news(client, eve, other, after)["messages"] == []


def test_nobody_a_block_oneself_and_no_token(client: TestClient) -> None:
    ada, bob = talking(client)
    sent(client, ada, bob, "Hi Bob!")
    latest = page(client, bob, ada)["latest"]
    path = f"/conversations/{pid(client, ada)}/messages"
    asked = {"after": latest}

    def error(answer: Any) -> tuple[int, str, str]:
        body = answer.json()["error"]
        return answer.status_code, body["code"], body["message"]

    assert client.get(path, params=asked).status_code == 401
    own = client.get(
        f"/conversations/{pid(client, bob)}/messages", params=asked, headers=bob
    )
    assert error(own) == (422, "invalid_request", NOT_YOURSELF)
    for nobody in ("7b1d3f0e-0000-4000-8000-000000000000", "not-an-id"):
        answer = client.get(
            f"/conversations/{nobody}/messages", params=asked, headers=bob
        )
        assert error(answer) == (404, "http_error", NO_PROFILE)
    # A place written wrong, and a place with the cursor of the older ones.
    for wrong in ("", "now", "12", f"{latest}-1", latest.upper() + "G"):
        assert (
            client.get(path, params={"after": wrong}, headers=bob).status_code == 422
        ), wrong
    two = client.get(path, params={"after": latest, "cursor": latest}, headers=bob)
    assert error(two) == (422, "invalid_request", AFTER_OR_CURSOR)
    # A block keeps the two apart: the check says the conversation is gone.
    assert client.put(f"/users/{pid(client, ada)}/block", headers=bob).is_success
    for who, other in ((bob, ada), (ada, bob)):
        gone = client.get(
            f"/conversations/{pid(client, other)}/messages",
            params=asked,
            headers=who,
        )
        assert error(gone) == (404, "http_error", NO_PROFILE)


# --- What a check costs ---


def test_nothing_new_costs_two_queries_after_the_tokens(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    ada, bob = talking(client)
    sent(client, ada, bob, "Hi Bob!")
    sent(client, bob, ada, "Hi Ada!")
    latest = page(client, bob, ada)["latest"]
    path = f"/conversations/{pid(client, ada)}/messages"
    asked: list[str] = []
    real = psycopg.Connection.execute

    def spy(self: Any, query: Any, *args: Any, **kwargs: Any) -> Any:
        asked.append(str(query))
        return real(self, query, *args, **kwargs)

    monkeypatch.setattr(psycopg.Connection, "execute", spy)
    answer = client.get(path, params={"after": latest}, headers=bob)
    monkeypatch.setattr(psycopg.Connection, "execute", real)
    assert answer.status_code == 200 and answer.json()["messages"] == []
    # The token; who the other is and where the two stand; the messages.
    assert len(asked) == 3, asked
    assert "FROM sessions" in asked[0]
    # And never the other's picture.
    assert not any("profile_photos" in query for query in asked)
    assert len(answer.content) < 200
