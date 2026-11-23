"""The API's routes planned in worker processes kept warm (TASK-276 part B,
ADR-0242): the same routes as in the API's threads, two at once, the job's
status, cancel and errors as before, a time limit, and no process left."""

from __future__ import annotations

import os
import threading
import time
from collections.abc import Callable, Iterator
from dataclasses import replace
from typing import Any

import pytest
import route_process_helpers as helpers
from route_engine.models import RouteRequest

from shaperoute_api.images import plan_request
from shaperoute_api.jobs import Job, RouteJobs
from shaperoute_api.route_processes import RouteProcesses, RouteTimedOut, WorkerDied

# Spawned processes import the API: slower than a thread, most on CI.
WAIT_S = 120.0


def wait_for(jobs: RouteJobs, job_id: str, timeout: float = WAIT_S) -> Job:
    deadline = time.monotonic() + timeout
    while True:
        job = jobs.get(job_id)
        assert job is not None, "the job was forgotten"
        if job.status in ("done", "failed"):
            return job
        assert time.monotonic() < deadline, job.status
        time.sleep(0.05)


@pytest.fixture
def made() -> Iterator[Callable[..., RouteProcesses]]:
    """RouteProcesses, each closed after the test."""
    made: list[RouteProcesses] = []
    jobs: list[RouteJobs] = []

    def make(*args: Any, **kwargs: Any) -> RouteProcesses:
        processes = RouteProcesses(*args, **kwargs)
        made.append(processes)
        return processes

    make.jobs = jobs  # type: ignore[attr-defined]
    yield make
    for each in jobs:
        each.shutdown()
    for processes in made:
        processes.close()


def route_jobs(make: Any, source: Any, planner: Any) -> RouteJobs:
    jobs = RouteJobs(source, planner)
    make.jobs.append(jobs)
    return jobs


LEVICO_REQUESTS = [
    RouteRequest(start=helpers.LEVICO, shape="circle", distance_m=1000),
    RouteRequest(start=helpers.LEVICO, shape="heart", distance_m=1000),
    RouteRequest(start=helpers.LEVICO, shape="star", distance_m=1000),
]


def test_the_routes_are_those_of_the_api_threads(made: Any) -> None:
    """Constraint 3 of the task: the same request, the same job's answer,
    directions, alternatives and placed drawing included, whether its plan
    is drawn in the job's thread or in a worker."""
    here = route_jobs(made, helpers.levico(), plan_request)
    there = route_jobs(made, helpers.levico(), made(helpers.levico, workers=1))
    for request in LEVICO_REQUESTS:
        mine = wait_for(here, here.submit(request).job_id)
        theirs = wait_for(there, there.submit(request).job_id)
        assert theirs.status == mine.status, request.shape
        assert theirs.error == mine.error, request.shape
        assert theirs.result == mine.result, request.shape
        assert theirs.placed == mine.placed, request.shape
        if request.shape == "circle":  # drawn there, with its directions
            assert theirs.result is not None and theirs.result.directions


def test_post_routes_gets_the_plan_without_directions_as_before(made: Any) -> None:
    """POST /routes gives the planner the zones, not a job's graphs: no
    directions are added, as plan_request gives none; the route is the
    job's. (Both drawn in a worker: on macOS the nearby starts of a plan
    drawn here, after the threads of another test ended, die at once.)"""
    processes = made(helpers.levico, workers=1)
    request = LEVICO_REQUESTS[0]
    plain = processes(request, helpers.levico())
    jobs = route_jobs(made, helpers.levico(), processes)
    job = wait_for(jobs, jobs.submit(request).job_id)
    assert job.result is not None and job.result.directions
    assert plain.result.directions == []
    assert replace(plain.result, directions=job.result.directions) == replace(
        job.result, alternatives=[]
    )
    assert len(plain.alternatives) == len(job.result.alternatives)


def test_two_routes_are_drawn_at_once_in_two_processes(made: Any) -> None:
    processes = made(helpers.nothing, workers=2, planner=helpers.where)
    request = RouteRequest(start=(46.0, 11.0), shape="circle", distance_m=1000)
    pids: list[float] = []

    def draw() -> None:
        pids.append(processes(request, object()).result.distance_m)  # type: ignore[arg-type]

    processes.start()
    threads = [threading.Thread(target=draw) for _ in range(2)]
    began = time.monotonic()
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(WAIT_S)
    assert len(set(pids)) == 2
    assert float(os.getpid()) not in pids
    assert time.monotonic() - began < 0.5 * 2 + 0.4  # side by side, not in turn


