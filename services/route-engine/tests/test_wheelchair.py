"""A wheelchair or a stroller on the wheel network (TASK-414 part A,
ADR-0343).

No network: the Overpass answer is a small town made here, a grid of
residential streets crossed by roads of every kind, steps, paths and tracks
with and without a surface, cobbles, gravel, steep ways, big roads with and
without a sidewalk, and nodes with raised or lowered kerbs, stiles and
kissing gates. OSMnx turns it into graphs as it does a real answer: what the
wheel network leaves out is what its rules leave out.
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
from route_engine.activities import ENGINE_ACTIVITIES, wheelchair
from route_engine.geo import local_to_latlon
from route_engine.models import (
    DISTANCE_LIMITS_M,
    FREE_ACTIVITIES,
    ONLY_SHAPES,
    SUPPORTED_ACTIVITIES,
    InvalidRequestError,
    RouteRequest,
    check_distance,
    check_drawn_on_land,
    check_outline_drawn,
)
from route_engine.network import (
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
from route_engine.networks.foot import FOOT_FILTER
from route_engine.networks.wheel import (
    WHEEL_FILTER,
    WHEEL_NETWORK_NAME,
    WHEEL_NODE_TAGS,
    WHEEL_WAY_TAGS,
    blocks_wheels,
    incline_grade,
    rollable,
)
from route_engine.optimizer import Plan, plan_route
from route_engine.shapes import SUPPORTED_SHAPES
from route_engine.walking import API_ACTIVITIES

TOWN = (46.0122, 11.2986)
SPACING_M = 250.0
LINES = 31  # streets each way: the town is 7.5 km wide, centred on TOWN
SIMPLE = ("circle", "heart", "star", "moon")
# Columns run south to north; the others are residential streets.
LEFT_OUT: dict[int, dict[str, str]] = {
    1: {"highway": "primary"},
    3: {"highway": "secondary", "sidewalk": "no"},
    5: {"highway": "path"},
    7: {"highway": "track"},
    9: {"highway": "cycleway", "surface": "gravel"},
    11: {"highway": "residential", "surface": "sett"},
    13: {"highway": "footway", "surface": "cobblestone"},
    15: {"highway": "residential", "smoothness": "bad"},
    17: {"highway": "footway", "foot": "no"},
    19: {"highway": "footway", "wheelchair": "no"},
    21: {"highway": "steps"},
    23: {"highway": "path", "surface": "asphalt", "sac_scale": "hiking"},
    25: {"highway": "footway", "incline": "12%"},
    27: {"highway": "footway", "kerb": "raised"},
}
PUSHED: dict[int, dict[str, str]] = {
    2: {"highway": "tertiary"},
    4: {"highway": "primary", "sidewalk": "both"},
    6: {"highway": "secondary", "sidewalk:right": "yes"},
    8: {"highway": "cycleway"},
    10: {"highway": "footway", "surface": "paving_stones"},
    12: {"highway": "pedestrian"},
    14: {"highway": "path", "surface": "asphalt"},
    16: {"highway": "track", "tracktype": "grade1"},
    18: {"highway": "path", "surface": "ground", "wheelchair": "yes"},
    20: {"highway": "footway", "incline": "5%"},
    22: {"highway": "footway", "incline": "up"},
    24: {"highway": "residential", "smoothness": "intermediate"},
}
# Nodes with tags of their own, at (row, column) of residential columns:
# those that stop wheels cut their column there. Not beside column 30, out
# of the zone downloaded: there a node of a row is no crossing.
STOPS: dict[tuple[int, int], dict[str, str]] = {
    (20, 26): {"barrier": "kissing_gate"},
    (20, 28): {"barrier": "kerb", "kerb": "raised"},
    (20, 24): {"barrier": "stile"},
}
PASSED: dict[tuple[int, int], dict[str, str]] = {
    (21, 26): {"barrier": "kerb", "kerb": "lowered"},
    (21, 28): {"barrier": "stile", "wheelchair": "yes"},
    (21, 24): {"barrier": "bollard"},
}


def _column_tags(column: int) -> dict[str, str]:
    return LEFT_OUT.get(column) or PUSHED.get(column) or {"highway": "residential"}


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
            node: dict[str, Any] = {
                "type": "node",
                "id": _node_id(row, column),
                "lat": lat,
                "lon": lon,
            }
            tags = STOPS.get((row, column)) or PASSED.get((row, column))
            if tags is not None:
                node["tags"] = tags
            elements.append(node)
    for row in range(LINES):
        nodes = [_node_id(row, column) for column in range(LINES)]
        elements.append(
            {
                "type": "way",
                "id": _row_way(row),
                "nodes": nodes,
                "tags": {"highway": "residential", "name": f"Row {row}"},
            }
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
def wheel_town(tmp_path: Path, downloads: list[tuple[str, Any]]) -> Graph:
    """The town's wheel network, downloaded once into `tmp_path`."""
    return OsmnxSource.for_activity(tmp_path, "wheelchair").load(_town_box(3500.0))


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


