"""Replies to a comment and reactions to a comment, in a real PostgreSQL
(TASK-454 part C1, ADR-0377): a reply stands under its comment, one level
deep; the threads are asked for, and an app from before reads the list it
knew; a reply is checked, filtered, blocked, reported and hidden as every
comment; five reactions, one each, on comments and replies; a reply is told
to who it answers, a reaction to a comment is read in the bell only."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from test_push import FAST_HASHER, KEY, FakeExpo, push_on, put_token, signed_up

from shaperoute_api import game as game_module
from shaperoute_api.accounts import Accounts
from shaperoute_api.app import create_app
from shaperoute_api.comments import (
    COMMENT_EMPTY,
    COMMENT_REACTION_KINDS,
    NO_COMMENT,
    REPLIES_SHOWN,
    CommentBody,
    CommentReactionsBody,
    CommentRequestBody,
    CommentsBody,
)
from shaperoute_api.db import Database, migrations
from shaperoute_api.expo_push import Expo
from shaperoute_api.notification_list import BELL_KINDS, NotificationList
from shaperoute_api.push import BELL_ONLY, TEXTS, Pusher
from shaperoute_api.reactions import REACTION_KINDS

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
# What a comment was before the replies: what an app from before reads.
BEFORE = {"id", "author", "text", "created_at", "deletable"}
ADA_PHONE = "ExponentPushToken[phone-of-ada]"
BOB_PHONE = "ExponentPushToken[phone-of-bob]"
CLEO_PHONE = "ExponentPushToken[phone-of-cleo]"
# The migration of the replies, whatever its number when merged.
(MIGRATION,) = [p for p in migrations() if p.name.endswith("_comment_replies.sql")]


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class TickingClock:
    """A second later at each look: what is written later is later."""

    def __init__(self) -> None:
        self.t = datetime(2026, 11, 11, 9, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        self.t += timedelta(seconds=1)
        return self.t


@pytest.fixture(autouse=True)
def no_game_shapes(monkeypatch: pytest.MonkeyPatch) -> None:
    """A saved run here unlocks no shape of the game: its push and its line
    in the bell are not these tests'."""
    monkeypatch.setattr(game_module, "CATALOG", ())


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
    accounts = Accounts(database, now=TickingClock(), hasher=FAST_HASHER)
    app = create_app(FileSource(Path("unused.graphml")), accounts=accounts)
    pusher = Pusher(
        database, Expo(send=expo), run=lambda task: task(), later=lambda *_: None
    )
    # The bell listens as in create_app (install_notification_list).
    pusher.listeners.append(NotificationList(database, accounts.now).record)
    app.state.pusher = pusher
    return TestClient(app)


def public_id(app: TestClient, headers: Headers) -> str:
    return str(app.get("/me", headers=headers).json()["public_id"])


def drawing_of(app: TestClient, headers: Headers) -> str:
    """The example run of `headers`, published for everyone: its id."""
    app.put(
        f"/me/activities/{KEY}", json=_load("activity-request.json"), headers=headers
    )
    answer = app.put(
        f"/me/activities/{KEY}/drawing",
        json={"title": "Sunday heart", "visibility": "everyone"},
        headers=headers,
    )
    assert answer.status_code == 200, answer.text
    return str(answer.json()["id"])


def write(
    app: TestClient,
    headers: Headers,
    drawing_id: str,
    text: str,
    reply_to: str | None = None,
) -> Any:
    body = {"text": text} if reply_to is None else {"text": text, "reply_to": reply_to}
    return app.post(f"/drawings/{drawing_id}/comments", json=body, headers=headers)


def written(
    app: TestClient,
    headers: Headers,
    drawing_id: str,
    text: str,
    reply_to: str | None = None,
) -> dict[str, Any]:
    answer = write(app, headers, drawing_id, text, reply_to)
    assert answer.status_code == 201, answer.text
    return dict(answer.json())


def listed(
    app: TestClient, headers: Headers, drawing_id: str, query: str = ""
) -> dict[str, Any]:
    answer = app.get(f"/drawings/{drawing_id}/comments{query}", headers=headers)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def threads(app: TestClient, headers: Headers, drawing_id: str) -> dict[str, Any]:
    return listed(app, headers, drawing_id, "?threads=true")


