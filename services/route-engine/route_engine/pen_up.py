"""Words written with the pen up (TASK-197, ADR-0157).

A word asked with `pen_up` is the open line of `words.compose(pen_up=True)`:
each letter once, from its entry to its exit on the base line. Here it
becomes a route:

- every letter is traced on its own, as an open line (`snap_to_network`
  with `closed=False`), with the zones and the corridor of the whole drawing
  (`trace`);
- from the end of one letter to the start of the next the route takes the
  shortest way along the roads: a walk, with neither zones nor corridor,
  that the runner walks with the recording paused;
- the route is one line, letters and walks in order, and `walks` says
  which stretches of it are walked: [from, to] indices into its points,
  both included. Where a walk ends, the next letter begins.

Only the letters count: the similarity looks at them alone (`similarity`),
and the distance asked for is theirs (`drawn_m`). The route's own length,
`distance_m`, still counts every point, walks included.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Sequence

import networkx as nx
import numpy as np

from route_engine.errors import ShapeNotDrawableError
from route_engine.geo import (
    LatLon,
    haversine_m,
    latlon_to_local_array,
    local_to_latlon,
    path_length_m,
)
from route_engine.metrics import _dense
from route_engine.network import (
    CORRIDOR_BAND,
    STROKE_DETAIL,
    ZONE_RADIUS,
    Graph,
    NetworkRoute,
    _edge_points,
    _node_latlon,
    detail_scale,
    distance_to_segments,
    nearest_nodes,
    snap_to_network,
    step_cost,
)
from route_engine.projection import Point, transform
from route_engine.validation import InvalidRouteError
from route_engine.words import Word

# A walk: the points of a route from `from` to `to`, both included.
Walk = tuple[int, int]


def place_line(
    points: Sequence[Point], start: LatLon, scale_m: float, rotation_deg: float = 0.0
) -> list[LatLon]:
    """An open line on the map, as `project_shape` places a closed one:
    scaled, turned, and its first point on `start`. It stays open."""
    local = transform(points, scale_m, rotation_deg)
    x0, y0 = local[0]
    return [local_to_latlon(start, x - x0, y - y0) for x, y in local]


def reach(points: Sequence[Point]) -> float:
    """How far an open line gets from its first point, where the route
    starts: what `optimizer.reach` is for a closed shape."""
    return max(math.dist(p, points[0]) for p in points)


def letter_lines(word: Word, line: Sequence[LatLon]) -> list[list[LatLon]]:
    """The points of each letter of `word`, placed as `line` (in the order
    of `word.line(0)`), without the gaps."""
    return [[line[int(i)] for i in rows] for rows in word.strokes(0)]


def tracer(
    graph: Graph, word: Word, reuse_penalty: float, retrace: float
) -> Callable[[list[LatLon]], NetworkRoute]:
    """`trace` on `graph` for `word`, as optimizer.search calls a tracer."""

    def trace_word(line: list[LatLon]) -> NetworkRoute:
        return trace(graph, word, line, reuse_penalty, retrace)

    return trace_word


def trace(
    graph: Graph,
    word: Word,
    line: Sequence[LatLon],
    reuse_penalty: float,
    retrace: float,
) -> NetworkRoute:
    """The route of `word` written with the pen up, placed as `line`: each
    letter traced on its own, then the shortest way on foot to the next
    (by bike, riding rather than with the bike on foot: `step_cost`).

    The zones and the corridor are those of the letters together, as if they
    were one shape: a share of their length (`snap_to_network`), finer when
    a letter has strokes drawn twice (ADR-0039). Each letter's warnings are
    named by its letter, but for where the route begins.

    The pieces of a shape (pieces.py, TASK-223) are its details, as strokes
    are: the zones and the corridor are always the finer ones. A closed
    piece, like an eye, is traced closed: it ends where it began.
    """
    letters = letter_lines(word, line)
    xys = [latlon_to_local_array(letter[0], np.array(letter)) for letter in letters]
    lengths = [_length(xy) for xy in xys]
    fine = min(detail_scale(xy) for xy in xys)
    if word.kind == "piece":
        fine = min(fine, STROKE_DETAIL)
    drawing_m = fine * sum(lengths)
    pieces = [
        _trace_letter(
            graph,
            letter,
            detail_scale(xy) * own,
            drawing_m,
            reuse_penalty,
            retrace,
            closed=word.kind == "piece" and letter[0] == letter[-1],
        )
        for letter, xy, own in zip(letters, xys, lengths, strict=True)
    ]
    points = list(pieces[0].points)
    nodes = list(pieces[0].nodes)
    waypoints = list(pieces[0].waypoints)
    warnings = _named(word, 0, pieces[0].warnings)
    walks: list[Walk] = []
    for k, piece in enumerate(pieces[1:], start=1):
        try:
            way = nx.shortest_path(graph, nodes[-1], piece.nodes[0], weight=step_cost)
        except nx.NetworkXNoPath:
            raise ShapeNotDrawableError(
                f"no road leads from {word.label(k - 1)} to {word.label(k)}"
                if word.kind == "piece"
                else f"no road leads from the {word.letters[k - 1].char} "
                f"to the {word.letters[k].char}"
            ) from None
        begin = len(points) - 1
        for u, v in zip(way, way[1:], strict=False):
            points.extend(_edge_points(graph, u, v))
        walks.append((begin, len(points) - 1))
        nodes.extend(way[1:])
        nodes.extend(piece.nodes[1:])
        points.extend(piece.points[1:])
        waypoints.extend(piece.waypoints)
        warnings.extend(_named(word, k, piece.warnings))
    return NetworkRoute(
        points=points,
        distance_m=path_length_m(points),
        warnings=warnings,
        waypoints=waypoints,
        nodes=nodes,
        walks=walks,
    )


def _trace_letter(
    graph: Graph,
    letter: list[LatLon],
    own_m: float,
    drawing_m: float,
    reuse_penalty: float,
    retrace: float,
    closed: bool = False,
) -> NetworkRoute:
    """One letter as an open route, or a closed one when told (a closed
    piece of a shape). `own_m` is the perimeter snap_to_network measures for
    it, `drawing_m` the one its zones and corridor are a share of. A letter
    that falls on a single node is that node."""
    scale = drawing_m / own_m if own_m > 0 else 1.0
    try:
        return snap_to_network(
            graph,
            letter,
            reuse_penalty,
            zone_radius=ZONE_RADIUS * scale,
            band=CORRIDOR_BAND * scale,
            retrace=retrace,
            closed=closed,
        )
    except ShapeNotDrawableError:
        raise
    except ValueError:  # the letter collapses onto a single road node
        [node], _ = nearest_nodes(graph, letter[:1])
        return NetworkRoute(
            points=[_node_latlon(graph, node)], distance_m=0.0, nodes=[node]
        )


def _named(word: Word, k: int, warnings: Sequence[str]) -> list[str]:
    """The warnings of letter `k`, named by it; where the route begins only
    matters for the first letter, which holds the start."""
    if len(word.letters) == 1:
        return list(warnings)
    named = []
    for warning in warnings:
        if warning.startswith("start is "):
            if k == 0:
                named.append(warning)
            continue
        named.append(f"{word.label(k)}: {warning}")
    return named


def drawn_pieces(points: Sequence[LatLon], walks: Sequence[Walk]) -> list[list[LatLon]]:
    """The stretches of a route between its walks: the letters it draws."""
    pieces = []
    begin = 0
    for start, end in walks:
        pieces.append(list(points[begin : start + 1]))
        begin = end
    pieces.append(list(points[begin:]))
    return pieces


def drawn_m(
    points: Sequence[LatLon], distance_m: float, walks: Sequence[Walk]
) -> float:
    """The length of a route without its walks: what the run records and the
    distance asked for applies to. `distance_m` itself without walks."""
    if not walks:
        return distance_m
    return distance_m - sum(path_length_m(points[a : b + 1]) for a, b in walks)


def walks_problem(walks: Sequence[Walk], count: int, what: str = "walk") -> str | None:
    """Why `walks` cannot belong to a route of `count` points, or None: each
    [from, to] within the points, from ≤ to, in order and not overlapping
    (one may start where the one before ended). `what` names them in the
    message: also the stretches with the bike on foot (TASK-206)."""
    end = 0
    for k, (start, stop) in enumerate(walks):
        if not 0 <= start <= stop < count:
            return (
                f"{what} {k} [{start}, {stop}] is not a stretch of the {count} "
                "points of the route"
            )
        if start < end:
            return (
                f"{what} {k} [{start}, {stop}] starts before the {what} before "
                "it ends"
            )
        end = stop
    return None


def similarity(
    word: Word,
    points: Sequence[LatLon],
    walks: Sequence[Walk],
    line: Sequence[LatLon],
    tolerance_m: float,
) -> float:
    """How well a route writes `word` with the pen up, placed as `line`
    (in the order of `word.line(0)`): `optimizer.word_similarity` on the
    letters alone. The coverage of each letter by the route, on average over
    the letters, and the precision of the route on the letters, within
    `tolerance_m`; their harmonic mean. Walks count in neither, and the
    gaps of `line` are not letters: each line stays open."""
    origin = line[0]
    letters = [
        latlon_to_local_array(origin, np.array(p)) for p in letter_lines(word, line)
    ]
    drawn = [
        latlon_to_local_array(origin, np.array(p)) for p in drawn_pieces(points, walks)
    ]
    route_a, route_b = _segments(drawn)
    covered = np.mean(
        [
            float(
                (
                    distance_to_segments(route_a, route_b, _dense(xy)) <= tolerance_m
                ).mean()
            )
            for xy in letters
        ]
    )
    letter_a, letter_b = _segments(letters)
    samples = np.vstack([_dense(xy) for xy in drawn])
    exact = float(
        (distance_to_segments(letter_a, letter_b, samples) <= tolerance_m).mean()
    )
    total = covered + exact
    return 0.0 if total == 0 else float(2 * covered * exact / total)


def check_begins(
    points: Sequence[LatLon],
    first: LatLon,
    requested: LatLon,
    start: LatLon,
    max_offset_m: float,
) -> None:
    """`validation.check_closed` for an open route: it begins at `first`,
    the road point nearest to the chosen `start`, and `start` is within
    `max_offset_m` of the `requested` one (ADR-0025)."""
    if not points or points[0] != first:
        raise InvalidRouteError("the route does not begin at its start")
    offset = haversine_m(start, requested)
    if offset > max_offset_m + 1.0:
        raise InvalidRouteError(
            f"the start was moved {offset:.0f} m from the requested one "
            f"(at most {max_offset_m:.0f} m)"
        )


def _segments(lines: Sequence[np.ndarray]) -> tuple[np.ndarray, np.ndarray]:
    """The sides of several lines, never one from a line to the next; a
    line of one point is a side of no length."""
    starts, ends = [], []
    for xy in lines:
        if len(xy) == 1:
            starts.append(xy)
            ends.append(xy)
        else:
            starts.append(xy[:-1])
            ends.append(xy[1:])
    return np.vstack(starts), np.vstack(ends)


def _length(xy: np.ndarray) -> float:
    return float(np.hypot(*np.diff(xy, axis=0).T).sum())
