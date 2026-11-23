"""The game of the runs saved before it, or before its rules changed
(TASK-296 part A, ADR-0255, docs/GIOCO.md §7).

    python -m shaperoute_api.game_backfill

Run once on the server after the deploy of part A, and again after any
change of game_rules.RULES_VERSION. For each account with a run whose game
is missing or of older rules, every run of the account is computed again,
in the order they were saved, in one transaction under the account's lock
(as activities.save takes it): the overlaps and the day's cap come out as
if each run had just been saved. The shapes reached are unlocked at the
end of the run that reached them. No push is sent. Run twice, the second
time changes nothing. Only the runs recorded by the app (`source` `muw`):
a run added from another app's file has no game (TASK-312, ADR-0272). Nor
has an activity without a track, a gym session (TASK-385) or a pool swim
(TASK-409): it is saved by its own endpoint, never by the game's path
(TASK-423, the backfill of rules 3 stopped on one).

Then the silver and gold editions of every account (TASK-423 part E,
game_prizes_api.backfill_editions): each with the run that reached it, at
its end, without a push; an edition already there stays.
"""

from __future__ import annotations

import sys
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import timedelta

from shaperoute_api.db import Database
from shaperoute_api.game import kept_run, record
from shaperoute_api.game_prizes_api import backfill_editions
from shaperoute_api.game_rules import RULES_VERSION, evaluate


@dataclass(frozen=True)
class Backfilled:
    accounts: int
    runs: int
    unlocked: int
    # The silver and gold editions written (TASK-423 part E).
    editions: int = 0


def backfill(database: Database) -> Backfilled:
    with database.connect() as conn:
        users = [
            int(row["user_id"])
            for row in conn.execute(
                "SELECT DISTINCT r.user_id FROM runs r"
                " LEFT JOIN game_runs g ON g.run_id = r.id"
                " WHERE r.source = 'muw' AND r.track IS NOT NULL"
                " AND (g.run_id IS NULL OR g.rules_version < %s)"
                " ORDER BY r.user_id",
                (RULES_VERSION,),
            ).fetchall()
        ]
    runs = unlocked = 0
    for user_id in users:
        done, shapes = _account(database, user_id)
        runs += done
        unlocked += shapes
    return Backfilled(len(users), runs, unlocked, _editions(database))


def _editions(database: Database) -> int:
    """The editions of every account with a counted run, one account at a
    time under its lock."""
    with database.connect() as conn:
        users = [
            int(row["user_id"])
            for row in conn.execute(
                "SELECT DISTINCT user_id FROM game_runs WHERE counted ORDER BY user_id"
            ).fetchall()
        ]
    added = 0
    for user_id in users:
        with database.connect() as conn:
            conn.execute("SELECT 1 FROM users WHERE id = %s FOR UPDATE", (user_id,))
            added += backfill_editions(conn, user_id)
    return added


def _account(database: Database, user_id: int) -> tuple[int, int]:
    """Every run of one account computed again: how many, and the shapes
    unlocked."""
    with database.connect() as conn:
        conn.execute("SELECT 1 FROM users WHERE id = %s FOR UPDATE", (user_id,))
        # The phone's offset of each run came with it (TASK-423 part C): the
        # rules cannot compute it again, so it is kept across the rewrite.
        offsets = {
            int(row["run_id"]): row["utc_offset_min"]
            for row in conn.execute(
                "SELECT run_id, utc_offset_min FROM game_runs WHERE user_id = %s",
                (user_id,),
            ).fetchall()
        }
        conn.execute("DELETE FROM game_runs WHERE user_id = %s", (user_id,))
        ids = [
            int(row["id"])
            for row in conn.execute(
                "SELECT id FROM runs WHERE user_id = %s AND source = 'muw'"
                " AND track IS NOT NULL ORDER BY id",
                (user_id,),
            ).fetchall()
        ]
        unlocked = 0
        for run_id in ids:
            row = conn.execute(
                "SELECT started_at, activity, pauses, ST_AsText(track) AS track"
                " FROM runs WHERE id = %s",
                (run_id,),
            ).fetchone()
            assert row is not None
            fixes, pauses = kept_run(row)
            game = evaluate(fixes, pauses, row["activity"])
            ended_at = row["started_at"] + timedelta(seconds=game.elapsed_s)
            unlocked += len(
                record(
                    conn,
                    user_id,
                    run_id,
                    row["started_at"],
                    game,
                    ended_at,
                    offsets.get(run_id),
                )
            )
    return len(ids), unlocked


def main(argv: Sequence[str] | None = None) -> int:
    del argv  # no options
    database = Database.from_env()
    if database is None:
        print("game_backfill: SHAPEROUTE_DATABASE_URL is not set", file=sys.stderr)
        return 2
    done = backfill(database)
    print(
        f"game_backfill: rules {RULES_VERSION}, {done.accounts} account(s),"
        f" {done.runs} run(s), {done.unlocked} shape(s) unlocked,"
        f" {done.editions} edition(s)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
