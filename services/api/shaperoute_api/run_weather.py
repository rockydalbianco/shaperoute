"""The weather of a run for the page of its post (TASK-410 part E, ADR-0340,
docs/API.md, «Run stats»).

MET Norway has no archive: its Locationforecast gives the hours from the one
now in, never the past ones. So the weather of a run is asked once, when the
phone sends its figures (PUT /me/activities/{key}/stats, which it does right
after the run is saved), and only when that comes within WITHIN of the run's
end: the hour of MET Norway nearest to the end, at most WITHIN from it. A run
imported from a file, written by hand, or reaching the server later has
none, and none is asked again later (the user's choice E3 of TASK-410).

What goes to MET Norway, as the «Privacy» says (choice E5): the run's first
point rounded to DECIMALS (about 1 km), without its altitude, never a name.
A day on the snow is left out (ON_SNOW): for the snow the «Privacy» promises
that MET Norway gets the resort's position, never the user's. A run without
a track (the gym, a pool) has no point to ask with.

The same transport and cache as the ski resorts' weather (resort_weather.py:
the User-Agent, the contact, the short timeout). It is asked after the
answer to the PUT, out of its transaction: a slow MET Norway never holds the
phone, and one that does not answer leaves the run without weather. Only the
server started by __main__ asks (install_run_weather): an app made by
create_app, as in the tests, never goes to the network.

`stats.weather`: the temperature, MET Norway's symbol and the wind of that
hour. Everyone who sees the run's drawing sees it: it says nothing of the
body.
"""

from __future__ import annotations

import logging
from collections.abc import Callable, Sequence
from datetime import datetime, timedelta

from fastapi import FastAPI, Request
from psycopg.types.json import Jsonb
from pydantic import BaseModel
from route_engine.track_score import TrackPoint

from shaperoute_api.activities import MUW
from shaperoute_api.db import Database
from shaperoute_api.personal_bests_backfill import kept_track
from shaperoute_api.resort_weather import (
    Hour,
    MetTransport,
    ResortWeather,
    WeatherUnavailable,
)

log = logging.getLogger(__name__)

# The run's end and the hour asked: no further apart than this (choice 4 of
# TASK-410, «Sì, MET entro 3 ore»).
WITHIN = timedelta(hours=3)
# The first point, rounded to about 1 km.
DECIMALS = 2
# A day on the snow asks MET Norway with the resort, never with the user.
ON_SNOW = frozenset({"skiing", "xc_skiing", "ski_touring", "snowshoeing"})
# Bounds of a reading kept: beyond them MET Norway's answer is not read.
MIN_TEMPERATURE_C = -90.0
MAX_TEMPERATURE_C = 60.0
MAX_WIND_MS = 120.0
MAX_SYMBOL = 64


class WeatherBody(BaseModel):
    """The weather of the hour of a run's end, from MET Norway."""

    temperature_c: float
    """The air, to the tenth."""
    symbol: str | None = None
    """MET Norway's symbol_code ("clearsky_day", "lightrain"…)."""
    wind_ms: float | None = None
    """The wind, metres a second, to the tenth."""


def place_of(track: Sequence[TrackPoint]) -> tuple[float, float]:
    """The run's first point, rounded to about 1 km."""
    first = track[0]
    return round(first.lat, DECIMALS), round(first.lon, DECIMALS)


def end_of(track: Sequence[TrackPoint], started_at: datetime) -> datetime | None:
    """When the run ended: its last kept point. `runs.track` keeps M as the
    seconds from its first point, which is `started_at`."""
    first, last = track[0].time_s, track[-1].time_s
    if first is None or last is None:
        return None
    return started_at + timedelta(seconds=last - first)


def hour_of(hours: Sequence[Hour], end: datetime) -> Hour | None:
    """The hour that holds `end` or, MET Norway giving no past hours, the
    one nearest to it, when it is within WITHIN."""
    best: Hour | None = None
    best_gap = WITHIN
    for hour in hours:
        if hour.time <= end < hour.time + timedelta(hours=1):
            return hour
        gap = abs(hour.time - end)
        if gap <= best_gap:
            best, best_gap = hour, gap
    return best


def weather_of(hour: Hour) -> WeatherBody | None:
    """What the post keeps of an hour; none without a temperature to show."""
    t = hour.temperature_c
    if t is None or not MIN_TEMPERATURE_C <= t <= MAX_TEMPERATURE_C:
        return None
    wind = hour.wind_ms
    if wind is not None and not 0 <= wind <= MAX_WIND_MS:
        wind = None
    symbol = hour.symbol if hour.symbol and len(hour.symbol) <= MAX_SYMBOL else None
    return WeatherBody(
        temperature_c=round(t, 1),
        symbol=symbol,
        wind_ms=None if wind is None else round(wind, 1),
    )


def asks(activity: str, source: str, has_track: bool) -> bool:
    """Whether a run of this kind ever has weather."""
    return source == MUW and has_track and activity not in ON_SNOW


def add_weather(
    database: Database,
    now: Callable[[], datetime],
    weather: ResortWeather,
    user_id: int,
    key: str,
) -> WeatherBody | None:
    """Asks MET Norway for the weather of the run `key` of `user_id` and
    keeps it in its stats, when the run may have it and has none yet. The
    weather kept, or none."""
    with database.connect() as conn:
        run = conn.execute(
            "SELECT r.id, r.activity, r.source, r.pauses, r.started_at,"
            " ST_AsText(r.track) AS track, s.stats ? 'weather' AS has_weather"
            " FROM runs r JOIN run_stats s ON s.run_id = r.id"
            " WHERE r.user_id = %s AND r.key = %s",
            (user_id, key),
        ).fetchone()
    if run is None or run["has_weather"]:
        return None
    if not asks(run["activity"], run["source"], run["track"] is not None):
        return None
    track, _ = kept_track(run)
    end = end_of(track, run["started_at"]) if track else None
    if end is None or not end - WITHIN <= now() <= end + WITHIN:
        return None
    lat, lon = place_of(track)
    kept: WeatherBody | None = None
    try:
        forecasts, _ = weather.forecasts(lat, lon, [None])
        # The hours from the one now in: the end is in it, or up to WITHIN
        # behind.
        hour = hour_of(forecasts[0].hours, end) if forecasts else None
        kept = None if hour is None else weather_of(hour)
    except WeatherUnavailable as exc:
        log.info("MET Norway: %s; the run has no weather", exc)
    # Asked once: without an answer the run keeps `weather: null`, and is
    # never asked again.
    found = None if kept is None else kept.model_dump(mode="json")
    with database.connect() as conn:
        conn.execute(
            "UPDATE run_stats SET stats = stats || %s"
            " WHERE run_id = %s AND NOT stats ? 'weather'",
            (Jsonb({"weather": found}), run["id"]),
        )
    return kept


def weather_of_app(request: Request) -> ResortWeather | None:
    """The MET Norway of the server, or none (an app of the tests)."""
    found = getattr(request.app.state, "run_weather", None)
    return found if isinstance(found, ResortWeather) else None


def install_run_weather(app: FastAPI, weather: ResortWeather | None = None) -> None:
    """The weather of the runs; `weather`: MET Norway's, unless a test gives
    a fake. Without this call no run is given weather."""
    app.state.run_weather = weather or ResortWeather(MetTransport.from_env())
