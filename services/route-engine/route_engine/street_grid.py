"""Which way the streets run around a point (TASK-077).

Block letters (words.py, style "block") have level and upright strokes:
they follow the streets best when the word is turned the way the street
grid runs. Every piece of street votes for its direction, folded into a
quarter turn because a grid runs both ways and across, with its length;
the votes are smoothed over a few degrees, and the highest peaks are the
directions of the grids around the point.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import numpy as np

from route_engine.geo import LatLon, latlon_to_local_array
from route_engine.network import Graph

# Votes fall in bins of one degree, smoothed over this many either way.
SMOOTH_DEG = 4
# At most this many directions: the highest peak, then peaks at least
# MIN_PEAK_SHARE of it and MIN_PEAK_GAP_DEG away from those already taken.
MAX_DIRECTIONS = 3
MIN_PEAK_SHARE = 0.5
MIN_PEAK_GAP_DEG = 20.0


class StreetDirections:
    """The pieces of street of `graph` in metres around `origin`: where
    each lies, which way it runs and how long it is."""

    def __init__(self, graph: Graph, origin: LatLon) -> None:
        coords: list[tuple[float, float]] = []
        pieces: list[tuple[int, int]] = []
        seen: set[frozenset[Any]] = set()
        for u, v, data in graph.edges(data=True):
            if frozenset((u, v)) in seen:  # both ways, one street
                continue
            seen.add(frozenset((u, v)))
            geometry = data.get("geometry")
            if geometry is None:
                line = [
                    (graph.nodes[u]["y"], graph.nodes[u]["x"]),
                    (graph.nodes[v]["y"], graph.nodes[v]["x"]),
                ]
            else:
                line = [(lat, lon) for lon, lat in geometry.coords]
            pieces.extend(
                (len(coords) + i, len(coords) + i + 1) for i in range(len(line) - 1)
            )
            coords.extend(line)
        if not pieces:
            self.middles = np.zeros((0, 2))
            self.angles = np.zeros(0)
            self.lengths = np.zeros(0)
            return
        xy = latlon_to_local_array(origin, np.array(coords))
        idx = np.array(pieces)
        a, b = xy[idx[:, 0]], xy[idx[:, 1]]
        d = b - a
        self.middles = (a + b) / 2
        # Counterclockwise from east, folded into [0°, 90°).
        self.angles = np.degrees(np.arctan2(d[:, 1], d[:, 0])) % 90.0
        self.lengths = np.hypot(d[:, 0], d[:, 1])

    def around(self, center_xy: Sequence[float], radius_m: float) -> list[float]:
        """The directions of the street grids whose pieces lie within
        `radius_m` of `center_xy`, strongest first: degrees
        counterclockwise from east, folded into [-45°, 45°). Empty
        without streets."""
        near = np.hypot(*(self.middles - np.asarray(center_xy)).T) <= radius_m
        weights = self.lengths[near]
        if not weights.any():
            return []
        angles = self.angles[near]
        votes = np.bincount(
            np.floor(angles).astype(int) % 90, weights=weights, minlength=90
        )
        window = range(-SMOOTH_DEG, SMOOTH_DEG + 1)
        smooth = sum(np.roll(votes, k) for k in window)
        directions: list[float] = []
        for peak in np.argsort(-smooth, kind="stable"):
            if len(directions) == MAX_DIRECTIONS:
                break
            if smooth[peak] < MIN_PEAK_SHARE * smooth.max():
                break
            # The mean direction of the votes around the peak, in degrees.
            offset = (angles - peak - 0.5 + 45.0) % 90.0 - 45.0
            close = np.abs(offset) <= SMOOTH_DEG + 0.5
            angle = peak + 0.5 + np.average(offset[close], weights=weights[close])
            angle = float((angle + 45.0) % 90.0 - 45.0)
            if all(_quarter_gap(angle, d) >= MIN_PEAK_GAP_DEG for d in directions):
                directions.append(angle)
        return directions


def _quarter_gap(a: float, b: float) -> float:
    """How far apart two directions are, a quarter turn being none."""
    return abs((a - b + 45.0) % 90.0 - 45.0)
