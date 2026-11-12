"""A job asks Overpass once (TASK-471, ADR-0385): after a download that
failed, the job's next load that needs a download fails at once with the
same error, in the job's thread and in a worker process; a load from the
cache goes on. No network: the zones here fail every download and count
them."""

from __future__ import annotations

import logging
import pickle
import time
from collections.abc import Callable, Iterator
from typing import Any

import pytest
import route_process_helpers as helpers
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import BBox, Graph
from route_engine.optimizer import GraphLoader, Plan

from shaperoute_api.graphs import MapDataUnavailableError
from shaperoute_api.jobs import Job, RouteJobs, _Reporting
from shaperoute_api.route_processes import RouteProcesses, _plan

REQUEST = RouteRequest(start=(46.0671, 11.1214), shape="heart", distance_m=5000)
RESULT = RouteResult(
    points=[(46.0671, 11.1214), (46.0680, 11.1220), (46.0671, 11.1214)],
    distance_m=5100.0,
    similarity=0.9,
    shape="heart",
)
# What the archive loads to reach a route kept nearby, and what the engine
# loads to draw one: two areas, neither covered by the other's zone.
ARCHIVE_AREA: BBox = (46.05, 11.10, 46.08, 11.14)
ENGINE_AREA: BBox = (46.04, 11.09, 46.09, 11.15)
# What route_process_helpers.loading loads in a worker.
WORKER_AREA: BBox = (46.0, 11.0, 46.1, 11.1)
# A spawned process imports the API: slower than a thread, most on CI.
WAIT_S = 120.0


class Zones:
    """Zones with Overpass down: every download fails, and is counted.
    Only `cached` is in the cache."""

    def __init__(self, cached: BBox | None = None) -> None:
        self.cached = cached
        self.downloads = 0

    def needs_download(self, bbox: BBox) -> bool:
        return bbox != self.cached

    def load(self, bbox: BBox) -> Graph:
        if bbox == self.cached:
            return Graph()
        self.downloads += 1
        raise MapDataUnavailableError("no Overpass")


class Archive:
    """A store with a route kept nearby (jobs.FindsNearby): it loads the
    area around it, whose zone is not in the cache, and lets the zone's
    error out, as route_archive.RouteArchive does."""

    def get(self, request: object) -> RouteResult | None:
        return None

    def put(self, request: object, result: RouteResult) -> bool:
        return True

    def nearby(
        self, request: object, source: GraphLoader, named_roads: object = None
    ) -> RouteResult | None:
        source.load(ARCHIVE_AREA)
        return None


class Planner:
    """The engine's first step: the graph of its area, then a route."""

    def __init__(self) -> None:
        self.calls = 0

    def __call__(self, request: RouteRequest, source: GraphLoader) -> Plan:
        self.calls += 1
        source.load(ENGINE_AREA)
        return Plan(result=RESULT, search=None)


class Pipe:
    """A worker's end of its pipe with nothing to read: what it sends."""

    def __init__(self) -> None:
        self.sent: list[Any] = []

    def send(self, message: Any) -> None:
        self.sent.append(message)

    def poll(self) -> bool:
        return False


@pytest.fixture
def made() -> Iterator[list[RouteJobs]]:
    """Every RouteJobs made in a test is shut down after it."""
    jobs: list[RouteJobs] = []
    yield jobs
    for each in jobs:
        each.shutdown()


def ended(jobs: RouteJobs, job_id: str, timeout: float = 5.0) -> Job:
    deadline = time.monotonic() + timeout
    while True:
        job = jobs.get(job_id)
        assert job is not None, "the job was forgotten"
        if job.status in ("done", "failed"):
            return job
        assert time.monotonic() < deadline, job.status
        time.sleep(0.01)


def test_a_download_that_failed_is_not_tried_again_by_the_engine(
    made: list[RouteJobs], caplog: pytest.LogCaptureFixture
) -> None:
    """The archive's download fails, then the engine needs one too: the job
    fails with the first error after one attempt, not two."""
    caplog.set_level(logging.INFO, logger="shaperoute_api.jobs")
    zones, planner = Zones(), Planner()
    jobs = RouteJobs(zones, planner, store=Archive())
    made.append(jobs)
    job = ended(jobs, jobs.submit(REQUEST).job_id)
    assert job.status == "failed" and job.error is not None
    assert job.error.code == "map_data_unavailable"
    assert job.error.message == "no Overpass"
    assert zones.downloads == 1
    assert planner.calls == 1  # asked, and stopped at its first load
    # One load in the job's times: the second took no time at all.
    assert " loads=1 " in caplog.text
    assert "not downloaded again" in caplog.text


def test_a_route_that_needs_no_download_is_still_drawn(
    made: list[RouteJobs],
) -> None:
    """The archive's download fails, but the engine's own zone is in the
    cache: the job goes on to its route."""
    zones, planner = Zones(cached=ENGINE_AREA), Planner()
    jobs = RouteJobs(zones, planner, store=Archive())
    made.append(jobs)
    job = ended(jobs, jobs.submit(REQUEST).job_id)
    assert job.status == "done" and job.result == RESULT
    assert zones.downloads == 1


def test_the_jobs_source_remembers_the_download_that_failed() -> None:
    zones = Zones(cached=ENGINE_AREA)
    told: list[str] = []
    source = _Reporting(zones, told.append, lambda: True)
    assert source.unavailable is None
    with pytest.raises(MapDataUnavailableError) as first:
        source.load(ARCHIVE_AREA)
    assert source.unavailable is first.value
    with pytest.raises(MapDataUnavailableError) as second:
        source.load(WORKER_AREA)
    assert second.value is first.value
    # One download tried and told to the app, not two; the cache still read.
    assert zones.downloads == 1 and told == ["downloading_map"]
    assert isinstance(source.load(ENGINE_AREA), Graph)


def test_a_worker_told_of_the_failed_download_tries_none() -> None:
    """What a worker process does with the job's failed download
    (route_processes._plan), without a process: its own zones are not
    asked, and the error goes back as it was."""
    zones, pipe = Zones(), Pipe()
    failed = MapDataUnavailableError("no Overpass")
    plan: Callable[..., Any] = _plan
    stop, (kind, seq, payload, times) = plan(
        pipe, zones, Planner(), 7, REQUEST, True, failed
    )
    assert (stop, kind, seq) == (False, "failed", 7)
    error = pickle.loads(payload)
    assert isinstance(error, MapDataUnavailableError) and str(error) == "no Overpass"
    assert zones.downloads == 0 and times.loads == 0
    assert pipe.sent == []  # no "downloading_map" either

    # Without one, the worker downloads as before.
    _, (kind, _, _, times) = plan(pipe, zones, Planner(), 8, REQUEST, True)
    assert kind == "failed" and zones.downloads == 1 and times.loads == 1


def test_the_failed_download_crosses_to_the_worker_process(
    made: list[RouteJobs],
) -> None:
    """The same with a real worker: its zone would download and the route
    would be drawn (route_process_helpers.slow_zone, loading); told of the
    download that failed in the job's thread, it does not try."""
    zones = Zones()
    processes = RouteProcesses(helpers.slow_zone, workers=1, planner=helpers.loading)
    try:
        jobs = RouteJobs(zones, processes, store=Archive())
        made.append(jobs)
        job = ended(jobs, jobs.submit(REQUEST).job_id, WAIT_S)
        assert job.status == "failed" and job.error is not None
        assert job.error.code == "map_data_unavailable"
        assert job.error.message == "no Overpass"
        assert zones.downloads == 1
    finally:
        processes.close()
