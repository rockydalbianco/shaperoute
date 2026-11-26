"""The history of a takeoff (TASK-493 part B, ADR-0400): how many flights
of MuW start there, month by month and today, from how many pilots, who is
in the air from there now, and the records of the flights posted for
everyone.

GET /flying-sites/{id}/history?utc_offset_min=…

- **A flight of a takeoff**: a saved paragliding run whose takeoff point
  is within TAKEOFF_M of the site. The takeoff point is the track's point
  where its first part in the air starts (run_stats keeps the parts, as
  flight_legs.py reads them), else its first point. A track has no
  altitude, so the altitude of the site is not compared.
- **The numbers** count every saved flight, private ones too, without a
  name, and are shown only from MIN_PILOTS distinct pilots up (the user's
  choice, 2026-11-23): below, `few` and every number null. «Today» starts
  at the asker's local midnight (`utc_offset_min`, the phone's offset).
- **In the air now**: the live shares of a flight going on whose first
  point is within TAKEOFF_M of the site; their ids only for those the
  pilot shares with everyone in the Feed (audience_feed), so the app opens
  them as the Feed does. Never a name.
- **The records**: only flights whose post every member may open (for
  everyone, published, not hidden, of a visible account), with the post
  and the pilot's username: the longest time in the air, the highest
  altitude, the longest distance in the air.

Computed on read, with no table and nothing in the save of a run: the
flights of a site are kept in memory CACHE_S seconds; the live shares and
«today» are read at each request. Like the site, no account is needed.
"""

from __future__ import annotations

import math
import threading
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Path, Query
from psycopg import Connection
from psycopg.rows import DictRow
from pydantic import BaseModel, Field

from shaperoute_api.accounts import ACCOUNT_ERRORS, Accounts, accounts_of
from shaperoute_api.flight_legs import KeptFlightPart, air_legs
from shaperoute_api.flying_sites import NO_SITE
from shaperoute_api.schemas import ErrorBody

# A flight starts from a takeoff within this many metres of it.
TAKEOFF_M = 300
# The runs looked at: those whose track starts this close to the site. A
# hike & fly starts on foot, below.
CANDIDATE_M = 20_000
MIN_PILOTS = 3
MONTHS = 12
CACHE_S = 600
EARTH_M = 6_371_008.8
MAX_OFFSET_MIN = 14 * 60

FLIGHTS_NEAR = (
    "SELECT r.id, r.user_id, r.started_at, r.distance_m, r.duration_s,"
    " (SELECT array_agg(ST_Y(p.geom) ORDER BY p.path[1])"
    "   FROM ST_DumpPoints(r.track) AS p) AS lats,"
    " (SELECT array_agg(ST_X(p.geom) ORDER BY p.path[1])"
    "   FROM ST_DumpPoints(r.track) AS p) AS lons,"
    " (SELECT array_agg(ST_M(p.geom) ORDER BY p.path[1])"
    "   FROM ST_DumpPoints(r.track) AS p) AS times,"
    " s.stats -> 'flight_parts' AS parts, s.stats -> 'flight_split' AS split,"
    " (s.stats ->> 'max_alt_m')::float AS max_alt_m,"
    " (SELECT d.id FROM drawings d JOIN users u ON u.id = d.user_id"
    "   WHERE d.run_id = r.id AND d.visibility = 'everyone'"
    "   AND d.published_at IS NOT NULL AND d.hidden_at IS NULL"
    "   AND u.hidden_at IS NULL LIMIT 1) AS public_drawing,"
    " (SELECT u.username FROM users u WHERE u.id = r.user_id) AS username"
    " FROM flying_sites f JOIN runs r ON r.activity = 'paragliding'"
    " AND r.track IS NOT NULL"
    " AND ST_DWithin(ST_Force2D(ST_StartPoint(r.track))::geography, f.point,"
    " %(near)s)"
    " LEFT JOIN run_stats s ON s.run_id = r.id"
    " WHERE f.id = %(site)s AND f.kind = 'takeoff'"
    " ORDER BY r.id"
)

