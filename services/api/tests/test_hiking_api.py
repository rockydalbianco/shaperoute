"""A hike in the API (TASK-377 part A, ADR-0321): a `hiking` request is
1-30 km and the engine draws it on the hike network, in zones of its own;
its GPX says "hiking"; a hike saved goes to Strava as a "Hike" and counts in
the shape game as a walk, without best times. The database takes it in the
three tables that check the activity, keeping the activities before.

No network: the planner is a stand-in that says which network it was given.
"""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from typing import Any, get_args

import pytest
from fastapi.testclient import TestClient
from route_engine.models import (
    DISTANCE_LIMITS_M,
    InvalidRequestError,
    check_distance,
)
from route_engine.network import (
    BIKE_NETWORK_NAME,
    FOOT_NETWORK_NAME,
    OsmnxSource,
)
from route_engine.networks.hike import HIKE_FILTER, HIKE_NETWORK_NAME
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
from shaperoute_api.game_rules import RULES_VERSION, VEHICLE, evaluate
from shaperoute_api.graphs import ZoneGraphs
from shaperoute_api.reads import NEWER_ACTIVITIES, OLD_APP, reads_from
from shaperoute_api.run_gpx import gpx_type
from shaperoute_api.schemas import ACTIVITY_DESCRIPTION, RouteRequestBody
from shaperoute_api.sports import SPORTS_BY_ACTIVITY
from shaperoute_api.strava import SPORT_TYPES

REPO = Path(__file__).resolve().parents[3]
CONTRACT = REPO / "packages" / "shared-types" / "fixtures"
MIGRATION = "0051_hiking.sql"
HIKE_STAR: dict[str, Any] = {
    "start": list(TOWN),
    "shape": "star",
    "distance_m": 10_000,
    "activity": "hiking",
}


def three_networks() -> tuple[ActivityGraphs, Network, Network, Network]:
    foot, bike = Network(FOOT_NETWORK_NAME), Network(BIKE_NETWORK_NAME)
    hike = Network(HIKE_NETWORK_NAME)
    graphs = ActivityGraphs({"running": foot, "cycling": bike, "hiking": hike})
    return graphs, foot, bike, hike


# --- the contract ----------------------------------------------------------------


def test_hiking_is_an_activity_of_the_api_before_the_walk() -> None:
    check_supported("hiking")
    assert API_ACTIVITIES.index("hiking") == API_ACTIVITIES.index("walking") - 1
    assert DISTANCE_LIMITS_M["hiking"] == (1_000, 30_000)
    assert API_DISTANCE_LIMITS_M["hiking"] == (1_000, 30_000)
    contract = json.loads((CONTRACT / "contract.json").read_text())
    assert contract["activities"] == list(API_ACTIVITIES)
    assert contract["distance_limits_m"]["hiking"] == [1_000, 30_000]
    run_activities = json.loads((CONTRACT / "run-activities.json").read_text())
    assert "hiking" in run_activities["run_activities"]
    assert "hiking" in get_args(RunActivity)


def test_the_request_of_shared_types_is_a_hike() -> None:
    request = json.loads((CONTRACT / "route-request-hiking.json").read_text())
    body = RouteRequestBody.model_validate(request)
    assert body.activity == "hiking"
    low, high = DISTANCE_LIMITS_M["hiking"]
    assert low <= body.distance_m <= high
    assert "hiking on the trails" in ACTIVITY_DESCRIPTION


def test_a_hike_is_drawn_as_a_hike() -> None:
    assert engine_activity("hiking", 10_000) == "hiking"


# --- the sport --------------------------------------------------------------------


def test_the_sport_of_a_hike() -> None:
    sport = SPORTS_BY_ACTIVITY["hiking"]
    assert not sport.record_only and not sport.trackless
    assert sport.bests is None  # as a walk: no personal bests
    assert SPORT_TYPES["hiking"] == "Hike"
    assert gpx_type("hiking") == "hiking"
    # Zones of its own, around a city as a run's, with the street names.
    assert ZONES_IN_MEMORY["hiking"] == 1
    assert prefetch_zones.ZONE_BOXES["hiking"] is prefetch_zones.zone_box
    assert prefetch_zones.STREET_NAMES["hiking"] is True


# --- where it is drawn ------------------------------------------------------------


def test_the_api_keeps_the_hike_zones_apart(tmp_path: Path) -> None:
    graphs = ActivityGraphs.from_cache(tmp_path)
    hike = graphs.for_activity("hiking")
    assert isinstance(hike, ZoneGraphs)
    assert hike is not graphs.for_activity("running")
    assert hike is not graphs.for_activity("walking")
    source = OsmnxSource.for_activity(tmp_path, "hiking")
    assert (source.network_name, source.custom_filter) == ("hike", HIKE_FILTER)


