"""Inline skating in the API (TASK-380 part A, ADR-0324).

An `inline_skating` request is 5-30 km and the engine draws it on the roller
network, in zones of its own. Its GPX says what it is; saved, it goes to
Strava as an "InlineSkate", counts in the shape game as a walk, with
"vehicle" thresholds of its own and no best times, and has personal bests of
its own over a run's distances. The database takes it in the three tables
that check the activity and in the bests, keeping what was there before.

No network: the planner is a stand-in that says which network it was given.
"""

from __future__ import annotations

import json
import math
import re
import shutil
from pathlib import Path
from typing import Any, get_args

import pytest
from fastapi.testclient import TestClient
from route_engine.models import DISTANCE_LIMITS_M, SUPPORTED_ACTIVITIES
from route_engine.network import BIKE_NETWORK_NAME, FOOT_NETWORK_NAME, OsmnxSource
from route_engine.networks.roller import ROLLER_FILTER, ROLLER_NETWORK_NAME
from route_engine.track_score import TrackPoint
from route_engine.walking import API_ACTIVITIES, API_DISTANCE_LIMITS_M, engine_activity
from test_cycling import RESULT, TOWN, Network, finished, loading
from test_game_rules import Runner

from shaperoute_api import prefetch_zones
from shaperoute_api.activities import RunActivity
from shaperoute_api.activity_graphs import (
    ZONES_IN_MEMORY,
    ActivityGraphs,
    check_supported,
)
from shaperoute_api.app import create_app
from shaperoute_api.db import Database, migrations
from shaperoute_api.game_rules import (
    INLINE_SKATING,
    MAX_MEAN_SPEED_MPS,
    ON_FOOT,
    RULES_VERSION,
    SKATE_MAX_MEAN_SPEED_MPS,
    SKATE_VEHICLE_SPEED_MPS,
    VEHICLE,
    VEHICLE_SPEED_MPS,
    evaluate,
    speed_limits,
)
from shaperoute_api.graphs import ZoneGraphs
from shaperoute_api.personal_bests import SPORTS, Sport, bests, run_bests
from shaperoute_api.reads import NEWER_ACTIVITIES, OLD_APP, reads_from
from shaperoute_api.run_gpx import gpx_type
from shaperoute_api.schemas import ACTIVITY_DESCRIPTION, RouteRequestBody
from shaperoute_api.sports import SPORTS_BY_ACTIVITY
from shaperoute_api.sports.inline_skating import ON_SKATES, ON_SKATES_KMH
from shaperoute_api.sports.running import ON_FOOT as RUN_BESTS
from shaperoute_api.strava import SPORT_TYPES

REPO = Path(__file__).resolve().parents[3]
CONTRACT = REPO / "packages" / "shared-types" / "fixtures"
MIGRATION = "0055_inline_skating.sql"
SKATE = "inline_skating"
HEART: dict[str, Any] = {
    "start": list(TOWN),
    "shape": "heart",
    "distance_m": 10_000,
}


def three_networks() -> tuple[ActivityGraphs, Network, Network, Network]:
    foot, bike = Network(FOOT_NETWORK_NAME), Network(BIKE_NETWORK_NAME)
    roller = Network(ROLLER_NETWORK_NAME)
    graphs = ActivityGraphs({"running": foot, "cycling": bike, SKATE: roller})
    return graphs, foot, bike, roller


# --- the contract ----------------------------------------------------------------


def test_inline_skating_is_an_activity_of_the_api_5_to_30_km() -> None:
    check_supported(SKATE)
    assert API_DISTANCE_LIMITS_M[SKATE] == (5_000, 30_000)
    assert SKATE in get_args(RunActivity)
    # The engine's, after the MTB ride.
    assert SKATE in SUPPORTED_ACTIVITIES
    assert DISTANCE_LIMITS_M[SKATE] == (5_000, 30_000)
    assert API_ACTIVITIES.index(SKATE) == API_ACTIVITIES.index("mountain_biking") + 1
    assert engine_activity(SKATE, 10_000) == SKATE
    contract = json.loads((CONTRACT / "contract.json").read_text())
    assert contract["activities"] == list(API_ACTIVITIES)
    assert contract["distance_limits_m"][SKATE] == [5_000, 30_000]
    run_activities = json.loads((CONTRACT / "run-activities.json").read_text())
    assert run_activities["run_activities"] == list(get_args(RunActivity))


