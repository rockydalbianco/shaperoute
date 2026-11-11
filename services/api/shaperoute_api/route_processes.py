"""The API's planner in worker processes kept warm (TASK-276 part B,
ADR-0242).

Measured on the server (TASK-276 part A): the route jobs ran in two threads
of the API's one process, and the engine's own work held the GIL. The two
threads drew one route at a time, on about one core of four, and each
route cost more with the other thread waiting on it. Here each route is
planned in a process of its own, kept running between routes with its
zones in memory: two routes are drawn at once, each on a core of its own.

`RouteProcesses` is a planner (jobs.Planner): `create_app(planner=...)`.
RouteJobs, its queue, its archive and its threads stay as they are; a job's
thread hands the request to a worker and waits for the plan. The worker
plans it with the same planner (images.plan_request), on the same zones
(ActivityGraphs.from_cache of the same folder), through the same
jobs._Reporting: the routes are the same, bit for bit (the tests compare
them). Because the zones are the worker's, so are a job's directions: they
come back already on the plan and on each alternative, and the job's
thread, which loaded no graph, leaves them as they are (jobs.with_choices).

What crosses from the worker: the job's status (a zone to download), the
plan from the user's own start as soon as it is there, with its directions
(TASK-435: the job shows it while the nearby starts are still planned), its
times, and the plan, an error or "dropped". What crosses to it: the
request, and a cancel when the app forgot the job meanwhile, which the
worker checks where the job's thread checked it, after each load.

Never closed half-way through a route as a Pool can hang (TASK-248,
ADR-0212): one process per worker, started by hand. A route has at most
MAX_JOB_S; past it the worker and its nearby-start children (its own
process group) are killed and the route fails as an engine error; the next
route starts a new worker. A worker that dies fails its route the same way.

How many: WORKERS, from the memory measured, not only from the cores. A
worker with the zones of Trento and Milan in memory took 893 MB, its
nearby-start children up to about 400 MB each, three per route at most and
only as many as fit in the free memory (nearby_starts.workers_that_fit);
the server had 5.6 GB free beside the API and PostgreSQL. Two workers use
the two cores the job threads cannot, and leave the other two to the
nearby starts, which already took about 1.4 cores: a third worker would
take cores from them and not draw more routes.
"""

from __future__ import annotations

import atexit
import logging
import multiprocessing
import multiprocessing.forkserver
import os
import pickle
import queue
import signal
import threading
import time
from collections.abc import Callable
from dataclasses import replace
from multiprocessing.connection import Connection
from multiprocessing.process import BaseProcess
from typing import Any

from route_engine.models import SNOW_ACTIVITIES, WATER_ACTIVITIES
from route_engine.network import Graph
from route_engine.optimizer import Plan

from shaperoute_api.activity_graphs import (
    Graphs,
    Ground,
    snow_for,
    source_for,
    water_for,
)
from shaperoute_api.alongs import NamedRoads
from shaperoute_api.images import AnyRequest, plan_request
from shaperoute_api.job_times import JobTimes
from shaperoute_api.jobs import (
    KnowsNames,
    Planner,
    _Dropped,
    _Reporting,
    _ReportingSnow,
    _ReportingWater,
    with_directions,
)

log = logging.getLogger(__name__)

# Two workers: see the module's docstring.
WORKERS = 2
# The longest a route may take, a zone downloaded from Overpass included
# (a large zone took about 80 s on the server, a 15 km route about 20 s).
MAX_JOB_S = 600.0
# How often a job's thread looks at its worker: a cancel, the time, a death.
POLL_S = 0.2
# How long a worker has to stop by itself when the API ends.
STOP_S = 5.0

# Workers forked by the fork server, a clean process started with the first
# RouteProcesses (the API's start), not by the API itself. On macOS a
# process started by the API after a zone was read in a thread that has
# ended dies before it runs (SIGSEGV between fork and exec, with osmnx's
# GraphML read); forked by the fork server it starts. Linux does not care.
START_METHOD = "forkserver"

