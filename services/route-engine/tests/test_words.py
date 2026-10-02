import hashlib
import string
from collections import Counter
from dataclasses import replace
from itertools import pairwise

import networkx as nx
import numpy as np
import pytest

from route_engine import optimizer
from route_engine.geo import haversine_m, local_to_latlon
from route_engine.models import InvalidRequestError, RouteRequest
from route_engine.network import twice_drawn
from route_engine.optimizer import plan_route
from route_engine.projection import start_at_phase
from route_engine.words import (
    ALPHABET,
    LETTER_GAP,
    SIDE_STEP,
    STYLES,
    TOP_JOINS,
    InvalidWordError,
    Letter,
    Place,
    Style,
    Word,
    choose_joins,
    compose,
    parse_letters,
    spell_letters,
)

CIAO = compose("ciao")
# Every letter once (TASK-059).
ALL = compose(string.ascii_uppercase)
# The letters with a base of their own. The others leave the base open
# between their feet, like the A (ADR-0044, ADR-0056).
BASED = "BDZ"


def _letter(word: Word, index: int) -> np.ndarray:
    """The points of one letter of `word`, in letter heights."""
    return np.array(
        [
            p
            for p, place in zip(word.units, word.places, strict=True)
            if place == Place(index)
        ]
    )


def _line_places(word: Word, start: int) -> list[Place]:
    """`word.places` in the order of `word.line(start)`."""
    i, n = word.starts[start], len(word.units) - 1
    return [word.places[k] for k in [*range(i, n), *range(i + 1)]]


def _base_x(letter: Letter) -> list[float]:
    """Where `letter` touches the base line."""
    return [x for x, y in (*letter.out, *letter.back) if y == 0.0]


def test_the_alphabet_has_every_capital_from_a_to_z() -> None:
    assert sorted(ALPHABET) == list(string.ascii_uppercase)


@pytest.mark.parametrize("char", string.ascii_uppercase)
def test_every_letter_is_one_stroke_from_the_base_line_back_to_it(char: str) -> None:
    letter = ALPHABET[char]
    assert letter.out[0][1] == 0.0 and letter.out[-1][1] == 0.0
    end = letter.back[-1] if letter.back else letter.out[-1]
    assert end == letter.out[0]
    ys = [y for _, y in (*letter.out, *letter.back)]
    assert min(ys) == 0.0 and max(ys) == 1.0


@pytest.mark.parametrize("char", string.ascii_uppercase)
def test_every_letter_is_entered_and_left_at_the_ends_of_its_base(char: str) -> None:
    letter = ALPHABET[char]
    assert letter.out[0][0] == min(_base_x(letter))
    assert letter.out[-1][0] == max(_base_x(letter))


@pytest.mark.parametrize("char", string.ascii_uppercase)
def test_only_b_d_and_z_draw_along_the_base_line(char: str) -> None:
    letter = ALPHABET[char]
    along = sum(
        abs(b[0] - a[0])
        for line in (letter.out, letter.back)
        for a, b in zip(line, line[1:], strict=False)
        if a[1] == b[1] == 0.0
    )
    # The E and the L too keep their lowest arm off it: on it, the line
    # joining the letters would leave an F and an I.
    assert (along > 0) == (char in BASED)


@pytest.mark.parametrize("char", string.ascii_uppercase)
def test_every_letter_but_the_i_is_about_as_wide_as_the_a(char: str) -> None:
    letter = ALPHABET[char]
    width = letter.right - letter.left
    if char == "I":
        assert width == 0.0
    else:  # M and W the widest
        assert 0.45 <= width <= 0.85


def test_a_word_with_every_letter_is_one_closed_line_of_short_sides() -> None:
    assert ALL.text == string.ascii_uppercase
    assert ALL.units[0] == ALL.units[-1]
    assert ALL.places[0] == Place(0, 0.5)
    sides = np.hypot(*np.diff(np.array(ALL.units), axis=0).T)
    assert sides.max() <= SIDE_STEP + 1e-12
    letters = [_letter(ALL, k) for k in range(26)]
    for before, after in zip(letters, letters[1:], strict=False):
        assert after[:, 0].min() - before[:, 0].max() == pytest.approx(LETTER_GAP)


