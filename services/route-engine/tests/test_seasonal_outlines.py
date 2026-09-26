"""The candidate shapes of TASK-078: a rabbit's head, a Halloween pumpkin and
a Christmas tree. Only tried from the CLI (`--outline`) until the user
judges them on real roads (ADR-0036, ADR-0073); every outline is also
checked by test_outline.py.

As for the dog's head (ADR-0065), the silhouette is in the outline and the
thin details are strokes, drawn out and back (ADR-0039, ADR-0060).
"""

import json
import math

import pytest

from route_engine.shapes import OUTLINES
from route_engine.shapes.outline import Outline, read_outline
from route_engine.shapes.resample import Point

SHAPES = ["rabbit_head", "pumpkin", "christmas_tree"]
N = 64


def _read(name: str) -> Outline:
    return read_outline(OUTLINES / f"{name}.json")


def _file(name: str) -> dict:
    return json.loads((OUTLINES / f"{name}.json").read_text(encoding="utf-8"))


def _is_loop(stroke: tuple[Point, ...]) -> bool:
    """The stroke ends on one of its own earlier points."""
    return stroke[-1] in stroke[:-1]


def _loop(stroke: tuple[Point, ...]) -> tuple[Point, ...]:
    return stroke[stroke.index(stroke[-1]) :]


def _width(points: tuple[Point, ...] | list[Point]) -> float:
    xs = [x for x, _ in points]
    return max(xs) - min(xs)


def _assert_mirror_ring(ring: list[list[float]]) -> None:
    for k, (x, y) in enumerate(ring):
        mx, my = ring[-k]
        assert (x, y) == pytest.approx((-mx, my), abs=1e-4)


def _assert_mirror_strokes(right: list, left: list) -> None:
    assert len(right) == len(left)
    for (x, y), (lx, ly) in zip(right, left, strict=True):
        assert (-x, y) == pytest.approx((lx, ly), abs=1e-4)


@pytest.mark.parametrize("name", SHAPES)
def test_each_shape_is_one_outline_the_engine_can_follow(name: str) -> None:
    outline = _read(name)
    assert outline.name == name
    assert not outline.line
    points = outline(N)
    assert points[0] == points[-1]
    assert len(points) >= N + 1


# The rabbit's head -----------------------------------------------------------


def test_the_rabbit_is_mirror_symmetric() -> None:
    data = _file("rabbit_head")
    _assert_mirror_ring(data["points"][:-1])
    right_eye, left_eye, middle, right_mouth, left_mouth = data["strokes"]
    _assert_mirror_strokes(right_eye, left_eye)
    _assert_mirror_strokes(right_mouth, left_mouth)
    assert {(-x, y) for x, y in middle} == {(x, y) for x, y in middle}


def test_the_rabbit_has_two_long_ears_standing_up() -> None:
    outline = _read("rabbit_head")
    ring = list(outline.points[:-1])
    # Clockwise from the dip between the ears: the right ear, up to its tip
    # and down to the corner where it meets the head (where the eye hangs).
    corner = ring.index(outline.strokes[0][0])
    chin = ring.index(outline.strokes[2][0])
    dip, ear, head = ring[0], ring[1 : corner + 1], ring[corner : chin + 1]
    tip = max(ear, key=lambda p: p[1])
    # The ear tips are the highest points, well above the head: the ears
    # stand at least two thirds as tall as the head, unlike the cat's and
    # the dog's.
    assert tip[1] == max(y for _, y in ring)
    assert tip[1] - dip[1] > 2 / 3 * (dip[1] - ring[chin][1])
    # Each ear stands up on its own side, narrow: less than half as wide as
    # the head, and the dip between them comes down two fifths of the way.
    assert all(x > 0 for x, _ in ear)
    assert _width(ear) < 0.5 * 2 * max(x for x, _ in head)
    assert dip[1] < tip[1] - 0.4 * (tip[1] - ring[chin][1])


def test_the_rabbits_eyes_hang_where_the_ears_meet_the_head() -> None:
    outline = _read("rabbit_head")
    right, left = outline.strokes[:2]
    nose = _loop(outline.strokes[2])
    for eye, side in ((right, 1), (left, -1)):
        assert eye[0] in outline.points
        assert _is_loop(eye)
        assert math.dist(eye[0], eye[1]) < 0.2
        # An eye as wide as the nose, on its own side, above the nose.
        assert _width(_loop(eye)) >= _width(nose) - 1e-9
        assert all(x * side > 0 for x, _ in _loop(eye))
        assert min(y for _, y in _loop(eye)) > max(y for _, y in nose)


def test_the_rabbits_nose_and_mouth_hang_on_a_line_up_from_the_chin() -> None:
    outline = _read("rabbit_head")
    middle, right, left = outline.strokes[2:]
    chin = min(outline.points, key=lambda p: p[1])
    assert middle[0] == chin
    line = middle[: middle.index(middle[-1]) + 1]
    assert all(x == pytest.approx(chin[0]) for x, _ in line)
    assert [y for _, y in line] == sorted(y for _, y in line)
    nose = _loop(middle)
    assert _is_loop(middle)
    assert right[0] == left[0]
    assert right[0] in line[1:-1]
    for mouth, sign in ((right, 1), (left, -1)):
        assert not _is_loop(mouth)
        assert all(x * sign > 0 for x, _ in mouth[1:])
        assert max(y for _, y in mouth) < min(y for _, y in nose)


