"""Paragliding in the API (TASK-305 parts R, ADR-0375).

A paragliding flight (`paragliding`) is recorded without a shape, as a day
of alpine skiing (TASK-375, ADR-0319): saved, listed and opened as any run,
read only by the apps that say so, sent to Strava as a "Workout" (Strava has
no type for it) and written in a GPX with its own <type>. No route request
may ask one, it counts nothing in the shape game and gives no personal best.
Its migration widens the check of runs only, keeping what was there before.
The numbers of a flight on a live link are in test_live_shares.py.
"""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from typing import Any, get_args

import pytest
from fastapi.testclient import TestClient
from route_engine.models import SUPPORTED_ACTIVITIES, InvalidRequestError
from route_engine.walking import API_ACTIVITIES
from test_game_rules import Runner
from test_personal_bests import (
    KEYS,
    client,  # noqa: F401  (the fixtures of the bests' tests)
    database,  # noqa: F401
    five_k,
    saved,
    signed_up,
)

from shaperoute_api.activities import RECORD_ACTIVITIES, RunActivity
from shaperoute_api.activity_graphs import check_supported
from shaperoute_api.db import Database, migrations
from shaperoute_api.game_rules import NOT_RUNNING, ON_FOOT, evaluate
from shaperoute_api.personal_bests import SPORTS, Sport
from shaperoute_api.reads import KINDS, NEWER_ACTIVITIES, OLD_APP, reads_from
from shaperoute_api.run_gpx import gpx_type, with_type
from shaperoute_api.sports import SPORTS_BY_ACTIVITY
from shaperoute_api.strava import SPORT_TYPES

REPO = Path(__file__).resolve().parents[3]
CONTRACT = REPO / "packages" / "shared-types" / "fixtures"
MIGRATION = "0069_paragliding.sql"
FLIGHT = "paragliding"


# --- the contract ----------------------------------------------------------------


def test_a_flight_is_recorded_without_a_shape_after_ski_touring() -> None:
    assert RECORD_ACTIVITIES == ("skiing", "xc_skiing", "ski_touring", FLIGHT)
    order = list(get_args(RunActivity))
    assert order.index(FLIGHT) == order.index("ski_touring") + 1
    assert order.index("gym") == order.index(FLIGHT) + 1
    run_activities = json.loads((CONTRACT / "run-activities.json").read_text())
    assert run_activities["run_activities"] == order
    assert run_activities["record_activities"] == list(RECORD_ACTIVITIES)
    # The contract of the routes keeps only what is drawn: no line there.
    contract = json.loads((CONTRACT / "contract.json").read_text())
    assert FLIGHT not in contract["activities"]
    assert FLIGHT not in contract["distance_limits_m"]


def test_no_route_is_planned_for_a_flight() -> None:
    assert FLIGHT not in API_ACTIVITIES
    assert FLIGHT not in SUPPORTED_ACTIVITIES
    with pytest.raises(InvalidRequestError):
        check_supported(FLIGHT)


# --- the sport --------------------------------------------------------------------


def test_the_sport_of_paragliding() -> None:
    sport = SPORTS_BY_ACTIVITY[FLIGHT]
    assert sport.record_only and not sport.trackless
    assert sport.bests is None and sport.zones is None
    assert sport.description is None
    assert SPORT_TYPES[FLIGHT] == "Workout"
    assert gpx_type(FLIGHT) == FLIGHT


def test_its_gpx_says_what_it_is() -> None:
    gpx = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">'
        "<trk><name>Flight</name><trkseg/></trk></gpx>\n"
    )
    typed = with_type(gpx, FLIGHT)
    assert re.search(r"<name>Flight</name>\s*<type>paragliding</type>", typed)


def test_a_flight_counts_nothing_in_the_shape_game() -> None:
    assert FLIGHT not in ON_FOOT
    game = evaluate(Runner().run(6_000, 1.5).fixes, [], FLIGHT)
    assert not game.counted and game.reason == NOT_RUNNING
    assert game.counted_m == 0 and game.best_s == {}


def test_a_flight_has_no_bests() -> None:
    assert FLIGHT not in SPORTS
    assert FLIGHT not in get_args(Sport)


# --- what an app reads ------------------------------------------------------------


def test_an_app_of_before_never_reads_a_flight() -> None:
    assert FLIGHT in NEWER_ACTIVITIES and FLIGHT in KINDS
    assert not OLD_APP.shows(FLIGHT)
    before = "swimming,hiking,mountain_biking,inline_skating,walking,skiing,ski_touring"
    assert not reads_from([before]).shows(FLIGHT)
    assert reads_from([f"{before},{FLIGHT}"]).shows(FLIGHT)
    reads = json.loads((CONTRACT / "reads.json").read_text())
    assert FLIGHT in reads["kinds"]
    assert reads_from([reads["this_app"]]).shows(FLIGHT)


def test_the_newer_activities_are_in_the_order_of_run_activity() -> None:
    order = list(get_args(RunActivity))
    assert list(NEWER_ACTIVITIES) == [a for a in order if a in NEWER_ACTIVITIES]


# --- saved ------------------------------------------------------------------------


def test_a_flight_is_saved_listed_and_opened(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client, 1)
    saved(client, me, KEYS[0], five_k(60, activity=FLIGHT))
    # An app that does not say it reads it sees nothing.
    assert client.get("/me/activities", headers=me).json()["activities"] == []
    (listed,) = client.get(
        "/me/activities", headers={**me, "X-MuW-Reads": FLIGHT}
    ).json()["activities"]
    assert listed["activity"] == FLIGHT
    whole = client.get(f"/me/activities/{KEYS[0]}", headers=me).json()
    assert whole["activity"] == FLIGHT


def test_a_flight_gives_no_personal_best(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    # The same 5 km at 12 km/h: a run's best, none for a flight.
    me = signed_up(client, 1)
    saved(client, me, KEYS[0], five_k(30))
    saved(client, me, KEYS[1], five_k(30, day=1, activity=FLIGHT))
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT a.activity, count(b.run_id) AS bests FROM runs a"
            " LEFT JOIN run_bests b ON b.run_id = a.id GROUP BY a.activity"
        ).fetchall()
    bests = {row["activity"]: row["bests"] for row in rows}
    assert bests["running"] > 0
    assert bests[FLIGHT] == 0


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


def test_the_migration_adds_paragliding_to_runs_only_and_keeps_the_rest(
    database_url: str, tmp_path: Path
) -> None:
    ours = [path for path in migrations() if path.name == MIGRATION]
    assert len(ours) == 1
    for path in migrations():
        if path.name < MIGRATION:
            shutil.copy(path, tmp_path / path.name)
    migrated = Database(database_url)
    migrated.migrate(tmp_path)
    before = _checks(migrated)
    assert set(before) == set(CHECKS)
    assert not any(FLIGHT in kept for kept in before.values())
    shutil.copy(ours[0], tmp_path / MIGRATION)
    assert migrated.migrate(tmp_path) == [MIGRATION.removesuffix(".sql")]
    assert migrated.migrate(tmp_path) == []
    after = _checks(migrated)
    expected: dict[str, Any] = {
        **before,
        "runs_activity_check": [*before["runs_activity_check"], FLIGHT],
    }
    assert after == expected
    # Every activity of a run is let in once all migrations ran.
    assert set(get_args(RunActivity)) <= set(after["runs_activity_check"])
