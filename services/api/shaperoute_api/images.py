"""Images (TASK-073, ADR-0069): the outline of a picture, for the app to
show before asking for a route, and the route of that outline.

The engine traces the outline (route_engine/image_outline.py, ADR-0068);
the API only carries it. The app sends the image once, in base64 inside
JSON, and gets the outline back; the route request then sends the outline,
not the image again. That outline comes from the phone, so it is checked
again like any input: its size, its numbers, and the engine's own check of
an outline (parse_outline).
"""

from __future__ import annotations

import binascii
import io
import math
from dataclasses import dataclass, replace

from PIL import Image
from route_engine.image_outline import ANALYSIS_SIDE, MAX_POINTS, outline_data
from route_engine.models import (
    InvalidRequestError,
    RouteRequest,
    check_activity,
    check_distance,
    check_start,
)
from route_engine.nearby_starts import ShapeJob, plan_nearby
from route_engine.optimizer import (
    SHAPE_POINTS,
    GraphLoader,
    Plan,
    plan_shape,
    tilt_limit,
)
from route_engine.shapes.outline import InvalidOutlineError, Outline, parse_outline

from shaperoute_api.schemas import MAX_IMAGE_BYTES, ImageOutlineBody

# What an image route is called in names and messages, like "heart".
IMAGE_NAME = "image"
# Normalized points may overshoot [-1, 1] by rounding, no more.
SLACK = 1e-6
# Digits of the points sent to the app: well below a pixel.
DIGITS = 5
# EXIF orientations that turn the picture on its side (ImageOps.exif_transpose).
SIDEWAYS = (5, 6, 7, 8)


@dataclass(frozen=True, kw_only=True)
class ImageRequest:
    """A route request whose shape is the outline of an image. Checked like
    RouteRequest, but not part of it: the engine's contract stays shape or
    word (models.py)."""

    start: tuple[float, float]
    outline: Outline
    distance_m: int
    activity: str = "running"

    def __post_init__(self) -> None:
        check_start(self.start)
        check_distance(self.distance_m)
        check_activity(self.activity)

    @property
    def name(self) -> str:
        return IMAGE_NAME


# What route jobs and /gpx take.
AnyRequest = RouteRequest | ImageRequest


def decode_image(text: str) -> bytes:
    """The bytes of an image sent in base64; InvalidRequestError if it is
    not base64 or larger than MAX_IMAGE_BYTES."""
    try:
        data = binascii.a2b_base64(text.encode("ascii"), strict_mode=True)
    except (binascii.Error, UnicodeEncodeError):
        raise InvalidRequestError("image: not valid base64") from None
    if len(data) > MAX_IMAGE_BYTES:
        raise InvalidRequestError(
            f"image: at most {MAX_IMAGE_BYTES // 1_000_000} MB, "
            f"got {len(data) / 1_000_000:.1f} MB"
        )
    return data


def trace(image: bytes) -> ImageOutlineBody:
    """The outline of the image's subject, both for the route and for the
    picture; InvalidImageError, with its reason, when there is none."""
    data = outline_data(image, name=IMAGE_NAME, source="an image from the app")
    outline = parse_outline(data)
    width, height = _analysed_size(image)
    pixels: list[list[float]] = data["points"]  # type: ignore[assignment]
    return ImageOutlineBody(
        points=[(round(x, DIGITS), round(y, DIGITS)) for x, y in outline.points],
        # The engine's y is upwards: the row of a pixel is -y.
        image_points=[
            (round(x / width, DIGITS), round(-y / height, DIGITS)) for x, y in pixels
        ],
        aspect=round(width / height, DIGITS),
    )


def _analysed_size(image: bytes) -> tuple[float, float]:
    """Width and height of the picture the engine traced: upright, and
    reduced to ANALYSIS_SIDE a side as image_outline does. Pillow rounds
    its sides to whole pixels; a fraction of a pixel does not show."""
    with Image.open(io.BytesIO(image)) as picture:
        width, height = picture.size
        if picture.getexif().get(0x0112) in SIDEWAYS:
            width, height = height, width
    scale = min(1.0, ANALYSIS_SIDE / max(width, height))
    return width * scale, height * scale


def outline_of(points: list[tuple[float, float]]) -> Outline:
    """The outline an image route request sends back, checked as any input
    (ADR-0069): InvalidRequestError, which says what is wrong with it."""
    if len(points) - 1 > MAX_POINTS:
        raise InvalidRequestError(
            f"outline: at most {MAX_POINTS} corners, got {len(points) - 1}"
        )
    for x, y in points:
        if not (math.isfinite(x) and math.isfinite(y)):
            raise InvalidRequestError("outline: every point must be a finite number")
        if abs(x) > 1 + SLACK or abs(y) > 1 + SLACK:
            raise InvalidRequestError(
                "outline: the points must be within [-1, 1], as POST "
                "/image-outlines gives them"
            )
    try:
        return parse_outline(
            {
                "name": IMAGE_NAME,
                "source": "an image traced by the engine (TASK-073)",
                "license": "as the image",
                "points": [[x, y] for x, y in points],
            }
        )
    except InvalidOutlineError as exc:
        raise InvalidRequestError(f"outline: {exc}") from None


def plan_image(request: ImageRequest, source: GraphLoader) -> Plan:
    """The route of an image's outline, as the CLI's --image plans it: kept
    upright (ADR-0038). The result names no shape and no word."""
    plan = plan_shape(
        request.outline(SHAPE_POINTS),
        IMAGE_NAME,
        request.start,
        request.distance_m,
        source,
        max_tilt_deg=tilt_limit(IMAGE_NAME),
    )
    return replace(plan, result=replace(plan.result, shape=None, word=None))


def plan_request(request: AnyRequest, source: GraphLoader) -> Plan:
    """The API's planner: a shape or a word, also from a few road nodes near
    the start, keeping the best (TASK-076, ADR-0071); or an image."""
    if isinstance(request, ImageRequest):
        return plan_image(request, source)
    return plan_nearby(ShapeJob.of_request(request), request.start, source).plan
