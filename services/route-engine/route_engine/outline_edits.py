"""Changes drawn by hand on an outline traced from an image (TASK-079).

The user draws with a finger over the outline of `image_outline.py`, and
the engine decides what the drawing becomes, always keeping one line the
route can follow (ADR-0074):

- a **part** is a closed line joined to the silhouette: the drawing is
  closed, simplified like the outline, and merged with the silhouette. It
  must overlap it, or the pieces would be two, and add something to it.
  Holes are left out, as in the traced outline;
- a **detail** is a stroke of an outline file (outline.py, TASK-037): it
  starts on the outline or on an earlier detail, and the route goes along it
  and back. Its start is moved onto the nearest line when it is close
  enough, since a finger is not precise; where the drawing crosses itself
  the loop closes there (an eye hung on the line) and the rest is left out.

Everything is in the frame of the drawing, x to the right and y upwards, at
any scale: the distances below are shares of the outline's longer side.
Every result passes parse_outline with its strokes; a drawing that gives no
such line is refused with the reason (InvalidEditError), in a word a caller
can map to its own message.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

import shapely
from shapely.geometry import LinearRing, LineString, Polygon
from shapely.geometry import Point as ShapelyPoint
from shapely.ops import nearest_points

from route_engine.image_outline import MAX_POINTS, SIMPLIFY_SHARE
from route_engine.shapes.outline import InvalidOutlineError, parse_outline
from route_engine.shapes.resample import Point

# A detail starts on the line when the drawing begins this close to it.
SNAP_SHARE = 0.06
# A drawing the size of a fingertip is not a part or a detail.
MIN_DRAWN_SHARE = 0.03
# A detail whose end comes back this close to one of its points closes a
# loop there, even without crossing itself.
CLOSE_SHARE = 0.03
# A part must add at least this share of the silhouette's area.
MIN_GAIN_SHARE = 0.005
# The corners of all the details together: each is run out and back.
MAX_DETAIL_POINTS = 50
# Points of a drawing: a finger gives a few hundred at most.
MAX_DRAWN_POINTS = 2_000
# Collinear points left by merging are dropped, no more.
_CLEAN_SHARE = 1e-9
# A drawing is thinned this much before looking for its loop.
_THIN_SHARE = 0.002

EDIT_REASONS = (
    "short",
    "not_joined",
    "inside",
    "covers_detail",
    "not_on_line",
    "crosses",
    "too_many_corners",
)


class InvalidEditError(ValueError):
    """The drawing does not give one line the route can follow. `reason`
    says why: one of EDIT_REASONS."""

    def __init__(self, reason: str, message: str) -> None:
        super().__init__(message)
        self.reason = reason


@dataclass(frozen=True)
class EditedOutline:
    """An outline and its details, in the frame they were given in."""

    # Closed: the first point repeated at the end.
    points: tuple[Point, ...]
    strokes: tuple[tuple[Point, ...], ...] = ()


def add_part(
    points: Sequence[Point], strokes: Sequence[Sequence[Point]], drawn: Sequence[Point]
) -> EditedOutline:
    """The outline with the closed line `drawn` merged into it; the details
    stay as they are. InvalidOutlineError if the outline given is not valid,
    InvalidEditError if the drawing gives no single outline."""
    ring = _checked(points, strokes)
    size = _size(ring)
    part = _drawn_polygon(drawn, size)
    silhouette = Polygon(ring)
    merged = silhouette.union(part)
    if not isinstance(merged, Polygon) or merged.is_empty:
        raise InvalidEditError(
            "not_joined",
            "the part does not overlap the outline: draw it across the line",
        )
    if merged.area - silhouette.area < MIN_GAIN_SHARE * silhouette.area:
        raise InvalidEditError(
            "inside", "the part is inside the outline: draw it across the line"
        )
    outside = Polygon(merged.exterior).simplify(
        _CLEAN_SHARE * size, preserve_topology=True
    )
    corners = [(x, y) for x, y in outside.exterior.coords]
    if len(corners) - 1 > MAX_POINTS:
        raise InvalidEditError(
            "too_many_corners",
            f"the outline would have {len(corners) - 1} corners, "
            f"at most {MAX_POINTS}",
        )
    kept = tuple(tuple(stroke) for stroke in strokes)
    try:
        _parse(corners, kept)
    except InvalidOutlineError as exc:
        raise InvalidEditError(
            "covers_detail", f"the part covers a detail: {exc}"
        ) from None
    return EditedOutline(points=tuple(corners), strokes=kept)


def add_detail(
    points: Sequence[Point], strokes: Sequence[Sequence[Point]], drawn: Sequence[Point]
) -> EditedOutline:
    """The outline with one more detail, from the line `drawn`, which must
    begin near the outline or an earlier detail. InvalidOutlineError if the
    outline given is not valid, InvalidEditError if the drawing gives no
    detail the route can follow."""
    ring = _checked(points, strokes)
    size = _size(ring)
    line = _distinct(drawn)
    if _length(line) < MIN_DRAWN_SHARE * size:
        raise InvalidEditError("short", "the line is too short: draw a longer one")
    hosts = [LinearRing(ring), *(LineString(s) for s in strokes)]
    line = _attached(line, hosts, size)
    # Fewer points before looking for where it crosses itself, which
    # compares every side with every other.
    line = [
        (x, y)
        for x, y in LineString(line)
        .simplify(_THIN_SHARE * size, preserve_topology=False)
        .coords
    ]
    stroke = _simplified(_looped(line, size), size)
    detail_points = sum(len(s) for s in strokes) + len(stroke)
    if detail_points > MAX_DETAIL_POINTS:
        raise InvalidEditError(
            "too_many_corners",
            f"the details would have {detail_points} points, "
            f"at most {MAX_DETAIL_POINTS}",
        )
    closed = tuple(ring) + (ring[0],)
    added = (*(tuple(s) for s in strokes), stroke)
    try:
        _parse(closed, added)
    except InvalidOutlineError as exc:
        raise InvalidEditError("crosses", f"the detail crosses a line: {exc}") from None
    return EditedOutline(points=closed, strokes=added)


def _checked(
    points: Sequence[Point], strokes: Sequence[Sequence[Point]]
) -> list[Point]:
    """The distinct corners of a valid outline with its strokes, not closed:
    InvalidOutlineError otherwise."""
    _parse(points, strokes)
    ring = _distinct(points)
    if ring[-1] == ring[0]:
        ring.pop()
    return ring


def _parse(points: Sequence[Point], strokes: Sequence[Sequence[Point]]) -> None:
    data: dict[str, object] = {
        "name": "edit",
        "source": "an outline edited by hand (TASK-079)",
        "license": "as the image",
        "points": [[x, y] for x, y in points],
    }
    if strokes:
        data["strokes"] = [[[x, y] for x, y in s] for s in strokes]
    parse_outline(data)


def _size(ring: Sequence[Point]) -> float:
    xs = [x for x, _ in ring]
    ys = [y for _, y in ring]
    return max(max(xs) - min(xs), max(ys) - min(ys))


def _distinct(points: Sequence[Point]) -> list[Point]:
    """The points with repeats in a row dropped; InvalidEditError when they
    are too many to be a drawing."""
    if len(points) > MAX_DRAWN_POINTS:
        raise InvalidEditError(
            "too_many_corners",
            f"the drawing has {len(points)} points, at most {MAX_DRAWN_POINTS}",
        )
    out: list[Point] = []
    for x, y in points:
        if not out or (x, y) != out[-1]:
            out.append((float(x), float(y)))
    return out


def _length(line: Sequence[Point]) -> float:
    return sum(math.dist(a, b) for a, b in zip(line, line[1:], strict=False))


def _drawn_polygon(drawn: Sequence[Point], size: float) -> Polygon:
    """The drawing closed into a polygon and simplified like the outline;
    where it crosses itself, its largest piece."""
    line = _distinct(drawn)
    if len(line) < 3 or _length(line) < MIN_DRAWN_SHARE * size:
        raise InvalidEditError("short", "the part is too small: draw a larger one")
    # make_valid gives polygons, lines where it folds back, or a mix of them;
    # twice get_parts flattens a mix holding a multipolygon.
    valid = shapely.make_valid(Polygon(line))
    pieces = shapely.get_parts(shapely.get_parts(valid))
    polygons = [p for p in pieces if isinstance(p, Polygon) and not p.is_empty]
    if not polygons:
        raise InvalidEditError("short", "the part is too small: draw a larger one")
    largest = Polygon(max(polygons, key=lambda p: p.area).exterior)
    simple = largest.simplify(SIMPLIFY_SHARE * size, preserve_topology=True)
    left, bottom, right, top = simple.bounds
    if max(right - left, top - bottom) < MIN_DRAWN_SHARE * size:
        raise InvalidEditError("short", "the part is too small: draw a larger one")
    return simple


def _attached(
    line: list[Point], hosts: Sequence[LineString], size: float
) -> list[Point]:
    """The line starting exactly on the nearest host: the points it draws
    along the host before leaving it are left out."""
    snap = SNAP_SHARE * size

    def distance(p: Point) -> float:
        return min(h.distance(ShapelyPoint(p)) for h in hosts)

    if distance(line[0]) > snap:
        raise InvalidEditError(
            "not_on_line", "the detail must start on the yellow line"
        )
    last = 0
    while last + 1 < len(line) and distance(line[last + 1]) <= snap:
        last += 1
    rest = line[last + 1 :]
    if not rest:
        raise InvalidEditError(
            "short", "the line stays on the yellow line: draw away from it"
        )
    near = ShapelyPoint(line[last])
    host = min(hosts, key=lambda h: h.distance(near))
    start = nearest_points(host, near)[0]
    return [(start.x, start.y), *rest]


def _looped(line: list[Point], size: float) -> list[Point]:
    """The line up to where it first crosses itself, closing a loop there;
    or closed on an earlier point its end comes back close to."""
    for j in range(2, len(line) - 1):
        side = LineString(line[j : j + 2])
        for i in range(j - 1):
            earlier = LineString(line[i : i + 2])
            if side.intersects(earlier):
                cross = side.intersection(earlier)
                at = nearest_points(cross, ShapelyPoint(line[i]))[0]
                meet = (at.x, at.y)
                return [*line[: i + 1], meet, *line[i + 1 : j + 1], meet]
    end = line[-1]
    for m in range(len(line) - 3):
        if math.dist(line[m], end) <= CLOSE_SHARE * size:
            return [*line[:-1], line[m]]
    return line


def _simplified(line: list[Point], size: float) -> tuple[Point, ...]:
    """The stroke with its corners only, like the outline: the stem and the
    loop at its end, if it has one, each simplified on its own."""
    tolerance = SIMPLIFY_SHARE * size
    loop = line.index(line[-1])
    if loop == len(line) - 1:
        stem = LineString(line).simplify(tolerance, preserve_topology=False)
        return tuple((x, y) for x, y in stem.coords)
    stem_points = line[: loop + 1]
    stem = (
        [(x, y) for x, y in LineString(stem_points).simplify(tolerance).coords]
        if len(stem_points) > 1
        else stem_points
    )
    ring = LinearRing(line[loop:]).simplify(tolerance, preserve_topology=True)
    corners = [(x, y) for x, y in ring.coords]
    # The loop starts where the stem ends: turn it to begin there.
    at = corners.index(stem[-1]) if stem[-1] in corners[:-1] else None
    if at is None or len(corners) - 1 < 3:
        raise InvalidEditError("short", "the loop is too small: draw a larger one")
    ring_points = corners[:-1]
    ring_points = ring_points[at:] + ring_points[:at]
    return (*stem, *ring_points[1:], stem[-1])
