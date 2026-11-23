"""The ski resorts of the world in the database (TASK-406 part A, ADR-0338,
migration 0054): written by the import (resort_import.py), read by
GET /ski-resorts (ski_resorts_api.py).

A resort is the same for everyone and has no user data. The import replaces
each row by its id; a resort the source no longer has stays until a clean
import (`delete_missing`).
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from psycopg import Connection
from psycopg.types.json import Jsonb

# The most resorts one search gives: the phone shows a list, not a map.
MAX_FOUND = 50

POINT = "ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326)::geography"


@dataclass(frozen=True)
class Resort:
    id: str
    name: str
    country: str | None
    region: str | None
    center: tuple[float, float]  # (lat, lon)
    bbox: tuple[float, float, float, float]  # (south, west, north, east)
    lifts: int
    piste_km: float
    piste_km_by_difficulty: Mapping[str, float] = field(default_factory=dict)
    min_elevation_m: int | None = None
    max_elevation_m: int | None = None
    website: str | None = None


@dataclass(frozen=True)
class Found:
    """A resort found near a position, with how far its centre is."""

    resort: Resort
    away_m: float


COLUMNS = (
    "id, name, country, region,"
    " ST_Y(center::geometry) AS lat, ST_X(center::geometry) AS lon,"
    " south, west, north, east, lifts, piste_km, piste_km_by_difficulty,"
    " min_elevation_m, max_elevation_m, website"
)


def save_resorts(
    conn: Connection[Any], resorts: Iterable[Resort], now: datetime
) -> int:
    """Writes `resorts`, each replacing the row of its id; returns how many."""
    count = 0
    with conn.cursor() as cur:
        for resort in resorts:
            south, west, north, east = resort.bbox
            cur.execute(
                "INSERT INTO ski_resorts (id, name, country, region, center,"
                " south, west, north, east, lifts, piste_km,"
                " piste_km_by_difficulty, min_elevation_m, max_elevation_m,"
                " website, updated_at)"
                f" VALUES (%(id)s, %(name)s, %(country)s, %(region)s, {POINT},"
                " %(south)s, %(west)s, %(north)s, %(east)s, %(lifts)s,"
                " %(piste_km)s, %(by_difficulty)s, %(min_m)s, %(max_m)s,"
                " %(website)s, %(now)s)"
                " ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name,"
                " country = EXCLUDED.country, region = EXCLUDED.region,"
                " center = EXCLUDED.center, south = EXCLUDED.south,"
                " west = EXCLUDED.west, north = EXCLUDED.north,"
                " east = EXCLUDED.east, lifts = EXCLUDED.lifts,"
                " piste_km = EXCLUDED.piste_km,"
                " piste_km_by_difficulty = EXCLUDED.piste_km_by_difficulty,"
                " min_elevation_m = EXCLUDED.min_elevation_m,"
                " max_elevation_m = EXCLUDED.max_elevation_m,"
                " website = EXCLUDED.website, updated_at = EXCLUDED.updated_at",
                {
                    "id": resort.id,
                    "name": resort.name,
                    "country": resort.country,
                    "region": resort.region,
                    "lat": resort.center[0],
                    "lon": resort.center[1],
                    "south": south,
                    "west": west,
                    "north": north,
                    "east": east,
                    "lifts": resort.lifts,
                    "piste_km": resort.piste_km,
                    "by_difficulty": Jsonb(dict(resort.piste_km_by_difficulty)),
                    "min_m": resort.min_elevation_m,
                    "max_m": resort.max_elevation_m,
                    "website": resort.website,
                    "now": now,
                },
            )
            count += 1
    return count


def delete_missing(conn: Connection[Any], kept: Sequence[str]) -> int:
    """Removes the resorts whose id is not in `kept` (a clean import, after
    the source dropped some); returns how many."""
    cur = conn.execute(
        "DELETE FROM ski_resorts WHERE NOT (id = ANY(%s))", (list(kept),)
    )
    return cur.rowcount


def _resort(row: Mapping[str, Any]) -> Resort:
    return Resort(
        id=row["id"],
        name=row["name"],
        country=row["country"],
        region=row["region"],
        center=(row["lat"], row["lon"]),
        bbox=(row["south"], row["west"], row["north"], row["east"]),
        lifts=row["lifts"],
        piste_km=row["piste_km"],
        piste_km_by_difficulty=row["piste_km_by_difficulty"],
        min_elevation_m=row["min_elevation_m"],
        max_elevation_m=row["max_elevation_m"],
        website=row["website"],
    )


def _limit(limit: int) -> int:
    return max(1, min(limit, MAX_FOUND))


def resorts_named(conn: Connection[Any], text: str, limit: int) -> list[Resort]:
    """The resorts whose name holds `text`, ignoring case: the names that
    start with it first, then by number of lifts, then by name."""
    wanted = text.strip()
    if not wanted:
        return []
    pattern = (
        "%" + wanted.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
    )
    rows = conn.execute(
        f"SELECT {COLUMNS} FROM ski_resorts WHERE name ILIKE %(pattern)s"
        " ORDER BY (lower(name) LIKE lower(%(start)s)) DESC, lifts DESC, name, id"
        " LIMIT %(limit)s",
        {"pattern": pattern, "start": pattern[1:], "limit": _limit(limit)},
    ).fetchall()
    return [_resort(row) for row in rows]


def resorts_near(
    conn: Connection[Any], lat: float, lon: float, limit: int
) -> list[Found]:
    """The resorts nearest to (lat, lon), the nearest first."""
    rows = conn.execute(
        f"SELECT {COLUMNS}, ST_Distance(center, {POINT}) AS away_m"
        f" FROM ski_resorts ORDER BY center <-> {POINT}, id LIMIT %(limit)s",
        {"lat": lat, "lon": lon, "limit": _limit(limit)},
    ).fetchall()
    return [Found(_resort(row), float(row["away_m"])) for row in rows]


def resort_of(conn: Connection[Any], resort_id: str) -> Resort | None:
    row = conn.execute(
        f"SELECT {COLUMNS} FROM ski_resorts WHERE id = %s", (resort_id,)
    ).fetchone()
    return None if row is None else _resort(row)
