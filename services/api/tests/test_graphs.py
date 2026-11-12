"""ZoneGraphs: zones read once and kept in memory, crops never saved."""

from __future__ import annotations

import gc
import math
import shutil
import threading
from pathlib import Path

import networkx as nx
import pytest
from route_engine.network import (
    BBox,
    FileSource,
    Graph,
    OsmnxSource,
    crop,
    read_graph,
)

from shaperoute_api.graphs import MapDataUnavailableError, ZoneGraphs, _gc_paused

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


def test_the_crop_is_the_one_network_crop_gives() -> None:
    # Same nodes and edges in the same order (ADR-0082): test_zone_crop.py
    # of the engine checks it in full.
    source = FakeSource([ZONE_A])
    graphs = ZoneGraphs(source, read=CountingReader(source))
    for margin in (0.001, 0.002, 0.003):
        bbox = inside(ZONE_A, margin)
        expected = crop(grid(*ZONE_A[:2]), bbox)
        graph = graphs.load(bbox)
        assert list(graph.nodes(data=True)) == list(expected.nodes(data=True))
        assert list(graph.edges(keys=True, data=True)) == list(
            expected.edges(keys=True, data=True)
        )


def test_what_the_engine_adds_to_a_graph_is_not_in_the_next_one() -> None:
    source = FakeSource([ZONE_A])
    graphs = ZoneGraphs(source, read=CountingReader(source))
    bbox = inside(ZONE_A)
    first = graphs.load(bbox)
    nodes, edges = len(first), first.number_of_edges()
    first.add_node(("zone-sink",))
    first.add_edge((3, 3), ("zone-sink",))
    first.nodes[(3, 3)]["y"] = 0.0
    first[(3, 3)][(3, 4)][0]["length"] = 1.0
    second = graphs.load(bbox)
    assert ("zone-sink",) not in second
    assert (len(second), second.number_of_edges()) == (nodes, edges)
    assert second.nodes[(3, 3)]["y"] != 0.0
    assert second[(3, 3)][(3, 4)][0]["length"] == 80.0


