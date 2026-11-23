"""The first route at once, the alternatives after (TASK-435, ADR-0361).

While a job computes, the route from the user's own start is on the job as
soon as the planner has it (`Job.first`), and `GET /route-jobs/{id}?first=1`
says it. Who does not ask gets the job as before, and the whole answer is
the one of before for everybody.
"""

from __future__ import annotations

import json
import multiprocessing
import multiprocessing.forkserver
import pickle
import threading
import time
from collections.abc import Callable, Iterator
from dataclasses import replace
from pathlib import Path
from typing import Any

import first_route_helpers as first_helpers
import pytest
import route_process_helpers as helpers
from fastapi.testclient import TestClient
from first_route_helpers import BETTER, FIRST
from route_engine.geo import LatLon
from route_engine.models import RouteRequest, RouteResult
from route_engine.nearby_starts import NearbyPlan
from route_engine.network import BBox, FileSource, Graph
from route_engine.optimizer import Plan

import shaperoute_api.images as images
from shaperoute_api.activity_graphs import Ground
from shaperoute_api.app import create_app
from shaperoute_api.images import AnyRequest, ImageRequest, outline_of, plan_request
from shaperoute_api.job_times import ShowsFirst, first_of
from shaperoute_api.jobs import Job, RouteJobs, _Reporting
from shaperoute_api.route_processes import RouteProcesses
from shaperoute_api.schemas import RouteJobBody, RouteJobWithFirstBody

FIXTURES = Path(__file__).resolve().parents[3] / "packages/shared-types/fixtures"
WAIT_S = 120.0
HEART = {"start": [46.0671, 11.1214], "shape": "heart", "distance_m": 5000}
REQUEST = RouteRequest(start=(46.0671, 11.1214), shape="circle", distance_m=1000)
OLD_KEYS = {"job_id", "status", "result", "error"}


class Gate:
    """A planner that tells the first plan, then waits to be let through:
    the test looks at the job in between."""

    def __init__(self, tell: bool = True) -> None:
        self.tell = tell
        self.told = threading.Event()
        self.open = threading.Event()

    def __call__(self, request: AnyRequest, ground: Ground) -> Plan:
        first = first_of(ground)
        if self.tell and first is not None:
            first(Plan(result=FIRST, search=None))
        self.told.set()
        assert self.open.wait(WAIT_S)
        return first_helpers.whole()


def wait_for(jobs: RouteJobs, job_id: str) -> Job:
    deadline = time.monotonic() + WAIT_S
    while True:
        job = jobs.get(job_id)
        assert job is not None, "the job was forgotten"
        if job.status in ("done", "failed"):
            return job
        assert time.monotonic() < deadline, job.status
        time.sleep(0.02)


@pytest.fixture(scope="module", autouse=True)
def fork_server() -> None:
    """The fork server of the worker processes, before any zone is read in
    a thread of these tests: on macOS one started after that dies
    (route_processes.START_METHOD)."""
    multiprocessing.forkserver.ensure_running()


@pytest.fixture
def jobs_of() -> Iterator[Callable[..., RouteJobs]]:
    made: list[RouteJobs] = []

    def make(planner: Any, kind: type[RouteJobs] = RouteJobs) -> RouteJobs:
        jobs = kind(FileSource(Path("unused.graphml")), planner)
        made.append(jobs)
        return jobs

    yield make
    for jobs in made:
        jobs.shutdown()


# --- the job -----------------------------------------------------------------


def test_the_job_has_the_first_route_while_it_computes(jobs_of: Any) -> None:
    gate = Gate()
    jobs = jobs_of(gate)
    job_id = jobs.submit(REQUEST).job_id
    assert gate.told.wait(WAIT_S)

    job = jobs.get(job_id)
    assert job is not None
    assert job.status == "computing"
    assert job.result is None
    assert job.first == FIRST
    assert job.first.alternatives == []

    gate.open.set()
    done = wait_for(jobs, job_id)
    # The whole answer, as before: the better route and the first as its
    # alternative; the first route has left its place to it.
    assert done.status == "done"
    assert done.result == replace(BETTER, alternatives=[FIRST])
    assert done.first is None and done.first_placed == []


def test_a_planner_that_tells_nothing_gives_a_job_as_before(jobs_of: Any) -> None:
    gate = Gate(tell=False)
    jobs = jobs_of(gate)
    job_id = jobs.submit(REQUEST).job_id
    assert gate.told.wait(WAIT_S)
    job = jobs.get(job_id)
    assert job is not None and job.status == "computing" and job.first is None
    gate.open.set()
    assert wait_for(jobs, job_id).result == replace(BETTER, alternatives=[FIRST])


