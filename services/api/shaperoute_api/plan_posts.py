"""A gym plan as a post (TASK-485, ADR-0394, docs/API.md, «Plan posts»).

A member shares one of their gym plans in the Feed, from the «+»: its name,
days, exercises with their kg and its weeks, and a line of their own. It is
a drawing without a run, as a post of photos only (photo_posts.py,
migration 0080), that carries a copy of the plan (`drawings.plan`,
migration 0084): reactions, comments, reports, blocks and hiding follow
every drawing (drawings.drawing_seen_sql), so they hold for it with no
table of its own.

The copy is the plan as it was when it was posted: sent again, the post
keeps it and only its line and who sees it change; changing or deleting
the plan in gym_plans leaves the post as it was. It never carries what is
its owner's own (gym_plans.GymPlanPostedBody): no first day, no paces, no
date of the target. Whoever sees it copies it into their own plans with
«Use this plan», through PUT /me/gym-plans/{key} on the phone: no route of
its own.

Who sees it is «Everyone» or «Followers», never «Only me». It is published
as it is made. It never counts for the game, the contests, the badges or
the totals of a profile, which all start from runs. Only an app that says
`plans` in X-MuW-Reads receives it (reads.py): the lists carry the plan in
`plan`, and its `source` is `plan`.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Response
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
    now_utc,
)
from shaperoute_api.activities import Key
from shaperoute_api.db import Database
from shaperoute_api.drawings import (
    MAX_DESCRIPTION_LENGTH,
    Connection,
    checked_description,
)
from shaperoute_api.gym_plans import GymPlanPostedBody
from shaperoute_api.schemas import ErrorBody

NO_PLAN_POST = "No post of a plan with this key."
KEY_TAKEN = "Another post of yours has this key."

# Who can see a plan posted: never «Only me».
PlanPostVisibility = Literal["everyone", "followers"]


class PlanPostRequestBody(BaseModel):
    """PUT /me/plan-posts/{key}: the post as it should be now:
    packages/shared-types/fixtures/plan-post-request.json."""

    model_config = ConfigDict(extra="forbid")

    plan: GymPlanPostedBody = Field(
        description=(
            "The plan as the post shows it. Kept the first time only: sent"
            " again, the post keeps the plan it was made with."
        )
    )
    description: str | None = Field(
        default=None,
        description=(
            f"Its owner's line, at most {MAX_DESCRIPTION_LENGTH} characters;"
            " null or empty: none."
        ),
    )
    visibility: PlanPostVisibility = Field(
        description="Who can see it: every member, or the followers."
    )


class MyPlanPostBody(BaseModel):
    """A plan posted as its owner has it:
    packages/shared-types/fixtures/my-plan-post.json."""

    key: str
    """The phone's, as in the address."""
    id: UUID
    """What the others open it with: GET /drawings/{id}."""
    description: str | None
    visibility: PlanPostVisibility
    published_at: datetime
    plan: dict[str, Any]
    """As it was posted: `GymPlanPosted`."""


# A drawing that is a plan posted.
PLAN_POST_SQL = "plan IS NOT NULL"
_MY_COLUMNS = "key, id, description, visibility, published_at, plan"


def _body(row: DictRow) -> MyPlanPostBody:
    return MyPlanPostBody(
        key=row["key"],
        id=row["id"],
        description=row["description"],
        visibility=row["visibility"],
        published_at=row["published_at"],
        plan=row["plan"],
    )


def _post(conn: Connection, user_id: int, key: str) -> MyPlanPostBody | None:
    row = conn.execute(
        f"SELECT {_MY_COLUMNS} FROM drawings"
        f" WHERE user_id = %s AND key = %s AND {PLAN_POST_SQL}",
        (user_id, key),
    ).fetchone()
    return None if row is None else _body(row)


@dataclass
class PlanPosts:
    """The plans posted, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime] = now_utc

    def mine(self, user_id: int, key: str) -> MyPlanPostBody | None:
        """The account's plan posted with this key; None: no such post."""
        with self.database.connect() as conn:
            return _post(conn, user_id, key)

    def keep(self, user_id: int, key: str, body: PlanPostRequestBody) -> MyPlanPostBody:
        """The post as `body` wants it, made and published the first time
        with its plan; then only its line and who sees it change. 409 when
        another post of the account has the key."""
        description = checked_description(body.description)
        plan = body.plan.model_dump(mode="json", exclude_none=True)
        now = self.now()
        with self.database.connect() as conn:
            row = conn.execute(
                "INSERT INTO drawings (user_id, key, title, visibility,"
                " description, track, trackless, published_at, updated_at, plan)"
                " VALUES (%s, %s, NULL, %s, %s, NULL, true, %s, %s, %s)"
                " ON CONFLICT (user_id, key) DO UPDATE"
                " SET visibility = EXCLUDED.visibility,"
                " description = EXCLUDED.description,"
                " updated_at = EXCLUDED.updated_at"
                # The plan stays as it was posted; and a post of photos or of
                # a night that took this key is not turned into one.
                f" WHERE drawings.{PLAN_POST_SQL}" f" RETURNING {_MY_COLUMNS}",
                (user_id, key, body.visibility, description, now, now, Jsonb(plan)),
            ).fetchone()
        if row is None:
            raise AccountError(409, "http_error", KEY_TAKEN)
        return _body(row)

    def remove(self, user_id: int, key: str) -> None:
        """Off the Feed, with its reactions, comments and reports; the second
        time changes nothing. Copies already made stay with whoever made
        them: they are plans of their own."""
        with self.database.connect() as conn:
            conn.execute(
                "DELETE FROM drawings WHERE user_id = %s AND key = %s"
                f" AND {PLAN_POST_SQL}",
                (user_id, key),
            )


# --- The endpoints ---


def plan_posts_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> PlanPosts:
    """In the database of the accounts, on the same clock."""
    return PlanPosts(accounts.database, accounts.now)


Posts = Annotated[PlanPosts, Depends(plan_posts_of)]
Me = Annotated[UserBody, Depends(current_user)]


def plan_post_routes() -> APIRouter:
    router = APIRouter(tags=["plan posts"], responses=ACCOUNT_ERRORS)
    unknown: dict[int | str, dict[str, object]] = {404: {"model": ErrorBody}}

    @router.get("/me/plan-posts/{key}", responses=unknown)
    def my_plan_post(key: Key, posts: Posts, user: Me) -> MyPlanPostBody:
        found = posts.mine(user.id, key)
        if found is None:
            raise HTTPException(404, NO_PLAN_POST)
        return found

    # The whole post every time: the app may send it again after a phone
    # without network, and the second time is the same post.
    @router.put("/me/plan-posts/{key}", responses={409: {"model": ErrorBody}})
    def keep_plan_post(
        key: Key, body: PlanPostRequestBody, posts: Posts, user: Me
    ) -> MyPlanPostBody:
        return posts.keep(user.id, key, body)

    @router.delete("/me/plan-posts/{key}", status_code=204)
    def remove_plan_post(key: Key, posts: Posts, user: Me) -> Response:
        posts.remove(user.id, key)
        return Response(status_code=204)

    return router


def install_plan_posts(app: FastAPI) -> None:
    """The gym plans posted; after install_accounts, which sets the database
    and the errors, and install_drawings, whose readers show them."""
    app.include_router(plan_post_routes())
