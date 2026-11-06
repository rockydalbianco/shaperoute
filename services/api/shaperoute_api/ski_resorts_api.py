"""GET /ski-resorts: the ski resorts of the world, by name or near a
position, and GET /ski-resorts/{id}: one of them (TASK-406 part A,
ADR-0338, migration 0054).

The resorts are the same for everyone and carry no user data, so no account
is needed; the API key is asked as on every path (access.py). A position
asked for stays out of the access log, as every query string
(access_log.hide_query_strings).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Path, Query
from pydantic import BaseModel, Field

from shaperoute_api.accounts import ACCOUNT_ERRORS, Accounts, accounts_of
from shaperoute_api.schemas import ErrorBody
from shaperoute_api.ski_resorts import (
    MAX_FOUND,
    Resort,
    resort_of,
    resorts_named,
    resorts_near,
)

NO_RESORT = "No ski resort with this id."
NAME_OR_PLACE = "Ask by name (q) or by place (lat and lon)."


class SkiResortBody(BaseModel):
    """A ski resort: packages/shared-types/fixtures/ski-resorts.json (part C)."""

    id: str
    name: str
    country: str | None = Field(description="ISO 3166-1 alpha-2, when known.")
    region: str | None
    lat: float
    lon: float
    bbox: tuple[float, float, float, float] = Field(
        description="south, west, north, east, in degrees."
    )
    lifts: int = Field(ge=0)
    piste_km: float = Field(ge=0, description="The downhill pistes, in km.")
    piste_km_by_difficulty: dict[str, float]
    min_elevation_m: int | None
    max_elevation_m: int | None
    website: str | None
    away_m: float | None = Field(
        default=None,
        description="How far the resort's centre is, when asked by place.",
    )


class SkiResortsBody(BaseModel):
    resorts: list[SkiResortBody]


def _body(resort: Resort, away_m: float | None = None) -> SkiResortBody:
    return SkiResortBody(
        id=resort.id,
        name=resort.name,
        country=resort.country,
        region=resort.region,
        lat=resort.center[0],
        lon=resort.center[1],
        bbox=resort.bbox,
        lifts=resort.lifts,
        piste_km=round(resort.piste_km, 1),
        piste_km_by_difficulty={
            key: round(km, 1) for key, km in resort.piste_km_by_difficulty.items()
        },
        min_elevation_m=resort.min_elevation_m,
        max_elevation_m=resort.max_elevation_m,
        website=resort.website,
        away_m=None if away_m is None else round(away_m),
    )


def ski_resorts_routes() -> APIRouter:
    router = APIRouter(tags=["ski resorts"], responses=ACCOUNT_ERRORS)

    @router.get("/ski-resorts", responses={422: {"model": ErrorBody}})
    def ski_resorts(
        accounts: Annotated[Accounts, Depends(accounts_of)],
        q: Annotated[str | None, Query(max_length=60)] = None,
        lat: Annotated[float | None, Query(ge=-90, le=90)] = None,
        lon: Annotated[float | None, Query(ge=-180, le=180)] = None,
        limit: Annotated[int, Query(ge=1, le=MAX_FOUND)] = 20,
    ) -> SkiResortsBody:
        by_name = q is not None and q.strip() != ""
        by_place = lat is not None and lon is not None
        if by_name == by_place:
            raise HTTPException(422, NAME_OR_PLACE)
        with accounts.database.connect() as conn:
            if q is not None and by_name:
                found = [_body(r) for r in resorts_named(conn, q, limit)]
            else:
                assert lat is not None and lon is not None
                found = [
                    _body(f.resort, f.away_m)
                    for f in resorts_near(conn, lat, lon, limit)
                ]
        return SkiResortsBody(resorts=found)

    @router.get("/ski-resorts/{resort_id}", responses={404: {"model": ErrorBody}})
    def ski_resort(
        resort_id: Annotated[str, Path(max_length=80)],
        accounts: Annotated[Accounts, Depends(accounts_of)],
    ) -> SkiResortBody:
        with accounts.database.connect() as conn:
            resort = resort_of(conn, resort_id)
        if resort is None:
            raise HTTPException(404, NO_RESORT)
        return _body(resort)

    return router


def install_ski_resorts(app: FastAPI) -> None:
    """The ski resorts' routes; after install_accounts, which sets the
    database and the errors."""
    app.include_router(ski_resorts_routes())
