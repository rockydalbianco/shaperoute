"""The figures of a run for the page of its post (TASK-410 part C, ADR-0340,
docs/API.md, «Run stats»).

The page shows, besides a run's metres and seconds, its splits, its
elevation profile, its cadence, its calories and its heart rate, each only
when there is one. They are kept in `run_stats` (migration 0064), one row per
run, never in `runs`; the heart rate is the exception, kept on the run by
TASK-409 B (runs.heart_avg_bpm, heart_max_bpm, heart_shown).

- The **splits** per kilometre and per mile the API counts itself, from the
  track and its pauses as `runs` keeps them (splits): the moving time of each
  whole unit, and the part left after the last whole one when it is at least
  MIN_PARTIAL_M, marked as such.
- PUT /me/activities/{key}/stats takes what only the phone knows, at the end
  of the activity: the elevation profile (at most MAX_ELEVATION_POINTS
  points), the cadence when a watch or a file gave one, the calories counted
  with the body of its owner (body/energy.ts), which never leaves the phone.
  The whole of it each time: a field not sent is none. The splits are
  counted again then.
- GET /drawings/{id} gives `stats` (seen_stats), already filtered: the heart
  rate and the calories only to the author, or when the author shows the
  heart rate (the user's choice 2 of TASK-410, «Visibili, nascondibili»). A
  run without a row, as every run saved before part C, gives none. GET /feed
  does not give it.

    python -m shaperoute_api.run_stats

counts the splits of the runs that have no row yet (the backfill): run on
the server only with the user's yes, after the deploy of part C.
"""

from __future__ import annotations

import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, FastAPI, HTTPException
from psycopg import Connection
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, model_validator
from route_engine.geo import haversine_m
from route_engine.track_score import TrackPoint

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import (
    MAX_ALTITUDE_M,
    MIN_ALTITUDE_M,
    UNKNOWN_ACTIVITY,
    Key,
)
from shaperoute_api.db import Database
from shaperoute_api.personal_bests_backfill import KeptPause, kept_track
from shaperoute_api.schemas import ErrorBody

KM_M = 1_000.0
MILE_M = 1_609.344
# What is left after the last whole unit is a split of its own only from a
# tenth of a kilometre: a few metres more would give a pace of no meaning.
MIN_PARTIAL_M = 100.0
# A unit ends on a point when the sum of the steps misses it by a rounding.
EPSILON_M = 1e-6
# A very long ride: more splits than these are not kept.
MAX_SPLITS = 1_000
# The profile the phone sends, reduced: as many columns as the page draws.
MAX_ELEVATION_POINTS = 120
MAX_DISTANCE_M = 1_000_000.0
# Steps (or strokes, or turns) a minute.
MIN_CADENCE = 10
MAX_CADENCE = 260
MAX_KCAL = 20_000
# How many runs one question of the backfill reads.
BATCH = 200


# --- The bodies ---


class SplitBody(BaseModel):
    """One kilometre (or mile) of the run."""

    n: int
    """Which one: 1, 2, …"""
    seconds: float
    """Its moving time, pauses left out, to the tenth."""
    partial_m: int | None = None
    """For the part after the last whole one only: its metres. Null for a
    whole kilometre (or mile)."""


class ElevationPointBody(BaseModel):
    """A point of the profile: how far along the run, how high."""

    model_config = ConfigDict(extra="forbid")

    distance_m: float = Field(ge=0, le=MAX_DISTANCE_M, allow_inf_nan=False)
    altitude_m: float = Field(ge=MIN_ALTITUDE_M, le=MAX_ALTITUDE_M, allow_inf_nan=False)


class HeartBody(BaseModel):
    """The heart rate of the run, as TASK-409 B keeps it on the run."""

    avg_bpm: int
    max_bpm: int


class RunStatsBody(BaseModel):
    """The figures of a run: packages/shared-types/fixtures/run-stats.json.
    Each field null when the run has none, or when the one who asks may not
    see it."""

    splits_km: list[SplitBody] | None = None
    splits_mile: list[SplitBody] | None = None
    elevation: list[ElevationPointBody] | None = None
    cadence_spm: int | None = None
    kcal: int | None = None
    heart: HeartBody | None = None

    def empty(self) -> bool:
        return all(value is None for value in self.model_dump().values())


