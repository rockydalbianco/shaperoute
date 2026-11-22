"""A gym plan as a post (TASK-485, ADR-0394), in a real PostgreSQL: a
drawing without a run that carries a copy of the plan, published as it is
made; the copy kept as it was posted, without what is its owner's own; seen
as any post by who may see it, and only by an app that reads `plans`;
never reached by the routes of the posts of photos only. The app and the
helpers are test_photo_posts.py's."""

from __future__ import annotations

import copy
from datetime import timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from test_photo_posts import (
    PHOTO,
    TODAY_APP,
    Headers,
    _load,
    client,  # noqa: F401 (the fixtures of test_photo_posts.py)
    database,  # noqa: F401 (the fixtures of test_photo_posts.py)
    drawing_rows,
    expo,  # noqa: F401 (the fixtures of test_photo_posts.py)
    feed_ids,
    posted,
    public_id,
    wall,  # noqa: F401 (the fixtures of test_photo_posts.py)
)
from test_photo_posts import (
    THIS_APP as PHOTOS_APP,
)
from test_photo_posts import (
    kept as photo_post_kept,
)
from test_photo_posts_seen import followed
from test_push import signed_up
from test_strava import WallClock

from shaperoute_api.db import Database, migrations
from shaperoute_api.gym_plans import GymPlanPostedBody
from shaperoute_api.plan_posts import MyPlanPostBody, PlanPostRequestBody
from shaperoute_api.reads import READS_HEADER

KEY = "pp7k2m9q4x1c"
PLANS_APP = f"{TODAY_APP},plans"
SLEEP_APP = f"{TODAY_APP},sleep"


def plans_app(headers: Headers) -> Headers:
    """The headers of an app that reads the gym plans posted."""
    return {**headers, READS_HEADER: PLANS_APP}


def request(**changes: Any) -> dict[str, Any]:
    return {**copy.deepcopy(_load("plan-post-request.json")), **changes}


def plan(**changes: Any) -> dict[str, Any]:
    return {**request()["plan"], **changes}


def published(
    client: TestClient,  # noqa: F811
    me: Headers,
    key: str = KEY,
    **changes: Any,
) -> dict[str, Any]:
    answer = client.put(f"/me/plan-posts/{key}", json=request(**changes), headers=me)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def seen(client: TestClient, me: Headers, post_id: str) -> bool:  # noqa: F811
    return client.get(f"/drawings/{post_id}", headers=plans_app(me)).status_code == 200


def guided(index: int) -> dict[str, Any]:
    """A plan of gym-plans.json as the phone would post it: without its key,
    place, time, first day and paces."""
    one = copy.deepcopy(_load("gym-plans.json")["plans"][index])
    for field in ("key", "position", "updated_at"):
        del one[field]
    if "program" in one:
        del one["program"]["starts_on"]
        one["program"].pop("runner", None)
        if "target" in one["program"]:
            one["program"]["target"].pop("on", None)
    return dict(one)


# --- The bodies ---


def test_the_migration_is_there() -> None:
    assert "0084_plan_posts.sql" in [path.name for path in migrations()]


def test_the_examples_are_the_bodies() -> None:
    asked = PlanPostRequestBody(**_load("plan-post-request.json"))
    assert asked.visibility == "everyone"
    assert asked.plan.model_dump(mode="json", exclude_none=True) == request()["plan"]
    mine = MyPlanPostBody(**_load("my-plan-post.json"))
    assert mine.model_dump(mode="json") == _load("my-plan-post.json")
    assert mine.plan == request()["plan"]


@pytest.mark.parametrize("index", range(6))
def test_every_kind_of_plan_can_be_posted(index: int) -> None:
    # One workout, the weeks of the guide, run days, a target by bike and a
    # hike's climb.
    GymPlanPostedBody(**guided(index))


