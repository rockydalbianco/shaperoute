"""ZoneGraphs downloads a zone not cached wider, on a grid (download_box),
and the next tries nearby draw on it without downloading again."""

from __future__ import annotations

from pathlib import Path

import networkx as nx
from route_engine.network import BBox, Graph, download_box

from shaperoute_api.activity_graphs import ROAD_ACTIVITIES, ActivityGraphs
from shaperoute_api.graphs import ZoneGraphs
from shaperoute_api.warm_zones import warm_graphs

# Two tries in Bangkok 0.0003 deg apart (2026-11-21/22), and one 4 km north.
TRY_A: BBox = (13.70620, 100.51580, 13.75580, 100.56680)
TRY_B: BBox = (13.70650, 100.51610, 13.75550, 100.56650)
TRY_NORTH: BBox = (13.74050, 100.51280, 13.78950, 100.56320)


def roads(box: BBox, size: int = 31) -> Graph:
    """A connected grid of roads over `box`, both ways."""
    south, west, north, east = box
    graph: Graph = nx.MultiDiGraph()
    for i in range(size):
        for j in range(size):
            graph.add_node(
                (i, j),
                y=south + (north - south) * i / (size - 1),
                x=west + (east - west) * j / (size - 1),
            )
    for i in range(size):
        for j in range(size):
            for di, dj in ((0, 1), (1, 0)):
                if i + di < size and j + dj < size:
                    graph.add_edge((i, j), (i + di, j + dj), length=500.0)
                    graph.add_edge((i + di, j + dj), (i, j), length=500.0)
    return graph


class Overpass:
    """A cache of zones by their box; a download saves the box asked for."""

    def __init__(self) -> None:
        self.zones: dict[Path, BBox] = {}
        self.asked: list[BBox] = []

    def cache_path(self, bbox: BBox) -> Path:
        return Path("_".join(f"{v:.5f}" for v in bbox) + ".graphml")

    def covering_path(self, bbox: BBox) -> Path | None:
        south, west, north, east = bbox
        for path, (s, w, n, e) in self.zones.items():
            if s <= south and w <= west and n >= north and e >= east:
                return path
        return None

    def load(self, bbox: BBox) -> Graph:
        self.asked.append(bbox)
        self.zones[self.cache_path(bbox)] = bbox
        return roads(bbox)


def test_a_zone_not_cached_is_downloaded_on_the_grid() -> None:
    source = Overpass()
    graphs = ZoneGraphs(source, widen=download_box)
    graph = graphs.load(TRY_A)
    assert source.asked == [download_box(TRY_A)]
    # What the route gets is still the crop of its own area.
    south, west, north, east = TRY_A
    for _, data in graph.nodes(data=True):
        assert south <= data["y"] <= north and west <= data["x"] <= east


def test_the_next_tries_nearby_do_not_download_again() -> None:
    source = Overpass()
    graphs = ZoneGraphs(source, widen=download_box)
    graphs.load(TRY_A)
    graphs.load(TRY_B)
    graphs.load(TRY_NORTH)
    assert source.asked == [download_box(TRY_A)]


def test_the_zone_downloaded_stays_in_memory_under_its_own_name() -> None:
    source = Overpass()
    read: list[Path] = []
    graphs = ZoneGraphs(source, widen=download_box, read=lambda p: read.append(p))
    graphs.load(TRY_A)
    graphs.load(TRY_B)
    assert read == []  # never read back from disk: the zone is in memory


def test_without_widen_the_request_itself_is_downloaded() -> None:
    source = Overpass()
    graphs = ZoneGraphs(source)
    graphs.load(TRY_A)
    graphs.load(TRY_NORTH)
    assert source.asked == [TRY_A, TRY_NORTH]


def test_the_server_graphs_download_on_the_grid(tmp_path: Path) -> None:
    graphs = ActivityGraphs.from_cache(tmp_path)
    for activity in ROAD_ACTIVITIES:
        loader = graphs.for_activity(activity)
        assert isinstance(loader, ZoneGraphs)
        assert loader._widen is download_box
    warm = warm_graphs(tmp_path, in_background=False)
    assert warm.warm._widen is download_box
