"""The shapes in pieces of the catalogue (TASK-223 part B): a request with the
pen up draws each piece on its own, as the CLI does; with the pen down they
are joined, as every shape of the catalogue."""

import pytest
from test_pieces import TRENTO, _Source

from route_engine.models import (
    PEN_UP_WITHOUT_PIECES,
    InvalidRequestError,
    RouteRequest,
)
from route_engine.nearby_starts import ShapeJob
from route_engine.optimizer import DISTANCE_TOLERANCE, plan_route
from route_engine.pen_up import drawn_m, walks_problem
from route_engine.pieces import NoPiecesError, compose_shape
from route_engine.shapes import SHAPES, in_pieces


def _request(shape: str, **fields: object) -> RouteRequest:
    return RouteRequest(start=TRENTO, shape=shape, distance_m=6000, **fields)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "shape", ["smiley", "ghost", "donut", "sun", "cat", "fish", "pumpkin"]
)
def test_a_shape_in_pieces_may_be_asked_with_the_pen_up(shape: str) -> None:
    assert in_pieces(shape)
    assert _request(shape, pen_up=True).pen_up


@pytest.mark.parametrize("shape", ["heart", "circle", "star", "christmas_tree"])
def test_a_shape_without_pieces_is_refused_with_the_pen_up(shape: str) -> None:
    assert not in_pieces(shape)
    with pytest.raises(InvalidRequestError) as exc:
        _request(shape, pen_up=True)
    assert str(exc.value) == f"{PEN_UP_WITHOUT_PIECES}; {shape} has none"
    with pytest.raises(NoPiecesError):
        compose_shape(shape)


def test_on_the_water_a_shape_in_pieces_may_have_the_pen_up_too() -> None:
    # Its pieces are placed on the water as well (TASK-226, test_water_pieces).
    on_water = {"start": TRENTO, "shape": "donut", "distance_m": 3000}
    assert RouteRequest(**on_water, activity="paddling", pen_up=True).pen_up  # type: ignore[arg-type]
    assert not RouteRequest(**on_water, activity="paddling").pen_up  # type: ignore[arg-type]
    with pytest.raises(InvalidRequestError, match=PEN_UP_WITHOUT_PIECES):
        RouteRequest(**{**on_water, "shape": "heart"}, activity="paddling", pen_up=True)  # type: ignore[arg-type]


def test_the_shapes_in_pieces_have_their_pieces() -> None:
    # The outline, then each piece: so many lines, one walk fewer.
    names = [name for name in SHAPES if in_pieces(name)]
    lines = {name: len(compose_shape(name).letters) for name in names}
    assert {k: lines[k] for k in ("smiley", "ghost", "donut", "sun")} == {
        "smiley": 4,
        "ghost": 3,
        "donut": 2,
        "sun": 9,
    }
    assert all(compose_shape(name).kind == "piece" for name in lines)


def test_with_the_pen_up_the_route_walks_from_each_piece_to_the_next() -> None:
    result = plan_route(_request("smiley", pen_up=True), _Source()).result
    assert result.shape == "smiley" and result.word is None
    assert len(result.walks) == 3
    assert walks_problem(result.walks, len(result.points)) is None
    drawn = drawn_m(result.points, result.distance_m, result.walks)
    assert abs(drawn / 6000 - 1) <= DISTANCE_TOLERANCE
    assert result.distance_m > drawn


def test_with_the_pen_down_a_shape_in_pieces_is_one_closed_route() -> None:
    result = plan_route(_request("sun"), _Source()).result
    assert result.shape == "sun" and result.walks == []
    assert abs(result.distance_m / 6000 - 1) <= DISTANCE_TOLERANCE
    assert result.points[0] == result.points[-1]


def test_a_job_from_any_start_draws_the_pieces_as_the_request_asks() -> None:
    up = ShapeJob.of_request(_request("ghost", pen_up=True))
    assert up.word is not None and up.word.kind == "piece" and up.word.pen_up
    assert up.name == "ghost" and not up.word_result
    down = ShapeJob.of_request(_request("ghost"))
    assert down.word is None and down.name == "ghost"
