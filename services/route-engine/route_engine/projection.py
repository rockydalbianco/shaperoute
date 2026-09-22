"""Projection of normalized shapes onto WGS84 coordinates.

Pipeline: pick the phase point on the normalized curve, scale to metres,
rotate, translate so the phase point lands on the start, convert to (lat, lon).
All geometry happens in metres on the plane tangent at the start point.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

from route_engine.geo import LatLon, local_to_latlon
from route_engine.shapes.resample import Point


def perimeter(points: Sequence[Point]) -> float:
    """Length of a closed polyline whose last point repeats the first."""
    return sum(math.dist(a, b) for a, b in zip(points, points[1:], strict=False))


def initial_scale(shape: Sequence[Point], distance_m: float) -> float:
    """Metres per normalized unit so the shape's perimeter equals `distance_m`."""
    return distance_m / perimeter(shape)


def transform(
    points: Sequence[Point], scale_m: float, rotation_deg: float
) -> list[Point]:
    """Scale by `scale_m`, then rotate counterclockwise by `rotation_deg`."""
    theta = math.radians(rotation_deg)
    cos_t, sin_t = math.cos(theta), math.sin(theta)
    return [
        (scale_m * (x * cos_t - y * sin_t), scale_m * (x * sin_t + y * cos_t))
        for x, y in points
    ]


def start_at_phase(shape: Sequence[Point], phase: float) -> list[Point]:
    """Reorder a closed curve so it starts and ends at arc-length fraction `phase`.

    Phase 0 is the shape's first vertex. All original vertices are kept; the
    phase point is added when it falls between two of them.
    """
    if not 0.0 <= phase < 1.0:
        raise ValueError(f"phase must be in [0, 1), got {phase}")
    vertices = list(shape[:-1])
    total = perimeter(shape)
    target = phase * total
    # Closer than this to a vertex, the phase point *is* that vertex.
    snap = 1e-9 * total
    walked = 0.0
    for i, (a, b) in enumerate(zip(shape, shape[1:], strict=False)):
        length = math.dist(a, b)
        if walked + length > target:
            f = (target - walked) / length
            if f * length <= snap:
                ordered = vertices[i:] + vertices[:i]
            elif (1.0 - f) * length <= snap:
                ordered = vertices[i + 1 :] + vertices[: i + 1]
            else:
                phase_point = (a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]))
                ordered = [phase_point] + vertices[i + 1 :] + vertices[: i + 1]
            return ordered + [ordered[0]]
        walked += length
    return list(shape)  # phase rounds to the closing point: same as phase 0


def project_shape(
    shape: Sequence[Point],
    start: LatLon,
    scale_m: float,
    rotation_deg: float = 0.0,
    phase: float = 0.0,
) -> list[LatLon]:
    """Place a normalized closed shape on the map so it passes through `start`.

    The result starts and ends exactly at `start`.
    """
    local = transform(start_at_phase(shape, phase), scale_m, rotation_deg)
    x0, y0 = local[0]
    return [local_to_latlon(start, x - x0, y - y0) for x, y in local]
