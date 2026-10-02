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
them: the A comes back along its legs, so the base never closes it. Only
the letters that have a base of their own, B, D and Z, come back along it.

All 26 capitals are there since TASK-059. Each is entered at its leftmost
point on the base line and left at its rightmost, so the line that joins
the letters never runs over one. That line would swallow any stroke lying
on it: the lowest arm of the E and of the L stands a little above it, or
in the middle of a word they would read as an F and an I.

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

A word comes in one of two styles (TASK-077). "round", the default, is the
alphabet above. "block" is `letters_block.json`, in the same format: every
stroke level, upright or at 45°, the letters 0.8–1 wide and BLOCK_GAP
apart, like the GPS art of blocky words run on a street grid; the search
turns it the way the streets run (`optimizer.search`).

Two letters may also be joined along the top line, y = 1, where that makes
the word shorter and reads as well (TASK-067): at equal kilometres a
shorter line gives taller letters. A letter that may be joined there says
where, at its upper corners:

    "V": {"top": {"in": [0, 1], "out": [0.6, 1]}, "out": [...]}

The rules of reading are checked on the alphabet (`parse_letters`): a join
along the top does not lengthen a stroke that ends on the top line (the bar
of the T, the upper arm of the E), does not run over the letter, and does
not meet a letter that reaches the top line in one point only (the I would
read as a T). A letter entered or left at the top is the same closed line,
started and cut elsewhere (`Letter.route`): it is drawn the same. Each gap
runs along the base or along the top, never across, and `choose_joins`
keeps the shortest word. Off by default (TOP_JOINS).
"""

from __future__ import annotations

import json
import math
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from itertools import product
from pathlib import Path
from typing import Literal

import numpy as np

from route_engine.shapes.resample import Point

LETTERS = Path(__file__).with_name("letters.json")
BLOCK_LETTERS = Path(__file__).with_name("letters_block.json")

Style = Literal["round", "block"]

# Space between two letters, in letter heights. «CIAO» of TASK-040 had
# about 0.3, and the user asked for the letters farther apart.
LETTER_GAP = 0.6
# Block letters stand closer, as in the blocky words the user pointed to.
BLOCK_GAP = 0.3
# Longest side of a word, in letter heights: for letters 1 km high, a
# waypoint every 60 m. Along the I of TASK-040 there was none.
SIDE_STEP = 1 / 16
# How far a letter may move from its place in the row, in letter heights,
# and the step of the grid of moves tried (optimizer.fit_letters).
MAX_SHIFT = 0.25
SHIFT_STEP = 1 / 16
# A word asked for in a route request (TASK-056): at most this many letters,
# and this many metres of route for each. «CIAO» was judged good at 15 km,
# 3.75 km a letter, with letters 700–800 m high (ADR-0044); with less the
# letters shrink below what city blocks can draw, and every letter adds
# some 75 waypoints to a search that takes 40–140 s for four.
MAX_WORD_LETTERS = 8
LETTER_DISTANCE_M = 3000
# Whether the letters of each style may be joined along the top line too
# (TASK-067, `choose_joins`), unless `compose` is told.
TOP_JOINS: dict[str, bool] = {"round": False, "block": False}


class InvalidWordError(ValueError):
    """The alphabet is broken, or the word has a letter it lacks."""


@dataclass(frozen=True)
class Letter:
    char: str
    # From the entry to the exit, both on the base line (`route` for a
    # letter entered or left at the top).
    out: tuple[Point, ...]
    # From the exit back to the entry; empty when they are the same point.
    back: tuple[Point, ...] = ()
    # Where a join along the top line, y = 1, enters and leaves the letter
    # (TASK-067); None where the letter is joined along the base only.
    top_in: Point | None = None
    top_out: Point | None = None

    @property
    def left(self) -> float:
        return min(x for x, _ in (*self.out, *self.back))

    @property
    def right(self) -> float:
        return max(x for x, _ in (*self.out, *self.back))

    def route(
        self, top_in: bool = False, top_out: bool = False
    ) -> tuple[tuple[Point, ...], tuple[Point, ...]]:
        """`out` and `back` for the letter entered (`top_in`) or left
        (`top_out`) at the top instead of on the base line.

        The same closed line, started at the entry and cut at the exit: the
        letter is drawn the same, as long and as many times over. `out` is
        cut as late as it can be.
        """
        if not (top_in or top_out):
            return self.out, self.back
        entry = self.top_in if top_in else self.out[0]
        leave = self.top_out if top_out else self.out[-1]
        if entry is None or leave is None:
            raise InvalidWordError(f"{self.char} is not joined along the top")
        ring = [*self.out, *self.back[1:]][:-1]
        first = ring.index(entry)
        turned = [*ring[first:], *ring[:first], entry]
        if leave == entry:
            return tuple(turned), ()
        cut = len(turned) - 1 - turned[::-1].index(leave)
        return tuple(turned[: cut + 1]), tuple(turned[cut:])


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
    style: Style = "round"
    # For each gap, whether it runs along the top line (TASK-067).
    tops: tuple[bool, ...] = ()

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
        top_in, top_out = _top(char, raw.get("top"), [*out, *back])
        letters[char] = Letter(char, tuple(out), tuple(back), top_in, top_out)
    return letters


def _top(
    char: str, raw: object, line: list[Point]
) -> tuple[Point | None, Point | None]:
    """Where `char`, drawn by `line`, is joined along the top line: its
    'in' and 'out', checked against the rules of reading (TASK-067)."""
    if raw is None:
        return None, None
    if not isinstance(raw, dict) or not raw or set(raw) - {"in", "out"}:
        raise InvalidWordError(f"{char}: 'top' must be an object with 'in', 'out'")
    xs = [x for x, _ in line]
    ends: list[Point | None] = []
    for key, edge in (("in", min(xs)), ("out", max(xs))):
        if key not in raw:
            ends.append(None)
            continue
        if not _is_pair(raw[key]):
            raise InvalidWordError(f"{char}: 'top' {key!r} must be an [x, y] point")
        point = (float(raw[key][0]), float(raw[key][1]))
        if point[1] != 1.0 or point not in line:
            raise InvalidWordError(
                f"{char}: 'top' {key!r} must be a point of the letter on the "
                "top line, y = 1"
            )
        if len({p for p in line if p[1] == 1.0}) < 2:
            raise InvalidWordError(
                f"{char}: a letter that reaches the top line in one point only "
                "is not joined there"
            )
        if point[0] != edge:
            raise InvalidWordError(
                f"{char}: a join along the top must not run over the letter: "
                "'in' at its left edge, 'out' at its right"
            )
        if _ends_on_top(line, point):
            raise InvalidWordError(
                f"{char}: a join along the top must not lengthen a stroke "
                "that ends on the top line"
            )
        ends.append(point)
    return ends[0], ends[1]


def _ends_on_top(line: list[Point], point: Point) -> bool:
    """Whether `point` lies on a stroke along the top line that ends there:
    one of its two ends has no other stroke leaving it (the bar of the T,
    the upper arm of the E; not the top of a closed P)."""
    sides = list(zip(line, line[1:], strict=False))
    level = sorted(
        (min(a[0], b[0]), max(a[0], b[0])) for a, b in sides if a[1] == b[1] == 1.0
    )
    left = {p for a, b in sides if not a[1] == b[1] == 1.0 for p in (a, b)}
    strokes: list[tuple[float, float]] = []
    for lo, hi in level:
        if strokes and lo <= strokes[-1][1]:
            strokes[-1] = (strokes[-1][0], max(strokes[-1][1], hi))
        else:
            strokes.append((lo, hi))
    return any(
        lo <= point[0] <= hi and not {(lo, 1.0), (hi, 1.0)} <= left
        for lo, hi in strokes
    )


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
BLOCK_ALPHABET: dict[str, Letter] = read_letters(BLOCK_LETTERS)
# The alphabet and the gap of each style.
STYLES: dict[str, tuple[dict[str, Letter], float]] = {
    "round": (ALPHABET, LETTER_GAP),
    "block": (BLOCK_ALPHABET, BLOCK_GAP),
}


def spell_letters(chars: Iterable[str]) -> str:
    """The letters in order, a run of three or more by its ends: «A to Z»
    for the whole alphabet (TASK-059), «A, C, I, O» for the first one."""
    runs: list[list[int]] = []
    for code in sorted({ord(c) for c in chars}):
        if runs and code == runs[-1][-1] + 1:
            runs[-1].append(code)
        else:
            runs.append([code])
    parts: list[str] = []
    for run in runs:
        if len(run) >= 3:
            parts.append(f"{chr(run[0])} to {chr(run[-1])}")
        else:
            parts.extend(chr(code) for code in run)
    return ", ".join(parts)


def choose_joins(letters: Sequence[Letter], gap: float) -> tuple[bool, ...]:
    """For each gap of a word, whether its two letters are joined along the
    top line rather than the base (TASK-067).

    Of all the ways the letters allow, at most 2**7, the one that makes the
    word shortest; among equals, the one with fewest joins along the top,
    then the base first. Always the same for the same letters.
    """
    options = [
        (False, True) if a.top_out is not None and b.top_in is not None else (False,)
        for a, b in zip(letters, letters[1:], strict=False)
    ]

    def length(tops: tuple[bool, ...]) -> float:
        total = 0.0
        x = 0.0
        leave: Point | None = None
        for k, letter in enumerate(letters):
            out, back = letter.route(k > 0 and tops[k - 1], k < len(tops) and tops[k])
            dx = x - letter.left
            if leave is not None:
                total += 2 * math.dist(leave, (out[0][0] + dx, out[0][1]))
            total += _length(out) + _length(back)
            leave = (out[-1][0] + dx, out[-1][1])
            x += letter.right - letter.left + gap
        return total

    return min(
        product(*options), key=lambda tops: (round(length(tops), 9), sum(tops), tops)
    )


def compose(
    text: str,
    alphabet: dict[str, Letter] | None = None,
    gap: float | None = None,
    step: float = SIDE_STEP,
    style: Style = "round",
    top_joins: bool | None = None,
) -> Word:
    """The closed line that writes `text` (any case) with `alphabet`, its
    letters `gap` apart: by default the alphabet and gap of `style`. With
    `top_joins` the letters may be joined along the top line too
    (`choose_joins`); TOP_JOINS says whether, for the style, when None."""
    if style not in STYLES:
        raise InvalidWordError(f"no style {style!r}: {' or '.join(STYLES)}")
    alphabet = STYLES[style][0] if alphabet is None else alphabet
    gap = STYLES[style][1] if gap is None else gap
    top_joins = TOP_JOINS[style] if top_joins is None else top_joins
    chars = text.strip().upper()
    if not chars:
        raise InvalidWordError("the word is empty")
    missing = sorted({c for c in chars if c not in alphabet})
    if missing:
        raise InvalidWordError(
            f"no letter {', '.join(missing)}: "
            f"a word can use only the letters {spell_letters(alphabet)}"
        )
    letters = tuple(alphabet[c] for c in chars)
    tops = choose_joins(letters, gap) if top_joins else (False,) * (len(letters) - 1)
    outs: list[list[Point]] = []
    backs: list[list[Point]] = []
    x = 0.0
    for k, letter in enumerate(letters):
        out, back = letter.route(k > 0 and tops[k - 1], k < len(tops) and tops[k])
        dx = x - letter.left
        outs.append([(px + dx, py) for px, py in out])
        backs.append([(px + dx, py) for px, py in back])
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
        style=style,
        tops=tops,
    )


def _cuts(length: float, step: float) -> list[float]:
    """Shares of a side where it is cut into equal pieces at most `step`
    long, the far end included."""
    n = max(1, math.ceil(length / step - 1e-9))
    return [j / n for j in range(1, n + 1)]


def _along(a: Point, b: Point, t: float) -> Point:
    return a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])


def _length(line: Sequence[Point]) -> float:
    return sum(math.dist(a, b) for a, b in zip(line, line[1:], strict=False))
