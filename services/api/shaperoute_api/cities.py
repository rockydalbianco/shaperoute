"""Cities of the whole world by name, for "Explore" (TASK-129, ADR-0099).

GET /cities asks Geoapify's geocoding for cities only, with the key of the
place search (places.py). Not its autocomplete: for a city that one gives
the middle of the municipality's area, which for Milan is in Baggio, 6 km
from the Duomo; the geocoding of a city gives the city's own point, its
centre. Answers are kept a day: city centres do not move.
"""

from __future__ import annotations

import threading
import time
import urllib.parse
from collections import OrderedDict
from collections.abc import Callable
from typing import Any

from shaperoute_api.places import (
    Fetch,
    PlaceBody,
    PlacesBody,
    PlacesUnavailableError,
    fetch_json,
)

GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search"
MAX_CITIES = 5
CACHE_SIZE = 500
CACHE_TTL_S = 24 * 3600.0

NO_KEY = "City search is off on this API."
SERVICE_FAILED = "The city search service did not answer; try again."


def cities_url(key: str, query: str) -> str:
    params = {
        "text": query.strip(),
        "type": "city",
        "limit": str(MAX_CITIES),
        "format": "json",
        "apiKey": key,
    }
    return f"{GEOCODE_URL}?{urllib.parse.urlencode(params)}"


def city_label(result: dict[str, Any]) -> str | None:
    """The city, its region, its country: "Milan, Lombardy, Italy"."""
    name = result.get("city") or result.get("name")
    if not isinstance(name, str) or not name.strip():
        return None
    parts = [name.strip()]
    for key in ("state", "country"):
        value = result.get(key)
        if isinstance(value, str) and value.strip() and value.strip() not in parts:
            parts.append(value.strip())
    return ", ".join(parts)


def parse_cities(body: Any) -> list[PlaceBody]:
    results = body.get("results") if isinstance(body, dict) else None
    cities: list[PlaceBody] = []
    labels: set[str] = set()
    for result in results if isinstance(results, list) else []:
        if not isinstance(result, dict):
            continue
        lat, lon = result.get("lat"), result.get("lon")
        if not all(
            isinstance(v, int | float) and not isinstance(v, bool) for v in (lat, lon)
        ):
            continue
        label = city_label(result)
        if label is None or label in labels:
            continue
        labels.add(label)
        cities.append(PlaceBody(label=label, point=(float(lat), float(lon))))
    return cities


class CitySearch:
    def __init__(
        self,
        key: str | None,
        fetch: Fetch = fetch_json,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.key = key
        self._fetch = fetch
        self._clock = clock
        self._cache: OrderedDict[str, tuple[float, list[PlaceBody]]] = OrderedDict()
        self._lock = threading.Lock()

    def search(self, query: str) -> list[PlaceBody]:
        if self.key is None:
            raise PlacesUnavailableError(NO_KEY)
        text = " ".join(query.split()).lower()
        now = self._clock()
        with self._lock:
            kept = self._cache.get(text)
            if kept is not None and now - kept[0] < CACHE_TTL_S:
                self._cache.move_to_end(text)
                return kept[1]
        try:
            body = self._fetch(cities_url(self.key, query))
        except Exception:
            # The URL carries the key: no message, no chain.
            raise PlacesUnavailableError(SERVICE_FAILED) from None
        cities = parse_cities(body)
        with self._lock:
            self._cache[text] = (now, cities)
            while len(self._cache) > CACHE_SIZE:
                self._cache.popitem(last=False)
        return cities

    def body(self, query: str) -> PlacesBody:
        return PlacesBody(places=self.search(query))