LIVE_NOW = (
    "SELECT ls.id, ls.audience_feed = 'everyone' AND u.hidden_at IS NULL"
    " AS shown"
    " FROM flying_sites f, live_shares ls JOIN users u ON u.id = ls.user_id,"
    " LATERAL (SELECT p.lat, p.lon FROM live_share_points p"
    "   WHERE p.share_id = ls.id ORDER BY p.id LIMIT 1) first"
    " WHERE f.id = %(site)s AND ls.activity = 'paragliding'"
    " AND ls.finished_at IS NULL AND ls.stopped_at IS NULL"
    " AND ls.expires_at > %(now)s"
    " AND ST_DWithin(ST_SetSRID(ST_MakePoint(first.lon, first.lat), 4326)"
    "::geography, f.point, %(takeoff)s)"
    " ORDER BY ls.created_at, ls.id"
)


@dataclass(frozen=True)
class Flight:
    """A flight from the site, as the history needs it."""

    run_id: int
    user_id: int
    started_at: datetime
    air_s: float
    air_m: float
    max_alt_m: float | None
    public_drawing: UUID | None
    username: str | None


def metres_between(a: tuple[float, float], b: tuple[float, float]) -> float:
    """The great-circle distance between two (lat, lon), in metres."""
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * EARTH_M * math.asin(min(1.0, math.sqrt(h)))


def takeoff_index(times: Sequence[float], parts: Sequence[KeptFlightPart]) -> int:
    """The point of the track where the flight leaves the ground: the first
    of its first part in the air, else the first."""
    legs = air_legs(times, parts)
    return legs[0][0] if legs else 0


def _flight(row: dict[str, Any], site: tuple[float, float]) -> Flight | None:
    lats, lons, times = row["lats"], row["lons"], row["times"]
    if not lats or not times:
        return None
    parts = [KeptFlightPart.model_validate(p) for p in (row["parts"] or [])]
    i = takeoff_index(times, parts)
    if metres_between((lats[i], lons[i]), site) > TAKEOFF_M:
        return None
    split = row["split"]
    if split is not None:
        air_s, air_m = split["air"]["seconds"], split["air"]["metres"]
    else:
        air_s, air_m = row["duration_s"], row["distance_m"]
    return Flight(
        run_id=row["id"],
        user_id=row["user_id"],
        started_at=row["started_at"],
        air_s=float(air_s),
        air_m=float(air_m),
        max_alt_m=row["max_alt_m"],
        public_drawing=row["public_drawing"],
        username=row["username"],
    )


def flights_of(conn: Connection[DictRow], site_id: int) -> list[Flight] | None:
    """The flights from takeoff `site_id`; None when there is no such
    takeoff (a landing has no history)."""
    site = conn.execute(
        "SELECT ST_Y(point::geometry) AS lat, ST_X(point::geometry) AS lon"
        " FROM flying_sites WHERE id = %s AND kind = 'takeoff'",
        (site_id,),
    ).fetchone()
    if site is None:
        return None
    rows = conn.execute(FLIGHTS_NEAR, {"site": site_id, "near": CANDIDATE_M})
    point = (site["lat"], site["lon"])
    found = [_flight(dict(row), point) for row in rows.fetchall()]
    return [f for f in found if f is not None]


def _month(at: datetime) -> str:
    return f"{at.year:04d}-{at.month:02d}"


def months_back(now: datetime, n: int = MONTHS) -> list[str]:
    """The last `n` months, the oldest first, this one last (UTC)."""
    year, month = now.year, now.month
    out: list[str] = []
    for _ in range(n):
        out.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    return out[::-1]


# --- The answer ---


class MonthBody(BaseModel):
    month: str = Field(description="YYYY-MM, UTC.")
    flights: int
    pilots: int


class RecordBody(BaseModel):
    value: float
    drawing_id: UUID = Field(description="The post of the flight.")
    username: str
    started_at: datetime


class RecordsBody(BaseModel):
    longest_s: RecordBody | None = Field(description="The most seconds in the air.")
    highest_m: RecordBody | None = Field(
        description="The highest altitude reached, metres above sea level."
    )
    farthest_m: RecordBody | None = Field(description="The most metres in the air.")


class InAirBody(BaseModel):
    count: int
    shares: list[UUID] = Field(
        description="The live shares among them shared with everyone in the"
        " Feed, to open as the Feed does; never the others."
    )


class FlyingHistoryBody(BaseModel):
    site_id: int
    few: bool = Field(
        description=f"Fewer than {MIN_PILOTS} distinct pilots: the numbers are" " null."
    )
    flights: int | None
    pilots: int | None
    today: int | None = Field(description="Since the asker's local midnight.")
    months: list[MonthBody] | None = Field(
        description=f"The last {MONTHS} months, the oldest first."
    )
    in_air_now: InAirBody
    records: RecordsBody