def test_the_base_line_stays_open_under_every_letter_but_b_d_and_z() -> None:
    units = np.array(ALL.units)
    on_base = [
        (a[0] + b[0]) / 2
        for a, b in zip(units, units[1:], strict=False)
        if a[1] == b[1] == 0.0
    ]
    for k, letter in enumerate(ALL.letters):
        if letter.char in BASED:
            continue
        points = _letter(ALL, k)
        feet = points[points[:, 1] == 0.0, 0]
        left, right = feet.min(), feet.max()
        assert not any(left < x < right for x in on_base), letter.char


def test_the_letters_stand_in_a_row_a_gap_apart_one_unit_high() -> None:
    assert CIAO.text == "CIAO"
    letters = [_letter(CIAO, k) for k in range(4)]
    for before, after in zip(letters, letters[1:], strict=False):
        assert after[:, 0].min() - before[:, 0].max() == pytest.approx(LETTER_GAP)
    for letter, points in zip(CIAO.letters, letters, strict=True):
        assert points[:, 1].min() == 0.0 and points[:, 1].max() == 1.0
        width = points[:, 0].max() - points[:, 0].min()
        assert width == pytest.approx(letter.right - letter.left)


def test_the_gaps_run_along_the_base_line_out_and_back() -> None:
    units = np.array(CIAO.units)
    twice = twice_drawn(units, near_m=1e-9)
    on_gaps = 0
    for i, (a, b) in enumerate(zip(CIAO.places, CIAO.places[1:], strict=False)):
        if a.along is not None or b.along is not None:
            on_gaps += 1
            assert units[i, 1] == units[i + 1, 1] == 0.0
            assert twice[i]
    # Three gaps, out and back.
    assert on_gaps > 6


def test_the_way_back_does_not_close_the_a() -> None:
    units = np.array(CIAO.units)
    feet = _letter(CIAO, 2)
    left, right = feet[:, 0].min(), feet[:, 0].max()
    for a, b in zip(units, units[1:], strict=False):
        if a[1] == b[1] == 0.0:
            assert not left < (a[0] + b[0]) / 2 < right


def test_the_word_is_one_closed_line_from_half_way_along_the_first_gap() -> None:
    assert CIAO.units[0] == CIAO.units[-1]
    assert CIAO.places[0] == CIAO.places[-1] == Place(0, 0.5)
    points = np.array(CIAO.points)
    assert np.abs(points).max() == pytest.approx(1.0)
    units = np.array(CIAO.units)
    assert np.allclose((points - points[0]) / CIAO.height, units - units[0])


def test_every_side_is_at_most_a_sixteenth_of_a_letter_high() -> None:
    sides = np.hypot(*np.diff(np.array(CIAO.units), axis=0).T)
    assert sides.max() <= SIDE_STEP + 1e-12
    # Some 300 waypoints: more than the 64 of every other shape.
    assert len(sides) > 250


def test_the_route_may_start_half_way_along_each_gap() -> None:
    assert len(CIAO.phases) == len(CIAO.starts) == 3
    for k, phase in enumerate(CIAO.phases):
        assert CIAO.places[CIAO.starts[k]] == Place(k, 0.5)
        points, _ = CIAO.line(k)
        drawn = start_at_phase(list(CIAO.points), phase)
        assert np.array_equal(points, np.array(drawn))


@pytest.mark.parametrize("start", [0, 1, 2])
def test_moving_a_letter_moves_it_alone_and_stretches_its_gaps(start: int) -> None:
    shifts = np.zeros((4, 2))
    shifts[1] = (0.25, -0.125)  # the I
    points, _ = CIAO.line(start)
    moved = (np.array(CIAO.moved(start, shifts)) - points) / CIAO.height
    assert np.allclose(moved[0], 0.0) and np.allclose(moved[-1], 0.0)
    for place, move in zip(_line_places(CIAO, start), moved, strict=True):
        if place.along is None:
            assert np.allclose(move, shifts[place.index])
        else:  # a share of the move of the I, or none
            share = move / shifts[1]
            assert share[0] == pytest.approx(share[1], abs=1e-9)
            assert -1e-9 <= share[0] <= 1.0 + 1e-9


def test_a_lone_letter_never_moves() -> None:
    word = compose("O")
    _, weights = word.line(0)
    assert word.phases == (0.0,)
    assert not weights.any()


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("  ", "the word is empty"),
        ("CIAO!", "no letter !"),
        ("né1", "no letter 1, É: a word can use only the letters A to Z"),
    ],
)
def test_a_word_the_alphabet_cannot_write_is_refused(text: str, message: str) -> None:
    with pytest.raises(InvalidWordError, match=message):
        compose(text)


