"""The sports of the API (TASK-376, ADR-0320) give the tables the API wrote
by hand before them, value for value and in the same order: moving them
changed nothing a request, a run or Strava sees."""

from __future__ import annotations

import ast
import json
from pathlib import Path
from typing import get_args

from route_engine.models import FREE_ACTIVITIES, SUPPORTED_ACTIVITIES
from route_engine.walking import API_ACTIVITIES

from shaperoute_api import prefetch_zones, sports
from shaperoute_api.activities import RECORD_ACTIVITIES, RunActivity
from shaperoute_api.activity_graphs import ZONES_IN_MEMORY
from shaperoute_api.graphs import MAX_ZONES
from shaperoute_api.personal_bests import SPORTS, Sport
from shaperoute_api.run_gpx import GPX_TYPES
from shaperoute_api.schemas import ACTIVITY_DESCRIPTION
from shaperoute_api.sports import API_SPORTS, SPORTS_BY_ACTIVITY
from shaperoute_api.sports.cycling import BY_BIKE
from shaperoute_api.sports.inline_skating import ON_SKATES
from shaperoute_api.sports.running import ON_FOOT
from shaperoute_api.strava import SPORT_TYPES

SPORTS_FOLDER = Path(sports.__file__).parent
RUN_ACTIVITIES_JSON = (
    Path(__file__).resolve().parents[3]
    / "packages"
    / "shared-types"
    / "fixtures"
    / "run-activities.json"
)

# The tables as they were written before the registry.
BEFORE_SPORT_TYPES = {
    "running": "Run",
    "cycling": "Ride",
    "paddling": "StandUpPaddling",
    "swimming": "Swim",
    "walking": "Walk",
    "skiing": "AlpineSki",
    "xc_skiing": "NordicSki",
}
BEFORE_RECORD_ACTIVITIES = ("skiing", "xc_skiing")
BEFORE_GPX_TYPES = {"walking": "walking"}
BEFORE_STREET_NAMES = {"running": True, "cycling": False}
# Added since, each by a file of sports/ and a line of its register: a hike
# (TASK-377), planned before the walk in the order of the contract; an MTB
# ride after it and a gravel ride after the walk (TASK-378); a skate after
# the MTB ride (TASK-380); snowshoeing after the skate (TASK-413); a day of
# ski touring after the days on the snow (TASK-415).
SINCE_SPORT_TYPES = {
    "hiking": "Hike",
    "mountain_biking": "MountainBikeRide",
    "inline_skating": "InlineSkate",
    "snowshoeing": "Snowshoe",
    "gravel_biking": "GravelRide",
    "ski_touring": "BackcountrySki",
}
SINCE = tuple(SINCE_SPORT_TYPES)
SINCE_GPX_TYPES = {
    "hiking": "hiking",
    "mountain_biking": "mountain_biking",
    "inline_skating": "inline_skating",
    "snowshoeing": "snowshoeing",
    "gravel_biking": "gravel_biking",
    "ski_touring": "ski_touring",
}


def _without_since(table: dict[str, object]) -> list[tuple[str, object]]:
    """The items of `table` but the sports added since, in their order."""
    return [(name, value) for name, value in table.items() if name not in SINCE]


def test_the_sports_are_those_of_the_contract_in_its_order() -> None:
    names = [sport.activity for sport in API_SPORTS]
    contract = json.loads(RUN_ACTIVITIES_JSON.read_text("utf-8"))
    # A workout at the gym the last of them (TASK-385).
    assert names == contract["run_activities"]
    assert list(SPORTS_BY_ACTIVITY) == names
    planned = [s.activity for s in API_SPORTS if not s.record_only and not s.trackless]
    assert tuple(planned) == API_ACTIVITIES
    assert list(get_args(RunActivity)) == names


def test_the_tables_are_those_of_before_in_their_order() -> None:
    assert _without_since(SPORT_TYPES) == list(BEFORE_SPORT_TYPES.items())
    assert {name: SPORT_TYPES[name] for name in SINCE} == SINCE_SPORT_TYPES
    order = list(SPORT_TYPES)
    assert order.index("hiking") == order.index("walking") - 4
    assert order.index("mountain_biking") == order.index("walking") - 3
    assert order.index("inline_skating") == order.index("walking") - 2
    assert order.index("snowshoeing") == order.index("walking") - 1
    assert order.index("gravel_biking") == order.index("walking") + 1
    assert order.index("ski_touring") == order.index("xc_skiing") + 1
    assert RECORD_ACTIVITIES == (*BEFORE_RECORD_ACTIVITIES, "ski_touring")
    assert _without_since(GPX_TYPES) == list(BEFORE_GPX_TYPES.items())
    assert {name: GPX_TYPES[name] for name in SINCE} == SINCE_GPX_TYPES
    assert list(SPORTS.items()) == [
        ("running", ON_FOOT),
        ("cycling", BY_BIKE),
        ("mountain_biking", BY_BIKE),
        ("inline_skating", ON_SKATES),
        ("gravel_biking", BY_BIKE),
    ]
    assert list(SPORTS) == list(get_args(Sport))
    assert prefetch_zones.STREET_NAMES == {
        **BEFORE_STREET_NAMES,
        "hiking": True,
        "mountain_biking": False,
        "inline_skating": False,
    }


