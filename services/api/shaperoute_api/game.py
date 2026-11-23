"""The shape game in the database, and its endpoints (TASK-296 part A,
ADR-0255, docs/GIOCO.md).

Each run saved in «My activities» gets its row in `game_runs`, in the same
transaction (activities.py calls after_run_saved): whether it counts, its
metres and its best times, by the pure rules of game_rules.py, then the two
rules that need the other runs of the account: a run sharing time with one
saved before does not count, and a day counts at most DAILY_CAP_M. The
shapes the account reached go in `game_unlocks`, where they stay.

GET /game/catalog needs no account: the app shows its «Play» page only
when it answers (ADR-0255). GET /game/me and GET /game/runs/{key} need one:
an account reads only its own game. Deleting a run takes its row away
(ON DELETE CASCADE), and its metres leave the totals; its shapes stay.
Deleting the account deletes both tables' rows.

Part C adds the teams and their challenges (game_teams.py,
game_challenges.py): after_run_saved also puts the run into the pieces its
runner holds, GET /game/runs/{key} says which pieces it finished, GET
/game/me shows the team edition too, and install_game installs their
endpoints, hooks and clock.
"""

from __future__ import annotations

import logging
from collections.abc import Callable, Container, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal, Protocol

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Path, Request
from psycopg import Connection
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field
from route_engine.track_score import TrackPoint

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.db import Database
from shaperoute_api.game_catalog import CATALOG, COLLECTIONS, GameShape
from shaperoute_api.game_challenges import (
    PieceDoneBody,
    fill,
    install_game_challenges,
    notify_pieces,
    pieces_done_bodies,
    pieces_done_by,
)
from shaperoute_api.game_personal_api import install_game_personal, record_personal
from shaperoute_api.game_prizes import EDITION_RUNS, has_editions
from shaperoute_api.game_prizes_api import (
    EditionUpBody,
    best_editions,
    collections_done_by,
    edition_counts,
    editions_by,
    install_game_prizes,
    record_editions,
    solo_unlocked,
)
from shaperoute_api.game_rules import (
    DAILY_CAP,
    OVERLAP,
    RULES_VERSION,
    DistanceGoal,
    Fix,
    RunGame,
    RunPause,
    Totals,
    capped_m,
    evaluate,
    progress,
    reached,
    totals_of,
)
from shaperoute_api.push import PushEvent, notify
from shaperoute_api.schemas import ErrorBody

log = logging.getLogger(__name__)

KEY_PATTERN = r"^[a-z0-9]{8,40}$"
UNKNOWN_RUN = "No activity with this key."

Reason = Literal["not_running", "vehicle", "overlap", "daily_cap"]


class _Pause(Protocol):
    """A pause of activities.recorded: seconds since the first fix."""

    @property
    def from_s(self) -> float: ...

    @property
    def to_s(self) -> float: ...

    @property
    def auto(self) -> bool: ...


# --- The bodies ---


class GoalBody(BaseModel):
    """What a shape asks: `total_m` in all, or `distance_m` in one run at
    `pace_s` a kilometre or better. Only these two kinds: the apps already
    installed refuse the whole catalog for a kind they do not know."""

    kind: Literal["distance", "pace"]
    total_m: int | None = None
    distance_m: int | None = None
    pace_s: int | None = None
    single_run: bool = Field(
        default=False,
        description="A milestone of one run (TASK-423): any run of distance_m.",
    )


class GameShapeBody(BaseModel):
    id: str
    names: dict[str, str] = Field(description="The name in en, de, it, es, fr.")
    goal: GoalBody
    outline: list[tuple[float, float]] = Field(
        description="Closed, from 0 to 1, y downwards as on a screen."
    )
    collection: str = Field(description="The id of its collection (TASK-423).")


class CollectionBody(BaseModel):
    id: str
    names: dict[str, str] = Field(description="The name in en, de, it, es, fr.")


class GameCatalogBody(BaseModel):
    rules_version: int
    shapes: list[GameShapeBody]
    collections: list[CollectionBody] = Field(
        description="In order; each shape names one (TASK-423)."
    )