# The pumpkin -----------------------------------------------------------------


def test_the_pumpkin_is_round_with_a_stem_on_top() -> None:
    outline = _read("pumpkin")
    ring = list(outline.points[:-1])
    top = max(ring, key=lambda p: p[1])
    # The stem is the highest point, narrow, near the middle, and leans.
    stem = [p for p in ring if p[1] > top[1] - 0.15]
    assert _width(stem) < 0.2 * _width(ring)
    assert abs(top[0]) < 0.2
    assert top[0] != pytest.approx(-top[0])
    # Without the stem, the pumpkin is wider than it is tall.
    body = [p for p in ring if p not in stem]
    height = max(y for _, y in body) - min(y for _, y in body)
    assert _width(body) > height


def test_the_pumpkin_has_three_lobes() -> None:
    data = _file("pumpkin")
    ring = data["points"][:-1]
    # Seen from the front, the lobes meet in notches, two above and two
    # below: the outline dips inwards between the middle and each side.
    right_eye, left_eye = data["strokes"][:2]
    for notch, side in ((right_eye[0], 1), (left_eye[0], -1)):
        assert notch in ring
        k = ring.index(notch)
        before, after = ring[k - 1], ring[k + 1]
        assert before[1] > notch[1] and after[1] > notch[1]
        assert notch[0] * side > 0
    below = [p for p in ring if p[1] < 0]
    bottom = min(p[1] for p in below)
    lows = [
        p
        for k, p in enumerate(ring)
        if p[1] < 0 and ring[k - 1][1] < p[1] and ring[(k + 1) % len(ring)][1] < p[1]
    ]
    assert len(lows) == 2
    assert all(p[1] > bottom for p in lows)
    assert sorted(x for x, _ in lows) == pytest.approx(
        [-right_eye[0][0], right_eye[0][0]]
    )


def test_the_pumpkins_eyes_and_grin_are_carved_strokes() -> None:
    outline = _read("pumpkin")
    right, left, grin = outline.strokes
    # Two triangular eyes, hung from the upper notches.
    for eye, side in ((right, 1), (left, -1)):
        assert eye[0] in outline.points
        assert _is_loop(eye)
        assert len(set(_loop(eye))) == 3
        assert all(x * side > 0 for x, _ in _loop(eye))
    # A grin hung from the bottom of the middle lobe: a loop more than twice
    # as wide as an eye, below them.
    lowest = min(outline.points, key=lambda p: p[1])
    assert grin[0] == lowest
    assert _is_loop(grin)
    mouth = _loop(grin)
    assert _width(mouth) > 2 * _width(_loop(right))
    assert max(y for _, y in mouth) < min(y for _, y in _loop(right))


# The Christmas tree ----------------------------------------------------------


def test_the_christmas_tree_is_mirror_symmetric() -> None:
    data = _file("christmas_tree")
    _assert_mirror_ring(data["points"][:-1])
    (star,) = data["strokes"]
    assert {(-round(x, 4), y) for x, y in star} == {(round(x, 4), y) for x, y in star}


def test_the_christmas_tree_has_three_tiers_and_a_trunk() -> None:
    ring = _file("christmas_tree")["points"][:-1]
    # Clockwise from the tip, the right side: three tiers, each an outer
    # corner out and a notch back in, then the trunk.
    tip, *side = ring[: ring.index([0.0, -1.0]) + 1]
    tiers = side[:6]
    outers, inners = tiers[0::2], tiers[1::2]
    assert tip[0] == 0 and tip[1] == max(y for _, y in ring)
    assert [x for x, _ in outers] == sorted(x for x, _ in outers)
    assert [y for _, y in outers] == sorted((y for _, y in outers), reverse=True)
    for outer, inner in zip(outers, inners, strict=True):
        assert inner[0] < outer[0] - 0.2
        # The tier's bottom edge rises from the corner to the notch.
        assert inner[1] >= outer[1]
    trunk = side[5:]
    assert max(x for x, _ in trunk) < min(x for x, _ in outers)
    assert min(y for _, y in trunk) < inners[-1][1]


def test_the_christmas_tree_has_a_star_on_top() -> None:
    outline = _read("christmas_tree")
    (star,) = outline.strokes
    tip = max(outline.points, key=lambda p: p[1])
    # Hung on the tip, a five-pointed star above everything.
    assert star[0] == tip
    assert _is_loop(star)
    points = _loop(star)[:-1]
    assert len(points) == 10
    assert min(y for _, y in points) > tip[1]
    centre = (sum(x for x, _ in points) / 10, sum(y for _, y in points) / 10)
    radii = [math.dist(centre, p) for p in points]
    assert radii[1::2] == pytest.approx([max(radii)] * 5, abs=1e-3)
    assert radii[0::2] == pytest.approx([min(radii)] * 5, abs=1e-3)
    assert min(radii) < 0.6 * max(radii)
