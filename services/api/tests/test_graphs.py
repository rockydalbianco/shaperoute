"""ZoneGraphs: zones read once and kept in memory, crops never saved."""

from __future__ import annotations

import math
import shutil
from pathlib import Path

import networkx as nx
import pytest
from route_engine.network import BBox, FileSource, Graph, OsmnxSource, read_graph

from shaperoute_api.graphs import MapDataUnavailableError, ZoneGraphs

REPO = Path(__file__).resolve().parents[3]
LEVICO_GRAPH = REPO / "services/route-engine/tests/fixtures/levico_walk_1km.graphml"


def grid(south: float, west: float, size: int = 10, step: float = 0.001) -> Graph:
    """A connected grid of roads, both ways, starting at (south, west)."""
    graph: Graph = nx.MultiDiGraph()
    for i in range(size):
        for j in range(size):
            graph.add_node((i, j), y=south + i * step, x=west + j * step)
    for i in range(size):
        for j in range(size):
            for di, dj in ((0, 1), (1, 0)):
                if i + di < size and j + dj < size:
                    graph.add_edge((i, j), (i + di, j + dj), length=80.0)
                    graph.add_edge((i + di, j + dj), (i, j), length=80.0)
    return graph


def inside(bbox: BBox, margin: float = 0.002) -> BBox:
    south, west, north, east = bbox
    return (south + margin, west + margin, north - margin, east - margin)


ZONE_A: BBox = (46.000, 11.000, 46.009, 11.009)
ZONE_B: BBox = (46.100, 11.100, 46.109, 11.109)
ZONE_C: BBox = (46.200, 11.200, 46.209, 11.209)


class FakeSource:
    """Zones already "in the cache", plus what a download would give."""

    def __init__(self, zones: list[BBox], download: Graph | Exception | None = None):
        self.zones = {Path(f"zone_{z[0]}.graphml"): z for z in zones}
        self.download = download
        self.downloads = 0

    def cache_path(self, bbox: BBox) -> Path:
        return Path(f"zone_{bbox[0]}.graphml")

    def covering_path(self, bbox: BBox) -> Path | None:
        south, west, north, east = bbox
        for path, (s, w, n, e) in self.zones.items():
            if s <= south and w <= west and n >= north and e >= east:
                return path
        return None

    def load(self, bbox: BBox) -> Graph:
        self.downloads += 1
        if isinstance(self.download, Exception):
            raise self.download
        assert self.download is not None
        self.zones[self.cache_path(bbox)] = bbox
        return self.download


class CountingReader:
    def __init__(self, source: FakeSource) -> None:
        self.source = source
        self.reads: list[Path] = []

    def __call__(self, path: Path) -> Graph:
        self.reads.append(path)
        south, west, _, _ = self.source.zones[path]
        return grid(south, west)


def test_a_zone_is_read_once_for_every_request_inside_it() -> None:
    source = FakeSource([ZONE_A])
    reader = CountingReader(source)
    graphs = ZoneGraphs(source, read=reader)
    first = graphs.load(inside(ZONE_A))
    second = graphs.load(inside(ZONE_A, margin=0.003))
    assert reader.reads == [Path("zone_46.0.graphml")]
    assert len(second) < len(first) < 100


def test_the_least_recently_used_zone_leaves_memory() -> None:
    source = FakeSource([ZONE_A, ZONE_B, ZONE_C])
    reader = CountingReader(source)
    graphs = ZoneGraphs(source, max_zones=2, read=reader)
    for zone in (ZONE_A, ZONE_B, ZONE_A, ZONE_C, ZONE_A, ZONE_B):
        graphs.load(inside(zone))
    # A stays, being used again before C arrives; B leaves and is read again.
    assert [p.name for p in reader.reads] == [
        "zone_46.0.graphml",
        "zone_46.1.graphml",
        "zone_46.2.graphml",
        "zone_46.1.graphml",
    ]


def test_each_request_gets_its_own_graph() -> None:
    source = FakeSource([ZONE_A])
    graphs = ZoneGraphs(source, read=CountingReader(source))
    first = graphs.load(inside(ZONE_A))
    first.remove_nodes_from(list(first))
    assert len(graphs.load(inside(ZONE_A))) > 0


def test_a_new_zone_is_downloaded_once() -> None:
    source = FakeSource([], download=grid(*ZONE_A[:2]))
    reader = CountingReader(source)
    graphs = ZoneGraphs(source, read=reader)
    assert len(graphs.load(ZONE_A)) == 100
    assert len(graphs.load(inside(ZONE_A))) > 0
    assert source.downloads == 1
    assert reader.reads == []


def test_a_failed_download_is_map_data_unavailable() -> None:
    cause = ConnectionError("overpass-api.de did not answer")
    graphs = ZoneGraphs(FakeSource([], download=cause))
    with pytest.raises(MapDataUnavailableError, match="did not answer") as info:
        graphs.load(ZONE_A)
    assert info.value.__cause__ is cause


def test_no_crop_is_saved_in_the_cache(tmp_path: Path) -> None:
    # The real OsmnxSource, with the Levico test graph as the cached zone.
    graph = FileSource(LEVICO_GRAPH).load((0.0, 0.0, 0.0, 0.0))
    ys = [d["y"] for _, d in graph.nodes(data=True)]
    xs = [d["x"] for _, d in graph.nodes(data=True)]
    zone = (
        math.floor(min(ys) * 1e5) / 1e5,
        math.floor(min(xs) * 1e5) / 1e5,
        math.ceil(max(ys) * 1e5) / 1e5,
        math.ceil(max(xs) * 1e5) / 1e5,
    )
    source = OsmnxSource(tmp_path)
    shutil.copy(LEVICO_GRAPH, source.cache_path(zone))
    reads: list[Path] = []

    def counting_read(path: Path) -> Graph:
        reads.append(path)
        return read_graph(path)

    graphs = ZoneGraphs(source, read=counting_read)
    graphs.load(inside(zone, margin=0.001))
    graphs.load(inside(zone, margin=0.002))

    assert len(reads) == 1
    # Reading a GraphML writes its pickle beside it (ADR-0023); nothing else.
    zone_file = source.cache_path(zone)
    assert sorted(p.name for p in tmp_path.iterdir()) == [
        zone_file.name,
        zone_file.with_suffix(".pickle").name,
    ]
