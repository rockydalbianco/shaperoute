"""Comments: what the members write under a drawing (TASK-120, docs/API.md,
«Comments»).

Whoever can see a drawing (drawings.drawing_seen_sql) reads its comments
and writes one: its owner always, the others as its visibility says
(TASK-208). A drawing seen by fewer keeps them, unseen by the others, until
they see it again. A comment is deleted by who wrote it, or by the owner of
the drawing; deleting the drawing (with its run), or the account that wrote
it, deletes it too (ON DELETE CASCADE).

A comment is plain text: the API keeps it as written, the app shows it as
text, never as a link or as HTML (docs/UI.md). A negative one is never kept:
comment_filter.py says which (TASK-213, ADR-0176).

A block keeps two members apart (TASK-121, moderation.py): neither reads,
writes or counts the comments of the other, nor opens the other's drawing.

A comment is answered (TASK-454 part C1, ADR-0377): a reply is a comment
with the comment it stands under, one level deep. An answer to a reply goes
under the same comment, with who it answers as its `mention`. A reply is
read with its comment: when that is not read (a block, hidden from a
report), neither are its replies; deleting it deletes them. A reply is
checked, filtered, reported, hidden and deleted as every comment. Without
`threads` GET /drawings/{id}/comments is the list of before, replies among
the others by time: what an app from before replies asks for and reads.

Whoever reads a comment leaves one of five reactions on it
(comment_reactions.py writes them; here they are read with the comments):
how many of each kind, never who left them, none of a member a block keeps
apart.
"""

from __future__ import annotations

import math
import unicodedata
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any, Literal, get_args
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    HTTPException,
    Query,
    Request,
    Response,
)
from fastapi.responses import JSONResponse
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
from shaperoute_api.activities import EPOCH, MICROSECOND
from shaperoute_api.comment_filter import check_comment
from shaperoute_api.db import Database
from shaperoute_api.drawings import (
    CURSOR_PATTERN,
    MAX_PAGE_SIZE,
    NO_DRAWING,
    PAGE_SIZE,
    AuthorBody,
    drawing_seen_sql,
)
from shaperoute_api.follows import apart_sql
from shaperoute_api.push import PushEvent, notify, notify_owner
from shaperoute_api.schemas import ErrorBody, ErrorDetail

MAX_COMMENT_LENGTH = 500
# A person writes a few in a minute; more is a script.
MAX_COMMENTS_PER_MINUTE = 10
# The replies that come with their comment when the threads are asked for
# (the user's choice, 2026-11-11): the oldest two, the others a page at a
# time from GET /comments/{id}/replies.
REPLIES_SHOWN = 2

CommentReactionKind = Literal["fire", "clap", "strong", "laugh", "wow"]
"""The reactions of a comment, in the order the app shows them: those of a
drawing (reactions.py) without the MuW heart, which is a drawing's only (the
user's choice, 2026-11-11). The migration's CHECK holds the same list."""
COMMENT_REACTION_KINDS: tuple[CommentReactionKind, ...] = get_args(CommentReactionKind)

COMMENT_EMPTY = "A comment needs some words."
COMMENT_TOO_LONG = f"A comment is at most {MAX_COMMENT_LENGTH} characters."
COMMENT_NOT_TEXT = (
    "A comment is words and new lines: it cannot hold control characters."
)
TOO_MANY_COMMENTS = "Too many comments in a minute: wait a moment and try again."
NO_COMMENT = "No comment with this id."
NOT_YOUR_COMMENT = "Only who wrote a comment, or the owner of the drawing, deletes it."
# The user's words (ADR-0176), which the app shows in an alert.
NEGATIVE_COMMENT = "You can't write negative comments in this app. Try another app."


def checked_text(value: str) -> str:
    """The comment as kept: without spaces at either end; or 422 saying what
    is wrong with it. New lines stay, as in a bio."""
    text = value.strip()
    if not text:
        raise AccountError(422, "invalid_request", COMMENT_EMPTY)
    if len(text) > MAX_COMMENT_LENGTH:
        raise AccountError(422, "invalid_request", COMMENT_TOO_LONG)
    if any(unicodedata.category(c) == "Cc" and c != "\n" for c in text):
        raise AccountError(422, "invalid_request", COMMENT_NOT_TEXT)
    return text


