"""The wait before a zone's download when Overpass's status says nothing
usable: five seconds for the API, not OSMnx's minute (TASK-471, ADR-0385).
OSMnx's own function is called, with no network: the status page is a
fake answer."""

from __future__ import annotations

import datetime as dt
import logging
import sys
import threading
from typing import Any

import osmnx._overpass as overpass
import pytest
import requests

from shaperoute_api.overpass_pause import (
    APP_PAUSE_S,
    PAUSE_FUNCTION,
    short_overpass_pause,
)

URL = "https://overpass.example/api"
# What overpass-api.de answered on 2026-11-12, to the status page too.
FULL = (
    "# 502 Gateway Timeout\n\n"
    "This Overpass API server is currently at capacity. All query workers "
    "are busy\nand the request queue is full.\n\n## What to do\n"
)
STATUS = (
    "Connected as: 1234567890\n"
    "Current time: 2026-11-12T12:51:00Z\n"
    "Announced endpoint: none\n"
    "Rate limit: 2\n"
    "{slots}\n"
    "Currently running queries (pid, space limit, time limit, start time):\n"
)
OSMNX_MINUTE_S = 60


class Page:
    def __init__(self, text: str) -> None:
        self.text = text


def status_is(monkeypatch: pytest.MonkeyPatch, answer: str | Exception) -> None:
    """Overpass's status page answers `answer`, or cannot be reached."""

    def get(url: str, **kwargs: Any) -> Page:
        assert url == f"{URL}/status"
        if isinstance(answer, Exception):
            raise answer
        return Page(answer)

    monkeypatch.setattr(overpass.requests, "get", get)


def osmnx_pause() -> float:
    """As OSMnx asks before a request: by the name in its module."""
    return float(getattr(overpass, PAUSE_FUNCTION)(URL))


def test_osmnx_still_waits_a_minute_by_itself(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """What this module is for: if OSMnx changes it, this says so."""
    status_is(monkeypatch, FULL)
    assert osmnx_pause() == OSMNX_MINUTE_S


@pytest.mark.parametrize(
    "answer",
    [FULL, "", requests.exceptions.ConnectionError("no route to host")],
    ids=["at capacity", "empty page", "unreachable"],
)
def test_a_status_that_says_nothing_waits_five_seconds_in_the_block(
    monkeypatch: pytest.MonkeyPatch, answer: str | Exception
) -> None:
    status_is(monkeypatch, answer)
    original = getattr(overpass, PAUSE_FUNCTION)
    with short_overpass_pause():
        assert osmnx_pause() == APP_PAUSE_S == 5.0
    # Afterwards OSMnx is as it was.
    assert getattr(overpass, PAUSE_FUNCTION) is original
    assert osmnx_pause() == OSMNX_MINUTE_S


def test_the_wait_overpass_asks_for_is_kept(monkeypatch: pytest.MonkeyPatch) -> None:
    status_is(monkeypatch, STATUS.format(slots="2 slots available now."))
    with short_overpass_pause():
        assert osmnx_pause() == 0
    free_at = dt.datetime.now(tz=dt.UTC) + dt.timedelta(seconds=40)
    slot = f"Slot available after: {free_at:%Y-%m-%dT%H:%M:%SZ}, in 40 seconds."
    status_is(monkeypatch, STATUS.format(slots=slot))
    with short_overpass_pause():
        assert 35 <= osmnx_pause() <= 41


def test_the_minute_is_back_when_the_last_block_ends(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Two downloads at once, each in its thread: the first to end does not
    give the other its minute back."""
    status_is(monkeypatch, FULL)
    original = getattr(overpass, PAUSE_FUNCTION)
    inside, leave = threading.Event(), threading.Event()

    def other() -> None:
        with short_overpass_pause():
            inside.set()
            leave.wait(5)

    thread = threading.Thread(target=other)
    with short_overpass_pause():
        thread.start()
        assert inside.wait(5)
    assert osmnx_pause() == APP_PAUSE_S  # the other block is still under way
    leave.set()
    thread.join(5)
    assert getattr(overpass, PAUSE_FUNCTION) is original
    assert osmnx_pause() == OSMNX_MINUTE_S


def test_the_block_ends_as_it_began_when_the_download_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original = getattr(overpass, PAUSE_FUNCTION)
    with pytest.raises(RuntimeError), short_overpass_pause():
        raise RuntimeError("502 Bad Gateway")
    assert getattr(overpass, PAUSE_FUNCTION) is original


def test_an_osmnx_without_the_function_keeps_its_own_wait(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    def theirs(base_endpoint: str) -> float:
        return 42.0

    monkeypatch.setattr(overpass, PAUSE_FUNCTION, theirs)
    with caplog.at_level(logging.WARNING, logger="shaperoute_api.overpass_pause"):
        with short_overpass_pause():
            assert getattr(overpass, PAUSE_FUNCTION) is theirs
            assert osmnx_pause() == 42.0
    assert getattr(overpass, PAUSE_FUNCTION) is theirs
    assert "its own wait stays" in caplog.text


def test_without_osmnx_the_block_changes_nothing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The engine on the phone packs this module with graphs.py and has no
    OSMnx: the block is entered and left, and what is inside it runs."""
    original = getattr(overpass, PAUSE_FUNCTION)
    monkeypatch.setitem(sys.modules, "osmnx._overpass", None)
    ran = False
    with short_overpass_pause():
        ran = True
    assert ran and getattr(overpass, PAUSE_FUNCTION) is original
