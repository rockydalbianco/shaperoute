"""The prizes of the shape game in the database, and their endpoints
(TASK-423 part E, ADR-0351, docs/GIOCO.md §5.4).

The silver and gold editions are rows of `game_unlocks`, written in the
transaction that saved the run that reached them (`record_editions`, called
by game.after_run_saved), or by the backfill with the run that reached them
(`backfill_editions`, no push). Frames, titles and badges are not kept:
they are read from what the game keeps already, by the pure rules of
game_prizes.py.

GET /game/prizes: the account's frames, titles and badges, reached or not,
its editions and what it chose to show. PUT /game/prizes/shown: the choice
of the public profile (one frame, one title, up to 3 badges), only among
the prizes it has. The profile (profiles.py) shows `shown_prizes`: the
choice, without what the account no longer has. Nothing is shown by default.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, FastAPI
from psycopg import Connection
from psycopg.rows import DictRow
from pydantic import BaseModel, Field

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.db import Database
from shaperoute_api.game_catalog import CATALOG, COLLECTIONS
from shaperoute_api.game_personal import Outing, streak, week_counts
from shaperoute_api.game_prizes import (
    BADGE_IDS,
    BADGES,
    EDITION_RUNS,
    EDITION_SHAPES,
    MAX_SHOWN_BADGES,
    TITLE_IDS,
    TITLES,
    Edition,
    Facts,
    PrizeState,
    complete_collections,
    editions_of,
    got,
    meets,
    pace_goal,
    states,
)
from shaperoute_api.game_rules import totals_of

NOT_YOURS = "You can show only the prizes you have."
TOO_MANY_BADGES = f"You can show at most {MAX_SHOWN_BADGES} badges."

# --- The bodies ---


class EditionUpBody(BaseModel):
    shape_id: str
    edition: Literal["silver", "gold"]


class FrameBody(BaseModel):
    id: str = Field(description="The collection's id: its frame.")
    got: bool
    unlocked: int
    total: int


class PrizeStateBody(BaseModel):
    id: str
    got: bool
    value: float = Field(description="How far along, in the prize's own unit.")
    target: float


class EditionsBody(BaseModel):
    silver: int
    gold: int


class ShownBody(BaseModel):
    """What the account shows of the game on its public profile."""

    frame: str | None = None
    title: str | None = None
    badges: list[str] = Field(
        default_factory=list, description=f"At most {MAX_SHOWN_BADGES}, in order."
    )


class GamePrizesBody(BaseModel):
    frames: list[FrameBody] = Field(description="One per collection, in order.")
    titles: list[PrizeStateBody]
    badges: list[PrizeStateBody]
    editions: EditionsBody
    shown: ShownBody


# --- The editions ---


def _counted_bests(
    conn: Connection[DictRow], user_id: int
) -> list[tuple[int, datetime, dict[int, float]]]:
    """The account's counted runs, in the order they were saved: id, end
    and best times."""
    rows = conn.execute(
        "SELECT run_id, ended_at, best_s FROM game_runs"
        " WHERE user_id = %s AND counted ORDER BY run_id",
        (user_id,),
    ).fetchall()
    return [
        (
            int(r["run_id"]),
            r["ended_at"],
            {int(d): float(s) for d, s in r["best_s"].items()},
        )
        for r in rows
    ]


def _held(conn: Connection[DictRow], user_id: int) -> set[tuple[str, str]]:
    rows = conn.execute(
        "SELECT shape_id, edition FROM game_unlocks"
        " WHERE user_id = %s AND edition IN ('silver', 'gold')",
        (user_id,),
    ).fetchall()
    return {(r["shape_id"], r["edition"]) for r in rows}


def edition_counts(conn: Connection[DictRow], user_id: int) -> dict[str, int]:
    """For each shape with editions, how many counted runs meet its goal."""
    runs = [best for _, _, best in _counted_bests(conn, user_id)]
    return {
        shape.id: sum(1 for best in runs if meets(pace_goal(shape), best))
        for shape in EDITION_SHAPES
    }


def record_editions(
    conn: Connection[DictRow], user_id: int, run_id: int, at: datetime
) -> list[EditionUpBody]:
    """In the transaction that saved the run, after its game row: the
    editions the account now reached and did not hold, given by this run."""
    held = _held(conn, user_id)
    new: list[EditionUpBody] = []
    for shape_id, runs in edition_counts(conn, user_id).items():
        for edition in editions_of(runs):
            if (shape_id, edition) in held:
                continue
            conn.execute(
                "INSERT INTO game_unlocks (user_id, shape_id, edition, unlocked_at,"
                " run_id) VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
                (user_id, shape_id, edition, at, run_id),
            )
            new.append(EditionUpBody(shape_id=shape_id, edition=edition))
    return new


def backfill_editions(conn: Connection[DictRow], user_id: int) -> int:
    """The editions of the account's runs saved before part E, each with
    the run that reached it, at its end. No push. Run again, it adds
    nothing."""
    held = _held(conn, user_id)
    runs = _counted_bests(conn, user_id)
    added = 0
    for shape in EDITION_SHAPES:
        meeting = [
            (rid, end) for rid, end, best in runs if meets(pace_goal(shape), best)
        ]
        for edition, needed in EDITION_RUNS:
            if len(meeting) < needed or (shape.id, edition) in held:
                continue
            run_id, ended_at = meeting[needed - 1]
            conn.execute(
                "INSERT INTO game_unlocks (user_id, shape_id, edition, unlocked_at,"
                " run_id) VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
                (user_id, shape.id, edition, ended_at, run_id),
            )
            added += 1
    return added


def editions_by(
    conn: Connection[DictRow], user_id: int, run_id: int
) -> list[EditionUpBody]:
    """The editions a run gave, in catalog order, silver before gold."""
    rows = conn.execute(
        "SELECT shape_id, edition FROM game_unlocks WHERE user_id = %s"
        " AND run_id = %s AND edition IN ('silver', 'gold')",
        (user_id, run_id),
    ).fetchall()
    found = {(r["shape_id"], r["edition"]) for r in rows}
    return [
        EditionUpBody(shape_id=shape.id, edition=edition)
        for shape in EDITION_SHAPES
        for edition, _ in EDITION_RUNS
        if (shape.id, edition) in found
    ]


def best_editions(conn: Connection[DictRow], user_id: int) -> dict[str, Edition]:
    """The highest edition the account holds of each shape that has one."""
    held = _held(conn, user_id)
    out: dict[str, Edition] = {}
    for shape_id, edition in held:
        if out.get(shape_id) != "gold":
            out[shape_id] = "gold" if edition == "gold" else "silver"
    return out


# --- The collections ---


def solo_unlocked(conn: Connection[DictRow], user_id: int) -> set[str]:
    return {
        r["shape_id"]
        for r in conn.execute(
            "SELECT shape_id FROM game_unlocks WHERE user_id = %s AND edition = 'solo'",
            (user_id,),
        ).fetchall()
    }


def collections_done_by(unlocked: set[str], unlocked_by_run: list[str]) -> list[str]:
    """The collections a run completed: complete now, with a shape the run
    unlocked."""
    touched = {s.collection for s in CATALOG if s.id in unlocked_by_run}
    return [c for c in complete_collections(unlocked) if c in touched]


# --- Titles and badges ---


def facts_of(conn: Connection[DictRow], user_id: int) -> Facts:
    """What the prizes read of an account."""
    rows = conn.execute(
        "SELECT g.started_at, g.utc_offset_min, g.counted_m, g.best_s,"
        " r.activity = 'running' AS running"
        " FROM game_runs g JOIN runs r ON r.id = g.run_id"
        " WHERE g.user_id = %s AND g.counted",
        (user_id,),
    ).fetchall()
    outings = [
        Outing(
            started_at=r["started_at"],
            utc_offset_min=r["utc_offset_min"],
            counted_m=r["counted_m"],
            running=bool(r["running"]),
            best_s={int(d): float(s) for d, s in r["best_s"].items()},
        )
        for r in rows
    ]
    totals = totals_of((o.counted_m, o.best_s) for o in outings)
    # The longest streak does not depend on the week asked from.
    longest = streak(week_counts(outings), date(2000, 1, 3), 1).best
    counts = conn.execute(
        "SELECT"
        " (SELECT count(*) FROM game_personal WHERE user_id = %s) AS medals,"
        " (SELECT count(*) FROM game_unlocks WHERE user_id = %s"
        "  AND edition = 'gold') AS gold,"
        " (SELECT count(DISTINCT c.id) FROM game_challenges c"
        "  JOIN game_contributions gc ON gc.challenge_id = c.id"
        "  WHERE gc.user_id = %s AND c.completed_at IS NOT NULL) AS team",
        (user_id, user_id, user_id),
    ).fetchone()
    assert counts is not None
    return Facts(
        counted_m=totals.counted_m,
        best_s=totals.best_s,
        longest_streak=longest,
        collections_done=len(complete_collections(solo_unlocked(conn, user_id))),
        medals=int(counts["medals"]),
        gold_editions=int(counts["gold"]),
        team_challenges=int(counts["team"]),
    )


def _state_body(state: PrizeState) -> PrizeStateBody:
    return PrizeStateBody(
        id=state.id, got=state.got, value=state.value, target=state.target
    )


def _shown(conn: Connection[DictRow], user_id: int) -> ShownBody:
    row = conn.execute(
        "SELECT frame, title, badges FROM game_prefs WHERE user_id = %s", (user_id,)
    ).fetchone()
    if row is None:
        return ShownBody()
    return ShownBody(frame=row["frame"], title=row["title"], badges=list(row["badges"]))


def shown_prizes(conn: Connection[DictRow], user_id: int) -> ShownBody | None:
    """What the public profile shows of the game: the account's choice,
    without what it no longer has; None when nothing is chosen."""
    chosen = _shown(conn, user_id)
    if chosen.frame is None and chosen.title is None and not chosen.badges:
        return None
    facts = facts_of(conn, user_id)
    frames = set(complete_collections(solo_unlocked(conn, user_id)))
    titles, badges = got(TITLES, facts), got(BADGES, facts)
    kept = ShownBody(
        frame=chosen.frame if chosen.frame in frames else None,
        title=chosen.title if chosen.title in titles else None,
        badges=[b for b in chosen.badges if b in badges],
    )
    if kept.frame is None and kept.title is None and not kept.badges:
        return None
    return kept


@dataclass
class Prizes:
    database: Database
    now: Callable[[], datetime]

    def of(self, user_id: int) -> GamePrizesBody:
        with self.database.connect() as conn:
            return self._of(conn, user_id)

    def _of(self, conn: Connection[DictRow], user_id: int) -> GamePrizesBody:
        facts = facts_of(conn, user_id)
        unlocked = solo_unlocked(conn, user_id)
        done = set(complete_collections(unlocked))
        held = _held(conn, user_id)
        return GamePrizesBody(
            frames=[
                FrameBody(
                    id=c.id,
                    got=c.id in done,
                    unlocked=sum(
                        1 for s in CATALOG if s.collection == c.id and s.id in unlocked
                    ),
                    total=sum(1 for s in CATALOG if s.collection == c.id),
                )
                for c in COLLECTIONS
            ],
            titles=[_state_body(s) for s in states(TITLES, facts)],
            badges=[_state_body(s) for s in states(BADGES, facts)],
            editions=EditionsBody(
                silver=sum(1 for _, e in held if e == "silver"),
                gold=sum(1 for _, e in held if e == "gold"),
            ),
            shown=_shown(conn, user_id),
        )

    def show(self, user_id: int, body: ShownBody) -> GamePrizesBody:
        """The choice of the profile, only among the prizes the account has."""
        if len(body.badges) > MAX_SHOWN_BADGES:
            raise AccountError(422, "invalid_request", TOO_MANY_BADGES)
        badges = list(dict.fromkeys(body.badges))
        with self.database.connect() as conn:
            facts = facts_of(conn, user_id)
            frames = set(complete_collections(solo_unlocked(conn, user_id)))
            mine = (
                (body.frame is None or body.frame in frames)
                and (body.title is None or body.title in got(TITLES, facts))
                and all(b in got(BADGES, facts) for b in badges)
            )
            known = (body.title is None or body.title in TITLE_IDS) and all(
                b in BADGE_IDS for b in badges
            )
            if not (mine and known):
                raise AccountError(422, "invalid_request", NOT_YOURS)
            conn.execute(
                "INSERT INTO game_prefs (user_id, frame, title, badges, updated_at)"
                " VALUES (%s, %s, %s, %s, %s) ON CONFLICT (user_id) DO UPDATE SET"
                " frame = EXCLUDED.frame, title = EXCLUDED.title,"
                " badges = EXCLUDED.badges, updated_at = EXCLUDED.updated_at",
                (user_id, body.frame, body.title, badges, self.now()),
            )
            return self._of(conn, user_id)


# --- The endpoints ---


def prizes_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> Prizes:
    return Prizes(accounts.database, accounts.now)


def prizes_routes() -> APIRouter:
    router = APIRouter(tags=["game"])

    @router.get("/game/prizes", responses=ACCOUNT_ERRORS)
    def game_prizes(
        prizes: Annotated[Prizes, Depends(prizes_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> GamePrizesBody:
        return prizes.of(user.id)

    @router.put("/game/prizes/shown", responses=ACCOUNT_ERRORS)
    def game_prizes_shown(
        body: ShownBody,
        prizes: Annotated[Prizes, Depends(prizes_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> GamePrizesBody:
        return prizes.show(user.id, body)

    return router


def install_game_prizes(app: FastAPI) -> None:
    app.include_router(prizes_routes())