class CommentRejected(Exception):
    """A comment the filter refuses: 422 comment_rejected, with `reason`."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def rejected_answer(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, CommentRejected)
    # Validated: a reason the filter gives and the contract does not know
    # fails here, not on the phone.
    detail = ErrorDetail.model_validate(
        {"code": "comment_rejected", "message": NEGATIVE_COMMENT, "reason": exc.reason}
    )
    return JSONResponse(status_code=422, content=ErrorBody(error=detail).model_dump())


# --- The bodies ---


class CommentRequestBody(BaseModel):
    """POST /drawings/{id}/comments:
    packages/shared-types/fixtures/comment-request.json."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(
        description=(
            f"1 to {MAX_COMMENT_LENGTH} characters once the spaces at either end"
            " are gone; new lines are kept."
        ),
    )
    reply_to: UUID | None = Field(
        default=None,
        description=(
            "The comment of this drawing these words answer, a reply too:"
            " they go under its comment. Left out, a comment of the drawing."
        ),
    )


class CommentReactionsBody(BaseModel):
    """The reactions of a comment as who asks sees them:
    packages/shared-types/fixtures/comment-reactions.json."""

    counts: dict[CommentReactionKind, int]
    """How many of each kind, all five, zero included."""
    total: int
    mine: CommentReactionKind | None
    """The reaction of who asks; null when it left none."""


def no_reactions() -> CommentReactionsBody:
    return CommentReactionsBody(
        counts=dict.fromkeys(COMMENT_REACTION_KINDS, 0), total=0, mine=None
    )


class CommentBody(BaseModel):
    """One comment, as who asks sees it:
    packages/shared-types/fixtures/comment.json; a reply,
    comment-reply.json. What came with the replies (TASK-454) is new beside
    what was there: an app from before reads the rest as it did."""

    id: UUID
    author: AuthorBody
    text: str
    created_at: datetime
    deletable: bool
    """True when who asks may delete it: its author, or the drawing's
    owner."""
    parent_id: UUID | None = None
    """The comment a reply stands under; null for a comment."""
    mention: AuthorBody | None = None
    """Who a reply to a reply answers, shown as «@name» before its words;
    null for the others, and when who asks does not see that member."""
    reply_count: int = 0
    """How many replies who asks reads under it; 0 for a reply."""
    replies: list[CommentBody] | None = None
    """With `threads`, the oldest REPLIES_SHOWN of them; null when the
    threads were not asked for, and for a reply."""
    reactions: CommentReactionsBody = Field(default_factory=no_reactions)


class CommentsBody(BaseModel):
    """GET /drawings/{id}/comments: a page, the oldest first:
    packages/shared-types/fixtures/comments.json."""

    comments: list[CommentBody]
    next: str | None
    """The `cursor` of the next page; null on the last one."""
    total: int
    """How many comments the drawing has, on every page."""


# --- The comments in the database ---

# A drawing `viewer` may see, as drawings.py asks it (TASK-208): never one
# whose owner a block keeps apart from `viewer` (TASK-121).
SEEN_BY = f"d.id = %s AND {drawing_seen_sql('%s')}"


# The comments `viewer` reads: none of a member a block keeps apart, nor of
# one hidden; one hidden from a report's email only by its author (TASK-291,
# ADR-0251). One placeholder: `viewer`.
def read_sql(alias: str, viewer: str = "%s") -> str:
    """An SQL condition: `viewer` reads the row `alias` of comments. `viewer`
    is a placeholder holding a users.id, read once."""
    return (
        f"EXISTS (SELECT 1 FROM (SELECT {viewer}::bigint AS id) reader"
        f" WHERE NOT {apart_sql('reader.id', f'{alias}.user_id')}"
        f" AND ({alias}.hidden_at IS NULL OR {alias}.user_id = reader.id))"
    )


