"""From an exception of the engine to what the API answers (docs/API.md).

Used both by POST /routes, as an HTTP error, and by route jobs, as the
error of a failed job: the two paths say the same thing.
"""

from __future__ import annotations

from route_engine.models import InvalidRequestError
from route_engine.optimizer import ShapeNotDrawableError

from shaperoute_api.graphs import MapDataUnavailableError
from shaperoute_api.schemas import ErrorCode

ENGINE_FAILED = "The route engine failed; see the API log."


def error_of(exc: Exception) -> tuple[int, ErrorCode, str]:
    """HTTP status, code and message; anything unknown is an engine error,
    whose details stay in the log (ADR-0026, InvalidRouteError included)."""
    if isinstance(exc, InvalidRequestError):
        return 422, "invalid_request", str(exc)
    if isinstance(exc, ShapeNotDrawableError):
        return 422, "shape_not_drawable", str(exc)
    if isinstance(exc, MapDataUnavailableError):
        return 503, "map_data_unavailable", str(exc)
    return 500, "engine_error", ENGINE_FAILED
