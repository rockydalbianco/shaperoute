"""Shape generators on the normalized square [-1, 1]².

A shape maps `n_points` to `n_points` vertices equally spaced by arc length,
plus the first vertex repeated at the end to close the curve. Nothing here
knows about latitude, longitude or metres.
"""

from __future__ import annotations

from collections.abc import Callable

from route_engine.shapes.circle import circle
from route_engine.shapes.heart import heart
from route_engine.shapes.resample import Point

ShapeFn = Callable[[int], list[Point]]

# Adding a shape: write its module and add one entry here.
SHAPES: dict[str, ShapeFn] = {
    "circle": circle,
    "heart": heart,
}

SUPPORTED_SHAPES: tuple[str, ...] = tuple(SHAPES)


def get_shape(name: str) -> ShapeFn:
    try:
        return SHAPES[name]
    except KeyError:
        raise ValueError(
            f"unknown shape {name!r}; choose one of: {', '.join(SHAPES)}"
        ) from None
