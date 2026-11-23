"""The foot zones kept warm in the route workers (TASK-464, ADR-0374): kept
up to a memory ceiling, counted, read ahead in the background, and the same
routes as before."""

from __future__ import annotations

import json
import shutil
import threading
from functools import partial
from pathlib import Path

import networkx as nx
import pytest
import route_process_helpers as helpers
from route_engine.models import RouteRequest
from route_engine.network import BBox, Graph

from shaperoute_api.activity_graphs import ActivityGraphs
from shaperoute_api.graphs import ZoneGraphs
from shaperoute_api.route_processes import RouteProcesses
from shaperoute_api.warm_zones import (
    MAX_WARM_ZONES,
    USAGE_FOLDER,
    WARM_ACTIVITY,
    ZONE_MB_PER_PICKLE_MB,
    ZONES_MB,
    WarmActivityGraphs,
    WarmZoneGraphs,
    ZonesConfigError,
    ZoneUsage,
    warm_graphs,
    zone_mb,
    zones_mb_from_env,
)


def grid(south: float, west: float, size: int = 6, step: float = 0.001) -> Graph:
    graph: Graph = nx.MultiDiGraph()
    for i in range(size):
        for j in range(size):
            graph.add_node((i, j), y=south + i * step, x=west + j * step)
            if j:
                graph.add_edge((i, j - 1), (i, j), length=80.0)
                graph.add_edge((i, j), (i, j - 1), length=80.0)
            if i:
                graph.add_edge((i - 1, j), (i, j), length=80.0)
                graph.add_edge((i, j), (i - 1, j), length=80.0)
    return graph


def box(n: int) -> BBox:
    """Zone n: a small square of its own."""
    south, west = 46.0 + n * 0.1, 11.0 + n * 0.1
    return (south, west, south + 0.009, west + 0.009)


def inside(bbox: BBox) -> BBox:
    south, west, north, east = bbox
    return (south + 0.002, west + 0.002, north - 0.002, east - 0.002)


class Cache:
    """Zones as files in a folder, each with the MB it takes in memory."""

    def __init__(self, folder: Path, sizes: dict[int, float]) -> None:
        self.folder = folder
        self.sizes = {self.path(n): mb for n, mb in sizes.items()}
        self.boxes = {self.path(n): box(n) for n in sizes}
        self.reads: list[str] = []
        self.gates: dict[str, threading.Event] = {}
        self.broken: set[str] = set()
        for path in self.sizes:
            path.write_text("zone")

    def path(self, n: int) -> Path:
        return self.folder / f"foot_{n}.graphml"

    def name(self, n: int) -> str:
        return self.path(n).name

    # ZoneSource
    def covering_path(self, bbox: BBox) -> Path | None:
        south, west, north, east = bbox
        for path, (s, w, n, e) in self.boxes.items():
            if path.exists() and s <= south and w <= west and n >= north and e >= east:
                return path
        return None

    def cache_path(self, bbox: BBox) -> Path:
        return self.folder / "never.graphml"

    def load(self, bbox: BBox) -> Graph:
        raise AssertionError("no download in these tests")

    # read and size_mb
    def read(self, path: Path) -> Graph:
        gate = self.gates.get(path.name)
        if gate is not None:
            gate.wait(5.0)
        self.reads.append(path.name)
        if path.name in self.broken:
            raise OSError("a broken pickle")
        south, west, _, _ = self.boxes[path]
        return grid(south, west)

    def size_mb(self, path: Path) -> float:
        return self.sizes[path]


def warm_zones(
    tmp_path: Path, sizes: dict[int, float], budget_mb: float, **kwargs: object
) -> tuple[WarmZoneGraphs, Cache, ZoneUsage]:
    cache = Cache(tmp_path, sizes)
    usage = ZoneUsage(tmp_path / USAGE_FOLDER / "running.json")
    graphs = WarmZoneGraphs(
        cache,
        tmp_path,
        usage,
        budget_mb=budget_mb,
        read=cache.read,
        size_mb=cache.size_mb,
        **kwargs,  # type: ignore[arg-type]
    )
    return graphs, cache, usage


# --- the ceiling ----------------------------------------------------------------


