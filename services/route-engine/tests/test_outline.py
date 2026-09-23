"""Shapes read from a JSON outline (TASK-032)."""

import json
import math
from pathlib import Path
from typing import Any

import pytest

from route_engine.shapes import OUTLINES
from route_engine.shapes.outline import (
    InvalidOutlineError,
    Outline,
    parse_outline,
    read_outline,
)

N = 64


def _data(points: list[list[float]], **overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = {
        "name": "test",
        "source": "a test",
        "license": "none",
        "points": points,
    }
    data.update(overrides)
    return data


# A 20 × 10 rectangle far from the origin: the scale and place of the file
# do not matter.
RECTANGLE = [[100.0, 50.0], [120.0, 50.0], [120.0, 60.0], [100.0, 60.0], [100.0, 50.0]]


def _segments(points: list[tuple[float, float]]) -> list[float]:
    return [math.dist(a, b) for a, b in zip(points, points[1:], strict=False)]


def test_an_outline_is_centred_and_scaled_into_the_unit_square() -> None:
    outline = parse_outline(_data(RECTANGLE))
    assert outline.points[0] == pytest.approx((-1.0, -0.5))
    assert outline.points[-1] == outline.points[0]
    xs = [x for x, _ in outline.points]
    ys = [y for _, y in outline.points]
    assert (min(xs), max(xs), min(ys), max(ys)) == pytest.approx((-1, 1, -0.5, 0.5))


def test_an_outline_is_resampled_like_the_other_shapes() -> None:
    # A smooth outline, a 90-gon: across a corner the straight distance
    # between two points is shorter than the arc between them.
    ninety = [
        [
            100 + 7 * math.cos(2 * math.pi * k / 90),
            50 + 7 * math.sin(2 * math.pi * k / 90),
        ]
        for k in range(90)
    ]
    points = parse_outline(_data([*ninety, ninety[0]]))(N)
    assert len(points) == N + 1
    assert points[-1] == points[0]
    assert len(set(points[:-1])) == N
    segments = _segments(points)
    mean = sum(segments) / len(segments)
    assert all(abs(length - mean) / mean <= 0.05 for length in segments)


def test_repeated_points_are_ignored() -> None:
    doubled = [RECTANGLE[0], *RECTANGLE[:2], *RECTANGLE[1:]]
    assert parse_outline(_data(doubled)) == parse_outline(_data(RECTANGLE))


@pytest.mark.parametrize(
    ("points", "message"),
    [
        (RECTANGLE[:-1], "the outline is open"),
        ([[0, 0], [1, 0], [0, 0]], "at least 3 distinct points, got 2"),
        # Flat, all on one line: it folds back onto itself.
        ([[0, 0], [1, 0], [2, 0], [0, 0]], "crosses itself"),
        # A bow tie: two triangles meeting at the centre.
        ([[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]], "crosses itself"),
        # A side that folds back onto the one before it.
        ([[0, 0], [2, 0], [1, 0], [1, 1], [0, 0]], "crosses itself"),
        # Two squares touching at one corner: two pieces, not one outline.
        (
            [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [1, 2], [1, 1], [0, 1], [0, 0]],
            "crosses itself",
        ),
        ([[0, 0], [1, 0], [1, "a"], [0, 0]], "list of [x, y] numbers"),
        ([[0, 0], [1, 0], [1, 1, 1], [0, 0]], "list of [x, y] numbers"),
        ([[0, 0], [1, 0], [1, True], [0, 0]], "list of [x, y] numbers"),
        ("not a list", "list of [x, y] numbers"),
    ],
)
def test_what_is_not_one_closed_outline_is_refused(points: Any, message: str) -> None:
    with pytest.raises(InvalidOutlineError, match=message.replace("[", r"\[")):
        parse_outline(_data(points))


@pytest.mark.parametrize("key", ["name", "source", "license"])
def test_name_source_and_license_are_required(key: str) -> None:
    with pytest.raises(InvalidOutlineError, match=f"'{key}' must be"):
        parse_outline(_data(RECTANGLE, **{key: " "}))


def test_a_file_that_is_not_json_is_refused(tmp_path: Path) -> None:
    path = tmp_path / "broken.json"
    path.write_text('{"name": "star", ', encoding="utf-8")
    with pytest.raises(InvalidOutlineError, match="not valid JSON"):
        read_outline(path)


def test_a_missing_file_is_refused(tmp_path: Path) -> None:
    with pytest.raises(InvalidOutlineError, match="cannot read the file"):
        read_outline(tmp_path / "missing.json")


def test_a_json_list_is_refused() -> None:
    with pytest.raises(InvalidOutlineError, match="expected a JSON object"):
        parse_outline(RECTANGLE)


@pytest.mark.parametrize("path", sorted(OUTLINES.glob("*.json")), ids=lambda p: p.stem)
def test_every_outline_in_the_repository_is_valid(path: Path) -> None:
    outline = read_outline(path)
    assert outline.name == path.stem
    for x, y in outline(N):
        assert -1.0 - 1e-9 <= x <= 1.0 + 1e-9
        assert -1.0 - 1e-9 <= y <= 1.0 + 1e-9


def _vertices(name: str) -> list[tuple[float, float]]:
    data = json.loads((OUTLINES / f"{name}.json").read_text(encoding="utf-8"))
    return [(x, y) for x, y in data["points"][:-1]]


def _is_mirror_symmetric(outline: Outline) -> bool:
    """Vertex k mirrors vertex N - k across the vertical axis."""
    points = outline(N)
    return all(
        points[k][0] == pytest.approx(-points[(N - k) % N][0], abs=1e-6)
        and points[k][1] == pytest.approx(points[(N - k) % N][1], abs=1e-6)
        for k in range(N)
    )


def test_the_star_has_five_tips_and_five_notches() -> None:
    radii = [math.hypot(x, y) for x, y in _vertices("star")]
    assert len(radii) == 10
    assert radii[0::2] == pytest.approx([1.0] * 5, abs=1e-4)
    # A regular star: the notches lie at cos 72° / cos 36° of the tips.
    notch = math.cos(math.radians(72)) / math.cos(math.radians(36))
    assert radii[1::2] == pytest.approx([notch] * 5, abs=1e-4)
    assert _vertices("star")[0] == (0.0, 1.0)  # the top tip comes first
    assert _is_mirror_symmetric(read_outline(OUTLINES / "star.json"))


def test_the_house_has_walls_a_roof_a_chimney_and_a_door() -> None:
    roof = [(0, 1), (0.45, 0.64)]
    chimney = [(0.45, 0.95), (0.7, 0.95), (0.7, 0.44)]
    right_wall = [(1, 0.2), (1, -1)]
    door = [(0.2, -1), (0.2, -0.35), (-0.2, -0.35), (-0.2, -1)]
    left_wall = [(-1, -1), (-1, 0.2)]
    assert _vertices("house") == roof + chimney + right_wall + door + left_wall
    # The chimney rises above the roof, on the right slope (y = 1 - 0.8 x).
    assert all(y > 1 - 0.8 * x for x, y in chimney[:2])
