"""The foot network leaves out what stops a person on foot (TASK-421,
ADR-0349): a gate closed to them, a way closed to them.

No network: the Overpass answer is a small town made here, a grid of
residential streets. Some north-south streets carry a barrier node halfway
between two crossings: a private gate, a plain gate, a gate open on foot, a
kissing gate, a locked gate, a gate closed on foot, a fence, a bollard cars
may not pass, a private lift gate. Others are closed as ways: `access=no`,
`access=no` but `foot=yes`, `foot=private`, `access=destination`. OSMnx
turns the answer into a graph as it does a real one, the filter being
Overpass's business: what the foot network leaves out is what its rules
leave out, and a run never crosses it.
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

import route_engine.network as network
from route_engine.geo import local_to_latlon
from route_engine.models import RouteRequest
from route_engine.network import (
    FOOT_FILTER,
    Graph,
    OsmnxSource,
    area_around,
    network_of,
    read_graph,
)
from route_engine.networks.foot import (
    FOOT_NODE_TAGS,
    FOOT_WAY_TAGS,
    blocks_foot,
    closed_to_foot,
    foot_ways,
)
from route_engine.networks.hike import HIKE_FILTER
from route_engine.optimizer import plan_route

TOWN = (46.0122, 11.2986)
SPACING_M = 200.0
LINES = 21  # streets each way: the town is 4 km wide, centred on TOWN
# The row the barriers stand after: a barrier is a node of its own on the
# column, halfway between row GATE_ROW and row GATE_ROW + 1.
GATE_ROW = 10
# Columns run south to north; the others are plain residential streets.
BLOCKED: dict[int, dict[str, str]] = {
    2: {"barrier": "gate", "access": "private"},
    10: {"barrier": "gate", "locked": "yes"},
    12: {"barrier": "gate", "foot": "no"},
    14: {"barrier": "fence"},
    18: {"barrier": "lift_gate", "access": "no"},
}
PASSED: dict[int, dict[str, str]] = {
    4: {"barrier": "gate"},
    6: {"barrier": "gate", "access": "private", "foot": "yes"},
    8: {"barrier": "kissing_gate"},
    16: {"barrier": "bollard", "access": "no"},
}
CLOSED_WAYS: dict[int, dict[str, str]] = {
    3: {"highway": "service", "access": "no"},
    7: {"highway": "footway", "foot": "private"},
}
OPEN_WAYS: dict[int, dict[str, str]] = {
    5: {"highway": "service", "access": "no", "foot": "yes"},
    9: {"highway": "residential", "access": "destination"},
}


def _column_tags(column: int) -> dict[str, str]:
    return (
        CLOSED_WAYS.get(column) or OPEN_WAYS.get(column) or {"highway": "residential"}
    )


def _node_id(row: int, column: int) -> int:
    return 1 + row * LINES + column


def _gate_id(column: int) -> int:
    return 10_000 + column


def _row_way(row: int) -> int:
    return 100_000 + row


def _column_way(column: int) -> int:
    return 200_000 + column


def _offset(index: float) -> float:
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
    for column, tags in (BLOCKED | PASSED).items():
        lat, lon = local_to_latlon(TOWN, _offset(column), _offset(GATE_ROW + 0.5))
        elements.append(
            {
                "type": "node",
                "id": _gate_id(column),
                "lat": lat,
                "lon": lon,
                "tags": tags,
            }
        )
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
        if column in BLOCKED or column in PASSED:
            nodes.insert(GATE_ROW + 1, _gate_id(column))
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
def foot_town(tmp_path: Path, downloads: list[tuple[str, Any]]) -> Graph:
    """The town's foot network, downloaded once into `tmp_path`."""
    return OsmnxSource(tmp_path).load(_town_box(2500.0))


def _through_the_gate(graph: Graph, column: int) -> bool:
    """Whether the column's street goes on across its barrier: a road from
    the crossing before the gate to the one after it."""
    return graph.has_edge(_node_id(GATE_ROW, column), _node_id(GATE_ROW + 1, column))


def _along_the_column(graph: Graph, column: int) -> bool:
    return any(
        graph.has_edge(_node_id(row, column), _node_id(row + 1, column))
        for row in range(LINES - 1)
        if row != GATE_ROW
    )


# --- the rules ---


