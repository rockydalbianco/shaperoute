"""The day's cap on zones downloaded ahead (phone_zone_cap.py, TASK-214 A2)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone

import pytest
from starlette.requests import Request

from shaperoute_api.phone_zone_cap import (
    PHONE_BYTES_A_DAY,
    SERVER_BYTES_A_DAY,
    TrafficCap,
    phone_of,
    seconds_to_tomorrow,
)

MB = 1_000_000


class Clock:
    def __init__(self, now: datetime) -> None:
        self.now = now

    def __call__(self) -> datetime:
        return self.now


@pytest.fixture
def clock() -> Clock:
    return Clock(datetime(2026, 10, 5, 22, 0, tzinfo=UTC))


def test_the_users_caps() -> None:
    assert PHONE_BYTES_A_DAY == 300 * MB
    assert SERVER_BYTES_A_DAY == 300_000 * MB


def test_a_phone_gets_up_to_its_cap(clock: Clock) -> None:
    cap = TrafficCap(per_phone=300 * MB, total=10_000 * MB, clock=clock)
    assert cap.take("a", 200 * MB) == 0
    assert cap.take("a", 100 * MB) == 0  # exactly the cap
    assert cap.take("a", 1) == 2 * 3600  # two hours to midnight UTC
    assert cap.take("b", 300 * MB) == 0  # another phone has its own
    assert cap.given_today() == 600 * MB


def test_a_zone_that_would_pass_the_cap_is_refused_whole(clock: Clock) -> None:
    cap = TrafficCap(per_phone=300 * MB, total=10_000 * MB, clock=clock)
    assert cap.take("a", 290 * MB) == 0
    assert cap.take("a", 25 * MB) > 0
    assert cap.take("a", 10 * MB) == 0  # a smaller one still fits
    assert cap.given_today() == 300 * MB


def test_the_server_gives_up_to_its_cap_in_all(clock: Clock) -> None:
    cap = TrafficCap(per_phone=300 * MB, total=500 * MB, clock=clock)
    assert cap.take("a", 300 * MB) == 0
    assert cap.take("b", 200 * MB) == 0
    assert cap.take("c", 1) == 2 * 3600  # a new phone too
    assert cap.given_today() == 500 * MB


def test_a_refused_zone_is_not_counted(clock: Clock) -> None:
    cap = TrafficCap(per_phone=100 * MB, total=10_000 * MB, clock=clock)
    assert cap.take("a", 150 * MB) > 0
    assert cap.given_today() == 0
    assert cap.take("a", 100 * MB) == 0


def test_the_count_starts_again_at_midnight_utc(clock: Clock) -> None:
    cap = TrafficCap(per_phone=300 * MB, total=300 * MB, clock=clock)
    assert cap.take("a", 300 * MB) == 0
    assert cap.take("b", 1) > 0
    clock.now = datetime(2026, 10, 5, 23, 59, 59, tzinfo=UTC)
    assert cap.take("a", 1) == 1
    clock.now = datetime(2026, 10, 6, 0, 0, tzinfo=UTC)
    assert cap.given_today() == 0
    assert cap.take("a", 300 * MB) == 0
    assert cap.given_today() == 300 * MB


def test_the_day_is_the_utc_day_whatever_the_clocks_zone(clock: Clock) -> None:
    rome = timezone(timedelta(hours=2))
    clock.now = datetime(2026, 10, 6, 1, 0, tzinfo=rome)  # 23:00 UTC, the 5th
    cap = TrafficCap(per_phone=300 * MB, total=10_000 * MB, clock=clock)
    assert cap.take("a", 300 * MB) == 0
    assert cap.take("a", 1) == 3600


@pytest.mark.parametrize(
    ("now", "seconds"),
    [
        (datetime(2026, 10, 5, 0, 0, tzinfo=UTC), 86_400),
        (datetime(2026, 10, 5, 12, 0, tzinfo=UTC), 43_200),
        (datetime(2026, 10, 5, 23, 59, 59, 500_000, tzinfo=UTC), 1),
        (datetime(2026, 10, 5, 23, 59, 59, 999_999, tzinfo=UTC), 1),
    ],
)
def test_seconds_to_tomorrow(now: datetime, seconds: int) -> None:
    assert seconds_to_tomorrow(now) == seconds


def request_with(headers: dict[str, str], host: str = "10.0.0.7") -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/phone-zones/foot",
            "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
            "client": (host, 51000),
        }
    )


def test_the_phone_is_its_id() -> None:
    sent = "0123456789abcdef0123456789abcdef"
    assert phone_of(request_with({"X-Phone-Id": sent})) == f"id:{sent}"


@pytest.mark.parametrize(
    "sent", [None, "", "short", "x" * 65, "not an id!", "a/b/c/d/e"]
)
def test_without_a_usable_id_the_phone_is_its_address(sent: str | None) -> None:
    headers = {} if sent is None else {"X-Phone-Id": sent}
    assert phone_of(request_with(headers)) == "address:10.0.0.7"


def test_an_id_never_counts_as_an_address() -> None:
    # Someone sending a phone's address as id gets a count of its own.
    assert phone_of(request_with({"X-Phone-Id": "10-0-0-7-xx"})) != phone_of(
        request_with({}, host="10-0-0-7-xx")
    )
