"""The figures of a run for the page of its post (TASK-410 part C,
ADR-0340): the splits the API counts from the track, what the phone sends
at the end, and what of them the others see."""

from __future__ import annotations

import json
import math
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from route_engine.geo import EARTH_RADIUS_M
from route_engine.track_score import TrackPoint
from test_drawings import (
    KEY,
    OTHER_KEY,
    WallClock,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    drawn,
    other,
    saved,
    signed_up,
    wall,  # noqa: F401
)

from shaperoute_api.db import Database
from shaperoute_api.personal_bests_backfill import KeptPause
from shaperoute_api.run_stats import (
    MAX_ELEVATION_POINTS,
    MILE_M,
    RunStatsBody,
    RunStatsRequestBody,
    backfill,
    counted,
    splits,
)

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
START = (46.0671, 11.1214)


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def north(metres: float, seconds: float) -> TrackPoint:
    """A point `metres` north of START along its meridian, where haversine
    gives the metres back exactly, at `seconds` on the run's clock."""
    lat = START[0] + math.degrees(metres / EARTH_RADIUS_M)
    return TrackPoint(lat, START[1], seconds)


def steady(length_m: float, s_per_km: float, step_m: float = 100.0) -> list[TrackPoint]:
    """A straight run north at one pace, a point every `step_m`."""
    n = round(length_m / step_m)
    return [north(i * step_m, i * step_m * s_per_km / 1000) for i in range(n + 1)]


def with_stats(
    app: TestClient, headers: Headers, key: str = KEY, **changes: Any
) -> Any:
    body = {**_load("run-stats-request.json"), **changes}
    answer = app.put(f"/me/activities/{key}/stats", json=body, headers=headers)
    assert answer.status_code == 200, answer.text
    return answer.json()


def heart_on_runs(db: Database, avg: int, top: int, shown: bool) -> None:
    """The heart rate as TASK-409 B keeps it on the run, for every run."""
    with db.connect() as conn:
        conn.execute(
            "UPDATE runs SET heart_avg_bpm = %s, heart_max_bpm = %s,"
            " heart_shown = %s",
            (avg, top, shown),
        )