@pytest.mark.parametrize(
    ("tags", "blocked"),
    [
        # No barrier, no block: a crossing, a kerb's neighbour.
        ({}, False),
        ({"highway": "crossing"}, False),
        ({"access": "private"}, False),
        # A gate is passed unless something closes it.
        ({"barrier": "gate"}, False),
        ({"barrier": "lift_gate"}, False),
        ({"barrier": "swing_gate"}, False),
        ({"barrier": "gate", "access": "yes"}, False),
        ({"barrier": "gate", "access": "permissive"}, False),
        ({"barrier": "gate", "access": "customers"}, False),
        ({"barrier": "gate", "access": "destination"}, False),
        ({"barrier": "gate", "locked": "no"}, False),
        ({"barrier": "gate", "access": "no"}, True),
        ({"barrier": "gate", "access": "private"}, True),
        ({"barrier": "gate", "locked": "yes"}, True),
        ({"barrier": "gate", "access": "permissive", "locked": "yes"}, True),
        ({"barrier": "lift_gate", "access": "private"}, True),
        ({"barrier": "swing_gate", "access": "no"}, True),
        ({"barrier": "sliding_gate", "access": "private"}, True),
        # `foot` says more than the rest.
        ({"barrier": "gate", "access": "private", "foot": "yes"}, False),
        ({"barrier": "gate", "locked": "yes", "foot": "designated"}, False),
        ({"barrier": "gate", "access": "no", "foot": "permissive"}, False),
        ({"barrier": "gate", "access": "no", "foot": "destination"}, False),
        ({"barrier": "gate", "foot": "no"}, True),
        ({"barrier": "gate", "foot": "private"}, True),
        ({"barrier": "lift_gate", "foot": "no"}, True),
        ({"barrier": "bollard", "foot": "no"}, True),
        # A fence or a wall across the way.
        ({"barrier": "fence"}, True),
        ({"barrier": "wall"}, True),
        ({"barrier": "fence", "foot": "yes"}, False),
        # Stepped over or walked around: their `access` is for vehicles.
        ({"barrier": "bollard"}, False),
        ({"barrier": "bollard", "access": "no"}, False),
        ({"barrier": "kerb"}, False),
        ({"barrier": "cycle_barrier", "access": "no"}, False),
        ({"barrier": "block", "access": "private"}, False),
        ({"barrier": "kissing_gate"}, False),
        ({"barrier": "stile"}, False),
        ({"barrier": "cattle_grid", "access": "no"}, False),
        ({"barrier": "chain", "access": "private"}, False),
        ({"barrier": "height_restrictor", "access": "no"}, False),
        # Any other barrier, as a gate.
        ({"barrier": "turnstile"}, False),
        ({"barrier": "turnstile", "access": "no"}, True),
        ({"barrier": "yes", "access": "private"}, True),
        ({"barrier": "entrance", "access": "private"}, True),
    ],
)
def test_what_stops_a_person_on_foot(tags: dict[str, str], blocked: bool) -> None:
    assert blocks_foot(tags) is blocked


@pytest.mark.parametrize(
    ("tags", "is_closed"),
    [
        ({}, False),
        ({"highway": "residential"}, False),
        ({"highway": "service", "access": "no"}, True),
        ({"highway": "track", "access": "private"}, True),
        ({"highway": "service", "access": "no", "foot": "yes"}, False),
        ({"highway": "service", "access": "private", "foot": "designated"}, False),
        ({"highway": "path", "access": "no", "foot": "permissive"}, False),
        ({"highway": "footway", "foot": "private"}, True),
        ({"highway": "footway", "foot": "no"}, True),
        ({"highway": "residential", "access": "destination"}, False),
        ({"highway": "service", "access": "customers"}, False),
        ({"highway": "track", "access": "agricultural"}, False),
        ({"highway": "service", "access": "permit"}, False),
    ],
)
def test_a_way_closed_to_people_on_foot(tags: dict[str, str], is_closed: bool) -> None:
    assert closed_to_foot(tags) is is_closed


def test_the_tags_the_rules_read_are_asked_for() -> None:
    assert set(FOOT_NODE_TAGS) == {"barrier", "access", "foot", "locked"}
    assert "foot" in FOOT_WAY_TAGS


# --- the graph ---


