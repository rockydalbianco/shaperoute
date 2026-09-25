"""The candidate animals of TASK-064: butterfly, bird, dog and snail.

Only tried from the CLI (`--outline`) until the user judges them on real
roads (ADR-0036); every outline is also checked by test_outline.py.
"""

import json
import math

import pytest

from route_engine.shapes import OUTLINES
from route_engine.shapes.outline import Outline, read_outline

ANIMALS = ["butterfly", "bird", "dog", "snail"]
N = 64


def _read(name: str) -> Outline:
    return read_outline(OUTLINES / f"{name}.json")


def _file(name: str) -> dict:
    return json.loads((OUTLINES / f"{name}.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("name", ANIMALS)
def test_each_animal_is_one_outline_the_engine_can_follow(name: str) -> None:
    outline = _read(name)
    assert outline.name == name
    assert not outline.line
    points = outline(N)
    assert points[0] == points[-1]
    assert len(points) >= N + 1


def test_the_butterfly_is_mirror_symmetric_with_two_antennae() -> None:
    data = _file("butterfly")
    ring = data["points"][:-1]
    for k, (x, y) in enumerate(ring):
        mx, my = ring[-k]
        assert (x, y) == pytest.approx((-mx, my), abs=1e-4)
    left, right = data["strokes"]
    assert len(left) == len(right)
    for (x, y), (rx, ry) in zip(left, right, strict=True):
        assert (-x, y) == pytest.approx((rx, ry), abs=1e-4)
    # The antennae rise above the wings.
    top = max(y for _, y in ring)
    assert max(y for _, y in right) > top


def test_the_butterfly_has_four_wings() -> None:
    # Between the upper and the lower wing the outline comes close to the
    # body on each side, and the wings reach far from it.
    ring = _file("butterfly")["points"][:-1]
    right = [(x, y) for x, y in ring if x > 0]
    notch = min((p for p in right if -0.2 < p[1] < 0.2), key=lambda p: p[0])
    assert notch[0] < 0.2
    assert max(x for x, y in right if y > notch[1]) > 0.9
    assert max(x for x, y in right if y < notch[1]) > 0.6


def test_the_bird_is_an_outline_only() -> None:
    assert _read("bird").strokes == ()


def test_the_dog_stands_on_four_legs_drawn_out_and_back() -> None:
    # Legs as strokes: the route runs down each one and back, like the
    # cat's eyes, instead of around four thin feet it cannot follow.
    *legs, tail = _read("dog").strokes
    assert len(legs) == 4
    body_bottom = min(y for _, y in _read("dog").points)
    feet = sorted(leg[-1] for leg in legs)
    assert all(foot[1] == pytest.approx(feet[0][1]) for foot in feet)
    assert all(foot[1] < body_bottom - 0.3 for foot in feet)
    # Two pairs, each leg apart from the next.
    assert all(b[0] - a[0] > 0.15 for a, b in zip(feet, feet[1:], strict=False))
    # The tail rises behind the body.
    assert tail[-1][1] > tail[0][1]
    assert tail[-1][0] < min(x for x, _ in _read("dog").points)


def test_the_snail_has_a_spiral_shell_and_two_horns() -> None:
    outline = _read("snail")
    spiral, *horns = outline.strokes
    assert len(horns) == 2
    # After the line that hangs it on the shell, the spiral goes most of the
    # way around its middle and ends much nearer to it than it began.
    coil = spiral[1:]
    cx = sum(x for x, _ in coil) / len(coil)
    cy = sum(y for _, y in coil) / len(coil)
    radii = [math.hypot(x - cx, y - cy) for x, y in coil]
    assert radii[-1] < radii[0] / 2
    turned = 0.0
    for (x0, y0), (x1, y1) in zip(coil, coil[1:], strict=False):
        a0, a1 = math.atan2(y0 - cy, x0 - cx), math.atan2(y1 - cy, x1 - cx)
        turned += (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
    assert abs(turned) > 1.5 * math.pi
    # The horns point up from the head, at the front.
    for horn in horns:
        assert horn[-1][1] > horn[0][1]
        assert horn[0][0] > 0.5
