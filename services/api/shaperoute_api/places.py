"""Places for the start, suggested while typing (TASK-123, ADR-0095).

GET /places asks Geoapify's autocomplete, OpenStreetMap data, with a key the
app never sees: GEOAPIFY_API_KEY in the API's environment. Without the key
the API answers 503 and the app asks Photon itself, as before (ADR-0029).
Answers are kept in memory for a while: the same letters typed again, or
"Search" after a suggestion, cost nothing and wait for nothing.

The only place that names the service: change it here.
"""

from __future__ import annotations

import json
import os
import threading
import time
import urllib.parse
import urllib.request
from collections import OrderedDict
from collections.abc import Callable, Mapping
from typing import Any

from pydantic import BaseModel

KEY_VARIABLE = "GEOAPIFY_API_KEY"
AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete"
MAX_PLACES = 5
MIN_QUERY_LENGTH = 1
MAX_QUERY_LENGTH = 200
TIMEOUT_S = 8.0
# A morning of typing fits; an hour later the same words ask again.
CACHE_SIZE = 500
CACHE_TTL_S = 3600.0
# Places "near" the same point within ~1 km share an answer.
NEAR_DECIMALS = 2

NO_KEY = f"Place search is off: {KEY_VARIABLE} is not set on the API."
SERVICE_FAILED = "The place search service did not answer; try again."

Fetch = Callable[[str], Any]
"""Gets a URL and returns its JSON; raises on any failure."""


class PlaceBody(BaseModel):
    """What the user reads, e.g. "Via Rodolfo Belenzani, Trento"."""

    label: str
    point: tuple[float, float]
    """(lat, lon)."""


class PlacesBody(BaseModel):
    """The answer of GET /places: packages/shared-types/fixtures/places.json."""

    places: list[PlaceBody]


class PlacesUnavailableError(Exception):
    """No key, or the service failed: the app falls back to Photon."""


def fetch_json(url: str) -> Any:
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:
        return json.load(response)


def autocomplete_url(
    key: str, query: str, near: tuple[float, float] | None = None
) -> str:
    """With `near`, places around it come first (as Photon's lat/lon)."""
    params = {
        "text": query.strip(),
        "limit": str(MAX_PLACES),
        "format": "json",
        "apiKey": key,
    }
    if near is not None:
        params["bias"] = f"proximity:{near[1]},{near[0]}"
    return f"{AUTOCOMPLETE_URL}?{urllib.parse.urlencode(params)}"


def place_label(result: Mapping[str, Any]) -> str | None:
    """The name, then the first wider area that differs from it: the same
    labels the app makes from Photon (apps/mobile/src/places/photon.ts)."""

    def text(key: str) -> str | None:
        value = result.get(key)
        return value.strip() if isinstance(value, str) and value.strip() else None

    address = " ".join(
        part for part in (text("street"), text("housenumber")) if part is not None
    )
    name = text("name") or address or None
    if name is None:
        return None
    for key in ("city", "county", "state", "country"):
        area = text(key)
        if area is not None and area != name:
            return f"{name}, {area}"
    return name


def parse_autocomplete(body: Any) -> list[PlaceBody]:
    """Results without a name or a point are skipped, and so are repeated
    labels."""
    results = body.get("results") if isinstance(body, dict) else None
    places: list[PlaceBody] = []
    labels: set[str] = set()
    for result in results if isinstance(results, list) else []:
        if not isinstance(result, dict):
            continue
        lat, lon = result.get("lat"), result.get("lon")
        if not all(
            isinstance(value, int | float) and not isinstance(value, bool)
            for value in (lat, lon)
        ):
            continue
        label = place_label(result)
        if label is None or label in labels:
            continue
        labels.add(label)
        places.append(PlaceBody(label=label, point=(float(lat), float(lon))))
    return places


class PlaceSearch:
    """Geoapify behind a small cache. `key` None: every search is
    PlacesUnavailableError."""

    def __init__(
        self,
        key: str | None,
        fetch: Fetch = fetch_json,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.key = key
        self._fetch = fetch
        self._clock = clock
        self._cache: OrderedDict[tuple[object, ...], tuple[float, list[PlaceBody]]] = (
            OrderedDict()
        )
        self._lock = threading.Lock()

    @classmethod
    def from_env(cls, environ: Mapping[str, str] = os.environ) -> PlaceSearch:
        return cls(environ.get(KEY_VARIABLE, "").strip() or None)

    def search(
        self, query: str, near: tuple[float, float] | None = None
    ) -> list[PlaceBody]:
        if self.key is None:
            raise PlacesUnavailableError(NO_KEY)
        text = " ".join(query.split()).lower()
        where = (
            None
            if near is None
            else (round(near[0], NEAR_DECIMALS), round(near[1], NEAR_DECIMALS))
        )
        cache_key = (text, where)
        now = self._clock()
        with self._lock:
            kept = self._cache.get(cache_key)
            if kept is not None and now - kept[0] < CACHE_TTL_S:
                self._cache.move_to_end(cache_key)
                return kept[1]
        try:
            body = self._fetch(autocomplete_url(self.key, query, where))
        except Exception:
            # The URL carries the key: neither the message nor the chain
            # (`from None`) may bring it to a log.
            raise PlacesUnavailableError(SERVICE_FAILED) from None
        places = parse_autocomplete(body)
        with self._lock:
            self._cache[cache_key] = (now, places)
            self._cache.move_to_end(cache_key)
            while len(self._cache) > CACHE_SIZE:
                self._cache.popitem(last=False)
        return places
