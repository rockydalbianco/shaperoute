"""How much of a route runs twice over the same street (TASK-131).

A route that goes to a point of the shape and comes back the same way
leaves a "whisker" on the map: the eye sees it at once, while the
similarity does not, because both ways lie on the shape (TASK-131: the
only heart judged `sì` had none, the others 4-23% of their length).
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence

import numpy as np

from route_engine.geo import LatLon, latlon_to_local_array

# A piece of road is the same when its two ends agree to about 10 cm.
DIGITS = 6


def doubled_share(points: Sequence[LatLon]) -> float:
    """The share of the route's length on pieces of road it runs more than
    once, either way. Pieces come from the graph's edges, so a road run
    twice gives the same pair of points."""
    if len(points) < 2:
        return 0.0
    keys = [
        frozenset(
            (
                (round(a[0], DIGITS), round(a[1], DIGITS)),
                (round(b[0], DIGITS), round(b[1], DIGITS)),
            )
        )
        for a, b in zip(points, points[1:], strict=False)
    ]
    counts = Counter(keys)
    xy = latlon_to_local_array(points[0], np.array(points))
    lengths = np.hypot(*np.diff(xy, axis=0).T)
    total = float(lengths.sum())
    if total == 0:
        return 0.0
    doubled = sum(
        float(length)
        for key, length in zip(keys, lengths, strict=True)
        if len(key) == 2 and counts[key] > 1
    )
    return doubled / total


def extra_doubled_share(
    points: Sequence[LatLon], shape: Sequence[LatLon] | None = None
) -> float:
    """`doubled_share` of the route beyond what its shape draws twice on
    purpose: the strokes of a cat's eyes or a butterfly's antennae
    (TASK-037) are run out and back, and are not whiskers (TASK-140). A
    shape without strokes asks for nothing twice."""
    expected = doubled_share(shape) if shape else 0.0
    return max(0.0, doubled_share(points) - expected)
