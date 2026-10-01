"""A shape that passes by real places: "a romantic heart in Paris" (TASK-129).

The places (the stops) come from outside, already checked: names and
points of OpenStreetMap. The engine never invents one. It plans the shape
from a few starts chosen among the stops, so that the outline goes through
them, and keeps the route that still looks like the shape and passes by the
most stops; it says which ones, and only those.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

import numpy as np

from route_engine.geo import LatLon, latlon_to_local_array
from route_engine.optimizer import Plan, ShapeNotDrawableError

# A stop counts as passed when the route comes this close: across the road
# and a pavement, as near as a runner sees a place from.
REACH_M = 80.0
# Starts tried: the centre and the stops with most other stops around them.
# Each is a whole plan, 5-40 s: more would make the wait too long.
MAX_STARTS = 4
# Two starts nearer than this would draw nearly the same route.
MIN_START_GAP_M = 400.0
# "Around" a stop, for choosing starts: about a short walk.
CLUSTER_M = 1_000.0
# Below this the shape no longer reads (TASK-125: 0.88 kept, the eye agreed
# down to about 0.85); a few stops more do not buy a shape nobody sees.
MIN_SIMILARITY = 0.85


@dataclass(frozen=True)
class Stop:
    """A real place: its name, as OpenStreetMap has it, and where it is."""

    name: str
    point: LatLon


@dataclass(frozen=True)
class StopsPlan:
    plan: Plan
    # The stops within REACH_M of the route, in the order the route meets them.
    passed: tuple[Stop, ...]
    # How many starts were planned, and how many drew the shape.
    tried: int
    drawn: int


PlanFrom = Callable[[LatLon], Plan]
"""The shape planned from a start: plan_shape with everything else fixed."""

Prepare = Callable[[Sequence[LatLon]], None]
"""Called once with every start before any is planned: loads the one zone
that holds them all, so each start's own zone is cut from it instead of
downloaded again. Overpass refuses connections after a few downloads in a
row (MAPS.md)."""


def union(
    boxes: Sequence[tuple[float, float, float, float]],
) -> tuple[float, float, float, float]:
    """The (south, west, north, east) box that holds all of `boxes`."""
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


def _local(origin: LatLon, points: Sequence[LatLon]) -> np.ndarray:
    return latlon_to_local_array(origin, np.asarray(points, dtype=float))


def starts_for(
    centre: LatLon, stops: Sequence[Stop], count: int = MAX_STARTS
) -> list[LatLon]:
    """The centre first, then the stops with most other stops within
    CLUSTER_M, each at least MIN_START_GAP_M from those already chosen."""
    chosen: list[LatLon] = [centre]
    if not stops or count <= 1:
        return chosen[:count]
    xy = _local(centre, [s.point for s in stops])
    gaps = np.linalg.norm(xy[:, None, :] - xy[None, :, :], axis=2)
    crowd = (gaps <= CLUSTER_M).sum(axis=1)
    # Most crowded first; equal ones in the order given (the best places).
    order = sorted(range(len(stops)), key=lambda i: (-crowd[i], i))
    picked = [np.zeros(2)]
    for i in order:
        if len(chosen) == count:
            break
        if all(np.linalg.norm(xy[i] - p) >= MIN_START_GAP_M for p in picked):
            chosen.append(stops[i].point)
            picked.append(xy[i])
    return chosen


def passed_stops(
    route: Sequence[LatLon], stops: Sequence[Stop], reach_m: float = REACH_M
) -> tuple[Stop, ...]:
    """The stops within `reach_m` of the route's line, in the order the
    route meets them."""
    if len(route) < 2 or not stops:
        return ()
    origin = route[0]
    line = _local(origin, route)
    a, b = line[:-1], line[1:]
    ab = b - a
    lengths = np.maximum((ab**2).sum(axis=1), 1e-12)
    met: list[tuple[int, int]] = []
    for k, xy in enumerate(_local(origin, [s.point for s in stops])):
        t = np.clip(((xy - a) * ab).sum(axis=1) / lengths, 0.0, 1.0)
        nearest = a + t[:, None] * ab
        d = np.linalg.norm(nearest - xy, axis=1)
        j = int(d.argmin())
        if d[j] <= reach_m:
            met.append((j, k))
    return tuple(stops[k] for _, k in sorted(met))


def plan_through_stops(
    centre: LatLon,
    stops: Sequence[Stop],
    plan_from: PlanFrom,
    *,
    max_starts: int = MAX_STARTS,
    min_similarity: float = MIN_SIMILARITY,
    prepare: Prepare | None = None,
) -> StopsPlan:
    """The shape from the centre and from starts among the stops; of the
    routes at `min_similarity` or more, the one passing by most stops, the
    better shape among equals. Raises ShapeNotDrawableError when no start
    draws the shape well enough."""
    best: tuple[int, float, Plan, tuple[Stop, ...]] | None = None
    starts = starts_for(centre, stops, max_starts)
    if prepare is not None:
        prepare(starts)
    drawn = 0
    last_error: ShapeNotDrawableError | None = None
    for start in starts:
        try:
            plan = plan_from(start)
        except ShapeNotDrawableError as exc:
            last_error = exc
            continue
        result = plan.result
        if result.similarity < min_similarity:
            continue
        drawn += 1
        passed = passed_stops(result.points, stops)
        key = (len(passed), result.similarity)
        if best is None or key > (best[0], best[1]):
            best = (len(passed), result.similarity, plan, passed)
    if best is None:
        raise last_error or ShapeNotDrawableError(
            f"the shape does not draw well enough here from {len(starts)} starts"
        )
    return StopsPlan(best[2], best[3], tried=len(starts), drawn=drawn)
