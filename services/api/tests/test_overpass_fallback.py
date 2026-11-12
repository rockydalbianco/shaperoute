"""One attempt on a second Overpass service when the usual one answers with
an error (TASK-471, ADR-0385): off unless the server sets it, once, only
after an HTTP error or a failed connection, never for the batch downloads.
No network: the downloads here are counted and fail as OSMnx's do."""

from __future__ import annotations

import urllib.error
from email.message import Message
from pathlib import Path

import osmnx as ox
import pytest
import requests
from osmnx._errors import InsufficientResponseError, ResponseStatusCodeError
from route_engine.geo import LatLon
from route_engine.network import BBox

from shaperoute_api.overpass_fallback import (
    FALLBACK_VARIABLE,
    USER_AGENT,
    answered_with_an_error,
    fallback_url,
    with_second_service,
)
from shaperoute_api.prefetch_zones import prefetch

SECOND = "https://overpass.example/api"
SET = {FALLBACK_VARIABLE: SECOND}
BAD_GATEWAY = ResponseStatusCodeError("'overpass-api.de' responded: 502 Bad Gateway")
UNREACHABLE = requests.exceptions.ConnectionError("connection refused")
# As the engine's own request for the water and the snow fails (urllib).
WATER_BAD_GATEWAY = urllib.error.HTTPError(
    "https://overpass-api.de/api/interpreter", 502, "Bad Gateway", Message(), None
)
WATER_UNREACHABLE = urllib.error.URLError(ConnectionRefusedError("refused"))


class Download:
    """A zone's download: fails with each of `failures` in turn, then gives
    "zone"; notes whom OSMnx would have asked, and as whom, each time."""

    def __init__(self, *failures: Exception) -> None:
        self.failures = list(failures)
        self.asked: list[tuple[str, str]] = []

    def __call__(self) -> str:
        self.asked.append((ox.settings.overpass_url, ox.settings.http_user_agent))
        if self.failures:
            raise self.failures.pop(0)
        return "zone"


@pytest.mark.parametrize(
    ("value", "url"),
    [
        (None, None),
        ("", None),
        ("  ", None),
        ("off", None),
        ("OFF", None),
        (SECOND, SECOND),
        (f" {SECOND}/ ", SECOND),
    ],
)
def test_the_second_service_is_the_variable_or_none(
    value: str | None, url: str | None
) -> None:
    environ = {} if value is None else {FALLBACK_VARIABLE: value}
    assert fallback_url(environ) == url


def test_the_variable_is_read_from_the_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv(FALLBACK_VARIABLE, raising=False)
    assert fallback_url() is None
    monkeypatch.setenv(FALLBACK_VARIABLE, SECOND)
    assert fallback_url() == SECOND


@pytest.mark.parametrize("environ", [{}, {FALLBACK_VARIABLE: "off"}])
def test_with_none_set_a_download_is_tried_once(environ: dict[str, str]) -> None:
    download = Download(BAD_GATEWAY)
    with pytest.raises(ResponseStatusCodeError):
        with_second_service(download, environ)
    assert len(download.asked) == 1


@pytest.mark.parametrize(
    "failure",
    [BAD_GATEWAY, UNREACHABLE, WATER_BAD_GATEWAY, WATER_UNREACHABLE],
    ids=["502", "unreachable", "502 by urllib", "unreachable by urllib"],
)
def test_an_error_of_overpass_is_tried_once_on_the_second_service(
    failure: Exception,
) -> None:
    usual = ox.settings.overpass_url, ox.settings.http_user_agent
    download = Download(failure)
    assert with_second_service(download, SET) == "zone"
    # The usual service as usual, then the second as it asks to be asked.
    assert download.asked == [usual, (SECOND, USER_AGENT)]
    assert "MuW" in USER_AGENT and "https://getmuw.app" in USER_AGENT
    # Afterwards OSMnx asks the usual service again.
    assert (ox.settings.overpass_url, ox.settings.http_user_agent) == usual


def test_the_second_service_is_tried_once_not_in_a_loop() -> None:
    usual = ox.settings.overpass_url
    second = ResponseStatusCodeError("'overpass.example' responded: 502")
    download = Download(BAD_GATEWAY, second, BAD_GATEWAY)
    with pytest.raises(ResponseStatusCodeError) as raised:
        with_second_service(download, SET)
    assert raised.value is second
    assert len(download.asked) == 2
    assert ox.settings.overpass_url == usual


@pytest.mark.parametrize(
    "failure",
    [
        requests.exceptions.ReadTimeout("180 s"),
        requests.exceptions.ConnectTimeout("180 s"),
        TimeoutError("the read operation timed out"),
        urllib.error.URLError(TimeoutError("timed out")),
        InsufficientResponseError("no data elements in server response"),
        RuntimeError("no roads in this area"),
        OSError("no space left on device"),
    ],
    ids=[
        "read timeout",
        "connect timeout",
        "timeout by urllib",
        "connect timeout by urllib",
        "no data",
        "no roads",
        "disk",
    ],
)
def test_anything_else_is_not_tried_again(failure: Exception) -> None:
    """A timeout: Overpass was slow, and the user has waited minutes
    already. The rest is not Overpass saying no."""
    assert answered_with_an_error(failure) is False
    download = Download(failure)
    with pytest.raises(type(failure)):
        with_second_service(download, SET)
    assert len(download.asked) == 1


def test_a_download_that_succeeds_asks_nobody_else() -> None:
    download = Download()
    assert with_second_service(download, SET) == "zone"
    assert len(download.asked) == 1


class BatchSource:
    """OsmnxSource for prefetch_zones, without the network: Overpass
    answers every download with an error."""

    def __init__(self, cache_dir: Path) -> None:
        self.cache_dir = cache_dir
        self.asked: list[str] = []

    def cache_path(self, bbox: BBox) -> Path:
        return self.cache_dir / "foot_zone.graphml"

    def covering_path(self, bbox: BBox) -> Path | None:
        return None

    def load(self, bbox: BBox) -> object:
        self.asked.append(ox.settings.overpass_url)
        raise BAD_GATEWAY

    def named_roads(self, bbox: BBox, download: bool = True) -> object:
        return []


def test_the_batch_downloads_never_ask_the_second_service(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """prefetch_zones waits for the usual service (the user's choice for
    the batch work): with a second service set too, a city whose download
    fails is left missing after one attempt there."""
    monkeypatch.setenv(FALLBACK_VARIABLE, SECOND)
    usual = ox.settings.overpass_url
    source = BatchSource(tmp_path)

    def find(city: str) -> tuple[str, LatLon]:
        return city, (46.0671, 11.1214)

    outcomes = prefetch(
        ["Trento"],
        source,
        find,
        overpass_wait=lambda: 0.0,
        free_bytes=lambda: 10**12,
        street_names=False,
        sleep=lambda seconds: None,
    )
    assert [o.status for o in outcomes] == ["missing"]
    assert source.asked == [usual]
