"""Shapes read from a file: one closed outline, and maybe strokes, as JSON
(TASK-032, TASK-037); or one closed line drawn as it is (TASK-040).

    {
      "name": "star",
      "source": "where the drawing comes from",
      "license": "its licence",
      "points": [[x, y], ..., [x, y]],
      "strokes": [[[x, y], ..., [x, y]], ...]
    }

x grows to the right and y upwards, at any scale: the outline is centred and
scaled into [-1, 1]² like the other shapes. The last point repeats the first,
so a line that is not an outline is caught. One outline only: no holes, no
separate pieces, no crossings, because a route draws a single closed line.

`strokes` is optional: lines inside or beside the outline, such as a
branch, an eye or a window, that the route draws out and back (TASK-037).
A stroke starts on the outline or on an earlier stroke. The route follows
it to its end and comes back the same way; a stroke that ends on one of its
own earlier points closes a loop there, like a window hung on a line, and
only the line before the loop is travelled back. Strokes cross neither the
outline, nor each other, nor themselves.

`pieces` is optional too: lines apart from the outline, such as the eyes and
the mouth of a smiling face (TASK-223). A piece is closed when its last point
repeats its first, like an eye, and open otherwise, like a mouth. It touches
neither the outline, nor a stroke, nor another piece, nor itself. With the
pen up the route draws the outline, then each piece on its own, in the
order of the file, and walks from one to the next without drawing
(`pen_up_lines`, pieces.py). With the pen down each piece is joined to what
comes before it by the shortest link, from one of its vertices (an end of an
open piece) to the nearest line, and drawn out and back along it like a
stroke (`joined`): the same file gives both.

`lift` is optional as well: the numbers of strokes that close a loop, like
the eyes of the cat, hung from the outline by a link (TASK-223). With the pen
down nothing changes; with the pen up each of those loops is a piece of its
own, with whatever hangs from it, and its link is not drawn. So a shape of
the catalogue gets its eyes apart by one line in its file:

    {"name": "cat", ..., "strokes": [[...], [...]], "lift": [1, 2]}

`path` replaces `points` and `strokes` for a shape with no outline around
it, such as a word written in a single stroke (TASK-040):

    {"name": "ciao", "source": "...", "license": "...", "path": [[x, y], ...]}

The route follows it as it is: it may go back along itself and touch
itself, and need not enclose anything. When the last point repeats the
first, the path is closed, like an outline. When it does not, the shape is
one way (TASK-041): the route draws the path and ends where it ends. The
engine plans it as the path out and back, a closed line like the others,
and keeps the way out.
"""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from route_engine.shapes.resample import (
    Point,
    normalize,
    resample_by_arc_length,
    resample_keeping_vertices,
)

# A stroke starts on a line when its first point is this close to it, as a
# share of the outline's size; the point is then moved exactly onto the
# line, or onto a vertex of it this close.
ATTACH_TOLERANCE = 1e-3
# Where two lines meet on purpose (a stroke where it starts, a loop where it
# closes), the crossing checks leave out this share of the side.
_TRIM = 1e-6


class InvalidOutlineError(ValueError):
    """The file is not one closed outline the engine can follow."""