def test_a_zone_to_download_shows_downloading_map(made: Any) -> None:
    jobs = route_jobs(
        made,
        helpers.slow_zone(),
        made(helpers.slow_zone, workers=1, planner=helpers.loading),
    )
    job_id = jobs.submit(LEVICO_REQUESTS[0]).job_id
    seen: set[str] = set()
    deadline = time.monotonic() + WAIT_S
    while True:
        job = jobs.get(job_id)
        assert job is not None
        seen.add(job.status)
        if job.status == "done":
            break
        assert time.monotonic() < deadline, seen
        time.sleep(0.02)
    assert "downloading_map" in seen


def test_a_job_cancelled_while_loading_is_dropped_and_the_worker_goes_on(
    made: Any,
) -> None:
    processes = made(helpers.slow_zone, workers=1, planner=helpers.loading)
    processes.start()
    jobs = route_jobs(made, helpers.slow_zone(), processes)
    first = jobs.submit(
        RouteRequest(start=(46.0, 11.0), shape="circle", distance_m=2000)
    )
    deadline = time.monotonic() + WAIT_S
    while (job := jobs.get(first.job_id)) is not None and job.status == "queued":
        assert time.monotonic() < deadline
        time.sleep(0.01)
    assert jobs.cancel(first.job_id)
    # The cancel stays with its route: the next one, on the same worker, is
    # not dropped by it.
    second = jobs.submit(
        RouteRequest(start=(46.0, 11.0), shape="circle", distance_m=3000)
    )
    done = wait_for(jobs, second.job_id)
    assert done.status == "done"
    assert done.result is not None and done.result.distance_m == 3000.0
    assert processes.alive == 1


def test_the_planner_errors_cross_whole(made: Any) -> None:
    jobs = route_jobs(
        made, helpers.levico(), made(helpers.nothing, planner=helpers.not_drawable)
    )
    job = wait_for(jobs, jobs.submit(LEVICO_REQUESTS[0]).job_id)
    assert job.status == "failed"
    assert job.error is not None
    assert job.error.code == "shape_not_drawable"
    assert job.error.suggested_distance_m == 3000


def test_an_error_that_does_not_pickle_is_an_engine_error(made: Any) -> None:
    jobs = route_jobs(
        made, helpers.levico(), made(helpers.nothing, planner=helpers.unpicklable)
    )
    job = wait_for(jobs, jobs.submit(LEVICO_REQUESTS[0]).job_id)
    assert job.error is not None and job.error.code == "engine_error"


def test_a_route_over_the_limit_kills_its_worker(made: Any) -> None:
    processes = made(
        helpers.nothing, workers=1, planner=helpers.sleeping, max_job_s=1.0
    )
    processes.start()
    with pytest.raises(RouteTimedOut):
        processes(LEVICO_REQUESTS[0], object())  # type: ignore[arg-type]
    assert processes.alive == 0
    jobs = route_jobs(made, helpers.levico(), processes)
    job = wait_for(jobs, jobs.submit(LEVICO_REQUESTS[0]).job_id)
    assert job.error is not None and job.error.code == "engine_error"


def test_a_worker_that_dies_fails_its_route_and_the_next_gets_a_new_one(
    made: Any,
) -> None:
    processes = made(helpers.nothing, workers=1, planner=helpers.dying)
    with pytest.raises(WorkerDied):
        processes(LEVICO_REQUESTS[0], object())  # type: ignore[arg-type]
    request = RouteRequest(start=(46.0, 11.0), shape="circle", distance_m=2000)
    plan = processes(request, object())  # type: ignore[arg-type]
    assert plan.result.distance_m == 2000.0
    assert processes.alive == 1


def test_close_stops_every_worker(made: Any) -> None:
    processes = made(helpers.nothing, workers=2, planner=helpers.answering)
    processes.start()
    assert processes.alive == 2
    processes.close()
    assert processes.alive == 0
    with pytest.raises(WorkerDied):
        processes(LEVICO_REQUESTS[0], object())  # type: ignore[arg-type]
