"""Hikes on the hike network (TASK-377 part A, ADR-0321).

No network: the Overpass answer is a small town made here, a grid of
residential streets crossed by roads cars use, paths of each sac_scale
grade, a track and a footway. As Overpass would, the answer keeps only the
ways the filter asked lets through, so what the hike network leaves out is
what its filter leaves out.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import osmnx as ox
import osmnx._overpass as osmnx_overpass
import pytest

import route_engine.__main__ as cli
import route_engine.network as network
from route_engine.__main__ import main
from route_engine.activities import ENGINE_ACTIVITIES, hiking
from route_engine.geo import local_to_latlon
from route_engine.models import (
    DISTANCE_LIMITS_M,
    SUPPORTED_ACTIVITIES,
    InvalidRequestError,
    RouteRequest,
    check_distance,
)
from route_engine.network import (
    FOOT_FILTER,
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
from route_engine.networks.hike import (
    ALPINE,
    CAR_ROADS,
    HIKE_FILTER,
    HIKE_NETWORK_NAME,
)
from route_engine.optimizer import Plan, plan_route, plan_shape
from route_engine.walking import API_ACTIVITIES

TOWN = (46.0122, 11.2986)
SPACING_M = 250.0
LINES = 31  # streets each way: the town is 7.5 km wide, centred on TOWN
ONE_WAY_ROW = 17  # oneway=yes: on foot both ways all the same
COLUMN_TAGS: dict[int, dict[str, str]] = {
    11: {"highway": "trunk"},
    13: {"highway": "primary"},
    15: {"highway": "primary_link"},
    17: {"highway": "secondary"},
    19: {"highway": "tertiary"},
    8: {"highway": "path", "sac_scale": "hiking"},  # T1
    10: {"highway": "path", "sac_scale": "mountain_hiking"},  # T2
    12: {"highway": "path", "sac_scale": "demanding_mountain_hiking"},  # T3
    14: {"highway": "path", "sac_scale": "alpine_hiking"},  # T4
    16: {"highway": "path", "sac_scale": "demanding_alpine_hiking"},  # T5
    18: {"highway": "path", "sac_scale": "difficult_alpine_hiking"},  # T6
    20: {"highway": "track"},
    22: {"highway": "footway"},
}
CAR_WAYS = {"trunk", "primary", "primary_link", "secondary", "tertiary"}
ALPINE_COLUMNS = {14, 16, 18}
HIKED_COLUMNS = {8, 10, 12, 20, 22}

_CONDITION = re.compile(r'\["([^"]+)"(?:(=|!=|~|!~)"([^"]*)")?\]')


def _keeps(overpass: str) -> Callable[[dict[str, str]], bool]:
    """The tags a filter of plain conditions lets through, as Overpass
    reads them: a regular expression matches anywhere in the value."""
    conditions = list(_CONDITION.finditer(overpass))
    assert "".join(m.group(0) for m in conditions) == overpass

    def keep(tags: dict[str, str]) -> bool:
        for match in conditions:
            key, op, value = match.groups()
            if op is None and key not in tags:
                return False
            if op == "~" and not (key in tags and re.search(value, tags[key])):
                return False
            if op == "!~" and key in tags and re.search(value, tags[key]):
                return False
        return True

    return keep


def _node_id(row: int, column: int) -> int:
    return 1 + row * LINES + column


def _row_way(row: int) -> int:
    return 100_000 + row


def _column_way(column: int) -> int:
    return 200_000 + column


def _offset(index: int) -> float:
    return (index - LINES // 2) * SPACING_M


def _row_tags(row: int) -> dict[str, str]:
    tags = {"highway": "residential", "name": f"Row {row}"}
    if row == ONE_WAY_ROW:
        tags["oneway"] = "yes"
    return tags


def town_answer(custom_filter: str) -> dict[str, Any]:
    """What Overpass would answer for the town with `custom_filter`: its
    nodes, and the ways the filter lets through."""
    keep = _keeps(custom_filter)
    elements: list[dict[str, Any]] = []
    for row in range(LINES):
        for column in range(LINES):
            lat, lon = local_to_latlon(TOWN, _offset(column), _offset(row))
            elements.append(
                {"type": "node", "id": _node_id(row, column), "lat": lat, "lon": lon}
            )
    ways: list[tuple[int, list[int], dict[str, str]]] = []
    for row in range(LINES):
        nodes = [_node_id(row, column) for column in range(LINES)]
        ways.append((_row_way(row), nodes, _row_tags(row)))
    for column in range(LINES):
        nodes = [_node_id(row, column) for row in range(LINES)]
        tags = COLUMN_TAGS.get(column, {"highway": "residential"})
        ways.append((_column_way(column), nodes, tags))
    elements += [
        {"type": "way", "id": way, "nodes": nodes, "tags": tags}
        for way, nodes, tags in ways
        if keep(tags)
    ]
    return {"version": 0.6, "elements": elements}


@contextmanager
def _anywhere(url: str) -> Iterator[None]:
    yield None


@pytest.fixture
def downloads(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, Any]]:
    """Every download asked of Overpass, as (network_type, custom_filter),
    each answered with the ways of the town the filter lets through."""
    asked: list[tuple[str, Any]] = []

    def download(polygon: Any, network_type: str, custom_filter: Any) -> Iterator[Any]:
        asked.append((network_type, custom_filter))
        yield town_answer(custom_filter)

    monkeypatch.setattr(osmnx_overpass, "_download_overpass_network", download)
    monkeypatch.setattr(network, "reachable", _anywhere)
    monkeypatch.setattr(ox.settings, "cache_folder", ox.settings.cache_folder)
    return asked


def _town_box(half_m: float) -> network.BBox:
    return area_around([TOWN], margin_m=half_m)


@pytest.fixture
def hike_town(tmp_path: Path, downloads: list[tuple[str, Any]]) -> Graph:
    """The town's hike network, downloaded once into `tmp_path`."""
    return OsmnxSource.for_activity(tmp_path, "hiking").load(_town_box(3500.0))


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


