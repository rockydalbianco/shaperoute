"""What the tests of route_processes give a worker process (TASK-276): it
starts by spawn, so these must be importable by name, not defined in a test
function. Not a test module: pytest does not collect it."""

from __future__ import annotations

import os
import time
from pathlib import Path

from route_engine.models import RouteResult
from route_engine.network import BBox, FileSource, Graph
from route_engine.optimizer import Plan, ShapeNotDrawableError

from shaperoute_api.activity_graphs import Ground
from shaperoute_api.images import AnyRequest

REPO = Path(__file__).resolve().parents[3]
LEVICO_GRAPH = REPO / "services/route-engine/tests/fixtures/levico_walk_1km.graphml"
LEVICO = (46.0122, 11.2986)
RESULT = RouteResult(
    points=[(46.0, 11.0), (46.001, 11.001), (46.0, 11.0)],
    distance_m=1000.0,
    similarity=0.9,
    shape="circle",
    warnings=[],
)


def levico() -> FileSource:
    return FileSource(LEVICO_GRAPH)


class SlowZone:
    """A zone that is never in the cache: each load downloads, slowly."""

    def needs_download(self, bbox: BBox) -> bool:
        return True

    def load(self, bbox: BBox) -> Graph:
        time.sleep(1.0)
        return FileSource(LEVICO_GRAPH).load(bbox)


def slow_zone() -> SlowZone:
    return SlowZone()


def nothing() -> object:
    return object()


def answering(request: AnyRequest, ground: Ground) -> Plan:
    """A plan at once, its distance the request's: which request it was."""
    result = RouteResult(
        points=RESULT.points,
        distance_m=float(request.distance_m),
        similarity=0.9,
        shape=RESULT.shape,
        warnings=[],
    )
    return Plan(result=result, search=None)


def loading(request: AnyRequest, ground: Ground) -> Plan:
    """Loads a graph first, as the engine does, then answers."""
    ground.load((46.0, 11.0, 46.1, 11.1))  # type: ignore[union-attr]
    return answering(request, ground)


def sleeping(request: AnyRequest, ground: Ground) -> Plan:
    time.sleep(30.0)
    return answering(request, ground)


def not_drawable(request: AnyRequest, ground: Ground) -> Plan:
    raise ShapeNotDrawableError("the roads here cannot draw it", best_distance_m=3400.0)


class _Odd(Exception):
    def __init__(self, a: int, b: int) -> None:
        super().__init__(a)
        self.b = b


def unpicklable(request: AnyRequest, ground: Ground) -> Plan:
    raise _Odd(1, 2)


def dying(request: AnyRequest, ground: Ground) -> Plan:
    if request.distance_m == 1000:
        os._exit(3)
    return answering(request, ground)


def where(request: AnyRequest, ground: Ground) -> Plan:
    """Answers, after half a second, in which process it ran: its pid as
    the distance."""
    time.sleep(0.5)
    result = RouteResult(
        points=RESULT.points,
        distance_m=float(os.getpid()),
        similarity=0.9,
        shape=RESULT.shape,
        warnings=[],
    )
    return Plan(result=result, search=None)
