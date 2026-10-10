"""Reactions: what the members leave under a drawing with one tap (TASK-119,
ADR-0193, docs/API.md, «Reactions»).

Six kinds, one for each member on a drawing: another kind changes it, DELETE
takes it back. The Sgrava heart is the super like: it comes with a comment of
at least 2 characters, kept with it in the same transaction, both or
neither, after the same checks and the same filter as every comment
(comments.py, TASK-213). Once kept they are two things: taking the super
like back leaves the comment, deleting the comment leaves the super like.

Whoever sees a drawing (drawings.drawing_seen_sql) reacts to it and reads
how many of each kind it has; never who left them, and never those of a
member a block keeps apart (TASK-121, moderation.py). Deleting the drawing
(with its run), or the account that reacted, deletes them (ON DELETE
CASCADE).
"""

from __future__ import annotations

import math
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Literal, get_args
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from psycopg import Connection
from psycopg import errors as pg_errors
from psycopg.rows import DictRow
from pydantic import BaseModel, ConfigDict, Field

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
from shaperoute_api.comment_filter import check_comment
from shaperoute_api.comments import (
    MAX_COMMENT_LENGTH,
    MAX_COMMENTS_PER_MINUTE,
    SEEN_BY,
    TOO_MANY_COMMENTS,
    CommentBody,
    CommentRejected,
    checked_text,
)
from shaperoute_api.db import Database
from shaperoute_api.drawings import NO_DRAWING, AuthorBody
from shaperoute_api.follows import apart_sql
from shaperoute_api.push import notify_owner
from shaperoute_api.schemas import ErrorBody

ReactionKind = Literal["super_like", "fire", "clap", "strong", "laugh", "wow"]
"""The six, in the order the app shows them (ADR-0193): the Sgrava heart,
the super like, then 🔥 👏 💪 😂 😮. Codes, never the emoji: the app draws
them. The migration's CHECK holds the same list."""
REACTION_KINDS: tuple[ReactionKind, ...] = get_args(ReactionKind)

# The user's rule (ADR-0193): a super like says something.
MIN_SUPER_LIKE_COMMENT = 2
# A person changes its mind a few times; more is a script.
MAX_REACTIONS_PER_MINUTE = 30

SUPER_LIKE_NEEDS_COMMENT = (
    f"A super like needs a comment of at least {MIN_SUPER_LIKE_COMMENT} characters."
)
ONLY_SUPER_LIKE_COMMENTS = "Only a super like comes with a comment."
TOO_MANY_REACTIONS = "Too many reactions in a minute: wait a moment and try again."


def checked_super_like(kind: ReactionKind, comment: str | None) -> str | None:
    """The comment as kept with a super like, None with the other kinds; or
    422 saying what is wrong with it, comment_rejected for a negative one."""
    if kind != "super_like":
        if comment is not None:
            raise AccountError(422, "invalid_request", ONLY_SUPER_LIKE_COMMENTS)
        return None
    if comment is None or len(comment.strip()) < MIN_SUPER_LIKE_COMMENT:
        raise AccountError(422, "invalid_request", SUPER_LIKE_NEEDS_COMMENT)
    kept = checked_text(comment)
    reason = check_comment(kept)
    if reason is not None:
        raise CommentRejected(reason)
    return kept


# --- The bodies ---


class ReactionRequestBody(BaseModel):
    """PUT /drawings/{id}/reaction:
    packages/shared-types/fixtures/reaction-request.json and
    super-like-request.json."""

    model_config = ConfigDict(extra="forbid")

    kind: ReactionKind
    comment: str | None = Field(
        default=None,
        description=(
            f"Only with super_like, and then needed: {MIN_SUPER_LIKE_COMMENT} to"
            f" {MAX_COMMENT_LENGTH} characters once the spaces at either end are"
            " gone, as a comment."
        ),
    )


class ReactionsBody(BaseModel):
    """How a drawing's reactions look to who asks:
    packages/shared-types/fixtures/reactions.json."""

    counts: dict[ReactionKind, int]
    """How many of each kind, all six, zero included."""
    total: int
    mine: ReactionKind | None
    """The reaction of who asks; null when it left none."""


