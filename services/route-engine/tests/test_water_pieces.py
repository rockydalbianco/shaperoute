"""A shape in pieces on the water, drawn with the pen up (TASK-226,
ADR-0188): the outline, and each piece on its own, such as the eyes of a
cat; the route leaves the outline where the pieces are nearest, paddles to
each without drawing and comes back, and says those stretches as `walks`.
With the pen down the routes are those of before, point for point.

No network: the hand-built coast and lake of make_water_fixtures.py, as
test_paddling.py.
"""

from __future__ import annotations

import hashlib
import math
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
import pytest
import test_paddling as paddling
from shapely.geometry import LineString

import route_engine.__main__ as cli
from route_engine import water_fit
from route_engine.geo import (
    LatLon,
    latlon_to_local_array,
    local_to_latlon,
    path_length_m,
)
from route_engine.models import (
    PEN_UP_WITHOUT_PIECES,
    InvalidRequestError,
    RouteRequest,
)
from route_engine.paddling import (
    WaterPlan,
    plan_paddling,
    water_pieces,
    water_shape,
)
from route_engine.pen_up import walks_problem
from route_engine.shapes import SUPPORTED_SHAPES, in_pieces
from route_engine.water import FileWaterSource
from route_engine.water_fit import DISTANCE_TOLERANCE, _branch, _entered, _tour

WHERE = {
    "coast": (paddling.COAST_START, paddling.COAST),
    "lake": (paddling.LAKE_START, paddling.LAKE),
}
# How many pieces each shape has besides its outline.
PIECES = {
    "cat": 2,
    "fish": 1,
    "dog_head": 2,
    "rabbit_head": 2,
    "pumpkin": 3,
    "smiley": 3,
    "ghost": 2,
    "donut": 1,
    "sun": 8,
}


def _request(where: str, shape: str, pen_up: bool, distance_m: int = 2000):
    start, _ = WHERE[where]
    return RouteRequest(
        start=start,
        shape=shape,
        distance_m=distance_m,
        activity="paddling",
        pen_up=pen_up,
    )


def _plan(where: str, shape: str, pen_up: bool = True) -> WaterPlan:
    return plan_paddling(
        _request(where, shape, pen_up), FileWaterSource(WHERE[where][1])
    )


def _xy(plan: WaterPlan) -> np.ndarray:
    points = np.asarray(plan.result.points, dtype=float)
    return latlon_to_local_array(plan.area.origin, points)


def _fingerprint(points: list[LatLon]) -> str:
    text = ";".join(f"{lat:.7f},{lon:.7f}" for lat, lon in points)
    return hashlib.sha256(text.encode("ascii")).hexdigest()[:16]


# --- The request --------------------------------------------------------------


def test_the_shapes_in_pieces_are_these() -> None:
    assert {name for name in SUPPORTED_SHAPES if in_pieces(name)} == set(PIECES)


@pytest.mark.parametrize("shape", sorted(PIECES))
def test_on_the_water_a_shape_in_pieces_may_be_asked_with_the_pen_up(
    shape: str,
) -> None:
    request = _request("lake", shape, pen_up=True)
    assert request.pen_up
    outline, pieces = water_shape(request), water_pieces(request)
    assert outline[0] == outline[-1]
    assert len(pieces) == PIECES[shape]
    # With the pen down the pieces are in the one line, as before.
    assert water_pieces(_request("lake", shape, pen_up=False)) == []


@pytest.mark.parametrize("shape", ["heart", "circle", "star", "moon"])
def test_a_shape_in_one_line_is_refused_with_the_pen_up(shape: str) -> None:
    with pytest.raises(InvalidRequestError) as exc:
        _request("lake", shape, pen_up=True)
    assert str(exc.value) == f"{PEN_UP_WITHOUT_PIECES}; {shape} has none"


# --- How the pieces are drawn -------------------------------------------------


def test_a_ring_is_entered_at_its_vertex_nearest_and_closed_there() -> None:
    ring = np.array([[0.0, 0.0], [2.0, 0.0], [2.0, 2.0], [0.0, 2.0], [0.0, 0.0]])
    entered = _entered(ring, (3.0, 2.5))
    assert entered.tolist() == [[2, 2], [0, 2], [0, 0], [2, 0], [2, 2]]
    # An open line from its nearer end.
    line = np.array([[0.0, 0.0], [1.0, 0.0], [5.0, 0.0]])
    assert _entered(line, (6.0, 1.0)).tolist() == [[5, 0], [1, 0], [0, 0]]
    assert _entered(line, (-1.0, 1.0)).tolist() == line.tolist()


