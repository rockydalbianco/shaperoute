"""Posts of photos only (TASK-312 part C, ADR-0272, docs/IMPORTAZIONI.md §4,
docs/API.md, «Photo posts»).

A member posts photos taken elsewhere, from Instagram too, without a run:
up to MAX_PHOTOS photos, a title, a description and the members it tags.
It is a drawing without a run (migration 0080): its owner is
`drawings.user_id`, and the phone's key, as a run's, makes a post sent
again without network the same one. Reactions, comments, tags, reports,
blocks and hiding follow every drawing (drawings.drawing_seen_sql), so they
hold for it with no table of its own.

Who sees it is «Everyone» or «Followers», never «Only me»: its photos are
on the server only while others see it (ADR-0170), and one only its owner
saw would be empty. It is published with its first photo: until then
nobody but its owner finds it, and deleting its last photo takes it back.
It never counts for the game, the contests, the badges or the totals of a
profile, which all start from runs; the app shows it with «Imported».

Only an app that says `photos` in X-MuW-Reads receives it (reads.py): it
has no activity, no line, no place and no times.
"""

from __future__ import annotations

import math
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response
from psycopg import errors as pg_errors
from psycopg.rows import DictRow
from pydantic import BaseModel, ConfigDict, Field, field_validator

from shaperoute_api.access import RateLimiter
from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import Key
from shaperoute_api.db import Database
from shaperoute_api.drawing_photos import (
    MAX_UPLOADS_PER_MINUTE,
    TOO_MANY_PHOTOS,
    DrawingPhotoRequestBody,
    Place,
    fitted_jpeg,
    store_photo,
)
from shaperoute_api.drawings import (
    MAX_DESCRIPTION_LENGTH,
    MAX_PHOTOS,
    MAX_TAGS,
    MAX_TITLE_LENGTH,
    ORDER_PHOTO,
    TAG_UNKNOWN,
    Connection,
    Details,
    PhotoBody,
    TagBody,
    _details,
    _tagged,
    checked_description,
    checked_title,
)
from shaperoute_api.images import decode_image
from shaperoute_api.push import notify_tagged
from shaperoute_api.schemas import ErrorBody

NO_PHOTO_POST = "No post of photos with this key."
ORDER_NO_MAP = "A post of photos only has no map: its order names photos only."

# Who can see a post of photos only: never «Only me» (ADR-0272).
PhotoPostVisibility = Literal["everyone", "followers"]


class PhotoPostRequestBody(BaseModel):
    """PUT /me/photo-posts/{key}: the post as it should be now:
    packages/shared-types/fixtures/photo-post-request.json."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(
        default=None,
        description=f"At most {MAX_TITLE_LENGTH} characters; null or empty: none.",
    )
    description: str | None = Field(
        default=None,
        description=(
            f"At most {MAX_DESCRIPTION_LENGTH} characters, lines and all; null"
            " or empty: none."
        ),
    )
    visibility: PhotoPostVisibility = Field(
        description="Who can see it: every member, or the followers."
    )
    tags: list[UUID] = Field(
        default_factory=list,
        max_length=MAX_TAGS,
        description=(
            f"The public_id of the members tagged, in order, at most {MAX_TAGS};"
            " []: none."
        ),
    )


class PhotoPostOrderRequestBody(BaseModel):
    """PUT /me/photo-posts/{key}/order: where each photo stands in the post:
    packages/shared-types/fixtures/photo-post-order-request.json."""

    model_config = ConfigDict(extra="forbid")

    order: list[str] = Field(
        max_length=MAX_PHOTOS,
        description=(
            "The photos by place, `photo:2`, each once; it may name a photo not"
            " sent yet. No map: there is none."
        ),
    )

    @field_validator("order")
    @classmethod
    def _photos_once(cls, order: list[str]) -> list[str]:
        known = {f"{ORDER_PHOTO}{n}" for n in range(1, MAX_PHOTOS + 1)}
        if unknown := [item for item in order if item not in known]:
            raise ValueError(f"unknown items: {unknown}. {ORDER_NO_MAP}")
        if len(set(order)) != len(order):
            raise ValueError("an item comes twice")
        return order


class MyPhotoPostBody(BaseModel):
    """A post of photos only as its owner has it:
    packages/shared-types/fixtures/my-photo-post.json."""

    key: str
    """The phone's, as in the address."""
    id: UUID
    """What the others open it with: GET /drawings/{id}."""
    title: str | None
    description: str | None
    visibility: PhotoPostVisibility
    published_at: datetime | None
    """When the others could first see it: with its first photo; null
    while it has none, and nobody but its owner finds it."""
    tags: list[TagBody]
    photos: list[PhotoBody]
    """In the post's order."""
    order: list[str] | None
    """The post's order, `photo:2`…; null: never ordered, the photos by
    place."""


