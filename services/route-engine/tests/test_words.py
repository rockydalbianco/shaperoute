import numpy as np
import pytest

from route_engine.network import twice_drawn
from route_engine.projection import start_at_phase
from route_engine.words import (
    ALPHABET,
    LETTER_GAP,
    SIDE_STEP,
    InvalidWordError,
    Place,
    Word,
    compose,
    parse_letters,
)

CIAO = compose("ciao")


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


def test_every_letter_stands_on_the_base_line_and_ends_where_it_began() -> None:
    assert set("CIAO") <= set(ALPHABET)
    for letter in ALPHABET.values():
        assert letter.out[0][1] == 0.0 and letter.out[-1][1] == 0.0
        end = letter.back[-1] if letter.back else letter.out[-1]
        assert end == letter.out[0]
        assert max(y for _, y in (*letter.out, *letter.back)) == 1.0


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
        ("zen", "no letter E, N, Z"),
    ],
)
def test_a_word_the_alphabet_cannot_write_is_refused(text: str, message: str) -> None:
    with pytest.raises(InvalidWordError, match=message):
        compose(text)


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


@pytest.mark.parametrize("start", [0, 1, 2])
def test_each_letter_is_drawn_by_one_continuous_line(start: int) -> None:
    points, _ = CIAO.line(start)
    places = _line_places(CIAO, start)
    strokes = CIAO.strokes(start)
    assert sum(len(rows) for rows in strokes) == sum(
        place.along is None for place in places
    )
    for k, rows in enumerate(strokes):
        assert all(places[row] == Place(k) for row in rows)
        sides = np.hypot(*np.diff(points[rows], axis=0).T)
        assert sides.max() <= SIDE_STEP * CIAO.height + 1e-12
