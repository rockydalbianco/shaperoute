"""Alpinism in the API (TASK-463 part A, ADR-0373).

A day of alpinism (`alpinism`) is recorded without a shape, as a day of ski
touring and a paragliding flight: saved, listed and opened as any run, read
only by the apps that say so, sent to Strava as a "Hike" (Strava has no type
for it) and written in a GPX with its own <type>. No route request may ask
one, it counts nothing in the shape game and gives no personal best. Its
migration widens the check of runs only, keeping what was there before.

The server has it before the contract (SERVER_FIRST in
test_sport_registry_api.py): no app says it in X-MuW-Reads, so none
receives one until the app part brings the contract and the app's hidden
profile together.
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
from test_sport_registry_api import SERVER_FIRST, in_the_contract

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
MIGRATION = "0075_alpinism.sql"
CLIMB = "alpinism"


# --- the order, and the contract that does not have it yet ----------------------


def test_a_day_of_alpinism_is_recorded_without_a_shape_after_a_flight() -> None:
    assert RECORD_ACTIVITIES == (
        "skiing",
        "xc_skiing",
        "ski_touring",
        "paragliding",
        CLIMB,
    )
    order = list(get_args(RunActivity))
    assert order.index(CLIMB) == order.index("paragliding") + 1
    assert order.index("gym") == order.index(CLIMB) + 1


def test_the_server_has_it_before_the_contract() -> None:
    assert SERVER_FIRST == (CLIMB,)
    run_activities = json.loads((CONTRACT / "run-activities.json").read_text())
    assert CLIMB not in run_activities["run_activities"]
    assert CLIMB not in run_activities["record_activities"]
    # Everything else is the contract's, in its order.
    assert in_the_contract(get_args(RunActivity)) == run_activities["run_activities"]
    reads = json.loads((CONTRACT / "reads.json").read_text())
    assert CLIMB not in reads["kinds"]
    contract = json.loads((CONTRACT / "contract.json").read_text())
    assert CLIMB not in contract["activities"]
    assert CLIMB not in contract["distance_limits_m"]


def test_no_route_is_planned_for_a_day_of_alpinism() -> None:
    assert CLIMB not in API_ACTIVITIES
    assert CLIMB not in SUPPORTED_ACTIVITIES
    with pytest.raises(InvalidRequestError):
        check_supported(CLIMB)


# --- the sport --------------------------------------------------------------------


def test_the_sport_of_alpinism() -> None:
    sport = SPORTS_BY_ACTIVITY[CLIMB]
    assert sport.record_only and not sport.trackless
    assert sport.bests is None and sport.zones is None
    assert sport.description is None
    assert SPORT_TYPES[CLIMB] == "Hike"
    assert gpx_type(CLIMB) == CLIMB


def test_its_gpx_says_what_it_is() -> None:
    gpx = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">'
        "<trk><name>Climb</name><trkseg/></trk></gpx>\n"
    )
    typed = with_type(gpx, CLIMB)
    assert re.search(r"<name>Climb</name>\s*<type>alpinism</type>", typed)


def test_a_day_of_alpinism_counts_nothing_in_the_shape_game() -> None:
    assert CLIMB not in ON_FOOT
    game = evaluate(Runner().run(6_000, 1.5).fixes, [], CLIMB)
    assert not game.counted and game.reason == NOT_RUNNING
    assert game.counted_m == 0 and game.best_s == {}


def test_a_day_of_alpinism_has_no_bests() -> None:
    assert CLIMB not in SPORTS
    assert CLIMB not in get_args(Sport)


# --- what an app reads ------------------------------------------------------------


def test_no_app_of_today_reads_a_day_of_alpinism() -> None:
    assert CLIMB in NEWER_ACTIVITIES and CLIMB in KINDS
    assert not OLD_APP.shows(CLIMB)
    # The app of today says what the contract has: not this one.
    reads = json.loads((CONTRACT / "reads.json").read_text())
    assert not reads_from([reads["this_app"]]).shows(CLIMB)
    # An app that says it, the one of the app part, reads it.
    assert reads_from([f"{reads['this_app']},{CLIMB}"]).shows(CLIMB)


def test_the_newer_activities_are_in_the_order_of_run_activity() -> None:
    order = list(get_args(RunActivity))
    assert list(NEWER_ACTIVITIES) == [a for a in order if a in NEWER_ACTIVITIES]


# --- saved ------------------------------------------------------------------------


def test_a_day_of_alpinism_is_saved_listed_and_opened(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client, 1)
    saved(client, me, KEYS[0], five_k(90, activity=CLIMB))
    # An app that does not say it reads it sees nothing.
    assert client.get("/me/activities", headers=me).json()["activities"] == []
    (listed,) = client.get(
        "/me/activities", headers={**me, "X-MuW-Reads": CLIMB}
    ).json()["activities"]
    assert listed["activity"] == CLIMB
    whole = client.get(f"/me/activities/{KEYS[0]}", headers=me).json()
    assert whole["activity"] == CLIMB


def test_a_day_of_alpinism_gives_no_personal_best(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    # The same 5 km at 12 km/h: a run's best, none for a day of alpinism.
    me = signed_up(client, 1)
    saved(client, me, KEYS[0], five_k(30))
    saved(client, me, KEYS[1], five_k(30, day=1, activity=CLIMB))
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT a.activity, count(b.run_id) AS bests FROM runs a"
            " LEFT JOIN run_bests b ON b.run_id = a.id GROUP BY a.activity"
        ).fetchall()
    bests = {row["activity"]: row["bests"] for row in rows}
    assert bests["running"] > 0
    assert bests[CLIMB] == 0


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


def test_the_migration_adds_alpinism_to_runs_only_and_keeps_the_rest(
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
    assert not any(CLIMB in kept for kept in before.values())
    shutil.copy(ours[0], tmp_path / MIGRATION)
    assert migrated.migrate(tmp_path) == [MIGRATION.removesuffix(".sql")]
    assert migrated.migrate(tmp_path) == []
    after = _checks(migrated)
    expected: dict[str, Any] = {
        **before,
        "runs_activity_check": [*before["runs_activity_check"], CLIMB],
    }
    assert after == expected
    # Every activity of a run is let in once all migrations ran.
    assert set(get_args(RunActivity)) <= set(after["runs_activity_check"])
