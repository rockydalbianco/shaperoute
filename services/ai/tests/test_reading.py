from __future__ import annotations

from collections.abc import Sequence

import pytest

from shaperoute_ai import reading
from shaperoute_ai.reading import (
    MAX_TEXT_LENGTH,
    Choice,
    InvalidTextError,
    ModelUnavailableError,
    ShapeReader,
    clean,
)

SHAPES = (
    "circle",
    "heart",
    "star",
    "horse",
    "moon",
    "cat",
    "fish",
    "butterfly",
    "snail",
    "dog_head",
)


class FakeModel:
    """Answers from a table, and counts the questions."""

    def __init__(self, answers: dict[str, Choice | Exception]) -> None:
        self.answers = answers
        self.asked: list[tuple[str, tuple[str, ...]]] = []

    def choose(self, text: str, shapes: Sequence[str]) -> Choice:
        self.asked.append((text, tuple(shapes)))
        answer = self.answers[text]
        if isinstance(answer, Exception):
            raise answer
        return answer


def test_clean_keeps_case_and_accents_and_single_spaces() -> None:
    assert clean("  Stemma   della\tFerrari \n") == "Stemma della Ferrari"
    assert clean("Città") == "Città"


def test_the_model_gets_the_clean_words_and_the_catalogue() -> None:
    model = FakeModel({"stemma della Ferrari": Choice("horse", "prancing horse")})
    choice = ShapeReader(model, SHAPES).read(" stemma  della Ferrari ")
    assert choice == Choice("horse", "prancing horse")
    assert model.asked == [("stemma della Ferrari", SHAPES)]


def test_none_is_an_answer() -> None:
    model = FakeModel({"Batman": Choice(None, "bat superhero")})
    assert ShapeReader(model, SHAPES).read("Batman").shape is None


def test_a_shape_outside_the_catalogue_counts_as_none() -> None:
    # The bird was drawn, but the user left it out (ADR-0061).
    model = FakeModel({"uccello": Choice("bird", "a bird")})
    assert ShapeReader(model, SHAPES).read("uccello") == Choice(None, "a bird")


@pytest.mark.parametrize("text", ["", "   ", "\n\t"])
def test_nothing_to_read_is_refused(text: str) -> None:
    model = FakeModel({})
    with pytest.raises(InvalidTextError):
        ShapeReader(model, SHAPES).read(text)
    assert model.asked == []


def test_too_many_words_are_refused() -> None:
    model = FakeModel({"x" * MAX_TEXT_LENGTH: Choice("star")})
    shape_reader = ShapeReader(model, SHAPES)
    assert shape_reader.read("x" * MAX_TEXT_LENGTH).shape == "star"
    with pytest.raises(InvalidTextError, match=str(MAX_TEXT_LENGTH)):
        shape_reader.read("x" * (MAX_TEXT_LENGTH + 1))


def test_the_same_words_are_asked_once_whatever_the_case_and_spaces() -> None:
    model = FakeModel({"Nemo": Choice("fish", "clownfish")})
    shape_reader = ShapeReader(model, SHAPES)
    assert shape_reader.read("Nemo").shape == "fish"
    assert shape_reader.read("  NEMO ").shape == "fish"
    assert shape_reader.read("nemo").shape == "fish"
    assert len(model.asked) == 1


def test_a_model_that_does_not_answer_is_asked_again() -> None:
    model = FakeModel({"Garfield": ModelUnavailableError("not running")})
    shape_reader = ShapeReader(model, SHAPES)
    with pytest.raises(ModelUnavailableError):
        shape_reader.read("Garfield")
    model.answers["Garfield"] = Choice("cat", "orange cartoon cat")
    assert shape_reader.read("Garfield").shape == "cat"
    assert len(model.asked) == 2


def test_the_oldest_reading_goes_first_when_the_cache_is_full(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(reading, "MAX_CACHED", 2)
    model = FakeModel({word: Choice("circle") for word in ("a", "b", "c")})
    shape_reader = ShapeReader(model, SHAPES)
    for word in ("a", "b", "c", "c", "b", "a"):
        shape_reader.read(word)
    # "a" left when "c" came in; "b" and "c" stayed.
    assert [text for text, _ in model.asked] == ["a", "b", "c", "a"]


class PreloadingModel(FakeModel):
    def __init__(self, fails: bool = False) -> None:
        super().__init__({})
        self.fails = fails
        self.preloaded = 0

    def preload(self) -> None:
        self.preloaded += 1
        if self.fails:
            raise ModelUnavailableError("Ollama does not answer: is it running?")


def test_warming_up_preloads_a_model_that_can() -> None:
    model = PreloadingModel()
    assert ShapeReader(model, SHAPES).warm_up() is True
    assert model.preloaded == 1


def test_warming_up_never_fails() -> None:
    # Ollama off or the model missing: the first word will say so, not the start.
    model = PreloadingModel(fails=True)
    assert ShapeReader(model, SHAPES).warm_up() is False
    assert ShapeReader(FakeModel({}), SHAPES).warm_up() is False  # no preload
