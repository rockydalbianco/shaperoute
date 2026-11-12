"""Gravel and MTB in the API (TASK-378 part A, ADR-0322).

A `mountain_biking` request is 10-30 km and the engine draws it on the MTB
network, in zones of its own; a `gravel_biking` request is 10-30 km and the
engine draws it as a ride on the bike zones. Their GPX says what they are;
saved, they go to Strava as a "MountainBikeRide" and a "GravelRide", stay out
of the shape game as a ride, and have personal bests of their own over a
ride's distances. The database takes them in the three tables that check
the activity and in the bests, keeping what was there before.

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
from route_engine.network import (
    BIKE_FILTER,
    BIKE_NETWORK_NAME,
    FOOT_NETWORK_NAME,
    OsmnxSource,
)
from route_engine.networks.mtb import MTB_NETWORK_NAME
from route_engine.track_score import TrackPoint
from route_engine.walking import API_ACTIVITIES, API_DISTANCE_LIMITS_M, engine_activity
from test_cycling import RESULT, TOWN, Network, finished, loading
from test_game_rules import Runner
from test_sport_registry_api import in_the_contract

from shaperoute_api import prefetch_zones
from shaperoute_api.activities import RunActivity
from shaperoute_api.activity_graphs import (
    ZONES_IN_MEMORY,
    ActivityGraphs,
    check_supported,
)
from shaperoute_api.app import create_app
from shaperoute_api.db import Database, migrations
from shaperoute_api.game_rules import NOT_RUNNING, evaluate
from shaperoute_api.graphs import ZoneGraphs
from shaperoute_api.personal_bests import SPORTS, Sport, bests, run_bests
from shaperoute_api.reads import NEWER_ACTIVITIES, OLD_APP, reads_from
from shaperoute_api.run_gpx import gpx_type
from shaperoute_api.schemas import ACTIVITY_DESCRIPTION, RouteRequestBody
from shaperoute_api.sports import SPORTS_BY_ACTIVITY
from shaperoute_api.sports.cycling import BY_BIKE
from shaperoute_api.strava import SPORT_TYPES

REPO = Path(__file__).resolve().parents[3]
CONTRACT = REPO / "packages" / "shared-types" / "fixtures"
MIGRATION = "0052_gravel_mtb.sql"
GRAVEL, MTB = "gravel_biking", "mountain_biking"
HEART: dict[str, Any] = {
    "start": list(TOWN),
    "shape": "heart",
    "distance_m": 10_000,
}


def four_networks() -> tuple[ActivityGraphs, Network, Network, Network]:
    foot, bike = Network(FOOT_NETWORK_NAME), Network(BIKE_NETWORK_NAME)
    mtb = Network(MTB_NETWORK_NAME)
    graphs = ActivityGraphs(
        {"running": foot, "cycling": bike, "hiking": Network("hike"), MTB: mtb}
    )
    return graphs, foot, bike, mtb


# --- the contract ----------------------------------------------------------------


def test_gravel_and_mtb_are_activities_of_the_api_10_to_30_km() -> None:
    for activity in (GRAVEL, MTB):
        check_supported(activity)
        assert API_DISTANCE_LIMITS_M[activity] == (10_000, 30_000)
        assert activity in get_args(RunActivity)
    # MTB is the engine's, after the hike; gravel the API's, after the walk.
    assert MTB in SUPPORTED_ACTIVITIES and GRAVEL not in SUPPORTED_ACTIVITIES
    assert DISTANCE_LIMITS_M[MTB] == (10_000, 30_000)
    assert API_ACTIVITIES.index(MTB) == API_ACTIVITIES.index("hiking") + 1
    assert API_ACTIVITIES.index(GRAVEL) == API_ACTIVITIES.index("walking") + 1
    contract = json.loads((CONTRACT / "contract.json").read_text())
    assert contract["activities"] == list(API_ACTIVITIES)
    for activity in (GRAVEL, MTB):
        assert contract["distance_limits_m"][activity] == [10_000, 30_000]
    run_activities = json.loads((CONTRACT / "run-activities.json").read_text())
    # But a day of alpinism, on the server before the contract (TASK-463).
    assert run_activities["run_activities"] == in_the_contract(get_args(RunActivity))


@pytest.mark.parametrize("activity", [GRAVEL, MTB])
def test_the_request_of_shared_types_is_one(activity: str) -> None:
    request = json.loads((CONTRACT / f"route-request-{activity}.json").read_text())
    body = RouteRequestBody.model_validate(request)
    assert body.activity == activity
    low, high = API_DISTANCE_LIMITS_M[activity]
    assert low <= body.distance_m <= high


def test_the_description_says_how_each_is_drawn() -> None:
    assert "gravel_biking is drawn as cycling" in ACTIVITY_DESCRIPTION
    assert "mountain_biking on the bike network with the trails" in (
        ACTIVITY_DESCRIPTION
    )


def test_a_gravel_ride_is_drawn_as_a_ride_an_mtb_ride_as_itself() -> None:
    assert engine_activity(GRAVEL, 20_000) == "cycling"
    assert engine_activity(MTB, 20_000) == MTB


# --- the sports -------------------------------------------------------------------


def test_the_sports_of_gravel_and_mtb() -> None:
    gravel, mtb = SPORTS_BY_ACTIVITY[GRAVEL], SPORTS_BY_ACTIVITY[MTB]
    for sport in (gravel, mtb):
        assert not sport.record_only and not sport.trackless
        # A ride's bests, kept apart from a ride's (the user's choice 6).
        assert sport.bests is BY_BIKE
    assert SPORT_TYPES[GRAVEL] == "GravelRide"
    assert SPORT_TYPES[MTB] == "MountainBikeRide"
    assert gpx_type(GRAVEL) == GRAVEL
    assert gpx_type(MTB) == MTB
    # MTB has zones of its own, a ride's size, one in memory beside the
    # bike's; gravel rides the bike zones, as a walk the run's.
    assert gravel.zones is None
    assert ZONES_IN_MEMORY[MTB] == 1
    assert GRAVEL not in ZONES_IN_MEMORY
    # A ride's longest route, 30 km: the same box as a ride's.
    city = (46.0671, 11.1214)
    assert prefetch_zones.ZONE_BOXES[MTB](city) == prefetch_zones.bike_zone_box(city)
    assert prefetch_zones.STREET_NAMES[MTB] is False


# --- where they are drawn ---------------------------------------------------------


def test_the_api_keeps_the_mtb_zones_apart_and_gravel_on_the_bike_ones(
    tmp_path: Path,
) -> None:
    graphs = ActivityGraphs.from_cache(tmp_path)
    mtb = graphs.for_activity(MTB)
    assert isinstance(mtb, ZoneGraphs)
    assert mtb is not graphs.for_activity("cycling")
    assert graphs.for_activity(GRAVEL) is graphs.for_activity("cycling")
    source = OsmnxSource.for_activity(tmp_path, MTB)
    assert (source.network_name, source.custom_filter) == ("mtb", BIKE_FILTER)


def test_an_mtb_ride_goes_on_the_mtb_network_a_gravel_ride_on_the_bike_one() -> None:
    graphs, foot, bike, mtb = four_networks()
    seen: list[tuple[str, str]] = []
    client = TestClient(create_app(graphs, planner=loading(RESULT, seen)))
    for activity in (MTB, GRAVEL, "cycling"):
        response = client.post("/routes", json={**HEART, "activity": activity})
        assert response.status_code == 200, response.json()
    assert seen == [
        (MTB, MTB_NETWORK_NAME),
        ("cycling", BIKE_NETWORK_NAME),
        ("cycling", BIKE_NETWORK_NAME),
    ]
    assert len(mtb.asked) == 1 and len(bike.asked) == 2 and foot.asked == []


def test_an_mtb_job_goes_on_the_mtb_network_too() -> None:
    graphs, _, _, _ = four_networks()
    seen: list[tuple[str, str]] = []
    with TestClient(create_app(graphs, planner=loading(RESULT, seen))) as client:
        job = client.post("/route-jobs", json={**HEART, "activity": MTB}).json()
        assert finished(client, job["job_id"])["status"] == "done"
    assert seen == [(MTB, MTB_NETWORK_NAME)]


@pytest.mark.parametrize("activity", [GRAVEL, MTB])
@pytest.mark.parametrize("distance", [5_000, 9_999, 30_001, 40_000])
def test_a_ride_out_of_its_distances_is_refused(activity: str, distance: int) -> None:
    graphs, _, _, _ = four_networks()
    client = TestClient(create_app(graphs, planner=loading(RESULT, [])))
    body = {**HEART, "activity": activity, "distance_m": distance}
    answer = client.post("/routes", json=body)
    assert answer.status_code == 422
    assert answer.json()["error"]["code"] == "invalid_request"
    assert f"for {activity}" in answer.json()["error"]["message"]


# --- the shape game and the bests -------------------------------------------------


@pytest.mark.parametrize("activity", [GRAVEL, MTB])
def test_gravel_and_mtb_stay_out_of_the_shape_game_as_a_ride(activity: str) -> None:
    fixes = Runner().run(8_000, 6.0).fixes
    game, ride = evaluate(fixes, [], activity), evaluate(fixes, [], "cycling")
    assert not game.counted and game.reason == NOT_RUNNING
    assert (game.counted, game.reason) == (ride.counted, ride.reason)


def _ride(km: float, kmh: float) -> list[TrackPoint]:
    """A straight ride north from TOWN at `kmh`, a point every 50 m."""
    step_m, points = 50.0, []
    for n in range(int(km * 1_000 / step_m) + 1):
        lat = TOWN[0] + n * step_m / 111_195.0
        points.append(TrackPoint(lat, TOWN[1], n * step_m / (kmh / 3.6)))
    return points


def test_gravel_and_mtb_have_a_ride_s_bests_of_their_own() -> None:
    sports: tuple[Sport, ...] = get_args(Sport)
    # A skate between them since TASK-380, and a wheelchair since TASK-414.
    assert sports == ("running", "cycling", MTB, "inline_skating", "wheelchair", GRAVEL)
    assert list(SPORTS) == list(sports)
    track = _ride(21, 25.0)
    ride = bests(track, [], "cycling")
    assert set(ride) == {"10k", "20k"}
    assert bests(track, [], MTB) == ride
    assert bests(track, [], GRAVEL) == ride
    assert math.isclose(ride["10k"], 10_000 / (25 / 3.6), abs_tol=1)
    # Every run has the bests of each sport, the profile reads its own.
    found = {(b.sport, b.distance) for b in run_bests(track, [])}
    assert {(s, d) for s, d in found if s != "inline_skating"} == {
        (sport, name) for sport in ("cycling", MTB, GRAVEL) for name in ride
    }


# --- what an app reads ------------------------------------------------------------


@pytest.mark.parametrize("activity", [GRAVEL, MTB])
def test_an_app_of_before_never_reads_a_gravel_nor_an_mtb_ride(activity: str) -> None:
    assert activity in NEWER_ACTIVITIES
    assert not OLD_APP.shows(activity)
    before = "swimming,hiking,walking,skiing,xc_skiing,gym,trackless"
    assert not reads_from([before]).shows(activity)
    assert reads_from([f"{before},{activity}"]).shows(activity)


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


def test_the_migration_adds_gravel_and_mtb_to_the_four_tables_and_keeps_the_rest(
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
    assert not any({GRAVEL, MTB} & set(kept) for kept in before.values())
    assert before["run_bests_sport_check"] == ["running", "cycling"]
    shutil.copy(ours[0], tmp_path / MIGRATION)
    assert database.migrate(tmp_path) == [MIGRATION.removesuffix(".sql")]
    assert database.migrate(tmp_path) == []
    after = _checks(database)
    assert after == {name: [*kept, MTB, GRAVEL] for name, kept in before.items()}
