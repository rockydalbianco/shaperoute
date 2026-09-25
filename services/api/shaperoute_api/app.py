"""The HTTP API: RouteRequest in, RouteResult out (docs/API.md).

The API orchestrates and does not compute: the route comes from the engine's
plan_route, errors become a status and a code the app can explain. The app
uses route jobs (ADR-0032); POST /routes answers in one go, for /docs, curl
and measurements. POST /shape-readings asks the AI which shape of the
catalogue some words name (ADR-0012): the AI never sees the route.
"""

from __future__ import annotations

import logging
import threading
import time
from collections.abc import AsyncIterator, Callable, Sequence
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from route_engine.export_gpx import route_name, to_gpx
from route_engine.models import InvalidRequestError, RouteRequest
from route_engine.optimizer import GraphLoader, ShapeNotDrawableError, plan_route
from shaperoute_ai.reading import (
    InvalidTextError,
    ModelUnavailableError,
    ShapeReader,
    clean,
)
from starlette.exceptions import HTTPException as StarletteHTTPException

from shaperoute_api.errors import error_of
from shaperoute_api.graphs import MapDataUnavailableError
from shaperoute_api.jobs import Job, Planner, RouteJobs
from shaperoute_api.schemas import (
    ErrorBody,
    ErrorCode,
    GpxRequestBody,
    RouteJobBody,
    RouteRequestBody,
    RouteResultBody,
    ShapeReadingBody,
    ShapeReadingRequestBody,
)

log = logging.getLogger(__name__)

ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    422: {"model": ErrorBody, "description": "invalid_request or shape_not_drawable"},
    500: {"model": ErrorBody, "description": "engine_error"},
    503: {"model": ErrorBody, "description": "map_data_unavailable"},
}
SHAPE_READING_RESPONSES: dict[int | str, dict[str, Any]] = {
    422: {"model": ErrorBody, "description": "invalid_request"},
    503: {"model": ErrorBody, "description": "ai_unavailable"},
}
AI_OFF = "This API was started without the AI that reads shape words."
UNKNOWN_JOB = (
    "Unknown route job: cancelled, finished more than 10 minutes ago, "
    "or the API was restarted."
)


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


def to_request(body: RouteRequestBody) -> RouteRequest:
    """The engine's RouteRequest checks the values: InvalidRequestError."""
    return RouteRequest(
        start=body.start,
        shape=body.shape,
        word=body.word,
        distance_m=body.distance_m,
        activity=body.activity,
    )


def gpx_file_name(request: RouteRequest, when: datetime) -> str:
    """No spaces or odd characters: some apps refuse them, e.g.
    'shaperoute-heart-5km-2026-09-23.gpx', 'shaperoute-CIAO-15km-2026-09-24.gpx'."""
    km = f"{request.distance_m / 1000:g}km"
    return f"shaperoute-{request.name}-{km}-{when:%Y-%m-%d}.gpx"


def job_body(job: Job) -> RouteJobBody:
    return RouteJobBody(
        job_id=job.job_id,
        status=job.status,
        result=None if job.result is None else RouteResultBody.from_result(job.result),
        error=job.error,
    )


def now_utc() -> datetime:
    return datetime.now(UTC)


def create_app(
    source: GraphLoader,
    planner: Planner = plan_route,
    jobs: RouteJobs | None = None,
    now: Callable[[], datetime] = now_utc,
    reader: ShapeReader | None = None,
) -> FastAPI:
    route_jobs = jobs or RouteJobs(source, planner)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if reader is not None:
            # In the background: the API answers at once, even with Ollama
            # off or the model missing; the first word waits less (TASK-052).
            log.info("AI model: loading in the background")
            threading.Thread(
                target=reader.warm_up, name="ai-preload", daemon=True
            ).start()
        yield
        route_jobs.shutdown()

    app = FastAPI(
        title="ShapeRoute API",
        version="0.2.0",
        description="Generates real routes that draw a shape on the map.",
        lifespan=lifespan,
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/route-jobs", status_code=202, responses=ERROR_RESPONSES)
    def create_route_job(body: RouteRequestBody) -> RouteJobBody:
        return job_body(route_jobs.submit(to_request(body)))

    @app.get("/route-jobs/{job_id}", responses={404: {"model": ErrorBody}})
    def get_route_job(job_id: str) -> RouteJobBody:
        job = route_jobs.get(job_id)
        if job is None:
            raise HTTPException(404, UNKNOWN_JOB)
        return job_body(job)

    @app.delete(
        "/route-jobs/{job_id}", status_code=204, responses={404: {"model": ErrorBody}}
    )
    def cancel_route_job(job_id: str) -> Response:
        if not route_jobs.cancel(job_id):
            raise HTTPException(404, UNKNOWN_JOB)
        return Response(status_code=204)

    # The route as a GPX file, written by the engine's own export, the one the
    # CLI uses (ADR-0033). Nothing is kept: the app sends request and result.
    @app.post(
        "/gpx",
        response_class=Response,
        responses={
            200: {"content": {"application/gpx+xml": {}}, "description": "GPX 1.1"},
            422: ERROR_RESPONSES[422],
        },
    )
    def export_gpx(body: GpxRequestBody) -> Response:
        request = to_request(body.request)
        when = now()
        document = to_gpx(
            body.result.points,
            route_name(request.name, request.distance_m, when),
            when,
        )
        return Response(
            document,
            media_type="application/gpx+xml",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{gpx_file_name(request, when)}"'
                )
            },
        )

    # The words the app's table does not know (ADR-0012). A plain def, like
    # /routes: a model on a laptop takes seconds, in a thread of its own.
    @app.post("/shape-readings", responses=SHAPE_READING_RESPONSES)
    def read_shape(body: ShapeReadingRequestBody) -> ShapeReadingBody:
        if reader is None:
            raise ModelUnavailableError(AI_OFF)
        choice = reader.read(body.text)
        return ShapeReadingBody(text=clean(body.text), shape=choice.shape)

    # A plain def: FastAPI runs it in a thread, so a long route does not stop
    # the server from answering the other requests.
    @app.post("/routes", responses=ERROR_RESPONSES)
    def create_route(body: RouteRequestBody) -> RouteResultBody:
        request = to_request(body)
        what = f"{request.name} {request.distance_m} m"
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

    def engine_answer(_: Request, exc: Exception) -> JSONResponse:
        status, detail = error_of(exc)
        body = ErrorBody(error=detail)
        return JSONResponse(status_code=status, content=body.model_dump())

    for known in (
        InvalidRequestError,
        ShapeNotDrawableError,
        MapDataUnavailableError,
        InvalidTextError,
        ModelUnavailableError,
    ):
        app.add_exception_handler(known, engine_answer)

    @app.exception_handler(StarletteHTTPException)
    def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return error(exc.status_code, "http_error", str(exc.detail))

    # Anything else, InvalidRouteError included (ADR-0026). The traceback goes
    # to the server log, not to the phone.
    @app.exception_handler(Exception)
    def engine_error(request: Request, exc: Exception) -> JSONResponse:
        log.exception("route failed", exc_info=exc)
        return engine_answer(request, exc)

    return app