def test_the_bests_of_before_are_read_where_they_were() -> None:
    from shaperoute_api import personal_bests

    assert personal_bests.ON_FOOT is ON_FOOT
    assert personal_bests.BY_BIKE is BY_BIKE
    assert personal_bests.BY_BIKE_KMH == 90
    assert [d.name for d in ON_FOOT.distances] == [
        "5k",
        "10k",
        "15k",
        "half",
        "30k",
        "marathon",
        "60k",
    ]
    assert [(d.name, d.record_s) for d in BY_BIKE.distances] == [
        ("10k", 400),
        ("20k", 800),
        ("40k", 1_600),
        ("50k", 2_000),
        ("100k", 4_000),
        ("160k", 6_400),
    ]


def test_the_zone_boxes_are_those_of_before() -> None:
    boxes = prefetch_zones.ZONE_BOXES
    assert list(boxes) == [
        "running",
        "cycling",
        "hiking",
        "mountain_biking",
        "inline_skating",
    ]
    assert boxes["running"] is prefetch_zones.zone_box
    assert boxes["hiking"] is prefetch_zones.zone_box
    assert boxes["cycling"] is prefetch_zones.bike_zone_box
    # Its own longest route, a ride's 30 km: the box of a ride.
    city = (46.0671, 11.1214)
    assert boxes["mountain_biking"](city) == prefetch_zones.bike_zone_box(city)
    # A skate's 30 km too (TASK-380).
    assert boxes["inline_skating"](city) == prefetch_zones.bike_zone_box(city)


def test_every_sport_on_roads_has_zones_and_no_other() -> None:
    # On the water and on the snow (TASK-413) there are no zones.
    roads = {a for a in SUPPORTED_ACTIVITIES if a not in FREE_ACTIVITIES}
    with_zones = {s.activity for s in API_SPORTS if s.zones is not None}
    assert with_zones == roads


def test_a_sport_recorded_without_a_shape_has_no_bests_nor_zones() -> None:
    for sport in API_SPORTS:
        if sport.record_only:
            assert sport.bests is None and sport.zones is None, sport.activity
            assert sport.description is None, sport.activity


def _imports(path: Path) -> set[str]:
    found: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text("utf-8"))):
        if isinstance(node, ast.ImportFrom) and node.module:
            found.add(node.module)
        elif isinstance(node, ast.Import):
            found.update(alias.name for alias in node.names)
    return found


def test_the_sports_import_nothing_but_the_sports() -> None:
    # Data and its own rules: what reads a sport imports it, never the other
    # way round, and the phone's engine takes it without a database.
    for path in sorted(SPORTS_FOLDER.glob("*.py")):
        ours = _imports(path) - {"__future__", "dataclasses", "typing"}
        assert all(m.startswith("shaperoute_api.sports") for m in ours), (
            path.name,
            ours,
        )


def test_the_zones_in_memory_and_the_description_are_those_of_before() -> None:
    assert ZONES_IN_MEMORY == {
        "running": MAX_ZONES,
        "cycling": 1,
        "hiking": 1,
        "mountain_biking": 1,
        "inline_skating": 1,
    }
    assert ACTIVITY_DESCRIPTION == (
        f"One of: {', '.join(API_ACTIVITIES)}; cycling is drawn on the "
        f"roads a bike may ride, one-way streets kept (TASK-190); paddling on a "
        f"lake or the sea within 1 km of the shore, from a start on the shore, "
        f"a shape of the catalogue only (TASK-191); swimming 20-150 m from the "
        f"shore, lap after lap, a shape of the catalogue or a drawing (TASK-323); "
        f"hiking on the trails and quiet roads of its own network, no roads cars "
        f"use, no trails beyond sac_scale T3 (TASK-377); "
        f"mountain_biking on the bike network with the trails up to mtb:scale "
        f"S2, or sac_scale T2 when they give none (TASK-378); "
        f"inline_skating on the smooth paved ways of its own network, no primary "
        f"or secondary roads, every way both ways (TASK-380); "
        f"snowshoeing on open snow, 0.5-3 km, a shape of the catalogue only, "
        f"away from slopes over 25 degrees, woods, pistes, rock and villages, "
        f"from a way in on foot (TASK-413); "
        f"walking on the foot network of a run (TASK-371); "
        f"gravel_biking is drawn as cycling, on the bike network (TASK-378)."
    )
