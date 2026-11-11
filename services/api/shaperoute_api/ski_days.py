"""A day of skiing's resort, gear and snow (TASK-406 part D1, ADR-0338,
migration 0056).

PUT /me/activities/{key}/ski: the skier's own, written after the day is
saved, as its post (activities.py, `/post`), so the day itself is sent as
before. Only on a day of skiing; written whole, the last one wins.

GET /drawings/{id}/ski-day: on the post, for whoever can see it, as the
lifts and pistes (ski_names_api.py): who cannot open the drawing, or an app
that does not read skiing (X-MuW-Reads, TASK-387), finds nothing.

Since TASK-429 part C1 (ADR-0357) the GET also has the day's lifts and
descents, with the fixes they cover and their names (ski_day_parts.py),
when the phone sent them: `parts`, missing on a day without them and on the
PUT's answer.

GET /ski-resorts/{id}/snow: the snow the members marked at the resort in
the last 24 hours, only from the days whose post the asker sees on a
profile (drawings.shown_sql), and only how many of each: never who.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime, timedelta
from typing import Annotated, Any, Literal, cast, get_args
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Path, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import UNKNOWN_ACTIVITY, Key
from shaperoute_api.drawings import NO_DRAWING, drawing_seen_sql, shown_sql
from shaperoute_api.reads import Shown
from shaperoute_api.schemas import ErrorBody
from shaperoute_api.ski_day_parts import (
    NamesCache,
    SkiDayPartBody,
    day_parts,
    namer_of,
    stored_parts,
)
from shaperoute_api.ski_resorts_api import NO_RESORT

SnowType = Literal["powder", "groomed", "icy", "spring", "heavy"]
SNOW_TYPES: tuple[SnowType, ...] = get_args(SnowType)
MAX_GEAR = 60
SNOW_HOURS = 24

ONLY_SKIING = "Only a day of skiing has a resort, gear and snow."


class SkiDayRequestBody(BaseModel):
    """PUT /me/activities/{key}/ski: what the skier gave of the day:
    packages/shared-types/fixtures/ski-day-request.json. Null for what was
    not given."""

    model_config = ConfigDict(extra="forbid")

    resort_id: str | None = Field(default=None, min_length=1, max_length=80)
    """A resort of GET /ski-resorts."""
    gear: str | None = Field(default=None, max_length=MAX_GEAR)
    """Free text, «ski» or «snowboard» with brand and model; blank is none."""
    snow: SnowType | None = None

    @field_validator("gear")
    @classmethod
    def blank_is_none(cls, gear: str | None) -> str | None:
        if gear is None:
            return None
        gear = " ".join(gear.split())
        return gear or None


class SkiDayResortBody(BaseModel):
    id: str
    name: str


class SkiDayBody(BaseModel):
    """The day's resort, gear and snow:
    packages/shared-types/fixtures/ski-day.json. All null for a day without
    them, and for any other sport."""

    resort: SkiDayResortBody | None
    gear: str | None
    snow: SnowType | None


class SkiDayPartsBody(SkiDayBody):
    """GET /drawings/{id}/ski-day: the day, and its lifts and descents
    (TASK-429 part C1) when its figures have them; without them, the day as
    before, with no `parts` at all. An app before them reads past it."""

    parts: list[SkiDayPartBody] | None = None


class SnowCountBody(BaseModel):
    snow: SnowType
    days: int = Field(ge=1)


class ResortSnowBody(BaseModel):
    """GET /ski-resorts/{id}/snow: packages/shared-types/fixtures/resort-snow.json."""

    resort_id: str
    since: datetime
    """The start of the 24 hours: a day counts when it ended after it."""
    snow: list[SnowCountBody]
    """The types marked, the most marked first, then in SNOW_TYPES' order;
    empty when nobody marked one."""


NO_DAY = SkiDayBody(resort=None, gear=None, snow=None)

# The track of a run as (lat, lon, seconds from its first fix), in order.
DAY_FIXES = (
    "SELECT array_agg(ARRAY[ST_Y(p.geom), ST_X(p.geom), ST_M(p.geom)]"
    " ORDER BY p.path[1]) AS fixes FROM runs r, ST_DumpPoints(r.track) AS p"
    " WHERE r.id = %s"
)


def _day(row: Mapping[str, Any]) -> SkiDayBody:
    resort_id, name = row["ski_resort_id"], row["resort_name"]
    return SkiDayBody(
        resort=(
            None
            if resort_id is None or name is None
            else SkiDayResortBody(id=resort_id, name=name)
        ),
        gear=row["ski_gear"],
        snow=row["snow"],
    )


def snow_counts(rows: list[tuple[SnowType, int]]) -> list[SnowCountBody]:
    """The counts in the answer's order: the most marked first."""
    return [
        SnowCountBody(snow=snow, days=days)
        for snow, days in sorted(
            rows, key=lambda row: (-row[1], SNOW_TYPES.index(row[0]))
        )
    ]