def test_a_hike_goes_on_the_hike_network() -> None:
    graphs, foot, bike, hike = three_networks()
    seen: list[tuple[str, str]] = []
    client = TestClient(create_app(graphs, planner=loading(RESULT, seen)))
    response = client.post("/routes", json=HIKE_STAR)
    assert response.status_code == 200, response.json()
    assert seen == [("hiking", HIKE_NETWORK_NAME)]
    assert hike.asked and foot.asked == [] and bike.asked == []


def test_a_hike_job_goes_on_the_hike_network_too() -> None:
    graphs, _, _, _ = three_networks()
    seen: list[tuple[str, str]] = []
    with TestClient(create_app(graphs, planner=loading(RESULT, seen))) as client:
        job = client.post("/route-jobs", json=HIKE_STAR).json()
        assert finished(client, job["job_id"])["status"] == "done"
    assert seen == [("hiking", HIKE_NETWORK_NAME)]


def test_a_walk_and_a_run_stay_on_the_foot_network() -> None:
    graphs, foot, _, hike = three_networks()
    seen: list[tuple[str, str]] = []
    client = TestClient(create_app(graphs, planner=loading(RESULT, seen)))
    for activity in ("running", "walking"):
        answer = client.post("/routes", json={**HIKE_STAR, "activity": activity})
        assert answer.status_code == 200, answer.json()
    assert seen == [("running", FOOT_NETWORK_NAME)] * 2
    assert foot.asked and hike.asked == []


@pytest.mark.parametrize("distance", [500, 30_001, 40_000])
def test_a_hike_out_of_its_distances_is_refused(distance: int) -> None:
    graphs, _, _, _ = three_networks()
    client = TestClient(create_app(graphs, planner=loading(RESULT, [])))
    answer = client.post("/routes", json={**HIKE_STAR, "distance_m": distance})
    assert answer.status_code == 422
    assert answer.json()["error"]["code"] == "invalid_request"
    assert "for hiking" in answer.json()["error"]["message"]
    with pytest.raises(InvalidRequestError, match="for hiking"):
        check_distance(distance, "hiking")


# --- the shape game ---------------------------------------------------------------


def test_a_hike_counts_its_metres_as_a_walk_without_best_times() -> None:
    assert RULES_VERSION == 2  # no run saved before 0051 can be a hike
    fixes = Runner().run(8_000, 1.2).fixes
    hike, walk = evaluate(fixes, [], "hiking"), evaluate(fixes, [], "walking")
    assert hike.counted and hike.reason is None
    assert hike.counted_m == walk.counted_m
    assert abs(hike.counted_m - 8_000) <= 1
    assert hike.best_s == {}


def test_a_hike_has_the_checks_of_a_run() -> None:
    fixes = Runner().run(2_000, 1.2).run(1_000, 15.0).run(2_000, 1.2).fixes
    game = evaluate(fixes, [], "hiking")
    assert not game.counted and game.reason == VEHICLE


# --- what an app reads ------------------------------------------------------------


def test_an_app_of_before_never_reads_a_hike() -> None:
    assert "hiking" in NEWER_ACTIVITIES
    assert not OLD_APP.shows("hiking")
    assert not reads_from(["swimming,walking,skiing,xc_skiing"]).shows("hiking")
    assert reads_from(["swimming,hiking,walking"]).shows("hiking")


# --- the migration ----------------------------------------------------------------


def _checks(db: Database) -> dict[str, list[str]]:
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT conname, pg_get_constraintdef(oid) AS check FROM pg_constraint"
            " WHERE conname IN ('favorites_activity_check', 'runs_activity_check',"
            " 'group_runs_activity_check')"
        ).fetchall()
    return {
        str(row["conname"]): re.findall(r"'([a-z_]+)'", str(row["check"]))
        for row in rows
    }


def test_the_migration_adds_a_hike_to_the_three_tables_and_keeps_the_rest(
    database_url: str, tmp_path: Path
) -> None:
    hiking = [path for path in migrations() if path.name == MIGRATION]
    assert len(hiking) == 1
    for path in migrations():
        if path.name < MIGRATION:
            shutil.copy(path, tmp_path / path.name)
    database = Database(database_url)
    database.migrate(tmp_path)
    before = _checks(database)
    assert len(before) == 3 and not any("hiking" in kept for kept in before.values())
    shutil.copy(hiking[0], tmp_path / MIGRATION)
    assert database.migrate(tmp_path) == [MIGRATION.removesuffix(".sql")]
    assert database.migrate(tmp_path) == []
    after = _checks(database)
    assert after == {name: [*kept, "hiking"] for name, kept in before.items()}