class MyPhotoPostsBody(BaseModel):
    """GET /me/photo-posts: every post of photos only of the account, the
    last published first, those still waiting for a photo by when they were
    last kept: packages/shared-types/fixtures/my-photo-posts.json. The app
    finds there the key of a post it opened by its id (part C1b)."""

    photo_posts: list[MyPhotoPostBody]


@dataclass(frozen=True)
class Kept:
    """A post as it was kept, and the members tagged who are not to be told
    (push.notify_tagged tells the others): those tagged before, or all of
    them while nobody but its owner sees it."""

    post: MyPhotoPostBody
    not_told: frozenset[int]


# The post of the account with this key, locked until the transaction ends.
POST_OF_KEY = (
    "SELECT id, published_at FROM drawings"
    " WHERE user_id = %s AND key = %s AND run_id IS NULL FOR UPDATE"
)


def _post(conn: Connection, user_id: int, key: str) -> MyPhotoPostBody | None:
    row = conn.execute(
        "SELECT key, id, title, description, visibility, published_at"
        " FROM drawings WHERE user_id = %s AND key = %s AND run_id IS NULL",
        (user_id, key),
    ).fetchone()
    if row is None:
        return None
    return _body(conn, row, user_id)


def _body(
    conn: Connection, row: DictRow, owner: int, details: Details | None = None
) -> MyPhotoPostBody:
    if details is None:
        details = _details(conn, [row["id"]], owner)
    return MyPhotoPostBody(
        key=row["key"],
        id=row["id"],
        title=row["title"],
        description=row["description"],
        visibility=row["visibility"],
        published_at=row["published_at"],
        tags=details.tags.get(row["id"], []),
        photos=details.photos.get(row["id"], []),
        order=details.orders.get(row["id"]),
    )


def _tag_ids(conn: Connection, drawing_id: UUID) -> frozenset[int]:
    rows = conn.execute(
        "SELECT user_id FROM drawing_tags WHERE drawing_id = %s", (drawing_id,)
    ).fetchall()
    return frozenset(int(row["user_id"]) for row in rows)


