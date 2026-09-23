"""Classic heart curve (docs/ROUTE_ENGINE.md §2), normalized into [-1, 1]²."""

from __future__ import annotations

import math

from route_engine.shapes.resample import (
    Point,
    normalize,
    resample_by_arc_length,
    sample_closed,
)


def _heart_xy(t: float) -> Point:
    x = 16.0 * math.sin(t) ** 3
    y = 13.0 * math.cos(t) - 5.0 * math.cos(2 * t) - 2.0 * math.cos(3 * t)
    y -= math.cos(4 * t)
    return x, y


def heart(n_points: int) -> list[Point]:
    """Start at the top notch (t = 0), so the curve is mirror-symmetric in x."""
    return resample_by_arc_length(normalize(sample_closed(_heart_xy)), n_points)
