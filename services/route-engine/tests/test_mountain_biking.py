"""MTB rides on the MTB network (TASK-378 part A, ADR-0322).

No network: the Overpass answer is a small town made here, a grid of
residential streets with a one-way row, crossed by trails of each
mtb:scale and sac_scale, a trail closed to bikes, a rough track and a
footway. OSMnx turns it into graphs as it does a real answer. The bike
network of the same town walks with the bike on foot the trails the MTB
one rides: everything else, one-way streets and walked stretches, is the
bike network's.
"""

from __future__ import annotations

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
from route_engine.activities import ENGINE_ACTIVITIES, mountain_biking
from route_engine.geo import local_to_latlon
from route_engine.models import (
    DISTANCE_LIMITS_M,
    SUPPORTED_ACTIVITIES,
    InvalidRequestError,
    RouteRequest,
    check_distance,
)
from route_engine.network import (
    BIKE_FILTER,
    BIKE_NETWORK_NAME,
    FOOT_NETWORK_NAME,
    NETWORKS,
    Graph,
    OsmnxSource,
    WrongNetworkError,
    area_around,
    check_network,
    network_of,
    on_foot_edge,
    one_way_streets,
    read_graph,
    rideable,
    step_cost,
)
from route_engine.networks import NETWORKS_BY_NAME
from route_engine.networks.mtb import (
    MTB_NETWORK_NAME,
    MTB_TAGS,
    closed_to_bikes,
    mtb_rideable,
    mtb_scale,
)
from route_engine.optimizer import Plan, plan_route
from route_engine.validation import usability
from route_engine.walking import API_ACTIVITIES

TOWN = (46.0122, 11.2986)
SPACING_M = 300.0
LINES = 41  # streets each way: the town is 12 km wide, centred on TOWN
ONE_WAY_ROW = 21  # oneway=yes: eastbound only, the other way walked
# Columns run south to north. One in three is a trail with no tag but its
# kind: an MTB rides it, a bike walks it.
TRAIL = {"highway": "path"}
S2_COL, S3_COL, T2_COL, T3_COL = 2, 5, 8, 11
NO_BIKES_COL, OPEN_S1_COL, OPEN_S3_COL = 14, 17, 26
ROUGH_TRACK_COL, FOOTWAY_COL, BRIDLEWAY_COL = 29, 32, 35
SPECIAL: dict[int, dict[str, str]] = {
    S2_COL: {"highway": "path", "mtb:scale": "2"},
    S3_COL: {"highway": "path", "mtb:scale": "3"},
    T2_COL: {"highway": "path", "sac_scale": "mountain_hiking"},
    T3_COL: {"highway": "path", "sac_scale": "demanding_mountain_hiking"},
    NO_BIKES_COL: {"highway": "path", "bicycle": "no"},
    OPEN_S1_COL: {"highway": "path", "bicycle": "yes", "mtb:scale": "1"},
    OPEN_S3_COL: {"highway": "path", "bicycle": "yes", "mtb:scale": "3"},
    ROUGH_TRACK_COL: {"highway": "track", "tracktype": "grade5"},
    FOOTWAY_COL: {"highway": "footway"},
    BRIDLEWAY_COL: {"highway": "bridleway", "mtb:scale": "1"},
}
# The trails the MTB rides and the bike walks; those both walk.
RIDDEN_TRAILS = {S2_COL, T2_COL, OPEN_S1_COL, BRIDLEWAY_COL} | {
    c for c in range(LINES) if c % 3 == 1
}
WALKED_TRAILS = {S3_COL, T3_COL, NO_BIKES_COL, OPEN_S3_COL, FOOTWAY_COL}


def _column_tags(column: int) -> dict[str, str]:
    if column in SPECIAL:
        return SPECIAL[column]
    return dict(TRAIL) if column % 3 == 1 else {"highway": "residential"}


def _node_id(row: int, column: int) -> int:
    return 1 + row * LINES + column


def _row_way(row: int) -> int:
    return 100_000 + row


def _column_way(column: int) -> int:
    return 200_000 + column