@dataclass
class PhotoPosts:
    """The posts of photos only, in the database."""

    database: Database
    now: Callable[[], datetime]

    def mine(self, user_id: int, key: str) -> MyPhotoPostBody | None:
        """The account's post with this key; None: no such post."""
        with self.database.connect() as conn:
            return _post(conn, user_id, key)

    def all_mine(self, user_id: int) -> MyPhotoPostsBody:
        """Every post of the account, the last published first."""
        with self.database.connect() as conn:
            rows = conn.execute(
                "SELECT key, id, title, description, visibility, published_at"
                " FROM drawings WHERE user_id = %s AND run_id IS NULL"
                " ORDER BY coalesce(published_at, updated_at) DESC, id DESC",
                (user_id,),
            ).fetchall()
            details = _details(conn, [row["id"] for row in rows], user_id)
            return MyPhotoPostsBody(
                photo_posts=[_body(conn, row, user_id, details) for row in rows]
            )

    def keep(self, user_id: int, key: str, body: PhotoPostRequestBody) -> Kept:
        """The post as `body` wants it, made the first time. 422 for a field
        refused. Who sees it changing between everyone and the followers
        does not publish it again."""
        title = checked_title(body.title)
        description = checked_description(body.description)
        now = self.now()
        try:
            with self.database.connect() as conn:
                tagged = _tagged(conn, user_id, body.tags)
                found = conn.execute(POST_OF_KEY, (user_id, key)).fetchone()
                before = frozenset() if found is None else _tag_ids(conn, found["id"])
                row = conn.execute(
                    "INSERT INTO drawings (user_id, key, title, visibility,"
                    " description, track, trackless, published_at, updated_at)"
                    " VALUES (%s, %s, %s, %s, %s, NULL, true, NULL, %s)"
                    " ON CONFLICT (user_id, key) DO UPDATE SET title = EXCLUDED.title,"
                    " visibility = EXCLUDED.visibility,"
                    " description = EXCLUDED.description,"
                    " updated_at = EXCLUDED.updated_at"
                    " RETURNING id, key, title, description, visibility, published_at",
                    (user_id, key, title, body.visibility, description, now),
                ).fetchone()
                assert row is not None
                conn.execute(
                    "DELETE FROM drawing_tags WHERE drawing_id = %s", (row["id"],)
                )
                if tagged:
                    conn.cursor().executemany(
                        "INSERT INTO drawing_tags (drawing_id, user_id, position)"
                        " VALUES (%s, %s, %s)",
                        [
                            (row["id"], tagged_id, position)
                            for position, tagged_id in enumerate(tagged, start=1)
                        ],
                    )
                post = _body(conn, row, user_id)
        except pg_errors.ForeignKeyViolation:
            # A member tagged deleted its account while this was written.
            raise AccountError(422, "invalid_request", TAG_UNKNOWN) from None
        # Before its first photo nobody sees it: those tagged are told when
        # it is published (put_photo).
        if post.published_at is None:
            return Kept(post, frozenset(tagged))
        return Kept(post, before)

    def remove(self, user_id: int, key: str) -> None:
        """The post deleted, with its photos, tags, reactions, comments and
        reports; one not there: the same."""
        with self.database.connect() as conn:
            conn.execute(
                "DELETE FROM drawings WHERE user_id = %s AND key = %s"
                " AND run_id IS NULL",
                (user_id, key),
            )

    def put_photo(self, user_id: int, key: str, n: int, image: bytes) -> Kept | None:
        """The photo in place `n`; None: no such post. The first one
        publishes the post, and its tags are told then."""
        photo = fitted_jpeg(image)
        now = self.now()
        with self.database.connect() as conn:
            found = conn.execute(POST_OF_KEY, (user_id, key)).fetchone()
            if found is None:
                return None
            store_photo(conn, found["id"], n, photo, now)
            # Published now: everyone tagged is told; already: nobody again.
            not_told: frozenset[int] = frozenset()
            if found["published_at"] is None:
                conn.execute(
                    "UPDATE drawings SET published_at = %s WHERE id = %s",
                    (now, found["id"]),
                )
            else:
                not_told = _tag_ids(conn, found["id"])
            post = _post(conn, user_id, key)
        assert post is not None
        return Kept(post, not_told)

    def remove_photo(self, user_id: int, key: str, n: int) -> bool:
        """Place `n` empty, or empty already: the same; False: no such post.
        Its last photo gone, nobody but its owner sees it until the next."""
        with self.database.connect() as conn:
            found = conn.execute(POST_OF_KEY, (user_id, key)).fetchone()
            if found is None:
                return False
            conn.execute(
                "DELETE FROM drawing_photos WHERE drawing_id = %s AND n = %s",
                (found["id"], n),
            )
            conn.execute(
                "UPDATE drawings SET published_at = NULL WHERE id = %s"
                " AND NOT EXISTS (SELECT 1 FROM drawing_photos p"
                " WHERE p.drawing_id = drawings.id)",
                (found["id"],),
            )
        return True

    def put_order(
        self, user_id: int, key: str, order: list[str]
    ) -> MyPhotoPostBody | None:
        """The order of the post's photos; None: no such post."""
        with self.database.connect() as conn:
            found = conn.execute(POST_OF_KEY, (user_id, key)).fetchone()
            if found is None:
                return None
            conn.execute(
                "UPDATE drawings SET item_order = %s WHERE id = %s",
                (order, found["id"]),
            )
            return _post(conn, user_id, key)


