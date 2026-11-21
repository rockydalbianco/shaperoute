"""What a card of the feed counts, in a real PostgreSQL (TASK-355 part B):
the address of its author's picture, the reactions with the reader's own
and the comments, the same numbers GET /drawings/{id}/reactions and
/comments give, a block apart; and the picture at its address, only to who
is signed in and never across a block."""

from __future__ import annotations

import base64
import io
import json
from typing import Any

from fastapi.testclient import TestClient
from PIL import Image
from test_drawings import (
    FIXTURES,
    KEY,
    OTHER_KEY,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    drawn,
    other,
    public_id,
    saved,
    signed_up,
    third,
    wall,  # noqa: F401
)

from shaperoute_api.avatars import CACHE_CONTROL, NO_AVATAR
from shaperoute_api.db import Database
from shaperoute_api.feed import FeedBody, FeedCardBody, FeedPageBody, FeedPostBody
from shaperoute_api.follows import SMALL_PHOTO_SIDE


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def feed(app: TestClient, headers: dict[str, str], **query: Any) -> dict[str, Any]:
    answer = app.get("/feed", params=query, headers=headers)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def jpeg(size: tuple[int, int] = (300, 300)) -> str:
    out = io.BytesIO()
    Image.new("RGB", size, (200, 40, 40)).save(out, "JPEG")
    return base64.b64encode(out.getvalue()).decode("ascii")


def with_picture(app: TestClient, headers: dict[str, str]) -> None:
    answer = app.put("/me/photo", json={"image": jpeg()}, headers=headers)
    assert answer.status_code == 200, answer.text


def posted(app: TestClient, headers: dict[str, str], key: str = KEY) -> str:
    saved(app, headers, key)
    return str(drawn(app, headers, key)["id"])


def react(app: TestClient, headers: dict[str, str], drawing: str, kind: str) -> None:
    answer = app.put(
        f"/drawings/{drawing}/reaction", json={"kind": kind}, headers=headers
    )
    assert answer.status_code == 200, answer.text


def comment(app: TestClient, headers: dict[str, str], drawing: str) -> None:
    answer = app.post(
        f"/drawings/{drawing}/comments",
        json=_load("comment-request.json"),
        headers=headers,
    )
    assert answer.status_code == 201, answer.text


def card(page: dict[str, Any], drawing: str) -> dict[str, Any]:
    (found,) = [post for post in page["posts"] if post["id"] == drawing]
    return found


def block(app: TestClient, who: dict[str, str], whom: dict[str, str]) -> None:
    answer = app.put(f"/users/{public_id(app, whom)}/block", headers=who)
    assert answer.status_code == 204, answer.text


# --- The contract ---


def test_the_example_with_counts_is_a_page() -> None:
    page = _load("feed-counts.json")
    body = FeedPageBody.model_validate(page)
    # feed.json with the counts: written, as it, before the fields that came
    # later (test_feed.py says which).
    before = _load("feed.json")["posts"][0]
    assert set(page["posts"][0]) == set(before) | {"reactions", "comments"}
    assert set(page["posts"][0]["author"]) == {"public_id", "username", "photo"}
    first, second = body.posts
    assert first.author.photo is not None and first.author.photo.startswith(
        f"/users/{first.author.public_id}/photo?v="
    )
    assert first.reactions.total >= 1 and first.reactions.mine is not None
    assert second.author.photo is None and second.reactions.mine is None
    # The page of before is still a page; the search's posts stay as they were.
    FeedBody.model_validate(_load("feed.json"))
    assert set(FeedCardBody.model_fields) == set(FeedPostBody.model_fields) | {
        "reactions",
        "comments",
    }


# --- The counts ---


