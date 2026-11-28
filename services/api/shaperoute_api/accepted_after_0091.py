"""The requests to follow still waiting for an account left open by
migration 0091 (TASK-459 part A, ADR-0370, point 3).

    python -m shaperoute_api.accepted_after_0091 --count
    python -m shaperoute_api.accepted_after_0091

Run once on the server, inside the Coordinatore's step, right after the
deploy that applies migration 0091 and with the user's yes. With «Approve
followers» off, a request waiting is accepted, as when its account turns
the switch off (approve_followers.py): who asked is told its request was
accepted, by push and in the bell, as after a yes by hand. A migration
sends nothing, so this command does it.

`--count` only reads: how many accounts are open with requests waiting,
and how many requests. Run twice, the second time finds nothing: a request
accepted is no longer waiting, and an account with the switch on keeps its
requests.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TextIO

from shaperoute_api.db import Database
from shaperoute_api.follows import Follows
from shaperoute_api.notification_list import NotificationList
from shaperoute_api.push import Pusher, PushEvent

WAITING_SQL = (
    "SELECT f.followed_id AS id, count(*) AS requests FROM follows f"
    " JOIN users u ON u.id = f.followed_id"
    " WHERE f.status = 'pending' AND NOT u.approve_followers"
    " GROUP BY f.followed_id ORDER BY f.followed_id"
)


@dataclass(frozen=True)
class Waiting:
    accounts: int
    requests: int


def waiting(database: Database) -> Waiting:
    """What the command would accept: read only."""
    with database.connect() as conn:
        rows = conn.execute(WAITING_SQL).fetchall()
    return Waiting(len(rows), sum(int(row["requests"]) for row in rows))


def accept_all(
    database: Database, pusher: Pusher, now: Callable[[], datetime]
) -> Waiting:
    """Every request waiting for an open account accepted, and each one
    who asked told. What was accepted."""
    with database.connect() as conn:
        owners = [int(row["id"]) for row in conn.execute(WAITING_SQL).fetchall()]
    follows = Follows(database, now)
    requests = 0
    for owner_id in owners:
        accepted = follows.accept_waiting(owner_id)
        requests += len(accepted)
        for follower_id in accepted:
            pusher.notify(PushEvent("follow_accepted", owner_id, follower_id))
    return Waiting(len(owners), requests)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m shaperoute_api.accepted_after_0091",
        description="Accept the follow requests waiting for open accounts.",
    )
    parser.add_argument("--count", action="store_true", help="only count them")
    return parser


def main(
    argv: Sequence[str] | None = None,
    *,
    database: Database | None = None,
    pusher: Pusher | None = None,
    now: Callable[[], datetime] | None = None,
    out: TextIO | None = None,
) -> int:
    """0 when done; 2 without a database. The keyword arguments are for the
    tests."""
    args = _parser().parse_args(argv)
    out = sys.stdout if out is None else out
    if database is None:
        database = Database.from_env()
        if database is None:
            print(
                "accepted_after_0091: SHAPEROUTE_DATABASE_URL is not set",
                file=sys.stderr,
            )
            return 2
    clock = now or (lambda: datetime.now(UTC))
    if args.count:
        found = waiting(database)
        print(
            f"accepted_after_0091: {found.accounts} open account(s),"
            f" {found.requests} request(s) waiting",
            file=out,
        )
        return 0
    if pusher is None:
        # Each push sent before the command returns; the receipts are left
        # to the API's next sends. The bell keeps them, as the API's pusher.
        pusher = Pusher(database, run=lambda task: task(), later=lambda *_: None)
        pusher.listeners.append(NotificationList(database, clock).record)
    done = accept_all(database, pusher, clock)
    print(
        f"accepted_after_0091: {done.requests} request(s) accepted"
        f" for {done.accounts} account(s)",
        file=out,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