def _offset(index: int) -> float:
    return (index - LINES // 2) * SPACING_M


def town_answer() -> dict[str, Any]:
    """What Overpass would answer for the town, whatever the filter: the
    graph is made of what the engine keeps of it."""
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
def mtb_town(tmp_path: Path, downloads: list[tuple[str, Any]]) -> Graph:
    """The town's MTB network, downloaded once into `tmp_path`."""
    return OsmnxSource.for_activity(tmp_path, "mountain_biking").load(_town_box(6500.0))


@pytest.fixture
def bike_town(tmp_path: Path, downloads: list[tuple[str, Any]]) -> Graph:
    """The town's bike network, downloaded once into `tmp_path`."""
    return OsmnxSource.for_activity(tmp_path, "cycling").load(_town_box(6500.0))


def _ways(data: dict[str, Any], key: str) -> set[Any]:
    value = data.get(key)
    return set(value) if isinstance(value, list) else {value}


def _column_edges(graph: Graph, column: int) -> list[dict[str, Any]]:
    way = _column_way(column)
    return [d for _, _, d in graph.edges(data=True) if way in _ways(d, "osmid")]


def _ridden(graph: Graph, column: int) -> bool:
    """Whether the column is ridden all along, both ways."""
    edges = _column_edges(graph, column)
    return bool(edges) and not any(on_foot_edge(d) for d in edges)


def _walked(graph: Graph, column: int) -> bool:
    edges = _column_edges(graph, column)
    return bool(edges) and all(on_foot_edge(d) for d in edges)


def _steps(graph: Graph, nodes: list[Any]) -> list[dict[str, Any]]:
    """The cheapest edge of every step of the route, as the search takes it."""
    steps = []
    for u, v in zip(nodes, nodes[1:], strict=False):
        assert graph.has_edge(u, v), f"no road from {u} to {v}"
        steps.append(
            min(
                graph[u][v].values(),
                key=lambda d: step_cost(u, v, {0: d}),
            )
        )
    return steps


# --- the activity and its network ---


def test_mountain_biking_is_an_activity_of_the_engine_on_its_own_network() -> None:
    assert mountain_biking.ACTIVITY in ENGINE_ACTIVITIES
    assert "mountain_biking" in SUPPORTED_ACTIVITIES
    assert NETWORKS["mountain_biking"] == MTB_NETWORK_NAME == "mtb"
    # The bike network's download: it has the trails already, to walk them.
    assert NETWORKS_BY_NAME["mtb"].overpass_filter == BIKE_FILTER
    assert network.FILTERS["mtb"] == BIKE_FILTER
    # The activities of before keep their networks.
    assert NETWORKS["running"] == FOOT_NETWORK_NAME
    assert NETWORKS["cycling"] == BIKE_NETWORK_NAME
    assert NETWORKS["hiking"] == "hike"


def test_the_api_offers_mountain_biking_among_the_engines_activities() -> None:
    assert API_ACTIVITIES[: len(SUPPORTED_ACTIVITIES)] == SUPPORTED_ACTIVITIES
    assert API_ACTIVITIES.index("hiking") < API_ACTIVITIES.index("mountain_biking")
    assert API_ACTIVITIES.index("mountain_biking") < API_ACTIVITIES.index("walking")


def test_the_networks_ridden_by_bike_are_the_bike_and_the_mtb_ones() -> None:
    assert {name for name, n in NETWORKS_BY_NAME.items() if n.by_bike} == {
        "bike",
        "mtb",
    }


@pytest.mark.parametrize("distance", [10_000, 20_000, 30_000])
def test_an_mtb_ride_is_10_to_30_km(distance: int) -> None:
    assert DISTANCE_LIMITS_M["mountain_biking"] == (10_000, 30_000)
    check_distance(distance, "mountain_biking")
    request = RouteRequest(
        start=TOWN, shape="heart", distance_m=distance, activity="mountain_biking"
    )
    assert request.activity == "mountain_biking"


@pytest.mark.parametrize("distance", [1_000, 9_999, 30_001, 50_000])
def test_an_mtb_ride_out_of_its_distances_is_refused(distance: int) -> None:
    with pytest.raises(
        InvalidRequestError, match="10000 and 30000 metres for mountain_biking"
    ):
        check_distance(distance, "mountain_biking")


def test_the_source_of_an_mtb_ride_is_the_mtb_network_in_its_own_files() -> None:
    source = OsmnxSource.for_activity(Path("cache"), "mountain_biking")
    assert (source.network_name, source.custom_filter) == ("mtb", BIKE_FILTER)
    bbox = (46.0, 11.0, 46.1, 11.1)
    assert (
        source.cache_path(bbox).name
        == "mtb_46.00000_11.00000_46.10000_11.10000.graphml"
    )


# --- what an MTB rides ---


@pytest.mark.parametrize(
    ("value", "level"),
    [("0", 0), ("1", 1), ("2", 2), ("2+", 2), ("3-", 3), ("6", 6), (None, None)],
)
def test_the_mtb_scale_is_read_as_a_number(
    value: str | None, level: int | None
) -> None:
    tags = {} if value is None else {"mtb:scale": value}
    assert mtb_scale(tags) == level


def test_an_unreadable_mtb_scale_is_none() -> None:
    assert mtb_scale({"mtb:scale": "easy"}) is None


@pytest.mark.parametrize(
    ("tags", "ridden"),
    [
        # Trails up to S2, or T2 with no mtb:scale.
        ({"highway": "path"}, True),
        ({"highway": "path", "mtb:scale": "0"}, True),
        ({"highway": "path", "mtb:scale": "1"}, True),
        ({"highway": "path", "mtb:scale": "2"}, True),
        ({"highway": "path", "mtb:scale": "2+"}, True),
        ({"highway": "path", "mtb:scale": "3"}, False),
        ({"highway": "path", "mtb:scale": "5"}, False),
        ({"highway": "path", "sac_scale": "hiking"}, True),
        ({"highway": "path", "sac_scale": "mountain_hiking"}, True),
        ({"highway": "path", "sac_scale": "demanding_mountain_hiking"}, False),
        ({"highway": "path", "sac_scale": "alpine_hiking"}, False),
        # mtb:scale says more than sac_scale.
        ({"highway": "path", "mtb:scale": "1", "sac_scale": "alpine_hiking"}, True),
        ({"highway": "path", "mtb:scale": "3", "sac_scale": "hiking"}, False),
        ({"highway": "bridleway"}, True),
        ({"highway": "bridleway", "mtb:scale": "3"}, False),
        # Open to bikes: up to S1 as on a gravel bike, else as any trail.
        ({"highway": "path", "bicycle": "yes", "mtb:scale": "1"}, True),
        ({"highway": "path", "bicycle": "designated"}, True),
        ({"highway": "path", "bicycle": "yes", "mtb:scale": "2"}, True),
        ({"highway": "path", "bicycle": "yes", "mtb:scale": "3"}, False),
        # Closed to bikes or to everyone.
        ({"highway": "path", "bicycle": "no"}, False),
        ({"highway": "path", "bicycle": "dismount"}, False),
        ({"highway": "path", "access": "private"}, False),
        ({"highway": "path", "access": "no"}, False),
        ({"highway": "path", "vehicle": "no"}, False),
        ({"highway": "path", "access": "no", "bicycle": "yes"}, True),
        # Every other way as by bike: tracks of every grade, no footways.
        ({"highway": "track"}, True),
        ({"highway": "track", "tracktype": "grade5"}, True),
        ({"highway": "track", "bicycle": "no"}, False),
        ({"highway": "residential"}, True),
        ({"highway": "cycleway"}, True),
        ({"highway": "footway"}, False),
        ({"highway": "footway", "bicycle": "yes"}, False),
        ({"highway": "footway", "bicycle": "designated"}, True),
        ({"highway": "pedestrian"}, False),
        ({"highway": "steps"}, False),
        ({"highway": "trunk"}, False),
    ],
)
def test_an_mtb_rides_trails_up_to_s2_and_everything_a_bike_rides(
    tags: dict[str, str], ridden: bool
) -> None:
    assert mtb_rideable(tags) is ridden


@pytest.mark.parametrize(
    "tags",
    [
        {"highway": "path"},
        {"highway": "path", "mtb:scale": "2"},
        {"highway": "path", "sac_scale": "mountain_hiking"},
        {"highway": "bridleway"},
    ],
)
def test_the_trails_an_mtb_rides_a_bike_does_not(tags: dict[str, str]) -> None:
    assert mtb_rideable(tags)
    assert not rideable(tags)


@pytest.mark.parametrize(
    ("tags", "closed"),
    [
        ({"highway": "path"}, False),
        ({"highway": "path", "bicycle": "use_sidepath"}, True),
        ({"highway": "path", "access": "forestry"}, True),
        ({"highway": "path", "vehicle": "private"}, True),
    ],
)
def test_a_trail_closed_to_bikes(tags: dict[str, str], closed: bool) -> None:
    assert closed_to_bikes(tags) is closed


def test_the_mtb_network_keeps_the_scales_on_its_edges() -> None:
    assert {"mtb:scale", "sac_scale"} <= set(MTB_TAGS)
    assert set(network.BIKE_TAGS) <= set(MTB_TAGS)


# --- the graph ---


def test_the_mtb_graph_is_named_and_rides_the_trails_up_to_s2(
    tmp_path: Path, downloads: list[tuple[str, Any]], mtb_town: Graph
) -> None:
    assert downloads == [("bike", BIKE_FILTER)]
    assert network_of(mtb_town) == MTB_NETWORK_NAME
    assert one_way_streets(mtb_town)
    assert mtb_town.graph["on_foot"] is True
    for column in RIDDEN_TRAILS:
        assert _ridden(mtb_town, column), column
    for column in WALKED_TRAILS:
        assert _walked(mtb_town, column), column
    assert _ridden(mtb_town, ROUGH_TRACK_COL)
    # Its cache file is the MTB network's, and says so read back.
    [path] = tmp_path.glob(f"{MTB_NETWORK_NAME}_*.graphml")
    graph = read_graph(path)
    assert network_of(graph) == MTB_NETWORK_NAME
    assert one_way_streets(graph)
    assert list(tmp_path.glob(f"{BIKE_NETWORK_NAME}_*")) == []


def test_the_bike_graph_of_the_same_town_walks_those_trails(bike_town: Graph) -> None:
    assert network_of(bike_town) == BIKE_NETWORK_NAME
    for column in RIDDEN_TRAILS | WALKED_TRAILS:
        assert _walked(bike_town, column), column
    assert _ridden(bike_town, ROUGH_TRACK_COL)


def test_a_one_way_street_is_ridden_one_way_and_walked_the_other(
    mtb_town: Graph,
) -> None:
    way = _row_way(ONE_WAY_ROW)
    east = {
        (mtb_town.nodes[v]["x"] > mtb_town.nodes[u]["x"], on_foot_edge(d))
        for u, v, d in mtb_town.edges(data=True)
        if way in _ways(d, "osmid")
    }
    assert east == {(True, False), (False, True)}


def test_an_mtb_ride_is_never_drawn_on_the_network_of_another_activity(
    mtb_town: Graph, bike_town: Graph
) -> None:
    check_network(mtb_town, "mountain_biking")
    with pytest.raises(
        WrongNetworkError, match="mountain_biking route is drawn on the mtb"
    ):
        check_network(bike_town, "mountain_biking")
    with pytest.raises(WrongNetworkError, match="cycling route is drawn on the bike"):
        check_network(mtb_town, "cycling")


def test_the_checks_count_unpaved_and_on_foot_metres_on_the_mtb_network(
    mtb_town: Graph,
) -> None:
    def column_nodes(column: int) -> list[Any]:
        return [_node_id(row, column) for row in range(10, 14)]

    ridden = usability(mtb_town, column_nodes(S2_COL))
    assert ridden["on_foot"] == 0.0
    track = usability(mtb_town, column_nodes(ROUGH_TRACK_COL))
    assert track["unpaved"] == pytest.approx(3 * SPACING_M, rel=0.01)
    walked = usability(mtb_town, column_nodes(S3_COL))
    assert walked["on_foot"] == pytest.approx(3 * SPACING_M, rel=0.01)


# --- an MTB ride ---


def test_a_trail_is_a_shortcut_by_mtb_and_a_detour_by_bike(
    mtb_town: Graph, bike_town: Graph
) -> None:
    # Up the trail of column 1 (no tags), from row 5 to row 35.
    start, end = _node_id(5, 1), _node_id(35, 1)
    for graph, walked in ((mtb_town, False), (bike_town, True)):
        path = nx.shortest_path(graph, start, end, weight=step_cost)
        on_trail = [
            d for d in _steps(graph, path) if _column_way(1) in _ways(d, "osmid")
        ]
        if walked:
            # Six times the cost: the bike takes the street beside it.
            assert all(on_foot_edge(d) for d in on_trail)
            assert len(on_trail) < len(path) - 1
        else:
            assert len(on_trail) == len(path) - 1
            assert not any(on_foot_edge(d) for d in on_trail)


def test_an_mtb_ride_is_closed_rides_the_trails_and_stays_on_its_network(
    tmp_path: Path, downloads: list[tuple[str, Any]]
) -> None:
    request = RouteRequest(
        start=TOWN, shape="heart", distance_m=10_000, activity="mountain_biking"
    )
    plan = plan_route(request, OsmnxSource.for_activity(tmp_path, "mountain_biking"))
    assert plan.search is not None
    route = plan.search.best.route
    assert plan.result.points[0] == plan.result.points[-1]
    assert route.nodes[0] == route.nodes[-1]
    zone = read_graph(next(tmp_path.glob(f"{MTB_NETWORK_NAME}_*.graphml")))
    assert network_of(zone) == MTB_NETWORK_NAME
    trails = {_column_way(c) for c in RIDDEN_TRAILS}
    steps = _steps(zone, route.nodes)
    on_trails = [d for d in steps if _ways(d, "osmid") & trails]
    # Where a bike walks, an MTB rides: one in three columns is a trail.
    assert on_trails
    assert not any(on_foot_edge(d) for d in on_trails)
    assert "on_foot" in plan.checks and "unpaved" in plan.checks
    assert downloads and all(d == ("bike", BIKE_FILTER) for d in downloads)


def test_the_cli_draws_an_mtb_ride_on_the_mtb_network(
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
    for activity in ("running", "cycling", "hiking", "mountain_biking"):
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
    assert [s.network_name for s in sources] == ["foot", "bike", "hike", "mtb"]
