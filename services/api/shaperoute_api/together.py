"""«Together»: the tracks of a post's run and of the people tagged in it who
ran it too, on one clock (TASK-417 part D1, ADR-0345, docs/API.md).

The run video of the app (TASK-408) can draw everybody who ran together on
the same map, each where they were at the same moment. For that it needs the
times of the tracks, which the API gives nobody else: the drawings, the feed
and My activities give a track without times (drawings.py). This is the only
place they leave, and only so:

- only to the author of the post, about its own drawing: anybody else, and
  an id that is not there, get the same 404;
- the author's run, and the runs of the people tagged in the post (in the
  order of the tags, at most MAX_TAGGED of them) whose run is the same run:
  at least MIN_OVERLAP_SHARE of the shorter of the two elapsed times in
  common, and started less than MAX_START_APART_M apart;
- only runs whose drawing the author may see (drawings.drawing_seen_sql: for
  everyone, or for the followers and the author follows with the request
  accepted; never «Only me», never across a block, never hidden). Nobody is
  asked: the tag and the visibility are the yes (the user's choice 3);
- the times as seconds since the first start of the group, the pauses on
  the same clock: never the time of day, never the date;
- at most MAX_POINTS points a track, the stored points themselves: some are
  left out, none is moved (`thinned`).

A track that stops being visible is no longer given; a video already made
stays as it is, on the phone that made it.
"""

from __future__ import annotations

import bisect
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field
from route_engine.geo import path_length_m

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.db import Database
from shaperoute_api.drawings import NO_DRAWING, drawing_seen_sql
from shaperoute_api.schemas import ErrorBody

# The author and three people tagged: four in a video (the user's choice 4).
MAX_TAGGED = 3
# Points a track, at most: enough for a line on a phone's screen, a few tens
# of KB for four people.
MAX_POINTS = 600
# The same run: at least half of the shorter elapsed time in common...
MIN_OVERLAP_SHARE = 0.5
# ... and the two starts closer than this.
MAX_START_APART_M = 2000.0
# The runs of a person tagged looked at, at most: a day has few of them.
MAX_CANDIDATES = 20
# Seconds are given to a tenth.
SECOND_DECIMALS = 1


@dataclass(frozen=True)
class Fix:
    """A stored point: `t_s` is its M, the seconds since the run's first
    point, pauses included."""

    lat: float
    lon: float
    t_s: float


@dataclass(frozen=True)
class Span:
    """A pause, on the clock of its run's fixes."""

    from_s: float
    to_s: float


@dataclass(frozen=True)
class Run:
    """A run as `runs` keeps it, read for «Together»."""

    public_id: UUID
    username: str
    started_at: datetime
    fixes: list[Fix]
    pauses: list[Span]

    @property
    def elapsed_s(self) -> float:
        return self.fixes[-1].t_s if self.fixes else 0.0


class TogetherPauseBody(BaseModel):
    """A pause, in seconds since the first start of the group."""

    from_s: float
    to_s: float


class TogetherPersonBody(BaseModel):
    """Somebody's run, on the clock of the group."""

    public_id: UUID
    username: str
    points: list[tuple[float, float]] = Field(
        description="(lat, lon), as stored: some left out, none moved."
    )
    seconds: list[float] = Field(
        description=(
            "For each point, the seconds since the first start of the group:"
            " never a time of day or a date."
        )
    )
    pauses: list[TogetherPauseBody]


class TogetherBody(BaseModel):
    """GET /drawings/{id}/together: packages/shared-types/fixtures/together.json.
    The author first, then the people tagged who ran the same run, in the
    order of the tags; only the author when nobody did."""

    people: list[TogetherPersonBody]


# --- Without a database ---


def track_of(text: str) -> list[Fix]:
    """The fixes of ST_AsText(track), "LINESTRING M (lon lat m, …)"."""
    inside = text[text.index("(") + 1 : text.rindex(")")]
    fixes = []
    for point in inside.split(","):
        lon, lat, m = (float(v) for v in point.split())
        fixes.append(Fix(lat, lon, m))
    return fixes


def pauses_of(column: Sequence[dict[str, Any]]) -> list[Span]:
    """The pauses of the `pauses` column, by their start."""
    spans = [Span(float(p["from_s"]), float(p["to_s"])) for p in column]
    return sorted(spans, key=lambda span: span.from_s)


def overlap_s(a: Run, b: Run) -> float:
    """The seconds the two runs have in common, start to finish."""
    a_start = a.started_at.timestamp()
    b_start = b.started_at.timestamp()
    start = max(a_start, b_start)
    end = min(a_start + a.elapsed_s, b_start + b.elapsed_s)
    return max(0.0, end - start)


def same_run(a: Run, b: Run) -> bool:
    """Whether `b` is the run `a` too: enough time in common, starts close."""
    if not a.fixes or not b.fixes:
        return False
    shorter = min(a.elapsed_s, b.elapsed_s)
    if shorter <= 0 or overlap_s(a, b) < MIN_OVERLAP_SHARE * shorter:
        return False
    starts = [(a.fixes[0].lat, a.fixes[0].lon), (b.fixes[0].lat, b.fixes[0].lon)]
    return path_length_m(starts) < MAX_START_APART_M