@pytest.mark.parametrize(
    ("chars", "spelled"),
    [
        (ALPHABET, "A to Z"),
        ("OCIA", "A, C, I, O"),
        ("ZYXFEDBA", "A, B, D to F, X to Z"),
    ],
)
def test_the_letters_are_spelled_by_their_runs(chars: str, spelled: str) -> None:
    assert spell_letters(chars) == spelled


@pytest.mark.parametrize(
    ("letters", "message"),
    [
        ({"a": {"out": [[0, 0], [0, 1], [0, 0]]}}, "not a capital letter"),
        ({"L": {"out": [[0, 1], [0, 0]]}}, "on the base line"),
        ({"T": {"out": [[0, 0], [0, 1.5], [0, 0]]}}, "between 0 and 1"),
        ({"V": {"out": [[0, 0], [0.3, 1], [0.6, 0]]}}, "'back' must lead"),
        (
            {"I": {"out": [[0, 0], [0, 1], [0, 0]], "back": [[0, 0], [0, 1]]}},
            "'back' is for",
        ),
        ({"I": {"out": [[0, 0]]}}, "at least 2 distinct points"),
    ],
)
def test_a_broken_alphabet_is_refused(letters: dict[str, object], message: str) -> None:
    with pytest.raises(InvalidWordError, match=message):
        parse_letters({"source": "test", "license": "test", "letters": letters})


@pytest.mark.parametrize(
    ("word", "start"),
    [(CIAO, 0), (CIAO, 1), (CIAO, 2), (ALL, 0), (ALL, 12), (ALL, 24)],
)
def test_each_letter_is_drawn_by_one_continuous_line(word: Word, start: int) -> None:
    points, _ = word.line(start)
    places = _line_places(word, start)
    strokes = word.strokes(start)
    assert sum(len(rows) for rows in strokes) == sum(
        place.along is None for place in places
    )
    for k, rows in enumerate(strokes):
        assert all(places[row] == Place(k) for row in rows)
        sides = np.hypot(*np.diff(points[rows], axis=0).T)
        assert sides.max() <= SIDE_STEP * word.height + 1e-12


# --- A word in a route request (TASK-056) ---

TRENTO = (46.0671, 11.1214)


@pytest.mark.parametrize(
    ("fields", "message"),
    [
        ({"shape": "heart", "word": "ciao"}, "either a shape or a word"),
        ({}, "either a shape or a word"),
        ({"word": "città"}, "no letter À: a word can use only the letters A to Z"),
        ({"word": "ciaociaoc"}, "at most 8 letters, got 9"),
        ({"word": "ciao", "distance_m": 10000}, "a 4-letter word needs at least 12 km"),
        # The letters' style, only for a word (TASK-080).
        ({"word": "ciao", "style": "italic"}, "unknown style 'italic'"),
        ({"shape": "heart", "style": "block"}, "a style is for the letters of a word"),
    ],
)
def test_a_route_request_checks_its_word(
    fields: dict[str, object], message: str
) -> None:
    with pytest.raises(InvalidRequestError, match=message):
        RouteRequest(**{"start": TRENTO, "distance_m": 15000, **fields})


def test_a_route_request_is_named_by_its_word_in_capitals() -> None:
    request = RouteRequest(start=TRENTO, distance_m=12000, word=" ciao ")
    assert request.shape is None
    assert request.name == "CIAO"
    assert RouteRequest(start=TRENTO, distance_m=5000, shape="heart").name == "heart"


def test_a_route_request_has_round_letters_unless_asked() -> None:
    assert RouteRequest(start=TRENTO, distance_m=12000, word="ciao").style == "round"
    block = RouteRequest(start=TRENTO, distance_m=12000, word="ciao", style="block")
    assert block.style == "block"


def _grid(spacing_m: float = 100.0, half_m: float = 3000.0) -> nx.MultiDiGraph:
    """Streets every `spacing_m` around TRENTO, both directions."""
    graph = nx.MultiDiGraph()
    n = int(half_m / spacing_m)
    for i in range(-n, n + 1):
        for j in range(-n, n + 1):
            lat, lon = local_to_latlon(TRENTO, i * spacing_m, j * spacing_m)
            graph.add_node((i, j), y=lat, x=lon)
    for i, j in list(graph.nodes):
        for b in ((i + 1, j), (i, j + 1)):
            if b in graph:
                graph.add_edge((i, j), b, length=spacing_m)
                graph.add_edge(b, (i, j), length=spacing_m)
    return graph


