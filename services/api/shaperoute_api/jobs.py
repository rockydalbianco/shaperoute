"""Route jobs: the request is answered at once, the route is computed in the
background and asked for until it is ready (ADR-0032).

A 15 km route or a zone to download takes longer than a phone waits for one
HTTP answer (TASK-023). Jobs live in memory, in this process: restarting the
API loses them, which is fine while it runs on the development PC.
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, replace
from typing import Protocol, runtime_checkable

from route_engine.directions import guidance
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import BBox, Graph
from route_engine.optimizer import GraphLoader, Plan

from shaperoute_api.errors import error_of
from shaperoute_api.schemas import ErrorDetail, JobStatus

log = logging.getLogger(__name__)

Planner = Callable[[RouteRequest, GraphLoader], Plan]

# Two, not one: a cancelled 15 km keeps its thread until the engine ends,
# and the next request must not wait behind it.
WORKERS = 2
# A finished job is kept this long for the app to collect, then forgotten.
KEEP_S = 600.0


@runtime_checkable
class KnowsDownloads(Protocol):
    """A graph source that can tell a download in advance (ZoneGraphs)."""

    def needs_download(self, bbox: BBox) -> bool: ...


class _Dropped(Exception):
    """The job was cancelled while its graph was loading: stop before the
    engine starts computing."""


@dataclass
class Job:
    job_id: str
    request: RouteRequest
    status: JobStatus = "queued"
    result: RouteResult | None = None
    error: ErrorDetail | None = None
    finished_at: float | None = None


class RouteJobs:
    def __init__(
        self,
        source: GraphLoader,
        planner: Planner,
        workers: int = WORKERS,
        keep_s: float = KEEP_S,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._source = source
        self._planner = planner
        self._keep_s = keep_s
        self._clock = clock
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._pool = ThreadPoolExecutor(workers, thread_name_prefix="route-job")

    def submit(self, request: RouteRequest) -> Job:
        job = Job(job_id=uuid.uuid4().hex[:12], request=request)
        with self._lock:
            self._forget_old()
            self._jobs[job.job_id] = job
            snapshot = replace(job)
        log.info(
            "job %s: %s %d m queued", job.job_id, request.name, request.distance_m
        )
        self._pool.submit(self._run, job)
        return snapshot

    def get(self, job_id: str) -> Job | None:
        """A copy of the job, or None if unknown, cancelled or forgotten."""
        with self._lock:
            self._forget_old()
            job = self._jobs.get(job_id)
            return None if job is None else replace(job)

    def cancel(self, job_id: str) -> bool:
        """Forgets the job. A queued one never starts; a running one ends in
        its thread, and its result is dropped."""
        with self._lock:
            job = self._jobs.pop(job_id, None)
        if job is not None:
            log.info("job %s: cancelled while %s", job_id, job.status)
        return job is not None

    def shutdown(self) -> None:
        self._pool.shutdown(wait=False, cancel_futures=True)

    def _run(self, job: Job) -> None:
        if not self._set(job, status="computing"):
            return
        started = self._clock()
        source = _Reporting(
            self._source,
            lambda status: self._set(job, status),
            lambda: self._wanted(job),
        )
        try:
            plan = self._planner(job.request, source)
            result = with_directions(plan, source.graphs)
        except _Dropped:
            log.info("job %s: dropped before computing", job.job_id)
            return
        except Exception as exc:
            _, error = error_of(exc)
            if error.code == "engine_error":
                log.exception("job %s: the engine failed", job.job_id, exc_info=exc)
            self._set(job, status="failed", error=error)
            log.info(
                "job %s: %s after %.1f s",
                job.job_id,
                error.code,
                self._clock() - started,
            )
            return
        self._set(job, status="done", result=result)
        log.info(
            "job %s: %.0f m on roads, similarity %.2f, in %.1f s",
            job.job_id,
            result.distance_m,
            result.similarity,
            self._clock() - started,
        )

    def _set(
        self,
        job: Job,
        status: JobStatus,
        result: RouteResult | None = None,
        error: ErrorDetail | None = None,
    ) -> bool:
        """Updates the job; False if it was cancelled in the meantime."""
        with self._lock:
            if job.job_id not in self._jobs:
                return False
            job.status, job.result, job.error = status, result, error
            if status in ("done", "failed"):
                job.finished_at = self._clock()
            return True

    def _wanted(self, job: Job) -> bool:
        with self._lock:
            return job.job_id in self._jobs

    def _forget_old(self) -> None:
        now = self._clock()
        for job_id in [
            job.job_id
            for job in self._jobs.values()
            if job.finished_at is not None and now - job.finished_at > self._keep_s
        ]:
            del self._jobs[job_id]


class _Reporting:
    """The job's graph source: says when a download starts and ends, and
    stops the job if it was cancelled meanwhile. The engine loads its graph
    before computing, so a cancelled job spares the computing; when the
    shape does not fit near the start it loads a larger one and computes
    again (ADR-0040), and a download then shows between two computings."""

    def __init__(
        self,
        source: GraphLoader,
        report: Callable[[JobStatus], object],
        wanted: Callable[[], bool],
    ):
        self._source = source
        self._report = report
        self._wanted = wanted
        self.graphs: list[Graph] = []  # as loaded, for the directions

    def load(self, bbox: BBox) -> Graph:
        downloading = isinstance(self._source, KnowsDownloads) and (
            self._source.needs_download(bbox)
        )
        if downloading:
            self._report("downloading_map")
        graph = self._source.load(bbox)
        if not self._wanted():
            raise _Dropped
        if downloading:
            self._report("computing")
        self.graphs.append(graph)
        return graph


def with_directions(plan: Plan, graphs: list[Graph]) -> RouteResult:
    """The plan's result with its directions (TASK-048), computed on the
    graph the route was traced on: the last one loaded when the route comes
    from the search farther away (ADR-0040), else the first. A route that
    was not searched has no nodes, and no directions."""
    if plan.search is None or not graphs:
        return plan.result
    graph = (
        graphs[-1] if plan.far is not None and plan.search is plan.far else graphs[0]
    )
    return replace(
        plan.result, directions=guidance(graph, plan.search.best.route.nodes)
    )
