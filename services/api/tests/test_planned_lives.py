"""The planned lives and the Feed's row of lives (TASK-468 part A2a,
ADR-0381), in a real PostgreSQL: made in advance, seen by whom they are
for, started within their hours as a live share, tied to the post they
became; the row of one's own and the followed accounts' lives."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from test_drawings import (
    WallClock,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    published,
    saved,
    signed_up,
    wall,  # noqa: F401
)

from shaperoute_api.db import Database
from shaperoute_api.planned_lives import (
    MAX_UPCOMING,
    LiveItemBody,
    LivesPageBody,
    PlannedLiveRequestBody,
)

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
NOW = datetime(2026, 11, 14, 8, 0, tzinfo=UTC)
# The example race: the next day at 09:00 in Milan.
RACE = datetime(2026, 11, 15, 8, 0, tzinfo=UTC)
HOUR = timedelta(hours=1)


def fixture(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


@pytest.fixture(autouse=True)
def at_now(wall: WallClock) -> None:  # noqa: F811
    wall.t = NOW


def person(app: TestClient, name: str) -> Headers:
    return signed_up(app, email=f"{name}@example.com", username=name)


def pid(app: TestClient, headers: Headers) -> str:
    return str(app.get("/me", headers=headers).json()["public_id"])


def follow(app: TestClient, follower: Headers, followed: Headers) -> None:
    """`follower` follows `followed`, the request accepted."""
    asked = app.post(f"/users/{pid(app, followed)}/follow", headers=follower)
    assert asked.is_success, asked.text
    accept = f"/me/follow-requests/{pid(app, follower)}/accept"
    assert app.post(accept, headers=followed).is_success


def planned(app: TestClient, owner: Headers, **changes: Any) -> dict[str, Any]:
    body = {**fixture("planned-live-request.json"), **changes}
    answer = app.post("/me/planned-lives", json=body, headers=owner)
    assert answer.status_code == 201, answer.text
    made: dict[str, Any] = answer.json()
    return made


def started(app: TestClient, owner: Headers, live: dict[str, Any], **body: Any) -> Any:
    return app.post(f"/me/planned-lives/{live['id']}/start", json=body, headers=owner)


def row(app: TestClient, viewer: Headers, **params: Any) -> dict[str, Any]:
    answer = app.get("/lives", params=params, headers=viewer)
    assert answer.status_code == 200, answer.text
    page: dict[str, Any] = answer.json()
    return page


def ids(page: dict[str, Any]) -> list[str]:
    return [live["id"] for live in page["lives"]]


def update(app: TestClient, owner: Headers, share_id: str, **changes: Any) -> None:
    body = {**fixture("live-share-update.json"), "points": [], **changes}
    answer = app.post(f"/me/live-shares/{share_id}/updates", json=body, headers=owner)
    assert answer.status_code == 200, answer.text


# --- The contract ---


def test_the_examples_are_of_the_contract() -> None:
    PlannedLiveRequestBody.model_validate(fixture("planned-live-request.json"))
    LiveItemBody.model_validate(fixture("planned-live.json"))
    LivesPageBody.model_validate(fixture("lives-page.json"))


def test_the_example_request_makes_the_example_item(
    client: TestClient,  # noqa: F811
) -> None:
    ada = person(client, "ada")
    made = planned(client, ada)
    expected = fixture("planned-live.json")
    # The ids and the owner are the database's.
    same = {"id": "x", "planned_live_id": "x", "owner": expected["owner"]}
    assert LiveItemBody.model_validate({**made, **same}) == LiveItemBody.model_validate(
        {**expected, **same}
    )


# --- Making, changing, deleting ---


def test_a_planned_live_needs_an_account(client: TestClient) -> None:  # noqa: F811
    body = fixture("planned-live-request.json")
    assert client.post("/me/planned-lives", json=body).status_code == 401
    assert client.get("/lives").status_code == 401


@pytest.mark.parametrize(
    "changes",
    [
        {"title": ""},
        {"title": "x" * 61},
        {"title": "two\nlines"},
        {"starts_at": (NOW - HOUR).isoformat()},
        {"starts_at": (NOW + timedelta(days=61)).isoformat()},
        {"audience_feed": "none"},
    ],
)
def test_a_wrong_planned_live_is_refused(
    client: TestClient,  # noqa: F811
    changes: dict[str, Any],
) -> None:
    ada = person(client, "ada")
    body = {**fixture("planned-live-request.json"), **changes}
    assert client.post("/me/planned-lives", json=body, headers=ada).status_code == 422


def test_at_most_so_many_planned_lives(client: TestClient) -> None:  # noqa: F811
    ada = person(client, "ada")
    for _ in range(MAX_UPCOMING):
        planned(client, ada)
    body = fixture("planned-live-request.json")
    assert client.post("/me/planned-lives", json=body, headers=ada).status_code == 422


def test_changed_before_the_start_only_by_its_owner(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    live = planned(client, ada)
    path = f"/me/planned-lives/{live['id']}"
    later = (RACE + HOUR).isoformat()
    assert client.put(path, json={"title": "Hi"}, headers=bob).status_code == 404
    changed = client.put(
        path, json={"starts_at": later, "heart_visible": True}, headers=ada
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["heart_visible"] is True
    assert changed.json()["title"] == "Milano Marathon"
    wall.t = RACE + HOUR
    assert started(client, ada, live).status_code == 201
    assert client.put(path, json={"title": "Late"}, headers=ada).status_code == 422


def test_deleted_with_its_reminders(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    follow(client, bob, ada)
    live = planned(client, ada)
    client.put(f"/planned-lives/{live['id']}/reminder", headers=bob)
    path = f"/me/planned-lives/{live['id']}"
    assert client.delete(path, headers=bob).status_code == 404
    assert client.delete(path, headers=ada).status_code == 204
    assert client.get(f"/planned-lives/{live['id']}", headers=ada).status_code == 404
    with database.connect() as conn:
        n = conn.execute("SELECT count(*) AS n FROM planned_live_reminders").fetchone()
    assert n is not None and n["n"] == 0


# --- Who sees it ---


def test_followers_see_a_followers_live_and_nobody_else(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob, cleo = (
        person(client, "ada"),
        person(client, "bob"),
        person(client, "cleo"),
    )
    follow(client, bob, ada)
    live = planned(client, ada, audience_feed="followers")
    path = f"/planned-lives/{live['id']}"
    assert client.get(path, headers=bob).status_code == 200
    # Never 403: one who may not see it is told it is not there.
    assert client.get(path, headers=cleo).status_code == 404
    assert client.put(f"{path}/reminder", headers=cleo).status_code == 404
    assert client.get(f"/users/{pid(client, ada)}/lives", headers=cleo).json() == []


def test_everyone_sees_an_everyone_live_from_the_profile(
    client: TestClient,  # noqa: F811
) -> None:
    ada, cleo = person(client, "ada"), person(client, "cleo")
    live = planned(client, ada, audience_feed="everyone")
    assert client.get(f"/planned-lives/{live['id']}", headers=cleo).status_code == 200
    on_profile = client.get(f"/users/{pid(client, ada)}/lives", headers=cleo).json()
    assert [x["id"] for x in on_profile] == [live["id"]]


def test_the_row_never_shows_a_strangers_live(
    client: TestClient,  # noqa: F811
) -> None:
    """The user's choice 7: the row is one's own and the followed ones'."""
    ada, bob, cleo = (
        person(client, "ada"),
        person(client, "bob"),
        person(client, "cleo"),
    )
    follow(client, bob, ada)
    live = planned(client, ada, audience_feed="everyone")
    assert ids(row(client, bob)) == [live["id"]]
    assert ids(row(client, cleo)) == []
    assert ids(row(client, ada)) == [live["id"]]


