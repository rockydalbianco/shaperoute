"""Edits of an image's outline (TASK-079, ADR-0074): a part or a detail
drawn with a finger over the picture, one at a time.

The engine decides what the drawing becomes (route_engine/outline_edits.py);
the API only carries it, and keeps nothing between two edits: the app sends
the outline it shows and the line drawn, and gets the new outline back, or
the reason it was refused. Undo is the app going back to an outline it had.

The app draws over the picture, so everything travels in its frame: shares
of the width and height from the top left, like image_points. The engine
works with x to the right and y upwards, in heights of the picture, so that
a circle drawn on a wide picture stays a circle.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

from route_engine.models import InvalidRequestError
from route_engine.outline_edits import add_detail, add_part
from route_engine.shapes.outline import InvalidOutlineError, parse_outline

from shaperoute_api.images import DIGITS, IMAGE_NAME
from shaperoute_api.schemas import ImageOutlineBody, ImageOutlineEditRequestBody

# The picture's frame, and a hair of rounding around it.
SLACK = 1e-6
# Pictures wider or taller than this are not photos.
MAX_ASPECT = 20.0

Pair = tuple[float, float]


def edit_outline(body: ImageOutlineEditRequestBody) -> ImageOutlineBody:
    """The outline with the drawn line added as a part or a detail.
    InvalidRequestError for an input out of shape, InvalidEditError (with
    its reason) for a drawing the engine refuses."""
    aspect = body.aspect
    if not (math.isfinite(aspect) and 1 / MAX_ASPECT <= aspect <= MAX_ASPECT):
        raise InvalidRequestError(
            f"aspect: between {1 / MAX_ASPECT:g} and {MAX_ASPECT:g}, got {aspect}"
        )
    _check_shares("image_points", body.image_points)
    for stroke in body.image_strokes:
        _check_shares("image_strokes", stroke)
    _check_shares("line", body.line)

    def to_frame(points: Sequence[Pair]) -> list[Pair]:
        return [(x * aspect, -y) for x, y in points]

    points = to_frame(body.image_points)
    strokes = [to_frame(stroke) for stroke in body.image_strokes]
    add = add_part if body.kind == "part" else add_detail
    try:
        edited = add(points, strokes, to_frame(body.line))
    except InvalidOutlineError as exc:
        raise InvalidRequestError(f"outline: {exc}") from None

    def to_shares(points: Sequence[Pair]) -> list[Pair]:
        return [(round(x / aspect, DIGITS), round(-y, DIGITS)) for x, y in points]

    data: dict[str, object] = {
        "name": IMAGE_NAME,
        "source": "an image traced by the engine and edited by hand (TASK-079)",
        "license": "as the image",
        "points": [list(p) for p in edited.points],
    }
    if edited.strokes:
        data["strokes"] = [[list(p) for p in s] for s in edited.strokes]
    # Centred and scaled into [-1, 1] together, as the route request sends
    # them back.
    outline = parse_outline(data)
    return ImageOutlineBody(
        points=_rounded(outline.points),
        strokes=[_rounded(stroke) for stroke in outline.strokes],
        image_points=to_shares(edited.points),
        image_strokes=[to_shares(stroke) for stroke in edited.strokes],
        aspect=aspect,
    )


def _check_shares(field: str, points: Sequence[Pair]) -> None:
    for x, y in points:
        if not (math.isfinite(x) and math.isfinite(y)):
            raise InvalidRequestError(f"{field}: every point must be a finite number")
        if not (-SLACK <= x <= 1 + SLACK and -SLACK <= y <= 1 + SLACK):
            raise InvalidRequestError(
                f"{field}: the points must be shares of the picture, within [0, 1]"
            )


def _rounded(points: Sequence[Pair]) -> list[Pair]:
    return [(round(x, DIGITS), round(y, DIGITS)) for x, y in points]