@dataclass(frozen=True)
class Outline:
    name: str
    source: str
    license: str
    # In [-1, 1]², the first point repeated at the end.
    points: tuple[Point, ...]
    # In the same frame as `points`; each starts on the outline or on an
    # earlier stroke (TASK-037).
    strokes: tuple[tuple[Point, ...], ...] = ()
    # True when `points` is a `path`, drawn as it is (TASK-040).
    line: bool = False
    # True when the path was open: `points` is it out and back, and the
    # route keeps the way out (TASK-041).
    one_way: bool = False
    # Lines apart from the outline, in the same frame, each drawn on its own
    # with the pen up (TASK-223); a closed one repeats its first point.
    pieces: tuple[tuple[Point, ...], ...] = ()
    # Each piece as the stroke that draws it with the pen down: from the
    # nearest point of the lines before it, then the piece (TASK-223).
    joined: tuple[tuple[Point, ...], ...] = ()
    # Strokes that close a loop, like the eyes of the cat, whose loop is a
    # piece of its own with the pen up, its link left out (TASK-223): their
    # indices in `strokes`, from 0.
    lift: tuple[int, ...] = ()

    def __call__(self, n_points: int) -> list[Point]:
        """`n_points` vertices equally spaced by arc length, like any shape.

        With strokes, along `path` instead: every vertex of it is kept, so a
        stroke comes back exactly the way it went out, and the other points
        are spread along it by length.
        """
        if not self.strokes and not self.line and not self.pieces:
            return resample_by_arc_length(self.points, n_points)
        return resample_keeping_vertices(self.path(), n_points)

    def path(self) -> list[Point]:
        """One closed line: the outline, with each stroke drawn out and back
        where it starts; the first point is repeated at the end. A `path` is
        that line already. The pieces, if any, are drawn with the pen down:
        each joined to the drawing as a stroke (`joined`)."""
        if self.line:
            return list(self.points)
        return self._drawn((*self.strokes, *self.joined))

    @property
    def in_pieces(self) -> bool:
        """Whether the shape has pieces to draw with the pen up: `pieces`,
        or strokes lifted off (`lift`)."""
        return bool(self.pieces or self.lift)

    def pen_up_lines(self) -> list[list[Point]]:
        """The lines drawn with the pen up (TASK-223): first the outline with
        its strokes, closed, from its first point; then the loop of each
        stroke in `lift`, with what hangs from it, and each piece, once, in
        the order of the file. A closed line starts and ends at its point
        nearest to where the line before ends, and an open one at its end
        nearest to it: the walks between them are short."""
        drawn = self._lines(self.strokes, frozenset(k + 1 for k in self.lift))
        lines = [drawn[0]]
        for line in [*drawn[1:], *(list(piece) for piece in self.pieces)]:
            end = lines[-1][-1]
            if line[-1] == line[0]:
                first = min(range(len(line) - 1), key=lambda i: math.dist(line[i], end))
                lines.append([*line[first:-1], *line[:first], line[first]])
            elif math.dist(line[-1], end) < math.dist(line[0], end):
                lines.append(list(reversed(line)))
            else:
                lines.append(list(line))
        return lines

    def _drawn(self, strokes: Sequence[Sequence[Point]]) -> list[Point]:
        """The outline with `strokes` drawn out and back where they start."""
        return self._lines(strokes)[0]

    def _lines(
        self, strokes: Sequence[Sequence[Point]], lifted: frozenset[int] = frozenset()
    ) -> list[list[Point]]:
        """The outline with `strokes` drawn out and back where they start,
        but those numbered in `lifted` (1 for the first); then the loop of
        each of those, closed, with what hangs from it (TASK-223)."""
        ring = list(self.points[:-1])
        lines: list[tuple[list[Point], bool]] = [(ring, True)]
        tolerance = _tolerance(ring)
        starts: dict[tuple[int, int], list[tuple[float, int]]] = {}
        for key, stroke in enumerate(strokes, start=1):
            found = _attach(stroke[0], lines, tolerance)
            if found is None:
                raise InvalidOutlineError(f"stroke {key} starts on no line")
            host, side, t, _ = found
            starts.setdefault((host, side), []).append((t, key))
            lines.append((list(stroke), False))

        def draw(key: int, begin: int = 0) -> list[Point]:
            line, closed = lines[key]
            out: list[Point] = []
            for j, vertex in enumerate(line[begin:], start=begin):
                out.append(vertex)
                for _, child in sorted(starts.get((key, j), [])):
                    if child in lifted:
                        continue
                    drawn = draw(child)
                    if drawn[0] != out[-1]:
                        out.append(drawn[0])
                    out.extend(drawn[1:])
            if closed:
                out.append(line[0])
            elif not begin:  # back the way it came, up to its loop if it has one
                out.extend(reversed(line[: _loop_start(line)]))
            return out

        return [
            draw(0),
            *(draw(key, _loop_start(lines[key][0])) for key in sorted(lifted)),
        ]


def read_outline(path: Path) -> Outline:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise InvalidOutlineError(f"cannot read the file: {exc.strerror}") from None
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise InvalidOutlineError(f"not valid JSON: {exc}") from None
    return parse_outline(data)