def test_the_foot_graph_is_downloaded_unsimplified_with_the_tags_and_cut_at_the_gates(
    tmp_path: Path, downloads: list[tuple[str, Any]], foot_town: Graph
) -> None:
    assert downloads == [("walk", FOOT_FILTER)]
    # A foot graph, as before: no `network` attribute (test_bike_network).
    assert "network" not in foot_town.graph
    assert network_of(foot_town) == "foot"
    # Simplified: the barrier nodes passed are no longer nodes of their own,
    # and the crossings stay.
    for column in PASSED:
        assert _gate_id(column) not in foot_town
        assert _through_the_gate(foot_town, column), column
    for column in BLOCKED:
        assert _gate_id(column) not in foot_town
        assert not _through_the_gate(foot_town, column), column
        assert _along_the_column(foot_town, column), column
    for column in CLOSED_WAYS:
        assert not _along_the_column(foot_town, column), column
    for column in OPEN_WAYS:
        assert _along_the_column(foot_town, column), column
    # Every way both ways, and the rows hold the town together.
    for u, v in foot_town.edges():
        assert foot_town.has_edge(v, u)
    assert nx.is_weakly_connected(foot_town)
    # Its cache file reads back the same, gates and all.
    [path] = tmp_path.glob("foot_*.graphml")
    again = read_graph(path)
    assert not _through_the_gate(again, 2)
    assert _through_the_gate(again, 4)


def test_a_closed_gate_sends_the_walk_around_an_open_one_does_not(
    foot_town: Graph,
) -> None:
    before, after = _node_id(GATE_ROW, 2), _node_id(GATE_ROW + 1, 2)
    around = nx.shortest_path_length(foot_town, before, after, weight="length")
    assert around == pytest.approx(3 * SPACING_M, rel=0.01)
    before, after = _node_id(GATE_ROW, 4), _node_id(GATE_ROW + 1, 4)
    through = nx.shortest_path_length(foot_town, before, after, weight="length")
    assert through == pytest.approx(SPACING_M, rel=0.01)


def test_a_graph_without_barrier_tags_keeps_every_way(
    downloads: list[tuple[str, Any]],
) -> None:
    """The rules read the tags: a download made without them (as every
    zone cached before) is left as it is."""
    south, west, north, east = _town_box(2500.0)
    graph = ox.graph_from_bbox(
        bbox=(west, south, east, north),
        network_type="walk",
        custom_filter=FOOT_FILTER,
        retain_all=True,
        simplify=False,
    )
    assert "barrier" not in graph.nodes[_gate_id(2)]
    graph = foot_ways(graph)
    for column in (*BLOCKED, *PASSED):
        assert _through_the_gate(graph, column), column
    # The ways' `access` is one of OSMnx's own tags: the closed ways go.
    assert not _along_the_column(graph, 3)
    assert _along_the_column(graph, 9)


def test_the_hike_network_leaves_the_same_gates_out(
    tmp_path: Path, downloads: list[tuple[str, Any]]
) -> None:
    hike = OsmnxSource.for_activity(tmp_path, "hiking").load(_town_box(2500.0))
    assert downloads == [("walk", HIKE_FILTER)]
    assert network_of(hike) == "hike"
    for column in BLOCKED:
        assert not _through_the_gate(hike, column), column
    for column in PASSED:
        assert _through_the_gate(hike, column), column


# --- a run ---


def _steps(graph: Graph, nodes: list[Any]) -> None:
    """Every step of the route is a road of the graph: no step across a gate."""
    for u, v in zip(nodes, nodes[1:], strict=False):
        assert graph.has_edge(u, v), f"no road from {u} to {v}"


def test_a_run_never_crosses_a_closed_gate(
    tmp_path: Path, downloads: list[tuple[str, Any]], foot_town: Graph
) -> None:
    request = RouteRequest(start=TOWN, shape="circle", distance_m=3_000)
    plan = plan_route(request, OsmnxSource(tmp_path))
    assert plan.search is not None
    nodes = plan.search.best.route.nodes
    assert len(nodes) > 4
    assert nodes[0] == nodes[-1]
    _steps(foot_town, nodes)
    for column in BLOCKED:
        pair = {_node_id(GATE_ROW, column), _node_id(GATE_ROW + 1, column)}
        assert not any(
            {u, v} == pair for u, v in zip(nodes, nodes[1:], strict=False)
        ), column
