"""Snowshoeing in the API (TASK-413 part A2, ADR-0342).

A `snowshoeing` request is 0.5-3 km, a shape of the catalogue only, and the
engine places it freely on the snow one may walk on, as a paddling route on
the water: no zones, the snow of `<cache>/snow/` and the heights of
`<cache>/heights/`, downloaded at the first request of a place. Its GPX says
what it is; saved, it goes to Strava as a "Snowshoe" and counts in the shape
game as a hike, without best times. Nothing anchored, no way back, no route
kept: there are no roads, and the snow's files are out of the fingerprint.
The database takes it in the three tables that check the activity.

No network: the snow is a few elements written here, the heights flat.
"""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from typing import Any, get_args

import numpy as np
import pytest
from fastapi.testclient import TestClient
from route_engine import heights as heights_module
from route_engine import snow as snow_module
from route_engine.anchored import ANCHORED_ON_LAND_ONLY
from route_engine.geo import local_to_latlon
from route_engine.models import (
    DISTANCE_LIMITS_M,
    FREE_ACTIVITIES,
    ON_SNOW_SHAPES_ONLY,
    SNOW_ACTIVITIES,
    SUPPORTED_ACTIVITIES,
    RouteRequest,
)
from route_engine.snow import SnowFitError
from route_engine.walking import API_ACTIVITIES, API_DISTANCE_LIMITS_M, engine_activity
from route_engine.water import write_water
from test_cycling import finished
from test_game_rules import Runner
from test_sport_registry_api import in_the_contract
from test_way_back_api import _post as post_way_back
from test_way_back_api import _Town, request_body

from shaperoute_api.activities import RunActivity
from shaperoute_api.activity_graphs import (
    ROAD_ACTIVITIES,
    ZONES_IN_MEMORY,
    ActivityGraphs,
    check_supported,
    ground_for,
)
from shaperoute_api.app import create_app
from shaperoute_api.db import Database, migrations
from shaperoute_api.errors import suggested_distance
from shaperoute_api.game_rules import ON_FOOT, SNOWSHOEING, evaluate
from shaperoute_api.graphs import MapDataUnavailableError
from shaperoute_api.personal_bests import SPORTS
from shaperoute_api.prefetch_zones import ZONE_BOXES
from shaperoute_api.reads import NEWER_ACTIVITIES, OLD_APP, reads_from
from shaperoute_api.route_archive import _kept
from shaperoute_api.route_store import RouteStore
from shaperoute_api.run_gpx import gpx_type
from shaperoute_api.schemas import ACTIVITY_DESCRIPTION, RouteRequestBody
from shaperoute_api.snowshoeing import ServerHeights, ServerSnow, plan_snow
from shaperoute_api.sports import SPORTS_BY_ACTIVITY
from shaperoute_api.strava import SPORT_TYPES
from shaperoute_api.way_back import ON_THE_SNOW

REPO = Path(__file__).resolve().parents[3]
CONTRACT = REPO / "packages" / "shared-types" / "fixtures"
MIGRATION = "0068_snowshoeing.sql"
SNOW = "snowshoeing"
START = (46.0, 11.0)
CIRCLE: dict[str, Any] = {
    "start": list(START),
    "shape": "circle",
    "distance_m": 1_000,
    "activity": SNOW,
}


def _way(tags: dict[str, str], *xy: tuple[float, float]) -> dict[str, Any]:
    points = [local_to_latlon(START, x, y) for x, y in xy]
    return {
        "type": "way",
        "id": 1,
        "tags": tags,
        "geometry": [{"lat": lat, "lon": lon} for lat, lon in points],
    }


# A track across an open meadow: the way in.
TRACK = _way({"highway": "track"}, (-4000.0, 0.0), (4000.0, 0.0))
# A wood over all of it: no snow to walk on.
WOOD = _way(
    {"natural": "wood"},
    (-5000.0, -5000.0),
    (5000.0, -5000.0),
    (5000.0, 5000.0),
    (-5000.0, 5000.0),
    (-5000.0, -5000.0),
)


class _Flat:
    def heights(self, points: np.ndarray) -> np.ndarray:
        return np.full(len(points), 1600.0)


class _Snow:
    """The snow of a few elements and flat heights, as ServerSnow gives."""

    def __init__(self, *elements: dict[str, Any]) -> None:
        self._elements = list(elements)
        self.asked: list[tuple[float, float, float, float]] = []

    def elements(self, bbox: tuple[float, float, float, float]) -> list[Any]:
        self.asked.append(bbox)
        return self._elements

    def heights(self) -> _Flat:
        return _Flat()


def _client(*elements: dict[str, Any]) -> tuple[TestClient, _Snow]:
    snow = _Snow(*elements)
    return TestClient(create_app(ActivityGraphs({}, snow=snow))), snow


# --- the contract ----------------------------------------------------------------