NOT_APART = read_sql("c")
# The same by name, for the queries that say `viewer` more than once.
VIEWER = "%(viewer)s"
# The comments and the replies `viewer` reads: a reply only with the
# comment it stands under (TASK-454).
READ = (
    f"{read_sql('c', VIEWER)} AND (c.parent_id IS NULL OR EXISTS"
    " (SELECT 1 FROM comments above WHERE above.id = c.parent_id"
    f" AND {read_sql('above', VIEWER)}))"
)
# A comment as its body needs it: who wrote it, who it answers when
# `viewer` sees that member, how many replies `viewer` reads under it.
COLUMNS = (
    "c.id, c.text, c.created_at, c.user_id, c.parent_id, u.public_id,"
    " u.username, m.public_id AS mention_public_id,"
    " m.username AS mention_username, (SELECT count(*) FROM comments below"
    f" WHERE below.parent_id = c.id AND {read_sql('below', VIEWER)})"
    " AS reply_count"
)
JOINED = (
    " FROM comments c JOIN users u ON u.id = c.user_id"
    " LEFT JOIN users m ON m.id = c.mention_user_id"
    f" AND NOT {apart_sql(VIEWER, 'm.id')}"
)
# The drawing %(drawing)s, when `viewer` may see it: its owner.
OWNER_SQL = (
    "SELECT r.user_id AS owner FROM drawings d JOIN runs r ON r.id = d.run_id"
    f" WHERE d.id = %(drawing)s AND {drawing_seen_sql(VIEWER)}"
)


def _cursor(row: DictRow) -> str:
    created_at: datetime = row["created_at"]
    return f"{(created_at - EPOCH) // MICROSECOND}-{row['id'].hex}"


def _after_cursor(cursor: str) -> tuple[datetime, UUID]:
    micros, comment_id = cursor.split("-")
    return EPOCH + int(micros) * MICROSECOND, UUID(comment_id)


def _uuid(value: str) -> UUID | None:
    try:
        return UUID(value)
    except ValueError:
        return None


Deleted = Literal["deleted", "not_yours"]


@dataclass(frozen=True)
class Written:
    """A comment just kept, and who is told of it."""

    comment: CommentBody
    owner: int
    """The account of the drawing."""
    answered: int | None
    """The account whose comment, or reply, a reply answers; None for a
    comment of the drawing."""


def reaction_summaries(
    conn: Connection[DictRow], comment_ids: list[UUID], viewer_id: int
) -> dict[UUID, CommentReactionsBody]:
    """The reactions of each of `comment_ids` that has some, as `viewer_id`
    sees them: none of a member a block keeps apart."""
    if not comment_ids:
        return {}
    rows = conn.execute(
        "SELECT cr.comment_id, cr.kind, count(*) AS n,"
        " bool_or(cr.user_id = %(viewer)s) AS mine FROM comment_reactions cr"
        " WHERE cr.comment_id = ANY(%(ids)s)"
        f" AND NOT {apart_sql(VIEWER, 'cr.user_id')}"
        " GROUP BY cr.comment_id, cr.kind",
        {"viewer": viewer_id, "ids": comment_ids},
    ).fetchall()
    found: dict[UUID, CommentReactionsBody] = {}
    for row in rows:
        summary = found.setdefault(row["comment_id"], no_reactions())
        summary.counts[row["kind"]] = row["n"]
        summary.total += row["n"]
        if row["mine"]:
            summary.mine = row["kind"]
    return found


def _body(
    row: DictRow,
    viewer_id: int,
    owner_id: int,
    reactions: dict[UUID, CommentReactionsBody],
    replies: list[CommentBody] | None = None,
) -> CommentBody:
    mention = None
    if row["mention_public_id"] is not None:
        mention = AuthorBody(
            public_id=row["mention_public_id"], username=row["mention_username"]
        )
    return CommentBody(
        id=row["id"],
        author=AuthorBody(public_id=row["public_id"], username=row["username"]),
        text=row["text"],
        created_at=row["created_at"],
        deletable=viewer_id in (row["user_id"], owner_id),
        parent_id=row["parent_id"],
        mention=mention,
        reply_count=row["reply_count"],
        replies=replies,
        reactions=reactions.get(row["id"]) or no_reactions(),
    )


