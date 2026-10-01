"""Request and response bodies: the shared-types contract, field for field.

Pydantic checks types only. The allowed values (distances, shapes,
activities) are checked once, by the engine's RouteRequest (models.py).
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from route_engine.directions import GROUP_M, Turn
from route_engine.image_outline import MAX_POINTS as MAX_OUTLINE_POINTS
from route_engine.models import (
    MAX_DISTANCE_M,
    MIN_DISTANCE_M,
    SUPPORTED_ACTIVITIES,
    RouteResult,
)
from route_engine.outline_edits import MAX_DETAIL_POINTS, MAX_DRAWN_POINTS
from route_engine.shapes import SUPPORTED_SHAPES
from route_engine.words import (
    ALPHABET,
    LETTER_DISTANCE_M,
    MAX_WORD_LETTERS,
    spell_letters,
)
from shaperoute_ai.reading import MAX_TEXT_LENGTH

# The largest image POST /image-outlines takes, and its length in base64
# (ADR-0069): a phone photo re-encoded as JPEG is 1-4 MB.
MAX_IMAGE_BYTES = 10_000_000
MAX_IMAGE_BASE64 = 4 * -(-MAX_IMAGE_BYTES // 3)


class RouteRequestBody(BaseModel):
    """What the app sends: RouteRequest in packages/shared-types."""

    # A misspelt field is an error, not a silently ignored extra.
    model_config = ConfigDict(extra="forbid")

    start: tuple[float, float] = Field(
        description="Start point as [lat, lon], WGS84.",
        examples=[[46.0671, 11.1214]],
    )
    shape: str | None = Field(
        default=None,
        description=f"One of: {', '.join(SUPPORTED_SHAPES)}; or give a word.",
        examples=["heart"],
    )
    word: str | None = Field(
        default=None,
        description=(
            f"A word written one letter at a time (TASK-056), instead of a "
            f"shape: at most {MAX_WORD_LETTERS} of the letters "
            f"{spell_letters(ALPHABET)} (TASK-059), upper or lower case, and "
            f"{LETTER_DISTANCE_M / 1000:g} km of route for each."
        ),
        examples=[None],
    )
    distance_m: int = Field(
        description=f"Target distance in metres, {MIN_DISTANCE_M}–{MAX_DISTANCE_M}.",
        examples=[5000],
    )
    activity: str = Field(
        default="running", description=f"One of: {', '.join(SUPPORTED_ACTIVITIES)}."
    )
    style: str = Field(
        default="round",
        description=(
            "The letters of a word (TASK-080): round, or block for square "
            "letters on the street grid (ADR-0072). Only round with a shape."
        ),
    )


class DirectionBody(BaseModel):
    """What to do at one junction: Direction in packages/shared-types
    (route_engine/directions.py, ADR-0045)."""

    node: int = Field(description="OpenStreetMap id of the junction's node.")
    point: tuple[float, float] = Field(description="The junction as [lat, lon].")
    distance_m: float = Field(description="Along the route from its start.")
    turn: Turn
    angle_deg: float = Field(description="The turn, positive to the right.")
    street: str | None = Field(
        description="Name or ref of the road entered; null when OSM has neither."
    )
    road_type: str | None = Field(description='OSM highway, like "footway".')
    branches: int = Field(description="Roads that meet at the junction.")
    joined: bool = Field(
        description=f"Less than {GROUP_M:g} m after the direction before: read with it."
    )
    # Missing from an older API, or in a GPX request from an older app.
    along: str | None = Field(
        default=None,
        description=(
            "When street is null, the street the road runs along, deduced "
            "(ADR-0054, ADR-0057); never a name of the road itself."
        ),
    )


class RouteResultBody(BaseModel):
    """What the app gets back: RouteResult in packages/shared-types."""

    points: list[tuple[float, float]] = Field(
        description="The route as [lat, lon] points, closed."
    )
    distance_m: float = Field(description="Distance actually covered, in metres.")
    similarity: float = Field(description="How much the route looks like the shape.")
    shape: str | None = Field(description="Null for a word or an image.")
    warnings: list[str]
    # Missing in a GPX request from an older app: nothing to check there.
    directions: list[DirectionBody] = Field(
        default_factory=list,
        description="Turn by turn, the start first; empty without a search.",
    )
    word: str | None = Field(
        default=None, description="The word in capitals; null for a shape or an image."
    )
    # Missing in a GPX request from an older app.
    alternatives: list[RouteResultBody] = Field(
        default_factory=list,
        description=(
            "Other routes for the same request, best first, to choose from "
            "(TASK-093): whole results, with no alternatives of their own."
        ),
    )

    @classmethod
    def from_result(cls, result: RouteResult) -> RouteResultBody:
        return cls(**asdict(result))


ErrorCode = Literal[
    "invalid_request",
    "shape_not_drawable",
    "map_data_unavailable",
    "engine_error",
    "http_error",
    "ai_unavailable",
    "image_not_usable",
    # A line drawn on an image's outline gives no outline (TASK-079).
    "outline_edit_rejected",
    # A key is set and the request has the wrong one (TASK-081, ADR-0076).
    "unauthorized",
    # Too many POSTs from one client in a minute (TASK-081); with accounts,
    # also too many wrong passwords for one email (TASK-114).
    "too_many_requests",
    # Accounts (TASK-114, ADR-0115): signing up with an email or a username
    # already used; a wrong email or password; no token, or an unknown one;
    # a session unused for 90 days; an API without a database.
    "email_taken",
    "username_taken",
    "wrong_credentials",
    "not_signed_in",
    "session_expired",
    "accounts_unavailable",
]

# Why an image gives no outline: InvalidImageError.reason in
# route_engine/image_outline.py (ADR-0068).
ImageReason = Literal[
    "format",
    "unreadable",
    "background",
    "no_subject",
    "scattered",
    "edge",
    "small",
    "jagged",
]

# Why a line drawn on an outline was refused: InvalidEditError.reason in
# route_engine/outline_edits.py (TASK-079, ADR-0074).
EditReason = Literal[
    "short",
    "covers_detail",
    "too_many_corners",
]


class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str
    # Only with shape_not_drawable: a distance the shape fits, in whole km
    # (TASK-031).
    suggested_distance_m: int | None = None
    # Only with image_not_usable: why the engine found no outline (TASK-073);
    # with outline_edit_rejected, why the drawing was refused (TASK-079).
    reason: ImageReason | EditReason | None = None


class ErrorBody(BaseModel):
    """Every error the API returns has this shape."""

    error: ErrorDetail


JobStatus = Literal["queued", "downloading_map", "computing", "done", "failed"]


class RouteJobBody(BaseModel):
    """A route request the API is working on (ADR-0032): RouteJob in
    packages/shared-types."""

    job_id: str
    status: JobStatus
    result: RouteResultBody | None = Field(description="Only when status is done.")
    error: ErrorDetail | None = Field(description="Only when status is failed.")


class GpxRequestBody(BaseModel):
    """What the app sends to POST /gpx: GpxRequest in packages/shared-types."""

    model_config = ConfigDict(extra="forbid")

    # An image route has its own request (TASK-073), defined below.
    request: RouteRequestBody | ImageRouteRequestBody
    result: RouteResultBody


# The longest run POST /track-scores takes: a fix every 5 m (the app's
# FIX_EVERY_M) along twice the longest route.
MAX_TRACK_FIXES = 2 * MAX_DISTANCE_M // 5
# The longest planned route it takes: far more points than the engine writes.
MAX_ROUTE_POINTS = 50_000


class TrackFixBody(BaseModel):
    """One GPS fix of a run: TrackFix in packages/shared-types."""

    model_config = ConfigDict(extra="forbid")

    point: tuple[float, float] = Field(description="Where, as [lat, lon].")
    time_ms: float = Field(description="When, in milliseconds on the phone's clock.")
    accuracy_m: float | None = Field(
        default=None, description="Radius of the fix's error; null when unknown."
    )


class TrackScoreRequestBody(BaseModel):
    """What the app sends to POST /track-scores: TrackScoreRequest in
    packages/shared-types."""

    model_config = ConfigDict(extra="forbid")

    points: list[tuple[float, float]] = Field(
        max_length=MAX_ROUTE_POINTS,
        description="The planned route: RouteResult.points.",
    )
    similarity: float = Field(
        ge=0.0, le=1.0, description="The planned route's: RouteResult.similarity."
    )
    track: list[TrackFixBody] = Field(
        max_length=MAX_TRACK_FIXES, description="The run, fix by fix, in order."
    )


class TrackScoreBody(BaseModel):
    """What the app gets back: TrackScore in packages/shared-types
    (route_engine/track_score.py, ADR-0090)."""

    score: int = Field(description="From 0 to 100.")
    fidelity: float = Field(description="How much of the plan was run, 0 to 1.")
    covered: float = Field(description="Share of the route with the run near it.")
    on_route: float = Field(description="Share of the run near the route.")
    distance_m: float = Field(description="Length of the run, in metres.")


class ShapeReadingRequestBody(BaseModel):
    """What the app sends to POST /shape-readings: ShapeReadingRequest in
    packages/shared-types."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(
        description=(
            f"The words of the shape field, at most {MAX_TEXT_LENGTH} characters."
        ),
        examples=["stemma della Ferrari"],
    )


