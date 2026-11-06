"""The weather of a ski resort from MET Norway (TASK-406 part B, ADR-0338).

MET Norway's Locationforecast 2.0 (api.met.no), compact: open data under
CC BY 4.0, free for a commercial app, credited «MET Norway» (the app shows
it, `ATTRIBUTION`). Their terms, kept here:

- the **server** asks, never the phone, saying who it is: `USER_AGENT`, plus
  a contact from SHAPEROUTE_MET_CONTACT when the server has one;
- the position is the **resort's** centre, at most 4 decimals, never the
  user's; the altitude (whole metres) goes with it, so the temperature is
  the one up there and not the model's terrain;
- an answer is kept until its `Expires`, then asked again with
  `If-Modified-Since`: one call per resort and altitude every half hour or
  so, whoever looks.

The fresh snow is an **estimate**, not a snow report: the precipitation of
the hours at or below `SNOW_AT_OR_BELOW_C`, 1 mm of water for 1 cm of snow.
When MET Norway does not answer within `TIMEOUT_S`, the last answer kept is
given as stale; without one, WeatherUnavailable. In the tests the transport
is a fake: no network, the same answers every time.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from typing import Any, Protocol
from urllib.parse import urlencode

log = logging.getLogger(__name__)

API_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
CONTACT_VARIABLE = "SHAPEROUTE_MET_CONTACT"
USER_AGENT = "MuW/1.0 (https://getmuw.app)"
ATTRIBUTION = "MET Norway"
# Short: a slow answer must not hold the API's worker.
TIMEOUT_S = 4.0
# MET Norway refuses positions with more decimals.
DECIMALS = 4
HOURS = 24
SNOW_AT_OR_BELOW_C = 0.5
CM_OF_SNOW_PER_MM = 1.0
# An answer without Expires, or with a strange one, is kept within these.
DEFAULT_KEEP = timedelta(minutes=30)
MIN_KEEP = timedelta(minutes=1)
MAX_KEEP = timedelta(hours=6)
# Places and altitudes kept, at most; the oldest asked go first.
MAX_CACHED = 4000
MAX_BODY_BYTES = 2_000_000


class WeatherUnavailable(RuntimeError):
    """MET Norway did not answer, or not in a way that can be read."""


@dataclass(frozen=True)
class Answer:
    """What MET Norway answered: 200 with a body, or 304 (not modified)."""

    modified: bool
    body: Any
    expires: datetime | None
    last_modified: str | None


class Transport(Protocol):
    def get(
        self,
        lat: float,
        lon: float,
        altitude_m: int | None,
        if_modified_since: str | None,
    ) -> Answer:
        """The compact forecast of one place; WeatherUnavailable if none."""
        ...


class MetTransport:
    """api.met.no over urllib, with the User-Agent and a short timeout."""

    def __init__(self, contact: str | None = None) -> None:
        contact = (contact or "").strip()
        self.user_agent = f"{USER_AGENT} {contact}" if contact else USER_AGENT

    @classmethod
    def from_env(cls) -> MetTransport:
        return cls(os.environ.get(CONTACT_VARIABLE))

    def get(
        self,
        lat: float,
        lon: float,
        altitude_m: int | None,
        if_modified_since: str | None,
    ) -> Answer:
        params: dict[str, str] = {
            "lat": f"{lat:.{DECIMALS}f}",
            "lon": f"{lon:.{DECIMALS}f}",
        }
        if altitude_m is not None:
            params["altitude"] = str(altitude_m)
        headers = {"User-Agent": self.user_agent, "Accept": "application/json"}
        if if_modified_since:
            headers["If-Modified-Since"] = if_modified_since
        request = urllib.request.Request(
            f"{API_URL}?{urlencode(params)}", headers=headers
        )
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:
                data = response.read(MAX_BODY_BYTES + 1)
                expires = response.headers.get("Expires")
                last_modified = response.headers.get("Last-Modified")
        except urllib.error.HTTPError as exc:
            if exc.code == 304:
                return Answer(
                    False,
                    None,
                    _http_date(exc.headers.get("Expires")),
                    exc.headers.get("Last-Modified") or if_modified_since,
                )
            raise WeatherUnavailable(f"MET Norway answered {exc.code}") from exc
        except (OSError, ValueError) as exc:
            raise WeatherUnavailable(f"MET Norway did not answer: {exc}") from exc
        if len(data) > MAX_BODY_BYTES:
            raise WeatherUnavailable("MET Norway's answer is too large")
        try:
            body = json.loads(data)
        except ValueError as exc:
            raise WeatherUnavailable("MET Norway's answer is not JSON") from exc
        return Answer(True, body, _http_date(expires), last_modified)


def _http_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    return when if when.tzinfo else when.replace(tzinfo=UTC)


@dataclass(frozen=True)
class Hour:
    """One hour of the forecast, from `time` to an hour later."""

    time: datetime
    temperature_c: float | None
    wind_ms: float | None
    symbol: str | None
    precipitation_mm: float | None


@dataclass(frozen=True)
class Series:
    """The hourly forecast of one place and altitude, as MET Norway gave it."""

    updated_at: datetime | None
    hours: tuple[Hour, ...]


@dataclass(frozen=True)
class Forecast:
    """The next HOURS hours of one altitude, from the hour now in."""

    altitude_m: int | None
    updated_at: datetime | None
    hours: list[Hour]
    fresh_snow_cm: float


def series_of(body: Any) -> Series:
    """The hours of a compact answer that have their own hour (the first two
    days or so; later MET Norway gives six hours at a time, left out)."""
    if not isinstance(body, Mapping):
        raise WeatherUnavailable("MET Norway's answer is not an object")
    props = body.get("properties")
    timeseries = props.get("timeseries") if isinstance(props, Mapping) else None
    if not isinstance(timeseries, list):
        raise WeatherUnavailable("MET Norway's answer has no timeseries")
    meta = props.get("meta") if isinstance(props, Mapping) else None
    updated = meta.get("updated_at") if isinstance(meta, Mapping) else None
    hours: list[Hour] = []
    for step in timeseries:
        hour = _hour(step)
        if hour is not None:
            hours.append(hour)
    return Series(_iso(updated), tuple(sorted(hours, key=lambda h: h.time)))


def _hour(step: object) -> Hour | None:
    if not isinstance(step, Mapping):
        return None
    when = _iso(step.get("time"))
    data = step.get("data")
    if when is None or not isinstance(data, Mapping):
        return None
    next_hour = data.get("next_1_hours")
    if not isinstance(next_hour, Mapping):
        return None
    instant = _details(data.get("instant"))
    summary = next_hour.get("summary")
    symbol = summary.get("symbol_code") if isinstance(summary, Mapping) else None
    return Hour(
        time=when,
        temperature_c=_number(instant.get("air_temperature")),
        wind_ms=_number(instant.get("wind_speed")),
        symbol=symbol if isinstance(symbol, str) else None,
        precipitation_mm=_number(_details(next_hour).get("precipitation_amount")),
    )


def _details(value: object) -> Mapping[str, Any]:
    details = value.get("details") if isinstance(value, Mapping) else None
    return details if isinstance(details, Mapping) else {}


def _number(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def _iso(value: object) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        when = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return when if when.tzinfo else when.replace(tzinfo=UTC)


def forecast_of(series: Series, altitude_m: int | None, now: datetime) -> Forecast:
    """The HOURS hours from the one `now` is in, and their fresh snow."""
    start = now - timedelta(hours=1)
    hours = [h for h in series.hours if h.time > start][:HOURS]
    snow_mm = sum(
        h.precipitation_mm
        for h in hours
        if h.precipitation_mm is not None
        and h.temperature_c is not None
        and h.temperature_c <= SNOW_AT_OR_BELOW_C
    )
    return Forecast(
        altitude_m=altitude_m,
        updated_at=series.updated_at,
        hours=hours,
        fresh_snow_cm=round(snow_mm * CM_OF_SNOW_PER_MM, 1),
    )


@dataclass
class _Kept:
    series: Series
    expires: datetime
    last_modified: str | None


Key = tuple[float, float, int | None]


class ResortWeather:
    """The forecasts asked of MET Norway, kept until they expire."""

    def __init__(
        self,
        transport: Transport,
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self.transport = transport
        self.now = now
        self._kept: dict[Key, _Kept] = {}
        self._lock = threading.Lock()

    def forecasts(
        self, lat: float, lon: float, altitudes: Sequence[int | None]
    ) -> tuple[list[Forecast], bool]:
        """The forecast of each altitude of one place, and whether one of
        them is an old answer kept because MET Norway did not answer."""
        lat, lon = round(lat, DECIMALS), round(lon, DECIMALS)
        now = self.now()
        out: list[Forecast] = []
        stale = False
        for altitude in altitudes:
            series, old = self._series((lat, lon, altitude), now)
            stale = stale or old
            out.append(forecast_of(series, altitude, now))
        return out, stale

    def _series(self, key: Key, now: datetime) -> tuple[Series, bool]:
        with self._lock:
            kept = self._kept.get(key)
        if kept is not None and now < kept.expires:
            return kept.series, False
        lat, lon, altitude = key
        try:
            answer = self.transport.get(
                lat, lon, altitude, kept.last_modified if kept else None
            )
            if answer.modified:
                series = series_of(answer.body)
            elif kept is not None:
                series = kept.series
            else:
                raise WeatherUnavailable("MET Norway answered 304 to a first ask")
        except WeatherUnavailable as exc:
            if kept is None:
                raise
            log.warning("MET Norway: %s; the last forecast kept is given", exc)
            return kept.series, True
        fresh = _Kept(series, _keep_until(answer.expires, now), answer.last_modified)
        with self._lock:
            self._kept.pop(key, None)
            self._kept[key] = fresh
            while len(self._kept) > MAX_CACHED:
                del self._kept[next(iter(self._kept))]
        return series, False


def _keep_until(expires: datetime | None, now: datetime) -> datetime:
    if expires is None:
        return now + DEFAULT_KEEP
    return min(max(expires, now + MIN_KEEP), now + MAX_KEEP)
