"""Conversions between WGS84 (lat, lon) and a local tangent plane in metres.

The only module that turns degrees into metres and back; geometry elsewhere
works in metres.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

import numpy as np

LatLon = tuple[float, float]

EARTH_RADIUS_M = 6_371_000.0


def local_to_latlon(origin: LatLon, x_m: float, y_m: float) -> LatLon:
    """Map a point on the plane tangent at `origin` (x east, y north) to WGS84."""
    lat0, lon0 = origin
    lat = lat0 + math.degrees(y_m / EARTH_RADIUS_M)
    lon = lon0 + math.degrees(x_m / (EARTH_RADIUS_M * math.cos(math.radians(lat0))))
    return lat, lon


def latlon_to_local(origin: LatLon, point: LatLon) -> tuple[float, float]:
    """Inverse of `local_to_latlon`: WGS84 point to (x, y) metres around `origin`."""
    lat0, lon0 = origin
    lat, lon = point
    x_m = math.radians(lon - lon0) * EARTH_RADIUS_M * math.cos(math.radians(lat0))
    y_m = math.radians(lat - lat0) * EARTH_RADIUS_M
    return x_m, y_m


def haversine_m(a: LatLon, b: LatLon) -> float:
    """Great-circle distance in metres."""
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(h))


def path_length_m(points: Sequence[LatLon]) -> float:
    """Length in metres of a polyline of WGS84 points."""
    return sum(haversine_m(a, b) for a, b in zip(points, points[1:], strict=False))


def latlon_to_local_array(origin: LatLon, points: np.ndarray) -> np.ndarray:
    """`latlon_to_local` for an (n, 2) array of (lat, lon) rows; returns (x, y) rows."""
    lat0, lon0 = origin
    x = np.radians(points[:, 1] - lon0) * EARTH_RADIUS_M * math.cos(math.radians(lat0))
    y = np.radians(points[:, 0] - lat0) * EARTH_RADIUS_M
    return np.column_stack([x, y])
