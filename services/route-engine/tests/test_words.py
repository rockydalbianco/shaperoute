import string

import networkx as nx
import numpy as np
import pytest

from route_engine.geo import haversine_m, local_to_latlon
from route_engine.models import InvalidRequestError, RouteRequest
from route_engine.network import twice_drawn
from route_engine.optimizer import plan_route
from route_engine.projection import start_at_phase
from route_engine.words import (
    ALPHABET,
    LETTER_GAP,
    SIDE_STEP,
    InvalidWordError,
    Letter,
    Place,
    Word,
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


def _point_ids(units: np.ndarray) -> list[int]:
    """For each point, the index of the first point equal to it."""
    ids: list[int] = []
    for i, point in enumerate(units):
        same = np.flatnonzero(np.hypot(*(units[:i] - point).T) < 1e-9)
        ids.append(ids[same[0]] if len(same) else i)
    return ids


@pytest.mark.parametrize("word", [CIAO, ALL, compose("BELLO")])
def test_every_stroke_drawn_twice_has_the_same_points_both_ways(word: Word) -> None:
    # So the route can come back on the very roads of the way out (TASK-071).
    units = np.array(word.units)
    ids = _point_ids(units)
    sides = list(zip(ids, ids[1:], strict=False))
    drawn = set(sides)
    twice = twice_drawn(units, near_m=1e-9)
    for i, (a, b) in enumerate(sides):
        assert ((b, a) in drawn) == twice[i]


def test_the_stem_of_the_e_is_split_where_its_arms_leave_it() -> None:
    # Up the stem in one side, down it in three (1 to 0.6, 0.6 to 0.2, 0.2
    # to 0): the way up is cut at 0.6 and 0.2 too, and then in the same
    # pieces as the way down, 7 + 7 + 4 of them.
    points = _letter(compose("E"), 0)
    stem = {round(y, 9) for x, y in points if x == 0.0}
    assert 0.6 in stem and 0.2 in stem
    assert len(stem) == 1 + 7 + 7 + 4


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
