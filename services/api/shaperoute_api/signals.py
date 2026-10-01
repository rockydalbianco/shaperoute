"""What the app did with a search (TASK-142, ADR-0112): POST /signals.

The API sees the searches; only the app sees what came of them. Three
signals, each a search event (insights/events.py), whitelisted field by
field:

- city_chosen: a city or a place chosen in "Explore", and how (a suggestion,
  a recent city, a featured one, the words typed and Enter). Choosing a
  suggestion never calls /cities, so without it the city is lost;
- route_chosen: the route started or exported, among A, B and C (0 is A, the
  engine's first);
- hint_taken: a way out of a failed route taken: "Try N km", or a shape of
  the catalogue.

Never a person: the place chosen is a public name and a ~1 km cell, never the
letters typed nor the start. A signal never fails the app: past
MAX_PER_MINUTE (all clients together) it is answered but not recorded, so a
client sending many cannot fill the disk nor outvote the others.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel, model_validator
from route_engine.alternatives import MAX_ALTERNATIVES
from route_engine.models import MAX_DISTANCE_M
from route_engine.shapes import SUPPORTED_SHAPES
from route_engine.words import ALPHABET, MAX_WORD_LETTERS

from shaperoute_api.access import RateLimiter
from shaperoute_api.insights.events import MAX_TEXT, redact

# The route the engine ranks first, and the others offered with it.
MAX_CHOICES = 1 + MAX_ALTERNATIVES
# Signals recorded in a minute, by every client together: an app sends a few.
MAX_PER_MINUTE = 60
# What a route drew besides a shape or a word.
IMAGE = "image"


class _Drawn(BaseModel):
    """What the route drew: a shape of the catalogue, "image", or a word."""

    model_config = ConfigDict(extra="forbid")

    shape: str | None = Field(
        default=None,
        description=f"One of: {', '.join(SUPPORTED_SHAPES)}, or {IMAGE!r}.",
    )
    word: str | None = Field(default=None, max_length=MAX_WORD_LETTERS)

    @model_validator(mode="after")
    def _one_drawing(self) -> _Drawn:
        if (self.shape is None) == (self.word is None):
            raise ValueError("a shape or a word, one of the two")
        if self.shape is not None and self.shape not in (*SUPPORTED_SHAPES, IMAGE):
            raise ValueError(f"no shape {self.shape!r}")
        if self.word is not None and not all(c in ALPHABET for c in self.word.upper()):
            raise ValueError("a word of the letters the engine draws")
        return self


class CityChosenBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["city_chosen"]
    label: str = Field(min_length=1, max_length=MAX_TEXT, examples=["Vercelli, Italy"])
    point: tuple[float, float] = Field(description="Its centre, as [lat, lon].")
    place: bool = Field(default=False, description="A place in a city, not a city.")
    via: Literal["suggestion", "recent", "featured", "typed"]

    @model_validator(mode="after")
    def _on_earth(self) -> CityChosenBody:
        lat, lon = self.point
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("point: [lat, lon] in degrees")
        return self


class RouteChosenBody(_Drawn):
    kind: Literal["route_chosen"]
    index: int = Field(ge=0, lt=MAX_CHOICES, description="0 is A, the engine's first.")
    of: int = Field(ge=1, le=MAX_CHOICES, description="Routes offered.")
    via: Literal["start", "gpx"]

    @model_validator(mode="after")
    def _among(self) -> RouteChosenBody:
        if self.index >= self.of:
            raise ValueError("index: one of the routes offered")
        return self


class HintTakenBody(_Drawn):
    kind: Literal["hint_taken"]
    hint: Literal["try_distance", "catalog_shape"]
    distance_m: int = Field(ge=0, le=MAX_DISTANCE_M, description="The one that failed.")
    to_m: int | None = Field(default=None, ge=0, le=MAX_DISTANCE_M)

    @model_validator(mode="after")
    def _distance_tried(self) -> HintTakenBody:
        if (self.hint == "try_distance") != (self.to_m is not None):
            raise ValueError("to_m: the distance tried, for try_distance only")
        return self


Signal = CityChosenBody | RouteChosenBody | HintTakenBody


class SignalBody(RootModel[Annotated[Signal, Field(discriminator="kind")]]):
    """One signal; `kind` says which."""


def event_of(signal: Signal) -> tuple[str, dict[str, Any]]:
    """The event a signal is recorded as: its kind and fields."""
    if isinstance(signal, CityChosenBody):
        return signal.kind, {
            # A place's public name, with its capitals; e-mails and long
            # numbers blanked out all the same.
            "city": redact(signal.label, lower=False),
            "point": signal.point,
            "place": signal.place or None,
            "via": signal.via,
        }
    drawn = {
        "shape": signal.shape,
        "word": None if signal.word is None else signal.word.upper(),
    }
    if isinstance(signal, RouteChosenBody):
        return signal.kind, {
            **drawn,
            "index": signal.index,
            "n": signal.of,
            "via": signal.via,
        }
    return signal.kind, {
        **drawn,
        "hint": signal.hint,
        "distance_m": signal.distance_m,
        "to_m": signal.to_m,
    }


class SignalGate:
    """At most MAX_PER_MINUTE signals recorded, by every client together."""

    def __init__(self, limiter: RateLimiter | None = None) -> None:
        self._limiter = limiter or RateLimiter(MAX_PER_MINUTE)

    def allows(self) -> bool:
        return self._limiter.wait_s("all") == 0