def replies(
    app: TestClient, headers: Headers, comment_id: str, query: str = ""
) -> dict[str, Any]:
    answer = app.get(f"/comments/{comment_id}/replies{query}", headers=headers)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def react(app: TestClient, headers: Headers, comment_id: str, kind: str) -> Any:
    return app.put(
        f"/comments/{comment_id}/reaction", json={"kind": kind}, headers=headers
    )


def reacted(
    app: TestClient, headers: Headers, comment_id: str, kind: str
) -> dict[str, Any]:
    answer = react(app, headers, comment_id, kind)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def counts(**some: int) -> dict[str, int]:
    return {**dict.fromkeys(COMMENT_REACTION_KINDS, 0), **some}


def words(page: dict[str, Any]) -> list[str]:
    return [comment["text"] for comment in page["comments"]]


def block(app: TestClient, who: Headers, whom: Headers) -> None:
    answer = app.put(f"/users/{public_id(app, whom)}/block", headers=who)
    assert answer.status_code == 204, answer.text


def message(answer: Any) -> str:
    return str(answer.json()["error"]["message"])


def rows(database: Database, table: str) -> int:
    with database.connect() as conn:
        row = conn.execute(f"SELECT count(*) AS n FROM {table}").fetchone()
    assert row is not None
    return int(row["n"])


def told(expo: FakeExpo) -> list[tuple[str, str]]:
    return [(m["to"], m["body"]) for m in expo.sent]


def bell(app: TestClient, headers: Headers) -> list[dict[str, Any]]:
    answer = app.get("/notifications", headers=headers)
    assert answer.status_code == 200, answer.text
    return list(answer.json()["notifications"])


def three(app: TestClient, push: bool = True) -> tuple[Headers, Headers, Headers]:
    """Ada, Bob and Cleo, each with a phone, «Push notifications» on or off."""
    ada, bob, cleo = (signed_up(app, name) for name in ("ada", "bob", "cleo"))
    for headers, phone in ((ada, ADA_PHONE), (bob, BOB_PHONE), (cleo, CLEO_PHONE)):
        put_token(app, headers, phone)
        if push:
            push_on(app, headers)
    return ada, bob, cleo


# --- The contract ---


def test_the_examples_of_shared_types_are_the_contract() -> None:
    request = CommentRequestBody.model_validate(_load("comment-reply-request.json"))
    assert request.reply_to is not None
    reply = CommentBody.model_validate(_load("comment-reply.json"))
    assert reply.parent_id is not None and reply.mention is not None
    page = CommentsBody.model_validate(_load("comment-threads.json"))
    (top,) = page.comments
    assert top.replies is not None and top.reply_count > len(top.replies)
    assert all(below.parent_id == top.id for below in top.replies)
    summary = CommentReactionsBody.model_validate(_load("comment-reactions.json"))
    assert set(summary.counts) == set(COMMENT_REACTION_KINDS)
    assert summary.total == sum(summary.counts.values())
    assert _load("comment-reaction-request.json")["kind"] in COMMENT_REACTION_KINDS


def test_the_comments_reactions_are_the_drawings_without_the_heart() -> None:
    assert COMMENT_REACTION_KINDS == tuple(
        kind for kind in REACTION_KINDS if kind != "super_like"
    )


def test_the_two_new_events_have_their_words_and_one_rings_no_phone() -> None:
    assert {"comment_reply", "comment_reaction"} <= BELL_KINDS
    assert BELL_ONLY == {"comment_reaction"}
    for kind in ("comment_reply", "comment_reaction"):
        assert set(TEXTS[kind]) == {"en", "de", "it", "es", "fr"}
    # The user's words (2026-11-11).
    assert TEXTS["comment_reply"]["en"] == "{name} replied to your comment: {text}"
    assert TEXTS["comment_reaction"]["en"] == "{name} reacted to your comment."


# --- Replies ---


