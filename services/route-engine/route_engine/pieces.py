"""Shapes in pieces, drawn with the pen up (TASK-223).

A shape may have pieces apart from its outline, such as the eyes and the
mouth of a smiling face (shapes/outline.py). With the pen up the route draws
the outline with its strokes, then each piece on its own, and walks from
the end of one to the start of the next without drawing, as between the
letters of a word (TASK-197, ADR-0157): the app pauses the recording on the
walks, the map shows them dashed, the distance asked for is the drawing's.

It is that word: `compose` writes the shape as a `Word` with the pen up, one
"letter" for each of its lines (`Outline.pen_up_lines`), and the search
places, moves and judges it the way it does a word (optimizer.search,
pen_up.trace, pen_up.similarity). The outline holds the start and does not
move; each piece may move a little to where the roads are, as a letter does.

What a letter height is to a word, PIECE_HEIGHT is to a shape in pieces.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

from route_engine.shapes.outline import Outline
from route_engine.shapes.resample import Point
from route_engine.words import Letter, Place, Word

# One "letter height" of a shape in pieces, as a share of its size, the
# side of the square it fills: the unit of how far a piece may move
# (words.MAX_SHIFT: 1/16 of the size), of the band its roads are counted in
# (optimizer.LETTER_BAND) and of the tolerance of its similarity
# (optimizer.WORD_TOLERANCE: 1/32 of the size, about the 1% of its perimeter
# the shape similarity allows a circle).
PIECE_HEIGHT = 0.25
# Points of the lines the route draws, all pieces together, spread by length
# with every vertex kept: twice SHAPE_POINTS, for pieces that are small.
PIECE_POINTS = 128


class NoPiecesError(ValueError):
    """The shape has no pieces to draw with the pen up."""


def compose(outline: Outline, name: str, points: int = PIECE_POINTS) -> Word:
    """The open line that draws `outline` with the pen up: its lines in the
    order of `Outline.pen_up_lines`, each side cut into pieces at most
    1/`points` of their length together, and the gap from the end of each
    line to the start of the next cut the same way, half from each end, as
    `words.compose` cuts the gaps of a word."""
    lines = outline.pen_up_lines()
    if len(lines) < 2:
        raise NoPiecesError(f"{name} has no pieces to draw with the pen up")
    # In piece heights: the frame of `outline` is 2 wide or high.
    unit = 2 * PIECE_HEIGHT
    lines = [[(x / unit, y / unit) for x, y in line] for line in lines]
    step = sum(_length(line) for line in lines) / points
    line: list[tuple[Point, Place]] = []
    for k, drawn in enumerate(lines):
        if line:
            exit_, entry = line[-1][0], drawn[0]
            half = _cuts(math.dist(exit_, entry) / 2, step)
            shares = [f / 2 for f in half] + [0.5 + f / 2 for f in half]
            line.extend((_along(exit_, entry, t), Place(k - 1, t)) for t in shares[:-1])
        line.append((drawn[0], Place(k)))
        for a, b in zip(drawn, drawn[1:], strict=False):
            line.extend(
                (_along(a, b, f), Place(k)) for f in _cuts(math.dist(a, b), step)
            )
    units = tuple(p for p, _ in line)
    xs = [x for x, _ in units]
    ys = [y for _, y in units]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    half_size = max(max(xs) - min(xs), max(ys) - min(ys)) / 2
    return Word(
        text=name,
        letters=tuple(Letter("", tuple(drawn)) for drawn in lines),
        units=units,
        places=tuple(place for _, place in line),
        starts=(0,),
        points=tuple(((x - cx) / half_size, (y - cy) / half_size) for x, y in units),
        height=1.0 / half_size,
        phases=(0.0,),
        tops=(False,) * (len(lines) - 1),
        pen_up=True,
        kind="piece",
    )


def _cuts(length: float, step: float) -> list[float]:
    """Shares of a side where it is cut into equal pieces at most `step`
    long, the far end included (as words._cuts)."""
    n = max(1, math.ceil(length / step - 1e-9))
    return [j / n for j in range(1, n + 1)]


def _along(a: Point, b: Point, t: float) -> Point:
    return a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])


def _length(line: Sequence[Point]) -> float:
    return sum(math.dist(a, b) for a, b in zip(line, line[1:], strict=False))