def test_a_cancelled_job_is_shown_no_first_route(jobs_of: Any) -> None:
    shown: list[RouteResult] = []

    class Spy(RouteJobs):
        def _show_first(self, job: Job, result: RouteResult, placed: Any) -> None:
            shown.append(result)
            super()._show_first(job, result, placed)

    class Cancelling(Gate):
        def __call__(self, request: AnyRequest, ground: Ground) -> Plan:
            assert self.open.wait(WAIT_S)  # cancelled before the first plan
            return super().__call__(request, ground)

    gate = Cancelling()
    jobs = jobs_of(gate, Spy)
    job_id = jobs.submit(REQUEST).job_id
    deadline = time.monotonic() + WAIT_S
    while (job := jobs.get(job_id)) is not None and job.status != "computing":
        assert time.monotonic() < deadline
        time.sleep(0.02)
    assert jobs.cancel(job_id)
    gate.open.set()
    assert gate.told.wait(WAIT_S)
    assert shown == [] and jobs.get(job_id) is None


def test_the_first_route_of_a_plan_is_alone_whatever_the_plan_holds(
    jobs_of: Any,
) -> None:
    class WithOthers(Gate):
        def __call__(self, request: AnyRequest, ground: Ground) -> Plan:
            first = first_of(ground)
            assert first is not None
            first(replace(first_helpers.whole(), result=FIRST))
            self.told.set()
            assert self.open.wait(WAIT_S)
            return first_helpers.whole()

    gate = WithOthers()
    jobs = jobs_of(gate)
    job_id = jobs.submit(REQUEST).job_id
    assert gate.told.wait(WAIT_S)
    job = jobs.get(job_id)
    assert job is not None and job.first == FIRST
    gate.open.set()
    wait_for(jobs, job_id)


# --- the job's source -----------------------------------------------------------


class _NoGraphs:
    def load(self, bbox: BBox) -> Graph:
        raise AssertionError("no graph is loaded here")


def test_the_job_source_shows_the_first_plan() -> None:
    told: list[Plan] = []
    source = _Reporting(
        _NoGraphs(), lambda status: None, lambda: True, first=told.append
    )
    assert isinstance(source, ShowsFirst)
    plan = Plan(result=FIRST, search=None)
    source.first_plan(plan)
    assert told == [plan]


def test_a_source_with_nobody_to_show_to_says_nothing() -> None:
    source = _Reporting(_NoGraphs(), lambda status: None, lambda: True)
    source.first_plan(Plan(result=FIRST, search=None))  # no error


def test_a_job_no_longer_wanted_is_not_shown() -> None:
    told: list[Plan] = []
    source = _Reporting(
        _NoGraphs(), lambda status: None, lambda: False, first=told.append
    )
    source.first_plan(Plan(result=FIRST, search=None))
    assert told == []


def test_showing_that_fails_leaves_the_job_to_go_on(
    caplog: pytest.LogCaptureFixture,
) -> None:
    def failing(plan: Plan) -> None:
        raise RuntimeError("the pipe is closed")

    source = _Reporting(_NoGraphs(), lambda status: None, lambda: True, first=failing)
    source.first_plan(Plan(result=FIRST, search=None))  # no error
    assert "first route could not be shown" in caplog.text


def test_a_plain_source_shows_nothing() -> None:
    assert first_of(FileSource(Path("unused.graphml"))) is None


# --- the API's planner -----------------------------------------------------------


class _Shows:
    """A graph source that shows the first plan (job_times.ShowsFirst)."""

    def __init__(self) -> None:
        self.shown: list[Plan] = []

    def load(self, bbox: BBox) -> Graph:
        raise AssertionError("no graph is loaded here")

    def first_plan(self, plan: Plan) -> None:
        self.shown.append(plan)


