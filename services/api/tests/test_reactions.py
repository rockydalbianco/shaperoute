"""Reactions in a real PostgreSQL (TASK-119, ADR-0193): one for each member
on a drawing it sees, changed by another kind and taken back by DELETE; the
super like only with a comment of at least 2 characters, kept with it or not
at all; limited per minute; gone with the drawing or the account. The bodies
are the examples of packages/shared-types/fixtures."""

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
    COMMENT_NOT_TEXT,
    COMMENT_TOO_LONG,
    MAX_COMMENT_LENGTH,
    MAX_COMMENTS_PER_MINUTE,
    TOO_MANY_COMMENTS,
    CommentBody,
    CommentRejected,
)
from shaperoute_api.db import Database, migrations
from shaperoute_api.drawings import NO_DRAWING
from shaperoute_api.reactions import (
    MAX_REACTIONS_PER_MINUTE,
    MIN_SUPER_LIKE_COMMENT,
    ONLY_SUPER_LIKE_COMMENTS,
    REACTION_KINDS,
    SUPER_LIKE_NEEDS_COMMENT,
    TOO_MANY_REACTIONS,
    ReactionRequestBody,
    ReactionResultBody,
    ReactionsBody,
    checked_super_like,
)

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
# Cheap parameters: every test signs up.
FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)
KEY = "7c2e91a4b05d3f68"
# The migration of the reactions, whatever its number when merged.
(REACTIONS_MIGRATION,) = [p for p in migrations() if p.name.endswith("_reactions.sql")]
SUPER_LIKE = {"kind": "super_like", "comment": "What a heart!"}


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class WallClock:
    """A clock the test moves by hand."""

    def __init__(self) -> None:
        self.t = datetime(2026, 10, 4, 18, 5, tzinfo=UTC)

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


def react(
    client: TestClient, headers: dict[str, str], drawing_id: str, body: Any
) -> Any:
    if isinstance(body, str):
        body = {"kind": body}
    return client.put(f"/drawings/{drawing_id}/reaction", json=body, headers=headers)


def reacted(
    client: TestClient, headers: dict[str, str], drawing_id: str, body: Any
) -> dict[str, Any]:
    answer = react(client, headers, drawing_id, body)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def seen(
    client: TestClient, headers: dict[str, str], drawing_id: str
) -> dict[str, Any]:
    answer = client.get(f"/drawings/{drawing_id}/reactions", headers=headers)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def taken_back(
    client: TestClient, headers: dict[str, str], drawing_id: str
) -> dict[str, Any]:
    answer = client.delete(f"/drawings/{drawing_id}/reaction", headers=headers)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def counts(**some: int) -> dict[str, int]:
    """All six kinds, zero but for `some`."""
    return {kind: some.get(kind, 0) for kind in REACTION_KINDS}


def comment_texts(
    client: TestClient, headers: dict[str, str], drawing_id: str
) -> list[str]:
    answer = client.get(f"/drawings/{drawing_id}/comments", headers=headers)
    assert answer.status_code == 200, answer.text
    return [c["text"] for c in answer.json()["comments"]]


def code(answer: Any) -> str:
    return str(answer.json()["error"]["code"])


def message(answer: Any) -> str:
    return str(answer.json()["error"]["message"])


def rows(database: Database, table: str) -> int:
    with database.connect() as conn:
        row = conn.execute(f"SELECT count(*) AS n FROM {table}").fetchone()
    assert row is not None
    return int(row["n"])


# --- Without a database ---


def test_the_examples_are_the_bodies() -> None:
    for name in ("reaction-request.json", "super-like-request.json"):
        request = _load(name)
        assert set(request) <= set(ReactionRequestBody.model_fields)
        ReactionRequestBody.model_validate(request)
    summary = _load("reactions.json")
    assert set(summary) == set(ReactionsBody.model_fields)
    # The six, in the order of the contract and of the migration.
    assert tuple(summary["counts"]) == REACTION_KINDS
    ReactionsBody.model_validate(summary)
    result = _load("reaction-result.json")
    assert set(result) == set(ReactionResultBody.model_fields)
    assert set(result["comment"]) == set(CommentBody.model_fields)
    ReactionResultBody.model_validate(result)
    assert result["comment"]["text"] == _load("super-like-request.json")["comment"]


def test_the_super_like_rule() -> None:
    assert checked_super_like("fire", None) is None
    assert checked_super_like("super_like", "  ok \n") == "ok"
    assert checked_super_like("super_like", "!!") == "!!"
    assert checked_super_like("super_like", "Two lines\nof words") == (
        "Two lines\nof words"
    )
    for kind, comment, why in (
        ("super_like", None, SUPER_LIKE_NEEDS_COMMENT),
        ("super_like", "", SUPER_LIKE_NEEDS_COMMENT),
        ("super_like", "a", SUPER_LIKE_NEEDS_COMMENT),
        ("super_like", "  a \n", SUPER_LIKE_NEEDS_COMMENT),
        ("super_like", "x" * (MAX_COMMENT_LENGTH + 1), COMMENT_TOO_LONG),
        ("super_like", "a\x00b", COMMENT_NOT_TEXT),
        ("fire", "Nice", ONLY_SUPER_LIKE_COMMENTS),
        ("fire", "", ONLY_SUPER_LIKE_COMMENTS),
    ):
        with pytest.raises(AccountError) as caught:
            checked_super_like(kind, comment)  # type: ignore[arg-type]
        assert caught.value.status == 422
        assert caught.value.message == why
    # The comments' filter (TASK-213): here only that it is asked.
    with pytest.raises(CommentRejected):
        checked_super_like("super_like", "What an ugly route")
    assert MIN_SUPER_LIKE_COMMENT == 2


