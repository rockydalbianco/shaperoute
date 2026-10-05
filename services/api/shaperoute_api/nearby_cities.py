"""The towns near a point, for "Near me" in "Explore" (TASK-236, ADR-0200).

GET /nearby-cities gives at most four cities and towns around where the
user is: those within 20 km, the largest first; where there are fewer than
four, as around a city alone in its valley, the circle widens up to 50 km
and the nearest beyond fill the list. The town the user is in is not one of
them: "Near me" already shows it.

They are OpenStreetMap's `place=city` and `place=town`, through Geoapify's
Places API with the key of the place search (places.py): the same points
and the same labels GET /cities gives for those names, so a town tapped
here and the same town typed are one city, with the same examples kept
(route_store.py). The service is asked from the middle of a square of about
1 km, not from the user's own position, and the answer is kept a day.
"""

from __future__ import annotations

import threading
import time
import urllib.parse
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import APIRouter, FastAPI, HTTPException, Query
from pydantic import BaseModel
from route_engine.geo import haversine_m

from shaperoute_api.cities import city_label, result_point
from shaperoute_api.places import Fetch, PlacesUnavailableError, fetch_json
from shaperoute_api.route_store import RouteStore
from shaperoute_api.schemas import ErrorBody

LatLon = tuple[float, float]

PLACES_URL = "https://api.geoapify.com/v2/places"
CITIES = "populated_place.city"
TOWNS = "populated_place.town"
MAX_NEARBY = 4
# A short drive: the towns looked at first.
NEAR_RADIUS_M = 20_000
# Where those are fewer than MAX_NEARBY, as far as this.
FAR_RADIUS_M = 50_000
# A town whose centre is this close is the one the user is in (the app's
# OWN_RADIUS_M, ownRoutes.ts).
OWN_RADIUS_M = 1500.0
# The service gives the nearest first: around Milan the towns within
# NEAR_RADIUS_M are about a hundred.
ASK_TOWNS = 100
ASK_CITIES = 50
# About 1 km: the points of a neighbourhood share an answer.
CELL_DECIMALS = 2
CACHE_SIZE = 500
CACHE_TTL_S = 24 * 3600.0

NO_KEY = "Nearby towns are off on this API."
SERVICE_FAILED = "The nearby towns service did not answer; try again."


class NearbyCityBody(BaseModel):
    """A town near the point: its label and centre as GET /cities gives."""

    label: str
    point: tuple[float, float]
    """(lat, lon)."""
    away_m: int
    """From the point asked to the town's centre, as the crow flies."""


class NearbyCitiesBody(BaseModel):
    """The answer of GET /nearby-cities: the nearest first."""

    places: list[NearbyCityBody]


@dataclass(frozen=True)
class Town:
    label: str
    point: LatLon
    population: int
    """0 when OpenStreetMap does not say."""


def nearby_url(key: str, categories: str, centre: LatLon, radius_m: int) -> str:
    lat, lon = centre
    params = {
        "categories": categories,
        "conditions": "named",
        "filter": f"circle:{lon},{lat},{radius_m}",
        "bias": f"proximity:{lon},{lat}",
        "limit": str(ASK_CITIES if categories == CITIES else ASK_TOWNS),
        "apiKey": key,
    }
    return f"{PLACES_URL}?{urllib.parse.urlencode(params)}"


def population_of(properties: dict[str, Any]) -> int:
    source = properties.get("datasource")
    raw = source.get("raw") if isinstance(source, dict) else None
    value = raw.get("population") if isinstance(raw, dict) else None
    if isinstance(value, bool):
        return 0
    if isinstance(value, int | float):
        return max(int(value), 0)
    # OpenStreetMap's tag is text: "7915", now and then "7 915".
    digits = "".join(value.split()) if isinstance(value, str) else ""
    return int(digits) if digits.isdigit() else 0


def parse_towns(body: Any) -> list[Town]:
    """The service's towns that read: a name, a point; each label once."""
    features = body.get("features") if isinstance(body, dict) else None
    towns: dict[str, Town] = {}
    for feature in features if isinstance(features, list) else []:
        properties = feature.get("properties") if isinstance(feature, dict) else None
        if not isinstance(properties, dict):
            continue
        point = result_point(properties)
        # The town's own name: `city` is the municipality around a village.
        label = city_label({**properties, "city": properties.get("name")})
        if point is None or label is None or label in towns:
            continue
        towns[label] = Town(label, point, population_of(properties))
    return list(towns.values())


