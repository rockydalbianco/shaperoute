"""What the tests of the first route (TASK-435) give a worker process: it
starts by spawn, so these must be importable by name. Not a test module:
pytest does not collect it."""

from __future__ import annotations

import time

from route_engine.models import RouteResult
from route_engine.optimizer import Plan

from shaperoute_api.activity_graphs import Ground
from shaperoute_api.images import AnyRequest
from shaperoute_api.job_times import first_of

FIRST = RouteResult(
    points=[(46.0, 11.0), (46.001, 11.001), (46.0, 11.0)],
    distance_m=1000.0,
    similarity=0.8,
    shape="circle",
    warnings=[],
)
BETTER = RouteResult(
    points=[(46.0, 11.0), (46.002, 11.002), (46.0, 11.0)],
    distance_m=1010.0,
    similarity=0.9,
    shape="circle",
    warnings=[],
)
# How long the nearby starts of `first_then_slow` take after the first plan.
NEARBY_S = 1.0


def whole() -> Plan:
    """The answer of a job whose nearby start drew better: that route, and
    the start's own as its alternative."""
    return Plan(
        result=BETTER,
        search=None,
        alternatives=[Plan(result=FIRST, search=None)],
    )


def first_then_slow(request: AnyRequest, ground: Ground) -> Plan:
    """As images.plan_request with nearby starts: tells the job's source
    the start's own plan, takes NEARBY_S more, then answers with a better
    route and that one as its alternative."""
    first = first_of(ground)
    if first is not None:
        first(Plan(result=FIRST, search=None))
    time.sleep(NEARBY_S)
    return whole()