@dataclass
class Comments:
    """The comments in the database."""

    database: Database
    now: Callable[[], datetime]

    def page(
        self,
        viewer_id: int,
        drawing_id: str,
        limit: int = PAGE_SIZE,
        cursor: str | None = None,
        threads: bool = False,
    ) -> CommentsBody | None:
        """A page of the drawing's comments, the oldest first; None when
        `viewer_id` may not see the drawing, as for an id that is not there.
        With `threads` the comments only, each with its first replies;
        without, the replies among the comments, by time. `total` counts
        both, either way."""
        wanted = _uuid(drawing_id)
        if wanted is None:
            return None
        params: dict[str, Any] = {
            "drawing": wanted,
            "viewer": viewer_id,
            "limit": limit + 1,
        }
        with self.database.connect() as conn:
            drawing = conn.execute(OWNER_SQL, params).fetchone()
            if drawing is None:
                return None
            readable = f"c.drawing_id = %(drawing)s AND {READ}"
            where = readable + (" AND c.parent_id IS NULL" if threads else "")
            if cursor is not None:
                where += " AND (c.created_at, c.id) > (%(at)s, %(after)s)"
                params["at"], params["after"] = _after_cursor(cursor)
            rows = conn.execute(
                f"SELECT {COLUMNS}{JOINED} WHERE {where}"
                " ORDER BY c.created_at, c.id LIMIT %(limit)s",
                params,
            ).fetchall()
            count = conn.execute(
                f"SELECT count(*) AS n FROM comments c WHERE {readable}", params
            ).fetchone()
            page, more = rows[:limit], len(rows) > limit
            first: list[DictRow] = []
            if threads and page:
                first = conn.execute(
                    f"SELECT * FROM (SELECT {COLUMNS}, row_number() OVER"
                    " (PARTITION BY c.parent_id ORDER BY c.created_at, c.id)"
                    f" AS nth{JOINED} WHERE c.parent_id = ANY(%(above)s)"
                    f" AND {read_sql('c', VIEWER)}) shown"
                    " WHERE shown.nth <= %(shown)s"
                    " ORDER BY shown.parent_id, shown.nth",
                    {
                        "viewer": viewer_id,
                        "above": [row["id"] for row in page],
                        "shown": REPLIES_SHOWN,
                    },
                ).fetchall()
            reactions = reaction_summaries(
                conn, [row["id"] for row in (*page, *first)], viewer_id
            )
        assert count is not None
        owner: int = drawing["owner"]
        under: dict[UUID, list[CommentBody]] = {}
        for row in first:
            under.setdefault(row["parent_id"], []).append(
                _body(row, viewer_id, owner, reactions)
            )
        return CommentsBody(
            comments=[
                _body(
                    row,
                    viewer_id,
                    owner,
                    reactions,
                    under.get(row["id"], []) if threads else None,
                )
                for row in page
            ],
            next=_cursor(page[-1]) if more else None,
            total=count["n"],
        )

    def replies(
        self,
        viewer_id: int,
        comment_id: str,
        limit: int = PAGE_SIZE,
        cursor: str | None = None,
    ) -> CommentsBody | None:
        """A page of the replies under a comment, the oldest first, with how
        many there are; None when `viewer_id` does not read the comment, as
        for an id that is not there, or a reply's."""
        wanted = _uuid(comment_id)
        if wanted is None:
            return None
        params: dict[str, Any] = {
            "above": wanted,
            "viewer": viewer_id,
            "limit": limit + 1,
        }
        with self.database.connect() as conn:
            drawing = conn.execute(
                "SELECT r.user_id AS owner FROM comments c"
                " JOIN drawings d ON d.id = c.drawing_id"
                " JOIN runs r ON r.id = d.run_id"
                " WHERE c.id = %(above)s AND c.parent_id IS NULL"
                f" AND {drawing_seen_sql(VIEWER)} AND {read_sql('c', VIEWER)}",
                params,
            ).fetchone()
            if drawing is None:
                return None
            readable = f"c.parent_id = %(above)s AND {read_sql('c', VIEWER)}"
            where = readable
            if cursor is not None:
                where += " AND (c.created_at, c.id) > (%(at)s, %(after)s)"
                params["at"], params["after"] = _after_cursor(cursor)
            rows = conn.execute(
                f"SELECT {COLUMNS}{JOINED} WHERE {where}"
                " ORDER BY c.created_at, c.id LIMIT %(limit)s",
                params,
            ).fetchall()
            count = conn.execute(
                f"SELECT count(*) AS n FROM comments c WHERE {readable}", params
            ).fetchone()
            page, more = rows[:limit], len(rows) > limit
            reactions = reaction_summaries(conn, [row["id"] for row in page], viewer_id)
        assert count is not None
        return CommentsBody(
            comments=[
                _body(row, viewer_id, drawing["owner"], reactions) for row in page
            ],
            next=_cursor(page[-1]) if more else None,
            total=count["n"],
        )

    def write(
        self,
        user: UserBody,
        drawing_id: str,
        text: str,
        reply_to: UUID | None = None,
    ) -> Written | None:
        """`text` under the drawing, by `user`; with `reply_to`, under the
        comment that one is, or stands under. None when `user` may not see
        the drawing. 422 for a text refused, or a negative one; 404 for a
        `reply_to` that is not a comment of the drawing `user` reads."""
        kept = checked_text(text)
        reason = check_comment(kept)
        if reason is not None:
            raise CommentRejected(reason)
        wanted = _uuid(drawing_id)
        if wanted is None:
            return None
        params: dict[str, Any] = {
            "drawing": wanted,
            "viewer": user.id,
            "text": kept,
            "at": self.now(),
            "answered": reply_to,
            "above": None,
            "mention": None,
        }
        mention: AuthorBody | None = None
        answered: int | None = None
        try:
            with self.database.connect() as conn:
                # Locked until the comment is kept: a drawing, or a comment,
                # deleted meanwhile waits for it.
                drawing = conn.execute(f"{OWNER_SQL} FOR SHARE OF d", params).fetchone()
                if drawing is None:
                    return None
                if reply_to is not None:
                    found = conn.execute(
                        "SELECT c.user_id, c.parent_id, top.id AS above,"
                        " u.public_id, u.username FROM comments c"
                        " JOIN comments top ON top.id = COALESCE(c.parent_id, c.id)"
                        " JOIN users u ON u.id = c.user_id"
                        " WHERE c.id = %(answered)s AND c.drawing_id = %(drawing)s"
                        f" AND {READ} FOR SHARE OF top",
                        params,
                    ).fetchone()
                    if found is None:
                        raise HTTPException(404, NO_COMMENT)
                    answered = found["user_id"]
                    params["above"] = found["above"]
                    # «@name» only before an answer to a reply, and never
                    # one's own name.
                    if found["parent_id"] is not None and answered != user.id:
                        params["mention"] = answered
                        mention = AuthorBody(
                            public_id=found["public_id"], username=found["username"]
                        )
                row = conn.execute(
                    "INSERT INTO comments (drawing_id, user_id, text, created_at,"
                    " parent_id, mention_user_id) VALUES (%(drawing)s, %(viewer)s,"
                    " %(text)s, %(at)s, %(above)s, %(mention)s)"
                    " RETURNING id, created_at",
                    params,
                ).fetchone()
        except pg_errors.ForeignKeyViolation:
            # The account was deleted while it was writing.
            raise AccountError(401, "not_signed_in", NOT_SIGNED_IN) from None
        assert row is not None
        comment = CommentBody(
            id=row["id"],
            author=AuthorBody(public_id=user.public_id, username=user.username),
            text=kept,
            created_at=row["created_at"],
            deletable=True,
            parent_id=params["above"],
            mention=mention,
        )
        return Written(comment, drawing["owner"], answered)

    def add(self, user: UserBody, drawing_id: str, text: str) -> CommentBody | None:
        """A comment of the drawing, as `write` keeps it."""
        written = self.write(user, drawing_id, text)
        return None if written is None else written.comment

    def delete(self, viewer_id: int, comment_id: str) -> Deleted | None:
        """Deletes the comment when `viewer_id` wrote it or owns its drawing;
        "not_yours" when it only sees it; None when it does not, as for an id
        that is not there."""
        wanted = _uuid(comment_id)
        if wanted is None:
            return None
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT c.user_id AS author, r.user_id AS owner,"
                f" {drawing_seen_sql('%s')} AS seen"
                " FROM comments c JOIN drawings d ON d.id = c.drawing_id"
                " JOIN runs r ON r.id = d.run_id WHERE c.id = %s",
                (viewer_id, wanted),
            ).fetchone()
            if row is None:
                return None
            # Who wrote it deletes it even under a drawing made private since.
            if viewer_id in (row["author"], row["owner"]):
                conn.execute("DELETE FROM comments WHERE id = %s", (wanted,))
                return "deleted"
        return "not_yours" if row["seen"] else None