@pytest.mark.parametrize("blocker", ["owner", "viewer"])
def test_a_block_either_way_keeps_them_apart(
    client: TestClient,  # noqa: F811
    blocker: str,
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    follow(client, bob, ada)
    live = planned(client, ada, audience_feed="everyone")
    who, whom = (ada, bob) if blocker == "owner" else (bob, ada)
    assert client.put(f"/users/{pid(client, whom)}/block", headers=who).is_success
    assert client.get(f"/planned-lives/{live['id']}", headers=bob).status_code == 404
    assert ids(row(client, bob)) == []
    assert (
        client.get(f"/users/{pid(client, ada)}/lives", headers=bob).status_code == 404
    )


def test_a_hidden_owner_is_seen_by_nobody(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    follow(client, bob, ada)
    live = planned(client, ada, audience_feed="everyone")
    with database.connect() as conn:
        conn.execute("UPDATE users SET hidden_at = now() WHERE username = 'ada'")
    assert client.get(f"/planned-lives/{live['id']}", headers=bob).status_code == 404
    assert ids(row(client, bob)) == []
    assert ids(row(client, ada)) == [live["id"]]


def test_an_unfollow_takes_it_out_of_the_row(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    follow(client, bob, ada)
    live = planned(client, ada, audience_feed="followers")
    assert ids(row(client, bob)) == [live["id"]]
    assert client.delete(f"/users/{pid(client, ada)}/follow", headers=bob).is_success
    assert ids(row(client, bob)) == []
    assert client.get(f"/planned-lives/{live['id']}", headers=bob).status_code == 404


# --- «Remind me» ---


def test_remind_me_twice_is_once_and_can_be_taken_back(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    follow(client, bob, ada)
    live = planned(client, ada)
    path = f"/planned-lives/{live['id']}/reminder"
    assert client.put(path, headers=bob).status_code == 204
    assert client.put(path, headers=bob).status_code == 204
    assert row(client, bob)["lives"][0]["reminded"] is True
    assert row(client, ada)["lives"][0]["reminded"] is False
    assert client.delete(path, headers=bob).status_code == 204
    assert client.delete(path, headers=bob).status_code == 204
    assert row(client, bob)["lives"][0]["reminded"] is False


def test_reminders_go_with_the_account(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    follow(client, bob, ada)
    live = planned(client, ada)
    client.put(f"/planned-lives/{live['id']}/reminder", headers=bob)
    assert client.delete("/me", headers=bob).status_code == 204
    with database.connect() as conn:
        n = conn.execute("SELECT count(*) AS n FROM planned_live_reminders").fetchone()
    assert n is not None and n["n"] == 0
    assert client.delete("/me", headers=ada).status_code == 204
    with database.connect() as conn:
        n = conn.execute("SELECT count(*) AS n FROM planned_lives").fetchone()
    assert n is not None and n["n"] == 0


# --- The start ---


def test_it_starts_from_an_hour_before_to_three_hours_after(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = person(client, "ada")
    live = planned(client, ada)
    early = planned(client, ada)
    assert client.get("/me/planned-lives", headers=ada).json()[0]["can_start"] is False
    wall.t = RACE - HOUR - timedelta(minutes=1)
    assert started(client, ada, live).status_code == 422
    wall.t = RACE - HOUR
    assert client.get("/me/planned-lives", headers=ada).json()[0]["can_start"] is True
    answer = started(client, ada, live)
    assert answer.status_code == 201, answer.text
    # The Feed is what it is for: no link unless asked.
    assert answer.json()["url"] is None
    assert started(client, ada, live).status_code == 422
    wall.t = RACE + timedelta(hours=3, minutes=1)
    assert started(client, ada, early).status_code == 422


def test_started_it_is_live_with_its_audience_and_heart(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada, bob, cleo = (
        person(client, "ada"),
        person(client, "bob"),
        person(client, "cleo"),
    )
    follow(client, bob, ada)
    live = planned(client, ada, audience_feed="followers", heart_visible=True)
    wall.t = RACE
    share = started(client, ada, live, link=True).json()
    assert share["url"].startswith("https://getmuw.app/live/#")
    wall.t = RACE + timedelta(seconds=15)
    update(
        client,
        ada,
        share["id"],
        stats={"distance_m": 3200, "duration_s": 720, "heart_bpm": 140},
    )
    card = row(client, bob)["lives"][0]
    assert card["state"] == "live" and card["share_id"] == share["id"]
    assert card["distance_m"] == 3200 and card["duration_s"] == 720
    seen = client.get(f"/live-shares/{share['id']}", headers=bob).json()
    assert seen["stats"]["heart_bpm"] == 140
    assert client.get(f"/live-shares/{share['id']}", headers=cleo).status_code == 404
    # A follower may not change it.
    assert (
        client.post(
            f"/me/planned-lives/{live['id']}/start", json={}, headers=bob
        ).status_code
        == 404
    )


def test_stopped_within_its_hours_it_may_start_again(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = person(client, "ada")
    live = planned(client, ada)
    wall.t = RACE
    first = started(client, ada, live).json()
    assert client.delete(f"/me/live-shares/{first['id']}", headers=ada).is_success
    mine = client.get("/me/planned-lives", headers=ada).json()
    assert mine[0]["state"] == "ended" and mine[0]["can_start"] is True
    assert started(client, ada, live).status_code == 201


def test_finished_it_stays_an_hour_then_leaves_the_row(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    follow(client, bob, ada)
    live = planned(client, ada)
    wall.t = RACE
    share = started(client, ada, live).json()
    update(client, ada, share["id"], state="finished")
    assert row(client, bob)["lives"][0]["state"] == "finished"
    wall.t = RACE + timedelta(hours=1, seconds=1)
    assert ids(row(client, bob)) == []
    assert (
        client.get(f"/planned-lives/{live['id']}", headers=bob).json()["state"]
        == "ended"
    )


def test_a_planned_live_never_started_leaves_three_hours_after(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = person(client, "ada")
    live = planned(client, ada)
    wall.t = RACE + timedelta(hours=3)
    assert ids(row(client, ada)) == []
    assert client.get("/me/planned-lives", headers=ada).json() == []
    assert (
        client.get(f"/planned-lives/{live['id']}", headers=ada).json()["state"]
        == "ended"
    )


# --- The post it became ---


def test_the_post_takes_its_place(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    follow(client, bob, ada)
    live = planned(client, ada)
    wall.t = RACE
    share = started(client, ada, live).json()
    update(client, ada, share["id"], state="finished")
    saved(client, ada)
    drawing = published(client, ada)
    bobs = person(client, "bobs_other")
    path = f"/me/planned-lives/{live['id']}/post"
    assert (
        client.put(path, json={"drawing_id": str(uuid4())}, headers=ada).status_code
        == 404
    )
    assert (
        client.put(path, json={"drawing_id": drawing["id"]}, headers=bobs).status_code
        == 404
    )
    assert (
        client.put(path, json={"drawing_id": drawing["id"]}, headers=ada).status_code
        == 204
    )
    assert ids(row(client, bob)) == []
    assert (
        client.get(f"/planned-lives/{live['id']}", headers=bob).json()["post_id"]
        == drawing["id"]
    )


# --- Lives in the Feed without planning (choice 6) ---


def test_a_live_put_in_the_feed_is_in_the_followers_row(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada, bob, cleo = (
        person(client, "ada"),
        person(client, "bob"),
        person(client, "cleo"),
    )
    follow(client, bob, ada)
    body = {"activity": "cycling", "link": False, "audience_feed": "everyone"}
    share = client.post("/me/live-shares", json=body, headers=ada).json()
    card = row(client, bob)["lives"][0]
    assert card["id"] == share["id"] and card["planned_live_id"] is None
    assert card["state"] == "live" and card["title"] is None
    assert ids(row(client, cleo)) == []
    # Out of the Feed again: out of the row.
    client.patch(
        f"/me/live-shares/{share['id']}", json={"audience_feed": "none"}, headers=ada
    )
    assert ids(row(client, bob)) == []


def test_the_row_puts_the_lives_going_on_first_and_comes_in_pages(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada, bob, cleo = (
        person(client, "ada"),
        person(client, "bob"),
        person(client, "cleo"),
    )
    follow(client, cleo, ada)
    follow(client, cleo, bob)
    soon = planned(client, ada, starts_at=(NOW + 2 * HOUR).isoformat())
    later = planned(client, ada, starts_at=(NOW + 5 * HOUR).isoformat())
    wall.t = NOW + timedelta(minutes=1)
    going = client.post(
        "/me/live-shares",
        json={"activity": "running", "link": False, "audience_feed": "followers"},
        headers=bob,
    ).json()
    assert ids(row(client, cleo)) == [going["id"], soon["id"], later["id"]]
    first = row(client, cleo, limit=2)
    assert ids(first) == [going["id"], soon["id"]] and first["next"] is not None
    second = row(client, cleo, limit=2, cursor=first["next"])
    assert ids(second) == [later["id"]] and second["next"] is None
