"""Comments in a real PostgreSQL (TASK-120): written under a public drawing
by any member, read by whoever sees the drawing, the oldest first; deleted
only by who wrote them or by the drawing's owner; refused with the reason
when empty or too long; limited per minute; gone with the drawing or the
account. The bodies are the examples of packages/shared-types/fixtures."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.accounts import AccountError, Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.comments import (
    COMMENT_EMPTY,
    COMMENT_NOT_TEXT,
    COMMENT_TOO_LONG,
    MAX_COMMENT_LENGTH,
    MAX_COMMENTS_PER_MINUTE,
    NEGATIVE_COMMENT,
    NO_COMMENT,
    NOT_YOUR_COMMENT,
    TOO_MANY_COMMENTS,
    CommentBody,
    CommentRequestBody,
    CommentsBody,
    checked_text,
)
from shaperoute_api.db import Database, migrations
from shaperoute_api.drawings import NO_DRAWING
from shaperoute_api.schemas import ErrorBody

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
# Cheap parameters: every test signs up.
FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)
KEY = "7c2e91a4b05d3f68"
# The migration of the comments, whatever its number when merged.
(COMMENTS_MIGRATION,) = [p for p in migrations() if p.name.endswith("_comments.sql")]


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class WallClock:
    """A clock the test moves by hand."""

    def __init__(self) -> None:
        self.t = datetime(2026, 10, 3, 8, 15, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.t

    def later(self, seconds: float = 60) -> None:
        self.t += timedelta(seconds=seconds)


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


def signed_up(client: TestClient, name: str = "") -> dict[str, str]:
    """A new account, as the header its requests carry; `name` makes a
    second and a third one."""
    body = _load("sign-up-request.json")
    if name:
        body = {**body, "email": f"{name}@example.com", "username": name}
    answer = client.post("/accounts", json=body)
    assert answer.status_code == 201, answer.text
    return {"Authorization": f"Bearer {answer.json()['token']}"}


def public_id(client: TestClient, headers: dict[str, str]) -> str:
    return str(client.get("/me", headers=headers).json()["public_id"])


def published(client: TestClient, headers: dict[str, str], public: bool = True) -> str:
    """The example run saved and made public, or private again: its id."""
    run = _load("activity-request.json")
    client.put(f"/me/activities/{KEY}", json=run, headers=headers)
    answer = client.put(
        f"/me/activities/{KEY}/drawing",
        json={"title": "Sunday heart", "public": public},
        headers=headers,
    )
    assert answer.status_code == 200, answer.text
    return str(answer.json()["id"])


def write(
    client: TestClient, headers: dict[str, str], drawing_id: str, text: str
) -> Any:
    return client.post(
        f"/drawings/{drawing_id}/comments", json={"text": text}, headers=headers
    )


def written(
    client: TestClient, headers: dict[str, str], drawing_id: str, text: str
) -> dict[str, Any]:
    answer = write(client, headers, drawing_id, text)
    assert answer.status_code == 201, answer.text
    return dict(answer.json())


def listed(
    client: TestClient, headers: dict[str, str], drawing_id: str, query: str = ""
) -> dict[str, Any]:
    answer = client.get(f"/drawings/{drawing_id}/comments{query}", headers=headers)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def code(answer: Any) -> str:
    return str(answer.json()["error"]["code"])


def message(answer: Any) -> str:
    return str(answer.json()["error"]["message"])


def count(database: Database) -> int:
    with database.connect() as conn:
        row = conn.execute("SELECT count(*) AS n FROM comments").fetchone()
    assert row is not None
    return int(row["n"])


# --- Without a database ---


def test_the_examples_are_the_bodies() -> None:
    request = _load("comment-request.json")
    assert set(request) == set(CommentRequestBody.model_fields)
    CommentRequestBody.model_validate(request)
    one = _load("comment.json")
    assert set(one) == set(CommentBody.model_fields)
    CommentBody.model_validate(one)
    page = _load("comments.json")
    assert set(page) == set(CommentsBody.model_fields)
    CommentsBody.model_validate(page)
    # The drawing's owner answers under its drawing.
    assert page["comments"][1]["author"] == _load("drawing.json")["author"]
    refused = ErrorBody.model_validate(_load("comment-error.json")).error
    assert (refused.code, refused.message) == ("comment_rejected", NEGATIVE_COMMENT)


def test_the_text_rule() -> None:
    assert checked_text("  Nice heart!  ") == "Nice heart!"
    assert checked_text("Two lines\nof words") == "Two lines\nof words"
    assert checked_text("x" * MAX_COMMENT_LENGTH) == "x" * MAX_COMMENT_LENGTH
    # The spaces around do not count.
    assert len(checked_text(" " + "x" * MAX_COMMENT_LENGTH + "\n")) == 500
    for refused, why in (
        ("", COMMENT_EMPTY),
        ("   \n\t ", COMMENT_EMPTY),
        ("x" * (MAX_COMMENT_LENGTH + 1), COMMENT_TOO_LONG),
        ("a\x00b", COMMENT_NOT_TEXT),
        ("a\tb", COMMENT_NOT_TEXT),
    ):
        with pytest.raises(AccountError) as caught:
            checked_text(refused)
        assert caught.value.status == 422
        assert caught.value.message == why


def test_the_migration_is_there() -> None:
    assert (
        COMMENTS_MIGRATION.read_text(encoding="utf-8").count("ON DELETE CASCADE") == 2
    )


# --- In the database ---


def test_a_member_comments_a_public_drawing(
    client: TestClient, wall: WallClock
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    third = signed_up(client, "third_runner")
    assert listed(client, other, drawing_id) == {
        "comments": [],
        "next": None,
        "total": 0,
    }

    added = written(client, other, drawing_id, "  What a heart!  ")
    assert added["text"] == "What a heart!"
    assert added["author"] == {
        "public_id": public_id(client, other),
        "username": "other_runner",
    }
    assert added["created_at"] == "2026-10-03T08:15:00Z"
    assert added["deletable"] is True

    # Everyone who sees the drawing reads it; who may delete it is told.
    for headers, deletable in ((owner, True), (other, True), (third, False)):
        page = listed(client, headers, drawing_id)
        assert page["total"] == 1 and page["next"] is None
        (seen,) = page["comments"]
        assert seen == {**added, "deletable": deletable}
        assert "email" not in json.dumps(page)


def test_the_comments_go_from_the_oldest_in_pages(
    client: TestClient, wall: WallClock
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    for text in ("first", "second", "third"):
        written(client, other, drawing_id, text)
        wall.later()
    first = listed(client, owner, drawing_id, "?limit=2")
    assert [c["text"] for c in first["comments"]] == ["first", "second"]
    assert first["total"] == 3 and first["next"] is not None
    # One written between two pages comes at the end, never twice.
    written(client, owner, drawing_id, "fourth")
    second = listed(client, owner, drawing_id, f"?limit=2&cursor={first['next']}")
    assert [c["text"] for c in second["comments"]] == ["third", "fourth"]
    assert second["total"] == 4 and second["next"] is None


def test_a_comment_refused_says_why_and_keeps_nothing(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    for text, why in (
        ("", COMMENT_EMPTY),
        ("    ", COMMENT_EMPTY),
        ("x" * (MAX_COMMENT_LENGTH + 1), COMMENT_TOO_LONG),
        ("<b>\x07</b>", COMMENT_NOT_TEXT),
    ):
        answer = write(client, owner, drawing_id, text)
        assert answer.status_code == 422
        assert code(answer) == "invalid_request"
        assert message(answer) == why
    answer = client.post(
        f"/drawings/{drawing_id}/comments", json={"words": "hi"}, headers=owner
    )
    assert answer.status_code == 422
    assert count(database) == 0


def test_a_negative_comment_is_not_published(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    # The filter is comment_filter.py's (TASK-213): here only that it is asked.
    answer = write(client, other, drawing_id, "What an ugly route")
    assert answer.status_code == 422
    assert answer.json() == _load("comment-error.json")
    assert count(database) == 0
    # A word of the list, said not to be: kept.
    written(client, other, drawing_id, "Not bad at all!")
    assert count(database) == 1


def test_a_comment_is_kept_as_written(client: TestClient) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    # Plain text: the API changes nothing in it; the app shows it as text.
    text = '<a href="https://example.com">look</a> & <script>x</script>\nok'
    assert written(client, owner, drawing_id, text)["text"] == text
    assert listed(client, owner, drawing_id)["comments"][0]["text"] == text


def test_a_private_drawing_has_no_comments_for_the_others(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    written(client, other, drawing_id, "What a heart!")
    published(client, owner, public=False)
    for answer in (
        client.get(f"/drawings/{drawing_id}/comments", headers=other),
        write(client, other, drawing_id, "Still here?"),
    ):
        assert answer.status_code == 404
        assert message(answer) == NO_DRAWING
    # The owner still sees them; public again, so does everyone.
    assert listed(client, owner, drawing_id)["total"] == 1
    published(client, owner)
    assert listed(client, other, drawing_id)["total"] == 1
    assert count(database) == 1


def test_only_who_wrote_it_or_the_owner_deletes(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    third = signed_up(client, "third_runner")
    by_other = written(client, other, drawing_id, "first")["id"]
    by_third = written(client, third, drawing_id, "second")["id"]
    by_owner = written(client, owner, drawing_id, "third")["id"]

    for headers, comment_id in ((third, by_other), (other, by_owner)):
        answer = client.delete(f"/comments/{comment_id}", headers=headers)
        assert answer.status_code == 403
        assert message(answer) == NOT_YOUR_COMMENT
    assert count(database) == 3

    # Who wrote it, and the owner of the drawing, under any comment.
    assert client.delete(f"/comments/{by_other}", headers=other).status_code == 204
    assert client.delete(f"/comments/{by_third}", headers=owner).status_code == 204
    assert client.delete(f"/comments/{by_owner}", headers=owner).status_code == 204
    assert count(database) == 0
    # Gone, never there, or not an id: the same.
    for comment_id in (by_other, uuid4(), "not-an-id"):
        answer = client.delete(f"/comments/{comment_id}", headers=owner)
        assert answer.status_code == 404
        assert message(answer) == NO_COMMENT


def test_under_a_private_drawing_only_its_author_deletes_a_comment(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    third = signed_up(client, "third_runner")
    by_other = written(client, other, drawing_id, "first")["id"]
    by_third = written(client, third, drawing_id, "second")["id"]
    published(client, owner, public=False)
    # The others do not see it: not even that it is there.
    answer = client.delete(f"/comments/{by_third}", headers=other)
    assert answer.status_code == 404
    assert client.delete(f"/comments/{by_other}", headers=other).status_code == 204
    assert count(database) == 1


def test_too_many_comments_in_a_minute(client: TestClient, database: Database) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    for i in range(MAX_COMMENTS_PER_MINUTE):
        written(client, owner, drawing_id, f"comment {i}")
    answer = write(client, owner, drawing_id, "one more")
    assert answer.status_code == 429
    assert code(answer) == "too_many_requests"
    assert message(answer) == TOO_MANY_COMMENTS
    assert 0 < int(answer.headers["Retry-After"]) <= 60
    # One account's limit, not everybody's.
    written(client, other, drawing_id, "my first")
    assert count(database) == MAX_COMMENTS_PER_MINUTE + 1


def test_a_deleted_run_takes_its_comments(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    written(client, other, drawing_id, "What a heart!")
    assert client.delete(f"/me/activities/{KEY}", headers=owner).status_code == 204
    assert count(database) == 0
    answer = client.get(f"/drawings/{drawing_id}/comments", headers=other)
    assert answer.status_code == 404


def test_a_deleted_account_takes_its_comments(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    written(client, other, drawing_id, "What a heart!")
    written(client, owner, drawing_id, "Thanks!")
    assert client.delete("/me", headers=other).status_code == 204
    page = listed(client, owner, drawing_id)
    assert [c["text"] for c in page["comments"]] == ["Thanks!"]
    # And the owner's account, its drawing and everything under it.
    assert client.delete("/me", headers=owner).status_code == 204
    assert count(database) == 0


def test_an_unknown_drawing_has_no_comments(client: TestClient) -> None:
    me = signed_up(client)
    for drawing_id in (uuid4(), "not-an-id"):
        for answer in (
            client.get(f"/drawings/{drawing_id}/comments", headers=me),
            write(client, me, str(drawing_id), "Hello?"),
        ):
            assert answer.status_code == 404
            assert message(answer) == NO_DRAWING


def test_a_bad_cursor_is_refused(client: TestClient) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    answer = client.get(
        f"/drawings/{drawing_id}/comments?cursor=yesterday", headers=owner
    )
    assert answer.status_code == 422
    assert code(answer) == "invalid_request"


def test_every_comment_endpoint_needs_a_token(client: TestClient) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    comment_id = written(client, owner, drawing_id, "Mine")["id"]
    for method, path, body in (
        ("GET", f"/drawings/{drawing_id}/comments", None),
        ("POST", f"/drawings/{drawing_id}/comments", {"text": "Hi"}),
        ("DELETE", f"/comments/{comment_id}", None),
    ):
        answer = client.request(method, path, json=body)
        assert answer.status_code == 401, path
        assert code(answer) == "not_signed_in"


def test_without_a_database_the_comments_are_unavailable() -> None:
    client = TestClient(create_app(FileSource(Path("unused.graphml"))))
    answer = client.get(
        f"/drawings/{uuid4()}/comments", headers={"Authorization": "Bearer x"}
    )
    assert answer.status_code == 503
    assert code(answer) == "accounts_unavailable"
