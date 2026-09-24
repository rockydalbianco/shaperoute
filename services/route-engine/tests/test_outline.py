"""Shapes read from a JSON outline (TASK-032), with strokes (TASK-037)."""

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
from route_engine.shapes.resample import resample_by_arc_length

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


# Strokes (TASK-037). A 4 × 4 square, scaled to [-1, 1]² by halving and
# shifting: (x, y) in the file is (x / 2 - 1, y / 2 - 1) after reading.
SQUARE = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]
BRANCH = [[4, 2], [2.5, 2]]  # from the right side inwards
WINDOW = [[0, 2], [1, 2], [1, 3], [2, 3], [2, 1], [1, 1], [1, 2]]  # hung on a line


def _read(*strokes: list[list[float]]) -> Outline:
    return parse_outline(_data(SQUARE, strokes=list(strokes)))


def _file(x: float, y: float) -> tuple[float, float]:
    return x / 2 - 1, y / 2 - 1


def _sides(path: list[tuple[float, float]]) -> list[frozenset[tuple[float, float]]]:
    return [frozenset(side) for side in zip(path, path[1:], strict=False)]


def test_without_strokes_an_outline_is_resampled_as_before() -> None:
    plain = parse_outline(_data(RECTANGLE))
    assert parse_outline(_data(RECTANGLE, strokes=[])) == plain
    assert plain(N) == resample_by_arc_length(plain.points, N)
    for path in OUTLINES.glob("*.json"):
        outline = read_outline(path)
        if not outline.strokes and not outline.line:
            assert outline(N) == resample_by_arc_length(outline.points, N)


def test_a_line_is_drawn_out_and_back_where_it_starts() -> None:
    path = _read(BRANCH).path()
    corners = [_file(*p) for p in SQUARE]
    start, tip = _file(4, 2), _file(2.5, 2)
    assert path == [*corners[:2], start, tip, start, *corners[2:]]


def test_a_loop_is_drawn_once_and_its_line_twice() -> None:
    path = _read(WINDOW).path()
    sides = _sides(path)
    line = frozenset((_file(0, 2), _file(1, 2)))
    assert sides.count(line) == 2
    loop = _sides([_file(*p) for p in WINDOW[1:]])
    assert all(sides.count(side) == 1 for side in loop)
    assert path[0] == path[-1]


def test_a_stroke_may_start_on_an_earlier_stroke() -> None:
    twig = [[3, 2], [3, 3]]
    path = _read(BRANCH, twig).path()
    corners = [_file(*p) for p in SQUARE]
    start, fork, end = _file(4, 2), _file(3, 2), _file(2.5, 2)
    # Out along the branch, up the twig and back at the fork, on to the end
    # of the branch and back to where it started.
    twig_tip = _file(3, 3)
    assert path == [*corners[:2], start, fork, twig_tip, fork, end, start, *corners[2:]]


def test_a_start_close_to_a_line_is_moved_onto_it() -> None:
    near = _read([[4.001, 2], [2.5, 2]])
    assert near.strokes == _read(BRANCH).strokes
    # Close to a corner, the stroke starts at the corner.
    corner = _read([[4, 0.002], [2, 2]])
    assert corner.strokes[0][0] == _file(4, 0)


def test_strokes_are_resampled_keeping_every_vertex() -> None:
    outline = _read(WINDOW, BRANCH)
    path = outline.path()
    points = outline(N)
    assert len(points) == N + 1
    assert points[0] == points[-1]
    assert all(vertex in points for vertex in path)


@pytest.mark.parametrize(
    ("strokes", "message"),
    [
        ([[[2, 2], [3, 3]]], "stroke 1 does not start on the outline"),
        ([[[4, 2]]], "stroke 1 needs at least 2 distinct points"),
        ([[[4, 2], [-1, 2]]], "stroke 1 crosses the outline"),
        ([[[4, 2], [4, 3]]], "stroke 1 crosses the outline"),  # along a side
        ([BRANCH, [[3, 0], [3, 3]]], "strokes 1 and 2 cross"),
        ([[[4, 2], [2, 2], [3, 2]]], "stroke 1 folds back onto itself"),
        ([[[4, 2], [1, 2], [2, 3], [2, 1]]], "stroke 1 crosses itself"),
        ([[[4, 2], [3, 2], [2, 3], [3, 2]]], "loop of fewer than 3 distinct points"),
        ([[[4, 2], [3, "a"]]], "list of lines"),
        ("not a list", "list of lines"),
    ],
)
def test_strokes_that_cannot_be_drawn_are_refused(strokes: Any, message: str) -> None:
    with pytest.raises(InvalidOutlineError, match=message.replace("[", r"\[")):
        parse_outline(_data(SQUARE, strokes=strokes))


def test_a_stroke_may_stick_out_of_the_outline() -> None:
    # Like a whisker: the drawing, now 5 wide, is scaled by its width.
    whisker = _read([[4, 2], [5, 2]])
    expected = [(0.6, 0.0), (1.0, 0.0), (0.6, 0.0)]
    assert whisker.path()[2:5] == [pytest.approx(p) for p in expected]


# A path (TASK-040): an L drawn down and right, then back the same way.
L_PATH = [[0, 2], [0, 0], [1, 0], [0, 0], [0, 2]]


def _path_data(path: Any, **overrides: Any) -> dict[str, Any]:
    data = _data([], path=path, **overrides)
    del data["points"]
    return data


def test_a_path_is_drawn_as_it_is() -> None:
    outline = parse_outline(_path_data(L_PATH))
    assert outline.line
    assert outline.path() == pytest.approx(
        [(-0.5, 1), (-0.5, -1), (0.5, -1), (-0.5, -1), (-0.5, 1)]
    )


def test_a_path_is_resampled_keeping_every_vertex() -> None:
    outline = parse_outline(_path_data(L_PATH))
    points = outline(N)
    assert len(points) == N + 1
    assert points[-1] == points[0]
    for vertex in outline.path():
        assert vertex in points


@pytest.mark.parametrize(
    ("path", "message"),
    [
        (L_PATH[:-1], "the path is open"),
        ([[0, 0], [0, 0]], "at least 2 distinct points"),
        ([[0, 0], [1, "a"], [0, 0]], "list of [x, y] numbers"),
        ("not a list", "list of [x, y] numbers"),
    ],
)
def test_a_path_that_cannot_be_drawn_is_refused(path: Any, message: str) -> None:
    with pytest.raises(InvalidOutlineError, match=message.replace("[", r"\[")):
        parse_outline(_path_data(path))


@pytest.mark.parametrize("key", ["points", "strokes"])
def test_a_path_does_not_go_with_points_or_strokes(key: str) -> None:
    data = _path_data(L_PATH)
    data[key] = RECTANGLE if key == "points" else []
    with pytest.raises(InvalidOutlineError, match="'path' replaces"):
        parse_outline(data)