def test_the_ceiling_is_the_variable_or_a_prudent_default() -> None:
    assert zones_mb_from_env({}) == ZONES_MB
    assert zones_mb_from_env({"SHAPEROUTE_ZONES_MB": " "}) == ZONES_MB
    assert zones_mb_from_env({"SHAPEROUTE_ZONES_MB": "1200"}) == 1200
    for wrong in ("1.5 GB", "-1"):
        with pytest.raises(ZonesConfigError):
            zones_mb_from_env({"SHAPEROUTE_ZONES_MB": wrong})


def test_a_zone_in_memory_is_estimated_from_its_pickle(tmp_path: Path) -> None:
    graphml = tmp_path / "foot_1.graphml"
    assert zone_mb(graphml) == 0.0
    graphml.write_bytes(b"x" * 2_000_000)
    assert zone_mb(graphml) == pytest.approx(2 * 0.45 * ZONE_MB_PER_PICKLE_MB)
    graphml.with_suffix(".pickle").write_bytes(b"x" * 1_000_000)
    assert zone_mb(graphml) == pytest.approx(ZONE_MB_PER_PICKLE_MB)


def test_zones_are_kept_up_to_the_ceiling(tmp_path: Path) -> None:
    graphs, cache, _ = warm_zones(tmp_path, {n: 100.0 for n in range(5)}, 300.0)
    for n in (0, 1, 2, 0, 1, 2):
        graphs.load(inside(box(n)))
    assert cache.reads == [cache.name(0), cache.name(1), cache.name(2)]
    graphs.load(inside(box(3)))  # over the ceiling: the least recently used out
    assert graphs.kept == [cache.name(1), cache.name(2), cache.name(3)]


def test_two_zones_are_kept_whatever_their_size_as_before(tmp_path: Path) -> None:
    graphs, cache, _ = warm_zones(tmp_path, {0: 900.0, 1: 900.0, 2: 900.0}, 100.0)
    for n in (0, 1, 0, 1):
        graphs.load(inside(box(n)))
    assert cache.reads == [cache.name(0), cache.name(1)]
    graphs.load(inside(box(2)))
    assert graphs.kept == [cache.name(1), cache.name(2)]


def test_never_more_zones_than_the_most(tmp_path: Path) -> None:
    graphs, _, _ = warm_zones(
        tmp_path, {n: 1.0 for n in range(5)}, 10_000.0, max_zones=3
    )
    for n in range(5):
        graphs.load(inside(box(n)))
    assert len(graphs.kept) == 3
    assert MAX_WARM_ZONES >= 3


# --- the uses -------------------------------------------------------------------


def test_each_route_counts_a_use_of_its_zone(tmp_path: Path) -> None:
    graphs, cache, usage = warm_zones(tmp_path, {0: 1.0, 1: 1.0}, 100.0)
    for n in (1, 0, 1, 1):
        graphs.load(inside(box(n)))
    assert usage.most_used() == [cache.name(1), cache.name(0)]
    data = json.loads(usage.path.read_text())
    assert [(z["name"], z["uses"]) for z in data["zones"]] == [
        (cache.name(1), 3),
        (cache.name(0), 1),
    ]


def test_uses_as_many_rank_the_last_used_first(tmp_path: Path) -> None:
    ticks = iter(range(10))
    usage = ZoneUsage(tmp_path / "usage.json", clock=lambda: float(next(ticks)))
    for name in ("a", "b", "c", "b"):
        usage.note(name)
    assert usage.most_used() == ["b", "c", "a"]


def test_only_the_most_used_zones_are_counted(tmp_path: Path) -> None:
    usage = ZoneUsage(tmp_path / "usage.json", max_counted=2)
    for name in ("a", "a", "b", "c"):
        usage.note(name)
    assert usage.most_used() == ["a", "c"]


def test_two_workers_counting_at_once_lose_no_use(tmp_path: Path) -> None:
    path = tmp_path / "usage.json"
    workers = [ZoneUsage(path) for _ in range(4)]

    def count(usage: ZoneUsage) -> None:
        for _ in range(25):
            usage.note("trento")

    threads = [threading.Thread(target=count, args=(usage,)) for usage in workers]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    data = json.loads(path.read_text())
    assert data["zones"][0]["uses"] == 100
    assert sorted(p.name for p in tmp_path.iterdir()) == [
        "usage.json",
        "usage.json.lock",
    ]