def test_the_request_of_shared_types_is_one() -> None:
    request = json.loads((CONTRACT / f"route-request-{SKATE}.json").read_text())
    body = RouteRequestBody.model_validate(request)
    assert body.activity == SKATE
    low, high = API_DISTANCE_LIMITS_M[SKATE]
    assert low <= body.distance_m <= high


def test_the_description_says_how_it_is_drawn() -> None:
    assert "inline_skating on the smooth paved ways of its own network" in (
        ACTIVITY_DESCRIPTION
    )


# --- the sport --------------------------------------------------------------------


def test_the_sport_of_inline_skating() -> None:
    sport = SPORTS_BY_ACTIVITY[SKATE]
    assert not sport.record_only and not sport.trackless
    assert sport.bests is ON_SKATES
    assert SPORT_TYPES[SKATE] == "InlineSkate"
    assert gpx_type(SKATE) == SKATE
    # Zones of its own, a ride's size for its 30 km, one in memory.
    assert ZONES_IN_MEMORY[SKATE] == 1
    city = (46.0671, 11.1214)
    assert prefetch_zones.ZONE_BOXES[SKATE](city) == prefetch_zones.bike_zone_box(city)
    assert prefetch_zones.STREET_NAMES[SKATE] is False


# --- where it is drawn ------------------------------------------------------------


def test_the_api_keeps_the_roller_zones_apart(tmp_path: Path) -> None:
    graphs = ActivityGraphs.from_cache(tmp_path)
    roller = graphs.for_activity(SKATE)
    assert isinstance(roller, ZoneGraphs)
    assert roller is not graphs.for_activity("running")
    assert roller is not graphs.for_activity("cycling")
    source = OsmnxSource.for_activity(tmp_path, SKATE)
    assert (source.network_name, source.custom_filter) == ("roller", ROLLER_FILTER)


def test_a_skate_goes_on_the_roller_network() -> None:
    graphs, foot, bike, roller = three_networks()
    seen: list[tuple[str, str]] = []
    client = TestClient(create_app(graphs, planner=loading(RESULT, seen)))
    for activity in (SKATE, "running", "cycling"):
        response = client.post("/routes", json={**HEART, "activity": activity})
        assert response.status_code == 200, response.json()
    assert seen == [
        (SKATE, ROLLER_NETWORK_NAME),
        ("running", FOOT_NETWORK_NAME),
        ("cycling", BIKE_NETWORK_NAME),
    ]
    assert len(roller.asked) == len(foot.asked) == len(bike.asked) == 1


def test_a_skate_job_goes_on_the_roller_network_too() -> None:
    graphs, _, _, _ = three_networks()
    seen: list[tuple[str, str]] = []
    with TestClient(create_app(graphs, planner=loading(RESULT, seen))) as client:
        job = client.post("/route-jobs", json={**HEART, "activity": SKATE}).json()
        assert finished(client, job["job_id"])["status"] == "done"
    assert seen == [(SKATE, ROLLER_NETWORK_NAME)]


@pytest.mark.parametrize("distance", [1_000, 4_999, 30_001, 40_000])
def test_a_skate_out_of_its_distances_is_refused(distance: int) -> None:
    graphs, _, _, _ = three_networks()
    client = TestClient(create_app(graphs, planner=loading(RESULT, [])))
    body = {**HEART, "activity": SKATE, "distance_m": distance}
    answer = client.post("/routes", json=body)
    assert answer.status_code == 422
    assert answer.json()["error"]["code"] == "invalid_request"
    assert f"for {SKATE}" in answer.json()["error"]["message"]