class _Grid:
    def load(self, bbox: tuple[float, float, float, float]) -> nx.MultiDiGraph:
        return _grid()


def test_plan_route_writes_a_word_and_names_it() -> None:
    request = RouteRequest(start=TRENTO, distance_m=6000, word="io")
    result = plan_route(request, _Grid()).result
    assert result.word == "IO"
    assert result.shape is None
    assert haversine_m(result.points[0], result.points[-1]) < 1.0
    assert result.distance_m == pytest.approx(6000.0, rel=0.25)


# --- Letters joined along the top line too (TASK-067) ---

UVA = compose("uva", top_joins=True)
# What `compose` drew before TASK-067, on main at fa6462b: `_digest` of the
# seven words measured in the task file and of the alphabet, in both styles.
BEFORE = {
    ("round", "CIAO"): "1366924a9e7d32fd",
    ("round", "BELLO"): "71aa806b580404bb",
    ("round", "MAX"): "754535c6aba495fd",
    ("round", "KIWI"): "7549db76bc6313b4",
    ("round", "VIVA"): "94818c21474e7498",
    ("round", "TUTTI"): "617c63e8f11f278e",
    ("round", "UVA"): "435558851d7af379",
    ("round", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"): "49a4e9c1406651ee",
    ("block", "CIAO"): "e317165f3b645894",
    ("block", "BELLO"): "c2ffe8d1f33e522c",
    ("block", "MAX"): "9166d7291755511f",
    ("block", "KIWI"): "72a381fb85c8b5a2",
    ("block", "VIVA"): "04aeb74caf7b5b50",
    ("block", "TUTTI"): "0490b5938637ecad",
    ("block", "UVA"): "f09f85f86bc8b943",
    ("block", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"): "f591cbac0a0f4f54",
}


def _digest(word: Word) -> str:
    """Every point of `word`, where it lies and where the route may start."""

    def rounded(points: tuple[tuple[float, float], ...]) -> list[tuple[float, float]]:
        return [(round(x, 9), round(y, 9)) for x, y in points]

    text = repr(
        (
            rounded(word.units),
            word.places,
            word.starts,
            rounded(word.points),
            round(word.height, 9),
            [round(phase, 9) for phase in word.phases],
        )
    )
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _length(word: Word) -> float:
    return float(np.hypot(*np.diff(np.array(word.units), axis=0).T).sum())


def _sides(lines: tuple[tuple[tuple[float, float], ...], ...]) -> Counter[frozenset]:
    """The sides a letter draws, each with how many times."""
    return Counter(frozenset(side) for line in lines for side in pairwise(line))


def _corners(letter: Letter) -> tuple[tuple[float, float], tuple[float, float]]:
    """The leftmost and the rightmost point of `letter` on the top line."""
    tops = sorted(p for p in (*letter.out, *letter.back) if p[1] == 1.0)
    return tops[0], tops[-1]


def _loose(style: Style) -> dict[str, Letter]:
    """The alphabet of `style` with every letter joined along the top, at
    its points there: what the rules of reading forbid, to measure it."""
    return {
        char: replace(letter, top_in=_corners(letter)[0], top_out=_corners(letter)[1])
        for char, letter in STYLES[style][0].items()
    }


@pytest.mark.parametrize(("style", "text"), sorted(BEFORE))
def test_without_top_joins_a_word_is_the_one_of_before(style: Style, text: str) -> None:
    word = compose(text, style=style, top_joins=False)
    assert _digest(word) == BEFORE[style, text]
    assert not any(word.tops)


def test_top_joins_are_off_unless_asked() -> None:
    assert TOP_JOINS == {"round": False, "block": False}
    for style in STYLES:
        assert compose("uva", style=style) == compose(  # type: ignore[arg-type]
            "uva", style=style, top_joins=False  # type: ignore[arg-type]
        )


def test_a_join_along_the_top_makes_the_word_shorter() -> None:
    assert UVA.tops == (True, False)
    # From the right arm of the U to the left one of the V, instead of from
    # the middle of the one to the middle of the other: 0.3 less at each
    # end, out and back.
    assert _length(compose("uva")) - _length(UVA) == pytest.approx(1.2)
    block = compose("uva", style="block", top_joins=True)
    assert block.tops == (True, False)
    assert _length(compose("uva", style="block")) - _length(block) == pytest.approx(1.5)


@pytest.mark.parametrize(
    ("text", "style"),
    [("uva", "round"), ("nuvola", "round"), ("yummy", "round"), ("punk", "block")],
)
def test_a_gap_runs_along_the_top_or_the_base_never_across(
    text: str, style: Style
) -> None:
    word = compose(text, style=style, top_joins=True)
    assert any(word.tops) and not all(word.tops)
    assert word.units[0] == word.units[-1]
    units = np.array(word.units)
    assert np.hypot(*np.diff(units, axis=0).T).max() <= SIDE_STEP + 1e-12
    twice = twice_drawn(units, near_m=1e-9)
    for i, (a, b) in enumerate(pairwise(word.places)):
        if a.along is not None or b.along is not None:
            gap = a.index if a.along is not None else b.index
            level = 1.0 if word.tops[gap] else 0.0
            assert units[i, 1] == units[i + 1, 1] == level
            assert twice[i]


@pytest.mark.parametrize("style", sorted(STYLES))
def test_a_letter_joined_at_the_top_is_drawn_the_same(style: Style) -> None:
    joined = 0
    for letter in STYLES[style][0].values():
        for top_in in (False, letter.top_in is not None):
            for top_out in (False, letter.top_out is not None):
                out, back = letter.route(top_in, top_out)
                assert out[0] == (letter.top_in if top_in else letter.out[0])
                assert out[-1] == (letter.top_out if top_out else letter.out[-1])
                assert (
                    (back[0], back[-1]) == (out[-1], out[0])
                    if back
                    else (out[0] == out[-1])
                )
                assert _sides((out, back)) == _sides((letter.out, letter.back))
                joined += top_in or top_out
    assert joined > 20


@pytest.mark.parametrize("style", sorted(STYLES))
def test_the_alphabet_joins_at_the_top_the_corners_the_rules_allow(
    style: Style,
) -> None:
    alphabet = STYLES[style][0]
    loose = {
        char: {
            "out": [list(p) for p in letter.out],
            "back": [list(p) for p in letter.back],
        }
        for char, letter in alphabet.items()
    }
    for char, letter in alphabet.items():
        for key, corner, declared in zip(
            ("in", "out"),
            ((letter.left, 1.0), (letter.right, 1.0)),
            (letter.top_in, letter.top_out),
            strict=True,
        ):
            try:
                top = {"top": {key: list(corner)}}
                parse_letters({"letters": {char: {**loose[char], **top}}})
            except InvalidWordError:
                assert declared is None, f"{char} {key}"
            else:
                assert declared == corner, f"{char} {key}"
    assert "".join(c for c, a in ALPHABET.items() if a.top_in) == "BDHKMNPRUVWXY"
    assert "".join(c for c, a in ALPHABET.items() if a.top_out) == "HMNUVWXY"


@pytest.mark.parametrize(
    ("text", "style", "saved"),
    [
        # A stroke that ends on the top line would grow into the join: the
        # bar of the T, the upper arm of the E and of the block C.
        ("tu", "round", 1.2),
        ("eh", "round", 1.1),
        ("ch", "block", 1.6),
        # A join that runs over the letter gives it a stroke more: the P
        # would be left from the middle of its top.
        ("pu", "round", 1.1),
        # A letter that reaches the top line in one point only: the I would
        # read as a T, the L as a step.
        ("vi", "round", 0.6),
        ("ul", "round", 0.6),
    ],
)
def test_a_pair_that_would_not_read_stays_on_the_base(
    text: str, style: Style, saved: float
) -> None:
    kept = compose(text, style=style, top_joins=True)
    assert kept.tops == (False,)
    assert kept == compose(text, style=style, top_joins=False)
    # Without the rules of reading it would be joined along the top.
    loose = compose(text, alphabet=_loose(style), style=style, top_joins=True)
    assert loose.tops == (True,)
    assert _length(kept) - _length(loose) == pytest.approx(saved, abs=0.01)


_T = {"out": [[0.3, 0], [0.3, 1], [0, 1], [0.6, 1], [0.3, 1], [0.3, 0]]}
_P = {"out": [[0, 0], [0, 1], [0.25, 1], [0.5, 0.75], [0.25, 0.5], [0, 0.5], [0, 0]]}
_I = {"out": [[0, 0], [0, 1], [0, 0]]}
_V = {"out": [[0.3, 0], [0, 1], [0.3, 0], [0.6, 1], [0.3, 0]]}


@pytest.mark.parametrize(
    ("letters", "message"),
    [
        ({"T": {**_T, "top": {"in": [0, 1]}}}, "must not lengthen a stroke"),
        ({"T": {**_T, "top": {"out": [0.6, 1]}}}, "must not lengthen a stroke"),
        ({"P": {**_P, "top": {"out": [0.25, 1]}}}, "must not run over the letter"),
        ({"I": {**_I, "top": {"in": [0, 1]}}}, "in one point only"),
        ({"V": {**_V, "top": {"in": [0.1, 1]}}}, "a point of the letter on the top"),
        ({"V": {**_V, "top": {"in": [0.3, 0]}}}, "a point of the letter on the top"),
        ({"V": {**_V, "top": {"in": 0}}}, r"must be an \[x, y\] point"),
        ({"V": {**_V, "top": [0, 1]}}, "'top' must be an object"),
        ({"V": {**_V, "top": {"up": [0, 1]}}}, "'top' must be an object"),
    ],
)
def test_a_top_join_that_would_not_read_is_refused(
    letters: dict[str, object], message: str
) -> None:
    with pytest.raises(InvalidWordError, match=message):
        parse_letters({"source": "test", "license": "test", "letters": letters})
    fine = parse_letters({"letters": {"V": {**_V, "top": {"in": [0, 1]}}}})
    assert fine["V"].top_in == (0.0, 1.0) and fine["V"].top_out is None


def test_a_letter_without_a_top_is_joined_along_the_base_as_before() -> None:
    assert compose("ciao", top_joins=True) == compose("ciao", top_joins=False)
    with pytest.raises(InvalidWordError, match="I is not joined along the top"):
        ALPHABET["I"].route(top_in=True)


def test_the_same_word_has_the_same_joins() -> None:
    for text in ("uva", "nuvola", "yummy", "hub"):
        assert compose(text, top_joins=True) == compose(text, top_joins=True)
    assert compose("nuvola", top_joins=True).tops == (True, True, False, False, False)
    assert compose("punk", style="block", top_joins=True).tops == (True, True, False)
    # The base on a tie: the H and the M are as far apart either way.
    letters = (ALPHABET["H"], ALPHABET["M"])
    assert letters[0].top_out is not None and letters[1].top_in is not None
    assert choose_joins(letters, LETTER_GAP) == (False,)


def test_the_route_may_start_half_way_along_a_gap_at_the_top() -> None:
    word = compose("hub", top_joins=True)
    assert word.tops == (True, True)
    for k in range(2):
        start = word.starts[k]
        assert word.places[start] == Place(k, 0.5)
        assert word.units[start][1] == 1.0
        points, _ = word.line(k)
        drawn = start_at_phase(list(word.points), word.phases[k])
        assert np.array_equal(points, np.array(drawn))
        # The gaps at the top stretch like the ones on the base, and the
        # start stays where it is.
        shifts = np.zeros((3, 2))
        shifts[1] = (0.25, -0.125)  # the U
        moved = (np.array(word.moved(k, shifts)) - points) / word.height
        assert np.allclose(moved[0], 0.0) and np.allclose(moved[-1], 0.0)
        for place, move in zip(_line_places(word, k), moved, strict=True):
            if place.along is None:
                assert np.allclose(move, shifts[place.index])
        for rows in word.strokes(k):
            sides = np.hypot(*np.diff(points[rows], axis=0).T)
            assert sides.max() <= SIDE_STEP * word.height + 1e-12


def test_plan_route_joins_the_letters_along_the_top_when_asked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    composed: list[Word] = []

    def spy(*args: object, **kwargs: object) -> Word:
        composed.append(compose(*args, **kwargs))  # type: ignore[arg-type]
        return composed[-1]

    monkeypatch.setattr(optimizer, "compose", spy)
    request = RouteRequest(start=TRENTO, distance_m=6000, word="uv")
    result = plan_route(request, _Grid(), top_joins=True).result
    assert result.word == "UV"
    assert haversine_m(result.points[0], result.points[-1]) < 1.0
    assert composed[-1].tops == (True,)
    plan_route(request, _Grid(), optimize=False)
    assert composed[-1].tops == (False,)