def parse_outline(data: object, allow_crossings: bool = False) -> Outline:
    """`allow_crossings`: the strokes may cross the outline, each other and
    themselves, as lines drawn by hand on an image do (TASK-079); each must
    still start on the outline or on an earlier stroke."""
    if not isinstance(data, dict):
        raise InvalidOutlineError(
            "expected a JSON object with name, source, license and points"
        )
    texts = {}
    for key in ("name", "source", "license"):
        value = data.get(key)
        if not isinstance(value, str) or not value.strip():
            raise InvalidOutlineError(f"{key!r} must be a non-empty string")
        texts[key] = value.strip()
    if "path" in data:
        if "points" in data or "strokes" in data:
            raise InvalidOutlineError(
                "'path' replaces 'points' and 'strokes': give one or the other"
            )
        path = _path(data["path"])
        one_way = path[-1] != path[0]
        if one_way:  # out and back: a closed line
            path += path[-2::-1]
        return Outline(
            name=texts["name"],
            source=texts["source"],
            license=texts["license"],
            points=tuple(normalize(path)),
            line=True,
            one_way=one_way,
        )
    ring = _ring(data.get("points"))
    strokes = _strokes(data.get("strokes"), ring, allow_crossings)
    pieces = _pieces(data.get("pieces"), ring, strokes, allow_crossings)
    # Outline, strokes and pieces share one frame: centred and scaled
    # together.
    flat = normalize(
        [*ring, ring[0], *(p for line in (*strokes, *pieces) for p in line)]
    )
    points, rest = flat[: len(ring) + 1], flat[len(ring) + 1 :]
    normalized: list[tuple[Point, ...]] = []
    for line in (*strokes, *pieces):
        normalized.append(tuple(rest[: len(line)]))
        rest = rest[len(line) :]
    kept, apart = normalized[: len(strokes)], normalized[len(strokes) :]
    joined = _join(list(points[:-1]), kept, apart)
    if joined and not allow_crossings:
        try:
            _check_strokes(points[:-1], [*kept, *joined])
        except InvalidOutlineError as exc:
            # Only a link can cross: the lines themselves were checked.
            raise InvalidOutlineError(
                f"with the pen down, a piece cannot be joined: {exc} "
                "(the pieces count as strokes after the strokes of the file)"
            ) from None
    return Outline(
        name=texts["name"],
        source=texts["source"],
        license=texts["license"],
        points=tuple(points),
        strokes=tuple(kept),
        pieces=tuple(apart),
        joined=tuple(joined),
        lift=_lift(data.get("lift"), ring, strokes),
    )


def _ring(raw: object) -> list[Point]:
    """The distinct vertices of a valid closed outline, without the repeat."""
    if not isinstance(raw, list) or not all(_is_pair(p) for p in raw):
        raise InvalidOutlineError("'points' must be a list of [x, y] numbers")
    points: list[Point] = [(float(x), float(y)) for x, y in raw]
    if len(points) < 2 or points[-1] != points[0]:
        raise InvalidOutlineError(
            "the outline is open: the last point must repeat the first"
        )
    ring: list[Point] = []
    for point in points[:-1]:
        if not ring or point != ring[-1]:
            ring.append(point)
    if len(ring) > 1 and ring[-1] == ring[0]:
        ring.pop()
    if len(ring) < 3:
        raise InvalidOutlineError(
            f"an outline needs at least 3 distinct points, got {len(ring)}"
        )
    # Also catches a flat outline, all on one line: somewhere it folds back.
    crossing = _first_crossing(ring)
    if crossing is not None:
        i, j = crossing
        raise InvalidOutlineError(
            f"the outline crosses itself: the sides starting at points "
            f"{i} and {j} meet"
        )
    return ring


def _path(raw: object) -> list[Point]:
    """The points of a valid line, open or closed, repeats dropped."""
    if not isinstance(raw, list) or not all(_is_pair(p) for p in raw):
        raise InvalidOutlineError("'path' must be a list of [x, y] numbers")
    points: list[Point] = []
    for x, y in raw:
        if not points or (x, y) != points[-1]:
            points.append((float(x), float(y)))
    if len(set(points)) < 2:
        raise InvalidOutlineError("the path needs at least 2 distinct points")
    return points


