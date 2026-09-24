"""Request and response bodies: the shared-types contract, field for field.

Pydantic checks types only. The allowed values (distances, shapes,
activities) are checked once, by the engine's RouteRequest (models.py).
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from route_engine.directions import GROUP_M, Turn
from route_engine.models import (
    MAX_DISTANCE_M,
    MIN_DISTANCE_M,
    SUPPORTED_ACTIVITIES,
    RouteResult,
)
from route_engine.shapes import SUPPORTED_SHAPES
from shaperoute_ai.reading import MAX_TEXT_LENGTH


class RouteRequestBody(BaseModel):
    """What the app sends: RouteRequest in packages/shared-types."""

    # A misspelt field is an error, not a silently ignored extra.
    model_config = ConfigDict(extra="forbid")

    start: tuple[float, float] = Field(
        description="Start point as [lat, lon], WGS84.",
        examples=[[46.0671, 11.1214]],
    )
    shape: str = Field(
        description=f"One of: {', '.join(SUPPORTED_SHAPES)}.", examples=["heart"]
    )
    distance_m: int = Field(
        description=f"Target distance in metres, {MIN_DISTANCE_M}–{MAX_DISTANCE_M}.",
        examples=[5000],
    )
    activity: str = Field(
        default="running", description=f"One of: {', '.join(SUPPORTED_ACTIVITIES)}."
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


class RouteResultBody(BaseModel):
    """What the app gets back: RouteResult in packages/shared-types."""

    points: list[tuple[float, float]] = Field(
        description="The route as [lat, lon] points, closed."
    )
    distance_m: float = Field(description="Distance actually covered, in metres.")
    similarity: float = Field(description="How much the route looks like the shape.")
    shape: str
    warnings: list[str]
    # Missing in a GPX request from an older app: nothing to check there.
    directions: list[DirectionBody] = Field(
        default_factory=list,
        description="Turn by turn, the start first; empty without a search.",
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
]


class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str
    # Only with shape_not_drawable: a distance the shape fits, in whole km
    # (TASK-031).
    suggested_distance_m: int | None = None


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

    request: RouteRequestBody
    result: RouteResultBody


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