class ShapeReadingBody(BaseModel):
    """The AI's reading of the words (ADR-0012): ShapeReading in
    packages/shared-types."""

    text: str = Field(description="The words as read: single spaces, none at the ends.")
    shape: str | None = Field(
        description=(
            f"One of: {', '.join(SUPPORTED_SHAPES)}; null when none fits the words."
        )
    )


class ImageOutlineRequestBody(BaseModel):
    """What the app sends to POST /image-outlines (ADR-0069):
    ImageOutlineRequest in packages/shared-types."""

    model_config = ConfigDict(extra="forbid")

    image: str = Field(
        max_length=MAX_IMAGE_BASE64,
        description=(
            f"A PNG or JPEG file in base64, at most {MAX_IMAGE_BYTES // 1_000_000} "
            f"MB before encoding: one clear subject on a plain background."
        ),
    )


class ImageOutlineBody(BaseModel):
    """The outline the engine traced from the image (ADR-0068, ADR-0069):
    ImageOutline in packages/shared-types."""

    points: list[tuple[float, float]] = Field(
        description=(
            "The outline, closed, centred and scaled into [-1, 1], y upwards: "
            "what an image route request sends back."
        )
    )
    image_points: list[tuple[float, float]] = Field(
        description=(
            "The same corners over the image, as shares of its width and "
            "height from the top left: to draw the outline on the picture."
        )
    )
    aspect: float = Field(description="Width over height of the image, upright.")
    strokes: list[list[tuple[float, float]]] = Field(
        default_factory=list,
        description=(
            "The other subjects of the image (TASK-084) and the details "
            "drawn by hand (TASK-079), in the frame of points: each starts on "
            "the outline or on an earlier one, and the route goes along it "
            "and back; one that ends on its own second point closes a loop, "
            "drawn once. None for one subject as traced."
        ),
    )
    image_strokes: list[list[tuple[float, float]]] = Field(
        default_factory=list,
        description="The same strokes over the image, like image_points.",
    )


