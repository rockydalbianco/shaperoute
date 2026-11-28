"""«Approve followers» (TASK-459 part A, ADR-0370, docs/API.md, «Follow»).

The switch of an account in «Settings», kept in users.approve_followers.
Off, whoever asks to follow it follows at once (follows.py) and the account
is told it has a new follower; on, a request waits for its yes, as since
TASK-211. Off from the start; on for the accounts of before that had a
drawing for their followers (migration 0091, the user's choice of
2026-11-28).

Turning it off accepts every request still waiting (the user's choice 3):
each one who asked is told its request was accepted, as when the account
accepts one by hand. Turning it on changes no follow: who follows, follows.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Request
from pydantic import BaseModel, ConfigDict

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    NOT_SIGNED_IN,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.db import Database
from shaperoute_api.follows import Follows
from shaperoute_api.push import PushEvent, notify


class ApproveFollowersBody(BaseModel):
    """GET and PUT /me/approve-followers: «Approve followers»:
    packages/shared-types/fixtures/approve-followers.json."""

    model_config = ConfigDict(extra="forbid")

    approve_followers: bool
    """True: a request to follow waits for the account's yes. False: whoever
    asks follows at once."""


@dataclass
class ApproveFollowers:
    """The switch, in the database of the accounts."""

    database: Database
    follows: Follows

    def switch(self, user_id: int) -> ApproveFollowersBody:
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT approve_followers FROM users WHERE id = %s", (user_id,)
            ).fetchone()
        if row is None:
            # The account was deleted while it asked.
            raise AccountError(401, "not_signed_in", NOT_SIGNED_IN)
        return ApproveFollowersBody(approve_followers=row["approve_followers"])

    def turn(self, user_id: int, on: bool) -> tuple[ApproveFollowersBody, list[int]]:
        """The switch as its owner leaves it, and the accounts whose request
        was accepted by turning it off (none when it is turned on)."""
        with self.database.connect() as conn:
            row = conn.execute(
                "UPDATE users SET approve_followers = %s WHERE id = %s"
                " RETURNING approve_followers",
                (on, user_id),
            ).fetchone()
        if row is None:
            raise AccountError(401, "not_signed_in", NOT_SIGNED_IN)
        # After the switch is off: a request kept in between follows at once.
        accepted = [] if on else self.follows.accept_waiting(user_id)
        return (
            ApproveFollowersBody(approve_followers=row["approve_followers"]),
            accepted,
        )


def approve_followers_of(
    accounts: Annotated[Accounts, Depends(accounts_of)],
) -> ApproveFollowers:
    return ApproveFollowers(accounts.database, Follows(accounts.database, accounts.now))


Switch = Annotated[ApproveFollowers, Depends(approve_followers_of)]
Me = Annotated[UserBody, Depends(current_user)]


def told_accepted(request: Request, owner_id: int, accepted: list[int]) -> None:
    """Each one whose request was accepted is told, as after a yes by hand
    (follows.pushed_follow_accepted). After the write; never raises."""
    for follower_id in accepted:
        notify(request, PushEvent("follow_accepted", owner_id, follower_id))


def approve_followers_routes() -> APIRouter:
    router = APIRouter(tags=["follow"], responses=ACCOUNT_ERRORS)

    @router.get("/me/approve-followers")
    def approve_followers_switch(switch: Switch, user: Me) -> ApproveFollowersBody:
        return switch.switch(user.id)

    @router.put("/me/approve-followers")
    def turn_approve_followers(
        body: ApproveFollowersBody, switch: Switch, user: Me, request: Request
    ) -> ApproveFollowersBody:
        turned, accepted = switch.turn(user.id, body.approve_followers)
        told_accepted(request, user.id, accepted)
        return turned

    return router


def install_approve_followers(app: FastAPI) -> None:
    """After install_accounts. Without a database the endpoints answer 503,
    as the others of the accounts."""
    app.include_router(approve_followers_routes())
