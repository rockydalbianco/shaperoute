"""Which street an unnamed sidewalk runs along (TASK-053, ADR-0054).

In OpenStreetMap a sidewalk drawn on its own is a `footway` without a name,
a few metres from its street and parallel to it. The street is often not in
the foot graph: FOOT_FILTER leaves out the roads whose sidewalks are drawn
apart (`sidewalk=separate`). Their names come from a small second download
(network.py, `named_roads`); the named roads of the graph count too.

What this module gives is a deduction, `along`, kept apart from `street`,
which is only ever a name OpenStreetMap gives the way itself.
"""

from __future__ import annotations

import math
from collections import Counter, defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from typing import Any

import networkx as nx
import numpy as np

from route_engine.directions import Direction, _coords_from, _edge, _labels
from route_engine.geo import LatLon, latlon_to_local

# A sidewalk is this close to its street, measured from its centre line to
# the street's; the widest avenues put it further (measured on Milan, ADR-0054).
MAX_DISTANCE_M = 15.0
# ... and runs this parallel to it, either way along.
MAX_ANGLE_DEG = 20.0
# Share of the sidewalk that must run along the same street.
MIN_SHARE = 0.5
# The sidewalk is checked every this many metres along it.
SAMPLE_M = 5.0
# Grid cell of the index, in metres.
_CELL_M = 50.0


@dataclass(frozen=True)
class NamedRoad:
    """A road with a name, as a line of points."""

    name: str
    points: tuple[LatLon, ...]


class StreetIndex:
    """Named roads as short segments on a local plane, found by grid cell."""

    def __init__(self, roads: Iterable[NamedRoad]) -> None:
        roads = [road for road in roads if len(road.points) >= 2]
        self.origin: LatLon = roads[0].points[0] if roads else (0.0, 0.0)
        starts: list[tuple[float, float]] = []
        ends: list[tuple[float, float]] = []
        self.names: list[str] = []
        for road in roads:
            local = [latlon_to_local(self.origin, point) for point in road.points]
            for a, b in zip(local, local[1:], strict=False):
                if a != b:
                    starts.append(a)
                    ends.append(b)
                    self.names.append(road.name)
        self.starts = np.array(starts, dtype=float).reshape(-1, 2)
        self.ends = np.array(ends, dtype=float).reshape(-1, 2)
        self.cells: dict[tuple[int, int], list[int]] = defaultdict(list)
        reach = MAX_DISTANCE_M
        for i, (a, b) in enumerate(zip(self.starts, self.ends, strict=True)):
            x0, x1 = sorted((a[0], b[0]))
            y0, y1 = sorted((a[1], b[1]))
            for cx in range(_cell(x0 - reach), _cell(x1 + reach) + 1):
                for cy in range(_cell(y0 - reach), _cell(y1 + reach) + 1):
                    self.cells[cx, cy].append(i)

    def __len__(self) -> int:
        return len(self.names)

    def street_at(
        self,
        point: tuple[float, float],
        bearing_deg: float,
        max_distance_m: float = MAX_DISTANCE_M,
        max_angle_deg: float = MAX_ANGLE_DEG,
    ) -> str | None:
        """Name of the nearest segment within `max_distance_m` of `point`
        (local metres) that runs within `max_angle_deg` of `bearing_deg`,
        either way; None if there is none."""
        candidates = self.cells.get((_cell(point[0]), _cell(point[1])))
        if not candidates:
            return None
        ids = np.array(candidates)
        a, b = self.starts[ids], self.ends[ids]
        ab = b - a
        p = np.array(point)
        t = np.clip(
            np.einsum("ij,ij->i", p - a, ab) / np.einsum("ij,ij->i", ab, ab), 0, 1
        )
        distance = np.linalg.norm(a + ab * t[:, None] - p, axis=1)
        segment_deg = np.degrees(np.arctan2(ab[:, 0], ab[:, 1]))
        angle = np.abs((segment_deg - bearing_deg + 90.0) % 180.0 - 90.0)
        ok = (distance <= max_distance_m) & (angle <= max_angle_deg)
        if not ok.any():
            return None
        best = int(np.argmin(np.where(ok, distance, np.inf)))
        return self.names[int(ids[best])]

    def street_along(self, points: Sequence[LatLon]) -> str | None:
        """The street a line of points runs along for at least MIN_SHARE of
        its samples, or None."""
        local = [latlon_to_local(self.origin, point) for point in points]
        found: Counter[str | None] = Counter()
        samples = list(_samples(local))
        for point, bearing in samples:
            found[self.street_at(point, bearing)] += 1
        if not samples:
            return None
        name, count = max(
            ((n, c) for n, c in found.items() if n is not None),
            key=lambda item: item[1],
            default=(None, 0),
        )
        return name if count >= MIN_SHARE * len(samples) else None


def graph_roads(graph: nx.MultiDiGraph) -> list[NamedRoad]:
    """The named edges of the graph, as roads: a sidewalk may run along a
    street the runner can walk too. One direction of each two-way edge."""
    roads: list[NamedRoad] = []
    seen: set[frozenset[Any]] = set()
    for u, v, data in graph.edges(data=True):
        names = _labels(data.get("name"))
        pair = frozenset((u, v))
        if not names or pair in seen:
            continue
        seen.add(pair)
        points = tuple(_coords_from(graph, u, v, data))
        roads.extend(NamedRoad(name, points) for name in sorted(names))
    return roads


def alongs(
    graph: nx.MultiDiGraph,
    nodes: Sequence[Any],
    directions: Sequence[Direction],
    index: StreetIndex,
) -> list[str | None]:
    """For each direction, the street its road runs along when the road has
    no name of its own (`street` is None), else None. `directions` are those
    of `nodes` on `graph` (directions.guidance), in order."""
    result: list[str | None] = []
    i = 0
    for direction in directions:
        while i < len(nodes) - 1 and nodes[i] != direction.node:
            i += 1
        if direction.street is not None or i >= len(nodes) - 1:
            result.append(None)
            continue
        after = nodes[i + 1]
        points = _coords_from(
            graph, direction.node, after, _edge(graph, direction.node, after)
        )
        result.append(index.street_along(points))
    return result


def _cell(value: float) -> int:
    return math.floor(value / _CELL_M)


def _samples(
    local: Sequence[tuple[float, float]],
) -> Iterable[tuple[tuple[float, float], float]]:
    """Points every SAMPLE_M along a local line (the middle of a shorter
    piece), each with the bearing of its piece in degrees from north."""
    carried = SAMPLE_M / 2
    for (x0, y0), (x1, y1) in zip(local, local[1:], strict=False):
        length = math.hypot(x1 - x0, y1 - y0)
        if length == 0:
            continue
        bearing = math.degrees(math.atan2(x1 - x0, y1 - y0))
        at = carried
        while at <= length:
            share = at / length
            yield (x0 + (x1 - x0) * share, y0 + (y1 - y0) * share), bearing
            at += SAMPLE_M
        carried = at - length
