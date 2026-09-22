"""Arc-length resampling of closed parametric curves."""

from __future__ import annotations

import math
from collections.abc import Callable, Sequence

Point = tuple[float, float]

# Dense samples taken along the parameter before resampling by arc length.
DENSE_SAMPLES = 4096


def sample_closed(
    curve: Callable[[float], Point], samples: int = DENSE_SAMPLES
) -> list[Point]:
    """Sample `curve` at uniform t in [0, 2π]; the last point equals the first."""
    points = [curve(2.0 * math.pi * i / samples) for i in range(samples)]
    points.append(points[0])
    return points


def resample_by_arc_length(polyline: Sequence[Point], n_points: int) -> list[Point]:
    """Return `n_points` vertices equally spaced along a closed polyline.

    The first vertex is the polyline's first point, and it is repeated at the
    end to close the curve, so the result has `n_points + 1` elements.
    """
    if n_points < 3:
        raise ValueError(f"a closed shape needs at least 3 points, got {n_points}")

    cumulative = [0.0]
    for a, b in zip(polyline, polyline[1:], strict=False):
        cumulative.append(cumulative[-1] + math.dist(a, b))
    total = cumulative[-1]

    vertices: list[Point] = []
    segment = 0
    for k in range(n_points):
        target = total * k / n_points
        while cumulative[segment + 1] < target:
            segment += 1
        length = cumulative[segment + 1] - cumulative[segment]
        f = (target - cumulative[segment]) / length if length else 0.0
        (x0, y0), (x1, y1) = polyline[segment], polyline[segment + 1]
        vertices.append((x0 + f * (x1 - x0), y0 + f * (y1 - y0)))
    vertices.append(vertices[0])
    return vertices