# What makes a worker's zones: called in the worker, so it must pickle.
GraphsFactory = Callable[[], Graphs]


class WorkerDied(RuntimeError):
    """The worker process ended before answering: an engine error."""


class RouteTimedOut(RuntimeError):
    """The route took longer than MAX_JOB_S: an engine error."""


class RouteProcesses:
    """A planner that plans each route in one of `workers` processes (see
    the module's docstring). Thread-safe: each job's thread takes a worker
    that is free, or waits for one."""

    def __init__(
        self,
        graphs: GraphsFactory,
        workers: int = WORKERS,
        planner: Planner = plan_request,
        max_job_s: float = MAX_JOB_S,
    ) -> None:
        if workers < 1:
            raise ValueError("at least one worker")
        self._graphs = graphs
        self._workers = workers
        self._planner = planner
        self._max_job_s = max_job_s
        self._free: queue.LifoQueue[_Worker] = queue.LifoQueue()
        self._lock = threading.Lock()
        self._alive: list[_Worker] = []
        self._closed = False
        self._seq = 0
        # The fork server now, before any zone is read (START_METHOD).
        multiprocessing.forkserver.ensure_running()
        # Before multiprocessing's own exit handler, which waits for every
        # process that is not a daemon: a worker that was never told to
        # stop would make the API wait for ever.
        atexit.register(self.close)

    def start(self) -> None:
        """Every worker started now, not at its first route: the API's
        imports are then done before anyone asks."""
        while True:
            with self._lock:
                if self._closed or len(self._alive) >= self._workers:
                    return
                worker = self._new_worker()
            self._free.put(worker)

    def __call__(self, request: AnyRequest, ground: Ground) -> Plan:
        """The plan of `request`, drawn in a worker. `ground` is what the
        job (or POST /routes) would have drawn on: its status, its times
        and its cancel are the job's (jobs._Reporting); the worker draws on
        its own zones. Raises what the planner raised, jobs._Dropped when
        the job was cancelled during a load, WorkerDied or RouteTimedOut."""
        # With a job's graphs (jobs._Reporting) the job wants directions
        # (with_choices); POST /routes and the water do not.
        directions = isinstance(ground, _Reporting)
        report: Callable[[Any], object] | None = getattr(ground, "_report", None)
        wanted: Callable[[], bool] | None = getattr(ground, "_wanted", None)
        times: JobTimes | None = getattr(ground, "_times", None)
        # The job shows the start's own plan as soon as it is there.
        first: Callable[[Plan], None] | None = getattr(ground, "first_plan", None)
        worker = self._take()
        try:
            answer = worker.ask(
                self._next_seq(),
                request,
                directions,
                report,
                wanted,
                self._max_job_s,
                first,
            )
        except BaseException:
            self._drop(worker)
            raise
        self._give_back(worker)
        kind, payload, their_times = answer
        if times is not None and their_times is not None:
            _merge(times, their_times)
        if kind == "done":
            plan: Plan = payload
            return plan
        if kind == "dropped":
            raise _Dropped
        raise _unpickled(payload)

    def close(self) -> None:
        """Every worker told to stop, and killed when it does not within
        STOP_S (busy with a route). Routes asked afterwards fail."""
        with self._lock:
            self._closed = True
            workers, self._alive = self._alive, []
        for worker in workers:
            worker.stop(STOP_S)

    @property
    def alive(self) -> int:
        """How many worker processes are running."""
        with self._lock:
            return sum(1 for worker in self._alive if worker.process.is_alive())

    def _next_seq(self) -> int:
        with self._lock:
            self._seq += 1
            return self._seq

    def _take(self) -> _Worker:
        while True:
            try:
                worker = self._free.get_nowait()
            except queue.Empty:
                with self._lock:
                    if self._closed:
                        raise WorkerDied("the route workers are closed") from None
                    if len(self._alive) < self._workers:
                        return self._new_worker()
                worker = self._free.get()
            if worker.process.is_alive():
                return worker
            self._drop(worker)

    def _new_worker(self) -> _Worker:
        """Called with the lock held."""
        worker = _Worker.started(self._graphs, self._planner)
        self._alive.append(worker)
        return worker

    def _give_back(self, worker: _Worker) -> None:
        with self._lock:
            closed = self._closed
        if closed:
            worker.stop(STOP_S)
        else:
            self._free.put(worker)

    def _drop(self, worker: _Worker) -> None:
        worker.kill()
        with self._lock:
            if worker in self._alive:
                self._alive.remove(worker)


