"""Who sees a post of photos only, and what it counts for (TASK-312 part C,
docs/IMPORTAZIONI.md §4): as any post for «Followers», blocks (TASK-121),
hiding (TASK-291), reports, reactions, comments, tags and pushes; never
near a stranger's point, never in the contest. The helpers and the app are
test_photo_posts.py's."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi.testclient import TestClient
from test_contests import ENDS, STARTS
from test_photo_posts import (
    Headers,
    _load,
    client,  # noqa: F401 (the fixtures of test_photo_posts.py)
    database,  # noqa: F401 (the fixtures of test_photo_posts.py)
    expo,  # noqa: F401 (the fixtures of test_photo_posts.py)
    feed_ids,
    kept,
    new_app,
    posted,
    public_id,
    wall,  # noqa: F401 (the fixtures of test_photo_posts.py)
    with_photo,
)
from test_push import FakeExpo, push_on, put_token, signed_up
from test_strava import WallClock

from shaperoute_api.contests import Contests
from shaperoute_api.db import Database

# Trento, where nothing of a post of photos only is.
TRENTO = {"lat": 46.07, "lon": 11.12}


def seen(api: TestClient, me: Headers, post_id: str) -> bool:
    return api.get(f"/drawings/{post_id}", headers=new_app(me)).status_code == 200


def followed(api: TestClient, follower: Headers, owner: Headers) -> None:
    """`follower` follows `owner`, the request accepted."""
    owner_id, follower_id = public_id(api, owner), public_id(api, follower)
    asked = api.post(f"/users/{owner_id}/follow", headers=follower)
    assert asked.status_code == 200, asked.text
    accepted = api.post(f"/me/follow-requests/{follower_id}/accept", headers=owner)
    assert accepted.status_code in (204, 404), accepted.text


def test_one_for_the_followers_is_seen_by_them_only(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob, cyd = (signed_up(client, name) for name in ("ada", "bob", "cyd"))
    followed(client, bob, ada)
    post_id = posted(client, ada, visibility="followers")
    assert seen(client, ada, post_id)
    assert seen(client, bob, post_id)
    assert not seen(client, cyd, post_id)
    assert feed_ids(client, new_app(bob), filter="following") == [post_id]
    assert feed_ids(client, new_app(cyd), filter="all") == []


def test_a_block_either_way_keeps_it_apart(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob, cyd = (signed_up(client, name) for name in ("ada", "bob", "cyd"))
    post_id = posted(client, ada)
    blocked = client.put(f"/users/{public_id(client, bob)}/block", headers=ada)
    assert blocked.status_code == 204
    blocks = client.put(f"/users/{public_id(client, ada)}/block", headers=cyd)
    assert blocks.status_code == 204
    for other in (bob, cyd):
        assert not seen(client, other, post_id)
        assert feed_ids(client, new_app(other)) == []
        reacted = client.put(
            f"/drawings/{post_id}/reaction", json={"kind": "fire"}, headers=other
        )
        assert reacted.status_code == 404


def test_one_hidden_from_a_report_is_its_owner_s_only(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = posted(client, ada)
    with database.connect() as conn:
        conn.execute("UPDATE drawings SET hidden_at = now() WHERE id = %s", (post_id,))
    assert not seen(client, bob, post_id)
    assert feed_ids(client, new_app(bob)) == []
    assert seen(client, ada, post_id)


def test_it_is_reported_as_a_post(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = posted(client, ada)
    report = {**_load("report-request.json"), "id": post_id}
    assert client.post("/reports", json=report, headers=bob).status_code == 204
    # Its owner is known: one cannot report oneself.
    assert client.post("/reports", json=report, headers=ada).status_code == 422


def test_reactions_and_comments_reach_its_owner(
    client: TestClient,  # noqa: F811
    expo: FakeExpo,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    push_on(client, ada)
    assert put_token(client, ada, "ExponentPushToken[ada]").status_code == 204
    post_id = posted(client, ada)
    reacted = client.put(
        f"/drawings/{post_id}/reaction", json={"kind": "fire"}, headers=bob
    )
    assert reacted.status_code == 200, reacted.text
    assert expo.sent[-1]["to"] == "ExponentPushToken[ada]"
    assert expo.sent[-1]["data"] == {"kind": "reaction", "drawing_id": post_id}
    comment = client.post(
        f"/drawings/{post_id}/comments",
        json=_load("comment-request.json"),
        headers=bob,
    )
    assert comment.status_code == 201, comment.text
    assert expo.sent[-1]["data"]["kind"] == "comment"
    listed = client.get(f"/drawings/{post_id}/comments", headers=ada).json()
    assert len(listed["comments"]) == 1
    # Its owner deletes a comment under it.
    removed = client.delete(f"/comments/{comment.json()['id']}", headers=ada)
    assert removed.status_code == 204
    bell = client.get("/notifications", headers=new_app(ada)).json()
    assert [line["kind"] for line in bell["notifications"]] == ["reaction"]
    # An app that cannot open it has no line to touch.
    older = client.get("/notifications", headers=ada).json()
    assert older["notifications"] == []


def test_those_tagged_are_told_once_it_is_published(
    client: TestClient,  # noqa: F811
    expo: FakeExpo,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    push_on(client, bob)
    assert put_token(client, bob, "ExponentPushToken[bob]").status_code == 204
    kept(client, ada, tags=[public_id(client, bob)])
    assert expo.sent == []
    post_id = with_photo(client, ada)["id"]
    assert [m["data"] for m in expo.sent] == [{"kind": "tag", "drawing_id": post_id}]
    # A second photo, or the post kept again, tells nobody again.
    with_photo(client, ada, n=2)
    kept(client, ada, tags=[public_id(client, bob)])
    assert len(expo.sent) == 1


def test_it_is_never_near_a_stranger_s_point(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob, cyd = (signed_up(client, name) for name in ("ada", "bob", "cyd"))
    followed(client, bob, ada)
    post_id = posted(client, ada)
    assert feed_ids(client, new_app(cyd), **TRENTO) == []
    assert feed_ids(client, new_app(cyd)) == [post_id]
    assert feed_ids(client, new_app(cyd), filter="all") == [post_id]
    assert feed_ids(client, new_app(bob), **TRENTO) == [post_id]
    assert feed_ids(client, new_app(ada), **TRENTO) == [post_id]


def test_the_contest_leaves_it_out(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    Contests(database, wall).open(STARTS, ENDS)
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = posted(client, ada)
    wall.t += timedelta(minutes=1)
    reacted = client.put(
        f"/drawings/{post_id}/reaction", json={"kind": "fire"}, headers=bob
    )
    assert reacted.status_code == 200, reacted.text
    contest = client.get("/contests/current", headers=new_app(bob)).json()
    assert contest["top"] == []


def test_it_counts_for_no_badge_and_no_total(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    before = client.get(f"/users/{public_id(client, ada)}", headers=new_app(bob))
    posted(client, ada)
    after = client.get(f"/users/{public_id(client, ada)}", headers=new_app(bob))
    changed = {
        name for name, value in after.json().items() if before.json().get(name) != value
    }
    # Only the number of its posts.
    assert changed == {"drawings"}


def test_it_goes_with_its_account(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    posted(client, ada)
    with database.connect() as conn:
        conn.execute("DELETE FROM users WHERE username = 'ada'")
        row = conn.execute("SELECT count(*) AS n FROM drawings").fetchone()
        photos = conn.execute("SELECT count(*) AS n FROM drawing_photos").fetchone()
    assert row is not None and row["n"] == 0
    assert photos is not None and photos["n"] == 0


def test_a_photo_of_it_is_read_by_who_sees_it(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    kept(client, ada)
    answer: Any = with_photo(client, ada)
    url = answer["photos"][0]["url"]
    assert client.get(url, headers=bob).status_code == 200
    assert client.get(url, headers=ada).headers["content-type"] == "image/jpeg"
    # For the followers only: a stranger reads none of it.
    kept(client, ada, visibility="followers")
    assert client.get(url, headers=bob).status_code == 404
    assert client.get(url, headers=ada).status_code == 200