def _record(
    flights: Sequence[Flight], value: Callable[[Flight], float | None]
) -> RecordBody | None:
    best: tuple[float, Flight] | None = None
    for flight in flights:
        v = value(flight)
        if flight.public_drawing is None or flight.username is None or v is None:
            continue
        # The highest value; on a tie, the earlier flight.
        if best is None or v > best[0]:
            best = (v, flight)
    if best is None:
        return None
    v, flight = best
    assert flight.public_drawing is not None and flight.username is not None
    return RecordBody(
        value=round(v),
        drawing_id=flight.public_drawing,
        username=flight.username,
        started_at=flight.started_at,
    )


def history_body(
    site_id: int,
    flights: Sequence[Flight],
    live: Sequence[tuple[UUID, bool]],
    now: datetime,
    utc_offset_min: int,
) -> FlyingHistoryBody:
    ordered = sorted(flights, key=lambda f: (f.started_at, f.run_id))
    records = RecordsBody(
        longest_s=_record(ordered, lambda f: f.air_s),
        highest_m=_record(ordered, lambda f: f.max_alt_m),
        farthest_m=_record(ordered, lambda f: f.air_m),
    )
    in_air = InAirBody(
        count=len(live), shares=[share for share, shown in live if shown]
    )
    pilots = len({f.user_id for f in ordered})
    if pilots < MIN_PILOTS:
        return FlyingHistoryBody(
            site_id=site_id,
            few=True,
            flights=None,
            pilots=None,
            today=None,
            months=None,
            in_air_now=in_air,
            records=records,
        )
    offset = timedelta(minutes=utc_offset_min)
    local_now = now + offset
    midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0) - offset
    months = []
    for month in months_back(now):
        inside = [f for f in ordered if _month(f.started_at) == month]
        months.append(
            MonthBody(
                month=month,
                flights=len(inside),
                pilots=len({f.user_id for f in inside}),
            )
        )
    return FlyingHistoryBody(
        site_id=site_id,
        few=False,
        flights=len(ordered),
        pilots=pilots,
        today=sum(1 for f in ordered if midnight <= f.started_at <= now),
        months=months,
        in_air_now=in_air,
        records=records,
    )


class FlightsCache:
    """The flights of each site, kept CACHE_S seconds."""

    def __init__(self) -> None:
        self.kept: dict[int, tuple[datetime, list[Flight] | None]] = {}
        self.lock = threading.Lock()

    def get(
        self,
        site_id: int,
        now: datetime,
        read: Callable[[], list[Flight] | None],
    ) -> list[Flight] | None:
        with self.lock:
            hit = self.kept.get(site_id)
        if hit is not None and timedelta(0) <= now - hit[0] < timedelta(
            seconds=CACHE_S
        ):
            return hit[1]
        flights = read()
        with self.lock:
            self.kept[site_id] = (now, flights)
        return flights


def flying_history_routes(cache: FlightsCache) -> APIRouter:
    router = APIRouter(tags=["flying sites"], responses=ACCOUNT_ERRORS)

    @router.get(
        "/flying-sites/{site_id}/history",
        responses={404: {"model": ErrorBody}, 422: {"model": ErrorBody}},
    )
    def flying_history(
        site_id: Annotated[int, Path(ge=1, le=2**63 - 1)],
        accounts: Annotated[Accounts, Depends(accounts_of)],
        utc_offset_min: Annotated[
            int, Query(ge=-MAX_OFFSET_MIN, le=MAX_OFFSET_MIN)
        ] = 0,
    ) -> FlyingHistoryBody:
        now = accounts.now()
        with accounts.database.connect() as conn:
            flights = cache.get(site_id, now, lambda: flights_of(conn, site_id))
            if flights is None:
                raise HTTPException(404, NO_SITE)
            rows = conn.execute(
                LIVE_NOW, {"site": site_id, "now": now, "takeoff": TAKEOFF_M}
            ).fetchall()
        live = [(row["id"], bool(row["shown"])) for row in rows]
        return history_body(site_id, flights, live, now, utc_offset_min)

    return router


def install_flying_history(app: FastAPI, cache: FlightsCache | None = None) -> None:
    """The history of the takeoffs; after install_accounts. One cache for
    the app's life, unless a test gives its own."""
    app.include_router(flying_history_routes(cache or FlightsCache()))