def ski_days_routes() -> APIRouter:
    router = APIRouter(tags=["ski resorts"], responses=ACCOUNT_ERRORS)

    @router.put(
        "/me/activities/{key}/ski",
        responses={404: {"model": ErrorBody}, 422: {"model": ErrorBody}},
    )
    def keep_ski_day(
        key: Key,
        body: SkiDayRequestBody,
        accounts: Annotated[Accounts, Depends(accounts_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> SkiDayBody:
        with accounts.database.connect() as conn:
            run = conn.execute(
                "SELECT activity FROM runs WHERE user_id = %s AND key = %s",
                (user.id, key),
            ).fetchone()
            if run is None:
                raise HTTPException(404, UNKNOWN_ACTIVITY)
            if run["activity"] != "skiing":
                raise HTTPException(422, ONLY_SKIING)
            if body.resort_id is not None:
                known = conn.execute(
                    "SELECT 1 FROM ski_resorts WHERE id = %s", (body.resort_id,)
                ).fetchone()
                if known is None:
                    raise HTTPException(422, NO_RESORT)
            row = conn.execute(
                "WITH kept AS (UPDATE runs SET ski_resort_id = %s, ski_gear = %s,"
                " snow = %s WHERE user_id = %s AND key = %s"
                " RETURNING ski_resort_id, ski_gear, snow)"
                " SELECT kept.*, s.name AS resort_name FROM kept"
                " LEFT JOIN ski_resorts s ON s.id = kept.ski_resort_id",
                (body.resort_id, body.gear, body.snow, user.id, key),
            ).fetchone()
        if row is None:
            raise HTTPException(404, UNKNOWN_ACTIVITY)
        return _day(row)

    @router.get(
        "/drawings/{drawing_id}/ski-day",
        responses={404: {"model": ErrorBody}},
        # `parts` only when the day has them: the answer is otherwise as
        # before TASK-429.
        response_model_exclude_unset=True,
    )
    def ski_day(
        drawing_id: str,
        request: Request,
        accounts: Annotated[Accounts, Depends(accounts_of)],
        user: Annotated[UserBody, Depends(current_user)],
        reads: Shown,
    ) -> SkiDayPartsBody:
        try:
            wanted = UUID(drawing_id)
        except ValueError:
            raise HTTPException(404, NO_DRAWING) from None
        with accounts.database.connect() as conn:
            row = conn.execute(
                "SELECT r.id AS run_id, r.activity, r.ski_resort_id, r.ski_gear,"
                " r.snow, s.name AS resort_name, rs.stats, rs.updated_at"
                " FROM drawings d JOIN runs r ON r.id = d.run_id"
                " LEFT JOIN ski_resorts s ON s.id = r.ski_resort_id"
                " LEFT JOIN run_stats rs ON rs.run_id = r.id"
                f" WHERE d.id = %s AND {drawing_seen_sql('%s')}"
                f" AND {reads.sql('r.activity', 'r.track IS NOT NULL')}",
                (wanted, user.id),
            ).fetchone()
            if row is None:
                raise HTTPException(404, NO_DRAWING)
            if row["activity"] != "skiing":
                return SkiDayPartsBody(**NO_DAY.model_dump())
            day = _day(row).model_dump()
            stored = stored_parts(row["stats"])
            if not stored:
                return SkiDayPartsBody(**day)
            cache: NamesCache = request.app.state.ski_day_parts

            def make() -> list[SkiDayPartBody]:
                fixes = conn.execute(DAY_FIXES, (row["run_id"],)).fetchone()
                return day_parts(
                    stored,
                    [tuple(fix) for fix in (fixes["fixes"] or [])],
                    namer_of(getattr(request.app.state, "ski_dir", None)),
                )

            key = (int(row["run_id"]), str(row["updated_at"]))
            return SkiDayPartsBody(**day, parts=cache.get(key, make))

    @router.get("/ski-resorts/{resort_id}/snow", responses={404: {"model": ErrorBody}})
    def resort_snow(
        resort_id: Annotated[str, Path(max_length=80)],
        accounts: Annotated[Accounts, Depends(accounts_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> ResortSnowBody:
        since = accounts.now() - timedelta(hours=SNOW_HOURS)
        with accounts.database.connect() as conn:
            known = conn.execute(
                "SELECT 1 FROM ski_resorts WHERE id = %s", (resort_id,)
            ).fetchone()
            if known is None:
                raise HTTPException(404, NO_RESORT)
            # The index starts from the resort; a day lasts less than 24
            # hours, so one that ended after `since` started after the
            # day before.
            rows = conn.execute(
                "SELECT r.snow, count(DISTINCT r.id) AS days"
                " FROM runs r JOIN drawings d ON d.run_id = r.id"
                " WHERE r.ski_resort_id = %s AND r.snow IS NOT NULL"
                " AND r.activity = 'skiing'"
                " AND r.started_at > %s - interval '24 hours'"
                " AND r.started_at + make_interval(secs => r.duration_s) > %s"
                f" AND {shown_sql('%s')}"
                " GROUP BY r.snow",
                (resort_id, since, since, user.id),
            ).fetchall()
        return ResortSnowBody(
            resort_id=resort_id,
            since=since,
            snow=snow_counts(
                [(cast(SnowType, row["snow"]), row["days"]) for row in rows]
            ),
        )

    return router


def install_ski_days(app: FastAPI) -> None:
    """The resort, gear and snow of the days of skiing; after
    install_accounts, which sets the database and the errors."""
    app.state.ski_day_parts = NamesCache()
    app.include_router(ski_days_routes())
