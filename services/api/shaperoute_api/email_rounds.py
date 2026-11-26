"""Which daily rounds of emails to the members are on (TASK-515, ADR-0410,
docs/DEPLOY.md, «Email di ritorno»).

Resend's key, the links' secret and the domain turn on the emails an
account needs: the link that confirms an address and the one that chooses a
new password (account_email.py). The two rounds that write to the members
on their own start only when SHAPEROUTE_EMAIL_ROUNDS names them:

- "away": the email to who has not opened the app for two weeks
  (away_email.py), on for every member until they turn it off;
- "notices": the daily email of the notices (notice_email.py), to who
  turned «Email notifications» on.

Names are separated by commas. Empty, neither round starts, whatever else
the environment has: an email to every member is asked for on the server,
never the effect of a line left out. A name that is not a round stops the
start, so a typo is not a round silently off.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from typing import Literal, TypeVar, get_args

VARIABLE = "SHAPEROUTE_EMAIL_ROUNDS"

Round = Literal["away", "notices"]
ROUNDS: tuple[Round, ...] = get_args(Round)

Setup = TypeVar("Setup")


class RoundsConfigError(ValueError):
    """SHAPEROUTE_EMAIL_ROUNDS names something that is not a round."""


def rounds_from_env(environ: Mapping[str, str] = os.environ) -> frozenset[Round]:
    """The rounds the environment turns on; none when the variable is empty."""
    named = {name.strip().lower() for name in environ.get(VARIABLE, "").split(",")}
    named.discard("")
    unknown = sorted(named.difference(ROUNDS))
    if unknown:
        raise RoundsConfigError(
            f"{VARIABLE} names {', '.join(unknown)}:"
            f" the rounds are {', '.join(ROUNDS)}, separated by commas"
        )
    return frozenset(name for name in ROUNDS if name in named)


def only_named(
    name: Round, rounds: frozenset[Round], setup: Setup | None
) -> Setup | None:
    """`setup` for a round the environment names; None, the round off,
    otherwise. The emails of the accounts read the setup itself, not this."""
    return setup if name in rounds else None


def off_line(name: Round, what: str) -> str:
    """What the start prints of a round that has all it needs but its name."""
    return f"{what}: off ({VARIABLE} does not name {name})"
