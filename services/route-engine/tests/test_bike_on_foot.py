"""The bike walked by hand (TASK-206, ADR-0167).

Where a bike may not ride, its rider may walk it: along footways, paths and
pedestrian streets, and the other way of a one-way street, on its sidewalk.
The bike network keeps those ways, marked `walk`, at WALK_COST times their
length, so a route walks only where the shape gains from it; the checks
count the metres walked. No network: the town of test_bike_network.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from typing import Any

import networkx as nx
import numpy as np
import osmnx as ox
import osmnx._overpass as osmnx_overpass
import pytest
from test_bike_network import (
    EAST_ROW,
    FOOT_COL,
    STEPS_COL,
    TOWN,
    _anywhere,
    _column_way,
    _edges_of,
    _row_way,
    _town_box,
    _ways,
    town_answer,
)

import route_engine.network as network
from route_engine.geo import local_to_latlon
from route_engine.models import RouteRequest
from route_engine.network import (
    BIKE_NETWORK_NAME,
    WALK_COST,
    Graph,
    OsmnxSource,
    _corridor_costs,
    on_foot_edge,
    step_cost,
    walkable,
)
from route_engine.optimizer import plan_route
from route_engine.validation import usability, validate


@pytest.fixture
def downloads(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, Any]]:
    """Every download asked of Overpass, each answered with the town."""
    asked: list[tuple[str, Any]] = []

    def download(polygon: Any, network_type: str, custom_filter: Any) -> Iterator[Any]:
        asked.append((network_type, custom_filter))
        yield town_answer()

    monkeypatch.setattr(osmnx_overpass, "_download_overpass_network", download)
    monkeypatch.setattr(network, "reachable", _anywhere)
    monkeypatch.setattr(ox.settings, "cache_folder", ox.settings.cache_folder)
    return asked


@pytest.fixture
def bike_town(tmp_path: Path, downloads: list[tuple[str, Any]]) -> Graph:
    """The town's bike network, downloaded once into `tmp_path`."""
    return OsmnxSource.for_activity(tmp_path, "cycling").load(_town_box(6000.0))


@pytest.mark.parametrize(
    ("tags", "walks"),
    [
        ({"highway": "footway"}, True),
        ({"highway": "footway", "bicycle": "no"}, True),
        ({"highway": "path"}, True),
        ({"highway": "bridleway"}, True),
        ({"highway": "pedestrian"}, True),
        ({"highway": "residential", "bicycle": "dismount"}, True),
        ({"highway": "steps"}, False),
        ({"highway": "steps", "bicycle": "dismount"}, False),
        ({"highway": "footway", "foot": "no"}, False),
        ({"highway": "footway", "access": "private"}, False),
        ({"highway": "footway", "access": "private", "foot": "yes"}, True),
        ({"highway": "residential", "bicycle": "no"}, False),
        ({"highway": "trunk"}, False),
        ({"highway": "residential"}, False),  # ridden, not walked
    ],
)
def test_a_rider_walks_footways_and_pedestrian_streets_never_steps(
    tags: dict[str, str], walks: bool
) -> None:
    assert walkable(tags) is walks


@pytest.mark.parametrize(
    ("value", "walked"),
    [(True, True), ("True", True), (None, False), (False, False), ("False", False)],
)
def test_a_walked_edge_is_known_also_when_read_from_graphml(
    value: Any, walked: bool
) -> None:
    data = {} if value is None else {"walk": value}
    assert on_foot_edge(data) is walked


def test_a_metre_walked_costs_walk_cost_metres_ridden() -> None:
    assert WALK_COST == 6.0
    ridden = {0: {"length": 100.0}}
    walked = {0: {"length": 100.0, "walk": True}}
    assert step_cost(1, 2, ridden) == 100.0
    assert step_cost(1, 2, walked) == 600.0
    assert step_cost(1, 2, {0: walked[0], 1: {"length": 400.0}}) == 400.0