def _strokes(
    raw: object, ring: list[Point], allow_crossings: bool = False
) -> list[list[Point]]:
    """The strokes of a file, each start moved exactly onto its line."""
    if raw is None:
        return []
    if not isinstance(raw, list) or not all(
        isinstance(line, list) and all(_is_pair(p) for p in line) for line in raw
    ):
        raise InvalidOutlineError(
            "'strokes' must be a list of lines, each a list of [x, y] numbers"
        )
    tolerance = _tolerance(ring)
    lines: list[tuple[list[Point], bool]] = [(ring, True)]
    strokes: list[list[Point]] = []
    for i, line in enumerate(raw, start=1):
        points: list[Point] = []
        for x, y in line:
            if not points or (x, y) != points[-1]:
                points.append((float(x), float(y)))
        if len(points) < 2:
            raise InvalidOutlineError(f"stroke {i} needs at least 2 distinct points")
        loop = _loop_start(points)
        if loop < len(points) - 1 and len(points) - 1 - loop < 3:
            raise InvalidOutlineError(
                f"stroke {i} closes a loop of fewer than 3 distinct points"
            )
        found = _attach(points[0], lines, tolerance)
        if found is None:
            raise InvalidOutlineError(
                f"stroke {i} does not start on the outline or on an earlier stroke"
            )
        points[0] = found[3]
        if loop == 0:
            points[-1] = found[3]
        strokes.append(points)
        lines.append((points, False))
    if not allow_crossings:
        _check_strokes(ring, strokes)
    return strokes


def _pieces(
    raw: object,
    ring: list[Point],
    strokes: list[list[Point]],
    allow_crossings: bool = False,
) -> list[list[Point]]:
    """The pieces of a file (TASK-223): lines of at least 2 distinct points,
    3 for a closed one, that touch no other line and do not cross or fold
    back onto themselves."""
    if raw is None:
        return []
    if not isinstance(raw, list) or not all(
        isinstance(line, list) and all(_is_pair(p) for p in line) for line in raw
    ):
        raise InvalidOutlineError(
            "'pieces' must be a list of lines, each a list of [x, y] numbers"
        )
    n = len(ring)
    others = [[(ring[i], ring[(i + 1) % n]) for i in range(n)]]
    others.extend(list(zip(s, s[1:], strict=False)) for s in strokes)
    pieces: list[list[Point]] = []
    for i, line in enumerate(raw, start=1):
        points: list[Point] = []
        for x, y in line:
            if not points or (x, y) != points[-1]:
                points.append((float(x), float(y)))
        closed = len(points) > 1 and points[-1] == points[0]
        distinct = len(set(points))
        if distinct < (3 if closed else 2):
            raise InvalidOutlineError(
                f"piece {i} needs at least {3 if closed else 2} distinct points"
            )
        if closed and _first_crossing(points[:-1]) is not None:
            raise InvalidOutlineError(f"piece {i} crosses itself")
        if not closed and distinct < len(points):
            raise InvalidOutlineError(
                f"piece {i} comes back to a point of its own: close it where "
                "it starts, or leave it open"
            )
        sides = list(zip(points, points[1:], strict=False))
        if not allow_crossings:
            if not closed:
                for k in range(len(points) - 2):
                    if _folds_back(*points[k : k + 3]):
                        raise InvalidOutlineError(f"piece {i} folds back onto itself")
                for k, side in enumerate(sides):
                    if any(_meet(*side, *other) for other in sides[k + 2 :]):
                        raise InvalidOutlineError(f"piece {i} crosses itself")
            for j, other in enumerate(others):
                if any(_meet(*s, *o) for s in sides for o in other):
                    what = (
                        "the outline"
                        if j == 0
                        else (
                            f"stroke {j}"
                            if j <= len(strokes)
                            else f"piece {j - len(strokes)}"
                        )
                    )
                    raise InvalidOutlineError(f"piece {i} touches {what}")
        pieces.append(points)
        others.append(sides)
    return pieces


