"""Why the engine gives no route: what its callers answer with (docs/API.md).

In a module of their own so that the network, which the optimizer imports,
can refuse a request too (TASK-180, ADR-0148). `optimizer` still hands out
ShapeNotDrawableError under its old name.
"""

from __future__ import annotations

NO_ROADS = "there are no roads to run on around here"


class ShapeNotDrawableError(ValueError):
    """The roads around the start cannot draw the requested shape.

    best_distance_m is the length of the best route found when it followed
    the shape but missed the distance: that distance the shape fits
    (TASK-031). None when the best route did not follow the shape.
    """

    def __init__(self, message: str, best_distance_m: float | None = None) -> None:
        super().__init__(message)
        self.best_distance_m = best_distance_m


class NoRoadsError(ShapeNotDrawableError):
    """The area asked for holds no road: open water, or a place the zone's
    graph does not reach (TASK-180).

    No shape can be drawn there, so it is a ShapeNotDrawableError and every
    caller answers it as one: before, the empty graph failed further on
    (`max()` of no pieces, an index into no road samples) and the API could
    only say `engine_error`.
    """

    def __init__(self, message: str = NO_ROADS) -> None:
        super().__init__(message)
