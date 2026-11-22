"""Posts of photos only (TASK-312 part C, ADR-0272, docs/IMPORTAZIONI.md
§4): a drawing without a run, made and changed by its key, published with
its first photo, «Everyone» or «Followers» and never «Only me», shown only
to the apps that read `photos`. The database is a real PostgreSQL; the
bodies are the examples of packages/shared-types/fixtures, `photo-post-*`
and `*-photos.json`. Who sees it, and what it counts for, are in
test_photo_posts_seen.py."""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from test_contests import DURING
from test_push import FAST_HASHER, Clock, FakeExpo, signed_up
from test_strava import WallClock

from shaperoute_api.accounts import Accounts
from shaperoute_api.app import create_app
from shaperoute_api.db import Database, migrations
from shaperoute_api.drawings import DrawingDetailBody
from shaperoute_api.expo_push import Expo
from shaperoute_api.feed import FeedBody, FeedPostBody
from shaperoute_api.photo_posts import (
    MyPhotoPostBody,
    MyPhotoPostsBody,
    PhotoPostOrderRequestBody,
    PhotoPostRequestBody,
)
from shaperoute_api.push import Pusher
from shaperoute_api.reads import READS_HEADER

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
KEY = "p1a2b3c4d5e6f708"
OTHER_KEY = "p9a8b7c6d5e4f302"
Headers = dict[str, str]


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


# The app of part C says `photos` with what it reads today.
THIS_APP = f"{_load('reads.json')['this_app']},photos"
# One of today: everything but `photos`.
TODAY_APP = _load("reads.json")["this_app"]
PHOTO = _load("drawing-photo-request.json")


@pytest.fixture
def wall() -> WallClock:
    clock = WallClock()
    clock.t = DURING
    return clock


@pytest.fixture
def expo() -> FakeExpo:
    return FakeExpo()


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


@pytest.fixture
def client(database: Database, wall: WallClock, expo: FakeExpo) -> TestClient:
    app = create_app(
        FileSource(Path("unused.graphml")),
        accounts=Accounts(database, now=wall, hasher=FAST_HASHER),
    )
    pusher = Pusher(
        database,
        Expo(send=expo),
        run=lambda task: task(),
        later=lambda *_: None,
        clock=Clock(),
    )
    # The bell's list listens to the app's own pusher (notification_list.py).
    pusher.listeners.extend(app.state.pusher.listeners)
    app.state.pusher = pusher
    return TestClient(app)


def new_app(headers: Headers) -> Headers:
    """The headers of an app that reads posts of photos only."""
    return {**headers, READS_HEADER: THIS_APP}


def kept(
    client: TestClient, me: Headers, key: str = KEY, **changes: Any
) -> dict[str, Any]:
    body = {**_load("photo-post-request.json"), **changes}
    answer = client.put(f"/me/photo-posts/{key}", json=body, headers=me)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def with_photo(
    client: TestClient, me: Headers, n: int = 1, key: str = KEY
) -> dict[str, Any]:
    answer = client.put(f"/me/photo-posts/{key}/photos/{n}", json=PHOTO, headers=me)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def posted(client: TestClient, me: Headers, key: str = KEY, **changes: Any) -> str:
    """A post with one photo, so published: its id."""
    kept(client, me, key, **changes)
    return str(with_photo(client, me, key=key)["id"])


def feed_ids(client: TestClient, me: Headers, **query: Any) -> list[str]:
    answer = client.get("/feed", params=query, headers=me)
    assert answer.status_code == 200, answer.text
    return [post["id"] for post in answer.json()["posts"]]


def public_id(client: TestClient, me: Headers) -> str:
    return str(client.get("/me", headers=me).json()["public_id"])


def drawing_rows(database: Database, where: str = "true") -> list[dict[str, Any]]:
    with database.connect() as conn:
        return [
            dict(row)
            for row in conn.execute(
                "SELECT run_id, key, user_id, visibility, published_at, trackless"
                f" FROM drawings WHERE {where}"
            ).fetchall()
        ]


# --- The contract, without a database ---


def test_the_migration_is_there() -> None:
    assert "0080_photo_posts.sql" in [path.name for path in migrations()]


def test_the_requests_are_the_bodies() -> None:
    request = _load("photo-post-request.json")
    assert set(request) == set(PhotoPostRequestBody.model_fields)
    assert PhotoPostRequestBody.model_validate(request).visibility == "everyone"
    order = PhotoPostOrderRequestBody.model_validate(
        _load("photo-post-order-request.json")
    )
    assert order.order == ["photo:2", "photo:1"]


