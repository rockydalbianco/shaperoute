"""An area without roads is refused by name, and a zone keeps every piece of
its roads (TASK-180, ADR-0148).

Venice failed with `engine_error`: its zone held the mainland only, the crop
around the historic centre had no node, and the empty graph broke further
on. No network: zones are the Levico fixture under the name of a larger
area, or small grids made here.
"""

from __future__ import annotations

import math
import shutil
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import networkx as nx
import osmnx as ox
import pytest

import route_engine.network as network
from route_engine import errors, optimizer
from route_engine.__main__ import main
from route_engine.errors import NoRoadsError, ShapeNotDrawableError
from route_engine.geo import LatLon, local_to_latlon
from route_engine.models import RouteRequest
from route_engine.nearby_starts import ShapeJob, plan_nearby
from route_engine.network import (
    BBox,
    Graph,
    OsmnxSource,
    area_around,
    crop,
    largest_piece,
    read_graph,
    snap_to_network,
)
from route_engine.optimizer import SHAPE_POINTS, RoadMask, plan_shape
from route_engine.shapes import get_shape
from route_engine.zone_crop import ZoneCrop

LEVICO = (46.0122, 11.2986)
FIXTURE = Path(__file__).parent / "fixtures" / "levico_walk_1km.graphml"
# Inside the zone below, 15 km from the roads of the fixture.
NO_ROADS_HERE = local_to_latlon(LEVICO, 12_000.0, 9_000.0)
HEART = get_shape("heart")(SHAPE_POINTS)
SPACING_M = 100.0


@pytest.fixture
def no_download(monkeypatch: pytest.MonkeyPatch) -> None:
    def refused(*args: object, **kwargs: object) -> None:
        raise AssertionError("a graph was downloaded")

    monkeypatch.setattr(ox, "graph_from_bbox", refused)


@pytest.fixture
def wide_zone(tmp_path: Path, no_download: None) -> OsmnxSource:
    """A cached zone 60 km wide whose only roads are Levico's, in the
    middle: like a zone of lagoon with the island left out."""
    source = OsmnxSource(tmp_path)
    shutil.copy(FIXTURE, source.cache_path(area_around([LEVICO], margin_m=30_000.0)))
    return source


def _grid(size: int, corner: LatLon, first: int) -> Graph:
    """size x size crossings SPACING_M apart from `corner`, joined both
    ways, with what OSMnx gives a graph and its edges."""
    graph: Graph = nx.MultiDiGraph(crs="epsg:4326")
    for i in range(size):
        for j in range(size):
            lat, lon = local_to_latlon(corner, i * SPACING_M, j * SPACING_M)
            graph.add_node(first + size * i + j, y=lat, x=lon, street_count=4)
    for i in range(size):
        for j in range(size):
            for di, dj in ((1, 0), (0, 1)):
                if i + di < size and j + dj < size:
                    a, b = first + size * i + j, first + size * (i + di) + j + dj
                    for u, v in ((a, b), (b, a)):
                        graph.add_edge(
                            u, v, osmid=first, length=SPACING_M, highway="footway"
                        )
    return graph


def test_the_error_is_the_optimizers_own_under_both_names() -> None:
    assert optimizer.ShapeNotDrawableError is errors.ShapeNotDrawableError
    assert issubclass(NoRoadsError, ShapeNotDrawableError)
    refused = NoRoadsError()
    assert str(refused) == "there are no roads to run on around here"
    assert refused.best_distance_m is None


def test_a_crop_with_no_node_inside_says_there_are_no_roads() -> None:
    zone = _grid(4, LEVICO, 1)
    nowhere = area_around([NO_ROADS_HERE], margin_m=1000.0)
    with pytest.raises(NoRoadsError):
        crop(zone, nowhere)
    with pytest.raises(NoRoadsError):
        ZoneCrop(zone).crop(nowhere)


def test_a_graph_without_an_edge_has_no_roads_to_look_along() -> None:
    lone: Graph = nx.MultiDiGraph(crs="epsg:4326")
    lone.add_node(1, y=LEVICO[0], x=LEVICO[1])
    with pytest.raises(NoRoadsError):
        RoadMask(lone, LEVICO)


def test_a_shape_where_the_zone_has_no_roads_is_not_drawable(
    wide_zone: OsmnxSource,
) -> None:
    with pytest.raises(NoRoadsError):
        plan_shape(HEART, "heart", NO_ROADS_HERE, 5000, wide_zone)
    with pytest.raises(NoRoadsError):
        plan_shape(HEART, "heart", NO_ROADS_HERE, 5000, wide_zone, optimize=False)


