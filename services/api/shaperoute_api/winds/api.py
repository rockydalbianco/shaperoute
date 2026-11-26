"""GET /winds (TASK-479 part H, ADR-0388): the wind aloft around a place,
hour by hour, at LEVELS, from the finest fresh model that reaches it.

The phone asks before a flight and keeps the answer for the air. The
place comes rounded to PLACE_DECIMALS (about a kilometre), as every «near
me» of the app: the models know nothing of who asks. Numbers only, never
a verdict: speed in m/s and the direction the wind comes from, with the
source, its run and the attribution the app always shows.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, FastAPI, HTTPException, Query
from pydantic import BaseModel

from shaperoute_api.schemas import ErrorBody
from shaperoute_api.winds.grid import LEVELS, speed_and_from
from shaperoute_api.winds.sources import ATTRIBUTION
from shaperoute_api.winds.store import WindStore

PLACE_DECIMALS = 2
NO_WINDS = (
    "No wind for this place now: the models do not reach it, or the server has no run."
)


class LevelWind(BaseModel):
    hpa: int
    speed_ms: float | None
    from_deg: int | None


class HourWinds(BaseModel):
    time: datetime
    winds: list[LevelWind]


class WindsBody(BaseModel):
    source: str
    run: datetime
    attribution: str
    lat: float
    lon: float
    levels: list[int]
    hours: list[HourWinds]


def winds_routes(
    store: WindStore, now: Callable[[], datetime] = lambda: datetime.now(UTC)
) -> APIRouter:
    router = APIRouter(tags=["winds"])

    @router.get("/winds", responses={503: {"model": ErrorBody}})
    def winds(
        lat: Annotated[float, Query(ge=-90, le=90)],
        lon: Annotated[float, Query(ge=-180, le=180)],
    ) -> WindsBody:
        lat = round(lat, PLACE_DECIMALS)
        lon = round(lon, PLACE_DECIMALS)
        at = now()
        grid = store.best(lat, lon, at)
        if grid is None:
            raise HTTPException(503, NO_WINDS)
        hours = []
        # From the hour now on: the past of the run is no use to a pilot.
        start = at.replace(minute=0, second=0, microsecond=0)
        for hour, levels in zip(grid.hours, grid.at(lat, lon), strict=True):
            when = grid.run + timedelta(hours=hour)
            if when < start:
                continue
            row = []
            for hpa, wind in zip(LEVELS, levels, strict=True):
                if wind is None:
                    row.append(LevelWind(hpa=hpa, speed_ms=None, from_deg=None))
                else:
                    speed, from_deg = speed_and_from(*wind)
                    row.append(
                        LevelWind(hpa=hpa, speed_ms=round(speed, 1), from_deg=from_deg)
                    )
            hours.append(HourWinds(time=when, winds=row))
        return WindsBody(
            source=grid.source,
            run=grid.run,
            attribution=ATTRIBUTION.get(grid.source, grid.source),
            lat=lat,
            lon=lon,
            levels=list(LEVELS),
            hours=hours,
        )

    return router


def install_winds(app: FastAPI, store: WindStore | None = None) -> None:
    """GET /winds, from the directory of SHAPEROUTE_WINDS_DIR."""
    app.include_router(winds_routes(store or WindStore.from_environment()))
