"""Other routes to choose from (TASK-093, ADR-0087).

The nearby starts (ADR-0071) already plan the shape from up to four
starts and keep one route. The others are worth showing: a few metres of
GPS change the drawing, and the user may like another one better. Shown
only when the user would see a difference: not a route that runs along
one already shown, and not one that looks much less like the shape.
"""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np
from shapely.geometry import LineString

from route_engine.geo import LatLon, latlon_to_local_array
from route_engine.optimizer import Plan

# Besides the route chosen: three routes in all (the user's choice).
MAX_ALTERNATIVES = 2
# No route whose similarity is more than this below the best one: 10 points
# of the percentage the app shows (the user's choice).
MAX_SIMILARITY_DROP = 0.10
# Two routes are the same when each runs within SAME_ROUTE_M of the other
# for SAME_ROUTE_SHARE of its length: a different start a few metres away,
# then the same streets. Pavements on the two sides of a road are 10-20 m
# apart.
SAME_ROUTE_M = 20.0
SAME_ROUTE_SHARE = 0.9


def share_along(route: Sequence[LatLon], other: Sequence[LatLon]) -> float:
    """The share of `route`'s length within SAME_ROUTE_M of `other`."""
    origin = route[0]
    line = LineString(latlon_to_local_array(origin, np.array(route)))
    near = LineString(latlon_to_local_array(origin, np.array(other)))
    if line.length == 0:
        return 1.0
    return float(line.intersection(near.buffer(SAME_ROUTE_M)).length / line.length)


def same_route(a: Sequence[LatLon], b: Sequence[LatLon]) -> bool:
    return (
        share_along(a, b) >= SAME_ROUTE_SHARE and share_along(b, a) >= SAME_ROUTE_SHARE
    )


def alternatives(chosen: Plan, others: Sequence[Plan]) -> list[Plan]:
    """Up to MAX_ALTERNATIVES of `others`, in their order (best first):
    within MAX_SIMILARITY_DROP of the best similarity, and none the same
    route as `chosen` or as one kept before it."""
    plans = [chosen, *others]
    floor = max(p.result.similarity for p in plans) - MAX_SIMILARITY_DROP
    kept: list[Plan] = []
    for plan in others:
        if len(kept) == MAX_ALTERNATIVES:
            break
        if plan.result.similarity < floor:
            continue
        if any(
            same_route(plan.result.points, k.result.points) for k in [chosen, *kept]
        ):
            continue
        kept.append(plan)
    return kept