def test_the_plan_with_nearby_starts_refuses_the_same_way(
    wide_zone: OsmnxSource,
) -> None:
    request = RouteRequest(start=NO_ROADS_HERE, distance_m=5000, shape="heart")
    with pytest.raises(ShapeNotDrawableError, match="no roads"):
        plan_nearby(
            ShapeJob.of_request(request), NO_ROADS_HERE, wide_zone, processes=False
        )


def test_a_crop_of_one_node_is_not_drawable_either() -> None:
    lone: Graph = nx.MultiDiGraph(crs="epsg:4326")
    lone.add_node(1, y=LEVICO[0], x=LEVICO[1])

    class OneNode:
        def load(self, bbox: BBox) -> Graph:
            return lone.copy()

    with pytest.raises(NoRoadsError):
        plan_shape(HEART, "heart", LEVICO, 5000, OneNode())


def test_the_cli_says_no_route_instead_of_failing(
    wide_zone: OsmnxSource, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    out = tmp_path / "route.gpx"
    lat, lon = NO_ROADS_HERE
    code = main(
        [
            "--shape=heart",
            "--distance=5000",
            f"--start={lat},{lon}",
            f"--cache-dir={wide_zone.cache_dir}",
            f"--out={out}",
        ]
    )
    assert code == 1
    assert (
        "No route: there are no roads to run on around here" in capsys.readouterr().err
    )
    assert not out.exists()


# A zone with two pieces of road: the mainland, larger, and an island
# 3 km east of it.
MAINLAND = _grid(6, LEVICO, 1000)
ISLAND_CORNER = local_to_latlon(LEVICO, 3000.0, 0.0)
ISLAND = _grid(5, ISLAND_CORNER, 2000)
LAGOON: BBox = area_around([LEVICO, ISLAND_CORNER], margin_m=1500.0)
AROUND_THE_ISLAND: BBox = area_around([ISLAND_CORNER], margin_m=1000.0)


@contextmanager
def _anywhere(url: str) -> Iterator[None]:
    yield None


@pytest.fixture
def lagoon(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """OSMnx's download answered with the two pieces when asked for all of
    them, with the largest alone otherwise: as OSMnx does."""
    asked: dict[str, Any] = {}

    def download(**kwargs: Any) -> Graph:
        asked.update(kwargs)
        whole = nx.compose(MAINLAND, ISLAND)
        return whole if kwargs.get("retain_all") else largest_piece(whole)

    monkeypatch.setattr(ox, "graph_from_bbox", download)
    monkeypatch.setattr(network, "reachable", _anywhere)
    # load() points OSMnx's own cache inside the cache folder: put it back.
    monkeypatch.setattr(ox.settings, "cache_folder", ox.settings.cache_folder)
    asked["source"] = OsmnxSource(tmp_path)
    return asked


def test_a_downloaded_zone_keeps_every_piece_of_its_roads(
    lagoon: dict[str, Any],
) -> None:
    source: OsmnxSource = lagoon["source"]
    graph = source.load(LAGOON)
    assert lagoon["retain_all"] is True
    # In the file both pieces; handed out, the largest: as before.
    saved = read_graph(source.cache_path(LAGOON))
    assert set(saved.nodes) == set(MAINLAND.nodes) | set(ISLAND.nodes)
    assert set(graph.nodes) == set(MAINLAND.nodes)
    assert set(source.load(LAGOON).nodes) == set(MAINLAND.nodes)


def test_the_area_around_the_island_gets_the_islands_roads(
    lagoon: dict[str, Any],
) -> None:
    source: OsmnxSource = lagoon["source"]
    source.load(LAGOON)
    around = source.load(AROUND_THE_ISLAND)
    assert set(around.nodes) == set(ISLAND.nodes)
    # A start on the smaller piece gets its route there: a square of two
    # blocks a side, from a crossing of the island.
    square = [
        local_to_latlon(ISLAND_CORNER, i * SPACING_M, j * SPACING_M)
        for i, j in ((1, 1), (3, 1), (3, 3), (1, 3), (1, 1))
    ]
    route = snap_to_network(around, square)
    assert route.points[0] == route.points[-1]
    assert math.dist(route.points[0], square[0]) < 1e-9
    assert route.distance_m == pytest.approx(8 * SPACING_M, rel=1e-3)
    assert set(route.nodes) <= set(ISLAND.nodes)
    assert route.warnings == []


def test_a_zone_in_one_piece_is_handed_out_as_it_is() -> None:
    assert largest_piece(MAINLAND) is MAINLAND
    both = nx.compose(MAINLAND, ISLAND)
    assert set(largest_piece(both).nodes) == set(MAINLAND.nodes)
    assert both.number_of_nodes() == len(MAINLAND) + len(ISLAND)  # left whole
