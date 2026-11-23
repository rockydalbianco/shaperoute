"""The takeoffs and landings of free flying (TASK-493 part A, ADR-0400,
migration 0086): written by the extract (flying_sites_extract.py), read by
GET /flying-sites and GET /flying-sites/{id}.

- GET /flying-sites?south=…&west=…&north=…&east=…: the sites of a box of
  the map, at most MAX_BOX_DEG a side, the first `limit` by id, and `more`
  when the box has others (the app asks for a smaller box).
- GET /flying-sites/{id}: one site, with the sites of the other kind
  within NEAR_M (the landings near a takeoff, the takeoffs above a
  landing), the nearest first.

The sites are OpenStreetMap data under the ODbL, the same for everyone and
with no user data: no account is needed, the API key is asked as on every
path (access.py), and every answer carries the attribution the app shows.
A box asked for stays out of the access log, as every query string. The
flights from a site (its history) are part B.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Path, Query
from psycopg import Connection
from pydantic import BaseModel, Field

from shaperoute_api.accounts import ACCOUNT_ERRORS, Accounts, accounts_of
from shaperoute_api.schemas import ErrorBody

SiteKind = Literal["takeoff", "landing"]
OsmType = Literal["node", "way"]

ATTRIBUTION = "© OpenStreetMap contributors"
# The widest box one request reads, in degrees a side: a region of the
# Alps. Wider, the map is too far out to tell one takeoff from another.
MAX_BOX_DEG = 5.0
# The most sites one box gives; a box of the Alps holds fewer.
MAX_SITES = 1000
# The other sites a site's page names: the landings of a takeoff within
# this many metres, the nearest first, at most MAX_NEAR.
NEAR_M = 15_000
MAX_NEAR = 5
MAX_NAME = 120

# The compass points of `orientation`, as the migration's CHECK holds them.
COMPASS = (
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
)

NO_SITE = "No flying site with this id."
BOX_TOO_WIDE = f"Ask for a box at most {MAX_BOX_DEG:g}° a side: zoom in."
BOX_UPSIDE_DOWN = "The box's south must be below its north, its west left of its east."


@dataclass(frozen=True)
class Site:
    """A takeoff or a landing as the extract reads it from OSM."""

    osm_type: OsmType
    osm_id: int
    kind: SiteKind
    point: tuple[float, float]  # (lat, lon)
    name: str | None = None
    ele_m: int | None = None
    orientation: tuple[str, ...] = ()
    official: bool | None = None


@dataclass(frozen=True)
class Stored:
    """A site in the database, with its id, and how far it is when it was
    found near another."""

    id: int
    site: Site
    away_m: float | None = None


POINT = "ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326)::geography"
COLUMNS = (
    "id, osm_type, osm_id, kind,"
    " ST_Y(point::geometry) AS lat, ST_X(point::geometry) AS lon,"
    " name, ele_m, orientation, official"
)


def save_sites(conn: Connection[Any], sites: Iterable[Site], now: datetime) -> int:
    """Writes `sites`, each replacing the row of its OSM object and kind (its
    id stays); returns how many."""
    count = 0
    with conn.cursor() as cur:
        for site in sites:
            cur.execute(
                "INSERT INTO flying_sites (osm_type, osm_id, kind, point, name,"
                " ele_m, orientation, official, updated_at)"
                f" VALUES (%(osm_type)s, %(osm_id)s, %(kind)s, {POINT},"
                " %(name)s, %(ele_m)s, %(orientation)s, %(official)s, %(now)s)"
                " ON CONFLICT (osm_type, osm_id, kind) DO UPDATE SET"
                " point = EXCLUDED.point, name = EXCLUDED.name,"
                " ele_m = EXCLUDED.ele_m, orientation = EXCLUDED.orientation,"
                " official = EXCLUDED.official, updated_at = EXCLUDED.updated_at",
                {
                    "osm_type": site.osm_type,
                    "osm_id": site.osm_id,
                    "kind": site.kind,
                    "lat": site.point[0],
                    "lon": site.point[1],
                    "name": site.name,
                    "ele_m": site.ele_m,
                    "orientation": list(site.orientation),
                    "official": site.official,
                    "now": now,
                },
            )
            count += 1
    return count


def delete_older(conn: Connection[Any], than: datetime) -> int:
    """Removes the sites not written since `than` (a clean extract, after
    OSM dropped some or they lost their tags); returns how many."""
    return conn.execute(
        "DELETE FROM flying_sites WHERE updated_at < %s", (than,)
    ).rowcount


def _stored(row: Mapping[str, Any]) -> Stored:
    away = row.get("away_m")
    return Stored(
        id=row["id"],
        site=Site(
            osm_type=row["osm_type"],
            osm_id=row["osm_id"],
            kind=row["kind"],
            point=(row["lat"], row["lon"]),
            name=row["name"],
            ele_m=row["ele_m"],
            orientation=tuple(row["orientation"]),
            official=row["official"],
        ),
        away_m=None if away is None else float(away),
    )


def sites_in(
    conn: Connection[Any],
    box: tuple[float, float, float, float],
    kind: SiteKind | None,
    limit: int,
) -> tuple[list[Stored], bool]:
    """The sites in `box` (south, west, north, east), by id, at most
    `limit`, and whether the box has more."""
    south, west, north, east = box
    rows = conn.execute(
        f"SELECT {COLUMNS} FROM flying_sites"
        " WHERE point::geometry && ST_MakeEnvelope(%(west)s, %(south)s,"
        " %(east)s, %(north)s, 4326)"
        " AND (%(kind)s::text IS NULL OR kind = %(kind)s)"
        " ORDER BY id LIMIT %(limit)s",
        {
            "south": south,
            "west": west,
            "north": north,
            "east": east,
            "kind": kind,
            "limit": limit + 1,
        },
    ).fetchall()
    return [_stored(row) for row in rows[:limit]], len(rows) > limit


def site_of(conn: Connection[Any], site_id: int) -> Stored | None:
    row = conn.execute(
        f"SELECT {COLUMNS} FROM flying_sites WHERE id = %s", (site_id,)
    ).fetchone()
    return None if row is None else _stored(row)


def near(conn: Connection[Any], stored: Stored) -> list[Stored]:
    """The sites of the other kind within NEAR_M of `stored`, the nearest
    first, at most MAX_NEAR."""
    lat, lon = stored.site.point
    other = "landing" if stored.site.kind == "takeoff" else "takeoff"
    rows = conn.execute(
        f"SELECT {COLUMNS}, ST_Distance(point, {POINT}) AS away_m"
        " FROM flying_sites WHERE kind = %(kind)s"
        f" AND ST_DWithin(point, {POINT}, %(near)s)"
        f" ORDER BY point <-> {POINT}, id LIMIT %(limit)s",
        {"lat": lat, "lon": lon, "kind": other, "near": NEAR_M, "limit": MAX_NEAR},
    ).fetchall()
    return [_stored(row) for row in rows]


# --- The answers ---


class FlyingSiteBody(BaseModel):
    """A takeoff or a landing: packages/shared-types/fixtures/flying-sites.json
    (part C)."""

    id: int
    kind: SiteKind
    lat: float
    lon: float
    name: str | None
    ele_m: int | None = Field(description="OSM's `ele`, in metres, when known.")
    orientation: list[str] = Field(
        description="The wind directions the site faces, as compass points"
        " (N, NNE, … NNW); empty when OSM does not say."
    )
    official: bool | None = Field(description="free_flying:official, when known.")
    osm_url: str = Field(description="The object on openstreetmap.org.")
    away_m: float | None = Field(
        default=None, description="How far it is, for the sites near another."
    )


class FlyingSitesBody(BaseModel):
    sites: list[FlyingSiteBody]
    more: bool = Field(description="The box has more sites: ask a smaller one.")
    attribution: str = Field(description="To show with the sites.")


class FlyingSiteDetailBody(BaseModel):
    site: FlyingSiteBody
    near: list[FlyingSiteBody] = Field(
        description=f"The sites of the other kind within {NEAR_M} m, the"
        " nearest first."
    )
    attribution: str


def _body(stored: Stored) -> FlyingSiteBody:
    site = stored.site
    return FlyingSiteBody(
        id=stored.id,
        kind=site.kind,
        lat=round(site.point[0], 6),
        lon=round(site.point[1], 6),
        name=site.name,
        ele_m=site.ele_m,
        orientation=list(site.orientation),
        official=site.official,
        osm_url=f"https://www.openstreetmap.org/{site.osm_type}/{site.osm_id}",
        away_m=None if stored.away_m is None else round(stored.away_m),
    )


def check_box(south: float, west: float, north: float, east: float) -> None:
    if south > north or west > east:
        raise HTTPException(422, BOX_UPSIDE_DOWN)
    if north - south > MAX_BOX_DEG or east - west > MAX_BOX_DEG:
        raise HTTPException(422, BOX_TOO_WIDE)


def flying_sites_routes() -> APIRouter:
    router = APIRouter(tags=["flying sites"], responses=ACCOUNT_ERRORS)

    @router.get("/flying-sites", responses={422: {"model": ErrorBody}})
    def flying_sites(
        accounts: Annotated[Accounts, Depends(accounts_of)],
        south: Annotated[float, Query(ge=-90, le=90)],
        west: Annotated[float, Query(ge=-180, le=180)],
        north: Annotated[float, Query(ge=-90, le=90)],
        east: Annotated[float, Query(ge=-180, le=180)],
        kind: SiteKind | None = None,
        limit: Annotated[int, Query(ge=1, le=MAX_SITES)] = MAX_SITES,
    ) -> FlyingSitesBody:
        check_box(south, west, north, east)
        with accounts.database.connect() as conn:
            found, more = sites_in(conn, (south, west, north, east), kind, limit)
        return FlyingSitesBody(
            sites=[_body(s) for s in found], more=more, attribution=ATTRIBUTION
        )

    @router.get("/flying-sites/{site_id}", responses={404: {"model": ErrorBody}})
    def flying_site(
        site_id: Annotated[int, Path(ge=1, le=2**63 - 1)],
        accounts: Annotated[Accounts, Depends(accounts_of)],
    ) -> FlyingSiteDetailBody:
        with accounts.database.connect() as conn:
            stored = site_of(conn, site_id)
            if stored is None:
                raise HTTPException(404, NO_SITE)
            others = near(conn, stored)
        return FlyingSiteDetailBody(
            site=_body(stored),
            near=[_body(s) for s in others],
            attribution=ATTRIBUTION,
        )

    return router


def install_flying_sites(app: FastAPI) -> None:
    """The flying sites' routes; after install_accounts, which sets the
    database and the errors."""
    app.include_router(flying_sites_routes())
