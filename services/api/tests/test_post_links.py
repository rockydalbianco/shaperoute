"""The link of a post in a real PostgreSQL (TASK-455 part C, ADR-0382): a
drawing for everyone opened without an account and without the API key,
with what the link shows and no more; one 404 for every drawing without a
link (for its followers, private, hidden, of a hidden owner, with the links
off, deleted, not there); «Links to my posts», on from the start, which
turns every link of an account off, its owner's own too; `linkable` in what
the members are told of a drawing; the limit of requests. The bodies are the
examples of packages/shared-types/fixtures."""

from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from test_drawings import KEY, run
from test_messages import (
    FAST_HASHER,
    Headers,
    WallClock,
    _load,
    follow,
    pid,
    signed_up,
)

from shaperoute_api.access import OPEN_PATHS, RateLimiter
from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.drawings import NO_DRAWING
from shaperoute_api.live_shares import SITE_ORIGIN
from shaperoute_api.post_links import (
    POST_PATH,
    TOO_MANY_VIEWS,
    PostLinkBody,
    PostLinksBody,
)

API_KEY = "the-key-of-the-app"


@pytest.fixture
def wall() -> WallClock:
    return WallClock()


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


def app_of(database: Database, wall: WallClock) -> TestClient:
    return TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            accounts=Accounts(database, now=wall, hasher=FAST_HASHER),
            run_places=PlaceNames(None),
        )
    )


@pytest.fixture
def client(
    database: Database, wall: WallClock, monkeypatch: pytest.MonkeyPatch
) -> TestClient:
    monkeypatch.delenv("SHAPEROUTE_API_KEY", raising=False)
    return app_of(database, wall)


def posted(client: TestClient, who: Headers, visibility: str = "everyone") -> str:
    """A run of `who` saved and published for `visibility`: its drawing's id."""
    saved = client.put(f"/me/activities/{KEY}", json=run(), headers=who)
    assert saved.status_code == 201, saved.text
    return seen_by(client, who, visibility)


def seen_by(client: TestClient, who: Headers, visibility: str) -> str:
    answer = client.put(
        f"/me/activities/{KEY}/drawing",
        json={
            "title": "Sunday star",
            "visibility": visibility,
            "description": "Past my door, twice.",
        },
        headers=who,
    )
    assert answer.status_code == 200, answer.text
    return str(answer.json()["id"])


def link(client: TestClient, drawing_id: str) -> Any:
    """The page of the link asks: no account, no key."""
    return client.get(POST_PATH, params={"id": drawing_id})


def turn(client: TestClient, who: Headers, on: bool) -> Any:
    answer = client.put("/me/post-links", json={"post_links": on}, headers=who)
    assert answer.status_code == 200, answer.text
    return answer.json()


def linkable(client: TestClient, viewer: Headers, drawing_id: str) -> bool:
    answer = client.get(f"/drawings/{drawing_id}", headers=viewer)
    assert answer.status_code == 200, answer.text
    return bool(answer.json()["linkable"])


# --- The contract ---


def test_the_examples_are_the_bodies() -> None:
    example = _load("post-link.json")
    assert set(example) == set(PostLinkBody.model_fields)
    PostLinkBody.model_validate(example)
    assert PostLinksBody.model_validate({"post_links": False}).post_links is False
    assert POST_PATH in OPEN_PATHS


# --- What a link shows ---


def test_a_post_for_everyone_opens_by_its_link_and_shows_no_more(
    client: TestClient,
) -> None:
    cleo, bob = signed_up(client, "cleo"), signed_up(client, "bob")
    drawing_id = posted(client, cleo)
    answer = link(client, drawing_id)
    assert answer.status_code == 200, answer.text
    shown = answer.json()
    # Its line, its title, who drew it, its metres and its sport: no place,
    # no time, no description, no photos, no tags, nothing of the account.
    assert set(shown) == set(PostLinkBody.model_fields)
    assert (shown["id"], shown["username"]) == (drawing_id, "cleo")
    assert (shown["title"], shown["activity"]) == ("Sunday star", "running")
    assert "Past my door" not in answer.text
    assert pid(client, cleo) not in answer.text
    # The line is the one a member sees already, not a longer one.
    seen = client.get(f"/drawings/{drawing_id}", headers=bob).json()
    assert shown["track"] == seen["track"]
    assert shown["distance_m"] == seen["distance_m"]
    # Only the site reads it, nobody keeps it, no search engine lists it.
    assert answer.headers["Access-Control-Allow-Origin"] == SITE_ORIGIN
    assert answer.headers["Cache-Control"] == "no-store"
    assert "noindex" in answer.headers["X-Robots-Tag"]