def choose(centre: LatLon, near: list[Town], far: list[Town]) -> list[Town]:
    """At most MAX_NEARBY: the largest of `near`, then the nearest of `far`
    that are not among them, as a circle that widens; the user's own town is
    in neither. The nearest first."""

    def away(town: Town) -> float:
        return haversine_m(centre, town.point)

    def largest(towns: list[Town]) -> list[Town]:
        return sorted(towns, key=lambda t: (-t.population, away(t)))

    chosen: dict[str, Town] = {}
    for town in [*largest(near), *sorted(far, key=away)]:
        if len(chosen) == MAX_NEARBY:
            break
        if away(town) > OWN_RADIUS_M:
            chosen.setdefault(town.label, town)
    return sorted(chosen.values(), key=away)


class NearbyCities:
    def __init__(
        self,
        key: str | None,
        fetch: Fetch = fetch_json,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.key = key
        self._fetch = fetch
        self._clock = clock
        self._cache: OrderedDict[LatLon, tuple[float, list[Town]]] = OrderedDict()
        self._lock = threading.Lock()

    def towns(self, point: LatLon) -> list[Town]:
        """The towns near `point`'s square, the nearest to its middle first."""
        if self.key is None:
            raise PlacesUnavailableError(NO_KEY)
        centre = (round(point[0], CELL_DECIMALS), round(point[1], CELL_DECIMALS))
        now = self._clock()
        with self._lock:
            kept = self._cache.get(centre)
            if kept is not None and now - kept[0] < CACHE_TTL_S:
                self._cache.move_to_end(centre)
                return kept[1]
        try:
            cities = self._ask(CITIES, centre, FAR_RADIUS_M)
            near = self._ask(TOWNS, centre, NEAR_RADIUS_M)
            near += [c for c in cities if haversine_m(centre, c.point) <= NEAR_RADIUS_M]
            chosen = choose(centre, near, [])
            if len(chosen) < MAX_NEARBY:
                far = cities + self._ask(TOWNS, centre, FAR_RADIUS_M)
                chosen = choose(centre, near, far)
        except Exception:
            # The URL carries the key: no message, no chain.
            raise PlacesUnavailableError(SERVICE_FAILED) from None
        with self._lock:
            self._cache[centre] = (now, chosen)
            while len(self._cache) > CACHE_SIZE:
                self._cache.popitem(last=False)
        return chosen

    def _ask(self, categories: str, centre: LatLon, radius_m: int) -> list[Town]:
        assert self.key is not None
        return parse_towns(
            self._fetch(nearby_url(self.key, categories, centre, radius_m))
        )

    def body(self, point: LatLon) -> NearbyCitiesBody:
        return NearbyCitiesBody(
            places=[
                NearbyCityBody(
                    label=town.label,
                    point=town.point,
                    away_m=round(haversine_m(point, town.point)),
                )
                for town in self.towns(point)
            ]
        )


def install_nearby_cities(
    app: FastAPI, nearby: NearbyCities, route_store: RouteStore | None = None
) -> None:
    """GET /nearby-cities; the towns' centres are cities' centres for
    `route_store`: their examples are kept once drawn (ADR-0136)."""
    app.include_router(nearby_city_routes(nearby, route_store))


def nearby_city_routes(
    nearby: NearbyCities, route_store: RouteStore | None = None
) -> APIRouter:
    router = APIRouter()

    @router.get("/nearby-cities", responses={503: {"model": ErrorBody}})
    def nearby_cities(
        lat: Annotated[float, Query(ge=-90, le=90)],
        lon: Annotated[float, Query(ge=-180, le=180)],
    ) -> NearbyCitiesBody:
        try:
            found = nearby.body((lat, lon))
        except PlacesUnavailableError as exc:
            raise HTTPException(503, str(exc)) from None
        if route_store is not None:
            route_store.learn(place.point for place in found.places)
        return found

    return router
