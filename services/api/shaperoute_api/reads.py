"""What an app can show (TASK-387, ADR-0328): the header X-MuW-Reads.

An app says in X-MuW-Reads the kinds it reads besides running, cycling and
paddling, separated by commas: `swimming`, `hiking`, `mountain_biking`,
`inline_skating`, `snowshoeing` (TASK-413), `walking`, `gravel_biking`,
`skiing`, `xc_skiing`, `ski_touring` (TASK-415), `gym`, `trackless` for a
run or a drawing without
a track (TASK-385): a workout at the gym, which has none, needs both; and
`pool` for a swim in a pool (TASK-400), which needs `swimming`, `trackless`
and `pool`. A request without it comes from a build of before, which reads
those three only, each with its track. Every list of runs, drawings,
routes or group runs leaves out what the request does not read; a drawing
or a group run it does not read is not found, as one that is not there.

Names and values are read without case, the spaces around them and the
values this API does not know are left out: an app newer than the server
says kinds it has not learned yet. The SQL this module writes is made of the
fixed names below, never of the header's text.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Depends, Request

READS_HEADER = "X-MuW-Reads"
# What every app has always read (TASK-191 for paddling).
OLD_APP_ACTIVITIES: tuple[str, ...] = ("running", "cycling", "paddling")
# The activities added after them, each read only by the apps that say so.
NEWER_ACTIVITIES: tuple[str, ...] = (
    "swimming",
    # A hike (TASK-377), in the order of RunActivity.
    "hiking",
    # An MTB ride and a gravel ride (TASK-378), in the same order.
    "mountain_biking",
    # A skate (TASK-380), in the same order.
    "inline_skating",
    # Snowshoeing (TASK-413), in the same order.
    "snowshoeing",
    "walking",
    "gravel_biking",
    "skiing",
    "xc_skiing",
    # A day of ski touring (TASK-415), in the same order.
    "ski_touring",
    # A workout at the gym (TASK-385): shown only with `trackless` too.
    "gym",
)
TRACKLESS = "trackless"
# A swim in a pool (TASK-400, ADR-0334): a run of swimming without a track.
# An app that reads `trackless` but not `pool` would show it without its
# lengths, so it needs all three.
POOL = "pool"
POOL_ACTIVITY = "swimming"
KINDS: tuple[str, ...] = (*NEWER_ACTIVITIES, TRACKLESS, POOL)


@dataclass(frozen=True)
class Reads:
    """The activities an app shows, whether it shows what has no track, and
    whether a swim in a pool."""

    activities: tuple[str, ...]
    trackless: bool = False
    pool: bool = False

    def shows(self, activity: Any, tracked: bool = True) -> bool:
        """True when the app shows an item of `activity`, with a track or
        not as `tracked` says."""
        if activity == POOL_ACTIVITY and not tracked and not self.pool:
            return False
        return activity in self.activities and (tracked or self.trackless)

    def sql(self, activity: str, tracked: str | None = None) -> str:
        """An SQL condition: the column `activity` is one the app shows and,
        unless it reads what has no track, the condition `tracked` holds
        (as "r.track IS NOT NULL"); None for what always has a line. A swim
        without a track, which is in a pool, also needs `pool`."""
        listed = ", ".join(f"'{name}'" for name in self.activities)
        condition = f"{activity} IN ({listed})"
        if tracked is not None and not self.trackless:
            condition += f" AND {tracked}"
        elif tracked is not None and POOL_ACTIVITY in self.activities and not self.pool:
            condition += f" AND ({activity} <> '{POOL_ACTIVITY}' OR {tracked})"
        return f"({condition})"


# The app of before the header.
OLD_APP = Reads(OLD_APP_ACTIVITIES)
# What the API itself sees: its commands, its pushes, its own tests.
EVERYTHING = Reads((*OLD_APP_ACTIVITIES, *NEWER_ACTIVITIES), trackless=True, pool=True)


def reads_from(lines: Iterable[str]) -> Reads:
    """The Reads of the header's lines; none or only unknown values: OLD_APP."""
    values = {value.strip().lower() for line in lines for value in line.split(",")}
    said = values & set(KINDS)
    return Reads(
        (*OLD_APP_ACTIVITIES, *(a for a in NEWER_ACTIVITIES if a in said)),
        trackless=TRACKLESS in said,
        pool=POOL in said,
    )


def reads_of(request: Request) -> Reads:
    """What the app of the request shows, from its header."""
    return reads_from(request.headers.getlist(READS_HEADER))


Shown = Annotated[Reads, Depends(reads_of)]
