"""The routes Explore recommends near a point (TASK-092, ADR-0229).

The «Recommended» row: the routes of the catalogue (recommended.py,
ADR-0098) that start within a few km of a point, in the order the agent
chose for the user ("consiglia tu i migliori disegni", 2026-10-07):

1. how much the drawing looks like its shape, as the card shows it (a
   whole percent): 97% before 96%;
2. at the same percent, the reactions left on the published drawings of
   the runs along that route (TASK-119);
3. then how many times the route was run (the runs saved in «My
   activities», TASK-172) and kept among the favorites (TASK-171);
4. at equal quality all are kept, the nearer first: never a route left out
   because it shares streets with another (ADR-0086, user 2026-10-01).

A run, or a favorite, is of a catalogue route when its line is that route's
line: the app sends the route's points as it shows them, and the favorites
name the line with `line_key`, the same key as the app's favoriteKey.
Nothing is written and nothing new is kept: no migration.
"""

from __future__ import annotations

import json
import math
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Query

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.db import Database
from shaperoute_api.recommended import (
    DEFAULT_RADIUS_M,
    MAX_RADIUS_M,
    CatalogRoute,
    LatLon,
    RecommendedCatalog,
    RecommendedRoutesBody,
    distance_m,
    listed,
)

# A row of cards: what a thumb scrolls through, and light (ADR-0229).
ROW_SIZE = 10
MAX_ROW_SIZE = 20
# A run's start may be a GPS fix away from the route's: the route's line is
# what counts, this only keeps the query short.
START_MARGIN_M = 100

_WORD = 0xFFFFFFFF


def _js_round(value: float) -> int:
    """As JavaScript's Math.round: halves up, also below zero."""
    return math.floor(value + 0.5)


def line_key(points: Iterable[LatLon]) -> str:
    """The name of a line, as the app's favoriteKey
    (apps/mobile/src/favorites/favoriteKey.ts) writes it: two FNV-1a hashes
    over the points rounded to five decimals. The same line has the same
    key on the phone and here; a change on one side alone loses the link."""
    a, b = 0x811C9DC5, 0x01000193
    for lat, lon in points:
        for value in (_js_round(lat * 1e5), _js_round(lon * 1e5)):
            for shift in range(0, 32, 8):
                byte = (value >> shift) & 0xFF
                a = ((a ^ byte) * 0x01000193) & _WORD
                b = ((b ^ byte) * 0x85EBCA6B + 0x9E3779B9) & _WORD
    return f"{a:08x}{b:08x}"


def shown_percent(similarity: float) -> int:
    """The similarity as the card writes it: 0.9651 is "97%"."""
    return _js_round(similarity * 100)


@dataclass(frozen=True)
class Uses:
    """What the members did with one route."""

    reactions: int = 0
    """Left on the published drawings of its runs."""
    runs: int = 0
    """Its runs saved in «My activities»."""
    saved: int = 0
    """The favorites that keep it."""


NOT_USED = Uses()


def ranked(
    found: Iterable[tuple[CatalogRoute, float]], uses: Mapping[str, Uses]
) -> list[tuple[CatalogRoute, float]]:
    """The routes with how far each starts, the best first (module doc):
    the shown percent, then the reactions, then the runs and the favorites
    together, then the nearer, then the id, so the order is always one."""

    def order(item: tuple[CatalogRoute, float]) -> tuple[int, int, int, float, str]:
        route, away = item
        used = uses.get(route.id, NOT_USED)
        return (
            -shown_percent(route.similarity),
            -used.reactions,
            -(used.runs + used.saved),
            away,
            route.id,
        )

    return sorted(found, key=order)


def near(
    catalog: RecommendedCatalog, point: LatLon, radius_m: float
) -> list[tuple[CatalogRoute, float]]:
    """Every route starting within `radius_m` of `point`, with how far."""
    found = []
    for route in catalog.routes.values():
        away = distance_m(point, route.start)
        if away <= radius_m:
            found.append((route, away))
    return found


def _line(geojson: str) -> list[LatLon]:
    return [(lat, lon) for lon, lat in json.loads(geojson)["coordinates"]]


def uses_of(
    database: Database,
    routes: Sequence[CatalogRoute],
    point: LatLon,
    radius_m: float,
) -> dict[str, Uses]:
    """What the members did with `routes`, by route id: one read of the
    runs that start near `point` with as many points as one of them, and
    one of the favorites with their keys."""
    if not routes:
        return {}
    by_key = {line_key(route.points): route.id for route in routes}
    sizes = sorted({len(route.points) for route in routes})
    reactions: dict[str, int] = {}
    runs: dict[str, int] = {}
    saved: dict[str, int] = {}
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT ST_AsGeoJSON(r.route, 9) AS route,"
            " (SELECT count(*) FROM drawings d"
            "  JOIN reactions x ON x.drawing_id = d.id"
            "  WHERE d.run_id = r.id AND d.visibility <> 'only_me') AS reactions"
            " FROM runs r"
            " WHERE r.route IS NOT NULL AND ST_NPoints(r.route) = ANY(%s)"
            " AND ST_DWithin(ST_StartPoint(r.route)::geography,"
            " ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)",
            (sizes, point[1], point[0], radius_m + START_MARGIN_M),
        ).fetchall()
        kept = conn.execute(
            "SELECT key, count(*) AS n FROM favorites WHERE key = ANY(%s)"
            " GROUP BY key",
            (list(by_key),),
        ).fetchall()
    for row in rows:
        route_id = by_key.get(line_key(_line(row["route"])))
        if route_id is not None:
            runs[route_id] = runs.get(route_id, 0) + 1
            reactions[route_id] = reactions.get(route_id, 0) + row["reactions"]
    for row in kept:
        saved[by_key[row["key"]]] = row["n"]
    return {
        route_id: Uses(
            reactions=reactions.get(route_id, 0),
            runs=runs.get(route_id, 0),
            saved=saved.get(route_id, 0),
        )
        for route_id in set(runs) | set(saved)
    }


def best_routes(catalog: RecommendedCatalog) -> APIRouter:
    router = APIRouter(tags=["recommended"], responses=ACCOUNT_ERRORS)

    # The point is in the query: not in the access log (ADR-0096).
    @router.get("/recommended")
    def recommended(
        accounts: Annotated[Accounts, Depends(accounts_of)],
        _user: Annotated[UserBody, Depends(current_user)],
        lat: Annotated[float, Query(ge=-90, le=90)],
        lon: Annotated[float, Query(ge=-180, le=180)],
        radius_m: Annotated[int, Query(ge=100, le=MAX_RADIUS_M)] = DEFAULT_RADIUS_M,
        limit: Annotated[int, Query(ge=1, le=MAX_ROW_SIZE)] = ROW_SIZE,
    ) -> RecommendedRoutesBody:
        point = (lat, lon)
        found = near(catalog, point, radius_m)
        uses = uses_of(accounts.database, [r for r, _ in found], point, radius_m)
        return RecommendedRoutesBody(
            routes=[listed(r, away) for r, away in ranked(found, uses)[:limit]]
        )

    return router


def install_best_routes(app: FastAPI, catalog: RecommendedCatalog) -> None:
    """GET /recommended over `catalog`; after install_accounts, which sets
    the database and the errors. It needs a token, as the feed."""
    app.include_router(best_routes(catalog))
