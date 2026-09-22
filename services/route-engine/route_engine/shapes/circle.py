"""Unit circle: x = cos t, y = sin t."""

from __future__ import annotations

import math

from route_engine.shapes.resample import Point, resample_by_arc_length, sample_closed


def _circle_xy(t: float) -> Point:
    return math.cos(t), math.sin(t)


def circle(n_points: int) -> list[Point]:
    return resample_by_arc_length(sample_closed(_circle_xy), n_points)
