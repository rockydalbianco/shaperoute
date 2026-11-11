"""The prizes of the game in the database (TASK-423 part E, ADR-0351,
docs/GIOCO.md §5.4): the silver edition the third run gives, its push, the
backfill of the editions, GET /game/prizes, the choice of the profile and
what the public profile shows. Needs PostgreSQL, like test_game_api.py.

Each run is 6 km at 5:33 a kilometre (test_game_api.SIX_KM), a week apart:
it meets the goal of every pace of 6:00 or slower up to 5 km, and the
first 5K."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from fastapi.testclient import TestClient
from test_game_api import (
    MORNING,
    PHONE,
    SIX_KM,
    SIX_KM_UNLOCKS,
    UNLOCKED_TEXT,
    client,
    database,
    expo,
    game_of,
    run_body,
    save,
    shapes_of,
)
from test_push import FakeExpo, push_on, put_token, signed_up

from shaperoute_api.db import Database
from shaperoute_api.game_backfill import backfill
from shaperoute_api.game_catalog import CATALOG
from shaperoute_api.game_prizes import EDITION_SHAPES
from shaperoute_api.push import PushEvent, text_of

# The fixtures of test_game_api.py, here too.
__all__ = ["client", "database", "expo"]

KEYS = ["e1aa000000000001", "e1aa000000000002", "e1aa000000000003", "e1aa000000000004"]
EDITION_IDS = {s.id for s in EDITION_SHAPES}
# The shapes six km unlock that have editions: those a run of 6 km meets.
SIX_KM_EDITIONS = [s for s in SIX_KM_UNLOCKS if s in EDITION_IDS]
SILVER_TEXT = "{}: silver edition! You met its goal in 3 runs."


def weeks_ago(n: int) -> datetime:
    return MORNING - timedelta(weeks=n)


def ran(client: TestClient, me: dict[str, str], n: int) -> None:
    """The n-th run (from 0), n weeks before the last: oldest first."""
    body = run_body(SIX_KM, start=weeks_ago(len(KEYS) - 1 - n))
    assert save(client, me, body, KEYS[n]) == 201


def prizes(client: TestClient, me: dict[str, str]) -> Any:
    answer = client.get("/game/prizes", headers=me)
    assert answer.status_code == 200, answer.text
    return answer.json()


def editions(database: Database) -> list[tuple[str, str]]:
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT shape_id, edition FROM game_unlocks"
            " WHERE edition IN ('silver', 'gold') ORDER BY shape_id, edition"
        ).fetchall()
    return [(r["shape_id"], r["edition"]) for r in rows]


def public_id(client: TestClient, me: dict[str, str]) -> str:
    return str(client.get("/me", headers=me).json()["public_id"])


def test_the_prizes_need_an_account(client: TestClient) -> None:
    assert client.get("/game/prizes").status_code == 401
    assert client.put("/game/prizes/shown", json={}).status_code == 401


def test_the_third_run_gives_the_silver_edition_and_its_push(
    client: TestClient, database: Database, expo: FakeExpo
) -> None:
    me = signed_up(client, "ada")
    push_on(client, me)
    assert put_token(client, me, PHONE).is_success
    ran(client, me, 0)
    ran(client, me, 1)
    assert editions(database) == []
    shapes = shapes_of(client, me)
    # Bronze once unlocked, with the runs that met its goal.
    assert shapes["penguin"]["edition"] == "bronze"
    assert shapes["penguin"]["edition_runs"] == 2
    # A shape of the total kilometres has none; one not unlocked, none yet.
    assert shapes["triangle"]["edition"] is None
    assert shapes["triangle"]["edition_runs"] is None
    assert shapes["lightning"]["edition"] is None
    assert shapes["lightning"]["edition_runs"] == 0

    ran(client, me, 2)
    assert editions(database) == sorted((s, "silver") for s in SIX_KM_EDITIONS)
    assert shapes_of(client, me)["penguin"]["edition"] == "silver"
    third = game_of(client, me, KEYS[2])
    assert [e["edition"] for e in third["editions"]] == ["silver"] * len(
        SIX_KM_EDITIONS
    )
    first = third["editions"][0]["shape_id"]
    # One push for the editions, however many; the first in catalog order,
    # after the one of the shapes the run unlocked (18 km: the octagon).
    names = {s.id: s.names["en"] for s in EDITION_SHAPES}
    assert third["unlocked"] == ["octagon"]
    bodies = [m["body"] for m in expo.sent]
    assert bodies[-2:] == [UNLOCKED_TEXT, SILVER_TEXT.format(names[first])]
    assert sum(1 for b in bodies if "edition" in b) == 1
    # The earlier runs gave none.
    assert game_of(client, me, KEYS[0])["editions"] == []


def test_the_answers_the_app_reads_keep_their_fields(client: TestClient) -> None:
    """The app in production reads /game/me and /game/runs/{key}: the new
    fields are added, none goes."""
    me = signed_up(client, "ada")
    ran(client, me, 0)
    run = game_of(client, me, KEYS[0])
    assert set(run) == {
        "counted",
        "reason",
        "counted_m",
        "best_s",
        "unlocked",
        "pieces_done",
        "editions",
        "collections_done",
    }
    assert run["collections_done"] == []
    shape = shapes_of(client, me)["penguin"]
    assert set(shape) == {
        "id",
        "unlocked_at",
        "progress",
        "team_unlocked_at",
        "edition",
        "edition_runs",
    }


def test_the_backfill_gives_the_editions_of_old_runs_once_and_quietly(
    client: TestClient, database: Database, expo: FakeExpo
) -> None:
    me = signed_up(client, "ada")
    for n in range(3):
        ran(client, me, n)
    # As before part E: no edition kept.
    with database.connect() as conn:
        conn.execute("DELETE FROM game_unlocks WHERE edition IN ('silver', 'gold')")
    push_on(client, me)
    assert put_token(client, me, PHONE).is_success
    done = backfill(database)
    assert done.editions == len(SIX_KM_EDITIONS)
    assert editions(database) == sorted((s, "silver") for s in SIX_KM_EDITIONS)
    # Given by the third run, at its end.
    assert len(game_of(client, me, KEYS[2])["editions"]) == len(SIX_KM_EDITIONS)
    assert expo.sent == []
    assert backfill(database).editions == 0


def test_the_prizes_page_says_what_is_got_and_how_far(client: TestClient) -> None:
    me = signed_up(client, "ada")
    empty = prizes(client, me)
    assert [f["id"] for f in empty["frames"]][:3] == ["geometry", "animals", "sea"]
    assert not any(f["got"] for f in empty["frames"])
    assert empty["editions"] == {"silver": 0, "gold": 0}
    assert empty["shown"] == {"frame": None, "title": None, "badges": []}
    for n in range(4):
        ran(client, me, n)
    body = prizes(client, me)
    badges = {b["id"]: b for b in body["badges"]}
    # Four weeks in a row with an outing.
    assert badges["streak_4"] == {
        "id": "streak_4",
        "got": True,
        "value": 4,
        "target": 4,
    }
    assert badges["streak_12"]["got"] is False and badges["streak_12"]["value"] == 4
    runner = next(t for t in body["titles"] if t["id"] == "runner")
    assert runner["got"] is False and runner["target"] == 100_000
    assert body["editions"]["silver"] == len(SIX_KM_EDITIONS)


def test_the_profile_shows_only_what_was_chosen_and_is_got(
    client: TestClient,
) -> None:
    ada = signed_up(client, "ada")
    bob = signed_up(client, "bob")
    profile = f"/users/{public_id(client, ada)}"
    # By default nothing of the game.
    assert client.get(profile, headers=bob).json()["game_prizes"] is None
    for n in range(4):
        ran(client, ada, n)
    # Not got, unknown, or too many: refused, and nothing changes.
    for wrong in (
        {"title": "runner"},
        {"frame": "sea"},
        {"badges": ["streak_12"]},
        {"badges": ["no_such_badge"]},
        {"badges": ["streak_4"] * 4},
    ):
        answer = client.put("/game/prizes/shown", json=wrong, headers=ada)
        assert answer.status_code == 422, wrong
        assert answer.json()["error"]["code"] == "invalid_request"
    assert client.get(profile, headers=bob).json()["game_prizes"] is None
    answer = client.put(
        "/game/prizes/shown", json={"badges": ["streak_4"]}, headers=ada
    )
    assert answer.status_code == 200, answer.text
    assert answer.json()["shown"] == {
        "frame": None,
        "title": None,
        "badges": ["streak_4"],
    }
    assert client.get(profile, headers=bob).json()["game_prizes"] == {
        "frame": None,
        "title": None,
        "badges": ["streak_4"],
    }
    # Chosen back to nothing: nothing shown.
    client.put("/game/prizes/shown", json={}, headers=ada)
    assert client.get(profile, headers=bob).json()["game_prizes"] is None


def test_the_run_that_completes_a_collection_says_so_and_tells_once(
    client: TestClient, database: Database, expo: FakeExpo
) -> None:
    me = signed_up(client, "ada")
    push_on(client, me)
    assert put_token(client, me, PHONE).is_success
    mine = int(client.get("/me", headers=me).json()["id"])
    # Every shape of «Geometry» but the triangle, unlocked before.
    with database.connect() as conn:
        for shape in CATALOG:
            if shape.collection == "geometry" and shape.id != "triangle":
                conn.execute(
                    "INSERT INTO game_unlocks (user_id, shape_id, edition,"
                    " unlocked_at) VALUES (%s, %s, 'solo', %s)",
                    (mine, shape.id, MORNING),
                )
    ran(client, me, 0)
    assert game_of(client, me, KEYS[0])["collections_done"] == ["geometry"]
    assert [m["body"] for m in expo.sent] == [
        UNLOCKED_TEXT,
        "Geometry collection complete! A new frame for your profile, in Play.",
    ]
    frames = {f["id"]: f for f in prizes(client, me)["frames"]}
    assert frames["geometry"] == {
        "id": "geometry",
        "got": True,
        "unlocked": 10,
        "total": 10,
    }
    # The frame can be shown now.
    answer = client.put("/game/prizes/shown", json={"frame": "geometry"}, headers=me)
    assert answer.status_code == 200, answer.text


def test_the_gold_push_has_its_own_words() -> None:
    names = {"en": "Lightning", "it": "Fulmine"}
    gold = PushEvent("edition_up", 1, 1, number=10, names=names)
    silver = PushEvent("edition_up", 1, 1, number=3, names=names)
    assert (
        text_of(gold, "", "en")
        == "Lightning: gold edition! You met its goal in 10 runs."
    )
    assert text_of(silver, "", "it") == (
        "Fulmine: edizione d'argento! Hai raggiunto l'obiettivo in 3 corse."
    )
