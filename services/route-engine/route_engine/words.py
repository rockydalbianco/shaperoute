"""Words written one letter at a time, in a single stroke (TASK-050).

The alphabet, `letters.json`, draws each capital one unit high on
its base line, y = 0, with x growing to the right:

    {
      "source": "...",
      "license": "...",
      "letters": {
        "A": {"out": [[0, 0], ..., [0.6, 0]], "back": [[0.6, 0], ..., [0, 0]]},
        "I": {"out": [[0, 0], [0, 1], [0, 0]]}
      }
    }

`out` goes from where the letter is entered to where it is left, both on
the base line, and may go back along itself. When the two differ, `back`
leads from the exit to the entry again without drawing the base between
them: the A comes back along its legs, so the base never closes it.

A word puts its letters in a row, LETTER_GAP apart, joined along the base
line. The route writes them left to right, then comes back along the base
and the letters' `back` to where it started: one closed line, like any
shape. The line starts half-way along the first gap, and every side is cut
into pieces at most SIDE_STEP long, so that the route has a waypoint every
few tens of metres.

Every vertex knows which letter it belongs to, or which gap and how far
along it: the search moves each letter a little, to where the roads are
(`optimizer.fit_letters`), and the gaps stretch to follow. The point where
the route starts stays where it is.
"""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from route_engine.shapes.resample import Point

LETTERS = Path(__file__).with_name("letters.json")

# Space between two letters, in letter heights. «CIAO» of TASK-040 had
# about 0.3, and the user asked for the letters farther apart.
LETTER_GAP = 0.6
# Longest side of a word, in letter heights: for letters 1 km high, a
# waypoint every 60 m. Along the I of TASK-040 there was none.
SIDE_STEP = 1 / 16
# How far a letter may move from its place in the row, in letter heights,
# and the step of the grid of moves tried (optimizer.fit_letters).
MAX_SHIFT = 0.25
SHIFT_STEP = 1 / 16


class InvalidWordError(ValueError):
    """The alphabet is broken, or the word has a letter it lacks."""


@dataclass(frozen=True)
class Letter:
    char: str
    # From the entry to the exit, both on the base line.
    out: tuple[Point, ...]
    # From the exit back to the entry; empty when they are the same point.
    back: tuple[Point, ...] = ()

    @property
    def left(self) -> float:
        return min(x for x, _ in (*self.out, *self.back))

    @property
    def right(self) -> float:
        return max(x for x, _ in (*self.out, *self.back))


@dataclass(frozen=True)
class Place:
    """Where a vertex of a word lies: on letter `index` when `along` is
    None; otherwise on the gap after letter `index`, `along` of the way
    from that letter to the next."""

    index: int
    along: float | None = None


@dataclass(frozen=True)
class Word:
    text: str
    letters: tuple[Letter, ...]
    # The closed line in letter heights, the first point repeated at the
    # end. It starts half-way along the first gap (at the entry of a lone
    # letter).
    units: tuple[Point, ...]
    places: tuple[Place, ...]  # one for each point of `units`
    # Where the route may start: the index in `units` of the middle of each
    # gap, on the way out.
    starts: tuple[int, ...]
    # `units` centred and scaled into [-1, 1]² like every shape, and one
    # letter height in that frame.
    points: tuple[Point, ...]
    height: float
    # Arc-length share of `points` at each of `starts`: the phases the
    # search may enter the word at.
    phases: tuple[float, ...]

    def line(self, start: int) -> tuple[np.ndarray, np.ndarray]:
        """The word as the route draws it from `starts[start]`: its
        normalized points, closed, and how far each moves when a letter
        moves by one letter height (one column per letter).

        A letter's points move with it; a gap is stretched between the two
        letters it joins, and the gap the route starts from is pinned at
        its middle, so the first point never moves. A lone letter never
        moves: the search places the word.
        """
        order = self._order(start)
        weights = np.zeros((len(order), len(self.letters)))
        if len(self.letters) > 1:
            for row, k in enumerate(order):
                place = self.places[k]
                t = place.along
                if t is None:
                    weights[row, place.index] = 1.0
                elif place.index == start:
                    if t <= 0.5:
                        weights[row, place.index] = 1.0 - 2.0 * t
                    else:
                        weights[row, place.index + 1] = 2.0 * t - 1.0
                else:
                    weights[row, place.index] = 1.0 - t
                    weights[row, place.index + 1] = t
        return np.array(self.points)[order], weights * self.height

    def moved(self, start: int, shifts: np.ndarray) -> list[Point]:
        """`line(start)` with each letter moved by its row of `shifts`, in
        letter heights (x along the base line, y up)."""
        points, weights = self.line(start)
        return [(float(x), float(y)) for x, y in points + weights @ shifts]

    def strokes(self, start: int) -> list[np.ndarray]:
        """For each letter, the rows of `line(start)` that draw it, in order.

        They make one continuous line: where the route leaves a letter and
        comes back to it later, it comes back to the same point.
        """
        order = self._order(start)
        rows: list[list[int]] = [[] for _ in self.letters]
        for row, k in enumerate(order):
            place = self.places[k]
            if place.along is None:
                rows[place.index].append(row)
        return [np.array(r) for r in rows]

    def _order(self, start: int) -> list[int]:
        """The indices of `points` from `starts[start]` round to it again."""
        i = self.starts[start]
        n = len(self.points) - 1
        return [*range(i, n), *range(i + 1)]


def read_letters(path: Path = LETTERS) -> dict[str, Letter]:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise InvalidWordError(f"cannot read {path.name}: {exc.strerror}") from None
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise InvalidWordError(f"{path.name} is not valid JSON: {exc}") from None
    return parse_letters(data)


