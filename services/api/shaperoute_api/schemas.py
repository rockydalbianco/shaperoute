"""Request and response bodies: the shared-types contract, field for field.

Pydantic checks types only. The allowed values (distances, shapes,
activities) are checked once, by the engine's RouteRequest (models.py).
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from route_engine.models import (
    MAX_DISTANCE_M,
    MIN_DISTANCE_M,
    SUPPORTED_ACTIVITIES,
    RouteResult,
)
from route_engine.shapes import SUPPORTED_SHAPES


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


class RouteResultBody(BaseModel):
    """What the app gets back: RouteResult in packages/shared-types."""

    points: list[tuple[float, float]] = Field(
        description="The route as [lat, lon] points, closed."
    )
    distance_m: float = Field(description="Distance actually covered, in metres.")
    similarity: float = Field(description="How much the route looks like the shape.")
    shape: str
    warnings: list[str]

    @classmethod
    def from_result(cls, result: RouteResult) -> RouteResultBody:
        return cls(**asdict(result))


ErrorCode = Literal[
    "invalid_request",
    "shape_not_drawable",
    "map_data_unavailable",
    "engine_error",
    "http_error",
]


class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str


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