def thinned(fixes: Sequence[Fix], pauses: Sequence[Span], most: int) -> list[Fix]:
    """At most `most` of `fixes`, each one of them unchanged: the first and
    the last, the last before and the first after each pause, and the others
    nearest to evenly spaced seconds, so the line keeps its pace."""
    if len(fixes) <= most:
        return list(fixes)
    times = [fix.t_s for fix in fixes]
    last = len(fixes) - 1
    kept = {0, last}
    for pause in pauses:
        before = bisect.bisect_right(times, pause.from_s) - 1
        after = bisect.bisect_left(times, pause.to_s)
        kept.update(i for i in (before, after) if 0 <= i <= last)
    if len(kept) > most:
        # More pause edges than room: evenly among them, the ends kept.
        ordered = sorted(kept)
        step = (len(ordered) - 1) / (most - 1)
        return [fixes[ordered[round(k * step)]] for k in range(most)]
    room = most - len(kept)
    span = times[-1] - times[0]
    for k in range(1, room + 1):
        target = times[0] + span * k / (room + 1)
        i = bisect.bisect_left(times, target)
        if i > 0 and target - times[i - 1] <= times[min(i, last)] - target:
            i -= 1
        kept.add(min(i, last))
    return [fixes[i] for i in sorted(kept)]


def on_one_clock(runs: Sequence[Run]) -> TogetherBody:
    """The runs with their seconds counted from the first start among them,
    each thinned to MAX_POINTS."""
    first = min(run.started_at for run in runs)
    people = []
    for run in runs:
        shift = (run.started_at - first).total_seconds()
        fixes = thinned(run.fixes, run.pauses, MAX_POINTS)
        people.append(
            TogetherPersonBody(
                public_id=run.public_id,
                username=run.username,
                points=[(fix.lat, fix.lon) for fix in fixes],
                seconds=[round(shift + fix.t_s, SECOND_DECIMALS) for fix in fixes],
                pauses=[
                    TogetherPauseBody(
                        from_s=round(shift + pause.from_s, SECOND_DECIMALS),
                        to_s=round(shift + pause.to_s, SECOND_DECIMALS),
                    )
                    for pause in run.pauses
                ],
            )
        )
    return TogetherBody(people=people)


# --- In the database ---

_RUN_COLUMNS = (
    "u.public_id, u.username, r.started_at, r.pauses, ST_AsText(r.track) AS track"
)


def _run(row: dict[str, Any]) -> Run:
    return Run(
        public_id=row["public_id"],
        username=row["username"],
        started_at=row["started_at"],
        fixes=track_of(row["track"]),
        pauses=pauses_of(row["pauses"]),
    )


class Together:
    """The tracks of a post's run and of its people tagged, for its author."""

    def __init__(self, database: Database) -> None:
        self.database = database

    def of(self, author_id: int, drawing_id: str) -> TogetherBody | None:
        """The tracks, for the drawing `drawing_id` of `author_id`; None when
        it is not there or is somebody else's, as for an id that is not."""
        try:
            wanted = UUID(drawing_id)
        except ValueError:
            return None
        with self.database.connect() as conn:
            row = conn.execute(
                f"SELECT {_RUN_COLUMNS} FROM drawings d"
                " JOIN runs r ON r.id = d.run_id JOIN users u ON u.id = r.user_id"
                " WHERE d.id = %s AND r.user_id = %s AND r.track IS NOT NULL",
                (wanted, author_id),
            ).fetchone()
            if row is None:
                return None
            mine = _run(row)
            if not mine.fixes:
                return None
            tagged = conn.execute(
                "SELECT t.user_id FROM drawing_tags t"
                " WHERE t.drawing_id = %s AND t.user_id <> %s ORDER BY t.position",
                (wanted, author_id),
            ).fetchall()
            runs = [mine]
            for tag in tagged:
                if len(runs) > MAX_TAGGED:
                    break
                found = self._same_run(conn, author_id, int(tag["user_id"]), mine)
                if found is not None:
                    runs.append(found)
        return on_one_clock(runs)

    def _same_run(
        self, conn: Any, author_id: int, user_id: int, mine: Run
    ) -> Run | None:
        """The run of `user_id` that is the author's run too, with a drawing
        the author may see: the one with most time in common, if any."""
        start = mine.started_at.timestamp()
        rows = conn.execute(
            f"SELECT {_RUN_COLUMNS} FROM drawings d"
            " JOIN runs r ON r.id = d.run_id JOIN users u ON u.id = r.user_id"
            " WHERE r.user_id = %(user)s AND r.track IS NOT NULL"
            " AND r.started_at < to_timestamp(%(end)s)"
            " AND r.started_at + make_interval(secs => ST_M(ST_EndPoint(r.track)))"
            " > to_timestamp(%(start)s)"
            f" AND {drawing_seen_sql('%(author)s')}"
            " ORDER BY r.started_at, r.id LIMIT %(most)s",
            {
                "user": user_id,
                "start": start,
                "end": start + mine.elapsed_s,
                "author": author_id,
                "most": MAX_CANDIDATES,
            },
        ).fetchall()
        candidates = [run for run in map(_run, rows) if same_run(mine, run)]
        if not candidates:
            return None
        return max(candidates, key=lambda run: overlap_s(mine, run))


def together_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> Together:
    """In the database of the accounts."""
    return Together(accounts.database)


def together_routes() -> APIRouter:
    router = APIRouter(tags=["drawings"], responses=ACCOUNT_ERRORS)

    @router.get(
        "/drawings/{drawing_id}/together", responses={404: {"model": ErrorBody}}
    )
    def together(
        drawing_id: str,
        found: Annotated[Together, Depends(together_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> TogetherBody:
        body = found.of(user.id, drawing_id)
        if body is None:
            raise HTTPException(404, NO_DRAWING)
        return body

    return router


def install_together(app: FastAPI) -> None:
    """«Together»; after install_accounts, which sets the database and the
    errors."""
    app.include_router(together_routes())
