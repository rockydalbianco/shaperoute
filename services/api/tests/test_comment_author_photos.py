"""The picture of who wrote a comment, in a real PostgreSQL (TASK-497): a
comment and a reply say where their author's picture is read, the address
of the feed's (avatars.py), null without one; who it answers stays a name;
the comment of a super like as the others; a block and a deleted account
take the comment away as before; and a page costs the same statements
whoever wrote it."""

from __future__ import annotations

import base64
import io
from typing import Any

import psycopg
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from test_comment_threads import (
    block,
    client,  # noqa: F401  (the fixtures of the replies' tests)
    database,  # noqa: F401
    drawing_of,
    expo,  # noqa: F401
    listed,
    no_game_shapes,  # noqa: F401
    public_id,
    replies,
    threads,
    written,
)
from test_push import signed_up

from shaperoute_api.avatars import CACHE_CONTROL
from shaperoute_api.comments import CommentBody
from shaperoute_api.follows import SMALL_PHOTO_SIDE

Headers = dict[str, str]


def jpeg(shade: int = 200) -> str:
    out = io.BytesIO()
    Image.new("RGB", (300, 300), (shade, 40, 40)).save(out, "JPEG")
    return base64.b64encode(out.getvalue()).decode("ascii")


def with_picture(app: TestClient, headers: Headers, shade: int = 200) -> None:
    answer = app.put("/me/photo", json={"image": jpeg(shade)}, headers=headers)
    assert answer.status_code == 200, answer.text


def address_of(app: TestClient, headers: Headers) -> str:
    """Where the picture of `headers` is read, without its version."""
    return f"/users/{public_id(app, headers)}/photo?v="


def test_the_field_is_new_beside_what_was_there() -> None:
    author = CommentBody.model_fields["author"].annotation
    assert set(author.model_fields) == {"public_id", "username", "photo"}
    # A body from before, without it, is still a comment.
    assert author.model_fields["photo"].default is None


