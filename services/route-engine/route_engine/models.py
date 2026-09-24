"""Central contract: RouteRequest in, RouteResult out (docs/ARCHITECTURE.md §3)."""

from __future__ import annotations

from dataclasses import dataclass, field

from route_engine.directions import Direction
from route_engine.shapes import SUPPORTED_SHAPES
from route_engine.words import (
    LETTER_DISTANCE_M,
    MAX_WORD_LETTERS,
    InvalidWordError,
    compose,
)

SUPPORTED_ACTIVITIES: tuple[str, ...] = ("running",)

# Plausible target distances for running, in metres.
MIN_DISTANCE_M = 1_000
MAX_DISTANCE_M = 50_000


class InvalidRequestError(ValueError):
    """A RouteRequest field is outside its allowed range."""


@dataclass(frozen=True, kw_only=True)
class RouteRequest:
    start: tuple[float, float]
    distance_m: int
    # A shape of the catalogue, or a word written one letter at a time
    # (TASK-056): one of the two.
    shape: str | None = None
    word: str | None = None
    activity: str = "running"

    def __post_init__(self) -> None:
        check_start(self.start)
        check_distance(self.distance_m)
        if (self.shape is None) == (self.word is None):
            raise InvalidRequestError("give either a shape or a word, one of the two")
        if self.word is not None:
            check_word(self.word, self.distance_m)
        elif self.shape not in SUPPORTED_SHAPES:
            raise InvalidRequestError(
                f"unknown shape {self.shape!r}; "
                f"choose one of: {', '.join(SUPPORTED_SHAPES)}"
            )
        check_activity(self.activity)

    @property
    def name(self) -> str:
        """What is drawn, for names and messages: the shape, or the word
        in capitals."""
        return self.shape if self.word is None else self.word.strip().upper()


# The checks of RouteRequest that do not depend on the shape: the CLI also
# runs them for an outline read from a file (TASK-032).


def check_start(start: tuple[float, float]) -> None:
    lat, lon = start
    if not -90.0 <= lat <= 90.0:
        raise InvalidRequestError(f"latitude must be between -90 and 90, got {lat}")
    if not -180.0 <= lon <= 180.0:
        raise InvalidRequestError(f"longitude must be between -180 and 180, got {lon}")


def check_distance(distance_m: int) -> None:
    if not MIN_DISTANCE_M <= distance_m <= MAX_DISTANCE_M:
        raise InvalidRequestError(
            f"distance must be between {MIN_DISTANCE_M} and "
            f"{MAX_DISTANCE_M} metres, got {distance_m}"
        )


def check_word(word: str, distance_m: int) -> None:
    """Letters the alphabet has, not too many, and enough distance for
    each (words.MAX_WORD_LETTERS, words.LETTER_DISTANCE_M)."""
    try:
        letters = len(compose(word).letters)
    except InvalidWordError as exc:
        raise InvalidRequestError(str(exc)) from None
    if letters > MAX_WORD_LETTERS:
        raise InvalidRequestError(
            f"a word has at most {MAX_WORD_LETTERS} letters, got {letters}"
        )
    needed_m = letters * LETTER_DISTANCE_M
    if distance_m < needed_m:
        raise InvalidRequestError(
            f"a {letters}-letter word needs at least {needed_m / 1000:g} km, "
            f"{LETTER_DISTANCE_M / 1000:g} km a letter; "
            f"got {distance_m / 1000:g} km"
        )


def check_activity(activity: str) -> None:
    if activity not in SUPPORTED_ACTIVITIES:
        raise InvalidRequestError(
            f"unsupported activity {activity!r}; "
            f"choose one of: {', '.join(SUPPORTED_ACTIVITIES)}"
        )


@dataclass(frozen=True)
class RouteResult:
    points: list[tuple[float, float]]
    distance_m: float
    similarity: float
    # The shape of the catalogue, or None for a word (TASK-056).
    shape: str | None
    warnings: list[str] = field(default_factory=list)
    # Turn-by-turn, from directions.guidance; the API fills it (TASK-048).
    directions: list[Direction] = field(default_factory=list)
    # The word in capitals, or None for a shape (TASK-056).
    word: str | None = None