def test_a_card_counts_as_the_drawing_does(client: TestClient) -> None:  # noqa: F811
    me, friend, stranger = signed_up(client), other(client), third(client)
    drawing = posted(client, me)
    page = feed(client, me)
    assert card(page, drawing)["reactions"] == {"total": 0, "mine": None}
    assert card(page, drawing)["comments"] == 0
    react(client, friend, drawing, "fire")
    react(client, stranger, drawing, "clap")
    react(client, me, drawing, "wow")
    comment(client, friend, drawing)
    comment(client, me, drawing)
    for reader in (me, friend, stranger):
        shown = card(feed(client, reader), drawing)
        reactions = client.get(f"/drawings/{drawing}/reactions", headers=reader).json()
        comments = client.get(f"/drawings/{drawing}/comments", headers=reader).json()
        assert shown["reactions"] == {
            "total": reactions["total"],
            "mine": reactions["mine"],
        }
        assert shown["comments"] == comments["total"]
    assert card(feed(client, me), drawing)["reactions"] == {"total": 3, "mine": "wow"}
    assert card(feed(client, friend), drawing)["reactions"]["mine"] == "fire"
    assert card(feed(client, me), drawing)["comments"] == 2


def test_a_block_takes_the_member_out_of_the_counts(
    client: TestClient,  # noqa: F811
) -> None:
    me, friend, stranger = signed_up(client), other(client), third(client)
    drawing = posted(client, me)
    react(client, friend, drawing, "fire")
    react(client, stranger, drawing, "clap")
    comment(client, stranger, drawing)
    block(client, me, stranger)
    shown = card(feed(client, me), drawing)
    assert shown["reactions"] == {"total": 1, "mine": None}
    assert shown["comments"] == 0
    assert card(feed(client, friend), drawing)["reactions"]["total"] == 2


def test_a_hidden_comment_counts_only_for_its_writer(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, friend = signed_up(client), other(client)
    drawing = posted(client, me)
    comment(client, friend, drawing)
    with database.connect() as conn:
        conn.execute("UPDATE comments SET hidden_at = now()")
    assert card(feed(client, me), drawing)["comments"] == 0
    assert card(feed(client, friend), drawing)["comments"] == 1


def test_each_card_has_its_own_counts(client: TestClient) -> None:  # noqa: F811
    me, friend = signed_up(client), other(client)
    first = posted(client, me, KEY)
    second = posted(client, me, OTHER_KEY)
    react(client, friend, second, "strong")
    comment(client, friend, second)
    page = feed(client, me)
    assert card(page, first)["reactions"]["total"] == 0
    assert card(page, first)["comments"] == 0
    assert card(page, second)["reactions"] == {"total": 1, "mine": None}
    assert card(page, second)["comments"] == 1
    # The tabs carry them too.
    for tab in ("all", "following"):
        tabbed = feed(client, me, filter=tab)
        assert card(tabbed, second)["comments"] == 1


# --- The picture ---


def test_the_author_picture_has_an_address_that_changes_with_it(
    client: TestClient,  # noqa: F811
) -> None:
    me, friend = signed_up(client), other(client)
    drawing = posted(client, me)
    assert card(feed(client, friend), drawing)["author"]["photo"] is None
    with_picture(client, me)
    address = card(feed(client, friend), drawing)["author"]["photo"]
    assert address.startswith(f"/users/{public_id(client, me)}/photo?v=")
    answer = client.get(address, headers=friend)
    assert answer.status_code == 200
    assert answer.headers["content-type"] == "image/jpeg"
    assert answer.headers["cache-control"] == CACHE_CONTROL
    with Image.open(io.BytesIO(answer.content)) as picture:
        assert picture.size == (SMALL_PHOTO_SIDE, SMALL_PHOTO_SIDE)
    client.delete("/me/photo", headers=me)
    assert card(feed(client, friend), drawing)["author"]["photo"] is None


def test_the_picture_wants_a_token_and_stops_at_a_block(
    client: TestClient,  # noqa: F811
) -> None:
    me, friend, stranger = signed_up(client), other(client), third(client)
    with_picture(client, me)
    address = f"/users/{public_id(client, me)}/photo"
    assert client.get(address).status_code == 401
    assert client.get(address, headers=me).status_code == 200
    assert client.get(address, headers=stranger).status_code == 200
    block(client, me, stranger)
    answer = client.get(address, headers=stranger)
    assert answer.status_code == 404
    assert answer.json()["error"]["message"] == NO_AVATAR
    without = f"/users/{public_id(client, friend)}/photo"
    assert client.get(without, headers=me).status_code == 404
    assert client.get("/users/not-an-id/photo", headers=me).status_code == 404
