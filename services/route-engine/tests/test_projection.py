import math

import pytest

from route_engine.geo import (
    EARTH_RADIUS_M,
    haversine_m,
    latlon_to_local,
    local_to_latlon,
    path_length_m,
)
from route_engine.projection import (
    initial_scale,
    perimeter,
    project_shape,
    start_at_phase,
    transform,
)
from route_engine.shapes import SUPPORTED_SHAPES, get_shape

LEVICO = (46.0122, 11.2986)
ONE_DEGREE_M = EARTH_RADIUS_M * math.pi / 180  # ≈ 111 195 m


def _flat(points: list[tuple[float, float]]) -> list[float]:
    return [c for point in points for c in point]


def test_known_point_one_degree_north() -> None:
    lat, lon = local_to_latlon(LEVICO, 0.0, ONE_DEGREE_M)
    assert lat == pytest.approx(LEVICO[0] + 1.0, abs=1e-12)
    assert lon == pytest.approx(LEVICO[1], abs=1e-12)


def test_known_point_one_degree_east_at_60_north() -> None:
    # At 60°N a degree of longitude is half a degree of latitude long.
    lat, lon = local_to_latlon((60.0, 0.0), ONE_DEGREE_M / 2, 0.0)
    assert lat == pytest.approx(60.0, abs=1e-12)
    assert lon == pytest.approx(1.0, abs=1e-9)


def test_local_and_latlon_round_trip() -> None:
    point = local_to_latlon(LEVICO, 1234.5, -678.9)
    assert latlon_to_local(LEVICO, point) == pytest.approx((1234.5, -678.9))


def test_haversine_one_degree_of_latitude() -> None:
    assert haversine_m((0.0, 0.0), (1.0, 0.0)) == pytest.approx(ONE_DEGREE_M)


def test_rotation_by_90_degrees_is_counterclockwise() -> None:
    [(x, y)] = transform([(1.0, 0.0)], scale_m=1.0, rotation_deg=90.0)
    assert (x, y) == pytest.approx((0.0, 1.0), abs=1e-12)


def test_rotation_by_360_degrees_is_identity() -> None:
    heart = get_shape("heart")(64)
    rotated = transform(heart, 1.0, 360.0)
    assert _flat(rotated) == pytest.approx(_flat(heart), abs=1e-12)


def test_rotations_and_scales_compose() -> None:
    heart = get_shape("heart")(64)
    twice = transform(transform(heart, 2.0, 30.0), 3.0, 60.0)
    once = transform(heart, 6.0, 90.0)
    assert _flat(twice) == pytest.approx(_flat(once), abs=1e-9)


def test_initial_scale_matches_perimeter() -> None:
    circle = get_shape("circle")(64)
    scale = initial_scale(circle, 5000.0)
    assert perimeter(circle) * scale == pytest.approx(5000.0)


@pytest.mark.parametrize("name", SUPPORTED_SHAPES)
@pytest.mark.parametrize("phase", [0.0, 0.3, 0.5])
@pytest.mark.parametrize("rotation_deg", [0.0, 37.0])
def test_projected_shape_passes_through_start(
    name: str, phase: float, rotation_deg: float
) -> None:
    shape = get_shape(name)(64)
    route = project_shape(
        shape, LEVICO, initial_scale(shape, 5000.0), rotation_deg, phase
    )
    assert route[0] == LEVICO
    assert route[-1] == LEVICO


@pytest.mark.parametrize("name", SUPPORTED_SHAPES)
@pytest.mark.parametrize("distance_m", [1_000.0, 5_000.0, 50_000.0])
def test_projected_perimeter_matches_target_within_1_percent(
    name: str, distance_m: float
) -> None:
    shape = get_shape(name)(64)
    route = project_shape(shape, LEVICO, initial_scale(shape, distance_m), 25.0, 0.4)
    assert path_length_m(route) == pytest.approx(distance_m, rel=0.01)


def test_doubling_scale_doubles_perimeter() -> None:
    heart = get_shape("heart")(64)
    scale = initial_scale(heart, 5000.0)
    single = path_length_m(project_shape(heart, LEVICO, scale))
    double = path_length_m(project_shape(heart, LEVICO, 2 * scale))
    assert double == pytest.approx(2 * single, rel=1e-4)


def test_phase_zero_keeps_vertex_order() -> None:
    heart = get_shape("heart")(64)
    assert start_at_phase(heart, 0.0) == heart


def test_phase_on_a_vertex_rotates_the_vertex_list() -> None:
    circle = get_shape("circle")(64)
    shifted = start_at_phase(circle, 0.5)
    assert len(shifted) == len(circle)
    assert shifted[0] == pytest.approx((-1.0, 0.0), abs=1e-9)


def test_phase_between_vertices_adds_the_start_and_keeps_every_vertex() -> None:
    heart = get_shape("heart")(64)
    shifted = start_at_phase(heart, 0.3)
    assert len(shifted) == len(heart) + 1
    assert set(heart) <= set(shifted)
    assert perimeter(shifted) == pytest.approx(perimeter(heart))


@pytest.mark.parametrize("phase", [-0.1, 1.0])
def test_phase_out_of_range_is_rejected(phase: float) -> None:
    with pytest.raises(ValueError, match="phase must be in"):
        start_at_phase(get_shape("circle")(64), phase)
