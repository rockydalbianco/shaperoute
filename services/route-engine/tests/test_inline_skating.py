"""Inline skating on the roller network (TASK-380 part A, ADR-0324).

No network: the Overpass answer is a small town made here, a grid of
residential streets with a one-way row, crossed by roads of every kind,
paths and tracks with and without a smooth surface, cobbles, rough
asphalt, footways closed to people on foot and ways that tag
inline_skates. OSMnx turns it into graphs as it does a real answer, the
same whatever the filter: what the roller network leaves out is what its
rules leave out.
"""

from __future__ import annotations

import re
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import networkx as nx
import osmnx as ox
import osmnx._overpass as osmnx_overpass
import pytest

import route_engine.__main__ as cli
import route_engine.network as network
from route_engine.__main__ import main
from route_engine.activities import ENGINE_ACTIVITIES, inline_skating
from route_engine.geo import local_to_latlon
from route_engine.models import (
    DISTANCE_LIMITS_M,
    SUPPORTED_ACTIVITIES,
    InvalidRequestError,
    RouteRequest,
    check_distance,
)
from route_engine.network import (
    BIKE_NETWORK_NAME,
    FOOT_NETWORK_NAME,
    NETWORKS,
    Graph,
    OsmnxSource,
    WrongNetworkError,
    area_around,
    check_network,
    network_of,
    one_way_streets,
    read_graph,
)
from route_engine.networks import NETWORKS_BY_NAME
from route_engine.networks.roller import (
    ROLLER_FILTER,
    ROLLER_NETWORK_NAME,
    ROLLER_TAGS,
    closed,
    skateable,
)
from route_engine.optimizer import Plan, plan_route
from route_engine.validation import usability
from route_engine.walking import API_ACTIVITIES

TOWN = (46.0122, 11.2986)
SPACING_M = 250.0
LINES = 31  # streets each way: the town is 7.5 km wide, centred on TOWN
ONE_WAY_ROW = 17  # oneway=yes: skated both ways all the same
# Columns run south to north; the others are residential streets.
LEFT_OUT: dict[int, dict[str, str]] = {
    1: {"highway": "primary"},
    3: {"highway": "secondary"},
    5: {"highway": "path"},
    7: {"highway": "track"},
    9: {"highway": "track", "surface": "gravel"},
    11: {"highway": "residential", "surface": "sett"},
    13: {"highway": "residential", "surface": "cobblestone"},
    15: {"highway": "residential", "smoothness": "bad"},
    19: {"highway": "footway", "foot": "no"},
    21: {"highway": "cycleway", "inline_skates": "no"},
    23: {"highway": "steps"},
}
SKATED: dict[int, dict[str, str]] = {
    2: {"highway": "tertiary"},
    4: {"highway": "path", "surface": "asphalt"},
    6: {"highway": "track", "tracktype": "grade1"},
    8: {"highway": "cycleway"},
    10: {"highway": "footway", "surface": "paving_stones"},
    12: {"highway": "pedestrian"},
    14: {"highway": "service", "smoothness": "intermediate"},
    16: {"highway": "path", "surface": "ground", "inline_skates": "yes"},
    18: {"highway": "unclassified", "surface": "asphalt"},
}


def _column_tags(column: int) -> dict[str, str]:
    return LEFT_OUT.get(column) or SKATED.get(column) or {"highway": "residential"}


def _node_id(row: int, column: int) -> int:
    return 1 + row * LINES + column


def _row_way(row: int) -> int:
    return 100_000 + row


def _column_way(column: int) -> int:
    return 200_000 + column


def _offset(index: int) -> float:
    return (index - LINES // 2) * SPACING_M


def town_answer() -> dict[str, Any]:
    """What Overpass would answer for the town, whatever the filter."""
    elements: list[dict[str, Any]] = []
    for row in range(LINES):
        for column in range(LINES):
            lat, lon = local_to_latlon(TOWN, _offset(column), _offset(row))
            elements.append(
                {"type": "node", "id": _node_id(row, column), "lat": lat, "lon": lon}
            )
    for row in range(LINES):
        tags = {"highway": "residential", "name": f"Row {row}"}
        if row == ONE_WAY_ROW:
            tags["oneway"] = "yes"
        nodes = [_node_id(row, column) for column in range(LINES)]
        elements.append(
            {"type": "way", "id": _row_way(row), "nodes": nodes, "tags": tags}
        )
    for column in range(LINES):
        nodes = [_node_id(row, column) for row in range(LINES)]
        elements.append(
            {
                "type": "way",
                "id": _column_way(column),
                "nodes": nodes,
                "tags": _column_tags(column),
            }
        )
    return {"version": 0.6, "elements": elements}


@contextmanager
def _anywhere(url: str) -> Iterator[None]:
    yield None


@pytest.fixture
def downloads(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, Any]]:
    """Every download asked of Overpass, as (network_type, custom_filter),
    each answered with the town."""
    asked: list[tuple[str, Any]] = []

    def download(polygon: Any, network_type: str, custom_filter: Any) -> Iterator[Any]:
        asked.append((network_type, custom_filter))
        yield town_answer()

    monkeypatch.setattr(osmnx_overpass, "_download_overpass_network", download)
    monkeypatch.setattr(network, "reachable", _anywhere)
    monkeypatch.setattr(ox.settings, "cache_folder", ox.settings.cache_folder)
    return asked