def test_the_migration_is_there() -> None:
    text = REACTIONS_MIGRATION.read_text(encoding="utf-8")
    assert text.count("ON DELETE CASCADE") == 2
    assert all(f"'{kind}'" in text for kind in REACTION_KINDS)
    assert "PRIMARY KEY (drawing_id, user_id)" in text


# --- In the database ---


def test_one_reaction_each_changed_and_taken_back(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    third = signed_up(client, "third_runner")
    assert seen(client, other, drawing_id) == {
        "counts": counts(),
        "total": 0,
        "mine": None,
    }

    # Twice the same: one.
    for _ in range(2):
        left = reacted(client, other, drawing_id, "fire")
        assert left == {
            "reactions": {"counts": counts(fire=1), "total": 1, "mine": "fire"},
            "comment": None,
        }
    # Another kind takes its place.
    assert reacted(client, other, drawing_id, "clap")["reactions"] == {
        "counts": counts(clap=1),
        "total": 1,
        "mine": "clap",
    }
    # Its owner reacts to its own drawing too.
    reacted(client, owner, drawing_id, "wow")
    # Everyone reads how many, never who.
    assert seen(client, third, drawing_id) == {
        "counts": counts(clap=1, wow=1),
        "total": 2,
        "mine": None,
    }
    assert seen(client, owner, drawing_id)["mine"] == "wow"
    assert rows(database, "reactions") == 2

    # Taken back, and again: the same.
    for _ in range(2):
        assert taken_back(client, other, drawing_id) == {
            "counts": counts(wow=1),
            "total": 1,
            "mine": None,
        }
    assert rows(database, "reactions") == 1


def test_a_super_like_keeps_its_comment(
    client: TestClient, database: Database, wall: WallClock
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    reacted(client, other, drawing_id, "fire")

    left = reacted(client, other, drawing_id, {**SUPER_LIKE, "comment": " Wow! "})
    assert left["reactions"] == {
        "counts": counts(super_like=1),
        "total": 1,
        "mine": "super_like",
    }
    added = left["comment"]
    assert added["text"] == "Wow!"
    assert added["author"]["username"] == "other_runner"
    assert added["created_at"] == "2026-10-04T18:05:00Z"
    assert added["deletable"] is True
    # A comment as the others: the owner reads it under the drawing.
    assert comment_texts(client, owner, drawing_id) == ["Wow!"]

    # Asked again (a retry): nothing new, one comment.
    wall.later()
    again = reacted(client, other, drawing_id, {**SUPER_LIKE, "comment": "Wow!"})
    assert again == {"reactions": left["reactions"], "comment": None}
    assert rows(database, "comments") == 1

    # Then two things: another kind leaves the comment...
    reacted(client, other, drawing_id, "laugh")
    assert comment_texts(client, owner, drawing_id) == ["Wow!"]
    # ...a super like again wants a new one...
    reacted(client, other, drawing_id, {**SUPER_LIKE, "comment": "Still a heart"})
    assert comment_texts(client, owner, drawing_id) == ["Wow!", "Still a heart"]
    # ...and deleting the comment leaves the super like.
    answer = client.delete(f"/comments/{added['id']}", headers=other)
    assert answer.status_code == 204
    assert seen(client, owner, drawing_id)["counts"] == counts(super_like=1)


def test_a_super_like_without_its_comment_keeps_nothing(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    reacted(client, other, drawing_id, "fire")
    for body in (
        {"kind": "super_like"},
        {"kind": "super_like", "comment": None},
        {"kind": "super_like", "comment": "a"},
        {"kind": "super_like", "comment": "   b  "},
    ):
        answer = react(client, other, drawing_id, body)
        assert answer.status_code == 422
        assert code(answer) == "invalid_request"
        assert message(answer) == SUPER_LIKE_NEEDS_COMMENT
    # The reaction before stays; no comment.
    assert seen(client, other, drawing_id)["mine"] == "fire"
    assert rows(database, "comments") == 0


def test_a_negative_super_like_keeps_nothing(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    answer = react(
        client, other, drawing_id, {**SUPER_LIKE, "comment": "What an ugly route"}
    )
    assert answer.status_code == 422
    assert answer.json() == _load("comment-error.json")
    assert rows(database, "reactions") == 0
    assert rows(database, "comments") == 0


def test_a_request_out_of_the_contract_is_refused(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    for body, why in (
        ({"kind": "fire", "comment": "Nice"}, ONLY_SUPER_LIKE_COMMENTS),
        ({"kind": "thumbs_up"}, None),
        ({"kind": "🔥"}, None),
        ({}, None),
        ({"kind": "fire", "emoji": "🔥"}, None),
    ):
        answer = react(client, owner, drawing_id, body)
        assert answer.status_code == 422, body
        assert code(answer) == "invalid_request"
        if why is not None:
            assert message(answer) == why
    assert rows(database, "reactions") == 0


def test_a_drawing_not_seen_has_no_reactions_for_the_others(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    reacted(client, other, drawing_id, "strong")
    published(client, owner, public=False)
    for answer in (
        client.get(f"/drawings/{drawing_id}/reactions", headers=other),
        react(client, other, drawing_id, "fire"),
        react(client, other, drawing_id, SUPER_LIKE),
        client.delete(f"/drawings/{drawing_id}/reaction", headers=other),
    ):
        assert answer.status_code == 404
        assert message(answer) == NO_DRAWING
    assert rows(database, "comments") == 0
    # Kept, unseen: the owner still reads it; public again, so does everyone.
    assert seen(client, owner, drawing_id)["counts"] == counts(strong=1)
    published(client, owner)
    assert seen(client, other, drawing_id)["mine"] == "strong"


def test_too_many_reactions_in_a_minute(client: TestClient, database: Database) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    kinds = ("fire", "clap")
    for i in range(MAX_REACTIONS_PER_MINUTE):
        reacted(client, owner, drawing_id, kinds[i % 2])
    for answer in (
        react(client, owner, drawing_id, "wow"),
        client.delete(f"/drawings/{drawing_id}/reaction", headers=owner),
    ):
        assert answer.status_code == 429
        assert code(answer) == "too_many_requests"
        assert message(answer) == TOO_MANY_REACTIONS
        assert 0 < int(answer.headers["Retry-After"]) <= 60
    # One account's limit, not everybody's.
    reacted(client, other, drawing_id, "wow")


def test_a_super_like_counts_as_a_comment(client: TestClient) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    for i in range(MAX_COMMENTS_PER_MINUTE):
        reacted(client, owner, drawing_id, {**SUPER_LIKE, "comment": f"heart {i}"})
        reacted(client, owner, drawing_id, "fire")
    answer = react(client, owner, drawing_id, SUPER_LIKE)
    assert answer.status_code == 429
    assert message(answer) == TOO_MANY_COMMENTS
    # The emoji are under their own limit only.
    reacted(client, owner, drawing_id, "clap")


def test_a_deleted_run_takes_its_reactions(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    reacted(client, other, drawing_id, SUPER_LIKE)
    reacted(client, owner, drawing_id, "fire")
    assert client.delete(f"/me/activities/{KEY}", headers=owner).status_code == 204
    assert rows(database, "reactions") == 0
    answer = client.get(f"/drawings/{drawing_id}/reactions", headers=other)
    assert answer.status_code == 404


def test_a_deleted_account_takes_its_reactions(
    client: TestClient, database: Database
) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    other = signed_up(client, "other_runner")
    reacted(client, other, drawing_id, "laugh")
    reacted(client, owner, drawing_id, "fire")
    assert client.delete("/me", headers=other).status_code == 204
    assert seen(client, owner, drawing_id)["counts"] == counts(fire=1)
    # And the owner's account, its drawing and everything under it.
    assert client.delete("/me", headers=owner).status_code == 204
    assert rows(database, "reactions") == 0


def test_an_unknown_drawing_has_no_reactions(client: TestClient) -> None:
    me = signed_up(client)
    for drawing_id in (str(uuid4()), "not-an-id"):
        for answer in (
            client.get(f"/drawings/{drawing_id}/reactions", headers=me),
            react(client, me, drawing_id, "fire"),
            client.delete(f"/drawings/{drawing_id}/reaction", headers=me),
        ):
            assert answer.status_code == 404
            assert message(answer) == NO_DRAWING


def test_every_reaction_endpoint_needs_a_token(client: TestClient) -> None:
    owner = signed_up(client)
    drawing_id = published(client, owner)
    for method, path, body in (
        ("GET", f"/drawings/{drawing_id}/reactions", None),
        ("PUT", f"/drawings/{drawing_id}/reaction", {"kind": "fire"}),
        ("DELETE", f"/drawings/{drawing_id}/reaction", None),
    ):
        answer = client.request(method, path, json=body)
        assert answer.status_code == 401, path
        assert code(answer) == "not_signed_in"


def test_without_a_database_the_reactions_are_unavailable() -> None:
    client = TestClient(create_app(FileSource(Path("unused.graphml"))))
    answer = client.get(
        f"/drawings/{uuid4()}/reactions", headers={"Authorization": "Bearer x"}
    )
    assert answer.status_code == 503
    assert code(answer) == "accounts_unavailable"
