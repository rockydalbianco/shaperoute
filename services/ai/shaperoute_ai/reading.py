"""Read the words of the shape field: a shape of the catalogue, or none.

The model only chooses among the names it is given (ADR-0001, ADR-0012),
and its choice is checked here, not trusted. The same words are asked once:
a local model on a laptop takes seconds to answer.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

log = logging.getLogger(__name__)

# A word or a few, not a sentence: "stemma della Ferrari" is 20.
MAX_TEXT_LENGTH = 60
# Readings kept in memory; the oldest goes first.
MAX_CACHED = 1_000


class InvalidTextError(ValueError):
    """Nothing to read, or too much."""


class ModelUnavailableError(Exception):
    """The model gave no usable answer: not running, too slow, or broken."""


@dataclass(frozen=True)
class Choice:
    """What the model made of the words."""

    # One of the shapes it was given, or None when none fits.
    shape: str | None
    # What it saw in the words, in a few English words: for the log only.
    picture: str = ""


class ShapeModel(Protocol):
    """A provider of the AI: Ollama today, anything else behind the same call."""

    def choose(self, text: str, shapes: Sequence[str]) -> Choice:
        """The shape of `shapes` the words name, or none.

        Raises ModelUnavailableError when there is no usable answer.
        """
        ...


def clean(text: str) -> str:
    """Single spaces, none at the ends: "  Stemma   della Ferrari " ->
    "Stemma della Ferrari". Case and accents stay: they help the model."""
    return " ".join(text.split())


class ShapeReader:
    """Reads the words with the model, checks the answer, remembers it."""

    def __init__(self, model: ShapeModel, shapes: Sequence[str]) -> None:
        self._model = model
        self._shapes = tuple(shapes)
        self._cache: dict[str, Choice] = {}

    @property
    def shapes(self) -> tuple[str, ...]:
        return self._shapes

    def read(self, text: str) -> Choice:
        """The shape the words name, or none. Raises InvalidTextError and
        ModelUnavailableError, which is not remembered: the next call asks
        again."""
        words = clean(text)
        if not words:
            raise InvalidTextError("Write a word for the shape.")
        if len(words) > MAX_TEXT_LENGTH:
            raise InvalidTextError(
                f"A shape is a word or a few, at most {MAX_TEXT_LENGTH} characters."
            )
        key = words.casefold()
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        started = time.perf_counter()
        choice = self._model.choose(words, self._shapes)
        if choice.shape is not None and choice.shape not in self._shapes:
            log.warning("shape words %r: %r is not in the catalogue", words, choice)
            choice = Choice(None, choice.picture)
        log.info(
            "shape words %r: %s (%s) in %.1f s",
            words,
            choice.shape,
            choice.picture,
            time.perf_counter() - started,
        )
        if len(self._cache) >= MAX_CACHED:
            del self._cache[next(iter(self._cache))]
        self._cache[key] = choice
        return choice