class ReactionResultBody(BaseModel):
    """PUT /drawings/{id}/reaction:
    packages/shared-types/fixtures/reaction-result.json."""

    reactions: ReactionsBody
    comment: CommentBody | None
    """The comment kept with a super like just left; null otherwise, also
    when the super like was there already."""


# --- The reactions in the database ---


def _uuid(value: str) -> UUID | None:
    try:
        return UUID(value)
    except ValueError:
        return None


def _seen(conn: Connection[DictRow], drawing_id: UUID, viewer_id: int) -> bool:
    """True when `viewer_id` may see the drawing. The row stays locked until
    the transaction ends: a drawing deleted meanwhile waits for it."""
    row = conn.execute(
        "SELECT d.id FROM drawings d JOIN runs r ON r.id = d.run_id"
        f" WHERE {SEEN_BY} FOR SHARE OF d",
        (drawing_id, viewer_id),
    ).fetchone()
    return row is not None


def _summary(
    conn: Connection[DictRow], drawing_id: UUID, viewer_id: int
) -> ReactionsBody:
    rows = conn.execute(
        "SELECT kind, count(*) AS n, bool_or(user_id = %s) AS mine"
        " FROM reactions WHERE drawing_id = %s"
        # None of a member a block keeps apart from who asks (TASK-121).
        f" AND NOT {apart_sql('%s', 'user_id')} GROUP BY kind",
        (viewer_id, drawing_id, viewer_id),
    ).fetchall()
    counts: dict[ReactionKind, int] = dict.fromkeys(REACTION_KINDS, 0)
    mine: ReactionKind | None = None
    for row in rows:
        counts[row["kind"]] = row["n"]
        if row["mine"]:
            mine = row["kind"]
    return ReactionsBody(counts=counts, total=sum(counts.values()), mine=mine)


@dataclass
class Reactions:
    """The reactions in the database."""

    database: Database
    now: Callable[[], datetime]

    def of(self, viewer_id: int, drawing_id: str) -> ReactionsBody | None:
        """The drawing's reactions; None when `viewer_id` may not see the
        drawing, as for an id that is not there."""
        wanted = _uuid(drawing_id)
        if wanted is None:
            return None
        with self.database.connect() as conn:
            if not _seen(conn, wanted, viewer_id):
                return None
            return _summary(conn, wanted, viewer_id)

    def leave(
        self,
        user: UserBody,
        drawing_id: str,
        kind: ReactionKind,
        comment: str | None = None,
    ) -> ReactionResultBody | None:
        """`kind` as the reaction of `user`, in place of its own; a super like
        with its comment. None when `user` may not see the drawing. The same
        kind again changes nothing: a super like asked twice keeps one
        comment."""
        kept = checked_super_like(kind, comment)
        wanted = _uuid(drawing_id)
        if wanted is None:
            return None
        added: CommentBody | None = None
        try:
            with self.database.connect() as conn:
                if not _seen(conn, wanted, user.id):
                    return None
                now = self.now()
                # A row back only when the reaction is new or another kind.
                changed = conn.execute(
                    "INSERT INTO reactions (drawing_id, user_id, kind, created_at)"
                    " VALUES (%s, %s, %s, %s) ON CONFLICT (drawing_id, user_id)"
                    " DO UPDATE SET kind = EXCLUDED.kind,"
                    " created_at = EXCLUDED.created_at"
                    " WHERE reactions.kind <> EXCLUDED.kind RETURNING kind",
                    (wanted, user.id, kind, now),
                ).fetchone()
                if changed is not None and kept is not None:
                    row = conn.execute(
                        "INSERT INTO comments (drawing_id, user_id, text, created_at)"
                        " VALUES (%s, %s, %s, %s) RETURNING id, created_at",
                        (wanted, user.id, kept, now),
                    ).fetchone()
                    assert row is not None
                    added = CommentBody(
                        id=row["id"],
                        author=AuthorBody(
                            public_id=user.public_id, username=user.username
                        ),
                        text=kept,
                        created_at=row["created_at"],
                        deletable=True,
                    )
                summary = _summary(conn, wanted, user.id)
        except pg_errors.ForeignKeyViolation:
            # The account was deleted while it was reacting.
            raise AccountError(401, "not_signed_in", NOT_SIGNED_IN) from None
        return ReactionResultBody(reactions=summary, comment=added)

    def take_back(self, viewer_id: int, drawing_id: str) -> ReactionsBody | None:
        """Takes the reaction of `viewer_id` away, when it left one; None
        when it may not see the drawing, as for an id that is not there."""
        wanted = _uuid(drawing_id)
        if wanted is None:
            return None
        with self.database.connect() as conn:
            if not _seen(conn, wanted, viewer_id):
                return None
            conn.execute(
                "DELETE FROM reactions WHERE drawing_id = %s AND user_id = %s",
                (wanted, viewer_id),
            )
            return _summary(conn, wanted, viewer_id)