def test_snowshoeing_is_an_activity_of_the_api_half_a_km_to_3() -> None:
    check_supported(SNOW)
    assert API_DISTANCE_LIMITS_M[SNOW] == DISTANCE_LIMITS_M[SNOW] == (500, 3_000)
    assert SNOW in get_args(RunActivity)
    # The engine's, after the skate, before the walk.
    assert SNOW in SUPPORTED_ACTIVITIES and SNOW in SNOW_ACTIVITIES
    assert API_ACTIVITIES.index(SNOW) == API_ACTIVITIES.index("inline_skating") + 1
    assert engine_activity(SNOW, 1_000) == SNOW
    contract = json.loads((CONTRACT / "contract.json").read_text())
    assert contract["activities"] == list(API_ACTIVITIES)
    assert contract["distance_limits_m"][SNOW] == [500, 3_000]
    run_activities = json.loads((CONTRACT / "run-activities.json").read_text())
    # But a day of alpinism, on the server before the contract (TASK-463).
    assert run_activities["run_activities"] == in_the_contract(get_args(RunActivity))


def test_the_request_of_shared_types_is_one() -> None:
    request = json.loads((CONTRACT / f"route-request-{SNOW}.json").read_text())
    body = RouteRequestBody.model_validate(request)
    assert body.activity == SNOW and body.word is None
    low, high = API_DISTANCE_LIMITS_M[SNOW]
    assert low <= body.distance_m <= high


def test_the_description_says_how_it_is_drawn() -> None:
    assert "snowshoeing on open snow, 0.5-3 km, a shape of the catalogue only" in (
        ACTIVITY_DESCRIPTION
    )


# --- the sport --------------------------------------------------------------------


def test_the_sport_of_snowshoeing() -> None:
    sport = SPORTS_BY_ACTIVITY[SNOW]
    assert not sport.record_only and not sport.trackless
    # No bests, as a hike (the user's choice 5), and no zones: no network.
    assert sport.bests is None and SNOW not in SPORTS
    assert sport.zones is None
    assert SNOW not in ZONES_IN_MEMORY and SNOW not in ZONE_BOXES
    assert SPORT_TYPES[SNOW] == "Snowshoe"
    assert gpx_type(SNOW) == SNOW


# --- where it is drawn ------------------------------------------------------------


def test_the_api_keeps_the_snow_beside_the_water(tmp_path: Path) -> None:
    assert SNOW not in ROAD_ACTIVITIES
    graphs = ActivityGraphs.from_cache(tmp_path)
    assert isinstance(graphs.snow, ServerSnow)
    assert graphs.snow.folder == tmp_path / "snow"
    assert ground_for(graphs, SNOW) is graphs.snow
    with pytest.raises(Exception, match="no snowshoeing routes on this API"):
        graphs.for_activity(SNOW)
    # An API with one graph loader only, as the tests give, has no snow.
    with pytest.raises(Exception, match="no snowshoeing routes on this API"):
        ground_for(_Town(), SNOW)


def test_the_snow_of_the_cache_is_read_without_downloading(tmp_path: Path) -> None:
    snow = ServerSnow(tmp_path)
    covering = (45.9, 10.9, 46.1, 11.1)
    asked = (45.95, 10.95, 46.05, 11.05)
    assert snow.needs_download(asked)
    write_water(
        snow_module.OverpassSnowSource(tmp_path).path(covering), covering, [TRACK]
    )
    assert not snow.needs_download(asked)
    assert snow.elements(asked) == [TRACK]
    # Elsewhere it would download.
    assert snow.needs_download((46.5, 11.5, 46.6, 11.6))


