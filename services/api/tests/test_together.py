"""«Together» (TASK-417 part D1, ADR-0345): the tracks of a post's run and of
the people tagged who ran it too, with their times, only to the post's
author; only the runs whose drawing the author may see; seconds since the
first start of the group, never a date; at most 600 stored points a track,
none moved."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import UUID

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.drawings import NO_DRAWING
from shaperoute_api.together import (
    MAX_POINTS,
    MAX_TAGGED,
    Fix,
    Run,
    Span,
    TogetherBody,
    on_one_clock,
    same_run,
    thinned,
    track_of,
)

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)

# Trento, a Sunday morning of the test's clock.
START = (46.0671, 11.1214)
T0 = datetime(2026, 10, 4, 8, 0, tzinfo=UTC)
# About 100 m east, every 30 s: a 5 min/km pace.
STEP_LON = 0.0013
STEP_S = 30


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def fixes(n: int, start: tuple[float, float] = START, shift_s: float = 0) -> list[Fix]:
    return [
        Fix(start[0], start[1] + k * STEP_LON, shift_s + k * STEP_S) for k in range(n)
    ]


def run(
    started_at: datetime = T0,
    n: int = 40,
    start: tuple[float, float] = START,
    pauses: list[Span] | None = None,
    name: str = "runner",
) -> Run:
    return Run(
        public_id=UUID(int=len(name)),
        username=name,
        started_at=started_at,
        fixes=fixes(n, start),
        pauses=pauses or [],
    )


# --- Without a database ---


def test_the_track_is_read_with_its_seconds() -> None:
    assert track_of("LINESTRING M (11.1 46.0 0,11.2 46.1 30.5)") == [
        Fix(46.0, 11.1, 0.0),
        Fix(46.1, 11.2, 30.5),
    ]


def test_the_same_run_has_half_the_shorter_time_in_common_and_close_starts() -> None:
    mine = run()  # 39 x 30 s = 1170 s
    assert same_run(mine, run(T0 + timedelta(seconds=60)))
    # Half of the shorter in common: still the same run.
    assert same_run(mine, run(T0 + timedelta(seconds=585)))
    assert not same_run(mine, run(T0 + timedelta(seconds=600)))
    assert not same_run(mine, run(T0 + timedelta(hours=3)))
    # A short run inside a long one is the same run.
    assert same_run(mine, run(T0 + timedelta(seconds=300), n=5))
    # About 1.5 km apart at the start: yes; about 2.3 km: no.
    assert same_run(mine, run(start=(START[0], START[1] + 0.0195)))
    assert not same_run(mine, run(start=(START[0], START[1] + 0.03)))


def test_thinning_keeps_stored_points_ends_and_pause_edges() -> None:
    track = fixes(2000)
    pause = Span(15_000.4, 15_400.0)
    kept = thinned(track, [pause], 600)
    assert len(kept) <= 600
    assert set(kept) <= set(track)
    assert kept[0] == track[0] and kept[-1] == track[-1]
    times = [fix.t_s for fix in kept]
    assert times == sorted(times)
    assert 15_000.0 in times and 15_420.0 in times
    # Evenly in time: no gap much wider than the even one.
    gaps = [b - a for a, b in zip(times, times[1:], strict=False)]
    assert max(gaps) <= 2 * (times[-1] - times[0]) / 600 + STEP_S


def test_a_short_track_is_kept_whole() -> None:
    track = fixes(10)
    assert thinned(track, [], 600) == track


def test_the_clock_starts_at_the_first_start_and_never_says_a_date() -> None:
    late = run(T0 + timedelta(seconds=90), pauses=[Span(60, 120)], name="late")
    body = on_one_clock([late, run()])
    assert body.people[0].seconds[0] == 90.0
    assert body.people[1].seconds[0] == 0.0
    assert body.people[0].pauses[0].from_s == 150.0
    assert body.people[0].pauses[0].to_s == 210.0
    text = body.model_dump_json()
    assert "2026" not in text and "started" not in text


def test_the_example_of_shared_types_is_an_answer() -> None:
    body = TogetherBody.model_validate(_load("together.json"))
    assert len(body.people) >= 2
    for person in body.people:
        assert len(person.points) == len(person.seconds)
        assert person.seconds == sorted(person.seconds)
    assert min(person.seconds[0] for person in body.people) == 0


# --- In a real PostgreSQL ---


class WallClock:
    def __init__(self) -> None:
        self.t = datetime(2026, 10, 4, 12, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.t


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


@pytest.fixture
def client(database: Database) -> TestClient:
    return TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            accounts=Accounts(database, now=WallClock(), hasher=FAST_HASHER),
            run_places=PlaceNames(None),
        )
    )


def signed_up(client: TestClient, name: str) -> dict[str, str]:
    body = {
        **_load("sign-up-request.json"),
        "email": f"{name}@example.com",
        "username": name,
    }
    answer = client.post("/accounts", json=body)
    assert answer.status_code == 201, answer.text
    return {"Authorization": f"Bearer {answer.json()['token']}"}


def public_id(client: TestClient, headers: dict[str, str]) -> str:
    return str(client.get("/me", headers=headers).json()["public_id"])


def recorded(
    client: TestClient,
    headers: dict[str, str],
    key: str,
    started_at: datetime = T0,
    n: int = 40,
    start: tuple[float, float] = START,
) -> list[tuple[float, float]]:
    """A run saved as the app sends it; its points."""
    first_ms = int(started_at.timestamp() * 1000)
    track = [
        {
            "point": [start[0], start[1] + k * STEP_LON],
            "time_ms": first_ms + k * STEP_S * 1000,
            "accuracy_m": 5.0,
        }
        for k in range(n)
    ]
    answer = client.put(f"/me/activities/{key}", json={"track": track}, headers=headers)
    assert answer.status_code == 201, answer.text
    return [(p["point"][0], p["point"][1]) for p in track]


def drawn(
    client: TestClient,
    headers: dict[str, str],
    key: str,
    visibility: str = "everyone",
    tags: list[str] | None = None,
) -> str:
    body: dict[str, Any] = {"title": "Sunday run", "visibility": visibility}
    if tags is not None:
        body["tags"] = tags
    answer = client.put(f"/me/activities/{key}/drawing", json=body, headers=headers)
    assert answer.status_code == 200, answer.text
    return str(answer.json()["id"])


def follows(
    client: TestClient, follower: dict[str, str], followed: dict[str, str]
) -> None:
    asked = client.post(
        f"/users/{public_id(client, followed)}/follow", headers=follower
    )
    assert asked.status_code == 200, asked.text
    who = public_id(client, follower)
    answer = client.post(f"/me/follow-requests/{who}/accept", headers=followed)
    assert answer.status_code == 204, answer.text


def together(client: TestClient, headers: dict[str, str], drawing: str) -> Any:
    return client.get(f"/drawings/{drawing}/together", headers=headers)


def names(answer: Any) -> list[str]:
    assert answer.status_code == 200, answer.text
    return [person["username"] for person in answer.json()["people"]]


def friend_ran(
    client: TestClient,
    name: str,
    visibility: str = "everyone",
    started_at: datetime = T0 + timedelta(seconds=60),
    start: tuple[float, float] = START,
) -> dict[str, str]:
    friend = signed_up(client, name)
    recorded(client, friend, f"{name.replace('_', '')}run1", started_at, start=start)
    drawn(client, friend, f"{name.replace('_', '')}run1", visibility)
    return friend


def post(client: TestClient, author: dict[str, str], *tagged: dict[str, str]) -> str:
    recorded(client, author, "authorrun1")
    return drawn(
        client, author, "authorrun1", tags=[public_id(client, t) for t in tagged]
    )


def test_the_author_gets_its_run_and_its_friends_on_one_clock(
    client: TestClient,
) -> None:
    author = signed_up(client, "author_runner")
    anna = friend_ran(client, "anna_runner")
    drawing = post(client, author, anna)
    answer = together(client, author, drawing)
    assert names(answer) == ["author_runner", "anna_runner"]
    me, friend = answer.json()["people"]
    assert me["public_id"] == public_id(client, author)
    assert me["seconds"][0] == 0.0
    assert friend["seconds"][0] == 60.0
    assert friend["seconds"][-1] == 60.0 + 39 * STEP_S
    assert len(friend["points"]) == len(friend["seconds"]) == 40
    assert "2026" not in answer.text


def test_only_the_author_asks(client: TestClient) -> None:
    author = signed_up(client, "author_runner")
    anna = friend_ran(client, "anna_runner")
    drawing = post(client, author, anna)
    stranger = signed_up(client, "stranger_runner")
    for who in (anna, stranger):
        answer = together(client, who, drawing)
        assert answer.status_code == 404
        assert answer.json()["error"]["message"] == NO_DRAWING
    assert together(client, author, "not-an-id").status_code == 404
    unknown = "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44"
    assert together(client, author, unknown).status_code == 404
    assert client.get(f"/drawings/{drawing}/together").status_code == 401


def test_without_anybody_tagged_only_the_author(client: TestClient) -> None:
    author = signed_up(client, "author_runner")
    friend_ran(client, "anna_runner")
    drawing = post(client, author)
    assert names(together(client, author, drawing)) == ["author_runner"]


def test_a_run_only_its_owner_sees_is_left_out(client: TestClient) -> None:
    author = signed_up(client, "author_runner")
    anna = friend_ran(client, "anna_runner", visibility="only_me")
    drawing = post(client, author, anna)
    assert names(together(client, author, drawing)) == ["author_runner"]


def test_a_run_for_the_followers_needs_the_author_to_follow(
    client: TestClient,
) -> None:
    author = signed_up(client, "author_runner")
    anna = friend_ran(client, "anna_runner", visibility="followers")
    drawing = post(client, author, anna)
    assert names(together(client, author, drawing)) == ["author_runner"]
    follows(client, author, anna)
    assert names(together(client, author, drawing)) == ["author_runner", "anna_runner"]


def test_a_block_either_way_leaves_the_run_out(client: TestClient) -> None:
    author = signed_up(client, "author_runner")
    anna = friend_ran(client, "anna_runner")
    drawing = post(client, author, anna)
    blocked = client.put(f"/users/{public_id(client, author)}/block", headers=anna)
    assert blocked.status_code in (200, 204), blocked.text
    assert names(together(client, author, drawing)) == ["author_runner"]


def test_a_hidden_drawing_is_left_out(client: TestClient, database: Database) -> None:
    author = signed_up(client, "author_runner")
    anna = friend_ran(client, "anna_runner")
    drawing = post(client, author, anna)
    with database.connect() as conn:
        conn.execute(
            "UPDATE drawings SET hidden_at = now() WHERE run_id IN"
            " (SELECT r.id FROM runs r JOIN users u ON u.id = r.user_id"
            " WHERE u.username = 'anna_runner')"
        )
    assert names(together(client, author, drawing)) == ["author_runner"]


def test_a_run_without_a_drawing_is_left_out(client: TestClient) -> None:
    author = signed_up(client, "author_runner")
    anna = signed_up(client, "anna_runner")
    recorded(client, anna, "annarun1", T0 + timedelta(seconds=60))
    drawing = post(client, author, anna)
    assert names(together(client, author, drawing)) == ["author_runner"]


def test_another_time_or_another_place_is_not_the_same_run(
    client: TestClient,
) -> None:
    author = signed_up(client, "author_runner")
    later = friend_ran(client, "later_runner", started_at=T0 + timedelta(hours=3))
    far = friend_ran(client, "far_runner", start=(START[0] + 0.05, START[1]))
    drawing = post(client, author, later, far)
    assert names(together(client, author, drawing)) == ["author_runner"]


def test_at_most_three_people_tagged_in_the_order_of_the_tags(
    client: TestClient,
) -> None:
    author = signed_up(client, "author_runner")
    friends = [friend_ran(client, f"friend_{n}_runner") for n in range(MAX_TAGGED + 1)]
    lazy = friend_ran(client, "lazy_runner", visibility="only_me")
    drawing = post(client, author, lazy, *reversed(friends))
    assert names(together(client, author, drawing)) == [
        "author_runner",
        "friend_3_runner",
        "friend_2_runner",
        "friend_1_runner",
    ]


def test_a_long_track_gives_at_most_600_of_its_own_points(
    client: TestClient,
) -> None:
    author = signed_up(client, "author_runner")
    sent = recorded(client, author, "authorrun1", n=1500)
    drawing = drawn(client, author, "authorrun1")
    answer = together(client, author, drawing)
    (me,) = answer.json()["people"]
    assert len(me["points"]) == MAX_POINTS
    assert {tuple(p) for p in me["points"]} <= set(sent)
    assert me["seconds"][0] == 0.0 and me["seconds"][-1] == 1499 * STEP_S