class ShapeStateBody(BaseModel):
    id: str
    unlocked_at: datetime | None
    progress: float = Field(description="1 once unlocked; before, at most 0.99.")
    team_unlocked_at: datetime | None = Field(
        default=None, description="When a team's challenge gave the shape (part C)."
    )
    # The editions (TASK-423 part E): only for a pace or milestone shape.
    edition: Literal["bronze", "silver", "gold"] | None = Field(
        default=None,
        description="Bronze once unlocked, silver in 3 runs, gold in 10; null"
        " before, and for a shape of the total kilometres.",
    )
    edition_runs: int | None = Field(
        default=None,
        description="The counted runs that met its goal; null for a shape of"
        " the total kilometres.",
    )


class CollectionStateBody(BaseModel):
    id: str
    unlocked: int = Field(description="Its shapes the account unlocked.")
    total: int


class GameMeBody(BaseModel):
    """The game of the account: its totals and each shape of the catalog."""

    counted_m: int
    longest_m: int
    best_s: dict[str, float] = Field(
        description="The best moving seconds by distance in metres: {'1000': 287.4}."
    )
    shapes: list[ShapeStateBody]
    collections: list[CollectionStateBody] = Field(
        description="How far along each collection is, in catalog order (TASK-423)."
    )


class RunGameBody(BaseModel):
    """What one run was worth to the game, and the shapes it unlocked."""

    counted: bool
    reason: Reason | None
    counted_m: int
    best_s: dict[str, float]
    unlocked: list[str]
    pieces_done: list[PieceDoneBody] = Field(
        default_factory=list,
        description="The pieces of a team's challenge the run finished (part C).",
    )
    editions: list[EditionUpBody] = Field(
        default_factory=list,
        description="The silver and gold editions the run gave (TASK-423 E).",
    )
    collections_done: list[str] = Field(
        default_factory=list,
        description="The collections the run completed: a new frame (TASK-423 E).",
    )


def _goal(shape: GameShape) -> GoalBody:
    if isinstance(shape.goal, DistanceGoal):
        return GoalBody(kind="distance", total_m=shape.goal.total_m)
    return GoalBody(
        kind="pace",
        distance_m=shape.goal.distance_m,
        pace_s=shape.goal.pace_s,
        single_run=shape.goal.single_run,
    )


CATALOG_BODY = GameCatalogBody(
    rules_version=RULES_VERSION,
    shapes=[
        GameShapeBody(
            id=shape.id,
            names=shape.names,
            goal=_goal(shape),
            outline=list(shape.outline),
            collection=shape.collection,
        )
        for shape in CATALOG
    ],
    collections=[CollectionBody(id=c.id, names=c.names) for c in COLLECTIONS],
)


def collection_states(unlocked: Container[str]) -> list[CollectionStateBody]:
    """How many shapes of each collection are among `unlocked`."""
    return [
        CollectionStateBody(
            id=c.id,
            unlocked=sum(
                1 for s in CATALOG if s.collection == c.id and s.id in unlocked
            ),
            total=sum(1 for s in CATALOG if s.collection == c.id),
        )
        for c in COLLECTIONS
    ]


# --- A run, as the game records it ---


def after_run_saved(
    conn: Connection[DictRow],
    user_id: int,
    run_id: int,
    started_at: datetime,
    track: Sequence[TrackPoint],
    pauses: Sequence[_Pause],
    activity: str,
    now: datetime,
    utc_offset_min: int | None = None,
) -> list[str]:
    """In the transaction that saved the run, after its row: its game, the
    shapes it unlocked (returned), the pieces of its teams' challenges it
    filled (part C), the steps of the personal challenges it reached
    (TASK-423 part C) and the editions it gave (TASK-423 part E).
    `utc_offset_min`: the phone's clock against UTC, as the app sent it."""
    fixes = [Fix(p.lat, p.lon, p.time_s or 0.0) for p in track]
    kept = [RunPause(p.from_s, p.to_s, p.auto) for p in pauses]
    unlocked = record(
        conn,
        user_id,
        run_id,
        started_at,
        evaluate(fixes, kept, activity),
        now,
        utc_offset_min,
    )
    _fill_pieces(conn, user_id, run_id, started_at, now)
    record_personal(conn, user_id, run_id, now)
    record_editions(conn, user_id, run_id, now)
    return unlocked