def test_a_reply_stands_under_its_comment_one_level_deep(client: TestClient) -> None:
    ada, bob, cleo = three(client)
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    assert first["parent_id"] is None and first["mention"] is None
    assert first["reply_count"] == 0 and first["replies"] is None
    thanks = written(client, ada, drawing, "Thank you", reply_to=first["id"])
    assert thanks["parent_id"] == first["id"]
    # An answer to the comment itself names nobody.
    assert thanks["mention"] is None
    # An answer to a reply goes under the same comment, naming who it answers.
    how = written(client, cleo, drawing, "How long was it?", reply_to=thanks["id"])
    assert how["parent_id"] == first["id"]
    assert how["mention"] == {
        "public_id": public_id(client, ada),
        "username": "ada",
    }
    # One's own name is never before one's own words.
    more = written(client, cleo, drawing, "And where?", reply_to=how["id"])
    assert more["parent_id"] == first["id"] and more["mention"] is None
    second = written(client, cleo, drawing, "Next time I come too")

    page = threads(client, ada, drawing)
    assert words(page) == ["What a heart!", "Next time I come too"]
    # Every comment and every reply: what the button of the comments counts.
    assert page["total"] == 5
    top, other = page["comments"]
    assert top["reply_count"] == 3
    # The oldest two come with it.
    assert REPLIES_SHOWN == 2
    assert [below["text"] for below in top["replies"]] == [
        "Thank you",
        "How long was it?",
    ]
    assert top["replies"][1]["mention"]["username"] == "ada"
    assert all(below["replies"] is None for below in top["replies"])
    assert other["id"] == second["id"]
    assert other["reply_count"] == 0 and other["replies"] == []
    # The drawing's owner deletes any of them, who wrote one its own.
    assert [below["deletable"] for below in top["replies"]] == [True, True]
    seen_by_bob = threads(client, bob, drawing)["comments"][0]["replies"]
    assert [below["deletable"] for below in seen_by_bob] == [False, False]


def test_the_replies_of_a_comment_are_read_a_page_at_a_time(
    client: TestClient,
) -> None:
    ada, bob, cleo = three(client)
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    for text in ("one", "two", "three"):
        written(client, cleo, drawing, text, reply_to=first["id"])
    page = replies(client, ada, first["id"], "?limit=2")
    assert words(page) == ["one", "two"]
    assert page["total"] == 3 and page["next"] is not None
    last = replies(client, ada, first["id"], f"?limit=2&cursor={page['next']}")
    assert words(last) == ["three"]
    assert last["next"] is None and last["total"] == 3
    # A reply has none of its own, and an id that is not there neither.
    below = page["comments"][0]["id"]
    for missing in (below, str(uuid4()), "not-an-id"):
        answer = client.get(f"/comments/{missing}/replies", headers=ada)
        assert answer.status_code == 404
        assert message(answer) == NO_COMMENT


def test_an_app_from_before_reads_the_list_it_knew(client: TestClient) -> None:
    """The app of before the replies: it asks without `threads`, writes
    without `reply_to`, and reads the five fields it knows."""
    ada, bob, cleo = three(client)
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    written(client, cleo, drawing, "Next time I come too")
    written(client, ada, drawing, "Thank you", reply_to=first["id"])
    # Written as before: a comment of the drawing, with what it had.
    plain = write(client, bob, drawing, "See you on Sunday")
    assert plain.status_code == 201
    assert BEFORE <= set(plain.json())
    assert plain.json()["parent_id"] is None
    # Read as before: every comment and reply by time, none inside another.
    page = listed(client, bob, drawing)
    assert words(page) == [
        "What a heart!",
        "Next time I come too",
        "Thank you",
        "See you on Sunday",
    ]
    assert page["total"] == 4 and page["next"] is None
    for comment in page["comments"]:
        assert BEFORE <= set(comment)
        assert isinstance(comment["id"], str)
        assert set(comment["author"]) == {"public_id", "username"}
        assert isinstance(comment["text"], str)
        assert isinstance(comment["created_at"], str)
        assert isinstance(comment["deletable"], bool)
        assert comment["replies"] is None
    # The examples from before the replies are still comments.
    CommentBody.model_validate({k: _load("comment.json")[k] for k in BEFORE})
    # A page at a time as before, the replies in their place by time.
    half = listed(client, bob, drawing, "?limit=2")
    rest = listed(client, bob, drawing, f"?limit=2&cursor={half['next']}")
    assert words(half) + words(rest) == words(page)