def reactions_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> Reactions:
    """In the database of the accounts, on the same clock."""
    return Reactions(accounts.database, accounts.now)


def _within(limiter: RateLimiter, user: UserBody, message: str) -> None:
    wait = limiter.wait_s(str(user.id))
    if wait > 0:
        raise AccountError(429, "too_many_requests", message, math.ceil(wait))


def reaction_routes() -> APIRouter:
    router = APIRouter(tags=["reactions"], responses=ACCOUNT_ERRORS)
    # Per account, as the comments: one person, one limit.
    changed = RateLimiter(MAX_REACTIONS_PER_MINUTE)
    # A super like writes a comment: the comments' own limit too.
    commented = RateLimiter(MAX_COMMENTS_PER_MINUTE)

    @router.get(
        "/drawings/{drawing_id}/reactions", responses={404: {"model": ErrorBody}}
    )
    def drawing_reactions(
        drawing_id: str,
        reactions: Annotated[Reactions, Depends(reactions_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> ReactionsBody:
        found = reactions.of(user.id, drawing_id)
        if found is None:
            raise HTTPException(404, NO_DRAWING)
        return found

    @router.put(
        "/drawings/{drawing_id}/reaction", responses={404: {"model": ErrorBody}}
    )
    def leave_reaction(
        drawing_id: str,
        body: ReactionRequestBody,
        reactions: Annotated[Reactions, Depends(reactions_of)],
        user: Annotated[UserBody, Depends(current_user)],
        request: Request,
    ) -> ReactionResultBody:
        _within(changed, user, TOO_MANY_REACTIONS)
        if body.kind == "super_like":
            _within(commented, user, TOO_MANY_COMMENTS)
        left = reactions.leave(user, drawing_id, body.kind, body.comment)
        if left is None:
            raise HTTPException(404, NO_DRAWING)
        pushed_reaction(request, user, drawing_id, body)
        return left

    @router.delete(
        "/drawings/{drawing_id}/reaction", responses={404: {"model": ErrorBody}}
    )
    def take_back_reaction(
        drawing_id: str,
        reactions: Annotated[Reactions, Depends(reactions_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> ReactionsBody:
        _within(changed, user, TOO_MANY_REACTIONS)
        left = reactions.take_back(user.id, drawing_id)
        if left is None:
            raise HTTPException(404, NO_DRAWING)
        return left

    return router


def install_reactions(app: FastAPI) -> None:
    """The reactions under the drawings; after install_comments, whose
    handler answers a negative super like comment."""
    app.include_router(reaction_routes())


# --- Push notifications (TASK-262, ADR-0226) ---


def pushed_reaction(
    request: Request, user: UserBody, drawing_id: str, body: ReactionRequestBody
) -> None:
    """After a reaction is kept: the drawing's owner is told (push.py), with
    the beginning of a super like's comment. Another kind later is the same
    news: not told again the same day."""
    notify_owner(
        request, "reaction", user.id, drawing_id, reaction=body.kind, text=body.comment
    )
