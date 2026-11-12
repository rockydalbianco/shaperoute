"""Reactions to a comment: what the members leave on a comment, or on a
reply, with one tap (TASK-454 part C1, ADR-0377, docs/API.md, «Comments»).

Five kinds, those of a drawing (reactions.py) without the MuW heart, which
is a drawing's only (the user's choice, 2026-11-11). One for each member on
a comment: another kind changes it, DELETE takes it back. Whoever reads a
comment (comments.READ, under a drawing it sees) reacts to it and reads how
many of each kind it has, with the comments themselves (comments.py); never
who left them, and never those of a member a block keeps apart. Deleting the
comment (with its drawing), or the account that reacted, deletes them (ON
DELETE CASCADE).

Who wrote the comment is told in the bell only (push.BELL_ONLY): no phone
rings for a reaction to a comment. Another kind later is the same news: not
told again the same day.
"""

from __future__ import annotations

import math
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from psycopg import errors as pg_errors
from psycopg.rows import DictRow
from pydantic import BaseModel, ConfigDict

from shaperoute_api.access import RateLimiter
from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    NOT_SIGNED_IN,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.comments import (
    NO_COMMENT,
    READ,
    VIEWER,
    CommentReactionKind,
    CommentReactionsBody,
    no_reactions,
    reaction_summaries,
)
from shaperoute_api.db import Database
from shaperoute_api.drawings import drawing_seen_sql
from shaperoute_api.push import PushEvent, notify
from shaperoute_api.reactions import MAX_REACTIONS_PER_MINUTE, TOO_MANY_REACTIONS
from shaperoute_api.schemas import ErrorBody

# The comment %(comment)s when `viewer` reads it, under a drawing it sees:
# who wrote it and its drawing. The row stays locked until the transaction
# ends: a comment deleted meanwhile waits for it.
READ_SQL = (
    "SELECT c.user_id AS author, c.drawing_id FROM comments c"
    " JOIN drawings d ON d.id = c.drawing_id JOIN runs r ON r.id = d.run_id"
    f" WHERE c.id = %(comment)s AND {drawing_seen_sql(VIEWER)} AND {READ}"
    " FOR SHARE OF c"
)


class CommentReactionRequestBody(BaseModel):
    """PUT /comments/{id}/reaction:
    packages/shared-types/fixtures/comment-reaction-request.json."""

    model_config = ConfigDict(extra="forbid")

    kind: CommentReactionKind


@dataclass(frozen=True)
class Left:
    """A reaction just kept, and who is told of it."""

    reactions: CommentReactionsBody
    author: int
    """The account that wrote the comment."""
    drawing_id: UUID
    comment_id: UUID


def _uuid(value: str) -> UUID | None:
    try:
        return UUID(value)
    except ValueError:
        return None


@dataclass
class CommentReactions:
    """The reactions to the comments, in the database."""

    database: Database
    now: Callable[[], datetime]

    def leave(
        self, user: UserBody, comment_id: str, kind: CommentReactionKind
    ) -> Left | None:
        """`kind` as the reaction of `user` to the comment, in place of its
        own. None when `user` does not read the comment, as for an id that
        is not there. The same kind again changes nothing."""
        wanted = _uuid(comment_id)
        if wanted is None:
            return None
        params: dict[str, Any] = {
            "comment": wanted,
            "viewer": user.id,
            "kind": kind,
            "at": self.now(),
        }
        try:
            with self.database.connect() as conn:
                comment: DictRow | None = conn.execute(READ_SQL, params).fetchone()
                if comment is None:
                    return None
                conn.execute(
                    "INSERT INTO comment_reactions"
                    " (comment_id, user_id, kind, created_at)"
                    " VALUES (%(comment)s, %(viewer)s, %(kind)s, %(at)s)"
                    " ON CONFLICT (comment_id, user_id)"
                    " DO UPDATE SET kind = EXCLUDED.kind,"
                    " created_at = EXCLUDED.created_at"
                    " WHERE comment_reactions.kind <> EXCLUDED.kind",
                    params,
                )
                summary = reaction_summaries(conn, [wanted], user.id)
        except pg_errors.ForeignKeyViolation:
            # The account was deleted while it was reacting.
            raise AccountError(401, "not_signed_in", NOT_SIGNED_IN) from None
        return Left(
            summary.get(wanted) or no_reactions(),
            comment["author"],
            comment["drawing_id"],
            wanted,
        )

    def take_back(self, viewer_id: int, comment_id: str) -> CommentReactionsBody | None:
        """Takes the reaction of `viewer_id` away, when it left one; None
        when it does not read the comment, as for an id that is not there."""
        wanted = _uuid(comment_id)
        if wanted is None:
            return None
        params: dict[str, Any] = {"comment": wanted, "viewer": viewer_id}
        with self.database.connect() as conn:
            if conn.execute(READ_SQL, params).fetchone() is None:
                return None
            conn.execute(
                "DELETE FROM comment_reactions"
                " WHERE comment_id = %(comment)s AND user_id = %(viewer)s",
                params,
            )
            summary = reaction_summaries(conn, [wanted], viewer_id)
        return summary.get(wanted) or no_reactions()


def comment_reactions_of(
    accounts: Annotated[Accounts, Depends(accounts_of)],
) -> CommentReactions:
    """In the database of the accounts, on the same clock."""
    return CommentReactions(accounts.database, accounts.now)


def comment_reaction_routes() -> APIRouter:
    router = APIRouter(tags=["comments"], responses=ACCOUNT_ERRORS)
    # Per account, as the reactions to the drawings, and apart from them.
    changed = RateLimiter(MAX_REACTIONS_PER_MINUTE)

    def within(user: UserBody) -> None:
        wait = changed.wait_s(str(user.id))
        if wait > 0:
            raise AccountError(
                429, "too_many_requests", TOO_MANY_REACTIONS, math.ceil(wait)
            )

    @router.put(
        "/comments/{comment_id}/reaction", responses={404: {"model": ErrorBody}}
    )
    def leave_comment_reaction(
        comment_id: str,
        body: CommentReactionRequestBody,
        reactions: Annotated[CommentReactions, Depends(comment_reactions_of)],
        user: Annotated[UserBody, Depends(current_user)],
        request: Request,
    ) -> CommentReactionsBody:
        within(user)
        left = reactions.leave(user, comment_id, body.kind)
        if left is None:
            raise HTTPException(404, NO_COMMENT)
        pushed_comment_reaction(request, user, body.kind, left)
        return left.reactions

    @router.delete(
        "/comments/{comment_id}/reaction", responses={404: {"model": ErrorBody}}
    )
    def take_back_comment_reaction(
        comment_id: str,
        reactions: Annotated[CommentReactions, Depends(comment_reactions_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> CommentReactionsBody:
        within(user)
        left = reactions.take_back(user.id, comment_id)
        if left is None:
            raise HTTPException(404, NO_COMMENT)
        return left

    return router


def install_comment_reactions(app: FastAPI) -> None:
    """The reactions to the comments; after install_comments, whose routes
    read them."""
    app.include_router(comment_reaction_routes())


def pushed_comment_reaction(
    request: Request,
    user: UserBody,
    kind: CommentReactionKind,
    left: Left,
) -> None:
    """After a reaction is kept: who wrote the comment reads it in the bell
    (push.BELL_ONLY), not on the phone."""
    notify(
        request,
        PushEvent(
            "comment_reaction",
            user.id,
            left.author,
            left.drawing_id,
            reaction=kind,
            key=str(left.comment_id),
        ),
    )
