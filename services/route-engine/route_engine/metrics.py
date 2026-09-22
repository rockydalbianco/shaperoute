"""Distance and shape-similarity metrics (docs/ROUTE_ENGINE.md §5).

Every metric compares a route with the theoretical shape it was drawn from,
both as WGS84 points, in metres on the plane tangent at the shape's start.
Similarities are in [0, 1], 1 meaning the route lies on the shape.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Sequence

import numpy as np

from route_engine.geo import LatLon, latlon_to_local_array
from route_engine.network import distance_to_polyline

# Coverage tolerance, as a fraction of the shape perimeter (100 m at 5 km).
COVER_TOLERANCE = 0.02
# Points per curve for the discrete Fréchet distance.
FRECHET_POINTS = 128
# Spacing of the samples along the outline, in metres.
SAMPLE_STEP_M = 10.0


def _local(origin: LatLon, points: Sequence[LatLon]) -> np.ndarray:
    return latlon_to_local_array(origin, np.array(points))


def _closed(xy: np.ndarray) -> np.ndarray:
    return xy if np.allclose(xy[0], xy[-1]) else np.vstack([xy, xy[:1]])


def _length(xy: np.ndarray) -> float:
    return float(np.hypot(*np.diff(xy, axis=0).T).sum())


def _resample(xy: np.ndarray, n: int) -> np.ndarray:
    """`n` points equally spaced along a polyline, first point included."""
    cumulative = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(xy, axis=0).T))])
    targets = np.linspace(0.0, cumulative[-1], n)
    return np.column_stack(
        [
            np.interp(targets, cumulative, xy[:, 0]),
            np.interp(targets, cumulative, xy[:, 1]),
        ]
    )


def _dense(xy: np.ndarray, step_m: float = SAMPLE_STEP_M) -> np.ndarray:
    return _resample(xy, max(2, math.ceil(_length(xy) / step_m) + 1))


def shape_size(shape: Sequence[LatLon]) -> float:
    """Characteristic size of a closed shape: radius of a circle as long (m)."""
    return _length(_closed(_local(shape[0], shape))) / (2 * math.pi)


def coverage(
    route: Sequence[LatLon], shape: Sequence[LatLon], tolerance_m: float
) -> float:
    """Share of the shape outline with the route within `tolerance_m`.

    A route that skips part of the shape scores low even if its length is
    right; one that also wanders elsewhere is not penalized here.
    """
    origin = shape[0]
    outline = _dense(_closed(_local(origin, shape)))
    d = distance_to_polyline(_local(origin, route), outline)
    return float((d <= tolerance_m).mean())


def precision(
    route: Sequence[LatLon], shape: Sequence[LatLon], tolerance_m: float
) -> float:
    """Share of the route length within `tolerance_m` of the shape outline.

    The other half of `coverage`: loops inside the shape and detours away
    from it lower this, not the coverage.
    """
    origin = shape[0]
    outline = _closed(_local(origin, shape))
    d = distance_to_polyline(outline, _dense(_local(origin, route)))
    return float((d <= tolerance_m).mean())


def hausdorff_m(route: Sequence[LatLon], shape: Sequence[LatLon]) -> float:
    """Symmetric Hausdorff distance (m): the worst gap, either way."""
    origin = shape[0]
    outline = _closed(_local(origin, shape))
    path = _local(origin, route)
    to_shape = distance_to_polyline(outline, _dense(path))
    to_route = distance_to_polyline(path, _dense(outline))
    return float(max(to_shape.max(), to_route.max()))


def frechet_m(
    route: Sequence[LatLon], shape: Sequence[LatLon], n: int = FRECHET_POINTS
) -> float:
    """Discrete Fréchet distance (m) between the two curves resampled to `n` points.

    It follows both curves in order from the start, so a route that draws
    the right outline in the wrong order scores badly, unlike Hausdorff.
    """
    origin = shape[0]
    a = _resample(_local(origin, route), n)
    b = _resample(_closed(_local(origin, shape)), n)
    d = np.hypot(a[:, None, 0] - b[None, :, 0], a[:, None, 1] - b[None, :, 1])
    ca = np.empty((n, n))
    ca[0, 0] = d[0, 0]
    for i in range(1, n):
        ca[i, 0] = max(ca[i - 1, 0], d[i, 0])
    for j in range(1, n):
        ca[0, j] = max(ca[0, j - 1], d[0, j])
    for i in range(1, n):
        for j in range(1, n):
            best = min(ca[i - 1, j], ca[i - 1, j - 1], ca[i, j - 1])
            ca[i, j] = max(best, d[i, j])
    return float(ca[-1, -1])


def coverage_similarity(route: Sequence[LatLon], shape: Sequence[LatLon]) -> float:
    tolerance = COVER_TOLERANCE * shape_size(shape) * 2 * math.pi
    return coverage(route, shape, tolerance)


def fit_similarity(route: Sequence[LatLon], shape: Sequence[LatLon]) -> float:
    """Harmonic mean of coverage and precision: the route follows the whole
    outline and nothing else."""
    tolerance = COVER_TOLERANCE * shape_size(shape) * 2 * math.pi
    c = coverage(route, shape, tolerance)
    p = precision(route, shape, tolerance)
    return 0.0 if c + p == 0 else 2 * c * p / (c + p)


def hausdorff_similarity(route: Sequence[LatLon], shape: Sequence[LatLon]) -> float:
    return max(0.0, 1.0 - hausdorff_m(route, shape) / shape_size(shape))


def frechet_similarity(route: Sequence[LatLon], shape: Sequence[LatLon]) -> float:
    return max(0.0, 1.0 - frechet_m(route, shape) / shape_size(shape))


Similarity = Callable[[Sequence[LatLon], Sequence[LatLon]], float]

SIMILARITIES: dict[str, Similarity] = {
    "coverage": coverage_similarity,
    "fit": fit_similarity,
    "hausdorff": hausdorff_similarity,
    "frechet": frechet_similarity,
}