def test_hiking_is_an_activity_of_the_engine_on_its_own_network() -> None:
    assert hiking.ACTIVITY in ENGINE_ACTIVITIES
    assert "hiking" in SUPPORTED_ACTIVITIES
    assert NETWORKS["hiking"] == HIKE_NETWORK_NAME == "hike"
    assert NETWORKS_BY_NAME["hike"].overpass_filter == HIKE_FILTER
    assert network.FILTERS["hike"] == HIKE_FILTER
    # The activities of before keep their networks.
    assert NETWORKS["running"] == FOOT_NETWORK_NAME
    assert NETWORKS["cycling"] == "bike"


def test_the_api_offers_hiking_before_the_walk() -> None:
    assert API_ACTIVITIES == (*SUPPORTED_ACTIVITIES, "walking")
    assert API_ACTIVITIES.index("hiking") < API_ACTIVITIES.index("walking")


@pytest.mark.parametrize("distance", [1_000, 5_000, 30_000])
def test_a_hike_is_1_to_30_km(distance: int) -> None:
    assert DISTANCE_LIMITS_M["hiking"] == (1_000, 30_000)
    check_distance(distance, "hiking")
    request = RouteRequest(
        start=TOWN, shape="heart", distance_m=distance, activity="hiking"
    )
    assert request.activity == "hiking"


@pytest.mark.parametrize("distance", [0, 999, 30_001, 50_000])
def test_a_hike_out_of_its_distances_is_refused(distance: int) -> None:
    with pytest.raises(InvalidRequestError, match="1000 and 30000 metres for hiking"):
        check_distance(distance, "hiking")


def test_the_source_of_a_hike_is_the_hike_network_in_its_own_files() -> None:
    source = OsmnxSource.for_activity(Path("cache"), "hiking")
    assert (source.network_name, source.custom_filter) == ("hike", HIKE_FILTER)
    bbox = (46.0, 11.0, 46.1, 11.1)
    assert (
        source.cache_path(bbox).name
        == "hike_46.00000_11.00000_46.10000_11.10000.graphml"
    )


# --- the Overpass filter ---


def test_the_hike_filter_is_the_foot_filter_without_car_roads_and_alpine_paths() -> (
    None
):
    foot = FOOT_FILTER.replace('|services"]', f'|services|{CAR_ROADS}"]')
    assert HIKE_FILTER == foot + f'["sac_scale"!~"{ALPINE}"]'


@pytest.mark.parametrize(
    ("tags", "hiked"),
    [
        ({"highway": "path"}, True),
        ({"highway": "path", "sac_scale": "hiking"}, True),
        ({"highway": "path", "sac_scale": "mountain_hiking"}, True),
        ({"highway": "path", "sac_scale": "demanding_mountain_hiking"}, True),
        ({"highway": "path", "sac_scale": "alpine_hiking"}, False),
        ({"highway": "path", "sac_scale": "demanding_alpine_hiking"}, False),
        ({"highway": "path", "sac_scale": "difficult_alpine_hiking"}, False),
        ({"highway": "track"}, True),
        ({"highway": "footway"}, True),
        ({"highway": "steps"}, True),
        ({"highway": "bridleway"}, True),
        ({"highway": "cycleway"}, True),
        ({"highway": "pedestrian"}, True),
        ({"highway": "residential"}, True),
        ({"highway": "unclassified"}, True),
        ({"highway": "service"}, True),
        ({"highway": "trunk"}, False),
        ({"highway": "trunk_link"}, False),
        ({"highway": "primary"}, False),
        ({"highway": "primary_link"}, False),
        ({"highway": "secondary"}, False),
        ({"highway": "secondary_link"}, False),
        ({"highway": "tertiary"}, False),
        ({"highway": "tertiary_link"}, False),
        ({"highway": "motorway"}, False),
        ({"highway": "path", "foot": "no"}, False),
        ({"highway": "track", "access": "private"}, False),
        ({"highway": "residential", "sidewalk": "separate"}, False),
        ({"highway": "pedestrian", "area": "yes"}, False),
    ],
)
def test_the_hike_filter_keeps_trails_up_to_t3_and_no_car_roads(
    tags: dict[str, str], hiked: bool
) -> None:
    assert _keeps(HIKE_FILTER)(tags) is hiked


