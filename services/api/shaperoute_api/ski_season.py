"""The season of a skier (TASK-429 part C1, ADR-0357).

GET /me/ski-season?from=YYYY-MM-DD&to=YYYY-MM-DD: the account's own days of
skiing that began between the two days (both counted, by UTC), and the sums
of their lifts and descents as the phone sent them (`ski_parts` of the
run's figures, TASK-424 part C2b, ski_day_parts.py). Only the asker's own
days, only numbers. A day saved before the parts counts as a day, nothing
more (the user's choice of 2026-11-10).
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.schemas import ErrorBody
from shaperoute_api.ski_day_parts import StoredPartBody, stored_parts

# A season is a winter: asking for more is a mistake.
MAX_SEASON_DAYS = 400
LONG_SEASON = f"A season is at most {MAX_SEASON_DAYS} days."
BACKWARDS = "«to» comes before «from»."


class SkiSeasonBody(BaseModel):
    """packages/shared-types/fixtures/ski-season.json."""

    from_day: date = Field(serialization_alias="from")
    to_day: date = Field(serialization_alias="to")
    days: int = Field(ge=0)
    """Every day of skiing in the season."""
    days_with_parts: int = Field(ge=0)
    """Those whose lifts and descents the phone sent: the sums below are
    theirs."""
    skied_m: float = Field(ge=0)
    """The metres of the descents."""
    vertical_m: float = Field(ge=0)
    """The metres skied down."""
    descents: int = Field(ge=0)
    lifts: int = Field(ge=0)
    top_mps: float | None
    """The fastest descent's top speed; null without one."""
    moving_s: float = Field(ge=0)
    """The time on the move, lifts and descents."""


def season_of(
    from_day: date, to_day: date, days: Iterable[Sequence[StoredPartBody]]
) -> SkiSeasonBody:
    """The sums of `days`, each the parts of one day (none for a day saved
    before them)."""
    count = with_parts = descents = lifts = 0
    skied = vertical = moving = 0.0
    top: float | None = None
    for parts in days:
        count += 1
        if not parts:
            continue
        with_parts += 1
        for part in parts:
            moving += part.moving_s
            if part.kind == "lift":
                lifts += 1
                continue
            descents += 1
            skied += part.metres
            vertical += part.height_m
            if part.top_mps is not None and (top is None or part.top_mps > top):
                top = part.top_mps
    return SkiSeasonBody(
        from_day=from_day,
        to_day=to_day,
        days=count,
        days_with_parts=with_parts,
        skied_m=round(skied, 1),
        vertical_m=round(vertical, 1),
        descents=descents,
        lifts=lifts,
        top_mps=top,
        moving_s=round(moving, 1),
    )


def ski_season_routes() -> APIRouter:
    router = APIRouter(tags=["ski resorts"], responses=ACCOUNT_ERRORS)

    @router.get(
        "/me/ski-season",
        responses={422: {"model": ErrorBody}},
        response_model_by_alias=True,
    )
    def ski_season(
        from_day: Annotated[date, Query(alias="from")],
        to_day: Annotated[date, Query(alias="to")],
        accounts: Annotated[Accounts, Depends(accounts_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> SkiSeasonBody:
        if to_day < from_day:
            raise HTTPException(422, BACKWARDS)
        if (to_day - from_day).days + 1 > MAX_SEASON_DAYS:
            raise HTTPException(422, LONG_SEASON)
        since = datetime.combine(from_day, time.min, tzinfo=UTC)
        until = datetime.combine(to_day + timedelta(days=1), time.min, tzinfo=UTC)
        with accounts.database.connect() as conn:
            rows: list[Mapping[str, Any]] = conn.execute(
                "SELECT rs.stats FROM runs r"
                " LEFT JOIN run_stats rs ON rs.run_id = r.id"
                " WHERE r.user_id = %s AND r.activity = 'skiing'"
                " AND r.started_at >= %s AND r.started_at < %s",
                (user.id, since, until),
            ).fetchall()
        return season_of(from_day, to_day, (stored_parts(row["stats"]) for row in rows))

    return router


def install_ski_season(app: FastAPI) -> None:
    """The season's sums of the days of skiing; after install_accounts,
    which sets the database and the errors."""
    app.include_router(ski_season_routes())
