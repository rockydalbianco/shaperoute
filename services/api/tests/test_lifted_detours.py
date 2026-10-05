"""The walks of a piece's detours fit in a result (TASK-242, ADR-0208): the
engine stops lifting the pen where the API's results end."""

from __future__ import annotations

from route_engine import detours
from route_engine.models import RouteResult
from route_engine.pieces import compose_shape

from shaperoute_api.schemas import MAX_WALKS, PEN_UP_SHAPES, RouteResultBody


def test_the_engine_lifts_no_more_walks_than_a_result_holds() -> None:
    assert detours.MAX_WALKS == MAX_WALKS


def test_every_shape_in_pieces_keeps_the_walks_between_its_pieces() -> None:
    # The sun, with most pieces, has one walk left for a detour; the others
    # more.
    between = {name: len(compose_shape(name).letters) - 1 for name in PEN_UP_SHAPES}
    assert max(between.values()) == between["sun"] == detours.MAX_WALKS - 1


def test_a_result_with_a_detour_walked_is_a_result() -> None:
    # A smiling face: three walks between its pieces, one inside the mouth.
    points = [(46.0 + i / 1000, 11.0) for i in range(12)]
    walks = [(1, 2), (4, 5), (7, 8), (9, 10)]
    face = RouteResult(
        points=points, distance_m=1200.0, similarity=0.8, shape="smiley", walks=walks
    )
    assert RouteResultBody.from_result(face).walks == walks