def test_a_reply_answers_a_comment_of_the_drawing_one_reads(
    client: TestClient, database: Database
) -> None:
    ada, bob, cleo = three(client)
    drawing = drawing_of(client, ada)
    elsewhere = drawing_of(client, bob)
    there = written(client, ada, elsewhere, "Nice one")
    first = written(client, bob, drawing, "What a heart!")
    block(client, cleo, bob)
    kept = rows(database, "comments")
    for missing in (str(uuid4()), there["id"]):
        answer = write(client, ada, drawing, "Thank you", reply_to=missing)
        assert answer.status_code == 404, answer.text
        assert message(answer) == NO_COMMENT
    # Across a block the comment is not there to be answered.
    answer = write(client, cleo, drawing, "Hello", reply_to=first["id"])
    assert answer.status_code == 404 and message(answer) == NO_COMMENT
    assert write(client, ada, drawing, "x", reply_to="not-an-id").status_code == 422
    assert rows(database, "comments") == kept


def test_a_reply_is_checked_and_filtered_as_a_comment(
    client: TestClient, database: Database
) -> None:
    ada, bob, _ = three(client)
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    empty = write(client, ada, drawing, "   ", reply_to=first["id"])
    assert empty.status_code == 422 and message(empty) == COMMENT_EMPTY
    negative = write(client, ada, drawing, "What an ugly route", reply_to=first["id"])
    assert negative.status_code == 422
    assert negative.json()["error"]["code"] == "comment_rejected"
    assert rows(database, "comments") == 1


def test_deleting_a_comment_deletes_its_replies_and_their_reactions(
    client: TestClient, database: Database
) -> None:
    ada, bob, cleo = three(client)
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    thanks = written(client, ada, drawing, "Thank you", reply_to=first["id"])
    written(client, cleo, drawing, "Me too", reply_to=thanks["id"])
    stays = written(client, cleo, drawing, "Next time I come too")
    reacted(client, cleo, first["id"], "fire")
    reacted(client, bob, thanks["id"], "clap")
    reacted(client, ada, stays["id"], "wow")
    # A reply deleted leaves the others.
    assert client.delete(f"/comments/{thanks['id']}", headers=ada).status_code == 204
    assert rows(database, "comments") == 3
    assert rows(database, "comment_reactions") == 2
    assert threads(client, ada, drawing)["comments"][0]["reply_count"] == 1
    # The comment deleted takes what stands under it.
    assert client.delete(f"/comments/{first['id']}", headers=bob).status_code == 204
    assert words(listed(client, ada, drawing)) == ["Next time I come too"]
    assert rows(database, "comments") == 1
    assert rows(database, "comment_reactions") == 1


def test_a_block_hides_a_thread_a_reply_and_a_name(client: TestClient) -> None:
    ada, bob, cleo = three(client)
    dan = signed_up(client, "dan")
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    thanks = written(client, cleo, drawing, "So true", reply_to=first["id"])
    written(client, ada, drawing, "Thank you both", reply_to=thanks["id"])
    written(client, cleo, drawing, "Next time I come too")
    # Dan and Cleo apart: her reply is gone for him, with her name before
    # Ada's answer, and it is not counted.
    block(client, dan, cleo)
    (top,) = threads(client, dan, drawing)["comments"]
    assert top["reply_count"] == 1
    assert [(r["text"], r["mention"]) for r in top["replies"]] == [
        ("Thank you both", None)
    ]
    assert words(replies(client, dan, first["id"])) == ["Thank you both"]
    assert threads(client, dan, drawing)["total"] == 2
    assert words(listed(client, dan, drawing)) == ["What a heart!", "Thank you both"]
    # Dan and Bob apart too: the comment goes with all that stands under it.
    block(client, bob, dan)
    assert threads(client, dan, drawing) == {"comments": [], "next": None, "total": 0}
    assert listed(client, dan, drawing)["comments"] == []
    assert (
        client.get(f"/comments/{first['id']}/replies", headers=dan).status_code == 404
    )
    # The others read it all.
    assert threads(client, ada, drawing)["total"] == 4