def test_wheelchair_is_an_activity_of_the_engine_on_its_own_network() -> None:
    assert wheelchair.ACTIVITY in ENGINE_ACTIVITIES
    # The last of the engine, after snowshoeing on the snow.
    assert SUPPORTED_ACTIVITIES[-2:] == ("snowshoeing", "wheelchair")
    assert NETWORKS["wheelchair"] == WHEEL_NETWORK_NAME == "wheel"
    assert NETWORKS_BY_NAME["wheel"].overpass_filter == WHEEL_FILTER
    assert network.FILTERS["wheel"] == WHEEL_FILTER
    # The foot network's ways, judged again: the same download.
    assert WHEEL_FILTER == FOOT_FILTER
    assert "wheelchair" not in FREE_ACTIVITIES
    # Every way both ways, nothing walked.
    assert not NETWORKS_BY_NAME["wheel"].by_bike
    # The activities of before keep their networks.
    assert NETWORKS["running"] == FOOT_NETWORK_NAME
    assert NETWORKS["inline_skating"] == "roller"


def test_the_api_offers_wheelchair_after_snowshoeing_and_before_the_walk() -> None:
    assert API_ACTIVITIES[: len(SUPPORTED_ACTIVITIES)] == SUPPORTED_ACTIVITIES
    assert API_ACTIVITIES.index("snowshoeing") + 1 == API_ACTIVITIES.index("wheelchair")
    assert API_ACTIVITIES.index("wheelchair") < API_ACTIVITIES.index("walking")


@pytest.mark.parametrize("distance", [1_000, 3_000, 5_000])
def test_a_wheelchair_route_is_1_to_5_km(distance: int) -> None:
    assert DISTANCE_LIMITS_M["wheelchair"] == (1_000, 5_000)
    check_distance(distance, "wheelchair")
    request = RouteRequest(
        start=TOWN, shape="heart", distance_m=distance, activity="wheelchair"
    )
    assert request.activity == "wheelchair"


@pytest.mark.parametrize("distance", [500, 999, 5_001, 10_000])
def test_a_wheelchair_route_out_of_its_distances_is_refused(distance: int) -> None:
    with pytest.raises(
        InvalidRequestError, match="1000 and 5000 metres for wheelchair"
    ):
        check_distance(distance, "wheelchair")


# --- the simple shapes only ---


def test_only_the_simple_shapes_and_only_for_wheelchair() -> None:
    assert ONLY_SHAPES == {"wheelchair": SIMPLE}
    assert set(SIMPLE) <= set(SUPPORTED_SHAPES)


@pytest.mark.parametrize("shape", SIMPLE)
def test_a_simple_shape_is_drawn(shape: str) -> None:
    request = RouteRequest(
        start=TOWN, shape=shape, distance_m=2_000, activity="wheelchair"
    )
    assert request.shape == shape


@pytest.mark.parametrize("shape", [s for s in SUPPORTED_SHAPES if s not in SIMPLE])
def test_every_other_shape_of_the_catalogue_is_refused(shape: str) -> None:
    with pytest.raises(
        InvalidRequestError,
        match=f"wheelchair draws only these shapes: circle, heart, star, moon, "
        f"not {shape}",
    ):
        RouteRequest(start=TOWN, shape=shape, distance_m=2_000, activity="wheelchair")
    # The same shape on foot is drawn as before.
    RouteRequest(start=TOWN, shape=shape, distance_m=2_000, activity="running")


