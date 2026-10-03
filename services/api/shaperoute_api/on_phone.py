"""The API's route job, run on the phone (TASK-214, ADR-0177).

The app sends the body of POST /route-jobs and gets back the body of
GET /route-jobs/{job_id}: the same request, the same code (RouteJobs,
with_choices, RouteResultBody), on the zones the phone has downloaded
(phone_zones.py). No FastAPI, no threads, no processes: it runs in Pyodide,
inside the app's WebView, one call at a time. The nearby starts are planned
one after the other, all of them: the server drops those still running at its
deadline.

On the phone go the shapes and the words on roads. A photo, the water, or a
zone the phone does not have: the job fails, and the app asks the server.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from route_engine.models import InvalidRequestError, RouteRequest
from route_engine.nearby_starts import ShapeJob, plan_nearby
from route_engine.network import NETWORKS
from route_engine.optimizer import GraphLoader, Plan

from shaperoute_api.activity_graphs import ROAD_ACTIVITIES, ActivityGraphs, Ground
from shaperoute_api.graphs import ZoneGraphs
from shaperoute_api.images import AnyRequest
from shaperoute_api.jobs import RouteJobs
from shaperoute_api.phone_zones import PhoneZones
from shaperoute_api.schemas import RouteJobBody, RouteRequestBody, RouteResultBody

# One zone of each network in memory: the phone has less of it than the
# server (docs/tasks/TASK-214.md, choice 3).
ZONES_IN_MEMORY = 1
ON_THE_SERVER = "only the server draws this route"


def to_request(body: RouteRequestBody) -> RouteRequest:
    """app.to_request for a shape or a word, without importing FastAPI;
    test_on_phone checks the two give the same request."""
    return RouteRequest(
        start=body.start,
        shape=body.shape,
        word=body.word,
        distance_m=body.distance_m,
        activity=body.activity,
        style=body.style,  # type: ignore[arg-type]  # RouteRequest checks it
        pen_up=body.pen_up,
    )


def plan_on_phone(request: AnyRequest, source: Ground) -> Plan:
    """images.plan_request for a shape or a word on roads, with the nearby
    starts in this process."""
    if not isinstance(request, RouteRequest):
        raise InvalidRequestError(ON_THE_SERVER)
    roads: GraphLoader = source  # type: ignore[assignment]  # water refused before
    job = ShapeJob.of_request(request)
    return plan_nearby(job, request.start, roads, processes=False).plan


def phone_graphs(directory: Path) -> ActivityGraphs:
    """The zones of each network on the phone, in `directory`; no water."""
    graphs: dict[str, GraphLoader] = {}
    for activity in ROAD_ACTIVITIES:
        zones = PhoneZones(directory, NETWORKS[activity])
        graphs[activity] = ZoneGraphs(zones, max_zones=ZONES_IN_MEMORY, read=zones.read)
    return ActivityGraphs(graphs)


class _Here:
    """An executor that runs the job at once, in the caller."""

    def submit(self, fn: Any, *args: Any) -> None:
        fn(*args)

    def shutdown(self, wait: bool = True, cancel_futures: bool = False) -> None:
        pass


class PhoneJobs(RouteJobs):
    """RouteJobs whose jobs run in submit, one after the other."""

    def __init__(self, graphs: ActivityGraphs) -> None:
        super().__init__(graphs, plan_on_phone, workers=1)
        self._pool.shutdown()
        self._pool = _Here()  # type: ignore[assignment]


def plan_json(body_json: str, jobs: PhoneJobs) -> str:
    """The JSON of GET /route-jobs/{job_id} for the JSON of POST /route-jobs.
    A body the API would refuse raises, as the API answers 422."""
    request = to_request(RouteRequestBody.model_validate_json(body_json))
    submitted = jobs.submit(request)
    job = jobs.get(submitted.job_id)
    assert job is not None and job.status in ("done", "failed")
    return RouteJobBody(
        job_id=job.job_id,
        status=job.status,
        result=None if job.result is None else RouteResultBody.from_result(job.result),
        error=job.error,
    ).model_dump_json()
