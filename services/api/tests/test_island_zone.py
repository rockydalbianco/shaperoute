"""A city on an island beside a larger mainland, as Venice is (TASK-180,
ADR-0148): its zone keeps the island's roads, and a start with no roads
around is answered by name.

The zone is built as `prefetch_zones --extract` builds it: OSMnx and the
engine fed from a small extract written here. No network, no osmium.
"""

from __future__ import annotations

import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import osmnx as ox
import pytest
from fastapi.testclient import TestClient
from route_engine.errors import NoRoadsError
from route_engine.network import BBox, OsmnxSource, crop, read_graph
from route_engine.optimizer import ShapeNotDrawableError, plan_shape
from route_engine.shapes import get_shape

from shaperoute_api.app import create_app
from shaperoute_api.errors import error_of
from shaperoute_api.graphs import ZoneGraphs
from shaperoute_api.zone_extract import read_osm_xml, served_from

# Crossings 100 m apart. The mainland, 9 x 9 of them, to the west; the
# island, 7 x 7, six kilometres of water to the east. To the north,
# kilometres of water without a road.
STEP_LAT, STEP_LON = 0.0009, 0.00125
SOUTH, WEST = 45.0, 8.0
MAINLAND_SIZE, ISLAND_SIZE = 9, 7
ISLAND_COL = 60
ZONE: BBox = (44.95, 7.97, 45.09, 8.12)
ISLAND: BBox = (44.99, 8.06, 45.02, 8.10)
MAINLAND: BBox = (44.99, 7.99, 45.02, 8.02)
ISLAND_WEST = WEST + STEP_LON * ISLAND_COL - 0.0001
# A crossing in the middle of the island's south shore, and the open water.
ON_THE_ISLAND = (SOUTH, WEST + STEP_LON * (ISLAND_COL + 3))
ON_THE_WATER = (45.06, 8.04)


def _crossing(first: int, cols: int, row: int, col: int) -> int:
    return first + cols * row + col


def _grid(first: int, size: int, col0: int) -> tuple[list[str], list[str]]:
    nodes, ways = [], []
    for row in range(size):
        for col in range(size):
            lat = SOUTH + STEP_LAT * row
            lon = WEST + STEP_LON * (col0 + col)
            node = _crossing(first, size, row, col)
            nodes.append(f'<node id="{node}" lat="{lat:.7f}" lon="{lon:.7f}"/>')
    way = first * 10
    for row in range(size):
        refs = "".join(
            f'<nd ref="{_crossing(first, size, row, c)}"/>' for c in range(size)
        )
        ways.append(f'<way id="{way}">{refs}<tag k="highway" v="footway"/></way>')
        way += 1
    for col in range(size):
        refs = "".join(
            f'<nd ref="{_crossing(first, size, r, col)}"/>' for r in range(size)
        )
        ways.append(f'<way id="{way}">{refs}<tag k="highway" v="residential"/></way>')
        way += 1
    return nodes, ways


def lagoon_xml() -> str:
    """The two grids and the bridge between them: a road and a cycle path,
    neither for walking, as on the Ponte della Libertà where it reaches
    Venice (`foot=no`)."""
    mainland_nodes, mainland_ways = _grid(1000, MAINLAND_SIZE, 0)
    island_nodes, island_ways = _grid(2000, ISLAND_SIZE, ISLAND_COL)
    ends = (
        f'<nd ref="{_crossing(1000, MAINLAND_SIZE, 1, MAINLAND_SIZE - 1)}"/>'
        f'<nd ref="{_crossing(2000, ISLAND_SIZE, 1, 0)}"/>'
    )
    bridge = [
        f'<way id="90">{ends}<tag k="highway" v="trunk"/><tag k="foot" v="no"/></way>',
        f'<way id="91">{ends}<tag k="highway" v="cycleway"/>'
        '<tag k="foot" v="no"/></way>',
    ]
    body = "".join(mainland_nodes + island_nodes + mainland_ways + island_ways + bridge)
    return f'<?xml version="1.0"?><osm version="0.6">{body}</osm>'


