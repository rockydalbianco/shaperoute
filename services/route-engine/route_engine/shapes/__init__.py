"""Shape generators on the normalized square [-1, 1]².

A shape maps `n_points` to `n_points` vertices equally spaced by arc length,
plus the first vertex repeated at the end to close the curve. Nothing here
knows about latitude, longitude or metres.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from route_engine.shapes.circle import circle
from route_engine.shapes.heart import heart
from route_engine.shapes.outline import read_outline
from route_engine.shapes.resample import Point

ShapeFn = Callable[[int], list[Point]]

# Outlines drawn in JSON (ADR-0035), shipped with the package: the catalogue
# shapes and the ones only tried from the CLI, like the house.
OUTLINES = Path(__file__).with_name("outlines")

# Adding a shape: write its module, or its outline in OUTLINES, and add one
# entry here. An outline enters only once the user has judged it by eye on
# real roads (ADR-0036).
SHAPES: dict[str, ShapeFn] = {
    "circle": circle,
    "heart": heart,
    "star": read_outline(OUTLINES / "star.json"),
    "horse": read_outline(OUTLINES / "horse.json"),
    "moon": read_outline(OUTLINES / "moon.json"),
    "cat": read_outline(OUTLINES / "cat.json"),  # with strokes: its eyes
    "fish": read_outline(OUTLINES / "fish.json"),  # with a stroke: its eye
    # The animals the user approved (TASK-065), all with strokes.
    "butterfly": read_outline(OUTLINES / "butterfly.json"),  # its antennae
    "snail": read_outline(OUTLINES / "snail.json"),  # its spiral and horns
    "dog_head": read_outline(OUTLINES / "dog_head.json"),  # eyes, nose, mouth
}

SUPPORTED_SHAPES: tuple[str, ...] = tuple(SHAPES)

# Shapes that look the same at any angle: the search may turn them freely.
# Every other shape stays upright, give or take a few degrees (ADR-0038).
FREE_ROTATION: frozenset[str] = frozenset({"circle"})


def get_shape(name: str) -> ShapeFn:
    try:
        return SHAPES[name]
    except KeyError:
        raise ValueError(
            f"unknown shape {name!r}; choose one of: {', '.join(SHAPES)}"
        ) from None
