import ast
import math
from pathlib import Path

import pytest

import route_engine.shapes
from route_engine.shapes import SHAPES, SUPPORTED_SHAPES, get_shape
from route_engine.shapes.resample import Point

N = 64


def _segments(points: list[Point]) -> list[float]:
    return [math.dist(a, b) for a, b in zip(points, points[1:], strict=False)]


@pytest.mark.parametrize("name", SUPPORTED_SHAPES)
def test_shape_has_n_vertices_and_is_closed(name: str) -> None:
    points = get_shape(name)(N)
    assert len(points) == N + 1
    assert points[-1] == points[0]
    assert len(set(points[:-1])) == N


@pytest.mark.parametrize("name", SUPPORTED_SHAPES)
def test_shape_fits_unit_square(name: str) -> None:
    for x, y in get_shape(name)(N):
        assert -1.0 <= x <= 1.0
        assert -1.0 <= y <= 1.0


@pytest.mark.parametrize("name", SUPPORTED_SHAPES)
@pytest.mark.parametrize("n_points", [16, N, 200])
def test_spacing_is_uniform_within_5_percent(name: str, n_points: int) -> None:
    segments = _segments(get_shape(name)(n_points))
    mean = sum(segments) / len(segments)
    for length in segments:
        assert abs(length - mean) / mean <= 0.05


def test_circle_points_lie_on_unit_circle() -> None:
    for x, y in get_shape("circle")(N):
        assert math.hypot(x, y) == pytest.approx(1.0, abs=1e-6)


def test_heart_is_symmetric_about_vertical_axis() -> None:
    points = get_shape("heart")(N)
    for k in range(N):
        x, y = points[k]
        mirror_x, mirror_y = points[(N - k) % N]
        assert x == pytest.approx(-mirror_x, abs=1e-6)
        assert y == pytest.approx(mirror_y, abs=1e-6)


def test_heart_keeps_both_tips() -> None:
    points = get_shape("heart")(N)
    top_notch, bottom_tip = points[0], points[N // 2]
    assert top_notch[0] == pytest.approx(0.0, abs=1e-9)
    assert bottom_tip == pytest.approx((0.0, min(y for _, y in points)), abs=1e-6)


def test_heart_is_centered_and_fills_the_square_horizontally() -> None:
    points = get_shape("heart")(N)
    xs = [x for x, _ in points]
    ys = [y for _, y in points]
    assert min(xs) == pytest.approx(-1.0, abs=1e-3)
    assert max(xs) == pytest.approx(1.0, abs=1e-3)
    assert min(ys) + max(ys) == pytest.approx(0.0, abs=1e-2)


@pytest.mark.parametrize("n_points", [0, 2])
def test_too_few_points_is_rejected(n_points: int) -> None:
    with pytest.raises(ValueError, match="at least 3 points"):
        get_shape("heart")(n_points)


def test_unknown_shape_is_rejected() -> None:
    with pytest.raises(ValueError, match="unknown shape 'star'"):
        get_shape("star")


def test_registry_and_supported_shapes_agree() -> None:
    assert set(SUPPORTED_SHAPES) == set(SHAPES)


def test_shapes_modules_import_nothing_geographic() -> None:
    allowed = {"__future__", "math", "collections.abc", "typing"}
    # Reading an outline from a file (TASK-032): nothing geographic either.
    allowed |= {"json", "dataclasses", "pathlib"}
    package_dir = Path(route_engine.shapes.__file__).parent
    for module in package_dir.glob("*.py"):
        for node in ast.walk(ast.parse(module.read_text(encoding="utf-8"))):
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom):
                names = [node.module or ""]
            else:
                continue
            for name in names:
                assert name in allowed or name.startswith(
                    "route_engine.shapes"
                ), f"{module.name} imports {name}"