def parse_letters(data: object) -> dict[str, Letter]:
    if not isinstance(data, dict) or not isinstance(data.get("letters"), dict):
        raise InvalidWordError("expected a JSON object with 'letters'")
    letters: dict[str, Letter] = {}
    for char, raw in data["letters"].items():
        if len(char) != 1 or not char.isupper():
            raise InvalidWordError(f"{char!r} is not a capital letter")
        if not isinstance(raw, dict):
            raise InvalidWordError(f"{char}: expected an object with 'out'")
        out = _line(raw.get("out"), f"{char}: 'out'")
        back = _line(raw.get("back", []), f"{char}: 'back'", empty=True)
        if out[0][1] != 0.0 or out[-1][1] != 0.0:
            raise InvalidWordError(
                f"{char}: 'out' must start and end on the base line, y = 0"
            )
        if any(not 0.0 <= y <= 1.0 for _, y in (*out, *back)):
            raise InvalidWordError(f"{char}: y must stay between 0 and 1")
        if out[0] == out[-1]:
            if back:
                raise InvalidWordError(
                    f"{char}: 'back' is for a letter left where it is not entered"
                )
        elif not back or back[0] != out[-1] or back[-1] != out[0]:
            raise InvalidWordError(
                f"{char}: 'back' must lead from the end of 'out' to its start"
            )
        letters[char] = Letter(char, tuple(out), tuple(back))
    return letters


def _line(raw: object, what: str, empty: bool = False) -> list[Point]:
    """The points of a line, repeats dropped."""
    if not isinstance(raw, list) or not all(_is_pair(p) for p in raw):
        raise InvalidWordError(f"{what} must be a list of [x, y] numbers")
    points: list[Point] = []
    for x, y in raw:
        if not points or (x, y) != points[-1]:
            points.append((float(x), float(y)))
    if len(set(points)) < 2 and not (empty and not points):
        raise InvalidWordError(f"{what} needs at least 2 distinct points")
    return points


def _is_pair(value: object) -> bool:
    return (
        isinstance(value, list)
        and len(value) == 2
        and all(
            isinstance(v, int | float) and not isinstance(v, bool) and math.isfinite(v)
            for v in value
        )
    )


ALPHABET: dict[str, Letter] = read_letters()


def compose(
    text: str,
    alphabet: dict[str, Letter] | None = None,
    gap: float = LETTER_GAP,
    step: float = SIDE_STEP,
) -> Word:
    """The closed line that writes `text` (any case) with `alphabet`."""
    alphabet = ALPHABET if alphabet is None else alphabet
    chars = text.strip().upper()
    if not chars:
        raise InvalidWordError("the word is empty")
    missing = sorted({c for c in chars if c not in alphabet})
    if missing:
        raise InvalidWordError(
            f"no letter {', '.join(missing)} in the alphabet, "
            f"which has {''.join(sorted(alphabet))}"
        )
    letters = tuple(alphabet[c] for c in chars)
    outs: list[list[Point]] = []
    backs: list[list[Point]] = []
    x = 0.0
    for letter in letters:
        dx = x - letter.left
        outs.append([(px + dx, py) for px, py in letter.out])
        backs.append([(px + dx, py) for px, py in letter.back])
        x += letter.right - letter.left + gap

    line: list[tuple[Point, Place]] = [(outs[0][0], Place(0))]

    def draw(points: Sequence[Point], index: int) -> None:
        for a, b in zip(points, points[1:], strict=False):
            for f in _cuts(math.dist(a, b), step):
                line.append((_along(a, b, f), Place(index)))

    def cross(index: int, forward: bool) -> None:
        """The gap after letter `index`, to the next letter or back."""
        a, b = outs[index][-1], outs[index + 1][0]
        half = _cuts(math.dist(a, b) / 2, step)
        shares = [f / 2 for f in half] + [0.5 + f / 2 for f in half]
        if forward:
            for t in shares[:-1]:
                line.append((_along(a, b, t), Place(index, t)))
            line.append((b, Place(index + 1)))
        else:  # the same points, so that out and back coincide
            for t in reversed(shares[:-1]):
                line.append((_along(a, b, t), Place(index, t)))
            line.append((a, Place(index)))

    for k in range(len(letters)):
        draw(outs[k], k)
        if k + 1 < len(letters):
            cross(k, forward=True)
    for k in reversed(range(len(letters))):
        draw(backs[k], k)
        if k > 0:
            cross(k - 1, forward=False)

    first = next((i for i, (_, place) in enumerate(line) if place == Place(0, 0.5)), 0)
    ring = line[first:-1] + line[:first] + [line[first]]
    units = tuple(p for p, _ in ring)
    places = tuple(place for _, place in ring)
    starts = [0]
    for g in range(1, len(letters) - 1):
        starts.append(places.index(Place(g, 0.5)))
    xs = [px for px, _ in units]
    ys = [py for _, py in units]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    half = max(max(xs) - min(xs), max(ys) - min(ys)) / 2
    points = tuple(((px - cx) / half, (py - cy) / half) for px, py in units)
    cumulative = [0.0]
    for a, b in zip(points, points[1:], strict=False):
        cumulative.append(cumulative[-1] + math.dist(a, b))
    return Word(
        text=chars,
        letters=letters,
        units=units,
        places=places,
        starts=tuple(starts),
        points=points,
        height=1.0 / half,
        phases=tuple(cumulative[i] / cumulative[-1] for i in starts),
    )


def _cuts(length: float, step: float) -> list[float]:
    """Shares of a side where it is cut into equal pieces at most `step`
    long, the far end included."""
    n = max(1, math.ceil(length / step - 1e-9))
    return [j / n for j in range(1, n + 1)]


def _along(a: Point, b: Point, t: float) -> Point:
    return a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])