def test_requests_at_the_same_time_get_the_same_crop_each_its_own() -> None:
    source = FakeSource([ZONE_A])
    graphs = ZoneGraphs(source, read=CountingReader(source))
    bbox = inside(ZONE_A)
    expected = list(graphs.load(bbox).edges(keys=True, data=True))
    loaded: list[Graph] = []

    def load() -> None:
        graph = graphs.load(bbox)
        graph.add_edge((3, 3), ("zone-sink",))  # as the engine does
        loaded.append(graph)
        graph.remove_node(("zone-sink",))

    threads = [threading.Thread(target=load) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(5)
    assert len({id(graph) for graph in loaded}) == 8
    for graph in loaded:
        assert list(graph.edges(keys=True, data=True)) == expected


def test_garbage_collection_is_back_on_after_a_crop() -> None:
    source = FakeSource([ZONE_A])
    graphs = ZoneGraphs(source, read=CountingReader(source))
    assert gc.isenabled()
    graphs.load(inside(ZONE_A))
    assert gc.isenabled()
    with _gc_paused():
        assert not gc.isenabled()
        with _gc_paused():  # two crops at once
            assert not gc.isenabled()
        assert not gc.isenabled()
    assert gc.isenabled()


def test_garbage_collection_stays_off_if_it_was_off() -> None:
    gc.disable()
    try:
        with _gc_paused():
            pass
        assert not gc.isenabled()
    finally:
        gc.enable()


def test_garbage_collection_is_back_on_after_a_failed_crop() -> None:
    source = FakeSource([ZONE_A])
    graphs = ZoneGraphs(source, read=CountingReader(source))
    with pytest.raises(ValueError):
        graphs.load((46.0001, 11.0001, 46.0002, 11.0002))  # no node inside
    assert gc.isenabled()


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


def test_needs_download_says_whether_a_zone_is_cached() -> None:
    graphs = ZoneGraphs(FakeSource([ZONE_A]))
    assert not graphs.needs_download(inside(ZONE_A))
    assert graphs.needs_download(inside(ZONE_B))


def test_a_download_does_not_hold_up_a_zone_in_memory() -> None:
    class SlowDownload(FakeSource):
        def __init__(self) -> None:
            super().__init__([ZONE_A], download=grid(*ZONE_B[:2]))
            self.started = threading.Event()
            self.release = threading.Event()

        def load(self, bbox: BBox) -> Graph:
            self.started.set()
            self.release.wait(5)
            return super().load(bbox)

    source = SlowDownload()
    graphs = ZoneGraphs(source, read=CountingReader(source))
    graphs.load(inside(ZONE_A))

    downloading = threading.Thread(target=graphs.load, args=(ZONE_B,))
    downloading.start()
    assert source.started.wait(5)
    # Zone A answers while zone B is still downloading.
    answered = threading.Event()
    threading.Thread(
        target=lambda: (graphs.load(inside(ZONE_A)), answered.set())
    ).start()
    assert answered.wait(5)
    source.release.set()
    downloading.join(5)


def test_a_download_does_not_wait_osmnx_minute_for_a_silent_status(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A zone downloaded for a route someone is waiting for (TASK-471,
    ADR-0385): when Overpass's status page says nothing usable, OSMnx
    would wait a minute before the request; inside ZoneGraphs' download it
    waits five seconds, and its minute is back afterwards. No network: the
    status page is a fake answer, the wait is asked as OSMnx asks it."""
    import osmnx._overpass as overpass

    class Page:
        text = "# 502 Gateway Timeout\n\nThis server is at capacity.\n"

    monkeypatch.setattr(overpass.requests, "get", lambda url, **kwargs: Page())

    def osmnx_wait() -> float:
        return float(overpass._get_overpass_pause("https://overpass.example/api"))

    class Waiting(FakeSource):
        waited: float | None = None

        def load(self, bbox: BBox) -> Graph:
            self.waited = osmnx_wait()
            return super().load(bbox)

    source = Waiting([], download=grid(46.0, 11.0))
    graphs = ZoneGraphs(source, read=CountingReader(source))
    assert osmnx_wait() == 60
    graphs.load(inside(ZONE_A))
    assert source.downloads == 1 and source.waited == 5.0
    assert osmnx_wait() == 60


def test_an_error_of_overpass_is_tried_once_on_the_servers_second_service(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With a second Overpass service set on the server (TASK-471,
    ADR-0385) a zone's download that Overpass answers with an error is
    tried once more, there; with none set, once, as before."""
    import osmnx as ox
    from osmnx._errors import ResponseStatusCodeError

    from shaperoute_api.overpass_fallback import FALLBACK_VARIABLE

    class Busy(FakeSource):
        """Overpass answers 502 at its usual address only."""

        def __init__(self) -> None:
            super().__init__([], download=grid(46.0, 11.0))
            self.usual = ox.settings.overpass_url
            self.asked: list[str] = []

        def load(self, bbox: BBox) -> Graph:
            self.asked.append(ox.settings.overpass_url)
            if ox.settings.overpass_url == self.usual:
                self.downloads += 1
                raise ResponseStatusCodeError("502 Bad Gateway")
            return super().load(bbox)

    monkeypatch.delenv(FALLBACK_VARIABLE, raising=False)
    source = Busy()
    with pytest.raises(MapDataUnavailableError, match="502 Bad Gateway"):
        ZoneGraphs(source, read=CountingReader(source)).load(inside(ZONE_A))
    assert source.asked == [source.usual]

    monkeypatch.setenv(FALLBACK_VARIABLE, "https://overpass.example/api")
    source = Busy()
    graph = ZoneGraphs(source, read=CountingReader(source)).load(inside(ZONE_A))
    assert len(graph) > 0
    assert source.asked == [source.usual, "https://overpass.example/api"]
    assert ox.settings.overpass_url == source.usual


def test_the_error_says_why_in_a_line_not_with_overpass_whole_page() -> None:
    page = (
        "'overpass-api.de' responded: 502 Bad Gateway # 502 Gateway Timeout\n\n"
        "This Overpass API server is currently at capacity.\n\n## What to do\n"
    )
    source = FakeSource([], download=ValueError(page))
    with pytest.raises(MapDataUnavailableError) as raised:
        ZoneGraphs(source, read=CountingReader(source)).load(inside(ZONE_A))
    assert str(raised.value) == (
        "OpenStreetMap data for this area could not be downloaded: "
        "'overpass-api.de' responded: 502 Bad Gateway # 502 Gateway Timeout"
    )
    # An error that says nothing is named; a long line is cut.
    for failure, reason in [(OSError(), "OSError"), (ValueError("x" * 500), "x" * 200)]:
        source = FakeSource([], download=failure)
        with pytest.raises(MapDataUnavailableError) as raised:
            ZoneGraphs(source, read=CountingReader(source)).load(inside(ZONE_A))
        assert str(raised.value).endswith(f"downloaded: {reason}")
