"""A night of sleep as a post of its own (TASK-467 part E, ADR-0380
precisazione E), in a real PostgreSQL: a drawing without a run that carries
its night, published as it is made, one a night; seen as any post by who
may see it, and only by an app that reads `sleep`; its night kept on the
server only while something publishes it. The app and the helpers are
test_photo_posts.py's."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from test_photo_posts import (
    THIS_APP as PHOTOS_APP,
)
from test_photo_posts import (
    TODAY_APP,
    Headers,
    _load,
    client,  # noqa: F401 (the fixtures of test_photo_posts.py)
    database,  # noqa: F401 (the fixtures of test_photo_posts.py)
    drawing_rows,
    expo,  # noqa: F401 (the fixtures of test_photo_posts.py)
    feed_ids,
    public_id,
    wall,  # noqa: F401 (the fixtures of test_photo_posts.py)
)
from test_photo_posts import (
    kept as photo_post_kept,
)
from test_photo_posts_seen import followed
from test_push import signed_up
from test_strava import WallClock

from shaperoute_api.db import Database, migrations
from shaperoute_api.feed import FeedBody, FeedPostBody
from shaperoute_api.reads import READS_HEADER
from shaperoute_api.sleep_posts import (
    MySleepPostBody,
    SleepPostRequestBody,
    key_of,
)

# The night of the examples: the day the person woke up.
NIGHT = "2026-09-21"
OTHER_NIGHT = "2026-09-22"
SLEEP_APP = f"{TODAY_APP},sleep"


def sleep_app(headers: Headers) -> Headers:
    """The headers of an app that reads the posts of a night of sleep."""
    return {**headers, READS_HEADER: SLEEP_APP}


def request(**changes: Any) -> dict[str, Any]:
    return {**_load("sleep-post-request.json"), **changes}


def published(
    client: TestClient,  # noqa: F811
    me: Headers,
    night: str = NIGHT,
    **changes: Any,
) -> dict[str, Any]:
    answer = client.put(f"/me/sleep-posts/{night}", json=request(**changes), headers=me)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def nights(database: Database) -> list[dict[str, Any]]:  # noqa: F811
    with database.connect() as conn:
        return [
            dict(row)
            for row in conn.execute(
                "SELECT night::text, score, shared FROM sleep_nights ORDER BY night"
            )
        ]


def seen(client: TestClient, me: Headers, post_id: str) -> bool:  # noqa: F811
    return client.get(f"/drawings/{post_id}", headers=sleep_app(me)).status_code == 200


# --- The bodies ---


def test_the_migration_is_there() -> None:
    assert "0082_sleep_posts.sql" in [path.name for path in migrations()]


def test_the_examples_are_the_bodies() -> None:
    asked = SleepPostRequestBody(**_load("sleep-post-request.json"))
    assert asked.visibility == "everyone"
    post = MySleepPostBody(**_load("sleep-post.json"))
    assert post.model_dump(mode="json", exclude_none=True) == _load("sleep-post.json")


def test_the_feed_example_is_the_body() -> None:
    page = _load("feed-sleep.json")
    (row,) = page["posts"]
    assert set(row) == set(FeedPostBody.model_fields)
    post = FeedBody.model_validate(page).posts[0]
    assert (post.source, post.activity) == ("sleep", None)
    assert (post.track_preview, post.photos) == ([], [])
    assert (post.distance_m, post.duration_s) == (0, 0)
    assert row["sleep"] == _load("sleep-summary.json")
    # The same post as its owner reads it, dated when it was published.
    mine = _load("sleep-post.json")
    assert (row["id"], row["visibility"]) == (mine["id"], mine["visibility"])
    assert row["started_at"] == row["published_at"] == mine["published_at"]


@pytest.mark.parametrize("visibility", ["only_me", "nobody", None])
def test_only_everyone_or_the_followers_see_one(visibility: str | None) -> None:
    # Never «Only me»: only what is published reaches the server; and who
    # sees it is always said.
    body = request(visibility=visibility)
    if visibility is None:
        del body["visibility"]
    with pytest.raises(ValidationError):
        SleepPostRequestBody(**body)


def test_no_hour_of_going_to_bed_or_of_waking_is_taken() -> None:
    with pytest.raises(ValidationError):
        SleepPostRequestBody(**request(bedtime="23:10"))


def test_the_key_of_a_night_is_one_a_phone_could_make() -> None:
    assert key_of(MySleepPostBody(**_load("sleep-post.json")).night) == "sleep20260921"


# --- Made, changed, deleted ---


def test_a_post_is_made_once_a_night_and_published_at_once(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    first = published(client, ada)
    assert first["night"] == NIGHT
    assert (first["score"], first["asleep_min"], first["awake_min"]) == (82, 452, 18)
    assert first["stages"] == {"rem_min": 96, "light_min": 268, "deep_min": 72}
    assert first["visibility"] == "everyone"
    assert first["published_at"] is not None
    assert client.get(f"/me/sleep-posts/{NIGHT}", headers=ada).json() == first

    # Sent again, the same post: its figures and who sees it of the last
    # time, and it is not published again.
    wall.t += timedelta(hours=1)
    again = published(client, ada, score=71, visibility="followers")
    assert again["id"] == first["id"]
    assert again["published_at"] == first["published_at"]
    assert (again["score"], again["visibility"]) == (71, "followers")
    (row,) = drawing_rows(database)
    assert row["run_id"] is None and row["key"] == "sleep20260921"
    assert nights(database) == [{"night": NIGHT, "score": 71, "shared": False}]


def test_a_night_without_stages_is_a_post_too(client: TestClient) -> None:  # noqa: F811
    ada = signed_up(client, "ada")
    body = request()
    del body["stages"]
    answer = client.put(f"/me/sleep-posts/{NIGHT}", json=body, headers=ada)
    assert answer.status_code == 200
    assert "stages" not in answer.json()


def test_each_night_has_its_post_and_each_account_its_own(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    one = published(client, ada)
    two = published(client, ada, night=OTHER_NIGHT)
    theirs = published(client, bob)
    assert len({one["id"], two["id"], theirs["id"]}) == 3
    listed = feed_ids(client, sleep_app(ada), filter="all")
    assert sorted(listed) == sorted([one["id"], two["id"], theirs["id"]])


def test_a_day_that_is_no_night_is_refused(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    ahead = (wall.t + timedelta(days=3)).date().isoformat()
    for night in (ahead, "1999-01-01"):
        answer = client.put(f"/me/sleep-posts/{night}", json=request(), headers=ada)
        assert answer.status_code == 422, night
    assert (
        client.put("/me/sleep-posts/last", json=request(), headers=ada).status_code
        == 422
    )
    assert drawing_rows(database) == [] and nights(database) == []


def test_a_post_of_photos_with_its_key_is_not_turned_into_one(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    photos = photo_post_kept(client, ada, key="sleep20260921")
    answer = client.put(f"/me/sleep-posts/{NIGHT}", json=request(), headers=ada)
    assert answer.status_code == 409
    (row,) = drawing_rows(database)
    assert row["key"] == "sleep20260921"
    still = client.get("/me/photo-posts/sleep20260921", headers=ada)
    assert still.status_code == 200 and still.json()["id"] == photos["id"]
    # And the night refused with it is not kept.
    assert nights(database) == []
    assert client.get(f"/me/sleep-posts/{NIGHT}", headers=ada).status_code == 404


def test_deleted_it_takes_its_night_off_the_server(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    published(client, ada)
    for _ in range(2):
        assert client.delete(f"/me/sleep-posts/{NIGHT}", headers=ada).status_code == 204
    assert drawing_rows(database) == [] and nights(database) == []
    assert client.get(f"/me/sleep-posts/{NIGHT}", headers=ada).status_code == 404


def test_a_night_on_the_profile_outlives_its_post_and_the_other_way(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    shared = client.put(
        f"/me/sleep/{NIGHT}",
        json={**_load("sleep-night-request.json"), "shared": True},
        headers=ada,
    )
    assert shared.status_code == 200
    published(client, ada)
    # The post changes neither the profile's switch...
    assert nights(database)[0]["shared"] is True
    # ...nor does «Stop sharing» take the post's night away.
    assert client.delete("/me/sleep/shared", headers=ada).status_code == 204
    assert nights(database) == [{"night": NIGHT, "score": 82, "shared": False}]
    assert client.get(f"/me/sleep-posts/{NIGHT}", headers=ada).status_code == 200
    profile = client.get(f"/users/{public_id(client, ada)}/sleep", headers=ada)
    assert profile.status_code == 404

    # Back on the profile, the post deleted leaves the night there.
    again = client.patch(f"/me/sleep/{NIGHT}", json={"shared": True}, headers=ada)
    assert again.status_code == 200
    assert client.delete(f"/me/sleep-posts/{NIGHT}", headers=ada).status_code == 204
    assert nights(database) == [{"night": NIGHT, "score": 82, "shared": True}]


def test_a_night_forgotten_takes_its_post_with_it(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    published(client, ada)
    assert client.delete(f"/me/sleep/{NIGHT}", headers=ada).status_code == 204
    assert drawing_rows(database) == [] and nights(database) == []


def test_a_post_deleted_by_anyone_leaves_no_night(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    # As moderation would: the row goes, and the trigger takes the night.
    ada = signed_up(client, "ada")
    post = published(client, ada)
    with database.connect() as conn:
        conn.execute("DELETE FROM drawings WHERE id = %s", (post["id"],))
    assert nights(database) == []


def test_a_deleted_account_leaves_nothing(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    published(client, ada)
    deleted = client.request(
        "DELETE", "/me", json={"password": _load("sign-up-request.json")["password"]},
        headers=ada,
    )  # fmt: skip
    assert deleted.status_code == 204, deleted.text
    assert drawing_rows(database) == [] and nights(database) == []


def test_it_is_not_an_activity(client: TestClient) -> None:  # noqa: F811
    ada = signed_up(client, "ada")
    published(client, ada)
    activities = client.get("/me/activities", headers=sleep_app(ada)).json()
    assert activities["activities"] == []
    assert client.get("/me/activities/sleep20260921", headers=ada).status_code == 404


def test_every_request_needs_a_token(client: TestClient) -> None:  # noqa: F811
    assert client.get(f"/me/sleep-posts/{NIGHT}").status_code == 401
    assert client.put(f"/me/sleep-posts/{NIGHT}", json=request()).status_code == 401
    assert client.delete(f"/me/sleep-posts/{NIGHT}").status_code == 401


# --- Who reads it, and what ---


def test_it_is_answered_as_a_drawing_with_its_night(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = published(client, ada)["id"]
    one = client.get(f"/drawings/{post_id}", headers=sleep_app(bob)).json()
    assert one["source"] == "sleep"
    assert one["sleep"] == _load("sleep-summary.json")
    assert one["activity"] is None
    assert (one["distance_m"], one["duration_s"]) == (0, 0)
    assert one["started_at"] == one["published_at"]
    assert one["track"] == [] and one["photos"] == []
    assert one["author"]["username"] == "ada"
    (post,) = client.get("/feed", headers=sleep_app(bob)).json()["posts"]
    assert post["id"] == post_id
    assert post["source"] == "sleep"
    assert post["sleep"] == _load("sleep-summary.json")
    # The row is the example's, but for what is this post's own; the Feed
    # adds its reactions and comments, as to every drawing.
    (example,) = _load("feed-sleep.json")["posts"]
    own = ("id", "started_at", "published_at", "author")
    assert set(post) - set(example) == {"reactions", "comments"}
    row = {name: post[name] for name in example}
    assert {**row, **{name: example[name] for name in own}} == example
    # No hour of going to bed or of waking, anywhere in what others read.
    assert "T" not in str(post["sleep"]) and ":" not in str(post["sleep"]["night"])
    profile = client.get(
        f"/users/{public_id(client, ada)}/drawings", headers=sleep_app(bob)
    ).json()
    assert [drawing["id"] for drawing in profile["drawings"]] == [post_id]


@pytest.mark.parametrize("reads", [None, TODAY_APP, PHOTOS_APP])
def test_an_app_that_does_not_read_sleep_never_receives_it(
    client: TestClient,  # noqa: F811
    reads: str | None,
) -> None:
    # The app of before the header, today's, and the one of the posts of
    # photos only: to each the post is not there, its author's too.
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = published(client, ada)["id"]
    for me in (ada, bob):
        headers = me if reads is None else {**me, READS_HEADER: reads}
        assert client.get(f"/drawings/{post_id}", headers=headers).status_code == 404
        assert feed_ids(client, headers, filter="all") == []
        profile = client.get(
            f"/users/{public_id(client, ada)}/drawings", headers=headers
        ).json()
        assert profile["drawings"] == []


def test_an_app_of_both_reads_both(client: TestClient) -> None:  # noqa: F811
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    night_id = published(client, ada)["id"]
    photos = photo_post_kept(client, ada)
    both = {**bob, READS_HEADER: f"{PHOTOS_APP},sleep"}
    # The post of photos waits for its first photo: only the night is out.
    assert feed_ids(client, both, filter="all") == [night_id]
    assert client.get(f"/drawings/{photos['id']}", headers=both).status_code == 404
    # And the app of the photos alone gets neither.
    assert feed_ids(client, {**bob, READS_HEADER: PHOTOS_APP}, filter="all") == []


def test_one_for_the_followers_is_seen_by_them_only(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob, cyd = (signed_up(client, name) for name in ("ada", "bob", "cyd"))
    followed(client, bob, ada)
    post_id = published(client, ada, visibility="followers")["id"]
    assert seen(client, ada, post_id)
    assert seen(client, bob, post_id)
    assert not seen(client, cyd, post_id)
    assert feed_ids(client, sleep_app(bob), filter="following") == [post_id]
    assert feed_ids(client, sleep_app(cyd), filter="all") == []


def test_a_block_either_way_keeps_it_apart(client: TestClient) -> None:  # noqa: F811
    ada, bob, cyd = (signed_up(client, name) for name in ("ada", "bob", "cyd"))
    post_id = published(client, ada)["id"]
    blocked = client.put(f"/users/{public_id(client, bob)}/block", headers=ada)
    assert blocked.status_code == 204
    blocks = client.put(f"/users/{public_id(client, ada)}/block", headers=cyd)
    assert blocks.status_code == 204
    for other in (bob, cyd):
        assert not seen(client, other, post_id)
        assert feed_ids(client, sleep_app(other)) == []


def test_it_is_reacted_to_and_commented_on_as_a_post(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = published(client, ada)["id"]
    reacted = client.put(
        f"/drawings/{post_id}/reaction", json={"kind": "fire"}, headers=sleep_app(bob)
    )
    assert reacted.status_code in (200, 204), reacted.text
    report = {**_load("report-request.json"), "id": post_id}
    assert client.post("/reports", json=report, headers=bob).status_code == 204


def test_the_night_of_a_run_is_still_shown_only_while_its_owner_shows_it(
    client: TestClient,  # noqa: F811
) -> None:
    # The seen drawing reads the night from the run or from the post: a
    # post of a night never opens the night a run hides.
    ada = signed_up(client, "ada")
    post_id = published(client, ada)["id"]
    one = client.get(f"/drawings/{post_id}", headers=sleep_app(ada)).json()
    assert one["sleep"]["night"] == NIGHT
    assert client.get(f"/drawings/{post_id}/sleep", headers=ada).status_code == 404
