"""The weather of a ski resort from MET Norway (TASK-406 part B, ADR-0338):
the next 24 hours and their fresh snow, estimated; kept until MET Norway's
Expires and asked again with If-Modified-Since; the resort's position at 4
decimals with its altitude; an old answer when MET Norway does not answer.
No network: the transport is a fake, or urlopen is."""

from __future__ import annotations

import io
import json
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from email.message import Message
from pathlib import Path
from typing import Any

import pytest

from shaperoute_api import resort_weather
from shaperoute_api.resort_weather import (
    MAX_KEEP,
    TIMEOUT_S,
    USER_AGENT,
    Answer,
    MetTransport,
    ResortWeather,
    WeatherUnavailable,
    forecast_of,
    series_of,
)

COMPACT = Path(__file__).parent / "fixtures" / "ski" / "met_compact.json"
NOON = datetime(2026, 11, 6, 12, 20, tzinfo=UTC)


def compact() -> Any:
    return json.loads(COMPACT.read_text(encoding="utf-8"))


@dataclass
class Clock:
    at: datetime = NOON

    def __call__(self) -> datetime:
        return self.at


@dataclass
class FakeMet:
    """MET Norway without the network: answers in turn, and what was asked."""

    answers: list[Answer | WeatherUnavailable] = field(default_factory=list)
    asked: list[tuple[float, float, int | None, str | None]] = field(
        default_factory=list
    )

    def get(
        self,
        lat: float,
        lon: float,
        altitude_m: int | None,
        if_modified_since: str | None,
    ) -> Answer:
        self.asked.append((lat, lon, altitude_m, if_modified_since))
        answer = self.answers.pop(0) if self.answers else fresh()
        if isinstance(answer, WeatherUnavailable):
            raise answer
        return answer


def fresh(expires: datetime | None = NOON + timedelta(minutes=30)) -> Answer:
    return Answer(True, compact(), expires, "Fri, 06 Nov 2026 11:31:07 GMT")


def test_the_next_24_hours_from_the_one_now_in() -> None:
    forecast = forecast_of(series_of(compact()), 2500, NOON)
    assert len(forecast.hours) == 24
    assert forecast.hours[0].time == datetime(2026, 11, 6, 12, tzinfo=UTC)
    assert forecast.hours[-1].time == datetime(2026, 11, 7, 11, tzinfo=UTC)
    assert forecast.updated_at == datetime(2026, 11, 6, 11, 31, 7, tzinfo=UTC)
    first = forecast.hours[0]
    assert (first.temperature_c, first.wind_ms, first.symbol) == (2.0, 3.0, "cloudy")
    assert first.precipitation_mm == 0.0
    assert forecast.altitude_m == 2500


def test_the_fresh_snow_is_the_precipitation_at_or_below_half_a_degree() -> None:
    # 16:00 and 17:00 rain at 1.0 and 0.75 °C; from 18:00 (0.5 °C) to
    # 03:00, ten hours of 0.5 mm: 5 cm. The heavy snow from 12:00 the next
    # day is after the 24 hours.
    assert forecast_of(series_of(compact()), None, NOON).fresh_snow_cm == 5.0
    # Two hours later, the first two hours of it come in: 7 cm.
    later = forecast_of(series_of(compact()), None, NOON + timedelta(hours=2))
    assert later.hours[0].time == datetime(2026, 11, 6, 14, tzinfo=UTC)
    assert later.fresh_snow_cm == 7.0


def test_only_the_steps_of_one_hour_are_read() -> None:
    # The two steps of six hours at the end are left out.
    assert len(series_of(compact()).hours) == 30


def test_an_answer_without_a_timeseries_is_unavailable() -> None:
    for body in ({}, [], {"properties": {"timeseries": None}}, "x"):
        with pytest.raises(WeatherUnavailable):
            series_of(body)


def test_kept_until_it_expires_then_asked_again_if_modified() -> None:
    clock = Clock()
    met = FakeMet([fresh(), Answer(False, None, NOON + timedelta(minutes=70), None)])
    weather = ResortWeather(met, now=clock)
    first, stale = weather.forecasts(46.55, 11.75, [2500])
    assert not stale and first[0].fresh_snow_cm == 5.0
    clock.at = NOON + timedelta(minutes=29)
    weather.forecasts(46.55, 11.75, [2500])
    assert len(met.asked) == 1
    clock.at = NOON + timedelta(minutes=31)
    again, stale = weather.forecasts(46.55, 11.75, [2500])
    assert met.asked[1] == (46.55, 11.75, 2500, "Fri, 06 Nov 2026 11:31:07 GMT")
    assert not stale and again[0].hours == first[0].hours
    # The 304 gave a new Expires: kept until then.
    clock.at = NOON + timedelta(minutes=69)
    weather.forecasts(46.55, 11.75, [2500])
    assert len(met.asked) == 2


def test_the_key_is_the_position_at_4_decimals_and_the_altitude() -> None:
    met = FakeMet()
    weather = ResortWeather(met, now=Clock())
    weather.forecasts(46.5500004, 11.7499996, [1200, 2500])
    weather.forecasts(46.55, 11.75, [1200, 2500])
    assert met.asked == [
        (46.55, 11.75, 1200, None),
        (46.55, 11.75, 2500, None),
    ]
    weather.forecasts(46.5501, 11.75, [2500])
    assert len(met.asked) == 3


