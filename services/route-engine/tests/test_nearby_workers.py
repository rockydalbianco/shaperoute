"""The worker processes of the nearby starts: each start gets its plan, and
stopping them returns whatever they were doing.

They took the place of a multiprocessing.Pool, whose terminate() waited for
ever when it came while a graph was about to be sent: the tests of the API
never ended in CI, twice in a day.
"""

import math
import multiprocessing
import os
import threading
import time
from dataclasses import dataclass
from typing import Any

import pytest
from test_nearby_starts import ORIGIN, GridSource, LoopJob, _grid, _latlon

from route_engine.geo import LatLon
from route_engine.nearby_starts import OneGraph, _Workers, plan_nearby
from route_engine.network import BBox, Graph
from route_engine.optimizer import Plan, ShapeNotDrawableError

# Room enough for a process to start on a busy machine.
PATIENCE_S = 120.0


@dataclass(frozen=True)
class Megabytes:
    """A graph loader that takes a while to send: far more than a pipe
    holds, so the sending waits for a process to read."""

    data: bytes = b"x" * 8_000_000

    def load(self, bbox: BBox) -> Graph:
        return _grid()


@dataclass(frozen=True)
class SleepingJob(LoopJob):
    """A LoopJob whose nearby plans never come."""

    def here(self, start: LatLon, source: Any) -> Plan:
        time.sleep(600)
        raise AssertionError("stopped long before")


@dataclass(frozen=True)
class BrokenJob(LoopJob):
    """A LoopJob whose nearby plans fail as no plan should."""

    def here(self, start: LatLon, source: Any) -> Plan:
        raise KeyError("a bug in the search")


@dataclass(frozen=True)
class DyingJob(LoopJob):
    """A LoopJob whose worker process ends without an answer."""

    def here(self, start: LatLon, source: Any) -> Plan:
        os._exit(1)


class UnsendableJob(LoopJob):
    """A LoopJob that does not pickle."""

    def __reduce__(self) -> Any:
        raise TypeError("this job stays here")


def _stopped(workers: _Workers) -> bool:
    """Stops them on another thread, so a stop that waits for ever fails
    the test instead of holding up the others."""
    stopping = threading.Thread(target=workers.stop, daemon=True)
    stopping.start()
    stopping.join(PATIENCE_S)
    return not stopping.is_alive()


def test_each_start_gets_its_plan_from_its_own_process() -> None:
    grid = _grid()
    starts = [_latlon(grid, node) for node in ((0, 2), (3, 0))]
    workers = _Workers(LoopJob(), starts, OneGraph(grid))
    try:
        outcomes = [workers.outcome(i, PATIENCE_S) for i in range(len(starts))]
    finally:
        assert _stopped(workers)
    for start, outcome in zip(starts, outcomes, strict=True):
        assert outcome is not None
        plan, seconds = outcome
        assert isinstance(plan, Plan) and plan.result.points[0] == start
        assert seconds >= 0
    assert not multiprocessing.active_children()


def test_a_start_that_cannot_be_planned_says_why() -> None:
    workers = _Workers(LoopJob(refused=((0, 0),)), [ORIGIN], GridSource())
    try:
        outcome = workers.outcome(0, PATIENCE_S)
    finally:
        assert _stopped(workers)
    assert outcome is not None
    assert outcome[0] == "ShapeNotDrawableError: no heart at (0, 0)"


@pytest.mark.parametrize("after_s", [0.0, 0.001, 0.01, 0.1, 1.0])
def test_stopping_returns_while_the_graphs_are_being_sent(after_s: float) -> None:
    """Whenever the stop comes: before a process has started, with a graph
    half sent, with the plans running."""
    workers = _Workers(SleepingJob(), [ORIGIN] * 3, Megabytes())
    time.sleep(after_s)
    assert workers.outcome(0, 0.0) is None  # still running
    assert _stopped(workers)
    assert not multiprocessing.active_children()


def test_a_start_refused_at_once_does_not_wait_for_the_nearby_ones() -> None:
    """What held up CI: the start fails while the graph goes to the
    workers, and they are stopped then."""
    refused = tuple((i, j) for i in range(-20, 21) for j in range(-20, 21))
    job = SleepingJob(refused=refused)
    failed: list[BaseException] = []

    def plan() -> None:
        try:
            plan_nearby(job, ORIGIN, GridSource(), budget_s=0, free_mb=lambda: None)
        except ShapeNotDrawableError as exc:
            failed.append(exc)

    planning = threading.Thread(target=plan, daemon=True)
    planning.start()
    planning.join(PATIENCE_S)
    assert not planning.is_alive()
    assert len(failed) == 1 and "(0, 0)" in str(failed[0])
    assert not multiprocessing.active_children()


def test_the_processes_that_started_are_stopped_when_one_does_not(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    process = multiprocessing.get_context("spawn").Process
    start = process.start
    started: list[Any] = []

    def second_fails(self: Any) -> None:
        if started:
            raise OSError("no room for another process")
        started.append(self)
        start(self)

    monkeypatch.setattr(process, "start", second_fails)
    with pytest.raises(OSError, match="no room"):
        _Workers(SleepingJob(), [ORIGIN] * 3, GridSource())
    assert len(started) == 1
    assert not multiprocessing.active_children()


def test_an_error_in_a_worker_is_raised_here() -> None:
    workers = _Workers(BrokenJob(), [ORIGIN], GridSource())
    try:
        with pytest.raises(KeyError, match="a bug in the search"):
            workers.outcome(0, PATIENCE_S)
    finally:
        assert _stopped(workers)


def test_a_job_that_cannot_be_sent_is_an_error_here() -> None:
    workers = _Workers(UnsendableJob(), [ORIGIN], GridSource())
    try:
        with pytest.raises(TypeError, match="this job stays here"):
            workers.outcome(0, PATIENCE_S)
    finally:
        assert _stopped(workers)


def test_a_worker_that_ended_is_a_start_without_a_plan() -> None:
    workers = _Workers(DyingJob(), [ORIGIN], GridSource())
    try:
        outcome = workers.outcome(0, PATIENCE_S)
    finally:
        assert _stopped(workers)
    assert outcome is not None
    note, seconds = outcome
    assert note == "the worker process stopped" and math.isnan(seconds)
