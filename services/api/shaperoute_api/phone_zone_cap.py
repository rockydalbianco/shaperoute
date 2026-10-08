"""How many bytes of zones downloaded ahead the phones get in a day
(TASK-214 part A2, ADR-0177).

The zone around the phone is always given. The zones it downloads ahead,
nearby and most searched cities (part B2), say so with `?prefetch=1`, and
get at most PHONE_BYTES_A_DAY for each phone and SERVER_BYTES_A_DAY in all:
the user's choice of 2026-10-03. A zone that would pass either is refused
with 429 and Retry-After until the next midnight UTC, and the phone tries
again the next day.

Each phone is the anonymous id the app sends in X-Phone-Id, random and made
on the phone; a request without a usable id counts under its address.

The count is in memory, never written: a restart of the API starts the day
from zero again, so a day with a restart may give a little more. No
database, no migration.
"""

from __future__ import annotations

import math
import re
import threading
from collections.abc import Callable
from datetime import UTC, date, datetime, time, timedelta

from fastapi import Request

# The user's choice of 2026-10-03, in decimal units as the phone's 2 GB.
PHONE_BYTES_A_DAY = 300_000_000
SERVER_BYTES_A_DAY = 300_000_000_000
PHONE_HEADER = "X-Phone-Id"
# The app sends 32 hex digits; anything else is not an id.
PHONE_ID = re.compile(r"[A-Za-z0-9_-]{8,64}")


def utc_now() -> datetime:
    return datetime.now(UTC)


class TrafficCap:
    """Bytes of zones downloaded ahead, counted for each phone and in all,
    from midnight UTC."""

    def __init__(
        self,
        per_phone: int = PHONE_BYTES_A_DAY,
        total: int = SERVER_BYTES_A_DAY,
        clock: Callable[[], datetime] = utc_now,
    ) -> None:
        self._per_phone = per_phone
        self._total = total
        self._clock = clock
        self._day: date | None = None
        self._phones: dict[str, int] = {}
        self._given = 0
        self._lock = threading.Lock()

    def take(self, phone: str, size: int) -> int:
        """0 and the `size` bytes are counted, or the seconds until the next
        day, when they would pass the phone's cap or the server's."""
        now = self._clock().astimezone(UTC)
        with self._lock:
            self._start_day(now)
            used = self._phones.get(phone, 0)
            if used + size > self._per_phone or self._given + size > self._total:
                return seconds_to_tomorrow(now)
            self._phones[phone] = used + size
            self._given += size
            return 0

    def given_today(self) -> int:
        """The bytes given today, for the log."""
        now = self._clock().astimezone(UTC)
        with self._lock:
            self._start_day(now)
            return self._given

    def _start_day(self, now: datetime) -> None:
        """A new day starts from zero; under the lock."""
        if now.date() != self._day:
            self._day = now.date()
            self._phones.clear()
            self._given = 0


def seconds_to_tomorrow(now: datetime) -> int:
    """Whole seconds from `now` to the next midnight UTC, at least 1."""
    midnight = datetime.combine(now.date() + timedelta(days=1), time(), tzinfo=UTC)
    return max(1, math.ceil((midnight - now).total_seconds()))


def phone_of(request: Request) -> str:
    """The phone's id, or its address when the id is missing or not one."""
    sent = request.headers.get(PHONE_HEADER)
    if sent is not None and PHONE_ID.fullmatch(sent):
        return f"id:{sent}"
    return f"address:{request.client.host if request.client else 'unknown'}"