def comments_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> Comments:
    """In the database of the accounts, on the same clock."""
    return Comments(accounts.database, accounts.now)


def comment_routes() -> APIRouter:
    router = APIRouter(tags=["comments"], responses=ACCOUNT_ERRORS)
    # Per account, as the profile pictures: one person, one limit.
    written = RateLimiter(MAX_COMMENTS_PER_MINUTE)

    @router.get(
        "/drawings/{drawing_id}/comments", responses={404: {"model": ErrorBody}}
    )
    def drawing_comments(
        drawing_id: str,
        comments: Annotated[Comments, Depends(comments_of)],
        user: Annotated[UserBody, Depends(current_user)],
        limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = PAGE_SIZE,
        cursor: Annotated[str | None, Query(pattern=CURSOR_PATTERN)] = None,
        threads: Annotated[
            bool,
            Query(
                description=(
                    "The comments only, each with its first replies and how"
                    " many it has; left out, the replies among the comments."
                )
            ),
        ] = False,
    ) -> CommentsBody:
        found = comments.page(user.id, drawing_id, limit, cursor, threads)
        if found is None:
            raise HTTPException(404, NO_DRAWING)
        return found

    @router.get("/comments/{comment_id}/replies", responses={404: {"model": ErrorBody}})
    def comment_replies(
        comment_id: str,
        comments: Annotated[Comments, Depends(comments_of)],
        user: Annotated[UserBody, Depends(current_user)],
        limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = PAGE_SIZE,
        cursor: Annotated[str | None, Query(pattern=CURSOR_PATTERN)] = None,
    ) -> CommentsBody:
        found = comments.replies(user.id, comment_id, limit, cursor)
        if found is None:
            raise HTTPException(404, NO_COMMENT)
        return found

    @router.post(
        "/drawings/{drawing_id}/comments",
        status_code=201,
        responses={404: {"model": ErrorBody}},
    )
    def add_comment(
        drawing_id: str,
        body: CommentRequestBody,
        comments: Annotated[Comments, Depends(comments_of)],
        user: Annotated[UserBody, Depends(current_user)],
        request: Request,
    ) -> CommentBody:
        wait = written.wait_s(str(user.id))
        if wait > 0:
            raise AccountError(
                429, "too_many_requests", TOO_MANY_COMMENTS, math.ceil(wait)
            )
        kept = comments.write(user, drawing_id, body.text, body.reply_to)
        if kept is None:
            raise HTTPException(404, NO_DRAWING)
        pushed_comment(request, user, drawing_id, kept)
        return kept.comment

    @router.delete(
        "/comments/{comment_id}",
        status_code=204,
        responses={403: {"model": ErrorBody}, 404: {"model": ErrorBody}},
    )
    def delete_comment(
        comment_id: str,
        comments: Annotated[Comments, Depends(comments_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> Response:
        deleted = comments.delete(user.id, comment_id)
        if deleted is None:
            raise HTTPException(404, NO_COMMENT)
        if deleted == "not_yours":
            raise HTTPException(403, NOT_YOUR_COMMENT)
        return Response(status_code=204)

    return router


def install_comments(app: FastAPI) -> None:
    """The comments under the drawings; after install_accounts, which sets
    the database and the errors."""
    app.add_exception_handler(CommentRejected, rejected_answer)
    app.include_router(comment_routes())


# --- Push notifications (TASK-262, ADR-0226) ---


def pushed_comment(
    request: Request, user: UserBody, drawing_id: str, written: Written
) -> None:
    """After a comment is kept: the drawing's owner is told (push.py), with
    its beginning. Each comment is news of its own. A reply is told to who
    it answers (TASK-454), and to the owner as a comment unless the owner is
    the one answered: one piece of news, told once."""
    added = written.comment
    if written.answered is not None:
        notify(
            request,
            PushEvent(
                "comment_reply",
                user.id,
                written.answered,
                _uuid(drawing_id),
                text=added.text,
                key=str(added.id),
            ),
        )
        if written.answered == written.owner:
            return
    notify_owner(
        request, "comment", user.id, drawing_id, text=added.text, key=str(added.id)
    )