def test_snow_that_cannot_be_downloaded_is_map_data_unavailable(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def refused(query: str) -> dict[str, Any]:
        raise OSError("Overpass said 429")

    monkeypatch.setattr(snow_module, "overpass", refused)
    with pytest.raises(MapDataUnavailableError, match="snow for this area"):
        ServerSnow(tmp_path).elements((45.95, 10.95, 46.05, 11.05))


def test_heights_that_cannot_be_downloaded_are_map_data_unavailable(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def refused(url: str) -> bytes:
        raise OSError("no network")

    monkeypatch.setattr(heights_module, "fetch_url", refused)
    heights = ServerSnow(tmp_path).heights()
    assert isinstance(heights, ServerHeights)
    with pytest.raises(MapDataUnavailableError, match="heights for this area"):
        heights.heights(np.array([START]))
    # A new object for each request: the decoded tiles are not kept.
    assert ServerSnow(tmp_path).heights() is not heights


def test_a_circle_on_the_snow_is_planned_from_the_track() -> None:
    snow = _Snow(TRACK)
    request = RouteRequest(start=START, shape="circle", distance_m=1_000, activity=SNOW)
    plan = plan_snow(request, snow)
    assert plan.search is None and plan.alternatives == []
    result = plan.result
    assert result.points[0] == result.points[-1]
    assert abs(result.distance_m - 1_000) <= 100
    assert len(snow.asked) == 1


def test_post_routes_draws_on_the_snow() -> None:
    client, snow = _client(TRACK)
    response = client.post("/routes", json=CIRCLE)
    assert response.status_code == 200, response.json()
    body = response.json()
    assert abs(body["distance_m"] - 1_000) <= 100
    assert body["directions"] == [] and body["alternatives"] == []
    assert len(snow.asked) == 1


def test_a_snow_job_is_done_without_directions() -> None:
    snow = _Snow(TRACK)
    with TestClient(create_app(ActivityGraphs({}, snow=snow))) as client:
        job = client.post("/route-jobs", json=CIRCLE).json()
        done = finished(client, job["job_id"], seconds=30.0)
    assert done["status"] == "done", done
    assert done["result"]["directions"] == []
    assert len(snow.asked) == 1


def test_no_snow_to_walk_on_is_a_shape_not_drawable() -> None:
    client, _ = _client(TRACK, WOOD)
    response = client.post("/routes", json=CIRCLE)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "shape_not_drawable"
    assert "no open snow" in error["message"]


@pytest.mark.parametrize(
    ("changes", "message"),
    [
        ({"word": "HI", "shape": None}, ON_SNOW_SHAPES_ONLY),
        ({"placement": "anchored"}, ANCHORED_ON_LAND_ONLY),
        ({"distance_m": 400}, "for snowshoeing"),
        ({"distance_m": 3_500}, "for snowshoeing"),
    ],
)
def test_what_the_snow_does_not_take_is_refused(
    changes: dict[str, Any], message: str
) -> None:
    client, snow = _client(TRACK)
    response = client.post("/routes", json={**CIRCLE, **changes})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"
    assert message in response.json()["error"]["message"]
    assert snow.asked == []


def test_the_distance_suggested_on_the_snow_is_one_that_fits() -> None:
    # Down to the half km it fits at, as on the water (TASK-191).
    assert suggested_distance(2_400, SNOW) == 2_000
    assert suggested_distance(1_499, SNOW) == 1_000
    # Under the shortest route: none to ask (the engine may say 0.2 km).
    assert suggested_distance(200, SNOW) is None
    assert suggested_distance(9_000, SNOW) == 3_000
    assert SNOW in FREE_ACTIVITIES


def test_the_error_of_a_shape_too_big_suggests_where_it_fits() -> None:
    from shaperoute_api.errors import error_of

    error = SnowFitError("it fits at 2.4 km", best_distance_m=2_430)
    status, detail = error_of(error, SNOW)
    assert status == 422 and detail.code == "shape_not_drawable"
    assert detail.suggested_distance_m == 2_000
    small = SnowFitError("it fits at 0.2 km", best_distance_m=210)
    assert error_of(small, SNOW)[1].suggested_distance_m is None


def test_on_the_snow_there_is_no_way_back() -> None:
    response = post_way_back(_Town(), {**request_body(), "activity": SNOW})
    assert response.status_code == 422
    assert response.json()["error"]["message"] == ON_THE_SNOW


def test_no_route_on_the_snow_is_kept(tmp_path: Path) -> None:
    # The snow's files are out of the fingerprint (route_store.SNOW_ONLY).
    request = RouteRequest(start=START, shape="circle", distance_m=1_000, activity=SNOW)
    store = RouteStore(tmp_path, engine="engine")
    assert store.get(request) is None
    run = RouteRequest(start=START, shape="circle", distance_m=1_000)
    assert store._path(run) is not None and store._path(request) is None
    assert _kept(run) and not _kept(request)


# --- the shape game ---------------------------------------------------------------


def test_snowshoeing_counts_in_the_shape_game_as_a_hike() -> None:
    assert SNOWSHOEING == SNOW and SNOW in ON_FOOT
    # 2 km at a snowshoer's pace, 4 km/h.
    fixes = Runner().run(2_000, 1.1).fixes
    snow, hike = evaluate(fixes, [], SNOW), evaluate(fixes, [], "hiking")
    assert snow.counted and snow.counted_m == hike.counted_m > 1_900
    # The pace shapes are a run's: no best times.
    assert snow.best_s == {}


# --- what an app reads ------------------------------------------------------------


def test_an_app_of_before_never_reads_a_snowshoe_route() -> None:
    assert SNOW in NEWER_ACTIVITIES
    assert not OLD_APP.shows(SNOW)
    before = "swimming,hiking,mountain_biking,inline_skating,walking,gravel_biking"
    assert not reads_from([before]).shows(SNOW)
    assert reads_from([f"{before},{SNOW}"]).shows(SNOW)
    reads = json.loads((CONTRACT / "reads.json").read_text())
    assert SNOW in reads["kinds"]
    assert reads_from([reads["this_app"]]).shows(SNOW)


def test_the_newer_activities_are_in_the_order_of_run_activity() -> None:
    order = list(get_args(RunActivity))
    assert list(NEWER_ACTIVITIES) == [a for a in order if a in NEWER_ACTIVITIES]


# --- the migration ----------------------------------------------------------------

CHECKS = (
    "favorites_activity_check",
    "runs_activity_check",
    "group_runs_activity_check",
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


def test_the_migration_adds_snowshoeing_to_the_three_tables_and_keeps_the_rest(
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
    assert not any(SNOW in kept for kept in before.values())
    shutil.copy(ours[0], tmp_path / MIGRATION)
    assert database.migrate(tmp_path) == [MIGRATION.removesuffix(".sql")]
    assert database.migrate(tmp_path) == []
    after = _checks(database)
    assert after == {name: [*kept, SNOW] for name, kept in before.items()}