def photo_posts_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> PhotoPosts:
    """In the database of the accounts, on the same clock."""
    return PhotoPosts(accounts.database, accounts.now)


Posts = Annotated[PhotoPosts, Depends(photo_posts_of)]
Me = Annotated[UserBody, Depends(current_user)]


def _told(request: Request, user: UserBody, kept: Kept) -> None:
    """After the write: each member tagged and not in `not_told` is told
    (push.py), when they may see the post; never raises."""
    if kept.post.tags:
        notify_tagged(request, user.id, kept.post.id, kept.not_told)


def photo_post_routes() -> APIRouter:
    router = APIRouter(tags=["photo posts"], responses=ACCOUNT_ERRORS)
    # Per account, as the photos of a run's drawing.
    uploads = RateLimiter(MAX_UPLOADS_PER_MINUTE)
    unknown = {404: {"model": ErrorBody}}

    @router.get("/me/photo-posts")
    def my_photo_posts(posts: Posts, user: Me) -> MyPhotoPostsBody:
        return posts.all_mine(user.id)

    @router.get("/me/photo-posts/{key}", responses=unknown)
    def my_photo_post(key: Key, posts: Posts, user: Me) -> MyPhotoPostBody:
        found = posts.mine(user.id, key)
        if found is None:
            raise HTTPException(404, NO_PHOTO_POST)
        return found

    # The whole post every time: the app may send it again after a phone
    # without network, and the second time changes nothing.
    @router.put("/me/photo-posts/{key}")
    def keep_photo_post(
        key: Key,
        body: PhotoPostRequestBody,
        posts: Posts,
        user: Me,
        request: Request,
    ) -> MyPhotoPostBody:
        kept = posts.keep(user.id, key, body)
        _told(request, user, kept)
        return kept.post

    @router.delete("/me/photo-posts/{key}", status_code=204)
    def remove_photo_post(key: Key, posts: Posts, user: Me) -> Response:
        posts.remove(user.id, key)
        return Response(status_code=204)

    # A plain def: reducing a photo takes a moment, in a thread of its own.
    @router.put("/me/photo-posts/{key}/photos/{n}", responses=unknown)
    def put_photo(
        key: Key,
        n: Place,
        body: DrawingPhotoRequestBody,
        posts: Posts,
        user: Me,
        request: Request,
    ) -> MyPhotoPostBody:
        wait = uploads.wait_s(str(user.id))
        if wait > 0:
            raise AccountError(
                429, "too_many_requests", TOO_MANY_PHOTOS, math.ceil(wait)
            )
        kept = posts.put_photo(user.id, key, n, decode_image(body.image))
        if kept is None:
            raise HTTPException(404, NO_PHOTO_POST)
        _told(request, user, kept)
        return kept.post

    @router.delete(
        "/me/photo-posts/{key}/photos/{n}", status_code=204, responses=unknown
    )
    def remove_photo(key: Key, n: Place, posts: Posts, user: Me) -> Response:
        if not posts.remove_photo(user.id, key, n):
            raise HTTPException(404, NO_PHOTO_POST)
        return Response(status_code=204)

    @router.put("/me/photo-posts/{key}/order", responses=unknown)
    def put_order(
        key: Key, body: PhotoPostOrderRequestBody, posts: Posts, user: Me
    ) -> MyPhotoPostBody:
        found = posts.put_order(user.id, key, body.order)
        if found is None:
            raise HTTPException(404, NO_PHOTO_POST)
        return found

    return router


def install_photo_posts(app: FastAPI) -> None:
    """The posts of photos only; after install_accounts, which sets the
    database and the errors, and install_drawings, whose readers show them."""
    app.include_router(photo_post_routes())