def test_an_old_answer_when_met_norway_does_not_answer() -> None:
    clock = Clock()
    met = FakeMet([fresh(), WeatherUnavailable("timed out")])
    weather = ResortWeather(met, now=clock)
    weather.forecasts(46.55, 11.75, [2500])
    clock.at = NOON + timedelta(hours=1)
    kept, stale = weather.forecasts(46.55, 11.75, [2500])
    assert stale
    # The hours still start from the one now in.
    assert kept[0].hours[0].time == datetime(2026, 11, 6, 13, tzinfo=UTC)


def test_nothing_kept_and_no_answer_is_unavailable() -> None:
    weather = ResortWeather(FakeMet([WeatherUnavailable("503")]), now=Clock())
    with pytest.raises(WeatherUnavailable):
        weather.forecasts(46.55, 11.75, [2500])
    not_modified = FakeMet([Answer(False, None, None, None)])
    with pytest.raises(WeatherUnavailable):
        ResortWeather(not_modified, now=Clock()).forecasts(46.55, 11.75, [2500])


def test_without_expires_half_an_hour_and_never_more_than_max_keep() -> None:
    clock = Clock()
    met = FakeMet([fresh(expires=None), fresh(expires=NOON + timedelta(days=3))])
    weather = ResortWeather(met, now=clock)
    weather.forecasts(46.55, 11.75, [None])
    clock.at = NOON + timedelta(minutes=29)
    weather.forecasts(46.55, 11.75, [None])
    assert len(met.asked) == 1
    clock.at = NOON + timedelta(minutes=30)
    weather.forecasts(46.55, 11.75, [None])
    assert len(met.asked) == 2
    clock.at += MAX_KEEP
    weather.forecasts(46.55, 11.75, [None])
    assert len(met.asked) == 3


class _Response(io.BytesIO):
    def __init__(self, body: bytes, headers: dict[str, str]) -> None:
        super().__init__(body)
        self.headers = Message()
        for key, value in headers.items():
            self.headers[key] = value

    def __enter__(self) -> _Response:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()


def test_the_request_says_who_asks_and_waits_a_few_seconds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sent: list[tuple[urllib.request.Request, float]] = []

    def urlopen(request: urllib.request.Request, timeout: float) -> _Response:
        sent.append((request, timeout))
        return _Response(
            COMPACT.read_bytes(),
            {
                "Expires": "Fri, 06 Nov 2026 12:50:00 GMT",
                "Last-Modified": "Fri, 06 Nov 2026 11:31:07 GMT",
            },
        )

    monkeypatch.setattr(resort_weather.urllib.request, "urlopen", urlopen)
    monkeypatch.delenv(resort_weather.CONTACT_VARIABLE, raising=False)
    answer = MetTransport.from_env().get(46.55, 11.75, 2500, None)
    request, timeout = sent[0]
    assert request.full_url == (
        "https://api.met.no/weatherapi/locationforecast/2.0/compact"
        "?lat=46.5500&lon=11.7500&altitude=2500"
    )
    assert request.get_header("User-agent") == USER_AGENT
    assert request.get_header("If-modified-since") is None
    assert timeout == TIMEOUT_S <= 5
    assert answer.modified and answer.body == compact()
    assert answer.expires == datetime(2026, 11, 6, 12, 50, tzinfo=UTC)
    assert answer.last_modified == "Fri, 06 Nov 2026 11:31:07 GMT"

    monkeypatch.setenv(resort_weather.CONTACT_VARIABLE, " ops@example.test ")
    MetTransport.from_env().get(46.5, 11.0, None, "Fri, 06 Nov 2026 11:31:07 GMT")
    request, _ = sent[1]
    assert request.full_url.endswith("?lat=46.5000&lon=11.0000")
    assert request.get_header("User-agent") == f"{USER_AGENT} ops@example.test"
    assert request.get_header("If-modified-since") == "Fri, 06 Nov 2026 11:31:07 GMT"


def _http_error(code: int, headers: dict[str, str]) -> urllib.error.HTTPError:
    message = Message()
    for key, value in headers.items():
        message[key] = value
    return urllib.error.HTTPError(resort_weather.API_URL, code, "status", message, None)


def test_not_modified_and_errors_of_the_transport(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    raised: list[Exception] = [
        _http_error(304, {"Expires": "Fri, 06 Nov 2026 13:00:00 GMT"}),
        _http_error(429, {}),
        TimeoutError("timed out"),
    ]

    def urlopen(request: urllib.request.Request, timeout: float) -> _Response:
        raise raised.pop(0)

    monkeypatch.setattr(resort_weather.urllib.request, "urlopen", urlopen)
    met = MetTransport()
    since = "Fri, 06 Nov 2026 11:31:07 GMT"
    answer = met.get(46.55, 11.75, 2500, since)
    assert not answer.modified and answer.last_modified == since
    assert answer.expires == datetime(2026, 11, 6, 13, tzinfo=UTC)
    with pytest.raises(WeatherUnavailable, match="429"):
        met.get(46.55, 11.75, 2500, None)
    with pytest.raises(WeatherUnavailable, match="did not answer"):
        met.get(46.55, 11.75, 2500, None)