def _fill_pieces(
    conn: Connection[DictRow],
    user_id: int,
    run_id: int,
    started_at: datetime,
    now: datetime,
) -> None:
    """The run into the pieces its runner holds (game_challenges.fill), with
    what it counted once the overlap and the day's cap are in: its row."""
    row = conn.execute(
        "SELECT counted, counted_m, best_s FROM game_runs WHERE run_id = %s",
        (run_id,),
    ).fetchone()
    if row is None or not row["counted"]:
        return
    best = {int(d): float(s) for d, s in row["best_s"].items()}
    fill(conn, user_id, run_id, started_at, int(row["counted_m"]), best, now)


def record(
    conn: Connection[DictRow],
    user_id: int,
    run_id: int,
    started_at: datetime,
    game: RunGame,
    unlocked_at: datetime,
    utc_offset_min: int | None = None,
) -> list[str]:
    """Writes the run's row, with the rules that need the account's other
    runs, then the shapes it unlocked: their ids, in catalog order. The
    caller holds the account's row locked (activities.save,
    game_backfill), so its runs change one at a time. `utc_offset_min`: the
    one the app sent (the backfill passes it on); without one, a row's own
    stays."""
    ended_at = started_at + timedelta(seconds=game.elapsed_s)
    counted, reason, metres, best = (
        game.counted,
        game.reason,
        game.counted_m,
        game.best_s,
    )
    if counted and _overlaps(conn, user_id, run_id, started_at, ended_at):
        counted, reason, metres, best = False, OVERLAP, 0, {}
    if counted:
        kept = capped_m(metres, _counted_on(conn, user_id, run_id, started_at))
        if kept < metres:
            reason, metres = DAILY_CAP, kept
    conn.execute(
        "INSERT INTO game_runs (run_id, user_id, rules_version, counted, reason,"
        " counted_m, best_s, started_at, ended_at, utc_offset_min)"
        " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        " ON CONFLICT (run_id) DO UPDATE SET rules_version = EXCLUDED.rules_version,"
        " counted = EXCLUDED.counted, reason = EXCLUDED.reason,"
        " counted_m = EXCLUDED.counted_m, best_s = EXCLUDED.best_s,"
        " started_at = EXCLUDED.started_at, ended_at = EXCLUDED.ended_at,"
        " utc_offset_min = coalesce(EXCLUDED.utc_offset_min,"
        " game_runs.utc_offset_min)",
        (
            run_id,
            user_id,
            RULES_VERSION,
            counted,
            reason,
            metres,
            Jsonb({str(d): s for d, s in best.items()}),
            started_at,
            ended_at,
            utc_offset_min,
        ),
    )
    return _unlock(conn, user_id, run_id, unlocked_at)


def _overlaps(
    conn: Connection[DictRow],
    user_id: int,
    run_id: int,
    started_at: datetime,
    ended_at: datetime,
) -> bool:
    """Whether a run saved before this one, and counted, shares its time."""
    row = conn.execute(
        "SELECT 1 FROM game_runs WHERE user_id = %s AND run_id < %s AND counted"
        " AND started_at < %s AND ended_at > %s LIMIT 1",
        (user_id, run_id, ended_at, started_at),
    ).fetchone()
    return row is not None


