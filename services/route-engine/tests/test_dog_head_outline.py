"""The dog's head of TASK-068: a candidate, tried from the CLI (`--outline`)
until the user judges it on real roads (ADR-0036, ADR-0065); the outline is
also checked by test_outline.py.

Seen from the front, with long ears hanging beside the cheeks: the cat's
ears point up (cat.json), the dog's hang down. Eyes, nose and mouth are
strokes, drawn out and back like the cat's eyes (ADR-0039, ADR-0060).
"""

import json
import math

import pytest

from route_engine.shapes import OUTLINES
from route_engine.shapes.outline import Outline, read_outline
from route_engine.shapes.resample import Point

N = 64


def _read() -> Outline:
    return read_outline(OUTLINES / "dog_head.json")


def _file() -> dict:
    return json.loads((OUTLINES / "dog_head.json").read_text(encoding="utf-8"))


def _is_loop(stroke: tuple[Point, ...]) -> bool:
    """The stroke ends on one of its own earlier points."""
    return stroke[-1] in stroke[:-1]


def _loop(stroke: tuple[Point, ...]) -> tuple[Point, ...]:
    return stroke[stroke.index(stroke[-1]) :]


def _width(points: tuple[Point, ...]) -> float:
    xs = [x for x, _ in points]
    return max(xs) - min(xs)


def test_the_head_is_one_outline_the_engine_can_follow() -> None:
    outline = _read()
    assert outline.name == "dog_head"
    assert not outline.line
    points = outline(N)
    assert points[0] == points[-1]
    assert len(points) >= N + 1


def test_the_head_is_mirror_symmetric() -> None:
    data = _file()
    ring = data["points"][:-1]
    for k, (x, y) in enumerate(ring):
        mx, my = ring[-k]
        assert (x, y) == pytest.approx((-mx, my), abs=1e-4)
    right_eye, left_eye, middle, right_mouth, left_mouth = data["strokes"]
    for right, left in ((right_eye, left_eye), (right_mouth, left_mouth)):
        assert len(right) == len(left)
        for (x, y), (lx, ly) in zip(right, left, strict=True):
            assert (-x, y) == pytest.approx((lx, ly), abs=1e-4)
    # The line up from the chin and the nose sit on the middle.
    assert {(-x, y) for x, y in middle} == {(x, y) for x, y in middle}


def test_the_ears_hang_down_beside_the_cheeks() -> None:
    outline = _read()
    ring = list(outline.points[:-1])
    # The top of the head is the crown, in the middle: no ear stands above
    # it, as the cat's do.
    top = max(ring, key=lambda p: p[1])
    assert abs(top[0]) < 0.05
    # Clockwise from the crown, the right side: the ear down to the corner
    # where it meets the cheek, then the cheek down to the chin.
    notch = ring.index(outline.strokes[0][0])
    chin = ring.index(outline.strokes[2][0])
    ear, cheek = ring[1:notch], ring[notch + 1 : chin]
    nx, ny = ring[notch]
    # The corner turns inwards, between the ear and the cheek.
    (ax, ay), (bx, by) = ring[notch - 1], ring[notch + 1]
    assert (nx - ax) * (by - ny) - (ny - ay) * (bx - nx) > 0
    # The ear hangs well below that corner, far out beside the cheek, and
    # ends above the chin.
    bottom = min(ear, key=lambda p: p[1])
    assert bottom[1] < ny - 0.3
    assert bottom[0] > max(x for x, _ in cheek) + 0.3
    assert bottom[1] > ring[chin][1]


def test_the_eyes_hang_on_short_lines_where_the_ears_meet_the_cheeks() -> None:
    outline = _read()
    right, left = outline.strokes[:2]
    nose = _loop(outline.strokes[2])
    for eye, side in ((right, 1), (left, -1)):
        assert eye[0] in outline.points
        assert _is_loop(eye)
        # A short line, then an eye as wide as the nose, on its own side
        # and above the nose.
        assert math.dist(eye[0], eye[1]) < 0.2
        assert _width(_loop(eye)) > 0.3
        assert all(x * side > 0 for x, _ in _loop(eye))
        assert min(y for _, y in _loop(eye)) > max(y for _, y in nose)


def test_nose_and_mouth_hang_on_a_line_up_from_the_chin() -> None:
    outline = _read()
    middle, right, left = outline.strokes[2:]
    # From the chin, the lowest point of the head, straight up to the nose.
    chin = min(outline.points, key=lambda p: p[1])
    assert middle[0] == chin
    line = middle[: middle.index(middle[-1]) + 1]
    assert all(x == pytest.approx(chin[0]) for x, _ in line)
    assert [y for _, y in line] == sorted(y for _, y in line)
    # The nose: a loop across the middle, wider than the mouth.
    nose = _loop(middle)
    assert _is_loop(middle)
    assert _width(nose) > 0.3
    # The mouth: two short open lines, from one point of the line up to the
    # nose, out to either side, below the nose.
    assert right[0] == left[0]
    assert right[0] in line[1:-1]
    for mouth, sign in ((right, 1), (left, -1)):
        assert not _is_loop(mouth)
        assert all(x * sign > 0 for x, _ in mouth[1:])
        assert max(y for _, y in mouth) < min(y for _, y in nose)
        assert _width(mouth) < _width(nose)