@pytest.fixture
def lagoon(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> OsmnxSource:
    """The zone of the lagoon in a cache, and no way to download another."""
    extract = tmp_path / "lagoon.osm"
    extract.write_text(lagoon_xml())
    source = OsmnxSource(tmp_path / "cache")
    with served_from(read_osm_xml(extract)):
        source.load(ZONE)

    def refused(*args: object, **kwargs: object) -> None:
        raise AssertionError("an area outside the zone was asked for")

    monkeypatch.setattr(ox, "graph_from_bbox", refused)
    return source


def _on_the_island(graph: Any) -> bool:
    return all(d["x"] >= ISLAND_WEST for _, d in graph.nodes(data=True))


def test_the_zone_keeps_the_island_beside_a_larger_mainland(
    lagoon: OsmnxSource,
) -> None:
    zone = read_graph(lagoon.cache_path(ZONE))
    # Simplified as OSMnx does: the corners of a grid are only bends.
    mainland, island = MAINLAND_SIZE**2 - 4, ISLAND_SIZE**2 - 4
    assert zone.number_of_nodes() == mainland + island
    # Of the whole zone the largest piece is the mainland, as it was.
    assert lagoon.load(ZONE).number_of_nodes() == mainland
    assert crop(zone, MAINLAND).number_of_nodes() == mainland
    # Around the island, the island: before, no node at all.
    around = ZoneGraphs(lagoon).load(ISLAND)
    assert around.number_of_nodes() == island
    assert around.number_of_edges() > 0
    assert _on_the_island(around)


def test_a_circle_from_the_island_is_drawn_on_the_island(lagoon: OsmnxSource) -> None:
    """What an example of «Explore» asks from the centre of Venice: the
    engine's own search, on the crop the API makes around the start."""
    circle = get_shape("circle")(64)
    route = plan_shape(circle, "circle", ON_THE_ISLAND, 2000, ZoneGraphs(lagoon)).result
    assert route.points[0] == route.points[-1] == ON_THE_ISLAND
    assert all(lon >= ISLAND_WEST for _, lon in route.points)
    assert route.similarity > 0.9
    assert 2000 <= route.distance_m <= 2500


def test_water_without_roads_is_not_drawable_by_name(lagoon: OsmnxSource) -> None:
    graphs = ZoneGraphs(lagoon)
    heart = get_shape("heart")(64)
    with pytest.raises(NoRoadsError) as refused:
        plan_shape(heart, "heart", ON_THE_WATER, 1000, graphs)
    assert isinstance(refused.value, ShapeNotDrawableError)
    status, error = error_of(refused.value)
    assert (status, error.code) == (422, "shape_not_drawable")
    assert error.message == "there are no roads to run on around here"
    assert error.suggested_distance_m is None


@pytest.fixture
def client(lagoon: OsmnxSource) -> Iterator[TestClient]:
    with TestClient(create_app(ZoneGraphs(lagoon))) as started:
        yield started


def _finished(client: TestClient, job_id: str) -> dict[str, Any]:
    deadline = time.monotonic() + 30
    while True:
        body: dict[str, Any] = client.get(f"/route-jobs/{job_id}").json()
        if body["status"] in ("done", "failed"):
            return body
        assert time.monotonic() < deadline, body
        time.sleep(0.02)


def test_a_job_from_the_water_fails_as_not_drawable_not_as_an_engine_error(
    client: TestClient,
) -> None:
    asked = {"start": list(ON_THE_WATER), "shape": "heart", "distance_m": 1000}
    job = client.post("/route-jobs", json=asked).json()
    body = _finished(client, job["job_id"])
    assert body["status"] == "failed"
    assert body["error"]["code"] == "shape_not_drawable"
    assert body["error"]["message"] == "there are no roads to run on around here"