def _lift(
    raw: object, ring: list[Point], strokes: list[list[Point]]
) -> tuple[int, ...]:
    """The strokes of a file lifted off with the pen up (TASK-223): their
    numbers, from 1, each once; each closes a loop, and nothing hangs from
    the link that leads to it, which the pen up leaves out."""
    if raw is None:
        return ()
    if (
        not isinstance(raw, list)
        or not all(isinstance(k, int) and not isinstance(k, bool) for k in raw)
        or len(set(raw)) < len(raw)
    ):
        raise InvalidOutlineError("'lift' must be a list of stroke numbers, each once")
    lines: list[tuple[Sequence[Point], bool]] = [(ring, True)]
    tolerance = _tolerance(ring)
    hosts: list[tuple[int, int]] = []
    for stroke in strokes:
        found = _attach(stroke[0], lines, tolerance)
        assert found is not None  # _strokes attached it
        hosts.append((found[0], found[1]))
        lines.append((stroke, False))
    for k in raw:
        if not 1 <= k <= len(strokes):
            raise InvalidOutlineError(
                f"'lift': there is no stroke {k}, the file has {len(strokes)}"
            )
        loop = _loop_start(strokes[k - 1])
        if loop == len(strokes[k - 1]) - 1:
            raise InvalidOutlineError(
                f"'lift': stroke {k} closes no loop, it has nothing to lift"
            )
        for m, (host, side) in enumerate(hosts, start=1):
            if host == k and side < loop:
                raise InvalidOutlineError(
                    f"'lift': stroke {m} hangs from the link of stroke {k}, "
                    "which the pen up leaves out"
                )
    return tuple(k - 1 for k in raw)


def _join(
    ring: list[Point],
    strokes: Sequence[Sequence[Point]],
    pieces: Sequence[Sequence[Point]],
) -> list[tuple[Point, ...]]:
    """Each piece as the stroke that draws it with the pen down (TASK-223):
    from the point of the lines before it nearest to the piece (the outline,
    the strokes, the pieces joined before, their links too) to the nearest
    vertex of a closed piece, around it and back to that vertex, or to the
    nearest end of an open one, and along it. A closed piece hangs from its
    link like the window of TASK-037."""
    lines: list[tuple[Sequence[Point], bool]] = [(ring, True)]
    lines.extend((stroke, False) for stroke in strokes)
    tolerance = _tolerance(ring)
    joined: list[tuple[Point, ...]] = []
    for piece in pieces:
        closed = piece[-1] == piece[0]
        entries = range(len(piece) - 1) if closed else (0, len(piece) - 1)
        best: tuple[float, int, Point] | None = None
        for i in entries:
            for line, is_closed in lines:
                for j in range(len(line) if is_closed else len(line) - 1):
                    a, b = line[j], line[(j + 1) % len(line)]
                    near = _along(a, b, _share(piece[i], a, b))
                    d = math.dist(piece[i], near)
                    if best is None or d < best[0]:
                        best = (d, i, near)
        assert best is not None  # a piece has points, the outline sides
        _, i, near = best
        found = _attach(near, lines, tolerance)
        anchor = near if found is None else found[3]
        if closed:
            ring_piece = list(piece[:-1])
            line = [anchor, *ring_piece[i:], *ring_piece[:i], ring_piece[i]]
        else:
            line = [anchor, *(piece if i == 0 else reversed(piece))]
        joined.append(tuple(line))
        lines.append((line, False))
    return joined


def _tolerance(ring: Sequence[Point]) -> float:
    xs = [x for x, _ in ring]
    ys = [y for _, y in ring]
    return ATTACH_TOLERANCE * max(max(xs) - min(xs), max(ys) - min(ys))


def _loop_start(line: Sequence[Point]) -> int:
    """Index of the first point equal to the last one: where the loop at the
    end of a stroke closes, or the last index when it has none."""
    return list(line).index(line[-1])


def _attach(
    point: Point, lines: Sequence[tuple[Sequence[Point], bool]], tolerance: float
) -> tuple[int, int, float, Point] | None:
    """Where `point` lies on one of `lines` (closed or open) within
    `tolerance`: the line, its side, the share of the side from its first
    vertex, and the point moved exactly there. The nearest line wins, the
    first one on a tie; close to a vertex, the point is that vertex."""
    best: tuple[float, int, int, float] | None = None
    for h, (line, closed) in enumerate(lines):
        for j in range(len(line) if closed else len(line) - 1):
            a, b = line[j], line[(j + 1) % len(line)]
            t = _share(point, a, b)
            d = math.dist(point, _along(a, b, t))
            if d <= tolerance and (best is None or d < best[0]):
                best = (d, h, j, t)
    if best is None:
        return None
    _, h, j, t = best
    line, _ = lines[h]
    a, b = line[j], line[(j + 1) % len(line)]
    side = math.dist(a, b)
    if t * side <= tolerance:
        return h, j, 0.0, a
    if (1.0 - t) * side <= tolerance:
        return h, (j + 1) % len(line), 0.0, b
    return h, j, t, _along(a, b, t)