@pytest.mark.parametrize("visibility", ["only_me", "nobody", None])
def test_only_everyone_or_the_followers_see_one(visibility: str | None) -> None:
    body = request(visibility=visibility)
    if visibility is None:
        del body["visibility"]
    with pytest.raises(ValidationError):
        PlanPostRequestBody(**body)


def test_a_plan_is_needed() -> None:
    body = request()
    del body["plan"]
    with pytest.raises(ValidationError):
        PlanPostRequestBody(**body)


@pytest.mark.parametrize(
    "owners",
    [
        {"starts_on": "2026-09-21"},
        {"runner": {"pace_10k_s": 330, "long_m": 8000}},
        {"target": {"sport": "run", "distance_m": 10000, "on": "2026-12-06"}},
    ],
    ids=["first day", "paces", "date of the target"],
)
def test_what_is_its_owner_s_own_is_refused(owners: dict[str, Any]) -> None:
    # The privacy names its name, goal, days, weeks, exercises and kg only.
    program = {**request()["plan"]["program"], **owners}
    with pytest.raises(ValidationError):
        PlanPostRequestBody(**request(plan=plan(program=program)))


def test_its_exercises_are_checked_as_a_plan_s() -> None:
    sessions = copy.deepcopy(request()["plan"]["program"]["sessions"])
    sessions[0]["items"][0]["exercise"] = "no_such_exercise"
    program = {**request()["plan"]["program"], "sessions": sessions}
    with pytest.raises(ValidationError):
        PlanPostRequestBody(**request(plan=plan(program=program)))
    with pytest.raises(ValidationError):
        PlanPostRequestBody(**request(plan=plan(days=[1, 1])))


# --- Made, changed, deleted ---