def test_a_reply_is_reported_and_hidden_as_a_comment(
    client: TestClient, database: Database
) -> None:
    ada, bob, cleo = three(client)
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    reply = written(client, cleo, drawing, "So true", reply_to=first["id"])
    report = client.post(
        "/reports",
        json={"kind": "comment", "id": reply["id"], "reason": "spam"},
        headers=ada,
    )
    assert report.is_success, report.text
    # Hidden from the report's email: only who wrote it still reads it.
    with database.connect() as conn:
        conn.execute(
            "UPDATE comments SET hidden_at = now() WHERE id = %s", (reply["id"],)
        )
    (top,) = threads(client, ada, drawing)["comments"]
    assert top["reply_count"] == 0 and top["replies"] == []
    assert words(listed(client, ada, drawing)) == ["What a heart!"]
    (hers,) = threads(client, cleo, drawing)["comments"]
    assert [below["text"] for below in hers["replies"]] == ["So true"]
    # A comment hidden hides its replies from everyone but its writer.
    with database.connect() as conn:
        conn.execute(
            "UPDATE comments SET hidden_at = now() WHERE id = %s", (first["id"],)
        )
    assert threads(client, ada, drawing)["comments"] == []
    assert listed(client, cleo, drawing)["comments"] == []
    assert words(listed(client, bob, drawing)) == ["What a heart!"]


# --- Reactions to a comment ---


def test_five_reactions_one_each_on_a_comment_and_on_a_reply(
    client: TestClient, database: Database
) -> None:
    ada, bob, cleo = three(client)
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    reply = written(client, ada, drawing, "Thank you", reply_to=first["id"])
    assert first["reactions"] == {"counts": counts(), "total": 0, "mine": None}
    assert reacted(client, ada, first["id"], "fire") == {
        "counts": counts(fire=1),
        "total": 1,
        "mine": "fire",
    }
    # The same again changes nothing; another kind takes its place.
    assert reacted(client, ada, first["id"], "fire")["total"] == 1
    assert reacted(client, ada, first["id"], "clap")["counts"] == counts(clap=1)
    assert reacted(client, cleo, first["id"], "clap") == {
        "counts": counts(clap=2),
        "total": 2,
        "mine": "clap",
    }
    assert reacted(client, bob, reply["id"], "wow")["mine"] == "wow"
    assert rows(database, "comment_reactions") == 3
    # Read with the comments, by each as its own.
    (top,) = threads(client, bob, drawing)["comments"]
    assert top["reactions"] == {"counts": counts(clap=2), "total": 2, "mine": None}
    assert top["replies"][0]["reactions"]["mine"] == "wow"
    flat = listed(client, cleo, drawing)["comments"]
    assert [comment["reactions"]["mine"] for comment in flat] == ["clap", None]
    assert replies(client, ada, first["id"])["comments"][0]["reactions"] == {
        "counts": counts(wow=1),
        "total": 1,
        "mine": None,
    }
    # Taken back, also twice.
    for _ in range(2):
        answer = client.delete(f"/comments/{first['id']}/reaction", headers=ada)
        assert answer.status_code == 200
        assert answer.json() == {"counts": counts(clap=1), "total": 1, "mine": None}


def test_a_comment_takes_no_heart_and_only_who_reads_it_reacts(
    client: TestClient, database: Database
) -> None:
    ada, bob, cleo = three(client)
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    # The MuW heart is a drawing's only.
    for refused in ({"kind": "super_like"}, {"kind": "like"}, {}):
        answer = client.put(
            f"/comments/{first['id']}/reaction", json=refused, headers=ada
        )
        assert answer.status_code == 422
    with_words = {"kind": "fire", "comment": "Two words"}
    assert (
        client.put(
            f"/comments/{first['id']}/reaction", json=with_words, headers=ada
        ).status_code
        == 422
    )
    for missing in (str(uuid4()), "not-an-id"):
        assert react(client, ada, missing, "fire").status_code == 404
        gone = client.delete(f"/comments/{missing}/reaction", headers=ada)
        assert gone.status_code == 404 and message(gone) == NO_COMMENT
    assert (
        client.put(
            f"/comments/{first['id']}/reaction", json={"kind": "fire"}
        ).status_code
        == 401
    )
    # Across a block: no reaction left, and those left before not counted.
    reacted(client, cleo, first["id"], "fire")
    reacted(client, ada, first["id"], "fire")
    block(client, ada, cleo)
    assert listed(client, ada, drawing)["comments"][0]["reactions"]["total"] == 1
    block(client, bob, cleo)
    assert react(client, cleo, first["id"], "clap").status_code == 404
    assert rows(database, "comment_reactions") == 2


# --- Who is told ---