def _town_box(half_m: float) -> network.BBox:
    return area_around([TOWN], margin_m=half_m)


@pytest.fixture
def roller_town(tmp_path: Path, downloads: list[tuple[str, Any]]) -> Graph:
    """The town's roller network, downloaded once into `tmp_path`."""
    return OsmnxSource.for_activity(tmp_path, "inline_skating").load(_town_box(3500.0))


def _ways(data: dict[str, Any], key: str) -> set[Any]:
    value = data.get(key)
    return set(value) if isinstance(value, list) else {value}


def _osm_ways(graph: Graph) -> set[Any]:
    return set().union(*(_ways(d, "osmid") for _, _, d in graph.edges(data=True)))


def _steps(graph: Graph, nodes: list[Any]) -> list[dict[str, Any]]:
    """The edge of every step of the route, failing on a step with no road."""
    steps = []
    for u, v in zip(nodes, nodes[1:], strict=False):
        assert graph.has_edge(u, v), f"no road from {u} to {v}"
        steps.append(min(graph[u][v].values(), key=lambda d: float(d["length"])))
    return steps


# --- the activity and its network ---


def test_inline_skating_is_an_activity_of_the_engine_on_its_own_network() -> None:
    assert inline_skating.ACTIVITY in ENGINE_ACTIVITIES
    # The last on a network; snowshoeing on the snow after it (TASK-413).
    assert SUPPORTED_ACTIVITIES[-2:] == ("inline_skating", "snowshoeing")
    assert NETWORKS["inline_skating"] == ROLLER_NETWORK_NAME == "roller"
    assert NETWORKS_BY_NAME["roller"].overpass_filter == ROLLER_FILTER
    assert network.FILTERS["roller"] == ROLLER_FILTER
    # The activities of before keep their networks.
    assert NETWORKS["running"] == FOOT_NETWORK_NAME
    assert NETWORKS["cycling"] == BIKE_NETWORK_NAME
    assert NETWORKS["hiking"] == "hike"
    assert NETWORKS["mountain_biking"] == "mtb"


def test_the_api_offers_inline_skating_after_the_mtb_ride() -> None:
    assert API_ACTIVITIES[: len(SUPPORTED_ACTIVITIES)] == SUPPORTED_ACTIVITIES
    assert API_ACTIVITIES.index("mountain_biking") + 1 == API_ACTIVITIES.index(
        "inline_skating"
    )
    assert API_ACTIVITIES.index("inline_skating") < API_ACTIVITIES.index("walking")


def test_the_roller_network_is_skated_as_on_foot() -> None:
    # Every way both ways, nothing walked (art. 190 of the Codice della strada).
    assert not NETWORKS_BY_NAME["roller"].by_bike


@pytest.mark.parametrize("distance", [5_000, 10_000, 30_000])
def test_a_skate_is_5_to_30_km(distance: int) -> None:
    assert DISTANCE_LIMITS_M["inline_skating"] == (5_000, 30_000)
    check_distance(distance, "inline_skating")
    request = RouteRequest(
        start=TOWN, shape="heart", distance_m=distance, activity="inline_skating"
    )
    assert request.activity == "inline_skating"


@pytest.mark.parametrize("distance", [1_000, 4_999, 30_001, 50_000])
def test_a_skate_out_of_its_distances_is_refused(distance: int) -> None:
    with pytest.raises(
        InvalidRequestError, match="5000 and 30000 metres for inline_skating"
    ):
        check_distance(distance, "inline_skating")


def test_the_source_of_a_skate_is_the_roller_network_in_its_own_files() -> None:
    source = OsmnxSource.for_activity(Path("cache"), "inline_skating")
    assert (source.network_name, source.custom_filter) == ("roller", ROLLER_FILTER)
    bbox = (46.0, 11.0, 46.1, 11.1)
    assert (
        source.cache_path(bbox).name
        == "roller_46.00000_11.00000_46.10000_11.10000.graphml"
    )


