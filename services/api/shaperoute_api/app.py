"""The HTTP API: RouteRequest in, RouteResult out (docs/API.md).

The API orchestrates and does not compute: the route comes from the engine's
plan_route, errors become a status and a code the app can explain.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable, Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from route_engine.models import InvalidRequestError, RouteRequest
from route_engine.optimizer import (
    GraphLoader,
    Plan,
    ShapeNotDrawableError,
    plan_route,
)
from starlette.exceptions import HTTPException

from shaperoute_api.graphs import MapDataUnavailableError
from shaperoute_api.schemas import (
    ErrorBody,
    ErrorCode,
    RouteRequestBody,
    RouteResultBody,
)

log = logging.getLogger(__name__)

Planner = Callable[[RouteRequest, GraphLoader], Plan]

ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    422: {"model": ErrorBody, "description": "invalid_request or shape_not_drawable"},
    500: {"model": ErrorBody, "description": "engine_error"},
    503: {"model": ErrorBody, "description": "map_data_unavailable"},
}


def error(status: int, code: ErrorCode, message: str) -> JSONResponse:
    body = ErrorBody.model_validate({"error": {"code": code, "message": message}})
    return JSONResponse(status_code=status, content=body.model_dump())


def validation_message(errors: Sequence[Any]) -> str:
    """Pydantic's errors in one line: "start: Field required; ..."."""
    parts = []
    for item in errors:
        where = ".".join(str(part) for part in item["loc"][1:]) or "body"
        parts.append(f"{where}: {item['msg']}")
    return "; ".join(parts)


def create_app(source: GraphLoader, planner: Planner = plan_route) -> FastAPI:
    app = FastAPI(
        title="ShapeRoute API",
        version="0.1.0",
        description="Generates real routes that draw a shape on the map.",
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # A plain def: FastAPI runs it in a thread, so a long route does not stop
    # the server from answering /health.
    @app.post("/routes", responses=ERROR_RESPONSES)
    def create_route(body: RouteRequestBody) -> RouteResultBody:
        request = RouteRequest(
            start=body.start,
            shape=body.shape,
            distance_m=body.distance_m,
            activity=body.activity,
        )
        what = f"{request.shape} {request.distance_m} m"
        started = time.perf_counter()
        try:
            result = planner(request, source).result
        except Exception as exc:
            elapsed = time.perf_counter() - started
            log.info("route %s: %s after %.1f s", what, type(exc).__name__, elapsed)
            raise
        log.info(
            "route %s: %.0f m on roads, similarity %.2f, in %.1f s",
            what,
            result.distance_m,
            result.similarity,
            time.perf_counter() - started,
        )
        return RouteResultBody.from_result(result)

    @app.exception_handler(RequestValidationError)
    def invalid_body(_: Request, exc: RequestValidationError) -> JSONResponse:
        return error(422, "invalid_request", validation_message(exc.errors()))

    @app.exception_handler(InvalidRequestError)
    def invalid_value(_: Request, exc: InvalidRequestError) -> JSONResponse:
        return error(422, "invalid_request", str(exc))

    @app.exception_handler(ShapeNotDrawableError)
    def not_drawable(_: Request, exc: ShapeNotDrawableError) -> JSONResponse:
        return error(422, "shape_not_drawable", str(exc))

    @app.exception_handler(MapDataUnavailableError)
    def no_map_data(_: Request, exc: MapDataUnavailableError) -> JSONResponse:
        return error(503, "map_data_unavailable", str(exc))

    @app.exception_handler(HTTPException)
    def http_error(_: Request, exc: HTTPException) -> JSONResponse:
        return error(exc.status_code, "http_error", str(exc.detail))

    # Anything else, InvalidRouteError included (ADR-0026). The traceback goes
    # to the server log, not to the phone.
    @app.exception_handler(Exception)
    def engine_error(_: Request, exc: Exception) -> JSONResponse:
        log.exception("route failed", exc_info=exc)
        return error(500, "engine_error", "The route engine failed; see the API log.")

    return app
