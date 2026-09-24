"""Central contract: RouteRequest in, RouteResult out (docs/ARCHITECTURE.md §3)."""

from __future__ import annotations

from dataclasses import dataclass, field

from route_engine.directions import Direction
from route_engine.shapes import SUPPORTED_SHAPES

SUPPORTED_ACTIVITIES: tuple[str, ...] = ("running",)

# Plausible target distances for running, in metres.
MIN_DISTANCE_M = 1_000
MAX_DISTANCE_M = 50_000


class InvalidRequestError(ValueError):
    """A RouteRequest field is outside its allowed range."""


@dataclass(frozen=True)
class RouteRequest:
    start: tuple[float, float]
    shape: str
    distance_m: int
    activity: str = "running"

    def __post_init__(self) -> None:
        check_start(self.start)
        check_distance(self.distance_m)
        if self.shape not in SUPPORTED_SHAPES:
            raise InvalidRequestError(
                f"unknown shape {self.shape!r}; "
                f"choose one of: {', '.join(SUPPORTED_SHAPES)}"
            )
        check_activity(self.activity)


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
    shape: str
    warnings: list[str] = field(default_factory=list)
    # Turn-by-turn, from directions.guidance; the API fills it (TASK-048).
    directions: list[Direction] = field(default_factory=list)