# --- the shape game ---------------------------------------------------------------


def test_a_skate_counts_in_the_shape_game_as_a_walk() -> None:
    assert INLINE_SKATING == SKATE and SKATE in ON_FOOT
    # No run saved before 0055 could be a skate: the rules kept their version
    # 2 (3 is TASK-423's best times, which a skate has none of).
    assert RULES_VERSION >= 2
    # 8 km at 18 km/h, a skater's pace.
    fixes = Runner().run(8_000, 5.0).fixes
    skate, walk = evaluate(fixes, [], SKATE), evaluate(fixes, [], "walking")
    assert skate.counted and skate.counted_m == walk.counted_m > 7_900
    # The pace shapes are a run's: no best times.
    assert skate.best_s == {}
    assert evaluate(fixes, [], "running").best_s != {}


def test_a_skate_has_vehicle_thresholds_of_its_own() -> None:
    # The user's choice of 2026-11-06: 35 km/h over 200 m, 28 on average.
    assert speed_limits(SKATE) == (SKATE_VEHICLE_SPEED_MPS, SKATE_MAX_MEAN_SPEED_MPS)
    assert round(SKATE_VEHICLE_SPEED_MPS * 3.6, 6) == 35
    assert round(SKATE_MAX_MEAN_SPEED_MPS * 3.6, 6) == 28
    # The other sports on foot keep a run's.
    for activity in ("running", "walking", "hiking"):
        assert speed_limits(activity) == (VEHICLE_SPEED_MPS, MAX_MEAN_SPEED_MPS)


def test_a_fast_skater_counts_where_a_runner_would_not() -> None:
    # 8 km at 27 km/h: a run's "vehicle", a fast skater's pace.
    fixes = Runner().run(8_000, 7.5).fixes
    skate, run = evaluate(fixes, [], SKATE), evaluate(fixes, [], "running")
    assert skate.counted and skate.reason is None and skate.counted_m > 7_900
    assert run.reason == VEHICLE


def test_a_skate_rolls_down_a_hill_at_34_km_h_and_keeps_its_metres() -> None:
    # 1 km downhill at 34 km/h in 8 km at 20: none of it is a vehicle's.
    fixes = Runner().run(3_500, 5.5).run(1_000, 9.4).run(3_500, 5.5).fixes
    skate, run = evaluate(fixes, [], SKATE), evaluate(fixes, [], "running")
    assert skate.counted and abs(skate.counted_m - 8_000) <= 1
    assert run.reason == VEHICLE


def test_a_skate_above_35_km_h_for_more_than_a_tenth_does_not_count() -> None:
    # A kilometre at 41 km/h in 5: a fifth of it.
    fixes = Runner().run(2_000, 5.0).run(1_000, 11.5).run(2_000, 5.0).fixes
    game = evaluate(fixes, [], SKATE)
    assert not game.counted and game.reason == VEHICLE


def test_a_skate_above_28_km_h_on_average_does_not_count() -> None:
    # 4 km at 28.8 km/h: no stretch above 35, but a bike's mean.
    game = evaluate(Runner().run(4_000, 8.0).fixes, [], SKATE)
    assert not game.counted and game.reason == VEHICLE


# --- the bests --------------------------------------------------------------------


def _skate(km: float, kmh: float) -> list[TrackPoint]:
    """A straight skate north from TOWN at `kmh`, a point every 50 m."""
    step_m, points = 50.0, []
    for n in range(int(km * 1_000 / step_m) + 1):
        lat = TOWN[0] + n * step_m / 111_195.0
        points.append(TrackPoint(lat, TOWN[1], n * step_m / (kmh / 3.6)))
    return points


