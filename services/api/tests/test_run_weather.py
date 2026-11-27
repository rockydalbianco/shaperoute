"""The weather of a run for the page of its post (TASK-410 part E,
ADR-0340): asked of MET Norway after the phone's figures, only for a run
recorded with MuW, off the snow, within three hours of its end; MET Norway
here is a fake, never the network."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from route_engine.track_score import TrackPoint
from test_drawings import (
    FAST_HASHER,
    KEY,
    WallClock,
    database,  # noqa: F401  (the fixtures of the drawings' tests)
    drawn,
    other,
    run,
    saved,
    signed_up,
)
from test_resort_weather import FakeMet

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.resort_weather import (
    Answer,
    Hour,
    ResortWeather,
    WeatherUnavailable,
)
from shaperoute_api.run_stats import RunStatsBody
from shaperoute_api.run_weather import (
    WITHIN,
    asks,
    end_of,
    hour_of,
    install_run_weather,
    place_of,
    weather_of,
)

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _end() -> datetime:
    """When the example run of My activities ends: its last fix."""
    last = run()["track"][-1]["time_ms"]
    return datetime.fromtimestamp(last / 1000, tz=UTC)


def at(hour: datetime, celsius: float = 14.2, wind: float = 3.44) -> Hour:
    return Hour(hour, celsius, wind, "partlycloudy_day", 0.0)


def compact(first: datetime, hours: int = 6) -> dict[str, Any]:
    """A compact answer of MET Norway, one hour a step from `first`, one
    degree warmer each hour."""
    steps = []
    for i in range(hours):
        when = first + timedelta(hours=i)
        steps.append(
            {
                "time": when.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "data": {
                    "instant": {
                        "details": {"air_temperature": 10.0 + i, "wind_speed": 3.44}
                    },
                    "next_1_hours": {
                        "summary": {"symbol_code": "partlycloudy_day"},
                        "details": {"precipitation_amount": 0.0},
                    },
                },
            }
        )
    return {"properties": {"meta": {"updated_at": None}, "timeseries": steps}}


def answer_from(first: datetime) -> Answer:
    return Answer(True, compact(first), first + timedelta(hours=1), None)


def this_hour(when: datetime) -> datetime:
    return when.replace(minute=0, second=0, microsecond=0)


# --- Without the database ---


def test_the_hour_that_holds_the_end_or_the_nearest_within_three() -> None:
    end = datetime(2026, 11, 26, 9, 40, tzinfo=UTC)
    nine, ten = this_hour(end), this_hour(end) + timedelta(hours=1)
    assert hour_of([at(nine), at(ten)], end) == at(nine)
    # MET Norway gives no past hours: the first it has, when near enough.
    assert hour_of([at(ten)], end) == at(ten)
    later = end + WITHIN + timedelta(minutes=1)
    assert hour_of([at(later)], end) is None
    assert hour_of([], end) is None


def test_what_the_post_keeps_of_an_hour() -> None:
    hour = at(datetime(2026, 11, 26, 9, tzinfo=UTC), celsius=-3.46, wind=5.06)
    kept = weather_of(hour)
    assert kept is not None
    assert kept.model_dump() == {
        "temperature_c": -3.5,
        "symbol": "partlycloudy_day",
        "wind_ms": 5.1,
    }
    # No temperature, nothing to show; a wind out of bounds is left out.
    assert weather_of(Hour(hour.time, None, 2.0, "fog", None)) is None
    assert weather_of(Hour(hour.time, 99.0, 2.0, "fog", None)) is None
    strange = weather_of(Hour(hour.time, 4.0, -1.0, None, None))
    assert strange is not None and (strange.wind_ms, strange.symbol) == (None, None)


def test_the_place_is_the_start_rounded_to_about_a_kilometre() -> None:
    track = [TrackPoint(46.06712, 11.12149, 10.0), TrackPoint(46.2, 11.3, 70.0)]
    assert place_of(track) == (46.07, 11.12)
    started = datetime(2026, 11, 26, 9, 0, tzinfo=UTC)
    assert end_of(track, started) == datetime(2026, 11, 26, 9, 1, tzinfo=UTC)
    assert end_of([TrackPoint(46.0, 11.0)], started) is None


def test_only_a_run_recorded_with_muw_off_the_snow_with_a_track() -> None:
    assert asks("running", "muw", True)
    assert asks("paragliding", "muw", True)
    for snow in ("skiing", "xc_skiing", "ski_touring", "snowshoeing"):
        assert not asks(snow, "muw", True)
    assert not asks("running", "file", True)
    assert not asks("gym", "manual", False)
    assert not asks("swimming", "muw", False)


def test_the_example_is_a_body() -> None:
    example = _load("run-stats-weather.json")
    assert RunStatsBody.model_validate(example).model_dump(exclude_none=True) == example


# --- In the database ---


def _app(
    database: Database, wall: WallClock, met: FakeMet | None  # noqa: F811
) -> TestClient:
    app = create_app(
        FileSource(Path("unused.graphml")),
        accounts=Accounts(database, now=wall, hasher=FAST_HASHER),
        run_places=PlaceNames(None),
    )
    if met is not None:
        install_run_weather(app, ResortWeather(met, now=wall))
    return TestClient(app)


def _stats(client: TestClient, me: Headers) -> Any:
    body = _load("run-stats-request.json")
    answer = client.put(f"/me/activities/{KEY}/stats", json=body, headers=me)
    assert answer.status_code == 200, answer.text
    return answer.json()


@pytest.fixture
def wall() -> WallClock:
    clock = WallClock()
    clock.t = _end() + timedelta(hours=1, minutes=10)
    return clock


def test_the_weather_of_the_end_after_the_figures(
    database: Database,  # noqa: F811
    wall: WallClock,
) -> None:
    # MET Norway's hours from the one now in, an hour after the end's.
    met = FakeMet([answer_from(this_hour(wall.t))])
    client = _app(database, wall, met)
    me, them = signed_up(client), other(client)
    saved(client, me)
    drawing_id = drawn(client, me)["id"]
    # The answer to the PUT comes first; the weather after it.
    assert _stats(client, me)["weather"] is None
    # The start, rounded, without an altitude.
    assert met.asked == [(46.07, 11.12, None, None)]
    expected = {"temperature_c": 10.0, "symbol": "partlycloudy_day", "wind_ms": 3.4}
    seen = client.get(f"/drawings/{drawing_id}", headers=them).json()["stats"]
    assert seen["weather"] == expected
    # Sent again, the figures keep it, and MET Norway is not asked again.
    assert _stats(client, me)["weather"] == expected
    assert len(met.asked) == 1


@pytest.mark.parametrize(
    "change",
    [
        "UPDATE runs SET activity = 'skiing'",
        "UPDATE runs SET source = 'file'",
    ],
)
def test_no_weather_on_the_snow_nor_for_an_imported_run(
    database: Database,  # noqa: F811
    wall: WallClock,
    change: str,
) -> None:
    met = FakeMet()
    client = _app(database, wall, met)
    me = signed_up(client)
    saved(client, me)
    with database.connect() as conn:
        conn.execute(change)
    _stats(client, me)
    assert _stats(client, me)["weather"] is None
    assert met.asked == []


def test_no_weather_more_than_three_hours_after_the_end(
    database: Database,  # noqa: F811
    wall: WallClock,
) -> None:
    wall.t = _end() + WITHIN + timedelta(minutes=1)
    met = FakeMet()
    client = _app(database, wall, met)
    me = signed_up(client)
    saved(client, me)
    _stats(client, me)
    assert _stats(client, me)["weather"] is None
    assert met.asked == []


def test_met_norway_silent_leaves_the_run_without_weather(
    database: Database,  # noqa: F811
    wall: WallClock,
) -> None:
    met = FakeMet([WeatherUnavailable("no answer")])
    client = _app(database, wall, met)
    me = signed_up(client)
    saved(client, me)
    assert _stats(client, me)["weather"] is None
    # Never asked again for that run, even with MET Norway back.
    assert _stats(client, me)["weather"] is None
    assert len(met.asked) == 1


def test_an_app_without_met_norway_never_asks(
    database: Database,  # noqa: F811
    wall: WallClock,
) -> None:
    client = _app(database, wall, None)
    me = signed_up(client)
    saved(client, me)
    assert _stats(client, me)["weather"] is None
