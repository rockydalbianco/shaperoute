"""The shapes and words of before TASK-223 draw the same routes: without the
pen up, a shape with `pieces` or `lift` in its file is drawn as it was, and a
word with the pen up or down is too (ADR-0185)."""

import hashlib

import networkx as nx
import pytest

from route_engine.geo import local_to_latlon
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import Graph
from route_engine.optimizer import SHAPE_POINTS, plan_route
from route_engine.shapes import OUTLINES, SHAPES
from route_engine.shapes.outline import read_outline

TRENTO = (46.0671, 11.1214)

# Routes of main at b87d8cc, before TASK-223, on a grid of streets every
# 100 m: `_digest` of the result. Shapes at 6 km, words at 8 km.
ROUTES = {
    # ROUTES
}

# The points of every shape of main at b87d8cc, resampled to SHAPE_POINTS.
POINTS = {
    # POINTS
}


def _grid(origin: tuple[float, float], spacing_m: float, half_m: float) -> Graph:
    graph = nx.MultiDiGraph()
    n = int(half_m / spacing_m)
    for i in range(-n, n + 1):
        for j in range(-n, n + 1):
            lat, lon = local_to_latlon(origin, i * spacing_m, j * spacing_m)
            graph.add_node((i, j), y=lat, x=lon)
    for i, j in list(graph.nodes):
        for b in ((i + 1, j), (i, j + 1)):
            if b in graph:
                graph.add_edge((i, j), b, length=spacing_m)
                graph.add_edge(b, (i, j), length=spacing_m)
    return graph


class _Source:
    def __init__(self) -> None:
        self.graph = _grid(TRENTO, 100.0, 3000.0)

    def is_cached(self, bbox: tuple[float, float, float, float]) -> bool:
        return True

    def load(self, bbox: tuple[float, float, float, float]) -> Graph:
        return self.graph


def _digest(result: RouteResult) -> str:
    text = repr(
        (
            [(round(a, 9), round(b, 9)) for a, b in result.points],
            round(result.distance_m, 6),
            round(result.similarity, 9),
            result.warnings,
        )
    )
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _points_digest(points: list[tuple[float, float]]) -> str:
    text = repr([(round(x, 12), round(y, 12)) for x, y in points])
    return hashlib.sha256(text.encode()).hexdigest()[:16]


@pytest.mark.parametrize("case", sorted(ROUTES))
def test_a_route_of_before_is_the_same(case: str) -> None:
    kind, what = case.split(":")
    if kind == "shape":
        request = RouteRequest(start=TRENTO, distance_m=6000, shape=what)
    elif kind == "word":
        request = RouteRequest(start=TRENTO, distance_m=8000, word=what)
    else:
        request = RouteRequest(start=TRENTO, distance_m=8000, word=what, pen_up=True)
    result = plan_route(request, _Source()).result
    digest, count, walks = ROUTES[case]
    assert (_digest(result), len(result.points)) == (digest, count)
    assert result.walks == [tuple(walk) for walk in walks]


@pytest.mark.parametrize("case", sorted(POINTS))
def test_the_points_of_a_shape_of_before_are_the_same(case: str) -> None:
    kind, name = case.split()
    shape = read_outline(OUTLINES / f"{name}.json") if kind == "outline" else SHAPES[name]
    assert _points_digest(shape(SHAPE_POINTS)) == POINTS[case]