def plain(found: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Splits as the table keeps them: `partial_m` only for the last part."""
    return [{k: v for k, v in s.items() if v is not None} for s in found]


@pytest.fixture(autouse=True)
def after_the_run(wall: WallClock) -> None:  # noqa: F811
    wall.t = datetime(2026, 10, 2, 21, 40, tzinfo=UTC)


# --- The splits, without a database ---


def test_the_splits_of_a_steady_run() -> None:
    track = steady(3_500, s_per_km=300)
    km = splits(track, [])
    assert [(s.n, s.seconds, s.partial_m) for s in km] == [
        (1, 300.0, None),
        (2, 300.0, None),
        (3, 300.0, None),
        (4, 150.0, 500),
    ]
    miles = splits(track, [], MILE_M)
    assert [(s.n, s.partial_m) for s in miles] == [(1, None), (2, None), (3, 281)]
    assert [s.seconds for s in miles] == [482.8, 482.8, 84.4]


def test_a_unit_that_ends_between_two_points_ends_in_proportion() -> None:
    # 1 km in 250 s, then a slow 500 m in 250 s: points every 500 m.
    track = [north(0, 0), north(500, 125), north(1_000, 250), north(1_500, 500)]
    km = splits(track, [])
    assert [(s.seconds, s.partial_m) for s in km] == [(250.0, None), (250.0, 500)]
    # One kilometre and a half in 1 km steps: the second ends nowhere.
    assert [s.seconds for s in splits(track, [], 750)] == [187.5, 312.5]


def test_a_pause_is_no_time_of_a_split() -> None:
    track = steady(2_000, s_per_km=300)
    # Two minutes of pause asked for at 1.5 km (450 s): the clock of the
    # track goes on, the run does not; the step across it is no part of it.
    after = [
        TrackPoint(p.lat, p.lon, p.time_s + 120 if (p.time_s or 0) > 450 else p.time_s)
        for p in track
    ]
    asked = [KeptPause(450, 570, auto=False)]
    # 1.9 km run: the first kilometre whole, then 900 m in 300 s of moving.
    km = splits(after, asked)
    assert [(s.seconds, s.partial_m) for s in km] == [(300.0, None), (300.0, 900)]
    # A pause the app took on its own keeps the step, not the seconds.
    auto = splits(after, [KeptPause(450, 570, auto=True)])
    assert [(s.seconds, s.partial_m) for s in auto] == [(300.0, None), (300.0, None)]


def test_a_few_metres_more_are_no_split() -> None:
    assert [s.partial_m for s in splits(steady(2_050, 300, 50), [])] == [None, None]
    # Shorter than a tenth of a kilometre: no split at all, kept as none.
    assert counted(steady(80, 300, 20), []) == {
        "splits_km": None,
        "splits_mile": None,
    }


# --- The contract ---


# A day of skiing's parts have their own example (test_ski_parts.py,
# ski-parts-request.json, TASK-424 part C2b); a flight's figures too
# (test_flight_bests.py, flight-stats-request.json, TASK-305 part R5a).
SKI_FIELDS = {
    "ski_parts",
    "ski_descents",
    "max_alt_m",
    "top_speed_mps",
    # On foot and in the air (test_flight_parts.py, TASK-305 part R6a).
    "flight_parts",
    "flight_split",
}


def test_the_examples_are_the_bodies() -> None:
    request = RunStatsRequestBody.model_validate(_load("run-stats-request.json"))
    assert set(_load("run-stats-request.json")) == (
        set(RunStatsRequestBody.model_fields) - SKI_FIELDS
    )
    assert request.kcal == 355
    example = _load("run-stats.json")
    assert set(example) == set(RunStatsBody.model_fields) - SKI_FIELDS
    assert RunStatsBody.model_validate(example).model_dump(exclude_none=True) == example


@pytest.mark.parametrize(
    "changes",
    [
        {
            "elevation": [
                {"distance_m": i, "altitude_m": 200}
                for i in range(MAX_ELEVATION_POINTS + 1)
            ]
        },
        {"elevation": [{"distance_m": 0, "altitude_m": 200}]},
        {
            "elevation": [
                {"distance_m": 10, "altitude_m": 200},
                {"distance_m": 5, "altitude_m": 201},
            ]
        },
        {"elevation": [{"distance_m": 0, "altitude_m": 20_000}] * 2},
        {"cadence_spm": 400},
        {"kcal": -1},
        {"heart": {"avg_bpm": 140, "max_bpm": 170}},
        {"splits_km": []},
    ],
)
def test_what_the_phone_may_not_send(changes: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        RunStatsRequestBody.model_validate(
            {**_load("run-stats-request.json"), **changes}
        )


# --- In the database ---


def test_the_phone_sends_them_and_the_api_counts_the_splits(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    run = saved(client, me)
    stats = with_stats(client, me)
    # The example run, a square of about 4 km in Trento, with a pause the
    # app took on its own.
    whole = run["distance_m"] // 1000
    km = stats["splits_km"]
    # Four whole ones, and some metres more: fewer than a split takes.
    assert run["distance_m"] - 1000 * whole < 100
    assert [(s["n"], s["partial_m"]) for s in km] == [
        (n, None) for n in range(1, whole + 1)
    ]
    # The moving time of all but those few metres.
    assert run["duration_s"] - 5 < sum(s["seconds"] for s in km) < run["duration_s"]
    assert stats["elevation"] == _load("run-stats-request.json")["elevation"]
    assert (stats["cadence_spm"], stats["kcal"], stats["heart"]) == (168, 355, None)
    # Sent again without the cadence: the whole of it each time.
    again = with_stats(client, me, cadence_spm=None)
    assert again["cadence_spm"] is None and again["splits_km"] == km


def test_only_a_run_of_ones_own(client: TestClient) -> None:  # noqa: F811
    me, them = signed_up(client), other(client)
    saved(client, me)
    body = _load("run-stats-request.json")
    for headers, key in ((me, OTHER_KEY), (them, KEY)):
        answer = client.put(f"/me/activities/{key}/stats", json=body, headers=headers)
        assert answer.status_code == 404, answer.text
    assert client.put(f"/me/activities/{KEY}/stats", json=body).status_code == 401


def test_an_old_run_has_no_stats(client: TestClient) -> None:  # noqa: F811
    me, them = signed_up(client), other(client)
    saved(client, me)
    drawing_id = drawn(client, me)["id"]
    for headers in (me, them):
        seen = client.get(f"/drawings/{drawing_id}", headers=headers)
        assert seen.status_code == 200, seen.text
        assert seen.json()["stats"] is None


def test_the_others_see_the_figures_but_not_the_feed(
    client: TestClient,  # noqa: F811
) -> None:
    me, them = signed_up(client), other(client)
    saved(client, me)
    drawing_id = drawn(client, me)["id"]
    mine = with_stats(client, me)
    seen = client.get(f"/drawings/{drawing_id}", headers=them).json()["stats"]
    assert seen == {**mine, "heart": None}
    feed = client.get("/feed", headers=them).json()["posts"]
    assert feed and all("stats" not in post for post in feed)


def test_a_heart_rate_hidden_never_leaves_the_server(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, them = signed_up(client), other(client)
    saved(client, me)
    drawing_id = drawn(client, me)["id"]
    with_stats(client, me)
    heart_on_runs(database, 148, 171, shown=False)
    theirs = client.get(f"/drawings/{drawing_id}", headers=them)
    assert theirs.status_code == 200, theirs.text
    seen = theirs.json()["stats"]
    assert (seen["heart"], seen["kcal"]) == (None, None)
    assert seen["splits_km"] and seen["elevation"]
    # The author sees them always.
    mine = client.get(f"/drawings/{drawing_id}", headers=me).json()["stats"]
    assert mine["heart"] == {"avg_bpm": 148, "max_bpm": 171}
    assert mine["kcal"] == 355
    # Shown, the others see them too.
    heart_on_runs(database, 148, 171, shown=True)
    seen = client.get(f"/drawings/{drawing_id}", headers=them).json()["stats"]
    assert (seen["heart"], seen["kcal"]) == ({"avg_bpm": 148, "max_bpm": 171}, 355)


def test_a_hidden_heart_rate_alone_gives_no_stats(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, them = signed_up(client), other(client)
    saved(client, me)
    drawing_id = drawn(client, me)["id"]
    heart_on_runs(database, 148, 171, shown=False)
    assert client.get(f"/drawings/{drawing_id}", headers=them).json()["stats"] is None
    mine = client.get(f"/drawings/{drawing_id}", headers=me).json()["stats"]
    assert mine["heart"] == {"avg_bpm": 148, "max_bpm": 171}


def test_the_backfill_counts_the_splits_of_the_runs_before(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    saved(client, me, OTHER_KEY, days_later=1)
    sent = with_stats(client, me, OTHER_KEY)
    assert backfill(database, wall).runs == 1
    assert backfill(database, wall).runs == 0
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT r.key, s.stats FROM run_stats s JOIN runs r ON r.id = s.run_id"
        ).fetchall()
    stats = {row["key"]: row["stats"] for row in rows}
    # The run before has its splits, and nothing the phone would send.
    assert stats[KEY]["splits_km"] == plain(sent["splits_km"])
    assert "kcal" not in stats[KEY]
    # The one the phone sent figures for keeps them.
    assert stats[OTHER_KEY]["kcal"] == 355