class RunStatsRequestBody(BaseModel):
    """PUT /me/activities/{key}/stats: what the phone knows at the end of
    the activity: packages/shared-types/fixtures/run-stats-request.json."""

    model_config = ConfigDict(extra="forbid")

    elevation: list[ElevationPointBody] | None = Field(
        None, max_length=MAX_ELEVATION_POINTS
    )
    """The profile, reduced on the phone; null without heights."""
    cadence_spm: int | None = Field(None, ge=MIN_CADENCE, le=MAX_CADENCE)
    kcal: int | None = Field(None, ge=0, le=MAX_KCAL)

    @model_validator(mode="after")
    def along_the_run(self) -> RunStatsRequestBody:
        if self.elevation is not None:
            if len(self.elevation) < 2:
                raise ValueError("a profile has two points at least")
            along = [p.distance_m for p in self.elevation]
            if any(b < a for a, b in zip(along, along[1:], strict=False)):
                raise ValueError("the points of a profile go along the run")
        return self


# --- The splits ---


def _paused_before(spans: Sequence[tuple[float, float]], at_s: float) -> float:
    """The seconds of pause before `at_s`, counted once where two overlap;
    `spans` sorted by start."""
    paused, reached = 0.0, 0.0
    for start, end in spans:
        start = max(start, reached)
        end = min(end, at_s)
        if end > start:
            paused += end - start
        reached = max(reached, end)
    return paused


def _stopped_between(pauses: Sequence[KeptPause], from_s: float, to_s: float) -> bool:
    """As activities._stopped_between: a pause the runner asked for between
    two points makes the step across it no part of the run."""
    return any(not p.auto and from_s <= p.from_s < to_s for p in pauses)


def splits(
    track: Sequence[TrackPoint], pauses: Sequence[KeptPause], unit_m: float = KM_M
) -> list[SplitBody]:
    """The whole units of `track` (time_s the seconds since its first point,
    pauses included, as `runs.track` keeps M), each with its moving time; a
    unit that ends between two points ends in proportion. The metres are
    those activities.recorded counts: no step across a pause asked for. The
    part after the last whole unit is a split too, marked, from
    MIN_PARTIAL_M."""
    spans = sorted((p.from_s, p.to_s) for p in pauses)

    def moving(point: TrackPoint) -> float:
        at = point.time_s or 0.0
        return at - _paused_before(spans, at)

    ends: list[float] = []
    metres = 0.0
    for a, b in zip(track, track[1:], strict=False):
        if _stopped_between(pauses, a.time_s or 0.0, b.time_s or 0.0):
            continue
        step = haversine_m(a.latlon, b.latlon)
        from_s, to_s = moving(a), moving(b)
        while step > 0 and metres + step >= (len(ends) + 1) * unit_m - EPSILON_M:
            share = min(1.0, ((len(ends) + 1) * unit_m - metres) / step)
            ends.append(from_s + share * (to_s - from_s))
        metres += step
    found = [
        SplitBody(n=i + 1, seconds=round(end - (ends[i - 1] if i else 0.0), 1))
        for i, end in enumerate(ends)
    ]
    left_m = metres - len(ends) * unit_m
    if track and left_m >= MIN_PARTIAL_M:
        last = moving(track[-1]) - (ends[-1] if ends else 0.0)
        found.append(
            SplitBody(
                n=len(ends) + 1,
                seconds=round(max(last, 0.0), 1),
                partial_m=round(left_m),
            )
        )
    return found[:MAX_SPLITS]


def counted(track: Sequence[TrackPoint], pauses: Sequence[KeptPause]) -> dict[str, Any]:
    """The splits of a run as `run_stats.stats` keeps them: null for none."""
    kept: dict[str, Any] = {}
    for name, unit_m in (("splits_km", KM_M), ("splits_mile", MILE_M)):
        found = splits(track, pauses, unit_m)
        kept[name] = [s.model_dump(exclude_none=True) for s in found] if found else None
    return kept


# --- In the database ---


def _heart_columns(conn: Connection[DictRow]) -> bool:
    """Whether `runs` has the heart rate of TASK-409 B (its migration 0061).
    Until it is in main, no run has one and every run shows it."""
    row = conn.execute(
        "SELECT 1 FROM information_schema.columns"
        " WHERE table_schema = current_schema() AND table_name = 'runs'"
        " AND column_name = 'heart_shown'"
    ).fetchone()
    return row is not None


def seen_stats(
    conn: Connection[DictRow], run_id: int, author: bool
) -> RunStatsBody | None:
    """The figures of a run as one who sees its drawing may see them: the
    heart rate and the calories only for its `author`, or when the author
    shows the heart rate. None for a run without any."""
    row = conn.execute(
        "SELECT stats FROM run_stats WHERE run_id = %s", (run_id,)
    ).fetchone()
    kept: dict[str, Any] = {} if row is None else dict(row["stats"])
    shown, heart = True, None
    if _heart_columns(conn):
        run = conn.execute(
            "SELECT heart_avg_bpm, heart_max_bpm, heart_shown FROM runs"
            " WHERE id = %s",
            (run_id,),
        ).fetchone()
        if run is not None:
            shown = bool(run["heart_shown"])
            if run["heart_avg_bpm"] is not None and run["heart_max_bpm"] is not None:
                heart = HeartBody(
                    avg_bpm=run["heart_avg_bpm"], max_bpm=run["heart_max_bpm"]
                )
    body = RunStatsBody.model_validate({**kept, "heart": heart})
    if not (author or shown):
        body = body.model_copy(update={"heart": None, "kcal": None})
    return None if body.empty() else body