def _filter_highways(part: str) -> set[str]:
    found = re.search(r'\["highway"~"\^\(([a-z_|]+)\)\$"\]', part)
    assert found is not None
    return set(found.group(1).split("|"))


def test_the_filter_asks_no_primary_or_secondary_roads() -> None:
    roads, trails = (_filter_highways(part) for part in ROLLER_FILTER)
    assert roads == {
        "cycleway",
        "living_street",
        "residential",
        "road",
        "service",
        "tertiary",
        "tertiary_link",
        "track",
        "unclassified",
    }
    assert trails == {"bridleway", "footway", "path", "pedestrian"}
    assert '["access"!~"private"]' in ROLLER_FILTER[0]
    assert {"surface", "smoothness", "inline_skates"} <= set(ROLLER_TAGS)


# --- what a skater skates ---


@pytest.mark.parametrize(
    ("tags", "skated"),
    [
        # Roads up to the tertiary ones, smooth or untagged.
        ({"highway": "residential"}, True),
        ({"highway": "living_street"}, True),
        ({"highway": "service"}, True),
        ({"highway": "unclassified"}, True),
        ({"highway": "tertiary"}, True),
        ({"highway": "tertiary_link"}, True),
        ({"highway": "secondary"}, False),
        ({"highway": "secondary_link"}, False),
        ({"highway": "primary"}, False),
        ({"highway": "trunk"}, False),
        ({"highway": "motorway"}, False),
        ({"highway": "steps"}, False),
        # Ways without cars, as the roads.
        ({"highway": "cycleway"}, True),
        ({"highway": "footway"}, True),
        ({"highway": "pedestrian"}, True),
        # A tagged surface must be smooth.
        ({"highway": "residential", "surface": "asphalt"}, True),
        ({"highway": "residential", "surface": "concrete:plates"}, True),
        ({"highway": "footway", "surface": "paving_stones"}, True),
        ({"highway": "residential", "surface": "sett"}, False),
        ({"highway": "residential", "surface": "cobblestone"}, False),
        ({"highway": "cycleway", "surface": "gravel"}, False),
        ({"highway": "service", "surface": "unpaved"}, False),
        # Paths and tracks only with a smooth surface, or grade1.
        ({"highway": "path"}, False),
        ({"highway": "path", "surface": "asphalt"}, True),
        ({"highway": "path", "surface": "dirt"}, False),
        ({"highway": "track"}, False),
        ({"highway": "track", "tracktype": "grade1"}, True),
        ({"highway": "track", "tracktype": "grade2"}, False),
        ({"highway": "track", "surface": "concrete"}, True),
        ({"highway": "track", "tracktype": "grade1", "surface": "gravel"}, False),
        ({"highway": "bridleway", "surface": "asphalt"}, True),
        # Rough by its smoothness.
        ({"highway": "residential", "smoothness": "intermediate"}, True),
        ({"highway": "residential", "smoothness": "bad"}, False),
        ({"highway": "cycleway", "smoothness": "very_bad"}, False),
        ({"highway": "residential", "smoothness": "impassable"}, False),
        # Closed to people on foot.
        ({"highway": "footway", "foot": "no"}, False),
        ({"highway": "residential", "foot": "private"}, False),
        ({"highway": "service", "access": "no"}, False),
        ({"highway": "service", "access": "private", "foot": "yes"}, True),
        ({"highway": "service", "access": "destination"}, True),
        # inline_skates says more than the rest.
        ({"highway": "cycleway", "inline_skates": "no"}, False),
        ({"highway": "path", "inline_skates": "yes"}, True),
        ({"highway": "path", "surface": "ground", "inline_skates": "designated"}, True),
        ({"highway": "residential", "inline_skates": "permissive"}, True),
        ({"highway": "path", "inline_skates": "permissive"}, False),
    ],
)
def test_a_skater_skates_the_smooth_paved_ways(
    tags: dict[str, str], skated: bool
) -> None:
    assert skateable(tags) is skated


@pytest.mark.parametrize(
    ("tags", "is_closed"),
    [
        ({}, False),
        ({"foot": "no"}, True),
        ({"access": "private"}, True),
        ({"access": "private", "foot": "designated"}, False),
        ({"access": "agricultural"}, False),
    ],
)
def test_a_way_closed_to_people_on_foot(tags: dict[str, str], is_closed: bool) -> None:
    assert closed(tags) is is_closed


# --- the graph ---


