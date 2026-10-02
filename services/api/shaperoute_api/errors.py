"""From an exception of the engine, or of the AI, to what the API answers
(docs/API.md).

Used both by POST /routes, as an HTTP error, and by route jobs, as the
error of a failed job: the two paths say the same thing.
"""

from __future__ import annotations

from route_engine.models import DISTANCE_LIMITS_M, InvalidRequestError
from route_engine.optimizer import ShapeNotDrawableError
from shaperoute_ai.reading import InvalidTextError, ModelUnavailableError

from shaperoute_api.graphs import MapDataUnavailableError
from shaperoute_api.schemas import ErrorDetail

ENGINE_FAILED = "The route engine failed; see the API log."


def error_of(exc: Exception, activity: str = "running") -> tuple[int, ErrorDetail]:
    """HTTP status and error; anything unknown is an engine error, whose
    details stay in the log (ADR-0026, InvalidRouteError included). The
    distance suggested is one `activity` may ask for (TASK-190)."""
    if isinstance(exc, InvalidRequestError | InvalidTextError):
        return 422, ErrorDetail(code="invalid_request", message=str(exc))
    if isinstance(exc, ShapeNotDrawableError):
        return 422, ErrorDetail(
            code="shape_not_drawable",
            message=str(exc),
            suggested_distance_m=suggested_distance(exc.best_distance_m, activity),
        )
    if isinstance(exc, MapDataUnavailableError):
        return 503, ErrorDetail(code="map_data_unavailable", message=str(exc))
    if isinstance(exc, ModelUnavailableError):
        return 503, ErrorDetail(code="ai_unavailable", message=str(exc))
    return 500, ErrorDetail(code="engine_error", message=ENGINE_FAILED)


def suggested_distance(
    best_distance_m: float | None, activity: str = "running"
) -> int | None:
    """The distance of the engine's best route, to the whole km and within
    the limits of a request of `activity`: one the user can ask for
    (TASK-031); 10-30 km by bike (TASK-190)."""
    if best_distance_m is None:
        return None
    km = round(best_distance_m / 1000)
    low, high = DISTANCE_LIMITS_M.get(activity, DISTANCE_LIMITS_M["running"])
    return min(max(km * 1000, low), high)
