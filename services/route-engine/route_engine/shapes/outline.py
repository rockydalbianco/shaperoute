"""Shapes read from a file: one closed outline, as JSON (TASK-032).

    {
      "name": "star",
      "source": "where the drawing comes from",
      "license": "its licence",
      "points": [[x, y], ..., [x, y]]
    }

x grows to the right and y upwards, at any scale: the outline is centred and
scaled into [-1, 1]² like the other shapes. The last point repeats the first,
so a line that is not an outline is caught. One outline only: no holes, no
separate pieces, no crossings, because a route draws a single closed line.
"""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from route_engine.shapes.resample import Point, normalize, resample_by_arc_length


class InvalidOutlineError(ValueError):
    """The file is not one closed outline the engine can follow."""


@dataclass(frozen=True)
class Outline:
    name: str
    source: str
    license: str
    # In [-1, 1]², the first point repeated at the end.
    points: tuple[Point, ...]

    def __call__(self, n_points: int) -> list[Point]:
        """`n_points` vertices equally spaced by arc length, like any shape."""
        return resample_by_arc_length(self.points, n_points)


def read_outline(path: Path) -> Outline:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise InvalidOutlineError(f"cannot read the file: {exc.strerror}") from None
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise InvalidOutlineError(f"not valid JSON: {exc}") from None
    return parse_outline(data)


def parse_outline(data: object) -> Outline:
    if not isinstance(data, dict):
        raise InvalidOutlineError(
            "expected a JSON object with name, source, license and points"
        )
    texts = {}
    for key in ("name", "source", "license"):
        value = data.get(key)
        if not isinstance(value, str) or not value.strip():
            raise InvalidOutlineError(f"{key!r} must be a non-empty string")
        texts[key] = value.strip()
    ring = _ring(data.get("points"))
    return Outline(
        name=texts["name"],
        source=texts["source"],
        license=texts["license"],
        points=tuple(normalize([*ring, ring[0]])),
    )


def _ring(raw: object) -> list[Point]:
    """The distinct vertices of a valid closed outline, without the repeat."""
    if not isinstance(raw, list) or not all(_is_pair(p) for p in raw):
        raise InvalidOutlineError("'points' must be a list of [x, y] numbers")
    points: list[Point] = [(float(x), float(y)) for x, y in raw]
    if len(points) < 2 or points[-1] != points[0]:
        raise InvalidOutlineError(
            "the outline is open: the last point must repeat the first"
        )
    ring: list[Point] = []
    for point in points[:-1]:
        if not ring or point != ring[-1]:
            ring.append(point)
    if len(ring) > 1 and ring[-1] == ring[0]:
        ring.pop()
    if len(ring) < 3:
        raise InvalidOutlineError(
            f"an outline needs at least 3 distinct points, got {len(ring)}"
        )
    # Also catches a flat outline, all on one line: somewhere it folds back.
    crossing = _first_crossing(ring)
    if crossing is not None:
        i, j = crossing
        raise InvalidOutlineError(
            f"the outline crosses itself: the sides starting at points "
            f"{i} and {j} meet"
        )
    return ring


def _is_pair(value: object) -> bool:
    return (
        isinstance(value, list)
        and len(value) == 2
        and all(
            isinstance(v, int | float) and not isinstance(v, bool) and math.isfinite(v)
            for v in value
        )
    )


def _orient(a: Point, b: Point, c: Point) -> float:
    """Positive when a → b → c turns left, zero when they are on a line."""
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _within(a: Point, b: Point, p: Point) -> bool:
    """p, on the line through a and b, lies on the segment a-b."""
    (x0, x1), (y0, y1) = sorted((a[0], b[0])), sorted((a[1], b[1]))
    return x0 <= p[0] <= x1 and y0 <= p[1] <= y1


def _meet(p1: Point, p2: Point, q1: Point, q2: Point) -> bool:
    d1, d2 = _orient(q1, q2, p1), _orient(q1, q2, p2)
    d3, d4 = _orient(p1, p2, q1), _orient(p1, p2, q2)
    if d1 * d2 < 0 and d3 * d4 < 0:
        return True
    return (
        (d1 == 0 and _within(q1, q2, p1))
        or (d2 == 0 and _within(q1, q2, p2))
        or (d3 == 0 and _within(p1, p2, q1))
        or (d4 == 0 and _within(p1, p2, q2))
    )


def _first_crossing(ring: Sequence[Point]) -> tuple[int, int] | None:
    """The first two sides that meet, other than neighbours at their shared
    vertex; a side that folds back onto the previous one counts too."""
    n = len(ring)
    sides = [(ring[i], ring[(i + 1) % n]) for i in range(n)]
    for i, (a, b) in enumerate(sides):
        c = sides[(i + 1) % n][1]
        folds_back = (
            _orient(a, b, c) == 0
            and (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) < 0
        )
        if folds_back:
            return i, (i + 1) % n
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            if _meet(a, b, *sides[j]):
                return i, j
    return None