def _counted_on(
    conn: Connection[DictRow], user_id: int, run_id: int, started_at: datetime
) -> int:
    """The metres the account's runs saved before this one counted on its
    day (UTC)."""
    day = started_at.astimezone(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    row = conn.execute(
        "SELECT coalesce(sum(counted_m), 0) AS m FROM game_runs"
        " WHERE user_id = %s AND run_id < %s AND counted"
        " AND started_at >= %s AND started_at < %s",
        (user_id, run_id, day, day + timedelta(days=1)),
    ).fetchone()
    assert row is not None
    return int(row["m"])


def _totals(conn: Connection[DictRow], user_id: int) -> Totals:
    rows = conn.execute(
        "SELECT counted_m, best_s FROM game_runs WHERE user_id = %s AND counted",
        (user_id,),
    ).fetchall()
    return totals_of(
        (row["counted_m"], {int(d): float(s) for d, s in row["best_s"].items()})
        for row in rows
    )


def _unlock(
    conn: Connection[DictRow], user_id: int, run_id: int, unlocked_at: datetime
) -> list[str]:
    totals = _totals(conn, user_id)
    owned = {
        row["shape_id"]
        for row in conn.execute(
            "SELECT shape_id FROM game_unlocks WHERE user_id = %s AND edition = 'solo'",
            (user_id,),
        ).fetchall()
    }
    unlocked: list[str] = []
    for shape in CATALOG:
        if shape.id in owned or not reached(shape.goal, totals):
            continue
        conn.execute(
            "INSERT INTO game_unlocks (user_id, shape_id, edition, unlocked_at,"
            " run_id) VALUES (%s, %s, 'solo', %s, %s) ON CONFLICT DO NOTHING",
            (user_id, shape.id, unlocked_at, run_id),
        )
        unlocked.append(shape.id)
    return unlocked


# --- Reading the game ---


@dataclass
class Game:
    """The game of the accounts, in their database."""

    database: Database
    now: Callable[[], datetime]

    def me(self, user_id: int) -> GameMeBody:
        with self.database.connect() as conn:
            totals = _totals(conn, user_id)
            rows = conn.execute(
                "SELECT shape_id, edition, unlocked_at FROM game_unlocks"
                " WHERE user_id = %s",
                (user_id,),
            ).fetchall()
            runs = edition_counts(conn, user_id)
            best = best_editions(conn, user_id)
        unlocked = {
            r["shape_id"]: r["unlocked_at"] for r in rows if r["edition"] == "solo"
        }
        team = {r["shape_id"]: r["unlocked_at"] for r in rows if r["edition"] == "team"}

        def edition(shape_id: str) -> Literal["bronze", "silver", "gold"] | None:
            if shape_id not in runs or shape_id not in unlocked:
                return None
            return best.get(shape_id, "bronze")

        return GameMeBody(
            counted_m=totals.counted_m,
            longest_m=totals.longest_m,
            best_s={str(d): s for d, s in sorted(totals.best_s.items())},
            shapes=[
                ShapeStateBody(
                    id=shape.id,
                    unlocked_at=unlocked.get(shape.id),
                    progress=(
                        1.0 if shape.id in unlocked else progress(shape.goal, totals)
                    ),
                    team_unlocked_at=team.get(shape.id),
                    edition=edition(shape.id),
                    edition_runs=runs.get(shape.id) if has_editions(shape) else None,
                )
                for shape in CATALOG
            ],
            collections=collection_states(unlocked.keys()),
        )

    def run(self, user_id: int, key: str) -> RunGameBody | None:
        """The game of the account's run `key`; None for a run it does not
        have, or one the game has not computed yet."""
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT g.run_id, g.counted, g.reason, g.counted_m, g.best_s"
                " FROM runs r JOIN game_runs g ON g.run_id = r.id"
                " WHERE r.user_id = %s AND r.key = %s",
                (user_id, key),
            ).fetchone()
            if row is None:
                return None
            shapes = _unlocked_by(conn, user_id, row["run_id"])
            pieces = pieces_done_by(conn, user_id, row["run_id"])
            editions = editions_by(conn, user_id, row["run_id"])
            done = collections_done_by(solo_unlocked(conn, user_id), shapes)
        return RunGameBody(
            counted=row["counted"],
            reason=row["reason"],
            counted_m=row["counted_m"],
            best_s=row["best_s"],
            unlocked=shapes,
            pieces_done=pieces_done_bodies(pieces),
            editions=editions,
            collections_done=done,
        )


def _unlocked_by(conn: Connection[DictRow], user_id: int, run_id: int) -> list[str]:
    """The shapes the run unlocked, in catalog order."""
    rows = conn.execute(
        "SELECT shape_id FROM game_unlocks"
        " WHERE user_id = %s AND run_id = %s AND edition = 'solo'",
        (user_id, run_id),
    ).fetchall()
    found = {row["shape_id"] for row in rows}
    return [shape.id for shape in CATALOG if shape.id in found]