def _share(p: Point, a: Point, b: Point) -> float:
    """Where the point of the segment a-b nearest to p lies: 0 at a, 1 at b."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    return min(1.0, max(0.0, t))


def _along(a: Point, b: Point, t: float) -> Point:
    return a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])


def _stroke_sides(points: Sequence[Point]) -> list[tuple[Point, Point]]:
    """The sides of a stroke, less a hair where it touches another line on
    purpose: at its start, and at its end when it closes a loop."""
    sides = list(zip(points, points[1:], strict=False))
    a, b = sides[0]
    sides[0] = (_along(a, b, _TRIM), b)
    if _loop_start(points) < len(points) - 1:
        a, b = sides[-1]
        sides[-1] = (a, _along(b, a, _TRIM))
    return sides


def _check_strokes(ring: Sequence[Point], strokes: Sequence[Sequence[Point]]) -> None:
    n = len(ring)
    outline = [(ring[i], ring[(i + 1) % n]) for i in range(n)]
    drawn: list[list[tuple[Point, Point]]] = []
    for i, points in enumerate(strokes, start=1):
        sides = _stroke_sides(points)
        if any(_meet(*s, *o) for s in sides for o in outline):
            raise InvalidOutlineError(f"stroke {i} crosses the outline")
        for j, other in enumerate(drawn, start=1):
            if any(_meet(*s, *o) for s in sides for o in other):
                raise InvalidOutlineError(f"strokes {j} and {i} cross")
        for k in range(len(points) - 2):
            if _folds_back(*points[k : k + 3]):
                raise InvalidOutlineError(f"stroke {i} folds back onto itself")
        for k, side in enumerate(sides):
            if any(_meet(*side, *other) for other in sides[k + 2 :]):
                raise InvalidOutlineError(f"stroke {i} crosses itself")
        drawn.append(sides)


def _is_pair(value: object) -> bool:
    return (
        isinstance(value, list)
        and len(value) == 2
        and all(
            isinstance(v, int | float) and not isinstance(v, bool) and math.isfinite(v)
            for v in value
        )
    )


def _orient(a: Point, b: Point, c: Point) -> float:
    """Positive when a → b → c turns left, zero when they are on a line."""
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _folds_back(a: Point, b: Point, c: Point) -> bool:
    """b → c goes back along a → b."""
    return (
        _orient(a, b, c) == 0
        and (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) < 0
    )


def _within(a: Point, b: Point, p: Point) -> bool:
    """p, on the line through a and b, lies on the segment a-b."""
    (x0, x1), (y0, y1) = sorted((a[0], b[0])), sorted((a[1], b[1]))
    return x0 <= p[0] <= x1 and y0 <= p[1] <= y1


def _meet(p1: Point, p2: Point, q1: Point, q2: Point) -> bool:
    d1, d2 = _orient(q1, q2, p1), _orient(q1, q2, p2)
    d3, d4 = _orient(p1, p2, q1), _orient(p1, p2, q2)
    if d1 * d2 < 0 and d3 * d4 < 0:
        return True
    return (
        (d1 == 0 and _within(q1, q2, p1))
        or (d2 == 0 and _within(q1, q2, p2))
        or (d3 == 0 and _within(p1, p2, q1))
        or (d4 == 0 and _within(p1, p2, q2))
    )


def _first_crossing(ring: Sequence[Point]) -> tuple[int, int] | None:
    """The first two sides that meet, other than neighbours at their shared
    vertex; a side that folds back onto the previous one counts too."""
    n = len(ring)
    sides = [(ring[i], ring[(i + 1) % n]) for i in range(n)]
    for i, (a, b) in enumerate(sides):
        if _folds_back(a, b, sides[(i + 1) % n][1]):
            return i, (i + 1) % n
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            if _meet(a, b, *sides[j]):
                return i, j
    return None
