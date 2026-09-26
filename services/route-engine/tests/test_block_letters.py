import string

import numpy as np
import pytest

from route_engine.words import (
    ALPHABET,
    BLOCK_ALPHABET,
    BLOCK_GAP,
    LETTER_GAP,
    SIDE_STEP,
    InvalidWordError,
    Letter,
    Place,
    Word,
    compose,
)

# Every letter once, in block letters (TASK-077).
ALL = compose(string.ascii_uppercase, style="block")
# The letters that stand on the base line: O, D, B, Q close on it, the U
# has its flat bottom there and the Z its lowest bar, as today.
BASED = "BDOQUZ"
# Narrower than the rest: the I has no width, the K has arms at 45° from
# the middle of its stem, the J is a hook.
NARROW = {"I": 0.0, "J": 0.6, "K": 0.5}


def _letter(word: Word, index: int) -> np.ndarray:
    return np.array(
        [
            p
            for p, place in zip(word.units, word.places, strict=True)
            if place == Place(index)
        ]
    )


def _sides(letter: Letter) -> list[tuple[tuple[float, float], tuple[float, float]]]:
    return [
        (a, b)
        for line in (letter.out, letter.back)
        for a, b in zip(line, line[1:], strict=False)
    ]


def test_the_block_alphabet_has_every_capital_from_a_to_z() -> None:
    assert sorted(BLOCK_ALPHABET) == list(string.ascii_uppercase)


@pytest.mark.parametrize("char", string.ascii_uppercase)
def test_every_block_letter_is_one_stroke_from_the_base_back_to_it(char: str) -> None:
    letter = BLOCK_ALPHABET[char]
    end = letter.back[-1] if letter.back else letter.out[-1]
    assert end == letter.out[0]
    ys = [y for _, y in (*letter.out, *letter.back)]
    assert min(ys) == 0.0 and max(ys) == 1.0
    base = [x for x, y in (*letter.out, *letter.back) if y == 0.0]
    assert letter.out[0][0] == min(base) and letter.out[-1][0] == max(base)


@pytest.mark.parametrize("char", string.ascii_uppercase)
def test_every_stroke_is_level_upright_or_at_45_degrees(char: str) -> None:
    for a, b in _sides(BLOCK_ALPHABET[char]):
        dx, dy = abs(b[0] - a[0]), abs(b[1] - a[1])
        assert dx == 0.0 or dy == 0.0 or dx == pytest.approx(dy), (a, b)


@pytest.mark.parametrize("char", string.ascii_uppercase)
def test_block_letters_are_almost_as_wide_as_high(char: str) -> None:
    letter = BLOCK_ALPHABET[char]
    width = letter.right - letter.left
    if char in NARROW:
        assert width == pytest.approx(NARROW[char])
    else:
        assert 0.8 <= width <= 1.0
        assert width > ALPHABET[char].right - ALPHABET[char].left


@pytest.mark.parametrize("char", string.ascii_uppercase)
def test_only_the_letters_standing_on_the_base_draw_along_it(char: str) -> None:
    along = sum(
        abs(b[0] - a[0]) for a, b in _sides(BLOCK_ALPHABET[char]) if a[1] == b[1] == 0.0
    )
    # The lowest arm of C, E, G, J, L and S stays off it: on it, the line
    # joining the letters would swallow it, and the E would read as an F.
    assert (along > 0) == (char in BASED)


def test_e_f_h_i_l_t_are_drawn_as_today_only_wider() -> None:
    for char in "EFHILT":
        block, today = BLOCK_ALPHABET[char], ALPHABET[char]
        assert [y for _, y in block.out] == [y for _, y in today.out]
        assert [y for _, y in block.back] == [y for _, y in today.back]


def test_block_letters_stand_closer_in_a_row_one_unit_high() -> None:
    assert BLOCK_GAP < LETTER_GAP
    assert ALL.style == "block"
    assert ALL.text == string.ascii_uppercase
    assert ALL.letters == tuple(BLOCK_ALPHABET[c] for c in string.ascii_uppercase)
    letters = [_letter(ALL, k) for k in range(26)]
    for before, after in zip(letters, letters[1:], strict=False):
        assert after[:, 0].min() - before[:, 0].max() == pytest.approx(BLOCK_GAP)
    for points in letters:
        assert points[:, 1].min() == 0.0 and points[:, 1].max() == 1.0


def test_a_block_word_is_one_closed_line_of_short_sides() -> None:
    assert ALL.units[0] == ALL.units[-1]
    assert ALL.places[0] == Place(0, 0.5)
    sides = np.hypot(*np.diff(np.array(ALL.units), axis=0).T)
    assert sides.max() <= SIDE_STEP + 1e-12
    assert len(ALL.phases) == 25


def test_the_base_stays_open_under_every_block_letter_not_standing_on_it() -> None:
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
        assert not any(feet.min() < x < feet.max() for x in on_base), letter.char


def test_without_a_style_a_word_is_written_as_before() -> None:
    today = compose("ciao")
    assert today.style == "round"
    assert today == compose("ciao", style="round")
    assert today == compose("ciao", ALPHABET, LETTER_GAP)
    assert today.letters == tuple(ALPHABET[c] for c in "CIAO")


def test_a_style_may_still_take_its_own_alphabet_and_gap() -> None:
    word = compose("io", ALPHABET, 1.0, style="block")
    assert word.letters == (ALPHABET["I"], ALPHABET["O"])
    assert word.style == "block"


def test_an_unknown_style_is_refused() -> None:
    with pytest.raises(InvalidWordError, match="no style 'gothic': round or block"):
        compose("ciao", style="gothic")  # type: ignore[arg-type]


def test_a_block_word_refuses_the_letters_it_lacks_like_today() -> None:
    with pytest.raises(InvalidWordError, match="no letter 1: .* A to Z"):
        compose("ciao1", style="block")
