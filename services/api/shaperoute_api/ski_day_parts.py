"""The parts of a saved day of skiing (TASK-429 part C1, ADR-0357).

The phone sends the lifts and the descents of the day at «Save», as
`ski_parts` of the run's figures (PUT /me/activities/{key}/stats, TASK-424
part C2b, `run_stats.stats`): kind, number, times, metres, height and top
speed. The server keeps the track with its seconds but not its heights, so
it cannot find them itself (the user's choice of 2026-11-10: the days saved
before have none).

Here, for GET /drawings/{id}/ski-day: each part gets the fixes of the post's
track it covers (`from_fix`, `to_fix`: the post shows the whole track,
ADR-0330) and the name of its lift or piste, found as for the whole day
(ski_names.py) on its own stretch of track. The names are found at reading,
and kept a while in a small cache in each process (NamesCache).
"""

from __future__ import annotations

import time
from collections import OrderedDict
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from route_engine.geo import LatLon

from shaperoute_api.ski_names import NOTHING, SkiNames, ski_names_from

PartKind = Literal["lift", "descent"]

# The most parts a day keeps (as TASK-424 part C2b takes them).
MAX_PARTS = 500
# The names of this many days, in each process, for this long: the API
# runs in more than one process (ADR-0242), so a cache is never shared, and
# a day's names change only when its figures are sent again.
CACHE_DAYS = 256
CACHE_SECONDS = 600.0
# A fix's seconds may be rounded: this much either side still counts.
EDGE_S = 0.5


class StoredPartBody(BaseModel):
    """A part as `run_stats.stats["ski_parts"]` keeps it; what else it has
    is left aside."""

    model_config = ConfigDict(extra="ignore")

    kind: PartKind
    n: int = Field(ge=1)
    moving_s: float = Field(ge=0)
    metres: float = Field(ge=0)
    height_m: float = Field(ge=0)
    top_mps: float | None = Field(default=None, ge=0)
    start_s: float | None = None
    """On the seconds of the server's track; missing when not counted."""
    end_s: float | None = None


class SkiDayPartBody(BaseModel):
    """A lift or a descent of the day, in the order of the day:
    packages/shared-types/fixtures/ski-day-parts.json."""

    kind: PartKind
    n: int
    """Counted apart for lifts and descents, from 1: «L2», «3»."""
    start_s: float | None
    end_s: float | None
    moving_s: float
    metres: float
    height_m: float
    """Climbed by a lift, dropped by a descent."""
    top_mps: float | None
    from_fix: int | None
    """The first and the last fix of the post's track in the part; null
    when the track has none in its time."""
    to_fix: int | None
    name: str | None
    """Its lift's or piste's name; null when none was found."""


def stored_parts(stats: Any) -> list[StoredPartBody]:
    """The parts `stats` keeps, in the order of the day; none for a run
    without them, and none of what is not a part."""
    if not isinstance(stats, dict):
        return []
    rows = stats.get("ski_parts")
    if not isinstance(rows, list):
        return []
    parts: list[StoredPartBody] = []
    for row in rows[:MAX_PARTS]:
        try:
            parts.append(StoredPartBody.model_validate(row))
        except ValidationError:
            continue
    return parts


def fixes_between(
    seconds: Sequence[float], start_s: float | None, end_s: float | None
) -> tuple[int, int] | None:
    """The first and the last fix whose seconds lie in [start_s, end_s];
    None when fewer than two do, or the part has no times."""
    if start_s is None or end_s is None or end_s < start_s:
        return None
    inside = [
        index
        for index, at in enumerate(seconds)
        if start_s - EDGE_S <= at <= end_s + EDGE_S
    ]
    if len(inside) < 2:
        return None
    return inside[0], inside[-1]


def part_name(kind: PartKind, names: SkiNames) -> str | None:
    """A lift's name, or the first piste of a descent that has one."""
    used = names.lifts if kind == "lift" else names.pistes
    return next((u.name for u in used if u.name), None)


Namer = Callable[[Sequence[LatLon]], SkiNames]


def namer_of(cache_dir: Path | None) -> Namer:
    """Names a stretch of track from the ski tiles of `cache_dir`; without
    them (as in most tests) nothing is named."""
    if cache_dir is None:
        return lambda _points: NOTHING
    return lambda points: ski_names_from(points, cache_dir)


def day_parts(
    stored: Sequence[StoredPartBody],
    fixes: Sequence[tuple[float, float, float]],
    namer: Namer,
) -> list[SkiDayPartBody]:
    """`stored` with the fixes of `fixes` (lat, lon, seconds) each covers,
    and the name of its stretch."""
    seconds = [fix[2] for fix in fixes]
    parts: list[SkiDayPartBody] = []
    for part in stored:
        span = fixes_between(seconds, part.start_s, part.end_s)
        name = None
        if span is not None:
            stretch = [(fix[0], fix[1]) for fix in fixes[span[0] : span[1] + 1]]
            name = part_name(part.kind, namer(stretch))
        parts.append(
            SkiDayPartBody(
                kind=part.kind,
                n=part.n,
                start_s=part.start_s,
                end_s=part.end_s,
                moving_s=part.moving_s,
                metres=part.metres,
                height_m=part.height_m,
                top_mps=part.top_mps if part.kind == "descent" else None,
                from_fix=None if span is None else span[0],
                to_fix=None if span is None else span[1],
                name=name,
            )
        )
    return parts


class NamesCache:
    """The parts of the last CACHE_DAYS days asked, each for CACHE_SECONDS:
    by run and by when its figures were last sent, so new ones are read
    anew."""

    def __init__(
        self,
        size: int = CACHE_DAYS,
        seconds: float = CACHE_SECONDS,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.size = size
        self.seconds = seconds
        self.clock = clock
        self._kept: OrderedDict[tuple[int, str], tuple[float, list[SkiDayPartBody]]]
        self._kept = OrderedDict()

    def get(
        self, key: tuple[int, str], make: Callable[[], list[SkiDayPartBody]]
    ) -> list[SkiDayPartBody]:
        now = self.clock()
        kept = self._kept.get(key)
        if kept is not None and now - kept[0] < self.seconds:
            self._kept.move_to_end(key)
            return kept[1]
        parts = make()
        self._kept[key] = (now, parts)
        self._kept.move_to_end(key)
        while len(self._kept) > self.size:
            self._kept.popitem(last=False)
        return parts

    def __len__(self) -> int:
        return len(self._kept)