def test_a_word_is_refused() -> None:
    with pytest.raises(InvalidRequestError, match="only these shapes.*not a word"):
        RouteRequest(start=TOWN, word="HI", distance_m=5_000, activity="wheelchair")


@pytest.mark.parametrize("what", ["an image", "an outline", "a stroke"])
def test_an_image_an_outline_or_a_stroke_is_refused(what: str) -> None:
    with pytest.raises(InvalidRequestError, match=f"only these shapes.*not {what}"):
        check_outline_drawn("wheelchair", what)
    with pytest.raises(InvalidRequestError, match=f"only these shapes.*not {what}"):
        check_drawn_on_land("wheelchair", what)
    # On foot, as before.
    check_outline_drawn("running", what)


# --- what is pushed ---


@pytest.mark.parametrize(
    ("tags", "pushed"),
    [
        # Roads and the ways without cars, untagged counted as paved.
        ({"highway": "residential"}, True),
        ({"highway": "living_street"}, True),
        ({"highway": "service"}, True),
        ({"highway": "tertiary"}, True),
        ({"highway": "footway"}, True),
        ({"highway": "cycleway"}, True),
        ({"highway": "pedestrian"}, True),
        ({"highway": "elevator"}, True),
        ({"highway": "steps"}, False),
        ({"highway": "motorway"}, False),
        # Big roads only with a sidewalk they tag.
        ({"highway": "primary"}, False),
        ({"highway": "secondary"}, False),
        ({"highway": "trunk"}, False),
        ({"highway": "secondary_link", "sidewalk": "no"}, False),
        ({"highway": "primary", "sidewalk": "both"}, True),
        ({"highway": "secondary", "sidewalk": "left"}, True),
        ({"highway": "trunk", "sidewalk:both": "yes"}, True),
        ({"highway": "secondary", "sidewalk:left": "yes"}, True),
        ({"highway": "secondary", "sidewalk:right": "no"}, False),
        # Rough surfaces and smoothness.
        ({"highway": "residential", "surface": "asphalt"}, True),
        ({"highway": "footway", "surface": "paving_stones"}, True),
        ({"highway": "cycleway", "surface": "compacted"}, True),
        ({"highway": "cycleway", "surface": "fine_gravel"}, True),
        ({"highway": "residential", "surface": "sett"}, False),
        ({"highway": "residential", "surface": "cobblestone"}, False),
        ({"highway": "cycleway", "surface": "gravel"}, False),
        ({"highway": "footway", "surface": "grass"}, False),
        ({"highway": "service", "surface": "unpaved"}, False),
        ({"highway": "residential", "smoothness": "intermediate"}, True),
        ({"highway": "residential", "smoothness": "bad"}, False),
        ({"highway": "footway", "smoothness": "very_horrible"}, False),
        # Paths and tracks only with a surface, or grade1.
        ({"highway": "path"}, False),
        ({"highway": "path", "surface": "asphalt"}, True),
        ({"highway": "path", "surface": "dirt"}, False),
        ({"highway": "track"}, False),
        ({"highway": "track", "tracktype": "grade1"}, True),
        ({"highway": "track", "tracktype": "grade2"}, False),
        ({"highway": "track", "surface": "concrete"}, True),
        ({"highway": "bridleway", "surface": "asphalt"}, True),
        # Mountain paths, a raised kerb, a steep incline.
        ({"highway": "path", "surface": "asphalt", "sac_scale": "hiking"}, False),
        ({"highway": "footway", "kerb": "raised"}, False),
        ({"highway": "footway", "kerb": "lowered"}, True),
        ({"highway": "footway", "incline": "8%"}, True),
        ({"highway": "footway", "incline": "-9%"}, False),
        ({"highway": "footway", "incline": "5°"}, False),
        ({"highway": "footway", "incline": "up"}, True),
        # Closed to people on foot.
        ({"highway": "footway", "foot": "no"}, False),
        ({"highway": "service", "access": "no"}, False),
        ({"highway": "service", "access": "private", "foot": "yes"}, True),
        # wheelchair says more than the rest.
        ({"highway": "footway", "wheelchair": "no"}, False),
        ({"highway": "steps", "wheelchair": "yes"}, True),
        ({"highway": "path", "surface": "ground", "wheelchair": "designated"}, True),
        ({"highway": "primary", "wheelchair": "yes"}, True),
        ({"highway": "path", "wheelchair": "limited"}, False),
    ],
)
def test_a_wheelchair_is_pushed_on_the_smooth_calm_ways(
    tags: dict[str, str], pushed: bool
) -> None:
    assert rollable(tags) is pushed