class ImageRouteRequestBody(BaseModel):
    """What the app sends to POST /image-route-jobs: ImageRouteRequest in
    packages/shared-types. The outline is the one POST /image-outlines
    answered, checked again like any input (ADR-0069)."""

    model_config = ConfigDict(extra="forbid")

    start: tuple[float, float] = Field(
        description="Start point as [lat, lon], WGS84.",
        examples=[[46.0671, 11.1214]],
    )
    outline: list[tuple[float, float]] = Field(
        min_length=4,
        max_length=MAX_OUTLINE_POINTS + 1,
        description=(
            f"The points of an ImageOutline: closed, within [-1, 1], at most "
            f"{MAX_OUTLINE_POINTS} corners."
        ),
    )
    strokes: list[list[tuple[float, float]]] = Field(
        default_factory=list,
        max_length=MAX_DETAIL_POINTS // 2,
        description=(
            f"The strokes of an ImageOutline, unchanged (TASK-079): at most "
            f"{MAX_DETAIL_POINTS} points in all, those run out and back "
            f"counted twice. None for an outline without."
        ),
    )
    distance_m: int = Field(
        description=f"Target distance in metres, {MIN_DISTANCE_M}–{MAX_DISTANCE_M}.",
        examples=[15000],
    )
    activity: str = Field(
        default="running", description=f"One of: {', '.join(SUPPORTED_ACTIVITIES)}."
    )


class ImageOutlineEditRequestBody(BaseModel):
    """What the app sends to POST /image-outline-edits (TASK-079, ADR-0074):
    ImageOutlineEditRequest in packages/shared-types. The outline as the app
    shows it over the picture, and one line drawn on it with a finger; the
    API keeps nothing between two edits."""

    model_config = ConfigDict(extra="forbid")

    image_points: list[tuple[float, float]] = Field(
        min_length=4,
        max_length=MAX_OUTLINE_POINTS + 1,
        description="The image_points of the ImageOutline shown.",
    )
    image_strokes: list[list[tuple[float, float]]] = Field(
        default_factory=list,
        max_length=MAX_DETAIL_POINTS // 2,
        description="The image_strokes of the ImageOutline shown.",
    )
    aspect: float = Field(description="The aspect of the ImageOutline shown.")
    kind: Literal["part", "detail"] = Field(
        description=(
            "part: a closed line joined to the silhouette; detail: a line from "
            "the outline, which the route goes along and back."
        )
    )
    line: list[tuple[float, float]] = Field(
        min_length=2,
        max_length=MAX_DRAWN_POINTS,
        description=(
            "The line drawn, as shares of the image's width and height from "
            "the top left, like image_points."
        ),
    )