class _Worker:
    """One process and the pipe to it."""

    def __init__(self, process: BaseProcess, conn: Connection) -> None:
        self.process = process
        self.conn = conn

    @classmethod
    def started(cls, graphs: GraphsFactory, planner: Planner) -> _Worker:
        context = multiprocessing.get_context(START_METHOD)
        ours, theirs = context.Pipe()
        # Not a daemon: a daemon may not start the nearby starts' processes.
        process = context.Process(
            target=_serve,
            args=(theirs, graphs, planner),
            name="route-worker",
            daemon=False,
        )
        process.start()
        theirs.close()
        log.info("route worker %s started", process.pid)
        return cls(process, ours)

    def ask(
        self,
        seq: int,
        request: AnyRequest,
        directions: bool,
        report: Callable[[Any], object] | None,
        wanted: Callable[[], bool] | None,
        max_job_s: float,
        first: Callable[[Plan], None] | None = None,
    ) -> tuple[str, Any, JobTimes | None]:
        """The worker's answer to `request`: ("done", plan, times),
        ("dropped", None, times) or ("failed", pickled error, times).
        Before it, `report` is told each status and `first` the plan from
        the user's own start, if the worker sends one."""
        self.conn.send(("plan", seq, request, directions))
        began = time.monotonic()
        cancelled = False
        while True:
            try:
                ready = self.conn.poll(POLL_S)
                message = self.conn.recv() if ready else None
            except (EOFError, OSError):
                raise WorkerDied("the route worker ended") from None
            if message is not None:
                kind, their_seq = message[0], message[1]
                if their_seq != seq:
                    continue  # an answer of a route given up on: none yet
                if kind == "status":
                    if report is not None:
                        report(message[2])
                    continue
                if kind == "first":
                    if first is not None:
                        first(message[2])
                    continue
                return kind, message[2], message[3]
            if not self.process.is_alive():
                raise WorkerDied("the route worker ended")
            if not cancelled and wanted is not None and not wanted():
                self.conn.send(("cancel", seq))
                cancelled = True
            if time.monotonic() - began > max_job_s:
                log.warning(
                    "route worker %s: route over %.0f s, killed",
                    self.process.pid,
                    max_job_s,
                )
                raise RouteTimedOut(f"the route took over {max_job_s:.0f} s")

    def stop(self, wait_s: float) -> None:
        try:
            self.conn.send(None)
        except (OSError, ValueError):
            pass
        self.process.join(wait_s)
        if self.process.is_alive():
            self.kill()
        self.conn.close()

    def kill(self) -> None:
        """The worker and its nearby-start children, its process group."""
        pid = self.process.pid
        if pid is not None and self.process.is_alive():
            try:
                if hasattr(os, "killpg"):
                    os.killpg(pid, signal.SIGKILL)
                else:  # pragma: no cover - the API runs on Linux and macOS
                    self.process.kill()
            except (ProcessLookupError, PermissionError):
                self.process.kill()
        self.process.join(STOP_S)
        try:
            self.conn.close()
        except OSError:
            pass


# --- in the worker ------------------------------------------------------------


def _serve(conn: Connection, make_graphs: GraphsFactory, planner: Planner) -> None:
    """A worker's life: routes one after the other until told to stop, or
    until the API's end of the pipe closes."""
    if hasattr(os, "setsid"):
        try:
            os.setsid()  # its own group: killed with its children (kill)
        except OSError:
            pass
    logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(message)s")
    graphs = make_graphs()
    while True:
        try:
            message = conn.recv()
        except (EOFError, OSError):
            return
        if message is None:
            return
        if message[0] != "plan":
            continue  # a cancel that came after its route
        _, seq, request, directions = message
        stop, answer = _plan(conn, graphs, planner, seq, request, directions)
        try:
            conn.send(answer)
        except (OSError, ValueError):
            return
        if stop:
            return


