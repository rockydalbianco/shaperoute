"""Classic heart curve (docs/ROUTE_ENGINE.md §2), normalized into [-1, 1]²."""

from __future__ import annotations

import math

from route_engine.shapes.resample import Point, resample_by_arc_length, sample_closed


def _heart_xy(t: float) -> Point:
    x = 16.0 * math.sin(t) ** 3
    y = 13.0 * math.cos(t) - 5.0 * math.cos(2 * t) - 2.0 * math.cos(3 * t)
    y -= math.cos(4 * t)
    return x, y


def _normalize(points: list[Point]) -> list[Point]:
    """Center the bounding box on the origin and scale uniformly into [-1, 1]²."""
    xs = [x for x, _ in points]
    ys = [y for _, y in points]
    cx = (min(xs) + max(xs)) / 2.0
    cy = (min(ys) + max(ys)) / 2.0
    half = max(max(xs) - min(xs), max(ys) - min(ys)) / 2.0
    return [((x - cx) / half, (y - cy) / half) for x, y in points]


def heart(n_points: int) -> list[Point]:
    """Start at the top notch (t = 0), so the curve is mirror-symmetric in x."""
    return resample_by_arc_length(_normalize(sample_closed(_heart_xy)), n_points)
