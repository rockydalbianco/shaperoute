"""Detours of a piece walked, not drawn (TASK-242, ADR-0208), and the
spikes of the outline (TASK-243, ADR-0209).

A piece of a shape drawn with the pen up (pieces.py) is a short line, and
the roads may not follow it: a mouth that crosses a railway goes down to the
nearest underpass and back, hundreds of metres off its line, and on the map
it hangs from the outline it should stay apart from. Here that stretch is
found, and pen_up.trace walks it instead of drawing it: the piece is drawn
in two parts with the pen up between them, as between two pieces.

A detour is a stretch of the piece's route between two road nodes on its
line (within LIFT_NEAR piece heights of it) that gets farther than LIFT_FAR
piece heights from it. A stretch like that before the first node on the
line, or after the last, is left out: the piece begins and ends on its
line. What strays less stays drawn: a road is never quite the line.

The outline is the shape: a hole in it costs more than a crooked stretch.
It is lifted only on its spikes, the detours that go out and come back
where they left (OUTLINE_SPIKE and the constants after it), and it always
begins at the start.
"""

from __future__ import annotations

from collections.abc import Collection, Sequence
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from route_engine.geo import (
    LatLon,
    haversine_m,
    latlon_to_local_array,
    path_length_m,
)
from route_engine.network import (
    Graph,
    _edge_points,
    _node_latlon,
    distance_to_segments,
)

# A road node is on the line of its piece within this many piece heights:
# the tolerance of the similarity (optimizer.WORD_TOLERANCE), so what the
# route draws between two such nodes is what the similarity counts.
LIFT_NEAR = 1 / 8
# A stretch between two nodes on the line is a detour when it gets farther
# than this many piece heights from it: three times the tolerance, about a
# tenth of the shape's size. At Trento the mouth of a 15 km smiling face
# went 250-370 m off its line to pass under the railway (this far is
# 175-185 m there); its other stretches off the line, up to 140 m, were
# left drawn (TASK-242, ADR-0208).
LIFT_FAR = 3 / 8
# The outline of a shape in pieces is lifted on its spikes only: a detour
# that goes out and comes back near where it left. It skips no more of the
# outline than OUTLINE_GAP piece heights, an eighth of the shape's size,
# which is the hole it leaves in it; and its road is at least OUTLINE_SPIKE
# times as long as its two ends are apart. A detour that is no spike is the
# outline itself on the roads there are: walked, it would open the shape
# (TASK-243, ADR-0209).
OUTLINE_SPIKE = 2.0
OUTLINE_GAP = 4 / 8
# The most spikes of the outline that are walked, the deepest: with more
# holes than these the outline no longer reads as one line.
OUTLINE_WALKS = 2
# The most walks a route has, between its pieces and on their detours: what
# a result of the API holds (schemas.MAX_WALKS; services/api/tests check it).
MAX_WALKS = 9


@dataclass(frozen=True)
class Detour:
    """A stretch of a route off its line: `first` and `last` index the road
    nodes on the line it leaves and comes back to, and it gets `depth_m`
    from the line in between. `hole_m` of the line lie between where it
    leaves and where it comes back: what the route skips of it."""

    first: int
    last: int
    depth_m: float
    hole_m: float = field(default=0.0, compare=False)


@dataclass(frozen=True)
class Strays:
    """Where the route of a piece leaves its line: it is drawn from node
    `begin` to node `end`, but for the `detours` in between."""

    begin: int
    end: int
    detours: tuple[Detour, ...] = ()


def points_of(graph: Graph, nodes: Sequence[Any]) -> list[LatLon]:
    """The points of a route through `nodes`, as every route makes them:
    the first node, then the points of each edge."""
    points = [_node_latlon(graph, nodes[0])]
    for u, v in zip(nodes, nodes[1:], strict=False):
        points.extend(_edge_points(graph, u, v))
    return points