def test_the_bests_of_a_skate_are_a_run_s_distances_of_its_own() -> None:
    sports: tuple[Sport, ...] = get_args(Sport)
    # A wheelchair after it since TASK-414.
    assert sports == (
        "running",
        "cycling",
        "mountain_biking",
        SKATE,
        "wheelchair",
        "gravel_biking",
    )
    assert list(SPORTS) == list(sports)
    assert [d.name for d in ON_SKATES.distances] == ["5k", "10k", "half", "marathon"]
    run_metres = {d.name: d.metres for d in RUN_BESTS.distances}
    for distance in ON_SKATES.distances:
        assert distance.metres == run_metres[distance.name]
        # The floor is a jump of the GPS: 60 km/h.
        assert distance.record_s == int(distance.metres / (ON_SKATES_KMH / 3.6))
    assert ON_SKATES.max_step_kmh == ON_SKATES_KMH == 60


def test_a_skate_has_its_bests_where_a_run_has_none() -> None:
    # 22 km at 30 km/h: faster than a run's jump of a step, a skate's pace.
    track = _skate(22, 30.0)
    skate = bests(track, [], SKATE)
    assert set(skate) == {"5k", "10k", "half"}
    assert math.isclose(skate["10k"], 10_000 / (30 / 3.6), abs_tol=1)
    assert bests(track, [], "running") == {}
    found = {(b.sport, b.distance) for b in run_bests(track, [])}
    assert {(SKATE, name) for name in skate} <= found
    assert not {b for b in found if b[0] == "running"}


def test_a_skate_faster_than_a_jump_of_the_gps_has_no_bests() -> None:
    assert bests(_skate(6, 70.0), [], SKATE) == {}


# --- what an app reads ------------------------------------------------------------


def test_an_app_of_before_never_reads_a_skate() -> None:
    assert SKATE in NEWER_ACTIVITIES
    assert not OLD_APP.shows(SKATE)
    before = "swimming,hiking,mountain_biking,walking,gravel_biking,skiing,gym"
    assert not reads_from([before]).shows(SKATE)
    assert reads_from([f"{before},{SKATE}"]).shows(SKATE)
    reads = json.loads((CONTRACT / "reads.json").read_text())
    assert SKATE in reads["kinds"]


def test_the_newer_activities_are_in_the_order_of_run_activity() -> None:
    order = list(get_args(RunActivity))
    assert list(NEWER_ACTIVITIES) == [a for a in order if a in NEWER_ACTIVITIES]


# --- the migration ----------------------------------------------------------------

CHECKS = (
    "favorites_activity_check",
    "runs_activity_check",
    "group_runs_activity_check",
    "run_bests_sport_check",
)


def _checks(db: Database) -> dict[str, list[str]]:
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT conname, pg_get_constraintdef(oid) AS check FROM pg_constraint"
            " WHERE conname = ANY(%s)",
            (list(CHECKS),),
        ).fetchall()
    return {
        str(row["conname"]): re.findall(r"'([a-z_]+)'", str(row["check"]))
        for row in rows
    }


def test_the_migration_adds_inline_skating_to_the_four_tables_and_keeps_the_rest(
    database_url: str, tmp_path: Path
) -> None:
    ours = [path for path in migrations() if path.name == MIGRATION]
    assert len(ours) == 1
    for path in migrations():
        if path.name < MIGRATION:
            shutil.copy(path, tmp_path / path.name)
    database = Database(database_url)
    database.migrate(tmp_path)
    before = _checks(database)
    assert set(before) == set(CHECKS)
    assert not any(SKATE in kept for kept in before.values())
    assert before["run_bests_sport_check"] == [
        "running",
        "cycling",
        "mountain_biking",
        "gravel_biking",
    ]
    shutil.copy(ours[0], tmp_path / MIGRATION)
    assert database.migrate(tmp_path) == [MIGRATION.removesuffix(".sql")]
    assert database.migrate(tmp_path) == []
    after = _checks(database)
    assert after == {name: [*kept, SKATE] for name, kept in before.items()}