def test_the_answers_are_the_bodies() -> None:
    mine = _load("my-photo-post.json")
    assert set(mine) == set(MyPhotoPostBody.model_fields)
    one = _load("drawing-details-photos.json")
    assert set(one) == set(DrawingDetailBody.model_fields)
    detail = DrawingDetailBody.model_validate(one)
    assert (detail.source, detail.activity, detail.track) == ("photos", None, [])
    page = _load("feed-photos.json")
    assert set(page["posts"][0]) == set(FeedPostBody.model_fields)
    post = FeedBody.model_validate(page).posts[0]
    assert (post.source, post.activity, post.track_preview) == ("photos", None, [])
    # The same post in each, dated when it was published.
    assert mine["id"] == one["id"] == page["posts"][0]["id"]
    assert one["started_at"] == one["published_at"] == mine["published_at"]


@pytest.mark.parametrize("visibility", ["only_me", "public", None])
def test_only_everyone_or_the_followers_see_one(visibility: str | None) -> None:
    body = {**_load("photo-post-request.json"), "visibility": visibility}
    with pytest.raises(ValueError):
        PhotoPostRequestBody.model_validate(body)


@pytest.mark.parametrize(
    "order", [["drawing", "photo:1"], ["photo:1", "photo:1"], ["photo:11"]]
)
def test_an_order_names_photos_once_and_no_map(order: list[str]) -> None:
    with pytest.raises(ValueError):
        PhotoPostOrderRequestBody.model_validate({"order": order})


# --- Made, changed, deleted by its key ---


def test_a_post_is_made_once_and_changed_by_its_key(
    client: TestClient, database: Database
) -> None:
    ada = signed_up(client, "ada")
    first = kept(client, ada)
    assert first["key"] == KEY
    assert first["title"] == "Lake morning"
    assert first["visibility"] == "everyone"
    assert first["published_at"] is None
    assert first["photos"] == []
    again = kept(client, ada, title="Lake at dawn", visibility="followers")
    assert again["id"] == first["id"]
    assert (again["title"], again["visibility"]) == ("Lake at dawn", "followers")
    (row,) = drawing_rows(database)
    assert row["run_id"] is None
    assert row["key"] == KEY
    assert row["trackless"] is True
    mine = client.get(f"/me/photo-posts/{KEY}", headers=ada)
    assert mine.status_code == 200
    assert mine.json() == again


def test_two_accounts_may_use_the_same_key(client: TestClient) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    assert kept(client, ada)["id"] != kept(client, bob)["id"]
    assert client.get(f"/me/photo-posts/{OTHER_KEY}", headers=ada).status_code == 404


def test_its_fields_are_checked_as_a_drawing_s(client: TestClient) -> None:
    ada = signed_up(client, "ada")
    long_title = {**_load("photo-post-request.json"), "title": "x" * 61}
    answer = client.put(f"/me/photo-posts/{KEY}", json=long_title, headers=ada)
    assert answer.status_code == 422
    myself = {**_load("photo-post-request.json"), "tags": [public_id(client, ada)]}
    answer = client.put(f"/me/photo-posts/{KEY}", json=myself, headers=ada)
    assert answer.status_code == 422
    only_me = {**_load("photo-post-request.json"), "visibility": "only_me"}
    answer = client.put(f"/me/photo-posts/{KEY}", json=only_me, headers=ada)
    assert answer.status_code == 422