def strays(
    graph: Graph,
    nodes: Sequence[Any],
    line: Sequence[LatLon],
    near_m: float,
    far_m: float,
    closed: bool = False,
    held: bool = False,
) -> Strays:
    """Where the route through `nodes` leaves `line`, the piece it draws: a
    node is on the line within `near_m`, and a stretch between two nodes on
    the line in a row is a detour when a point of it is farther than
    `far_m`. So the stretch before the first node on the line and the one
    after the last, which `begin` and `end` leave out; for a `closed` piece,
    which ends where it began, those two are one stretch. A route with no
    node on the line is kept whole.

    A `held` route holds its first node, as the outline holds the start: it
    begins there whatever strays after it, and a detour that leaves that
    node is none, unless it comes back to it."""
    last = len(nodes) - 1
    points = [_node_latlon(graph, nodes[0])]
    at = [0]  # the index in `points` of each node
    for u, v in zip(nodes, nodes[1:], strict=False):
        points.extend(_edge_points(graph, u, v))
        at.append(len(points) - 1)
    origin = line[0]
    line_xy = latlon_to_local_array(origin, np.array(line))
    away = distance_to_segments(
        line_xy[:-1], line_xy[1:], latlon_to_local_array(origin, np.array(points))
    )
    near = [i for i, k in enumerate(at) if away[k] <= near_m]
    if not near:
        return Strays(0, last)

    def depth(a: int, b: int) -> float:
        return float(away[at[a] : at[b] + 1].max())

    head, tail = depth(0, near[0]), depth(near[-1], last)
    if closed:
        head = tail = max(head, tail)
    node_xy = latlon_to_local_array(origin, np.array([points[at[i]] for i in near]))
    holes = _holes(line_xy, node_xy, near_m, far_m)
    found = tuple(
        Detour(a, b, depth(a, b), hole)
        for a, b, hole in zip(near, near[1:], holes, strict=False)
        if depth(a, b) > far_m
    )
    begin = near[0] if head > far_m else 0
    if held:
        begin = 0
        found = tuple(d for d in found if d.first > 0 or nodes[0] == nodes[d.last])
    return Strays(begin, near[-1] if tail > far_m else last, found)


def _ahead(a: float, b: float, total: float, closed: bool, slack_m: float) -> float:
    """How far along a line `total` long it is from `a` to `b`, metres along
    it both: round a `closed` line when `b` is before `a`, but a step back
    of less than `slack_m` is no way at all."""
    step = b - a
    if step >= -slack_m:
        return max(0.0, step)
    return step + total if closed else 0.0


def _holes(
    line_xy: np.ndarray, node_xy: np.ndarray, near_m: float, slack_m: float
) -> list[float]:
    """How much of the line lies between each node on it and the next, in
    the order the route meets them: what the route skips of the line when
    the stretch between the two is left out.

    A line that crosses itself, or comes back along itself, has more
    stretches within `near_m` of a node: the one the least ahead of the
    node before is taken, as the route follows the line from its first
    point."""
    a, b = line_xy[:-1], line_xy[1:]
    side = b - a
    lengths = np.hypot(*side.T)
    begins = np.concatenate([[0.0], np.cumsum(lengths)[:-1]])
    total = float(lengths.sum())
    closed = bool(np.allclose(line_xy[0], line_xy[-1]))
    squared = np.maximum(lengths**2, 1e-12)
    holes: list[float] = []
    before = 0.0
    for k, p in enumerate(node_xy):
        t = np.clip(((p - a) * side).sum(axis=1) / squared, 0.0, 1.0)
        away = np.hypot(*(a + t[:, None] * side - p).T)
        on = np.flatnonzero(away <= max(near_m, float(away.min())))
        # One place for each stretch of the line near the node: its nearest.
        stretches = np.split(on, np.flatnonzero(np.diff(on) > 1) + 1)
        nearest = [int(sides[np.argmin(away[sides])]) for sides in stretches]
        places = (begins + t * lengths)[nearest]
        ahead = [_ahead(before, float(s), total, closed, slack_m) for s in places]
        best = int(np.argmin(ahead))
        if k > 0:
            holes.append(ahead[best])
        before = float(places[best])
    return holes


def gap_m(graph: Graph, nodes: Sequence[Any], detour: Detour) -> float:
    """How far apart the two ends of `detour` are, as the crow flies."""
    return haversine_m(
        _node_latlon(graph, nodes[detour.first]),
        _node_latlon(graph, nodes[detour.last]),
    )


def road_m(graph: Graph, nodes: Sequence[Any], detour: Detour) -> float:
    """How long `detour` is along its roads."""
    return path_length_m(points_of(graph, nodes[detour.first : detour.last + 1]))


def loops(nodes: Sequence[Any], found: Strays) -> list[Detour]:
    """The detours that come back to the node they left: leaving them out
    takes no walk."""
    return [d for d in found.detours if nodes[d.first] == nodes[d.last]]


def parts(
    nodes: Sequence[Any], found: Strays, lifted: Collection[Detour]
) -> list[list[Any]]:
    """The stretches of `nodes` that stay drawn, in order, without the
    `lifted` detours of `found`: the route walks from the end of one to the
    start of the next. A detour that comes back to the node it left is cut
    out, and the line goes on. Stretches of a single node draw nothing and
    are dropped; if none is left, the route is kept whole."""
    runs: list[list[Any]] = [[]]
    begin = found.begin
    for detour in sorted(lifted, key=lambda d: d.first):
        runs[-1].extend(nodes[begin : detour.first + 1])
        if nodes[detour.first] == nodes[detour.last]:
            runs[-1].pop()  # the same node opens what follows
        else:
            runs.append([])
        begin = detour.last
    runs[-1].extend(nodes[begin : found.end + 1])
    runs = [run for run in runs if len(run) >= 2]
    return runs or [list(nodes)]
