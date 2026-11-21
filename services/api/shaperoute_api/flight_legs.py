"""A flight's parts on foot and in the air as the API gives them back
(TASK-305 parts R6a and R6d, ADR-0375).

Here, apart from run_stats.py, so that a run opened whole
(activities.py, GET /me/activities/{key}) can carry them: run_stats.py
imports activities.py.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, Literal

from psycopg import Connection
from psycopg.rows import DictRow
from pydantic import BaseModel


class FlightPartBody(BaseModel):
    """A part of a flight as the API keeps it: its times in seconds from the
    first point of the run's track."""

    kind: Literal["foot", "air"]
    start_s: float
    end_s: float
    moving_s: float
    metres: float
    climb_m: float
    max_alt_m: float | None = None


class FlightSideBody(BaseModel):
    """The parts of one kind added up."""

    seconds: float
    metres: float
    climb_m: float
    max_alt_m: float | None = None


class FlightSplitBody(BaseModel):
    """A flight with parts on foot and in the air: each kind added up, for
    «On foot {time} · In the air {time}»."""

    foot: FlightSideBody
    air: FlightSideBody


class ActivityFlightBody(BaseModel):
    """A race on foot and in the air, opened whole (TASK-305 part R6d):
    packages/shared-types/fixtures/activity-flight.json."""

    air: list[tuple[int, int]]
    """The parts in the air as [from, to] indices into the run's `track`,
    in order: the app draws them yellow over the white line."""
    split: FlightSplitBody


# The seconds of each point of the track, in its order, and what the
# figures of the run keep of the flight's parts.
FLIGHT_OF_RUN = (
    "SELECT (SELECT array_agg(ST_M(p.geom) ORDER BY p.path[1])"
    "   FROM ST_DumpPoints(r.track) AS p) AS times,"
    " s.stats -> 'flight_parts' AS parts, s.stats -> 'flight_split' AS split"
    " FROM runs r LEFT JOIN run_stats s ON s.run_id = r.id WHERE r.id = %s"
)


def air_legs(
    times: Sequence[float], parts: Sequence[FlightPartBody]
) -> list[tuple[int, int]]:
    """The parts in the air as stretches of the track: from the first point
    inside each to the last one inside, as the app cuts its own
    (src/air/flightLegs.ts); a part with fewer than two points is left
    out."""
    legs: list[tuple[int, int]] = []
    for part in parts:
        if part.kind != "air":
            continue
        inside = [i for i, t in enumerate(times) if part.start_s <= t <= part.end_s]
        if len(inside) > 1:
            legs.append((inside[0], inside[-1]))
    return legs


def flight_of(conn: Connection[DictRow], run_id: int) -> ActivityFlightBody | None:
    """The race of run `run_id` as its page shows it; null for a flight
    without parts on foot, without figures, or with no part in the air
    left on the track."""
    row: dict[str, Any] | None = conn.execute(FLIGHT_OF_RUN, (run_id,)).fetchone()
    if row is None or row["split"] is None or not row["parts"] or not row["times"]:
        return None
    parts = [FlightPartBody.model_validate(part) for part in row["parts"]]
    legs = air_legs(row["times"], parts)
    if not legs:
        return None
    return ActivityFlightBody(
        air=legs, split=FlightSplitBody.model_validate(row["split"])
    )
