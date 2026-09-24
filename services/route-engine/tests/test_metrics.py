import math

import pytest

from route_engine.geo import local_to_latlon
from route_engine.metrics import (
    SIMILARITIES,
    corners,
    corners_missed,
    cover_tolerance_m,
    coverage,
    fit_similarity,
    frechet_m,
    hausdorff_m,
    shape_similarity,
    shape_size,
)
from route_engine.projection import initial_scale, project_shape
from route_engine.shapes import get_shape

LEVICO = (46.0122, 11.2986)


def _projected(name: str, distance_m: float = 5000.0, rotation: float = 0.0) -> list:
    shape = get_shape(name)(64)
    return project_shape(shape, LEVICO, initial_scale(shape, distance_m), rotation)


def _square(side_m: float) -> list[tuple[float, float]]:
    corners = [(0, 0), (side_m, 0), (side_m, side_m), (0, side_m), (0, 0)]
    return [local_to_latlon(LEVICO, x, y) for x, y in corners]


def test_shape_size_is_the_radius_of_a_circle_as_long() -> None:
    assert shape_size(_square(1000.0)) == pytest.approx(4000.0 / (2 * math.pi))


@pytest.mark.parametrize("name", sorted(SIMILARITIES))
def test_a_shape_is_fully_similar_to_itself(name: str) -> None:
    heart = _projected("heart")
    assert SIMILARITIES[name](heart, heart) == pytest.approx(1.0, abs=0.01)


@pytest.mark.parametrize("name", sorted(SIMILARITIES))
def test_clearly_different_shapes_score_low(name: str) -> None:
    # The same heart turned upside down around the start: same length,
    # same start, a different drawing.
    heart = _projected("heart")
    flipped = _projected("heart", rotation=180.0)
    assert SIMILARITIES[name](flipped, heart) < 0.5


def test_coverage_counts_the_part_of_the_outline_the_route_follows() -> None:
    square = _square(1000.0)
    half = square[:3]  # two sides out of four
    assert coverage(half, square, tolerance_m=1.0) == pytest.approx(0.5, abs=0.01)


def test_hausdorff_is_the_worst_gap_either_way() -> None:
    square = _square(1000.0)
    shifted = [local_to_latlon(LEVICO, 30.0, 0.0)] + square[1:-1]
    shifted.append(shifted[0])
    assert hausdorff_m(shifted, square) == pytest.approx(30.0, abs=0.5)


def test_frechet_sees_the_order_hausdorff_ignores() -> None:
    # The same square walked the other way round: every point lies on the
    # outline, but a quarter of the way one walker is at the south-east
    # corner and the other at the north-west one; the best pairing of the
    # two walks still leaves them a side (1000 m) apart.
    square = _square(1000.0)
    backwards = list(reversed(square))
    assert hausdorff_m(backwards, square) == pytest.approx(0.0, abs=0.5)
    assert frechet_m(backwards, square) > 900.0


def test_fit_penalizes_a_loop_that_coverage_ignores() -> None:
    # The square plus an out-and-back to its centre: the outline is all
    # covered, but about a quarter of the route is inside the shape.
    square = _square(1000.0)
    centre = local_to_latlon(LEVICO, 500.0, 500.0)
    detour = square[:1] + [centre, square[0]] + square[1:]
    assert coverage(detour, square, tolerance_m=20.0) == pytest.approx(1.0)
    assert fit_similarity(detour, square) < 0.95
    assert fit_similarity(square, square) == pytest.approx(1.0)


def test_the_heart_has_two_corners_and_the_circle_none() -> None:
    heart = _projected("heart")
    found = corners(heart)
    assert len(found) == 2
    assert heart[0] in found  # the dip, where phase 0 starts
    assert corners(_projected("circle")) == []


def test_missing_the_tip_of_the_heart_costs_similarity() -> None:
    # The route follows the whole heart but cuts straight across its tip.
    heart = _projected("heart")
    tip = max(range(len(heart)), key=lambda i: -heart[i][0])  # southmost point
    cut = heart[: tip - 3] + heart[tip + 4 :]
    tolerance = 0.02 * shape_size(heart) * 2 * math.pi
    assert corners_missed(heart, heart, tolerance) == 0
    assert corners_missed(cut, heart, tolerance) == 1
    assert shape_similarity(cut, heart) == pytest.approx(
        fit_similarity(cut, heart) - 0.10
    )


def test_a_shape_with_strokes_is_judged_finer() -> None:
    # A 1 km square, and the same with a 250 m line in from a side and back:
    # the strokes make the details the tolerance must see (ADR-0039).
    plain = _square(1000.0)
    points = [(0, 0), (1000, 0), (1000, 500), (750, 500), (1000, 500)]
    points += [(1000, 1000), (0, 1000), (0, 0)]
    stroked = [local_to_latlon(LEVICO, x, y) for x, y in points]
    assert cover_tolerance_m(plain) == pytest.approx(0.02 * 4000, rel=1e-6)
    assert cover_tolerance_m(stroked) == pytest.approx(0.5 * 0.02 * 4500, rel=1e-6)
