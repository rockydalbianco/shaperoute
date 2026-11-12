"""A post opened by its link, without an account (TASK-455 part C, ADR-0382,
docs/API.md, «Post links»).

A member who sees a drawing for everyone can share its link: a page of the
site (site/p/), which asks GET /post?id=<the drawing's id> with no account
and no API key (access.OPEN_PATHS). The answer is what the link shows and no
more: the line as a member sees it already, the title, who drew it, its
metres and its sport. Never the photos, the comments, the reactions, the
description, the people tagged, the place nor a time.

Only a drawing every member sees has a link, and only while its owner leaves
«Links to my posts» on (users.post_links, on from the start: the user's
choice of 2026-11-12). The switch is the owner's consent for all its
drawings at once: off, no link to them works, its own included. A drawing
for its followers, a private one, a hidden one, one of a hidden owner, one
with the links off and one that is not there all answer the same 404: a
link tells nothing of what it does not open. Asked again at every request,
so a link stops working the moment its drawing is deleted, made private or
its owner turns the switch off.

The condition is drawings.LINKABLE_SQL, the one the lists of drawings tell
the app with `linkable`: the app offers «Share link» only for a drawing the
page will open.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, Query, Request, Response
from pydantic import BaseModel, ConfigDict

from shaperoute_api.access import RateLimiter, refuse
from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    NOT_SIGNED_IN,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import turn_kept
from shaperoute_api.db import Database
from shaperoute_api.drawings import LINKABLE_SQL, NO_DRAWING, _line
from shaperoute_api.live_shares import SITE_ORIGIN
from shaperoute_api.schemas import ErrorBody

# The page's path: open without the API key (access.OPEN_PATHS).
POST_PATH = "/post"
# Where the link leads: the page reads the id after the «#», which no server
# is sent.
POST_PAGE = f"{SITE_ORIGIN}/p/#"
# One page asks once; more from one address is somebody trying ids.
VIEWS_PER_MINUTE = 60
TOO_MANY_VIEWS = "Too many requests in a minute: wait a moment."

LatLon = tuple[float, float]

# The page is on the site, the API on its own host: only the site reads it,
# and nothing keeps a copy, so a link turned off stops at the next request.
VIEW_HEADERS = {
    "Access-Control-Allow-Origin": SITE_ORIGIN,
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    # Search engines are asked not to list what a link shows.
    "X-Robots-Tag": "noindex, nofollow, noarchive",
}


class PostLinkBody(BaseModel):
    """GET /post?id=…: what the link of a post shows:
    packages/shared-types/fixtures/post-link.json."""

    id: UUID
    username: str
    """Who drew it: the name its profile shows, never the email."""
    title: str | None
    """Its owner's; null: none."""
    shape: str | None
    word: str | None
    route_title: str | None
    """As in a drawing: what its route draws without a shape or a word."""
    distance_m: int
    activity: str
    rotation_deg: float | None
    track: list[LatLon]
    """The line as every member sees it already, whole (ADR-0330)."""


class PostLinksBody(BaseModel):
    """GET and PUT /me/post-links: «Links to my posts»."""

    model_config = ConfigDict(extra="forbid")

    post_links: bool
    """True: the drawings of the account that are for everyone can be opened
    by their link."""


@dataclass
class PostLinks:
    """The links of the posts, in the database of the accounts."""

    database: Database

    def shown(self, drawing_id: str) -> PostLinkBody | None:
        """What the link of `drawing_id` shows; None for a drawing without a
        link, as for an id that is not there."""
        try:
            wanted = UUID(drawing_id)
        except ValueError:
            return None
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT d.id, d.title, r.shape, r.word, r.title AS route_title,"
                " r.distance_m, r.activity, r.route_rotation_deg,"
                " ST_AsGeoJSON(d.track, 15) AS track, u.username"
                " FROM drawings d JOIN runs r ON r.id = d.run_id"
                " JOIN users u ON u.id = r.user_id"
                f" WHERE d.id = %s AND {LINKABLE_SQL}",
                (wanted,),
            ).fetchone()
        if row is None:
            return None
        return PostLinkBody(
            id=row["id"],
            username=row["username"],
            title=row["title"],
            shape=row["shape"],
            word=row["word"],
            route_title=row["route_title"],
            distance_m=row["distance_m"],
            activity=row["activity"],
            rotation_deg=turn_kept(row["route_rotation_deg"]),
            track=_line(row["track"]),
        )

    def switch(self, user_id: int) -> PostLinksBody:
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT post_links FROM users WHERE id = %s", (user_id,)
            ).fetchone()
        if row is None:
            # The account was deleted while it asked.
            raise AccountError(401, "not_signed_in", NOT_SIGNED_IN)
        return PostLinksBody(post_links=row["post_links"])

    def turn(self, user_id: int, on: bool) -> PostLinksBody:
        """The switch as its owner leaves it: from the next request the
        links of its drawings work, or none does."""
        with self.database.connect() as conn:
            row = conn.execute(
                "UPDATE users SET post_links = %s WHERE id = %s RETURNING post_links",
                (on, user_id),
            ).fetchone()
        if row is None:
            raise AccountError(401, "not_signed_in", NOT_SIGNED_IN)
        return PostLinksBody(post_links=row["post_links"])


def post_links_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> PostLinks:
    return PostLinks(accounts.database)


Links = Annotated[PostLinks, Depends(post_links_of)]
Me = Annotated[UserBody, Depends(current_user)]


def post_link_routes() -> APIRouter:
    router = APIRouter(tags=["post links"])

    @router.get(
        POST_PATH,
        response_model=PostLinkBody,
        responses={404: {"model": ErrorBody}, 429: {"model": ErrorBody}},
    )
    def view_post_link(
        request: Request,
        response: Response,
        links: Links,
        id: Annotated[str, Query(max_length=64)],
    ) -> Any:
        limiter: RateLimiter = request.app.state.post_link_limiter
        client = request.client.host if request.client else "unknown"
        wait = limiter.wait_s(client)
        if wait > 0:
            # With the site's headers, so the page reads it and waits.
            return refuse(
                429,
                "too_many_requests",
                TOO_MANY_VIEWS,
                **VIEW_HEADERS,
                **{"Retry-After": str(math.ceil(wait))},
            )
        shown = links.shown(id)
        if shown is None:
            # One answer for every drawing without a link, with the site's
            # headers: the page says it is no longer available.
            return refuse(404, "http_error", NO_DRAWING, **VIEW_HEADERS)
        response.headers.update(VIEW_HEADERS)
        return shown

    @router.get("/me/post-links", responses=ACCOUNT_ERRORS)
    def post_links_switch(links: Links, user: Me) -> PostLinksBody:
        return links.switch(user.id)

    @router.put("/me/post-links", responses=ACCOUNT_ERRORS)
    def turn_post_links(body: PostLinksBody, links: Links, user: Me) -> PostLinksBody:
        return links.turn(user.id, body.post_links)

    return router


def install_post_links(app: FastAPI) -> None:
    """After install_accounts and install_drawings. Without a database the
    endpoints answer 503, as the others of the accounts."""
    app.state.post_link_limiter = RateLimiter(VIEWS_PER_MINUTE)
    app.include_router(post_link_routes())
