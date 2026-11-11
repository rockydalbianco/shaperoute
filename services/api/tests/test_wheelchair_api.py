"""A wheelchair or a stroller in the API (TASK-414 part A, ADR-0343).

A `wheelchair` request is 1-5 km, a circle, a heart, a star or a moon, and
the engine draws it on the wheel network, in zones of its own: any other
shape, a word or an image is an invalid request. Its GPX says what it is;
saved, it goes to Strava as a "Wheelchair", counts in the shape game as a
walk, with a run's "vehicle" thresholds and no best times, and has personal
bests of its own over 1 and 5 km. The database takes it in the three tables
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
from route_engine.network import FOOT_NETWORK_NAME, OsmnxSource
from route_engine.networks.wheel import WHEEL_FILTER, WHEEL_NETWORK_NAME
from route_engine.shapes import SUPPORTED_SHAPES
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
    MAX_MEAN_SPEED_MPS,
    ON_FOOT,
    VEHICLE,
    VEHICLE_SPEED_MPS,
    WHEELCHAIR,
    evaluate,
    speed_limits,
)
from shaperoute_api.graphs import ZoneGraphs
from shaperoute_api.personal_bests import SPORTS, Sport, bests, run_bests
from shaperoute_api.reads import NEWER_ACTIVITIES, OLD_APP, reads_from
from shaperoute_api.run_gpx import gpx_type
from shaperoute_api.schemas import ACTIVITY_DESCRIPTION, RouteRequestBody
from shaperoute_api.sports import SPORTS_BY_ACTIVITY
from shaperoute_api.sports.wheelchair import PUSHED, PUSHED_KMH
from shaperoute_api.strava import SPORT_TYPES

REPO = Path(__file__).resolve().parents[3]
CONTRACT = REPO / "packages" / "shared-types" / "fixtures"
MIGRATION = "0069_wheelchair.sql"
WHEELS = "wheelchair"
SIMPLE = ("circle", "heart", "star", "moon")
HEART: dict[str, Any] = {
    "start": list(TOWN),
    "shape": "heart",
    "distance_m": 3_000,
}


def two_networks() -> tuple[ActivityGraphs, Network, Network]:
    foot, wheel = Network(FOOT_NETWORK_NAME), Network(WHEEL_NETWORK_NAME)
    graphs = ActivityGraphs({"running": foot, WHEELS: wheel})
    return graphs, foot, wheel


# --- the contract ----------------------------------------------------------------


def test_wheelchair_is_an_activity_of_the_api_1_to_5_km() -> None:
    check_supported(WHEELS)
    assert API_DISTANCE_LIMITS_M[WHEELS] == (1_000, 5_000)
    assert WHEELS in get_args(RunActivity)
    # The engine's, after snowshoeing.
    assert WHEELS in SUPPORTED_ACTIVITIES
    assert DISTANCE_LIMITS_M[WHEELS] == (1_000, 5_000)
    assert API_ACTIVITIES.index(WHEELS) == API_ACTIVITIES.index("snowshoeing") + 1
    assert engine_activity(WHEELS, 3_000) == WHEELS
    contract = json.loads((CONTRACT / "contract.json").read_text())
    assert contract["activities"] == list(API_ACTIVITIES)
    assert contract["distance_limits_m"][WHEELS] == [1_000, 5_000]
    run_activities = json.loads((CONTRACT / "run-activities.json").read_text())
    assert run_activities["run_activities"] == list(get_args(RunActivity))


def test_the_request_of_shared_types_is_one() -> None:
    request = json.loads((CONTRACT / f"route-request-{WHEELS}.json").read_text())
    body = RouteRequestBody.model_validate(request)
    assert body.activity == WHEELS
    assert body.shape in SIMPLE
    low, high = API_DISTANCE_LIMITS_M[WHEELS]
    assert low <= body.distance_m <= high


def test_the_description_says_how_it_is_drawn() -> None:
    assert "wheelchair for a wheelchair or a stroller, 1-5 km, a circle" in (
        ACTIVITY_DESCRIPTION
    )


# --- the sport --------------------------------------------------------------------


def test_the_sport_of_a_wheelchair() -> None:
    sport = SPORTS_BY_ACTIVITY[WHEELS]
    assert not sport.record_only and not sport.trackless
    assert sport.bests is PUSHED
    # A wheelchair for a stroller too (the user's choice 8).
    assert SPORT_TYPES[WHEELS] == "Wheelchair"
    assert gpx_type(WHEELS) == WHEELS
    # Zones of its own, as large as its 5 km, with street names, one in memory.
    assert ZONES_IN_MEMORY[WHEELS] == 1
    city = (46.0671, 11.1214)
    assert prefetch_zones.ZONE_BOXES[WHEELS](city) == (
        prefetch_zones.longest_route_box(WHEELS)(city)
    )
    assert prefetch_zones.STREET_NAMES[WHEELS] is True


# --- where it is drawn ------------------------------------------------------------


def test_the_api_keeps_the_wheel_zones_apart(tmp_path: Path) -> None:
    graphs = ActivityGraphs.from_cache(tmp_path)
    wheel = graphs.for_activity(WHEELS)
    assert isinstance(wheel, ZoneGraphs)
    assert wheel is not graphs.for_activity("running")
    source = OsmnxSource.for_activity(tmp_path, WHEELS)
    assert (source.network_name, source.custom_filter) == ("wheel", WHEEL_FILTER)


def test_a_wheelchair_route_goes_on_the_wheel_network() -> None:
    graphs, foot, wheel = two_networks()
    seen: list[tuple[str, str]] = []
    client = TestClient(create_app(graphs, planner=loading(RESULT, seen)))
    for activity in (WHEELS, "running"):
        response = client.post("/routes", json={**HEART, "activity": activity})
        assert response.status_code == 200, response.json()
    assert seen == [(WHEELS, WHEEL_NETWORK_NAME), ("running", FOOT_NETWORK_NAME)]
    assert len(wheel.asked) == len(foot.asked) == 1


def test_a_wheelchair_job_goes_on_the_wheel_network_too() -> None:
    graphs, _, _ = two_networks()
    seen: list[tuple[str, str]] = []
    with TestClient(create_app(graphs, planner=loading(RESULT, seen))) as client:
        job = client.post("/route-jobs", json={**HEART, "activity": WHEELS}).json()
        assert finished(client, job["job_id"])["status"] == "done"
    assert seen == [(WHEELS, WHEEL_NETWORK_NAME)]


@pytest.mark.parametrize("distance", [500, 999, 5_001, 10_000])
def test_a_wheelchair_route_out_of_its_distances_is_refused(distance: int) -> None:
    graphs, _, _ = two_networks()
    client = TestClient(create_app(graphs, planner=loading(RESULT, [])))
    body = {**HEART, "activity": WHEELS, "distance_m": distance}
    answer = client.post("/routes", json=body)
    assert answer.status_code == 422
    assert answer.json()["error"]["code"] == "invalid_request"
    assert f"for {WHEELS}" in answer.json()["error"]["message"]


@pytest.mark.parametrize("shape", SIMPLE)
def test_the_simple_shapes_are_drawn(shape: str) -> None:
    graphs, _, wheel = two_networks()
    client = TestClient(create_app(graphs, planner=loading(RESULT, [])))
    body = {**HEART, "shape": shape, "activity": WHEELS}
    assert client.post("/routes", json=body).status_code == 200
    assert len(wheel.asked) == 1


@pytest.mark.parametrize("shape", ["horse", "cat", "smiley", "pear"])
def test_another_shape_is_refused_before_the_network(shape: str) -> None:
    assert shape in SUPPORTED_SHAPES
    graphs, foot, wheel = two_networks()
    client = TestClient(create_app(graphs, planner=loading(RESULT, [])))
    answer = client.post("/routes", json={**HEART, "shape": shape, "activity": WHEELS})
    assert answer.status_code == 422
    assert answer.json()["error"]["code"] == "invalid_request"
    assert answer.json()["error"]["message"] == (
        f"wheelchair draws only these shapes: circle, heart, star, moon, not {shape}"
    )
    assert wheel.asked == foot.asked == []
    # On foot, the same shape is drawn as before.
    body = {**HEART, "shape": shape, "activity": "running"}
    assert client.post("/routes", json=body).status_code == 200


def test_a_word_is_refused() -> None:
    graphs, _, wheel = two_networks()
    client = TestClient(create_app(graphs, planner=loading(RESULT, [])))
    body = {
        "start": list(TOWN),
        "word": "HI",
        "distance_m": 5_000,
        "activity": WHEELS,
    }
    answer = client.post("/routes", json=body)
    assert answer.status_code == 422
    assert answer.json()["error"]["code"] == "invalid_request"
    assert "not a word" in answer.json()["error"]["message"]
    assert wheel.asked == []


# --- the shape game ---------------------------------------------------------------


def test_a_wheelchair_route_counts_in_the_shape_game_as_a_walk() -> None:
    assert WHEELCHAIR == WHEELS and WHEELS in ON_FOOT
    # 4 km at 6 km/h, pushing a stroller.
    fixes = Runner().run(4_000, 1.7).fixes
    wheels, walk = evaluate(fixes, [], WHEELS), evaluate(fixes, [], "walking")
    assert wheels.counted and wheels.counted_m == walk.counted_m > 3_900
    # The pace shapes are a run's: no best times.
    assert wheels.best_s == {}


def test_a_wheelchair_route_has_a_run_s_vehicle_thresholds() -> None:
    # Whoever pushes does not reach 25 km/h (decided by the agent).
    assert speed_limits(WHEELS) == (VEHICLE_SPEED_MPS, MAX_MEAN_SPEED_MPS)
    # 4 km at 28.8 km/h: a vehicle's.
    game = evaluate(Runner().run(4_000, 8.0).fixes, [], WHEELS)
    assert not game.counted and game.reason == VEHICLE


# --- the bests --------------------------------------------------------------------


def _push(km: float, kmh: float) -> list[TrackPoint]:
    """A straight push north from TOWN at `kmh`, a point every 50 m."""
    step_m, points = 50.0, []
    for n in range(int(km * 1_000 / step_m) + 1):
        lat = TOWN[0] + n * step_m / 111_195.0
        points.append(TrackPoint(lat, TOWN[1], n * step_m / (kmh / 3.6)))
    return points


def test_the_bests_of_a_wheelchair_are_1_and_5_km_of_its_own() -> None:
    sports: tuple[Sport, ...] = get_args(Sport)
    assert sports == (
        "running",
        "cycling",
        "mountain_biking",
        "inline_skating",
        WHEELS,
        "gravel_biking",
    )
    # In the order of the sports (shaperoute_api/sports).
    assert list(SPORTS) == [
        "running",
        "cycling",
        "mountain_biking",
        "inline_skating",
        WHEELS,
        "gravel_biking",
    ]
    assert [(d.name, d.metres) for d in PUSHED.distances] == [
        ("1k", 1_000),
        ("5k", 5_000),
    ]
    for distance in PUSHED.distances:
        # The floor is a jump of the GPS on foot: 25 km/h.
        assert distance.record_s == int(distance.metres / (PUSHED_KMH / 3.6))
    assert PUSHED.max_step_kmh == PUSHED_KMH == 25


def test_a_wheelchair_route_has_its_bests() -> None:
    # 6 km at 7 km/h.
    track = _push(6, 7.0)
    wheels = bests(track, [], WHEELS)
    assert set(wheels) == {"1k", "5k"}
    assert math.isclose(wheels["5k"], 5_000 / (7 / 3.6), abs_tol=1)
    found = {(b.sport, b.distance) for b in run_bests(track, [])}
    assert {(WHEELS, name) for name in wheels} <= found


def test_a_wheelchair_route_faster_than_a_jump_of_the_gps_has_no_bests() -> None:
    assert bests(_push(6, 30.0), [], WHEELS) == {}


# --- what an app reads ------------------------------------------------------------


def test_an_app_of_before_never_reads_a_wheelchair_route() -> None:
    assert WHEELS in NEWER_ACTIVITIES
    assert not OLD_APP.shows(WHEELS)
    before = "swimming,hiking,mountain_biking,inline_skating,snowshoeing,walking"
    assert not reads_from([before]).shows(WHEELS)
    assert reads_from([f"{before},{WHEELS}"]).shows(WHEELS)
    reads = json.loads((CONTRACT / "reads.json").read_text())
    assert WHEELS in reads["kinds"]


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


def test_the_migration_adds_wheelchair_to_the_four_tables_and_keeps_the_rest(
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
    assert not any(WHEELS in kept for kept in before.values())
    shutil.copy(ours[0], tmp_path / MIGRATION)
    assert database.migrate(tmp_path) == [MIGRATION.removesuffix(".sql")]
    assert database.migrate(tmp_path) == []
    after = _checks(database)
    assert after == {name: [*kept, WHEELS] for name, kept in before.items()}
    # Every activity of a run is let in once all migrations ran.
    assert set(get_args(RunActivity)) <= set(after["runs_activity_check"])