@pytest.mark.parametrize(
    ("tags", "stops"),
    [
        ({}, False),
        ({"highway": "crossing"}, False),
        ({"barrier": "kerb"}, False),
        ({"barrier": "kerb", "kerb": "lowered"}, False),
        ({"barrier": "kerb", "kerb": "flush"}, False),
        ({"barrier": "kerb", "kerb": "raised"}, True),
        ({"highway": "crossing", "kerb": "raised"}, True),
        ({"barrier": "stile"}, True),
        ({"barrier": "turnstile"}, True),
        ({"barrier": "kissing_gate"}, True),
        ({"barrier": "bollard"}, False),
        ({"barrier": "gate"}, False),
        ({"barrier": "cycle_barrier"}, False),
        # What stops a person on foot stops wheels.
        ({"barrier": "gate", "access": "private"}, True),
        ({"barrier": "fence"}, True),
        ({"barrier": "gate", "foot": "no"}, True),
        # wheelchair decides first.
        ({"barrier": "stile", "wheelchair": "yes"}, False),
        ({"barrier": "kerb", "kerb": "raised", "wheelchair": "designated"}, False),
        ({"barrier": "gate", "wheelchair": "no"}, True),
    ],
)
def test_the_nodes_that_stop_wheels(tags: dict[str, str], stops: bool) -> None:
    assert blocks_wheels(tags) is stops


@pytest.mark.parametrize(
    ("value", "grade"),
    [
        ("8%", 0.08),
        ("-12%", 0.12),
        ("5,5%", 0.055),
        ("10", 0.10),
        ("up", None),
        ("down", None),
        ("yes", None),
        (None, None),
    ],
)
def test_the_grade_of_an_incline(value: Any, grade: float | None) -> None:
    found = incline_grade(value)
    if grade is None:
        assert found is None
    else:
        assert found == pytest.approx(grade)


def test_the_tags_read_are_kept() -> None:
    assert {"surface", "smoothness", "incline", "wheelchair", "kerb"} <= set(
        WHEEL_WAY_TAGS
    )
    assert {"sidewalk", "sidewalk:both", "sac_scale", "foot"} <= set(WHEEL_WAY_TAGS)
    assert {"barrier", "kerb", "wheelchair", "access", "foot"} <= set(WHEEL_NODE_TAGS)


# --- the graph ---


def test_the_wheel_graph_is_named_two_way_and_only_what_is_pushed(
    tmp_path: Path, downloads: list[tuple[str, Any]], wheel_town: Graph
) -> None:
    assert downloads == [("walk", WHEEL_FILTER)]
    assert network_of(wheel_town) == WHEEL_NETWORK_NAME
    assert not one_way_streets(wheel_town)
    ways = _osm_ways(wheel_town)
    assert {_column_way(c) for c in PUSHED} <= ways
    assert not {_column_way(c) for c in LEFT_OUT} & ways
    for u, v in wheel_town.edges():
        assert wheel_town.has_edge(v, u)
    # One piece: the rows hold the columns together.
    assert nx.is_strongly_connected(wheel_town)
    # Its cache file is the wheel network's, and says so read back.
    [path] = tmp_path.glob(f"{WHEEL_NETWORK_NAME}_*.graphml")
    assert network_of(read_graph(path)) == WHEEL_NETWORK_NAME
    assert list(tmp_path.glob(f"{FOOT_NETWORK_NAME}_*")) == []