def _plan(
    conn: Connection,
    graphs: Graphs,
    planner: Planner,
    seq: int,
    request: AnyRequest,
    directions: bool,
) -> tuple[bool, tuple[str, int, Any, JobTimes]]:
    """What jobs.RouteJobs does in its thread for `request` from the plan
    on, with this worker's zones; and whether the API asked to stop."""
    times = JobTimes()
    stop = False
    cancelled = False

    def report(status: object) -> None:
        conn.send(("status", seq, status))

    def wanted() -> bool:
        nonlocal stop, cancelled
        while conn.poll():
            message = conn.recv()
            if message is None:
                stop = cancelled = True
            elif message[0] == "cancel" and message[1] == seq:
                cancelled = True
        return not cancelled

    try:
        activity = request.activity
        if activity in WATER_ACTIVITIES:
            water = _ReportingWater(water_for(graphs, activity), report, wanted, times)
            plan = planner(request, water)
        elif activity in SNOW_ACTIVITIES:
            # On the snow (TASK-413): no graph, so no directions, as the water.
            snow = _ReportingSnow(snow_for(graphs, activity), report, wanted, times)
            plan = planner(request, snow)
        else:
            roads = source_for(graphs, activity)
            names = roads.named_roads if isinstance(roads, KnowsNames) else None

            def first(plan: Plan) -> None:
                # Alone, with its directions when the job wants them: its
                # alternatives come with the whole answer.
                alone = replace(plan, alternatives=[])
                if directions:
                    alone = _with_directions(alone, ground.graphs, names)
                conn.send(("first", seq, alone))

            ground = _Reporting(roads, report, wanted, times, first=first)
            plan = planner(request, ground)
            if directions:
                plan = _with_directions(plan, ground.graphs, names)
    except _Dropped:
        return stop, ("dropped", seq, None, times)
    except Exception as exc:
        return stop, ("failed", seq, _pickled(exc), times)
    return stop, ("done", seq, plan, times)


def _with_directions(
    plan: Plan, graphs: list[Graph], named_roads: NamedRoads | None
) -> Plan:
    """`plan` with the directions jobs.with_choices would give it and each
    of its alternatives on `graphs`: with_choices, given no graph, then
    leaves them as they are."""
    return replace(
        plan,
        result=with_directions(plan, graphs, named_roads),
        alternatives=[
            replace(other, result=with_directions(other, graphs, named_roads))
            for other in plan.alternatives
        ],
    )


def _pickled(exc: Exception) -> bytes:
    """The error as it was, when it crosses the pipe whole (the planner's
    errors do: errors.error_of reads their class and fields); else an
    engine error with its text, and its traceback in this worker's log."""
    try:
        data = pickle.dumps(exc)
        pickle.loads(data)
        return data
    except Exception:
        log.exception("route worker: an error that does not pickle", exc_info=exc)
        return pickle.dumps(RuntimeError(f"{type(exc).__name__}: {exc}"))


def _unpickled(data: bytes) -> Exception:
    exc = pickle.loads(data)
    if isinstance(exc, Exception):
        return exc
    return RuntimeError(repr(exc))  # pragma: no cover - _pickled sends errors


def _merge(times: JobTimes, theirs: JobTimes) -> None:
    """The worker's times of a job added to the job's own (job_times.line),
    which may already count the loads of the archive (jobs._nearby). The
    planner's seconds stay the job's: its thread measures the whole call."""
    if times.loads == 0:
        times.first_load_s = theirs.first_load_s
    times.loads += theirs.loads
    times.crop_s += theirs.crop_s
    times.download_s += theirs.download_s
    if theirs.directions_s is not None:
        times.directions_s = theirs.directions_s
    if theirs.nearby is not None:
        times.nearby = theirs.nearby