def test_a_reply_is_told_to_who_it_answers(client: TestClient, expo: FakeExpo) -> None:
    ada, bob, cleo = three(client)
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    assert told(expo) == [(ADA_PHONE, "bob commented on your post: What a heart!")]
    expo.sent.clear()
    # The owner answers: Bob is told, and nobody of a comment (it is hers).
    thanks = written(client, ada, drawing, "Thank you", reply_to=first["id"])
    assert told(expo) == [(BOB_PHONE, "ada replied to your comment: Thank you")]
    assert expo.sent[0]["data"] == {"kind": "comment_reply", "drawing_id": drawing}
    expo.sent.clear()
    # Cleo answers Bob: Bob of the reply, the owner of a comment as always.
    written(client, cleo, drawing, "So true", reply_to=first["id"])
    assert sorted(told(expo)) == [
        (ADA_PHONE, "cleo commented on your post: So true"),
        (BOB_PHONE, "cleo replied to your comment: So true"),
    ]
    expo.sent.clear()
    # Cleo answers the owner's reply: the owner is told once, as a reply.
    written(client, cleo, drawing, "You too", reply_to=thanks["id"])
    assert told(expo) == [(ADA_PHONE, "cleo replied to your comment: You too")]
    expo.sent.clear()
    # One's own comment answered by oneself tells nobody but the owner.
    written(client, bob, drawing, "I mean it", reply_to=first["id"])
    assert told(expo) == [(ADA_PHONE, "bob commented on your post: I mean it")]
    # In the bell with its words as they read now, gone with the reply.
    lines = bell(client, bob)
    assert [line["text"] for line in lines] == [
        "cleo replied to your comment: So true",
        "ada replied to your comment: Thank you",
    ]
    assert lines[0]["opens"] == {"kind": "comment_reply", "drawing_id": drawing}
    assert client.delete(f"/comments/{thanks['id']}", headers=ada).status_code == 204
    assert [line["text"] for line in bell(client, bob)] == [
        "cleo replied to your comment: So true"
    ]


def test_a_reply_respects_the_switch_and_the_blocks(
    client: TestClient, expo: FakeExpo
) -> None:
    ada, bob, cleo = three(client, push=False)
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    # «Push notifications» off: no phone rings, the bell keeps it.
    written(client, ada, drawing, "Thank you", reply_to=first["id"])
    assert expo.sent == []
    assert [line["kind"] for line in bell(client, bob)] == ["comment_reply"]
    # Across a block nothing is told and nothing is read.
    push_on(client, bob)
    reply = written(client, cleo, drawing, "So true", reply_to=first["id"])
    assert told(expo) == [(BOB_PHONE, "cleo replied to your comment: So true")]
    block(client, bob, cleo)
    assert [line["actor"]["username"] for line in bell(client, bob)] == ["ada"]
    assert reply["parent_id"] == first["id"]


def test_a_reaction_to_a_comment_is_read_in_the_bell_only(
    client: TestClient, expo: FakeExpo
) -> None:
    ada, bob, cleo = three(client)
    drawing = drawing_of(client, ada)
    first = written(client, bob, drawing, "What a heart!")
    expo.sent.clear()
    reacted(client, ada, first["id"], "fire")
    reacted(client, cleo, first["id"], "clap")
    # One's own reaction to one's own comment is no news.
    reacted(client, bob, first["id"], "wow")
    # No phone rings, whatever the switch says.
    assert expo.sent == []
    lines = bell(client, bob)
    assert [line["text"] for line in lines] == [
        "cleo reacted to your comment.",
        "ada reacted to your comment.",
    ]
    assert lines[0]["kind"] == "comment_reaction"
    assert lines[0]["opens"] == {"kind": "comment_reaction", "drawing_id": drawing}
    # Another kind is the same news; taken back, the line goes.
    reacted(client, ada, first["id"], "strong")
    assert len(bell(client, bob)) == 2
    assert client.delete(f"/comments/{first['id']}/reaction", headers=ada).is_success
    assert [line["actor"]["username"] for line in bell(client, bob)] == ["cleo"]
    assert expo.sent == []


# --- The migration ---


def test_the_migration_ties_replies_and_reactions_to_their_comment() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "parent_id uuid REFERENCES comments (id) ON DELETE CASCADE" in sql
    assert "REFERENCES users (id) ON DELETE SET NULL" in sql
    assert "CREATE TABLE comment_reactions" in sql
    assert "PRIMARY KEY (comment_id, user_id)" in sql
    for kind in COMMENT_REACTION_KINDS:
        assert f"'{kind}'" in sql
    assert "super_like" not in sql