@pytest.mark.parametrize(
    "text",
    [
        "",
        "{",
        "[]",
        '{"zones": 3}',
        '{"zones": [{"name": "../x", "uses": 2, "last": 1}]}',
    ],
)
def test_a_broken_file_only_warms_nothing(tmp_path: Path, text: str) -> None:
    graphs, cache, usage = warm_zones(tmp_path, {0: 1.0}, 100.0)
    usage.path.parent.mkdir(parents=True)
    usage.path.write_text(text)
    assert graphs.warm() == []
    graphs.load(inside(box(0)))  # the route is drawn, the file written again
    assert usage.most_used() == [cache.name(0)]


def test_a_file_that_cannot_be_written_never_fails_the_route(tmp_path: Path) -> None:
    graphs, _, usage = warm_zones(tmp_path, {0: 1.0}, 100.0)
    usage.path.parent.write_text("a file where the folder should be")
    assert len(graphs.load(inside(box(0)))) > 0
    assert usage.most_used() == []


# --- warming --------------------------------------------------------------------


def noted(usage: ZoneUsage, *names: str) -> None:
    for name in names:
        usage.note(name)


def test_the_most_used_zones_are_read_ahead_while_they_fit(tmp_path: Path) -> None:
    sizes = {0: 100.0, 1: 250.0, 2: 100.0, 3: 100.0}
    graphs, cache, usage = warm_zones(tmp_path, sizes, 300.0)
    # The most used first: 0, 2, then 1, too big beside them, then 3.
    noted(usage, *[cache.name(0)] * 4, *[cache.name(2)] * 3, *[cache.name(1)] * 2)
    noted(usage, cache.name(3))
    assert graphs.warm() == [cache.name(0), cache.name(2), cache.name(3)]
    reads = list(cache.reads)
    for n in (0, 2, 3):
        graphs.load(inside(box(n)))
    assert cache.reads == reads  # all from memory


def test_zones_gone_from_the_cache_or_unreadable_are_passed_over(
    tmp_path: Path,
) -> None:
    graphs, cache, usage = warm_zones(tmp_path, {0: 1.0, 1: 1.0, 2: 1.0}, 100.0)
    noted(usage, cache.name(0), cache.name(1), cache.name(2), "foot_9.graphml")
    cache.path(1).unlink()
    cache.broken.add(cache.name(2))
    assert graphs.warm() == [cache.name(0)]
    assert graphs.kept == [cache.name(0)]


def test_a_routes_zone_outlives_the_zones_read_ahead(tmp_path: Path) -> None:
    graphs, cache, usage = warm_zones(tmp_path, {n: 100.0 for n in range(4)}, 200.0)
    noted(usage, cache.name(0), cache.name(0), cache.name(1))
    graphs.load(inside(box(2)))  # a route, while the worker starts
    assert graphs.warm() == [cache.name(0)]  # 1 no longer fits
    assert graphs.kept == [cache.name(0), cache.name(2)]
    graphs.load(inside(box(3)))  # over the ceiling: the zone read ahead goes
    assert graphs.kept == [cache.name(2), cache.name(3)]


def test_the_worker_answers_while_its_zones_are_read_ahead(tmp_path: Path) -> None:
    graphs, cache, usage = warm_zones(tmp_path, {0: 1.0, 1: 1.0}, 100.0)
    noted(usage, cache.name(0))
    gate = cache.gates[cache.name(0)] = threading.Event()
    thread = graphs.warm_in_background()  # stuck reading zone 0
    assert thread.is_alive()
    assert len(graphs.load(inside(box(1)))) > 0  # a route meanwhile
    waiting: list[Graph] = []
    route = threading.Thread(target=lambda: waiting.append(graphs.load(inside(box(0)))))
    route.start()
    gate.set()
    thread.join(5.0)
    route.join(5.0)
    assert waiting and len(waiting[0]) > 0
    # The route on zone 0 waited for it to be read ahead: read once.
    assert cache.reads == [cache.name(1), cache.name(0)]


# --- the same routes ----------------------------------------------------------------

LEVICO_ZONE = "foot_45.90000_11.20000_46.10000_11.40000.graphml"
LEVICO_BBOX: BBox = (46.009, 11.294, 46.015, 11.303)