def _keep(
    conn: Connection[DictRow], run_id: int, stats: dict[str, Any], at: datetime
) -> None:
    conn.execute(
        "INSERT INTO run_stats (run_id, stats, updated_at) VALUES (%s, %s, %s)"
        " ON CONFLICT (run_id) DO UPDATE"
        " SET stats = EXCLUDED.stats, updated_at = EXCLUDED.updated_at",
        (run_id, Jsonb(stats), at),
    )


@dataclass
class RunStats:
    """The figures of the runs, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]

    def save(
        self, user_id: int, key: str, body: RunStatsRequestBody
    ) -> RunStatsBody | None:
        """What the phone sent, with the splits counted again, over what the
        run had; the figures as its owner sees them. None for no run of the
        key."""
        with self.database.connect() as conn:
            run = conn.execute(
                "SELECT id, pauses, ST_AsText(track) AS track FROM runs"
                " WHERE user_id = %s AND key = %s FOR UPDATE",
                (user_id, key),
            ).fetchone()
            if run is None:
                return None
            # A swim in a pool or a day at the gym has no track: no splits.
            kept: dict[str, Any] = {"splits_km": None, "splits_mile": None}
            if run["track"] is not None:
                track, pauses = kept_track(run)
                kept = counted(track, pauses)
            kept.update(body.model_dump(mode="json"))
            _keep(conn, int(run["id"]), kept, self.now())
            return seen_stats(conn, int(run["id"]), author=True) or RunStatsBody()


# --- The endpoint ---


def run_stats_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> RunStats:
    """In the database of the accounts, on the same clock."""
    return RunStats(accounts.database, accounts.now)


Stats = Annotated[RunStats, Depends(run_stats_of)]
Me = Annotated[UserBody, Depends(current_user)]


def run_stats_routes() -> APIRouter:
    router = APIRouter(tags=["activities"], responses=ACCOUNT_ERRORS)

    @router.put("/me/activities/{key}/stats", responses={404: {"model": ErrorBody}})
    def save_run_stats(
        key: Key, body: RunStatsRequestBody, stats: Stats, user: Me
    ) -> RunStatsBody:
        saved = stats.save(user.id, key, body)
        if saved is None:
            raise HTTPException(404, UNKNOWN_ACTIVITY)
        return saved

    return router


def install_run_stats(app: FastAPI) -> None:
    """Without a database the endpoint answers 503, as the others of the
    accounts."""
    app.include_router(run_stats_routes())


# --- The backfill ---


@dataclass(frozen=True)
class Backfilled:
    runs: int


def backfill(database: Database, now: Callable[[], datetime]) -> Backfilled:
    """The splits of every run with a track and no row yet, one run at a time
    in its own short transaction. Run twice, the second time does nothing; a
    run the phone sent figures for meanwhile keeps them."""
    runs, after = 0, 0
    while True:
        with database.connect() as conn:
            rows = conn.execute(
                "SELECT r.id, r.pauses, ST_AsText(r.track) AS track FROM runs r"
                " WHERE r.id > %s AND r.track IS NOT NULL AND NOT EXISTS"
                " (SELECT 1 FROM run_stats s WHERE s.run_id = r.id)"
                " ORDER BY r.id LIMIT %s",
                (after, BATCH),
            ).fetchall()
        if not rows:
            return Backfilled(runs)
        for row in rows:
            track, pauses = kept_track(row)
            stats = counted(track, pauses)
            with database.connect() as conn:
                done = conn.execute(
                    "INSERT INTO run_stats (run_id, stats, updated_at)"
                    " SELECT id, %s, %s FROM runs WHERE id = %s"
                    " ON CONFLICT (run_id) DO NOTHING RETURNING run_id",
                    (Jsonb(stats), now(), row["id"]),
                ).fetchone()
                runs += done is not None
        after = int(rows[-1]["id"])


def main(argv: Sequence[str] | None = None) -> int:
    del argv  # no options
    database = Database.from_env()
    if database is None:
        print("run_stats: SHAPEROUTE_DATABASE_URL is not set", file=sys.stderr)
        return 2
    done = backfill(database, lambda: datetime.now().astimezone())
    print(f"run_stats: the splits of {done.runs} run(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