def test_the_roller_graph_is_named_two_way_and_only_smooth(
    tmp_path: Path, downloads: list[tuple[str, Any]], roller_town: Graph
) -> None:
    assert downloads == [("walk", ROLLER_FILTER)]
    assert network_of(roller_town) == ROLLER_NETWORK_NAME
    assert not one_way_streets(roller_town)
    assert "on_foot" not in roller_town.graph
    ways = _osm_ways(roller_town)
    assert {_column_way(c) for c in SKATED} <= ways
    assert not {_column_way(c) for c in LEFT_OUT} & ways
    # A one-way street is skated both ways.
    east = {
        roller_town.nodes[v]["x"] > roller_town.nodes[u]["x"]
        for u, v, d in roller_town.edges(data=True)
        if _row_way(ONE_WAY_ROW) in _ways(d, "osmid")
    }
    assert east == {True, False}
    for u, v in roller_town.edges():
        assert roller_town.has_edge(v, u)
    # One piece: the rows hold the columns together.
    assert nx.is_strongly_connected(roller_town)
    # Its cache file is the roller network's, and says so read back.
    [path] = tmp_path.glob(f"{ROLLER_NETWORK_NAME}_*.graphml")
    assert network_of(read_graph(path)) == ROLLER_NETWORK_NAME
    assert list(tmp_path.glob(f"{FOOT_NETWORK_NAME}_*")) == []
    assert list(tmp_path.glob(f"{BIKE_NETWORK_NAME}_*")) == []


def test_a_foot_zone_is_not_used_for_a_skate_nor_a_roller_zone_for_a_run(
    tmp_path: Path, downloads: list[tuple[str, Any]]
) -> None:
    bbox = _town_box(1000.0)
    foot = OsmnxSource(tmp_path)
    foot.load(_town_box(3500.0))
    roller = OsmnxSource.for_activity(tmp_path, "inline_skating")
    assert foot.is_cached(bbox)
    assert not roller.is_cached(bbox)
    roller.load(_town_box(3500.0))
    assert roller.is_cached(bbox)
    assert [f for _, f in downloads] == [network.FOOT_FILTER, ROLLER_FILTER]


def test_a_skate_is_never_drawn_on_the_network_of_another_activity(
    tmp_path: Path, downloads: list[tuple[str, Any]], roller_town: Graph
) -> None:
    foot = OsmnxSource(tmp_path).load(_town_box(3500.0))
    check_network(roller_town, "inline_skating")
    with pytest.raises(
        WrongNetworkError, match="inline_skating route is drawn on the roller"
    ):
        check_network(foot, "inline_skating")
    with pytest.raises(WrongNetworkError, match="running route is drawn on the foot"):
        check_network(roller_town, "running")


def test_the_checks_of_a_skate_are_those_on_foot(roller_town: Graph) -> None:
    nodes = [_node_id(row, 2) for row in range(10, 14)]
    assert set(usability(roller_town, nodes)) == {"steps", "busy", "tunnel"}


# --- a skate ---


def test_a_skate_is_closed_and_stays_on_the_smooth_ways(
    tmp_path: Path, downloads: list[tuple[str, Any]]
) -> None:
    request = RouteRequest(
        start=TOWN, shape="heart", distance_m=5_000, activity="inline_skating"
    )
    plan = plan_route(request, OsmnxSource.for_activity(tmp_path, "inline_skating"))
    assert plan.search is not None
    route = plan.search.best.route
    assert plan.result.points[0] == plan.result.points[-1]
    assert route.nodes[0] == route.nodes[-1]
    zone = read_graph(next(tmp_path.glob(f"{ROLLER_NETWORK_NAME}_*.graphml")))
    assert network_of(zone) == ROLLER_NETWORK_NAME
    left_out = {_column_way(c) for c in LEFT_OUT}
    for data in _steps(zone, route.nodes):
        assert not _ways(data, "osmid") & left_out
        assert not _ways(data, "highway") & {"primary", "secondary"}
    assert downloads and all(d == ("walk", ROLLER_FILTER) for d in downloads)


def test_the_cli_draws_a_skate_on_the_roller_network(
    tmp_path: Path,
    downloads: list[tuple[str, Any]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Only the source is looked at: the search is not run.
    sources: list[OsmnxSource] = []

    def stop(*args: Any, **kwargs: Any) -> Plan:
        sources.append(args[4])
        raise SystemExit(0)

    monkeypatch.setattr(cli, "plan_shape", stop)
    for activity in (
        "running",
        "cycling",
        "hiking",
        "mountain_biking",
        "inline_skating",
    ):
        argv = [
            "--shape=heart",
            "--distance=10000",
            f"--start={TOWN[0]},{TOWN[1]}",
            f"--activity={activity}",
            f"--cache-dir={tmp_path}",
            f"--out={tmp_path / 'x.gpx'}",
        ]
        with pytest.raises(SystemExit):
            main(argv)
    assert [s.network_name for s in sources] == [
        "foot",
        "bike",
        "hike",
        "mtb",
        "roller",
    ]