def test_the_pieces_are_toured_nearest_first_and_back() -> None:
    near = np.array([[1.0, 0.0], [2.0, 0.0]])
    far = np.array([[10.0, 0.0], [12.0, 0.0]])
    drawn, links = _tour((0.0, 0.0), [far, near])
    assert [piece.tolist() for piece in drawn] == [near.tolist(), far.tolist()]
    # 0 → 1, the piece to 2, 2 → 10, the piece to 12, and 12 back to 0.
    assert links == pytest.approx(1.0 + 8.0 + 12.0)


def test_the_outline_is_left_where_the_pen_is_up_the_least() -> None:
    square = [(0.0, 0.0), (4.0, 0.0), (4.0, 4.0), (0.0, 4.0), (0.0, 0.0)]
    eye = [(3.0, 3.0), (3.5, 3.0), (3.5, 3.5), (3.0, 3.5), (3.0, 3.0)]
    parts = _branch(square, [eye])
    assert parts is not None
    assert parts.branch == 2  # the corner (4, 4), the eye's (3.5, 3.5) nearest
    assert parts.links == pytest.approx(2 * math.dist((4, 4), (3.5, 3.5)))
    assert parts.drawn == pytest.approx(2.0)
    assert _branch(square, []) is None


# --- The route ----------------------------------------------------------------


@pytest.mark.parametrize("where", ["coast", "lake"])
@pytest.mark.parametrize("shape", sorted(PIECES))
def test_each_piece_is_drawn_on_its_own_and_paddled_to(where: str, shape: str) -> None:
    plan = _plan(where, shape)
    result, area = plan.result, plan.area
    xy = _xy(plan)
    walks = result.walks
    # To each piece, and back to the outline: one stretch more than pieces.
    assert len(walks) == PIECES[shape] + 1
    assert walks_problem(walks, len(result.points)) is None
    assert walks == list(plan.route.walks)
    assert all(b == a + 1 for a, b in walks)  # each straight
    assert walks[0][0] > 1 and walks[-1][1] < len(xy) - 2  # the legs are drawn
    # The pen goes up and comes back down at the same vertex of the outline.
    assert xy[walks[0][0]] == pytest.approx(xy[walks[-1][1]], abs=1e-6)
    # Everything paddled with the pen up is in the band, as what is drawn
    # around the shape: off the shore, the obstacles and the island.
    for a, b in walks:
        assert area.band.buffer(1e-6).contains(LineString(xy[a : b + 1]))
    drawn = [(b, c) for (_, b), (c, _) in zip(walks, walks[1:], strict=False)]
    for a, b in drawn:
        piece = LineString(xy[a : b + 1])
        assert area.band.buffer(1e-6).contains(piece)
        assert piece.is_closed or shape in ("smiley", "sun")  # its mouth, its rays
    # The route's checks: closed, on water, within 1 km, the distance asked.
    measures = water_fit.measure(result.points, area)
    assert measures.closed and measures.on_land_m == 0.0
    assert abs(result.distance_m - 2000) <= DISTANCE_TOLERANCE * 2000
    assert result.distance_m == pytest.approx(path_length_m(result.points), rel=1e-3)
    assert result.similarity == 1.0


@pytest.mark.parametrize("where", ["coast", "lake"])
def test_the_eyes_are_near_where_the_outline_is_left(where: str) -> None:
    """Not from where the shore joins the outline, which may be the far
    side of it: the fish's eye is a few tens of metres from its head."""
    plan = _plan(where, "fish")
    points = plan.result.points
    pen_up = sum(path_length_m(points[a : b + 1]) for a, b in plan.result.walks)
    assert pen_up < 0.05 * plan.result.distance_m
    for shape in ("dog_head", "rabbit_head"):
        plan = _plan(where, shape)
        points = plan.result.points
        pen_up = sum(path_length_m(points[a : b + 1]) for a, b in plan.result.walks)
        assert pen_up < 0.07 * plan.result.distance_m