def test_it_is_published_with_its_first_photo(
    client: TestClient, wall: WallClock
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = kept(client, ada)["id"]
    # Without a photo nobody but its owner finds it: no empty post.
    assert client.get(f"/drawings/{post_id}", headers=new_app(bob)).status_code == 404
    assert feed_ids(client, new_app(bob)) == []
    assert feed_ids(client, new_app(ada)) == []
    own = client.get(f"/drawings/{post_id}", headers=new_app(ada))
    assert own.status_code == 200
    assert own.json()["published_at"] is None
    wall.t += timedelta(minutes=5)
    first = with_photo(client, ada)
    assert first["published_at"] is not None
    assert [photo["n"] for photo in first["photos"]] == [1]
    assert feed_ids(client, new_app(bob)) == [post_id]
    # A second photo, a minute later, does not publish it again.
    wall.t += timedelta(minutes=1)
    second = with_photo(client, ada, n=10)
    assert second["published_at"] == first["published_at"]
    assert [photo["n"] for photo in second["photos"]] == [1, 10]


def test_its_last_photo_gone_it_waits_again(client: TestClient) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = posted(client, ada)
    assert (
        client.delete(f"/me/photo-posts/{KEY}/photos/1", headers=ada).status_code == 204
    )
    assert client.get(f"/drawings/{post_id}", headers=new_app(bob)).status_code == 404
    assert (
        client.get(f"/me/photo-posts/{KEY}", headers=ada).json()["published_at"] is None
    )
    # Again, and an empty place: the same.
    assert (
        client.delete(f"/me/photo-posts/{KEY}/photos/1", headers=ada).status_code == 204
    )
    assert (
        client.delete(f"/me/photo-posts/{OTHER_KEY}/photos/1", headers=ada).status_code
        == 404
    )


def test_its_photos_are_ordered_without_a_map(client: TestClient) -> None:
    ada = signed_up(client, "ada")
    kept(client, ada)
    with_photo(client, ada, n=1)
    with_photo(client, ada, n=2)
    answer = client.put(
        f"/me/photo-posts/{KEY}/order",
        json=_load("photo-post-order-request.json"),
        headers=ada,
    )
    assert answer.status_code == 200, answer.text
    assert answer.json()["order"] == ["photo:2", "photo:1"]
    assert [photo["n"] for photo in answer.json()["photos"]] == [2, 1]
    with_map = client.put(
        f"/me/photo-posts/{KEY}/order", json={"order": ["drawing"]}, headers=ada
    )
    assert with_map.status_code == 422


def test_a_photo_or_an_order_needs_the_post(client: TestClient) -> None:
    ada = signed_up(client, "ada")
    photo = client.put(f"/me/photo-posts/{KEY}/photos/1", json=PHOTO, headers=ada)
    assert photo.status_code == 404
    order = client.put(
        f"/me/photo-posts/{KEY}/order", json={"order": ["photo:1"]}, headers=ada
    )
    assert order.status_code == 404


def test_a_post_is_deleted_with_all_it_has(
    client: TestClient, database: Database
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = posted(client, ada)
    reacted = client.put(
        f"/drawings/{post_id}/reaction", json={"kind": "fire"}, headers=bob
    )
    assert reacted.status_code == 200, reacted.text
    assert client.delete(f"/me/photo-posts/{KEY}", headers=ada).status_code == 204
    assert client.delete(f"/me/photo-posts/{KEY}", headers=ada).status_code == 204
    assert drawing_rows(database) == []
    with database.connect() as conn:
        for table in ("drawing_photos", "reactions"):
            row = conn.execute(f"SELECT count(*) AS n FROM {table}").fetchone()
            assert row is not None and row["n"] == 0, table
    assert client.get(f"/drawings/{post_id}", headers=new_app(bob)).status_code == 404


def test_the_list_answer_is_the_body() -> None:
    listed = _load("my-photo-posts.json")
    assert set(listed) == set(MyPhotoPostsBody.model_fields)
    body = MyPhotoPostsBody.model_validate(listed)
    # The one still waiting for a photo, then the one published.
    assert [post.published_at is None for post in body.photo_posts] == [True, False]
    assert set(listed["photo_posts"][0]) == set(MyPhotoPostBody.model_fields)


def test_an_account_lists_its_posts_by_key(client: TestClient, wall: WallClock) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    first = posted(client, ada)
    wall.t += timedelta(hours=1)
    second = posted(client, ada, key=OTHER_KEY, title="Later")
    wall.t += timedelta(hours=1)
    waiting = kept(client, ada, key="p0waiting0001", title="No photo yet")
    kept(client, bob)
    answer = client.get("/me/photo-posts", headers=ada)
    assert answer.status_code == 200, answer.text
    listed = answer.json()["photo_posts"]
    # Its own only, the newest first; the key of each, found by its id.
    assert [post["id"] for post in listed] == [waiting["id"], second, first]
    assert [post["key"] for post in listed] == ["p0waiting0001", OTHER_KEY, KEY]
    assert listed[0]["published_at"] is None
    assert [photo["n"] for photo in listed[1]["photos"]] == [1]
    assert (
        client.get("/me/photo-posts", headers=bob).json()["photo_posts"][0]["key"]
        == KEY
    )
    assert client.get("/me/photo-posts").status_code == 401


def test_a_post_is_not_an_activity(client: TestClient) -> None:
    ada = signed_up(client, "ada")
    posted(client, ada)
    activities = client.get("/me/activities", headers=new_app(ada)).json()
    assert activities["activities"] == []
    assert client.get("/me/drawings", headers=new_app(ada)).json()["drawings"] == []
    # Its key is not a run's.
    assert client.get(f"/me/activities/{KEY}", headers=ada).status_code == 404


# --- What an app reads of it ---


def test_it_is_answered_as_a_drawing_without_a_run(client: TestClient) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = posted(client, ada)
    one = client.get(f"/drawings/{post_id}", headers=new_app(bob)).json()
    assert one["source"] == "photos"
    assert one["activity"] is None
    assert (one["distance_m"], one["duration_s"]) == (0, 0)
    assert one["started_at"] == one["published_at"]
    assert one["track"] == []
    assert one["stats"] is None
    for field in ("place", "shape", "word", "style", "route_title", "score"):
        assert one[field] is None, field
    assert one["linkable"] is False
    assert one["author"]["username"] == "ada"
    (post,) = client.get("/feed", headers=new_app(bob)).json()["posts"]
    assert post["track_preview"] == []
    assert post["source"] == "photos"


Reader = Callable[[TestClient, Headers, str, str], int]


def _drawing(client: TestClient, me: Headers, post_id: str, _owner: str) -> int:
    return 1 if client.get(f"/drawings/{post_id}", headers=me).status_code == 200 else 0


def _feed(client: TestClient, me: Headers, post_id: str, _owner: str) -> int:
    return feed_ids(client, me).count(post_id)


def _profile(client: TestClient, me: Headers, post_id: str, owner: str) -> int:
    page = client.get(f"/users/{owner}/drawings", headers=me).json()
    return [drawing["id"] for drawing in page["drawings"]].count(post_id)


def _photos(client: TestClient, me: Headers, post_id: str, owner: str) -> int:
    page = client.get(f"/users/{owner}/photos", headers=me).json()
    return [photo["drawing_id"] for photo in page["photos"]].count(post_id)


@pytest.mark.parametrize("read", [_drawing, _feed, _profile, _photos])
def test_only_an_app_that_reads_photos_receives_it(
    client: TestClient, read: Reader
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = posted(client, ada)
    owner = public_id(client, ada)
    assert read(client, new_app(bob), post_id, owner) == 1
    assert read(client, {**bob, READS_HEADER: TODAY_APP}, post_id, owner) == 0
    assert read(client, bob, post_id, owner) == 0


def test_a_profile_lists_it_by_when_it_was_published(
    client: TestClient, wall: WallClock
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    first = posted(client, ada)
    wall.t += timedelta(hours=1)
    second = posted(client, ada, key=OTHER_KEY, title="Later")
    owner = public_id(client, ada)
    page = client.get(
        f"/users/{owner}/drawings", params={"limit": 1}, headers=new_app(bob)
    ).json()
    assert [drawing["id"] for drawing in page["drawings"]] == [second]
    assert page["total"] == 2
    rest = client.get(
        f"/users/{owner}/drawings",
        params={"limit": 1, "cursor": page["next"]},
        headers=new_app(bob),
    ).json()
    assert [drawing["id"] for drawing in rest["drawings"]] == [first]
    assert rest["next"] is None
    profile = client.get(f"/users/{owner}", headers=new_app(bob)).json()
    assert profile["drawings"] == 2


def test_the_post_of_a_night_is_not_one_of_photos(
    client: TestClient, database: Database
) -> None:
    # A night of sleep is a drawing without a run too (TASK-467 part E,
    # migration 0082): none of these endpoints reads, changes or deletes it.
    ada = signed_up(client, "ada")
    night = client.put(
        "/me/sleep-posts/2026-09-21", json=_load("sleep-post-request.json"), headers=ada
    )
    assert night.status_code == 200, night.text
    sleep_key = "sleep20260921"
    assert client.get("/me/photo-posts", headers=ada).json()["photo_posts"] == []
    assert client.get(f"/me/photo-posts/{sleep_key}", headers=ada).status_code == 404
    taken = client.put(
        f"/me/photo-posts/{sleep_key}",
        json=_load("photo-post-request.json"),
        headers=ada,
    )
    assert taken.status_code == 409
    photo = client.put(f"/me/photo-posts/{sleep_key}/photos/1", json=PHOTO, headers=ada)
    assert photo.status_code == 404
    assert client.delete(f"/me/photo-posts/{sleep_key}", headers=ada).status_code == 204
    (row,) = drawing_rows(database)
    assert row["key"] == sleep_key