def test_a_comment_and_a_reply_say_where_the_picture_is(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob, cleo = (signed_up(client, name) for name in ("ada", "bob", "cleo"))
    with_picture(client, ada)
    with_picture(client, cleo)
    drawing = drawing_of(client, ada)

    # What comes back from writing says it too: the writer's own.
    top = written(client, bob, drawing, "What a heart!")
    assert top["author"]["photo"] is None
    first = written(client, ada, drawing, "Thank you.", top["id"])
    assert first["author"]["photo"].startswith(address_of(client, ada))
    second = written(client, cleo, drawing, "I walked it.", first["id"])
    assert second["author"]["photo"].startswith(address_of(client, cleo))
    # Who a reply answers is a name before its words: no picture.
    assert set(second["mention"]) == {"public_id", "username"}

    def pictures(page: dict[str, Any]) -> list[str | None]:
        return [comment["author"]["photo"] for comment in page["comments"]]

    # The list an app from before knew, the threads and the replies.
    for reader in (ada, bob, cleo):
        flat = pictures(listed(client, reader, drawing))
        assert flat == [None, first["author"]["photo"], second["author"]["photo"]]
        (thread,) = threads(client, reader, drawing)["comments"]
        assert thread["author"]["photo"] is None
        assert pictures({"comments": thread["replies"]}) == flat[1:]
        assert pictures(replies(client, reader, top["id"])) == flat[1:]

    # The address is the feed's: the small picture, kept by the phone.
    answer = client.get(first["author"]["photo"], headers=bob)
    assert answer.status_code == 200
    assert answer.headers["content-type"] == "image/jpeg"
    assert answer.headers["cache-control"] == CACHE_CONTROL
    with Image.open(io.BytesIO(answer.content)) as picture:
        assert picture.size == (SMALL_PHOTO_SIDE, SMALL_PHOTO_SIDE)


def test_the_comment_of_a_super_like_says_it_too(
    client: TestClient,  # noqa: F811
) -> None:
    # Kept by reactions.py, a comment as the others.
    ada, bob, cleo = (signed_up(client, name) for name in ("ada", "bob", "cleo"))
    with_picture(client, bob)
    drawing = drawing_of(client, ada)
    kept: list[str | None] = []
    for headers in (bob, cleo):
        answer = client.put(
            f"/drawings/{drawing}/reaction",
            json={"kind": "super_like", "comment": "What a heart!"},
            headers=headers,
        )
        assert answer.status_code == 200, answer.text
        kept.append(answer.json()["comment"]["author"]["photo"])
    with_bob, without = kept
    assert with_bob is not None and with_bob.startswith(address_of(client, bob))
    assert without is None
    page = listed(client, ada, drawing)
    assert [c["author"]["photo"] for c in page["comments"]] == kept


def test_a_new_picture_is_a_new_address_and_none_is_null(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    drawing = drawing_of(client, ada)
    written(client, bob, drawing, "What a heart!")

    def picture() -> str | None:
        (comment,) = listed(client, ada, drawing)["comments"]
        address: str | None = comment["author"]["photo"]
        return address

    assert picture() is None
    with_picture(client, bob)
    before = picture()
    assert before is not None and before.startswith(address_of(client, bob))
    with_picture(client, bob, shade=90)
    after = picture()
    assert after is not None and after.startswith(address_of(client, bob))
    assert after != before
    assert client.delete("/me/photo", headers=bob).status_code == 204
    assert picture() is None


def test_a_block_and_a_deleted_account_take_the_comment_as_before(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob, cleo = (signed_up(client, name) for name in ("ada", "bob", "cleo"))
    for headers in (ada, bob, cleo):
        with_picture(client, headers)
    drawing = drawing_of(client, ada)
    written(client, bob, drawing, "What a heart!")
    written(client, cleo, drawing, "I walked it.")
    cleo_picture = address_of(client, cleo)

    def writers(reader: Headers) -> list[str]:
        page = listed(client, reader, drawing)
        return [comment["author"]["username"] for comment in page["comments"]]

    assert writers(bob) == ["bob", "cleo"]
    # Across a block neither the comment nor the picture is there.
    block(client, bob, cleo)
    assert writers(bob) == ["bob"]
    assert client.get(cleo_picture, headers=bob).status_code == 404
    assert writers(ada) == ["bob", "cleo"]
    # A deleted account takes its comments, and its picture, with it.
    assert client.delete("/me", headers=cleo).status_code == 204
    assert writers(ada) == ["bob"]
    assert client.get(cleo_picture, headers=ada).status_code == 404


def test_a_page_costs_the_same_statements_whoever_wrote_it(
    client: TestClient,  # noqa: F811
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ada = signed_up(client, "ada")
    drawing = drawing_of(client, ada)
    top = written(client, ada, drawing, "One.")
    written(client, ada, drawing, "Two.", top["id"])

    statements: list[str] = []
    run = psycopg.Connection.execute

    def counted(self: Any, query: Any, *args: Any, **kwargs: Any) -> Any:
        statements.append(str(query))
        return run(self, query, *args, **kwargs)

    def cost(path: str) -> int:
        with monkeypatch.context() as patch:
            patch.setattr(psycopg.Connection, "execute", counted)
            statements.clear()
            assert client.get(path, headers=ada).status_code == 200
            return len(statements)

    pages = (
        f"/drawings/{drawing}/comments",
        f"/drawings/{drawing}/comments?threads=true",
        f"/comments/{top['id']}/replies",
    )
    one_author = [cost(path) for path in pages]

    # Six more writers, each with a picture, comments and replies.
    for n in range(6):
        other = signed_up(client, f"runner{n}")
        with_picture(client, other)
        written(client, other, drawing, f"Comment {n}.")
        written(client, other, drawing, f"Reply {n}.", top["id"])
    for path in pages:
        page = client.get(path, headers=ada).json()
        assert len({c["author"]["public_id"] for c in page["comments"]}) > 1
    assert [cost(path) for path in pages] == one_author
    # The picture itself is never read for a page: only when it was put.
    assert not any("jpeg" in statement for statement in statements)