def test_the_foot_filter_still_keeps_the_car_roads_and_alpine_paths() -> None:
    keep = _keeps(FOOT_FILTER)
    assert keep({"highway": "tertiary"})
    assert keep({"highway": "path", "sac_scale": "difficult_alpine_hiking"})


# --- the graph ---


def test_the_hike_graph_is_named_two_way_and_without_left_out_ways(
    tmp_path: Path, downloads: list[tuple[str, Any]], hike_town: Graph
) -> None:
    assert downloads == [("walk", HIKE_FILTER)]
    assert network_of(hike_town) == HIKE_NETWORK_NAME
    assert not one_way_streets(hike_town)
    ways = _osm_ways(hike_town)
    assert {_column_way(c) for c in HIKED_COLUMNS} <= ways
    left_out = {c for c, tags in COLUMN_TAGS.items() if tags["highway"] in CAR_WAYS}
    assert not {_column_way(c) for c in left_out | ALPINE_COLUMNS} & ways
    # A one-way street is walked both ways.
    east = {
        hike_town.nodes[v]["x"] > hike_town.nodes[u]["x"]
        for u, v, d in hike_town.edges(data=True)
        if _row_way(ONE_WAY_ROW) in _ways(d, "osmid")
    }
    assert east == {True, False}
    # Its cache file is the hike network's, and says so read back.
    [path] = tmp_path.glob(f"{HIKE_NETWORK_NAME}_*.graphml")
    assert network_of(read_graph(path)) == HIKE_NETWORK_NAME
    assert list(tmp_path.glob(f"{FOOT_NETWORK_NAME}_*")) == []


def test_a_foot_zone_is_not_used_for_a_hike_nor_a_hike_zone_for_a_run(
    tmp_path: Path, downloads: list[tuple[str, Any]]
) -> None:
    bbox = _town_box(1000.0)
    foot = OsmnxSource(tmp_path)
    foot.load(_town_box(3500.0))
    hike = OsmnxSource.for_activity(tmp_path, "hiking")
    assert foot.is_cached(bbox)
    assert not hike.is_cached(bbox)
    hike.load(_town_box(3500.0))
    assert hike.is_cached(bbox)
    assert downloads == [("walk", FOOT_FILTER), ("walk", HIKE_FILTER)]


def test_a_hike_is_never_drawn_on_the_network_of_another_activity(
    tmp_path: Path, downloads: list[tuple[str, Any]], hike_town: Graph
) -> None:
    foot = OsmnxSource(tmp_path).load(_town_box(3500.0))
    check_network(hike_town, "hiking")
    with pytest.raises(WrongNetworkError, match="hiking route is drawn on the hike"):
        check_network(foot, "hiking")
    with pytest.raises(WrongNetworkError, match="running route is drawn on the foot"):
        check_network(hike_town, "running")


# --- a hike ---


def test_a_hike_is_closed_and_stays_on_the_hike_network(
    tmp_path: Path, downloads: list[tuple[str, Any]]
) -> None:
    request = RouteRequest(
        start=TOWN, shape="heart", distance_m=5_000, activity="hiking"
    )
    plan = plan_route(request, OsmnxSource.for_activity(tmp_path, "hiking"))
    assert plan.search is not None
    route = plan.search.best.route
    assert plan.result.points[0] == plan.result.points[-1]
    assert route.nodes[0] == route.nodes[-1]
    zone = read_graph(next(tmp_path.glob(f"{HIKE_NETWORK_NAME}_*.graphml")))
    for data in _steps(zone, route.nodes):
        assert not _ways(data, "highway") & CAR_WAYS
        assert not {_column_way(c) for c in ALPINE_COLUMNS} & _ways(data, "osmid")
    assert all(f == HIKE_FILTER for _, f in downloads)


def test_the_cli_draws_a_hike_on_the_hike_network(
    tmp_path: Path,
    downloads: list[tuple[str, Any]],
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    plans: list[Plan] = []

    def kept(*args: Any, **kwargs: Any) -> Plan:
        plans.append(plan_shape(*args, **kwargs))
        return plans[-1]

    monkeypatch.setattr(cli, "plan_shape", kept)
    out = tmp_path / "star.gpx"
    argv = [
        "--shape=star",
        "--distance=5000",
        f"--start={TOWN[0]},{TOWN[1]}",
        "--activity=hiking",
        f"--cache-dir={tmp_path / 'cache'}",
        f"--out={out}",
    ]
    assert main(argv) == 0
    assert "activity: hiking" in capsys.readouterr().out
    assert downloads and all(d == ("walk", HIKE_FILTER) for d in downloads)
    cached = sorted((tmp_path / "cache").glob("*.graphml"))
    assert cached and all(p.name.startswith("hike_") for p in cached)
    [plan] = plans
    assert plan.search is not None
    assert out.read_text(encoding="utf-8").count("<trkpt") > 10


def test_the_cli_draws_a_run_and_a_ride_on_their_networks_as_before(
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
    for activity in ("running", "cycling", "hiking"):
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
    assert [s.network_name for s in sources] == ["foot", "bike", "hike"]
