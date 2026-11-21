"""A night of sleep as others read it, and its place in a drawing that is
seen (TASK-467 parts B1 and B1b, ADR-0380, docs/API.md, «Sleep»).

Apart from sleep.py so that drawings.py can say it: sleep.py reads who sees
a drawing from drawings.py, and a drawing in a list carries the night its
owner shows in the post (`sleep`), so that a Feed asks nothing more for it.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# A night is within a day.
MAX_NIGHT_MIN = 1_440


class SleepStagesBody(BaseModel):
    """The minutes in each stage a watch told: Apple Health's «REM», «Core»
    (MuW's «Light») and «Deep»."""

    model_config = ConfigDict(extra="forbid")

    rem_min: int = Field(ge=0, le=MAX_NIGHT_MIN)
    light_min: int = Field(ge=0, le=MAX_NIGHT_MIN)
    deep_min: int = Field(ge=0, le=MAX_NIGHT_MIN)


class SleepSummaryBody(BaseModel):
    """A night as others read it: fixtures/sleep-summary.json."""

    night: date = Field(description="The day the person woke up.")
    score: int
    asleep_min: int
    awake_min: int
    stages: SleepStagesBody | None = None


# The night in the post of a drawing, for a query that names its run `r`:
# only while its owner shows it (`sleep_shown`), the rule of GET
# /drawings/{id}/sleep for anyone but the owner. One row by a primary key.
SEEN_SLEEP_SQL = (
    "(SELECT jsonb_build_object('night', n.night, 'score', n.score,"
    " 'asleep_min', n.asleep_min, 'awake_min', n.awake_min,"
    " 'rem_min', n.rem_min, 'light_min', n.light_min, 'deep_min', n.deep_min)"
    " FROM sleep_nights n WHERE n.id = r.sleep_night_id AND r.sleep_shown)"
)


def seen_sleep(found: dict[str, Any] | None) -> SleepSummaryBody | None:
    """What `SEEN_SLEEP_SQL` found, as a drawing says it; None without a
    night shown."""
    if found is None:
        return None
    stages = None
    if found["rem_min"] is not None:
        stages = SleepStagesBody(
            rem_min=found["rem_min"],
            light_min=found["light_min"],
            deep_min=found["deep_min"],
        )
    return SleepSummaryBody(
        night=found["night"],
        score=found["score"],
        asleep_min=found["asleep_min"],
        awake_min=found["awake_min"],
        stages=stages,
    )
