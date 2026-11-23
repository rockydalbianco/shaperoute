"""The personal challenges in the database and GET /game/personal (TASK-423
part C, ADR-0351, docs/GIOCO.md §6.6–6.7): the offset the app sends, the
steps a saved run reaches, the streak, the finished challenges. Needs
PostgreSQL, like test_game_api.py.

The clock starts on Friday 23 October 2026: its week (from Monday 19) asks
long outings, evening outings and a long run; October, an even month, asks
active days and early outings."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from test_game_api import KEY, OTHER_KEY, run_body, save
from test_game_challenges import Clock
from test_push import FAST_HASHER, signed_up

from shaperoute_api.accounts import Accounts
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.game_backfill import backfill

THIRD_KEY = "1a2b3c4d5e6f7081"
# Thursday 22 October, 18:30 UTC: 19:30 in Rome (+60), an evening.
EVENING = datetime(2026, 10, 22, 18, 30, tzinfo=UTC)
# Friday 23 October, 06:00 UTC: 07:00 in Rome, early.
EARLY = datetime(2026, 10, 23, 6, 0, tzinfo=UTC)


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def client(database: Database, clock: Clock) -> TestClient:
    accounts = Accounts(database, now=clock, hasher=FAST_HASHER)
    return TestClient(create_app(FileSource(Path("unused.graphml")), accounts=accounts))


def ran(
    client: TestClient,
    me: dict[str, str],
    metres: float,
    start: datetime,
    key: str,
    offset: int | None = 60,
    activity: str = "running",
) -> None:
    body = run_body([(metres, 3.0)], start=start, activity=activity)
    if offset is not None:
        body["utc_offset_min"] = offset
    assert save(client, me, body, key) == 201


def personal(client: TestClient, me: dict[str, str], **query: Any) -> Any:
    answer = client.get("/game/personal", params=query, headers=me)
    assert answer.status_code == 200, answer.text
    return answer.json()


def steps(body: Any, period: str) -> list[tuple[str, Any, int]]:
    return [(c["id"], c["value"], c["tier"]) for c in body[period]["challenges"]]


def offsets(database: Database) -> list[int | None]:
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT utc_offset_min FROM game_runs ORDER BY run_id"
        ).fetchall()
    return [row["utc_offset_min"] for row in rows]


def medals(database: Database) -> list[tuple[str, str, int]]:
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT period_start::text AS s, challenge_id, tier FROM game_personal"
            " ORDER BY period_start, challenge_id"
        ).fetchall()
    return [(row["s"], row["challenge_id"], row["tier"]) for row in rows]


def test_the_challenges_need_an_account_and_a_real_offset(client: TestClient) -> None:
    assert client.get("/game/personal").status_code == 401
    me = signed_up(client, "ada")
    for wrong in (841, -841, "east"):
        answer = client.get(
            "/game/personal", params={"utc_offset_min": wrong}, headers=me
        )
        assert answer.status_code == 422


def test_the_offset_is_kept_with_the_run_and_by_the_backfill(
    client: TestClient, database: Database
) -> None:
    me = signed_up(client, "ada")
    ran(client, me, 6_000, EVENING, KEY, offset=60)
    # An older app sends none: UTC.
    ran(client, me, 6_000, EARLY, OTHER_KEY, offset=None)
    assert offsets(database) == [60, None]
    # Rules computed again: the offset stays.
    with database.connect() as conn:
        conn.execute("UPDATE game_runs SET rules_version = 1")
    backfill(database)
    assert offsets(database) == [60, None]
    # An offset out of the zones is refused with the run.
    body = run_body([(6_000.0, 3.0)], start=EVENING + timedelta(days=1))
    body["utc_offset_min"] = 900
    answer = client.put(f"/me/activities/{THIRD_KEY}", json=body, headers=me)
    assert answer.status_code == 422


def test_a_new_account_has_its_week_and_month_at_zero(client: TestClient) -> None:
    me = signed_up(client, "ada")
    body = personal(client, me)
    assert body["week"]["start"] == "2026-10-19" and body["week"]["end"] == "2026-10-26"
    assert steps(body, "week") == [
        ("week_long_outings", 0.0, 0),
        ("evening", 0.0, 0),
        ("long_run", None, 0),
    ]
    assert body["week"]["challenges"][2]["unit"] == "m"
    assert body["week"]["challenges"][2]["tiers"] == [8_000, 12_000, 18_000]
    assert (
        body["month"]["start"] == "2026-10-01" and body["month"]["end"] == "2026-11-01"
    )
    assert steps(body, "month") == [("month_days", 0.0, 0), ("month_early", 0.0, 0)]
    assert body["streaks"] == [
        {"runs": 1, "current": 0, "best": 0},
        {"runs": 2, "current": 0, "best": 0},
        {"runs": 3, "current": 0, "best": 0},
    ]
    assert body["finished"] == []


def test_a_saved_run_reaches_its_steps_on_the_runner_s_clock(
    client: TestClient, database: Database
) -> None:
    me = signed_up(client, "ada")
    ran(client, me, 6_000, EVENING, KEY)
    assert medals(database) == [("2026-10-19", "evening", 1)]
    ran(client, me, 9_000, EARLY, OTHER_KEY)
    body = personal(client, me)
    assert steps(body, "week") == [
        ("week_long_outings", 2.0, 1),
        ("evening", 1.0, 1),
        ("long_run", 9_000.0, 1),
    ]
    assert steps(body, "month") == [("month_days", 2.0, 0), ("month_early", 1.0, 0)]
    assert medals(database) == [
        ("2026-10-19", "evening", 1),
        ("2026-10-19", "long_run", 1),
        ("2026-10-19", "week_long_outings", 1),
    ]
    # Shown with its week while the week lasts: nothing finished yet.
    assert body["finished"] == []


def test_the_same_run_in_utc_is_another_hour(client: TestClient) -> None:
    me = signed_up(client, "ada")
    # 18:30 UTC without an offset: not an evening.
    ran(client, me, 6_000, EVENING, KEY, offset=None)
    assert steps(personal(client, me), "week")[1] == ("evening", 0.0, 0)


def test_a_finished_week_keeps_its_medals_and_the_streak_goes_on(
    client: TestClient, clock: Clock
) -> None:
    me = signed_up(client, "ada")
    ran(client, me, 6_000, EVENING, KEY)
    ran(client, me, 9_000, EARLY, OTHER_KEY)
    clock.at += timedelta(weeks=1)
    body = personal(client, me)
    assert body["week"]["start"] == "2026-10-26"
    assert [
        (f["period"], f["start"], f["id"], f["tier"]) for f in body["finished"]
    ] == [
        ("week", "2026-10-19", "evening", 1),
        ("week", "2026-10-19", "long_run", 1),
        ("week", "2026-10-19", "week_long_outings", 1),
    ]
    assert body["finished"][0]["unit"] == "count"
    assert body["finished"][0]["tiers"] == [1, 2, 3]
    assert body["finished"][0]["done_at"] == "2026-10-23T12:00:00Z"
    # Two outings last week, none yet this one: the week under way breaks
    # nothing.
    assert body["streaks"] == [
        {"runs": 1, "current": 1, "best": 1},
        {"runs": 2, "current": 1, "best": 1},
        {"runs": 3, "current": 0, "best": 0},
    ]
    # Another week without outings: the streak is over, its best stays.
    clock.at += timedelta(weeks=1)
    assert personal(client, me)["streaks"][0] == {"runs": 1, "current": 0, "best": 1}


def test_the_phone_s_offset_sets_today(client: TestClient, clock: Clock) -> None:
    me = signed_up(client, "ada")
    # Sunday 25 October, 23:30 UTC: Monday 26 on a clock an hour ahead.
    clock.at = datetime(2026, 10, 25, 23, 30, tzinfo=UTC)
    assert personal(client, me)["week"]["start"] == "2026-10-19"
    assert personal(client, me, utc_offset_min=60)["week"]["start"] == "2026-10-26"
    # Without the query, the offset of the newest run.
    ran(client, me, 6_000, EVENING, KEY, offset=60)
    assert personal(client, me)["week"]["start"] == "2026-10-26"


def test_a_run_the_game_does_not_count_reaches_nothing(
    client: TestClient, database: Database
) -> None:
    me = signed_up(client, "ada")
    ran(client, me, 6_000, EVENING, KEY, activity="cycling")
    assert medals(database) == []
    assert steps(personal(client, me), "week")[1] == ("evening", 0.0, 0)


def test_a_step_only_goes_up(client: TestClient, database: Database) -> None:
    me = signed_up(client, "ada")
    ran(client, me, 6_000, EVENING, KEY)
    ran(client, me, 6_000, EVENING + timedelta(hours=24), OTHER_KEY)
    assert ("2026-10-19", "evening", 2) in medals(database)
    # Deleting a run leaves the medal.
    assert client.delete(f"/me/activities/{OTHER_KEY}", headers=me).status_code == 204
    assert ("2026-10-19", "evening", 2) in medals(database)
    assert steps(personal(client, me), "week")[1] == ("evening", 1.0, 1)


def test_deleting_the_account_deletes_its_medals(
    client: TestClient, database: Database
) -> None:
    me = signed_up(client, "ada")
    ran(client, me, 6_000, EVENING, KEY)
    assert client.delete("/me", headers=me).status_code == 204
    assert medals(database) == []


def test_today_is_a_date_of_the_week() -> None:
    # The fixture's clock, for whoever reads the dates above.
    assert date(2026, 10, 23).weekday() == 4
