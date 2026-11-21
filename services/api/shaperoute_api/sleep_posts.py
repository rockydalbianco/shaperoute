"""A night of sleep as a post of its own (TASK-467 part E, ADR-0380
precisazione E, docs/API.md, «Sleep»).

A member publishes last night from the Feed's «+», without an activity:
MuW's score, the time asleep and the stages, as the phone worked them out
(ADR-0379). It is a drawing without a run, as a post of photos only
(photo_posts.py, migration 0080), that carries its night
(`drawings.sleep_night_id`, migration 0081): reactions, comments, reports,
blocks and hiding follow every drawing (drawings.drawing_seen_sql), so they
hold for it with no table of its own.

Who sees it is «Everyone» or «Followers», never «Only me»: only what is
published reaches the server. It is published as it is made, one post a
night, by the day the person woke up: sent again it is the same post, with
the figures and the visibility of the last time. Deleting it takes the
night off the server too, unless the profile or an activity still
publishes it (sleep.py). No hour of going to bed or of waking is kept.

It never counts for the game, the contests, the badges or the totals of a
profile, which all start from runs. Only an app that says `sleep` in
X-MuW-Reads receives it (reads.py): the lists carry its night in `sleep`,
and its `source` is `sleep`.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Response
from psycopg.rows import DictRow
from pydantic import Field

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
    now_utc,
)
from shaperoute_api.db import Database, DictConnection
from shaperoute_api.schemas import ErrorBody
from shaperoute_api.sleep import (
    BAD_NIGHT,
    EARLIEST_NIGHT,
    NIGHT_AHEAD,
    NIGHT_COLUMNS,
    SleepFiguresBody,
    _figures,
    _keep,
    _one_at_a_time,
)
from shaperoute_api.sleep_seen import SleepSummaryBody

NO_SLEEP_POST = "No post of this night."
KEY_TAKEN = "Another post of yours has the key of this night's."

# Who can see a post of a night: never «Only me».
SleepPostVisibility = Literal["everyone", "followers"]


def key_of(night: date) -> str:
    """The key of the post of `night`, as a phone would make one
    (activities.Key): one post a night for an account."""
    return f"sleep{night:%Y%m%d}"


class SleepPostRequestBody(SleepFiguresBody):
    """PUT /me/sleep-posts/{night}: fixtures/sleep-post-request.json."""

    visibility: SleepPostVisibility = Field(
        description="Who sees the post: every member, or the followers."
    )


class MySleepPostBody(SleepSummaryBody):
    """The post of a night as its owner reads it: fixtures/sleep-post.json."""

    id: UUID
    visibility: SleepPostVisibility
    published_at: datetime


def _body(row: DictRow) -> MySleepPostBody:
    return MySleepPostBody(
        **_figures(row),
        id=row["id"],
        visibility=row["visibility"],
        published_at=row["published_at"],
    )


def _post(conn: DictConnection, user_id: int, night: date) -> MySleepPostBody | None:
    row = conn.execute(
        f"SELECT {NIGHT_COLUMNS}, d.id, d.visibility, d.published_at"
        " FROM drawings d JOIN sleep_nights n ON n.id = d.sleep_night_id"
        " WHERE d.user_id = %s AND d.key = %s",
        (user_id, key_of(night)),
    ).fetchone()
    return None if row is None else _body(row)


@dataclass
class SleepPosts:
    """The posts of a night of sleep, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime] = now_utc

    def mine(self, user_id: int, night: date) -> MySleepPostBody | None:
        with self.database.connect() as conn:
            return _post(conn, user_id, night)

    def keep(
        self, user_id: int, night: date, body: SleepPostRequestBody
    ) -> MySleepPostBody:
        """The post of `night` as `body` wants it, made and published the
        first time; then its figures and who sees it change, and it is not
        published again. 422 for a day that is no night MuW can keep."""
        now = self.now()
        if not EARLIEST_NIGHT <= night <= now.date() + NIGHT_AHEAD:
            raise AccountError(422, "invalid_request", BAD_NIGHT)
        with self.database.connect() as conn:
            _one_at_a_time(conn, user_id)
            # On the profile or not, as it was: the two are apart.
            night_id = _keep(conn, user_id, night, body, None, now)
            made = conn.execute(
                "INSERT INTO drawings (user_id, key, title, visibility,"
                " description, track, trackless, published_at, updated_at,"
                " sleep_night_id)"
                " VALUES (%s, %s, NULL, %s, NULL, NULL, true, %s, %s, %s)"
                " ON CONFLICT (user_id, key) DO UPDATE"
                " SET visibility = EXCLUDED.visibility,"
                " updated_at = EXCLUDED.updated_at"
                # A post of photos that took this key is not turned into one.
                " WHERE drawings.sleep_night_id IS NOT NULL" " RETURNING id",
                (user_id, key_of(night), body.visibility, now, now, night_id),
            ).fetchone()
            if made is None:
                raise AccountError(409, "http_error", KEY_TAKEN)
            post = _post(conn, user_id, night)
        assert post is not None
        return post

    def remove(self, user_id: int, night: date) -> None:
        """Off the Feed; the second time changes nothing. Its night goes
        with it when nothing else publishes it (migration 0081)."""
        with self.database.connect() as conn:
            _one_at_a_time(conn, user_id)
            conn.execute(
                "DELETE FROM drawings WHERE user_id = %s AND key = %s"
                " AND sleep_night_id IS NOT NULL",
                (user_id, key_of(night)),
            )


# --- The endpoints ---


def sleep_posts_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> SleepPosts:
    """In the database of the accounts, on the same clock."""
    return SleepPosts(accounts.database, accounts.now)


Posts = Annotated[SleepPosts, Depends(sleep_posts_of)]
Me = Annotated[UserBody, Depends(current_user)]


def sleep_post_routes() -> APIRouter:
    router = APIRouter(tags=["sleep"], responses=ACCOUNT_ERRORS)
    unknown: dict[int | str, dict[str, object]] = {404: {"model": ErrorBody}}

    @router.get(
        "/me/sleep-posts/{night}", responses=unknown, response_model_exclude_none=True
    )
    def my_sleep_post(night: date, posts: Posts, user: Me) -> MySleepPostBody:
        found = posts.mine(user.id, night)
        if found is None:
            raise HTTPException(404, NO_SLEEP_POST)
        return found

    # The whole post every time: the app may send it again after a phone
    # without network, and the second time is the same post.
    @router.put("/me/sleep-posts/{night}", response_model_exclude_none=True)
    def keep_sleep_post(
        night: date, body: SleepPostRequestBody, posts: Posts, user: Me
    ) -> MySleepPostBody:
        return posts.keep(user.id, night, body)

    @router.delete("/me/sleep-posts/{night}", status_code=204)
    def remove_sleep_post(night: date, posts: Posts, user: Me) -> Response:
        posts.remove(user.id, night)
        return Response(status_code=204)

    return router


def install_sleep_posts(app: FastAPI) -> None:
    """Needs the accounts (install_accounts) on the same app."""
    app.include_router(sleep_post_routes())