def levico_cache(folder: Path) -> Path:
    folder.mkdir()
    shutil.copy(helpers.LEVICO_GRAPH, folder / LEVICO_ZONE)
    return folder


def edges(graph: Graph) -> list[object]:
    return list(graph.edges(keys=True, data=True))


def test_the_foot_zone_is_the_one_from_cache_gives(tmp_path: Path) -> None:
    """The same zone file (covering_path), read and cropped the same way:
    the same graph, read from disk, from memory or read ahead."""
    cache = levico_cache(tmp_path / "cache")
    before = ActivityGraphs.from_cache(cache).for_activity("running").load(LEVICO_BBOX)
    graphs = warm_graphs(cache, in_background=False)
    assert isinstance(graphs, WarmActivityGraphs)
    for activity in ("running", "walking"):
        assert graphs.for_activity(activity) is graphs.warm
    from_disk = graphs.for_activity("running").load(LEVICO_BBOX)
    from_memory = graphs.for_activity("walking").load(LEVICO_BBOX)
    ahead = warm_graphs(cache, in_background=False)
    assert ahead.warm.warm() == [LEVICO_ZONE]
    read_ahead = ahead.for_activity("running").load(LEVICO_BBOX)
    for graph in (from_disk, from_memory, read_ahead):
        assert list(graph.nodes(data=True)) == list(before.nodes(data=True))
        assert edges(graph) == edges(before)
        assert graph.graph == before.graph


def test_the_other_activities_keep_their_zones(tmp_path: Path) -> None:
    cache = levico_cache(tmp_path / "cache")
    graphs = warm_graphs(cache, in_background=False)
    cycling = graphs.for_activity("cycling")
    assert isinstance(cycling, ZoneGraphs) and not isinstance(cycling, WarmZoneGraphs)
    assert graphs.water is not None and graphs.snow is not None


@pytest.fixture
def processes() -> list[RouteProcesses]:
    made: list[RouteProcesses] = []
    yield made  # type: ignore[misc]
    for each in made:
        each.close()


def test_a_worker_draws_the_same_route_with_its_zones_warm(
    tmp_path: Path, processes: list[RouteProcesses]
) -> None:
    """The planner of the API (images.plan_request) in a route worker, on
    the zones of before and on the warm ones: the same plan, bit for bit."""
    cache = levico_cache(tmp_path / "cache")
    usage = ZoneUsage(cache / USAGE_FOLDER / f"{WARM_ACTIVITY}.json")
    usage.note(LEVICO_ZONE)  # so the warm worker reads it ahead
    request = RouteRequest(start=helpers.LEVICO, shape="circle", distance_m=1000)
    before = RouteProcesses(partial(ActivityGraphs.from_cache, cache), workers=1)
    warm = RouteProcesses(partial(warm_graphs, cache, ZONES_MB), workers=1)
    processes.extend([before, warm])
    theirs = before(request, helpers.levico())
    ours = warm(request, helpers.levico())
    assert ours.result.points and ours.result == theirs.result
    assert ours.alternatives == theirs.alternatives


# --- the API's start ------------------------------------------------------------


class FakeProcesses:
    made: list[FakeProcesses] = []

    def __init__(self, graphs: object, workers: int) -> None:
        self.graphs = graphs
        FakeProcesses.made.append(self)

    def start(self) -> None:
        pass

    def close(self) -> None:
        pass


def test_the_api_gives_its_workers_the_warm_zones_and_the_ceiling(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from shaperoute_api import __main__ as entry

    monkeypatch.setattr(entry.uvicorn, "run", lambda app, host, port: None)
    monkeypatch.setattr(entry, "RouteProcesses", FakeProcesses)
    monkeypatch.setenv("SHAPEROUTE_ZONES_MB", "700")
    FakeProcesses.made.clear()
    entry.main(["--cache-dir", str(tmp_path)])
    (processes,) = FakeProcesses.made
    factory = processes.graphs
    assert isinstance(factory, partial)
    assert factory.func is warm_graphs and factory.args == (tmp_path, 700)
    monkeypatch.setenv("SHAPEROUTE_ZONES_MB", "a lot")
    with pytest.raises(SystemExit, match="SHAPEROUTE_ZONES_MB"):
        entry.main(["--cache-dir", str(tmp_path)])
