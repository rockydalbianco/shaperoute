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
# 100 m: `_digest` of the result, its points and walks. Shapes at 6 km
# (cat, fish, the heads and the pumpkin have `lift` now: asked without the
# pen up, as the app asks for every shape), words at 3 km a letter, 6 at
# least, with the pen down and up.
ROUTES = {
    "penup:ciao": ("e54d4d83296c6a06", 157, [[50, 60], [84, 92], [109, 121]]),
    "penup:io": ("7bddc7e90a0e2be7", 71, [[24, 34]]),
    "shape:butterfly": ("2b51efb8988b2518", 63, []),
    "shape:cat": ("c4bd50e6d09184c5", 63, []),
    "shape:christmas_tree": ("9d2f78b6f94c4bf6", 61, []),
    "shape:circle": ("12030ff9c3393bf1", 61, []),
    "shape:dog_head": ("adba835fb7c2517e", 65, []),
    "shape:fish": ("87a8ea6eae6c2d7d", 59, []),
    "shape:heart": ("f993c0fa81965b16", 65, []),
    "shape:horse": ("65a8d1add8e40d24", 59, []),
    "shape:moon": ("3eb1313916fb0d3b", 63, []),
    "shape:pumpkin": ("cd11d4e34298c90b", 63, []),
    "shape:rabbit_head": ("f41b0c982b0fe852", 61, []),
    "shape:snail": ("0d55cc15e30f2399", 63, []),
    "shape:star": ("3962f2514e3ef8ca", 63, []),
    "word:ciao": ("b7bc6d4dc84e9492", 125, []),
    "word:io": ("752db4f68f1a45d8", 65, []),
}

# The points of every shape of main at b87d8cc, resampled to SHAPE_POINTS.
POINTS = {
    "outline arrow": "77b94b11a252a58d",
    "outline bird": "539d1549a7fc66e6",
    "outline butterfly": "2ea805e584f43376",
    "outline cat": "8ef38ab7f0547c26",
    "outline christmas_tree": "505f5e2096dd18f2",
    "outline ciao": "27d6476daba07bae",
    "outline ciao_open": "cce2022bdee6d1af",
    "outline crown": "7265f188d0fe3e7e",
    "outline dog": "9593d70f0ed239f9",
    "outline dog_head": "dd4f4b9c3a26afe0",
    "outline fish": "0522fbc0d4945a81",
    "outline horse": "637040b2d316038f",
    "outline house": "0bdca4380703df06",
    "outline moon": "8443c7c03cdf5917",
    "outline pumpkin": "63c03aa790a42356",
    "outline rabbit_head": "0c7350b203391e6f",
    "outline snail": "081f688cca9e441f",
    "outline star": "e9bbb66bed05b68a",
    "outline tree": "22c1ff9a1f027f4c",
    "shape butterfly": "2ea805e584f43376",
    "shape cat": "8ef38ab7f0547c26",
    "shape christmas_tree": "505f5e2096dd18f2",
    "shape circle": "082f9ffcdedbdc9b",
    "shape dog_head": "dd4f4b9c3a26afe0",
    "shape fish": "0522fbc0d4945a81",
    "shape heart": "b16bd458c1e75b67",
    "shape horse": "637040b2d316038f",
    "shape moon": "8443c7c03cdf5917",
    "shape pumpkin": "63c03aa790a42356",
    "shape rabbit_head": "0c7350b203391e6f",
    "shape snail": "081f688cca9e441f",
    "shape star": "e9bbb66bed05b68a",
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
        self.graph = _grid(TRENTO, 100.0, 4000.0)

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
    else:
        request = RouteRequest(
            start=TRENTO,
            distance_m=max(6000, 3000 * len(what)),
            word=what,
            pen_up=kind == "penup",
        )
    result = plan_route(request, _Source()).result
    digest, count, walks = ROUTES[case]
    assert (_digest(result), len(result.points)) == (digest, count)
    assert result.walks == [tuple(walk) for walk in walks]


@pytest.mark.parametrize("case", sorted(POINTS))
def test_the_points_of_a_shape_of_before_are_the_same(case: str) -> None:
    kind, name = case.split()
    shape = (
        read_outline(OUTLINES / f"{name}.json") if kind == "outline" else SHAPES[name]
    )
    assert _points_digest(shape(SHAPE_POINTS)) == POINTS[case]