def test_the_footway_and_the_other_way_of_one_way_streets_are_walked(
    bike_town: Graph,
) -> None:
    assert bike_town.graph["on_foot"] is True
    footway = _edges_of(bike_town, _column_way(FOOT_COL))
    assert {(v, u) for u, v in footway} == set(footway)  # both ways
    row = _edges_of(bike_town, _row_way(EAST_ROW))
    walked = [(u, v) for u, v in row if on_foot_edge(bike_town[u][v][0])]
    ridden = [(u, v) for u, v in row if not on_foot_edge(bike_town[u][v][0])]
    assert walked and ridden
    assert {(v, u) for u, v in walked} == set(ridden)
    assert _edges_of(bike_town, _column_way(STEPS_COL)) == []


def test_simplifying_never_joins_a_walked_stretch_to_a_ridden_one(
    bike_town: Graph,
) -> None:
    for _, _, data in bike_town.edges(data=True):
        assert data.get("walk") in (None, True)
        if on_foot_edge(data):
            # one way of the town each: the footway or one row, never both
            assert len(_ways(data, "osmid")) == 1


def test_walking_costs_walk_cost_times_its_length_along_the_shape(
    bike_town: Graph,
) -> None:
    outline = np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 0.0]])
    costs = _corridor_costs(bike_town, TOWN, outline, 0.0, 1.0)
    for u, v, data in bike_town.edges(data=True):
        expected = float(data["length"]) * (WALK_COST if on_foot_edge(data) else 1.0)
        assert costs[(u, v)] == pytest.approx(expected)


def test_a_cycling_route_walks_a_little_where_the_shape_gains(
    tmp_path: Path, downloads: list[tuple[str, Any]]
) -> None:
    request = RouteRequest(
        start=TOWN, shape="circle", distance_m=10_000, activity="cycling"
    )
    plan = plan_route(request, OsmnxSource.for_activity(tmp_path, "cycling"))
    walked = plan.checks["on_foot"]
    assert walked == pytest.approx(300.0, abs=1.0)  # one block, of 10 km
    assert walked <= 0.1 * plan.result.distance_m
    assert f"{walked:.0f} m of the route with the bike on foot" in plan.result.warnings


def _stub(walk: bool, marked: bool) -> Graph:
    """A bike graph 1 → 2 → 3, the second step walked when `walk`; a graph
    cached before TASK-206 has no `on_foot` mark and no walked edge."""
    graph: Graph = nx.MultiDiGraph(crs="epsg:4326", network=BIKE_NETWORK_NAME)
    if marked:
        graph.graph["on_foot"] = True
    for node, x in ((1, 0.0), (2, 100.0), (3, 300.0)):
        lat, lon = local_to_latlon(TOWN, x, 0.0)
        graph.add_node(node, y=lat, x=lon)
    graph.add_edge(1, 2, length=100.0, highway="residential")
    step = {"length": 200.0, "highway": "footway"}
    graph.add_edge(2, 3, **({**step, "walk": True} if walk else step))
    return graph


def test_the_checks_count_the_metres_walked_and_say_so() -> None:
    metres = usability(_stub(walk=True, marked=True), [1, 2, 3])
    assert metres["on_foot"] == 200.0
    messages = [issue.message for issue in validate(_with_shares(metres))]
    assert "200 m of the route with the bike on foot" in messages


def test_a_bike_zone_cached_before_walks_nowhere_and_still_works() -> None:
    graph = _stub(walk=False, marked=False)
    metres = usability(graph, [1, 2, 3])
    assert metres["on_foot"] == 0.0
    assert step_cost(2, 3, graph[2][3]) == 200.0


def test_on_foot_nothing_changes(
    tmp_path: Path, downloads: list[tuple[str, Any]]
) -> None:
    foot = OsmnxSource(tmp_path).load(_town_box(6000.0))
    assert not any(on_foot_edge(d) for _, _, d in foot.edges(data=True))
    assert "on_foot" not in foot.graph
    assert "on_foot" not in usability(foot, list(foot.nodes)[:2])
    outline = np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 0.0]])
    costs = _corridor_costs(foot, TOWN, outline, 0.0, 1.0)
    for u, v, data in foot.edges(data=True):
        assert costs[(u, v)] <= float(data["length"])
        assert step_cost(u, v, foot[u][v]) == min(
            float(d["length"]) for d in foot[u][v].values()
        )


def _with_shares(metres: dict[str, float]) -> dict[str, float]:
    return {"reuse": 0.0, "retrace": 0.0, **metres}
