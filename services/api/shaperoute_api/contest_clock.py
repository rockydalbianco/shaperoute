"""The push of a monthly challenge's last days (TASK-343, ADR-0296,
docs/CONCORSI.md §15): LAST_DAYS before ends_at, once, to whoever may be
told (contests.PUSHABLE_SQL), has published at least one drawing for
everyone, and entered none in it.

Like group_runs.GroupRunClock: every CHECK_EVERY_S an UPDATE marks the
contests due (reminded_at IS NULL) before anyone is told, so two processes
never send it twice. A contest without a theme is never reminded: it takes
no entries. Started and stopped with the app; the tests call check().
"""

from __future__ import annotations

import logging
import threading
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import FastAPI

from shaperoute_api.accounts import Accounts
from shaperoute_api.contests import (
    CONTEST_COLUMNS,
    PUSHABLE_SQL,
    _contest,
    told_everyone,
)
from shaperoute_api.db import Database
from shaperoute_api.push import Pusher

log = logging.getLogger(__name__)

LAST_DAYS = timedelta(days=3)
CHECK_EVERY_S = 10 * 60

PusherOf = Callable[[], Pusher | None]
Later = Callable[[float, Callable[[], None]], Any]

# Who hears of the last days of the contest `%(contest)s`: may be told, has a
# drawing for everyone that is not hidden, and entered nothing in it.
REMINDED_SQL = (
    f"SELECT u.id FROM users u WHERE {PUSHABLE_SQL}"
    " AND EXISTS (SELECT 1 FROM drawings d JOIN runs r ON r.id = d.run_id"
    " WHERE r.user_id = u.id AND d.visibility = 'everyone' AND d.hidden_at IS NULL)"
    " AND NOT EXISTS (SELECT 1 FROM contest_entries e"
    " WHERE e.contest_id = %(contest)s AND e.user_id = u.id)"
    " ORDER BY u.id"
)


def _later(delay_s: float, task: Callable[[], None]) -> Any:
    timer = threading.Timer(delay_s, task)
    timer.daemon = True
    timer.start()
    return timer


@dataclass
class ContestClock:
    """Looks, every `every_s`, for the open contest with a theme whose last
    days began and that was not reminded, and tells (contest_last_days)."""

    database: Database
    now: Callable[[], datetime]
    # Read when needed: the pusher may be set after this is made.
    pusher_of: PusherOf
    later: Later = _later
    every_s: float = CHECK_EVERY_S

    def __post_init__(self) -> None:
        self._lock = threading.Lock()
        self._ticking = threading.Lock()
        self._timer: Any = None
        self._running = False

    def start(self) -> None:
        with self._lock:
            if self._running:
                return
            self._running = True
            self._timer = self.later(self.every_s, self._tick)

    def stop(self) -> None:
        """No more checks; a check under way ends before this returns."""
        with self._lock:
            self._running = False
            timer, self._timer = self._timer, None
        if timer is not None and hasattr(timer, "cancel"):
            timer.cancel()
        with self._ticking:
            pass

    def _tick(self) -> None:
        with self._ticking:
            with self._lock:
                running = self._running
            if not running:
                return
            try:
                self.check()
            except Exception:
                log.exception("contests: the last days were not checked")
        with self._lock:
            if self._running:
                self._timer = self.later(self.every_s, self._tick)

    def check(self) -> list[UUID]:
        """The contests reminded now, each marked before anyone is told:
        another process finds it marked, and tells nobody."""
        now = self.now()
        told = []
        with self.database.connect() as conn:
            rows = conn.execute(
                "UPDATE contests SET reminded_at = %s"
                " WHERE reminded_at IS NULL AND closed_at IS NULL"
                " AND theme IS NOT NULL AND starts_at <= %s"
                " AND ends_at > %s AND ends_at <= %s"
                f" RETURNING {CONTEST_COLUMNS}",
                (now, now, now, now + LAST_DAYS),
            ).fetchall()
            for row in rows:
                contest = _contest(row)
                recipients = [
                    int(r["id"])
                    for r in conn.execute(REMINDED_SQL, {"contest": contest.id})
                ]
                told.append((contest, recipients))
        for contest, recipients in told:
            told_everyone(self.pusher_of(), "contest_last_days", contest, recipients)
        return [contest.id for contest, _ in told]


def install_contest_clock(app: FastAPI) -> None:
    """The clock, around the app's lifespan; without a database, none."""
    accounts: Accounts | None = app.state.accounts
    if accounts is None:
        return

    def pusher() -> Pusher | None:
        found: Pusher | None = getattr(app.state, "pusher", None)
        return found

    clock = ContestClock(accounts.database, accounts.now, pusher)
    app.state.contest_clock = clock
    inner = app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(app_: FastAPI) -> AsyncIterator[Any]:
        async with inner(app_) as state:
            clock.start()
            try:
                yield state
            finally:
                clock.stop()

    app.router.lifespan_context = lifespan
