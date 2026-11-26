"""The history of a takeoff on GET /flying-sites/{id}/history (TASK-493
part B, ADR-0400): the saved flights that leave from it, counted without
names and shown only from three pilots up; who is in the air from it now;
the records of the flights posted for everyone."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi.testclient import TestClient
from test_activity_flight import RACE, _stats
from test_drawings import (
    KEY,
    WallClock,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    published,
    saved,
    signed_up,
    wall,  # noqa: F401
)

from shaperoute_api.db import Database
from shaperoute_api.flight_legs import KeptFlightPart
from shaperoute_api.flying_history import (
    CACHE_S,
    MIN_PILOTS,
    TAKEOFF_M,
    metres_between,
    months_back,
    takeoff_index,
)
from shaperoute_api.flying_sites import Site, save_sites
from shaperoute_api.run_stats import FLIGHT

Headers = dict[str, str]
NOW = datetime(2026, 11, 3, 9, 0, tzinfo=UTC)
# The example run starts here and goes 1 km east to its second point.
START = (46.0671, 11.1214)
SECOND = (46.0671, 11.1344)
KEYS = ["a1b2c3d4e5f60718", "b2c3d4e5f6071829", "c3d4e5f607182930", "d4e5f60718293a4b"]


def _site(
    db: Database, point: tuple[float, float], kind: str = "takeoff"
) -> int:  # noqa: F811
    with db.connect() as conn:
        save_sites(conn, [Site("node", int(point[1] * 1e4), kind, point)], NOW)  # type: ignore[arg-type]
        row = conn.execute(
            "SELECT id FROM flying_sites WHERE osm_id = %s AND kind = %s",
            (int(point[1] * 1e4), kind),
        ).fetchone()
    assert row is not None
    return int(row["id"])


def _pilot(client: TestClient, n: int) -> Headers:  # noqa: F811
    return signed_up(client, email=f"pilot{n}@example.com", username=f"pilot_{n}")


def _flew(
    client: TestClient,  # noqa: F811
    me: Headers,
    key: str = KEY,
    public: bool | None = None,
    **changes: Any,
) -> None:
    saved(client, me, key=key, activity=FLIGHT, **changes)
    if public is not None:
        published(client, me, key=key, public=public)


def _history(app: TestClient, site: int, **params: Any) -> dict[str, Any]:
    answer = app.get(f"/flying-sites/{site}/history", params=params)
    assert answer.status_code == 200, answer.text
    body: dict[str, Any] = answer.json()
    return body


# --- Without a database ---


def test_the_takeoff_is_where_the_first_part_in_the_air_starts() -> None:
    times = [0.0, 300.0, 600.0, 900.0, 1200.0]
    parts = [KeptFlightPart.model_validate(p) for p in _kept(RACE)]
    assert takeoff_index(times, parts) == 1
    assert takeoff_index(times, []) == 0


def _kept(parts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    first = parts[0]["start_ms"]
    return [
        {
            "kind": p["kind"],
            "start_s": (p["start_ms"] - first) / 1000,
            "end_s": (p["end_ms"] - first) / 1000,
        }
        for p in parts
    ]


def test_metres_and_months() -> None:
    assert 990 < metres_between(START, SECOND) < 1010
    assert metres_between(START, START) == 0
    assert months_back(NOW) == [
        "2025-12",
        *(f"2026-{m:02d}" for m in range(1, 12)),
    ]
    assert months_back(datetime(2026, 1, 5, tzinfo=UTC), 2) == ["2025-12", "2026-01"]


# --- With the database ---


def test_under_three_pilots_no_numbers_but_the_records(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    site = _site(database, START)
    _flew(client, _pilot(client, 1), public=True)
    _flew(client, _pilot(client, 2))
    body = _history(client, site)
    assert body["site_id"] == site
    assert body["few"] is True
    assert body["flights"] is None and body["pilots"] is None
    assert body["today"] is None and body["months"] is None
    assert body["in_air_now"] == {"count": 0, "shares": []}
    longest = body["records"]["longest_s"]
    assert longest["username"] == "pilot_1"
    assert MIN_PILOTS == 3


def test_from_three_pilots_the_numbers(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    site = _site(database, START)
    first = _pilot(client, 1)
    _flew(client, first)
    _flew(client, first, key=KEYS[0], days_later=-1)
    _flew(client, _pilot(client, 2))
    _flew(client, _pilot(client, 3))
    body = _history(client, site)
    assert body["few"] is False
    assert body["flights"] == 4
    assert body["pilots"] == 3
    months = {m["month"]: m for m in body["months"]}
    assert len(body["months"]) == 12
    assert months["2026-09"] == {"month": "2026-09", "flights": 4, "pilots": 3}
    # The drawings' clock: 2 October 2026.
    assert body["months"][-1] == {"month": "2026-10", "flights": 0, "pilots": 0}
    assert body["today"] == 0


def test_today_by_offset(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    site = _site(database, START)
    wall.t = datetime(2026, 11, 3, 20, 0, tzinfo=UTC)
    for n in range(3):
        _flew(client, _pilot(client, n), days_later=43)
    # The flights are read once and kept; «today» is counted at each ask.
    assert _history(client, site, utc_offset_min=300)["today"] == 0
    assert _history(client, site, utc_offset_min=-300)["today"] == 3
    assert _history(client, site)["today"] == 3
    assert (
        client.get(
            f"/flying-sites/{site}/history", params={"utc_offset_min": 15 * 60}
        ).status_code
        == 422
    )


def test_a_hike_and_fly_leaves_from_where_it_takes_off(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    below = _site(database, START)
    above = _site(database, SECOND)
    me = _pilot(client, 1)
    _flew(client, me, public=True)
    _stats(client, me, RACE)
    # Up on foot from START, off the ground at SECOND, 1 km away.
    assert _history(client, below)["records"]["longest_s"] is None
    record = _history(client, above)["records"]["longest_s"]
    assert record["value"] == 600
    assert record["username"] == "pilot_1"
    farthest = _history(client, above)["records"]["farthest_m"]
    assert farthest["value"] == 2100


def test_a_flight_farther_than_the_takeoff_is_not_its(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    # A takeoff a little more than TAKEOFF_M north of the start.
    north = (START[0] + (TAKEOFF_M + 30) / 111_195, START[1])
    site = _site(database, north)
    _flew(client, _pilot(client, 1), public=True)
    assert _history(client, site)["records"]["longest_s"] is None


def test_the_records_only_from_posts_for_everyone(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    site = _site(database, START)
    # Kept to the followers, or not posted: never a record.
    _flew(client, _pilot(client, 1), public=False)
    _flew(client, _pilot(client, 2))
    records = _history(client, site)["records"]
    assert records == {"longest_s": None, "highest_m": None, "farthest_m": None}
    _flew(client, _pilot(client, 3), public=True)
    wall.t += timedelta(seconds=CACHE_S)
    records = _history(client, site)["records"]
    for name in ("longest_s", "farthest_m"):
        assert records[name]["username"] == "pilot_3", name
    # No figures sent, so no highest altitude.
    assert records["highest_m"] is None


def test_a_hidden_account_has_no_record(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    site = _site(database, START)
    _flew(client, _pilot(client, 1), public=True)
    with database.connect() as conn:
        conn.execute(
            "UPDATE users SET hidden_at = %s WHERE username = 'pilot_1'", (NOW,)
        )
    assert _history(client, site)["records"]["longest_s"] is None


def _live(
    database: Database,  # noqa: F811
    at: datetime,
    username: str,
    point: tuple[float, float],
    audience: str = "none",
    finished: bool = False,
) -> str:
    with database.connect() as conn:
        user = conn.execute(
            "SELECT id FROM users WHERE username = %s", (username,)
        ).fetchone()
        assert user is not None
        row = conn.execute(
            "INSERT INTO live_shares (user_id, token_hash, activity, created_at,"
            " expires_at, finished_at, audience_feed)"
            " VALUES (%s, %s, 'paragliding', %s, %s, %s, %s) RETURNING id",
            (
                user["id"],
                hashlib.sha256(username.encode()).digest(),
                at - timedelta(minutes=30),
                at + timedelta(hours=5),
                at if finished else None,
                audience,
            ),
        ).fetchone()
        assert row is not None
        conn.execute(
            "INSERT INTO live_share_points (share_id, lat, lon, at)"
            " VALUES (%s, %s, %s, %s), (%s, %s, %s, %s)",
            (
                row["id"],
                point[0],
                point[1],
                at - timedelta(minutes=29),
                row["id"],
                point[0] + 0.05,
                point[1],
                at - timedelta(minutes=1),
            ),
        )
    return str(row["id"])


def test_in_the_air_now_and_the_links_only_for_everyone(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    site = _site(database, START)
    for n in range(4):
        _pilot(client, n)
    shared = _live(database, wall.t, "pilot_0", START, audience="everyone")
    _live(database, wall.t, "pilot_1", START, audience="followers")
    _live(database, wall.t, "pilot_2", START, finished=True)
    _live(database, wall.t, "pilot_3", SECOND, audience="everyone")
    now = _history(client, site)["in_air_now"]
    assert now == {"count": 2, "shares": [shared]}


def test_a_landing_or_no_site_404(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    landing = _site(database, START, kind="landing")
    assert client.get(f"/flying-sites/{landing}/history").status_code == 404
    assert client.get("/flying-sites/999999/history").status_code == 404
    assert client.get("/flying-sites/0/history").status_code == 422


def test_the_flights_are_kept_for_a_while(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    site = _site(database, START)
    _flew(client, _pilot(client, 1), public=True)
    assert _history(client, site)["records"]["longest_s"] is not None
    # A new flight is counted once the kept ones are old.
    for n in (2, 3):
        _flew(client, _pilot(client, n))
    assert _history(client, site)["few"] is True
    wall.t = wall.t + timedelta(seconds=CACHE_S)
    assert _history(client, site)["few"] is False