@pytest.mark.parametrize("where", ["coast", "lake"])
def test_the_pen_up_does_not_shrink_the_shape(where: str) -> None:
    """The stretches with the pen up count in the distance asked, so the
    lines are a little shorter; the scale is that of a shape in one line."""
    up, down = _plan(where, "dog_head"), _plan(where, "dog_head", pen_up=False)
    assert up.route.scale == down.route.scale
    assert up.route.approach_m == pytest.approx(down.route.approach_m, rel=0.1)


def test_a_piece_on_an_island_does_not_fit_there() -> None:
    """The outline in the band is not enough: the lake's island is inside
    this ring, and an eye on it is on land."""
    plan = _plan("lake", "donut")
    area = plan.area
    fx, fy, radius = paddling.BUILD.ISLAND
    centre = local_to_latlon(paddling.BUILD.LAKE_ORIGIN, fx, fy)
    ix, iy = latlon_to_local_array(area.origin, np.array([centre]))[0]
    turn = np.linspace(0.0, 2 * math.pi, 49)
    around = np.column_stack(
        [ix + 4 * radius * np.cos(turn), iy + 4 * radius * np.sin(turn)]
    )
    around[-1] = around[0]
    assert area.band.contains(LineString(around))
    on_island = around * 0.1 + np.array([ix, iy]) * 0.9
    far = around * 0.4 + np.array([ix, iy]) * 0.6
    placed = water_fit._Placement(1.0, 0.0, np.zeros(2), around, (on_island,), 0, 0.0)
    assert not placed.in_band(area)
    clear = water_fit._Placement(1.0, 0.0, np.zeros(2), around, (far,), 0, 0.0)
    assert clear.in_band(area)


# --- With the pen down, as before ---------------------------------------------

# plan_paddling at 2 km on the fixtures, as `main` drew them before TASK-226
# (7e85452), every shape in pieces with the pen down.
BEFORE = {
    ("coast", "cat"): "c90a49773a7d7991",
    ("coast", "fish"): "7b02d372ce6bd9e0",
    ("coast", "dog_head"): "29429c7aa1362b04",
    ("coast", "rabbit_head"): "973e0e0502acb7a9",
    ("coast", "pumpkin"): "bf00307bcd0a2e52",
    ("coast", "smiley"): "cf9e055f64a12df2",
    ("coast", "ghost"): "ec13acecfbad7038",
    ("coast", "donut"): "47270f4de3ec9a12",
    ("coast", "sun"): "a70621362f255011",
    ("lake", "cat"): "f0d79e3601155c20",
    ("lake", "fish"): "4ab9478f56be3d90",
    ("lake", "dog_head"): "49e3ffd4714e74bb",
    ("lake", "rabbit_head"): "a325402707fd5578",
    ("lake", "pumpkin"): "49d83431a5272cc5",
    ("lake", "smiley"): "568b2cd9519b3005",
    ("lake", "ghost"): "0efea920cdc74c9c",
    ("lake", "donut"): "2ad78f03a99a707b",
    ("lake", "sun"): "54a970079131b5c3",
}


@pytest.mark.parametrize(("case", "before"), sorted(BEFORE.items()))
def test_with_the_pen_down_the_routes_are_those_of_before(
    case: tuple[str, str], before: str
) -> None:
    where, shape = case
    plan = _plan(where, shape, pen_up=False)
    assert plan.result.walks == []
    assert _fingerprint(plan.result.points) == before


# --- From the command line ------------------------------------------------------


def test_the_command_line_draws_the_pieces_with_the_pen_up(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    request = _request("lake", "cat", pen_up=True)
    cache = paddling._cache(tmp_path / "cache", paddling.LAKE, request)
    out = tmp_path / "cat.gpx"
    lat, lon = paddling.LAKE_START
    argv = [
        "--shape",
        "cat",
        "--distance",
        "2000",
        f"--start={lat},{lon}",
        "--activity",
        "paddling",
        "--pen-up",
        "--cache-dir",
        str(cache),
        "--out",
        str(out),
    ]
    assert cli.main(argv) == 0
    printed = capsys.readouterr().out
    assert "pen up:     3 stretches, not drawn:" in printed
    ns = {"g": "http://www.topografix.com/GPX/1/1"}
    names = [
        w.findtext("g:name", namespaces=ns) for w in ET.parse(out).iterfind("g:wpt", ns)
    ]
    assert names == ["Pause", "Resume"] * 3
    planned = plan_paddling(request, FileWaterSource(paddling.LAKE)).result.points
    assert np.allclose(paddling._gpx_points(out), planned, atol=1e-6)