def test_a_post_is_made_once_and_published_at_once(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    first = published(client, ada)
    assert first["key"] == KEY
    assert first["plan"] == request()["plan"]
    assert first["visibility"] == "everyone"
    assert first["description"] == request()["description"]
    assert first["published_at"] is not None
    assert client.get(f"/me/plan-posts/{KEY}", headers=ada).json() == first
    (row,) = drawing_rows(database)
    assert row["run_id"] is None and row["trackless"] is True

    # Sent again, the same post: its line and who sees it change, the plan
    # stays as it was posted, and it is not published again.
    wall.t += timedelta(hours=1)
    again = published(
        client,
        ada,
        visibility="followers",
        description="Week 3 now.",
        plan=plan(name="Lift and run, changed"),
    )
    assert again["id"] == first["id"]
    assert again["published_at"] == first["published_at"]
    assert (again["visibility"], again["description"]) == ("followers", "Week 3 now.")
    assert again["plan"] == first["plan"]


def test_its_line_is_checked_as_a_drawing_s(client: TestClient) -> None:  # noqa: F811
    ada = signed_up(client, "ada")
    too_long = client.put(
        f"/me/plan-posts/{KEY}", json=request(description="x" * 501), headers=ada
    )
    assert too_long.status_code == 422
    empty = published(client, ada, description="   ")
    assert empty["description"] is None


def test_the_plan_changed_or_deleted_leaves_the_post_as_it_was(
    client: TestClient,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    gym = {**request()["plan"], "updated_at": "2026-09-21T18:00:00Z"}
    gym["program"] = {**gym["program"], "starts_on": "2026-09-21"}
    assert client.put("/me/gym-plans/pl0000000001", json=gym, headers=ada).is_success
    post = published(client, ada)
    assert client.delete("/me/gym-plans/pl0000000001", headers=ada).status_code == 204
    one = client.get(f"/drawings/{post['id']}", headers=plans_app(ada)).json()
    assert one["plan"] == request()["plan"]


def test_use_this_plan_makes_a_plan_of_its_own(
    client: TestClient,  # noqa: F811
) -> None:
    # The phone copies the plan of the post into the plans of whoever sees
    # it, kg and all, with a new key and its own first day: the route of the
    # plans, no route of its own.
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post = published(client, ada)
    shown = client.get(f"/drawings/{post['id']}", headers=plans_app(bob)).json()
    copied = {**shown["plan"], "updated_at": "2026-09-22T07:00:00Z"}
    copied["program"] = {**copied["program"], "starts_on": "2026-09-28"}
    answer = client.put("/me/gym-plans/plbobcopy001", json=copied, headers=bob)
    assert answer.status_code == 201, answer.text
    (mine,) = client.get("/me/gym-plans", headers=bob).json()["plans"]
    assert mine["program"]["sessions"][0]["items"][0]["load_kg"] == 80
    assert client.get("/me/gym-plans", headers=ada).json()["plans"] == []


def test_deleted_it_is_gone(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    published(client, ada)
    for _ in range(2):
        assert client.delete(f"/me/plan-posts/{KEY}", headers=ada).status_code == 204
    assert drawing_rows(database) == []
    assert client.get(f"/me/plan-posts/{KEY}", headers=ada).status_code == 404


def test_each_account_has_its_own_keys(client: TestClient) -> None:  # noqa: F811
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    assert published(client, ada)["id"] != published(client, bob)["id"]


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
    assert drawing_rows(database) == []


def test_it_is_not_an_activity(client: TestClient) -> None:  # noqa: F811
    ada = signed_up(client, "ada")
    published(client, ada)
    activities = client.get("/me/activities", headers=plans_app(ada)).json()
    assert activities["activities"] == []
    assert client.get(f"/me/activities/{KEY}", headers=ada).status_code == 404


def test_every_request_needs_a_token(client: TestClient) -> None:  # noqa: F811
    assert client.get(f"/me/plan-posts/{KEY}").status_code == 401
    assert client.put(f"/me/plan-posts/{KEY}", json=request()).status_code == 401
    assert client.delete(f"/me/plan-posts/{KEY}").status_code == 401


# --- The other posts without a run ---


def test_a_post_of_photos_with_its_key_is_not_turned_into_one(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    photos = photo_post_kept(client, ada, key=KEY)
    answer = client.put(f"/me/plan-posts/{KEY}", json=request(), headers=ada)
    assert answer.status_code == 409
    assert client.get(f"/me/plan-posts/{KEY}", headers=ada).status_code == 404
    still = client.get(f"/me/photo-posts/{KEY}", headers=ada)
    assert still.status_code == 200 and still.json()["id"] == photos["id"]
    assert len(drawing_rows(database)) == 1


def test_the_routes_of_the_photos_never_reach_it(
    client: TestClient,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    post = published(client, ada)
    assert client.get(f"/me/photo-posts/{KEY}", headers=ada).status_code == 404
    assert client.get("/me/photo-posts", headers=ada).json()["photo_posts"] == []
    changed = client.put(
        f"/me/photo-posts/{KEY}", json=_load("photo-post-request.json"), headers=ada
    )
    assert changed.status_code == 409
    photo = client.put(f"/me/photo-posts/{KEY}/photos/1", json=PHOTO, headers=ada)
    assert photo.status_code == 404
    assert client.delete(f"/me/photo-posts/{KEY}", headers=ada).status_code == 204
    assert client.get(f"/me/plan-posts/{KEY}", headers=ada).json() == post


def test_the_post_of_a_night_is_not_reached_either(
    client: TestClient,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    night = client.put(
        "/me/sleep-posts/2026-09-21",
        json={**_load("sleep-post-request.json")},
        headers=ada,
    )
    assert night.status_code == 200, night.text
    answer = client.put("/me/plan-posts/sleep20260921", json=request(), headers=ada)
    assert answer.status_code == 409
    assert client.get("/me/sleep-posts/2026-09-21", headers=ada).status_code == 200


# --- Who reads it, and what ---


def test_it_is_answered_as_a_drawing_with_its_plan(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = published(client, ada)["id"]
    one = client.get(f"/drawings/{post_id}", headers=plans_app(bob)).json()
    assert one["source"] == "plan"
    assert one["plan"] == request()["plan"]
    assert one["description"] == request()["description"]
    assert one["activity"] is None and one["title"] is None
    assert (one["distance_m"], one["duration_s"]) == (0, 0)
    assert one["started_at"] == one["published_at"]
    assert one["track"] == [] and one["photos"] == []
    assert one["linkable"] is False and one["sleep"] is None
    assert one["author"]["username"] == "ada"
    (post,) = client.get("/feed", headers=plans_app(bob)).json()["posts"]
    assert (post["id"], post["source"]) == (post_id, "plan")
    assert post["plan"] == request()["plan"]
    profile = client.get(
        f"/users/{public_id(client, ada)}/drawings", headers=plans_app(bob)
    ).json()
    assert [drawing["id"] for drawing in profile["drawings"]] == [post_id]


def test_the_other_posts_have_no_plan(client: TestClient) -> None:  # noqa: F811
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    photos_id = posted(client, ada, key="photos000001")
    both = {**bob, READS_HEADER: f"{PHOTOS_APP},plans"}
    one = client.get(f"/drawings/{photos_id}", headers=both).json()
    assert (one["source"], one["plan"]) == ("photos", None)


@pytest.mark.parametrize("reads", [None, TODAY_APP, PHOTOS_APP, SLEEP_APP])
def test_an_app_that_does_not_read_plans_never_receives_it(
    client: TestClient,  # noqa: F811
    reads: str | None,
) -> None:
    # The app of before the header, today's, the one of the posts of photos
    # only and the one of the nights: to each the post is not there, its
    # author's too.
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
    plan_id = published(client, ada)["id"]
    photos_id = posted(client, ada, key="photos000001")
    both = {**bob, READS_HEADER: f"{PHOTOS_APP},plans"}
    assert sorted(feed_ids(client, both, filter="all")) == sorted([plan_id, photos_id])
    # The app of the photos alone gets only the photos; the one of the plans
    # alone only the plan.
    photos_only = {**bob, READS_HEADER: PHOTOS_APP}
    assert feed_ids(client, photos_only, filter="all") == [photos_id]
    assert feed_ids(client, plans_app(bob), filter="all") == [plan_id]


def test_one_for_the_followers_is_seen_by_them_only(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob, cyd = (signed_up(client, name) for name in ("ada", "bob", "cyd"))
    followed(client, bob, ada)
    post_id = published(client, ada, visibility="followers")["id"]
    assert seen(client, ada, post_id)
    assert seen(client, bob, post_id)
    assert not seen(client, cyd, post_id)
    assert feed_ids(client, plans_app(bob), filter="following") == [post_id]
    assert feed_ids(client, plans_app(cyd), filter="all") == []


def test_a_block_either_way_keeps_it_apart(client: TestClient) -> None:  # noqa: F811
    ada, bob, cyd = (signed_up(client, name) for name in ("ada", "bob", "cyd"))
    post_id = published(client, ada)["id"]
    blocked = client.put(f"/users/{public_id(client, bob)}/block", headers=ada)
    assert blocked.status_code == 204
    blocks = client.put(f"/users/{public_id(client, ada)}/block", headers=cyd)
    assert blocks.status_code == 204
    for other in (bob, cyd):
        assert not seen(client, other, post_id)
        assert feed_ids(client, plans_app(other)) == []


def test_it_is_reacted_to_and_reported_as_a_post(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    post_id = published(client, ada)["id"]
    reacted = client.put(
        f"/drawings/{post_id}/reaction", json={"kind": "fire"}, headers=plans_app(bob)
    )
    assert reacted.status_code in (200, 204), reacted.text
    report = {**_load("report-request.json"), "id": post_id}
    assert client.post("/reports", json=report, headers=bob).status_code == 204