def test_the_link_needs_no_key_and_nothing_else_opens_without_one(
    database: Database, wall: WallClock, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("SHAPEROUTE_API_KEY", API_KEY)
    keyed = app_of(database, wall)
    app_key = {"X-API-Key": API_KEY}
    made = keyed.post(
        "/accounts",
        json={**_load("sign-up-request.json"), "email": "cleo@example.com"},
        headers=app_key,
    )
    assert made.status_code == 201, made.text
    cleo = {"Authorization": f"Bearer {made.json()['token']}", **app_key}
    drawing_id = posted(keyed, cleo)
    # The page of the site has no key.
    assert link(keyed, drawing_id).status_code == 200
    # The drawing itself, its owner's switch and the feed still want it.
    for path in (f"/drawings/{drawing_id}", "/me/post-links", "/feed"):
        assert keyed.get(path).status_code == 401, path


# --- One answer for every drawing without a link ---


def test_every_drawing_without_a_link_answers_as_one_that_is_not_there(
    client: TestClient, database: Database
) -> None:
    cleo, bob = signed_up(client, "cleo"), signed_up(client, "bob")
    follow(client, bob, cleo)
    drawing_id = posted(client, cleo)
    nothing = link(client, str(uuid4()))
    assert nothing.status_code == 404
    assert nothing.json()["error"]["message"] == NO_DRAWING

    def gone() -> None:
        answer = link(client, drawing_id)
        # The same status, the same words, the same headers: a link tells
        # nothing of what it does not open.
        assert answer.status_code == 404
        assert answer.json() == nothing.json()
        assert answer.headers["Access-Control-Allow-Origin"] == SITE_ORIGIN
        assert "Sunday star" not in answer.text

    def back() -> None:
        assert link(client, drawing_id).status_code == 200

    back()
    # Not an id at all.
    assert link(client, "not-an-id").json() == nothing.json()
    # For its followers: Bob, who follows Cleo, opens it in the app, and
    # still nobody opens it by a link.
    seen_by(client, cleo, "followers")
    gone()
    assert client.get(f"/drawings/{drawing_id}", headers=bob).status_code == 200
    seen_by(client, cleo, "only_me")
    gone()
    seen_by(client, cleo, "everyone")
    back()
    # Hidden from a report's email (TASK-291).
    with database.connect() as conn:
        conn.execute(
            "UPDATE drawings SET hidden_at = now() WHERE id = %s", (drawing_id,)
        )
    gone()
    with database.connect() as conn:
        conn.execute(
            "UPDATE drawings SET hidden_at = NULL WHERE id = %s", (drawing_id,)
        )
        conn.execute("UPDATE users SET hidden_at = now() WHERE username = 'cleo'")
    # Its owner hidden.
    gone()
    with database.connect() as conn:
        conn.execute("UPDATE users SET hidden_at = NULL WHERE username = 'cleo'")
    back()
    # «Links to my posts» off.
    turn(client, cleo, False)
    gone()
    turn(client, cleo, True)
    back()
    # Deleted with its run.
    assert client.delete(f"/me/activities/{KEY}", headers=cleo).is_success
    gone()


# --- «Links to my posts» ---


def test_the_links_are_on_from_the_start_and_their_owner_turns_them_off(
    client: TestClient,
) -> None:
    cleo, bob = signed_up(client, "cleo"), signed_up(client, "bob")
    drawing_id = posted(client, cleo)
    assert client.get("/me/post-links", headers=cleo).json() == {"post_links": True}
    # The members are told the drawing has a link: its owner too.
    assert linkable(client, bob, drawing_id) and linkable(client, cleo, drawing_id)
    assert turn(client, cleo, False) == {"post_links": False}
    assert client.get("/me/post-links", headers=cleo).json() == {"post_links": False}
    # Off for everybody at once: no «Share link» for Bob, none for Cleo.
    assert not linkable(client, bob, drawing_id)
    assert not linkable(client, cleo, drawing_id)
    assert link(client, drawing_id).status_code == 404
    # Bob's own switch is his own.
    assert client.get("/me/post-links", headers=bob).json() == {"post_links": True}
    assert turn(client, cleo, True) == {"post_links": True}
    assert linkable(client, bob, drawing_id)


def test_the_switch_is_its_owner_s_and_takes_one_thing(client: TestClient) -> None:
    cleo = signed_up(client, "cleo")
    assert client.get("/me/post-links").status_code == 401
    assert client.put("/me/post-links", json={"post_links": False}).status_code == 401
    for wrong in ({}, {"post_links": "maybe"}, {"post_links": True, "more": 1}):
        refused = client.put("/me/post-links", json=wrong, headers=cleo)
        assert refused.status_code == 422, wrong
    assert client.get("/me/post-links", headers=cleo).json() == {"post_links": True}


def test_only_a_drawing_for_everyone_is_told_as_linkable(client: TestClient) -> None:
    cleo, bob = signed_up(client, "cleo"), signed_up(client, "bob")
    follow(client, bob, cleo)
    drawing_id = posted(client, cleo, "followers")
    # Bob sees it, in the drawing and in the lists, and it has no link.
    assert not linkable(client, bob, drawing_id)
    listed = client.get(f"/users/{pid(client, cleo)}/drawings", headers=bob).json()
    assert [d["linkable"] for d in listed["drawings"]] == [False]
    feed = client.get("/feed", headers=bob).json()
    assert [p["linkable"] for p in feed["posts"]] == [False]
    seen_by(client, cleo, "everyone")
    listed = client.get(f"/users/{pid(client, cleo)}/drawings", headers=bob).json()
    assert [d["linkable"] for d in listed["drawings"]] == [True]
    feed = client.get("/feed", headers=bob).json()
    assert [p["linkable"] for p in feed["posts"]] == [True]


# --- The limit ---


def test_too_many_requests_from_one_address_wait(client: TestClient) -> None:
    cleo = signed_up(client, "cleo")
    drawing_id = posted(client, cleo)
    client.app.state.post_link_limiter = RateLimiter(2)  # type: ignore[attr-defined]
    assert link(client, drawing_id).status_code == 200
    # An id that is not there counts as one that is: trying ids is what the
    # limit is for.
    assert link(client, str(uuid4())).status_code == 404
    refused = link(client, drawing_id)
    assert refused.status_code == 429
    assert refused.json()["error"]["message"] == TOO_MANY_VIEWS
    assert int(refused.headers["Retry-After"]) >= 1
    # The page reads the refusal too.
    assert refused.headers["Access-Control-Allow-Origin"] == SITE_ORIGIN