# What the pushes of part E name: the shape or the collection, by language;
# an edition by its runs (push.py words it).
SHAPE_NAMES: dict[str, dict[str, str]] = {s.id: dict(s.names) for s in CATALOG}
COLLECTION_NAMES: dict[str, dict[str, str]] = {c.id: dict(c.names) for c in COLLECTIONS}
EDITION_NUMBER: dict[str, int] = dict(EDITION_RUNS)


def notify_unlocked(request: Request, user_id: int, key: str) -> None:
    """After a new run is saved, outside its transaction: one push if it
    unlocked shapes, however many (push.py; the app does not show it while
    open): with 94 shapes a run can unlock ten at once (TASK-423). One if it
    gave an edition, one if it completed a collection (TASK-423 part E).
    Then the pushes of the teams' challenges it filled (game_challenges.py).
    Never raises. The backfill sends none."""
    accounts: Accounts | None = getattr(request.app.state, "accounts", None)
    if accounts is None:
        return
    try:
        game = Game(accounts.database, accounts.now).run(user_id, key)
    except Exception:
        log.exception("game: the shapes of a run were not read")
        game = None
    if game is not None and game.unlocked:
        notify(
            request, PushEvent("shape_unlocked", user_id, user_id, key=game.unlocked[0])
        )
    # TASK-423 part E: one push for the first edition the run gave, one for
    # the first collection it completed, however many.
    if game is not None and game.editions:
        first = game.editions[0]
        notify(
            request,
            PushEvent(
                "edition_up",
                user_id,
                user_id,
                key=f"{first.shape_id}:{first.edition}",
                number=EDITION_NUMBER[first.edition],
                names=SHAPE_NAMES[first.shape_id],
            ),
        )
    if game is not None and game.collections_done:
        done = game.collections_done[0]
        notify(
            request,
            PushEvent(
                "collection_done",
                user_id,
                user_id,
                key=done,
                names=COLLECTION_NAMES[done],
            ),
        )
    notify_pieces(request, user_id, key)


# --- The endpoints ---


def game_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> Game:
    """In the database of the accounts, on the same clock."""
    return Game(accounts.database, accounts.now)


def game_routes() -> APIRouter:
    router = APIRouter(tags=["game"])

    # No account: the app asks it to know whether to show «Play».
    @router.get("/game/catalog")
    def game_catalog() -> GameCatalogBody:
        return CATALOG_BODY

    @router.get("/game/me", responses=ACCOUNT_ERRORS)
    def game_me(
        game: Annotated[Game, Depends(game_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> GameMeBody:
        return game.me(user.id)

    @router.get(
        "/game/runs/{key}",
        responses={**ACCOUNT_ERRORS, 404: {"model": ErrorBody}},
    )
    def game_run(
        key: Annotated[str, Path(pattern=KEY_PATTERN)],
        game: Annotated[Game, Depends(game_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> RunGameBody:
        found = game.run(user.id, key)
        if found is None:
            raise HTTPException(404, UNKNOWN_RUN)
        return found

    return router


def install_game(app: FastAPI) -> None:
    """The shape game: the collection (part A), the teams and their
    challenges (part C). After install_accounts, which sets the database and
    the errors, and after install_push and install_moderation, whose pusher
    and hooks the teams use."""
    # Here, not at the top: game_teams imports follows and comments, which
    # import activities, which imports this module.
    from shaperoute_api.game_teams import install_game_teams

    app.include_router(game_routes())
    install_game_teams(app)
    install_game_challenges(app)
    install_game_personal(app)
    install_game_prizes(app)


def kept_run(row: dict[str, Any]) -> tuple[list[Fix], list[RunPause]]:
    """A run of the `runs` table as the rules read it: the track from
    ST_AsText ("LINESTRING M (lon lat m, …)") and the pauses' column."""
    text: str = row["track"]
    inside = text[text.index("(") + 1 : text.rindex(")")]
    fixes = []
    for point in inside.split(","):
        lon, lat, m = (float(v) for v in point.split())
        fixes.append(Fix(lat, lon, m))
    pauses = [
        RunPause(float(p["from_s"]), float(p["to_s"]), bool(p["auto"]))
        for p in row["pauses"]
    ]
    return fixes, pauses