def test_a_node_that_stops_wheels_cuts_its_way(wheel_town: Graph) -> None:
    for row, column in STOPS:
        assert _node_id(row, column) not in wheel_town
    for row, column in PASSED:
        assert _node_id(row, column) in wheel_town
    # The column is cut at the gate: from the row below, no road north.
    for row, column in STOPS:
        below = _node_id(row - 1, column)
        assert below in wheel_town
        assert not any(
            wheel_town.nodes[v]["y"] > wheel_town.nodes[below]["y"]
            and _column_way(column) in _ways(data, "osmid")
            for _, v, data in wheel_town.out_edges(below, data=True)
        )


def test_a_foot_zone_is_not_used_for_a_wheelchair_nor_a_wheel_zone_for_a_run(
    tmp_path: Path, downloads: list[tuple[str, Any]]
) -> None:
    bbox = _town_box(1000.0)
    foot = OsmnxSource(tmp_path)
    foot.load(_town_box(3500.0))
    wheel = OsmnxSource.for_activity(tmp_path, "wheelchair")
    assert foot.is_cached(bbox)
    assert not wheel.is_cached(bbox)
    wheel.load(_town_box(3500.0))
    assert wheel.is_cached(bbox)


def test_a_wheelchair_route_is_never_drawn_on_the_network_of_another_activity(
    tmp_path: Path, downloads: list[tuple[str, Any]], wheel_town: Graph
) -> None:
    foot = OsmnxSource(tmp_path).load(_town_box(3500.0))
    check_network(wheel_town, "wheelchair")
    with pytest.raises(
        WrongNetworkError, match="wheelchair route is drawn on the wheel"
    ):
        check_network(foot, "wheelchair")
    with pytest.raises(WrongNetworkError, match="running route is drawn on the foot"):
        check_network(wheel_town, "running")


# --- a route ---


def test_a_wheelchair_route_is_closed_and_stays_on_the_ways_pushed(
    tmp_path: Path, downloads: list[tuple[str, Any]]
) -> None:
    request = RouteRequest(
        start=TOWN, shape="heart", distance_m=3_000, activity="wheelchair"
    )
    plan = plan_route(request, OsmnxSource.for_activity(tmp_path, "wheelchair"))
    assert plan.search is not None
    route = plan.search.best.route
    assert plan.result.points[0] == plan.result.points[-1]
    assert route.nodes[0] == route.nodes[-1]
    zone = read_graph(next(tmp_path.glob(f"{WHEEL_NETWORK_NAME}_*.graphml")))
    assert network_of(zone) == WHEEL_NETWORK_NAME
    left_out = {_column_way(c) for c in LEFT_OUT}
    stops = {_node_id(row, column) for row, column in STOPS}
    for data in _steps(zone, route.nodes):
        assert not _ways(data, "osmid") & left_out
        assert not _ways(data, "highway") & {"steps"}
    assert not set(route.nodes) & stops
    assert downloads and all(d == ("walk", WHEEL_FILTER) for d in downloads)


def test_the_cli_draws_a_wheelchair_route_on_the_wheel_network(
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
    for activity in ("running", "inline_skating", "wheelchair"):
        distance = 5000 if activity != "inline_skating" else 10000
        argv = [
            "--shape=heart",
            f"--distance={distance}",
            f"--start={TOWN[0]},{TOWN[1]}",
            f"--activity={activity}",
            f"--cache-dir={tmp_path}",
            f"--out={tmp_path / 'x.gpx'}",
        ]
        with pytest.raises(SystemExit):
            main(argv)
    assert [s.network_name for s in sources] == ["foot", "roller", "wheel"]


def test_the_cli_refuses_a_word_for_a_wheelchair(tmp_path: Path) -> None:
    argv = [
        "--word=HI",
        "--distance=5000",
        f"--start={TOWN[0]},{TOWN[1]}",
        "--activity=wheelchair",
        f"--cache-dir={tmp_path}",
        f"--out={tmp_path / 'x.gpx'}",
    ]
    with pytest.raises(SystemExit) as raised:
        main(argv)
    assert raised.value.code != 0