def _telling(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """`plan_nearby` replaced by one that tells the start's own plan, named
    as the job, and answers with a better route."""
    called: dict[str, Any] = {}

    def plan_nearby(job: Any, start: Any, source: Any, **options: Any) -> Any:
        called.update(options)
        first = Plan(replace(FIRST, shape=job.name), None)
        if "on_first" in options:
            options["on_first"](first)
        best = Plan(replace(BETTER, shape=job.name), None, alternatives=[first])
        return NearbyPlan(best, 1, [])

    monkeypatch.setattr(images, "plan_nearby", plan_nearby)
    return called


def test_the_planner_tells_the_source_the_first_plan_of_a_shape(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _telling(monkeypatch)
    source = _Shows()
    plan = plan_request(REQUEST, source)
    assert [shown.result for shown in source.shown] == [FIRST]
    assert plan.result == BETTER


def test_the_first_route_of_an_image_names_no_shape_as_its_answer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _telling(monkeypatch)
    source = _Shows()
    square = [[-1.0, -1.0], [1.0, -1.0], [1.0, 1.0], [-1.0, 1.0], [-1.0, -1.0]]
    request = ImageRequest(
        start=(46.0671, 11.1214), outline=outline_of(square), distance_m=5000
    )
    plan = plan_request(request, source)
    [shown] = source.shown
    assert shown.result.shape is None and shown.result.word is None
    assert shown.result.points == FIRST.points
    assert plan.result.shape is None


def test_with_nobody_to_tell_the_planner_calls_as_before(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    called = _telling(monkeypatch)
    plan_request(REQUEST, FileSource(Path("unused.graphml")))
    assert called == {}


# --- the real planner, on Levico ------------------------------------------------


class _Seen(RouteJobs):
    """RouteJobs that keeps what it showed first, with the job as it was."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.seen: list[tuple[RouteResult, list[list[list[LatLon]]], str]] = []

    def _show_first(self, job: Job, result: RouteResult, placed: Any) -> None:
        self.seen.append((result, placed, job.status))
        super()._show_first(job, result, placed)


LEVICO_CIRCLE = RouteRequest(start=helpers.LEVICO, shape="circle", distance_m=1000)


class _Read:
    """Levico's graph, read here and now: a job's thread then loads a copy
    of it without reading the file. On macOS a process started after a
    thread that read GraphML has ended dies at once
    (route_processes.START_METHOD), and the tests after these start some."""

    def __init__(self) -> None:
        self._data = pickle.dumps(helpers.levico().load((0.0, 0.0, 0.0, 0.0)))

    def load(self, bbox: BBox) -> Graph:
        graph: Graph = pickle.loads(self._data)
        return graph


def test_the_engine_first_route_is_one_of_the_job_and_the_answer_is_as_before() -> None:
    """With the real planner in the job's thread: the first route is the
    start's own, with its directions and its drawing placed, shown once
    while the job computes; the whole answer is the one a job that shows
    nothing gets."""
    levico = _Read()
    plain = RouteJobs(levico, plan_request)
    seen = _Seen(levico, plan_request)
    try:
        before = wait_for(plain, plain.submit(LEVICO_CIRCLE).job_id)
        after = wait_for(seen, seen.submit(LEVICO_CIRCLE).job_id)
    finally:
        plain.shutdown()
        seen.shutdown()
    assert after.status == "done" and after.result == before.result
    assert after.placed == before.placed
    assert after.first is None

    [(first, placed, status)] = seen.seen
    assert status == "computing"
    assert first.shape == "circle" and first.alternatives == []
    assert first.directions
    assert len(placed) == 1 and placed[0]
    # The start's own route is in the answer, unless the answer left it
    # out: then it is none of the routes of the answer, not a third thing.
    assert before.result is not None
    choices = [before.result, *before.result.alternatives]
    same = [c for c in choices if c.points == first.points]
    if same:
        assert replace(same[0], alternatives=[]) == first


def test_the_first_route_crosses_from_a_worker_process() -> None:
    """With the real planner in a worker process (ADR-0242): the first
    route comes once, while the job computes, alone, with the directions
    made there and its drawing placed; the answer is whole after it. (Both
    jobs in the worker: on macOS the nearby starts of a plan drawn in a
    thread here, after other tests' threads ended, die at once.)"""
    processes = RouteProcesses(helpers.levico, workers=1)
    plain = RouteJobs(helpers.levico(), processes)
    there = _Seen(helpers.levico(), processes)
    try:
        before = wait_for(plain, plain.submit(LEVICO_CIRCLE).job_id)
        after = wait_for(there, there.submit(LEVICO_CIRCLE).job_id)
    finally:
        plain.shutdown()
        there.shutdown()
        processes.close()
    assert after.status == "done" and after.first is None
    assert after.result == before.result and after.placed == before.placed

    [(first, placed, status)] = there.seen
    assert status == "computing"
    assert first.shape == "circle" and first.alternatives == []
    assert first.directions
    assert len(placed) == 1 and placed[0]
    assert after.result is not None
    choices = [after.result, *after.result.alternatives]
    same = [c for c in choices if c.points == first.points]
    if same:
        assert replace(same[0], alternatives=[]) == first


def test_a_worker_tells_the_first_route_before_its_answer() -> None:
    """A planner that tells the first plan and takes seconds more, in a
    worker process: the job has the first route while it computes."""
    processes = RouteProcesses(
        helpers.nothing, workers=1, planner=first_helpers.first_then_slow
    )
    jobs = RouteJobs(FileSource(Path("unused.graphml")), processes)
    try:
        job_id = jobs.submit(REQUEST).job_id
        deadline = time.monotonic() + WAIT_S
        while True:
            job = jobs.get(job_id)
            assert job is not None
            if job.first is not None:
                break
            assert job.status != "done", "done before the first route was seen"
            assert time.monotonic() < deadline, job.status
            time.sleep(0.02)
        assert job.status == "computing" and job.result is None
        assert job.first == FIRST
        done = wait_for(jobs, job_id)
        assert done.result == replace(BETTER, alternatives=[FIRST])
        assert done.first is None
    finally:
        jobs.shutdown()
        processes.close()


# --- over HTTP ------------------------------------------------------------------


@pytest.fixture
def gated() -> Iterator[tuple[TestClient, Gate]]:
    gate = Gate()
    app = create_app(FileSource(Path("unused.graphml")), planner=gate)
    with TestClient(app) as client:
        yield client, gate
        gate.open.set()


def finished(client: TestClient, url: str) -> dict[str, Any]:
    deadline = time.monotonic() + WAIT_S
    while True:
        body: dict[str, Any] = client.get(url).json()
        if body["status"] in ("done", "failed"):
            return body
        assert time.monotonic() < deadline, body
        time.sleep(0.02)


def test_who_asks_gets_the_first_route_while_the_job_computes(
    gated: tuple[TestClient, Gate],
) -> None:
    client, gate = gated
    posted = client.post("/route-jobs", json=HEART)
    assert posted.status_code == 202 and set(posted.json()) == OLD_KEYS
    job_id = posted.json()["job_id"]
    assert gate.told.wait(WAIT_S)

    body = client.get(f"/route-jobs/{job_id}?first=1").json()
    assert set(body) == OLD_KEYS | {"first"}
    assert body["status"] == "computing"
    assert body["result"] is None and body["error"] is None
    first = body["first"]
    assert first["points"] == [list(point) for point in FIRST.points]
    assert first["similarity"] == FIRST.similarity
    assert first["alternatives"] == [] and first["directions"] == []

    gate.open.set()
    done = finished(client, f"/route-jobs/{job_id}?first=1")
    assert done["first"] is None
    assert done["result"]["similarity"] == BETTER.similarity
    assert [a["points"] for a in done["result"]["alternatives"]] == [first["points"]]


def test_who_does_not_ask_gets_the_job_as_before(
    gated: tuple[TestClient, Gate],
) -> None:
    """An app that does not know `first` (the one published): the same
    keys, the same statuses, the same whole result, and no route more at
    each read."""
    client, gate = gated
    job_id = client.post("/route-jobs", json=HEART).json()["job_id"]
    assert gate.told.wait(WAIT_S)

    body = client.get(f"/route-jobs/{job_id}").json()
    assert body == {
        "job_id": job_id,
        "status": "computing",
        "result": None,
        "error": None,
    }

    gate.open.set()
    done = finished(client, f"/route-jobs/{job_id}")
    asked = client.get(f"/route-jobs/{job_id}?first=1").json()
    assert set(done) == OLD_KEYS
    assert done == {key: asked[key] for key in OLD_KEYS}
    # The body of before, field for field.
    assert set(done) == set(RouteJobBody.model_fields)


def test_asking_for_the_first_route_of_an_unknown_job_is_a_404(
    gated: tuple[TestClient, Gate],
) -> None:
    client, _ = gated
    assert client.get("/route-jobs/nope?first=1").status_code == 404


def test_first_is_a_yes_or_no(gated: tuple[TestClient, Gate]) -> None:
    client, gate = gated
    job_id = client.post("/route-jobs", json=HEART).json()["job_id"]
    assert gate.told.wait(WAIT_S)
    assert set(client.get(f"/route-jobs/{job_id}?first=0").json()) == OLD_KEYS
    assert "first" in client.get(f"/route-jobs/{job_id}?first=true").json()


# --- the contract of packages/shared-types --------------------------------------


def test_the_shared_fixture_of_a_job_with_its_first_route_is_a_valid_body() -> None:
    """The JSON packages/shared-types checks RouteJobWithFirst against
    (test/firstRoute.test.ts): one field more than the job of before."""
    data = json.loads((FIXTURES / "route-job-first.json").read_text("utf-8"))
    assert set(data) == set(RouteJobWithFirstBody.model_fields)
    assert set(data) - set(RouteJobBody.model_fields) == {"first"}
    body = RouteJobWithFirstBody.model_validate(data)
    assert body.status == "computing" and body.result is None
    assert body.first is not None and body.first.alternatives == []
