"""A member's picture as a small JPEG at an address of its own (TASK-355
part B, docs/API.md, «Feed»).

The lists of people carry the picture inside the answer, in base64
(follows.PersonBody). A page of the feed would carry it once a post, up to
twenty times a page: here it has an address instead, which changes when the
picture does (`avatar_url`), so the phone reads each one once and keeps it.

Only to who is signed in, and never across a block or to an account hidden
from a report's email (follows.apart_sql): as for a member without a
picture, 404.
"""

from __future__ import annotations

import base64
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Response

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import EPOCH, MICROSECOND
from shaperoute_api.db import Database
from shaperoute_api.follows import SMALL_PHOTOS, apart_sql
from shaperoute_api.schemas import ErrorBody

# A day in the phone's own cache, never in a shared one: a new picture is a
# new address.
CACHE_CONTROL = "private, max-age=86400"

NO_AVATAR = "This member has no picture here."


def avatar_url(public_id: UUID, updated_at: datetime) -> str:
    """Where the picture of `public_id` is read; a new picture has a new
    address, so a phone never shows the one before from its cache."""
    version = (updated_at - EPOCH) // MICROSECOND
    return f"/users/{public_id}/photo?v={version}"


class Avatars:
    """The members' small pictures, in the database."""

    def __init__(self, database: Database) -> None:
        self.database = database

    def small_jpeg(self, viewer_id: int, public_id: str) -> bytes | None:
        """The picture of `public_id`, SMALL_PHOTO_SIDE px a side, as
        `viewer_id` may see it; None without one, as for an id that is not
        there."""
        try:
            wanted = UUID(public_id)
        except ValueError:
            return None
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT p.jpeg FROM users u JOIN profile_photos p ON p.user_id = u.id"
                f" WHERE u.public_id = %s AND NOT {apart_sql('%s', 'u.id')}",
                (wanted, viewer_id),
            ).fetchone()
        if row is None:
            return None
        return base64.b64decode(SMALL_PHOTOS.of(bytes(row["jpeg"])))


def avatars_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> Avatars:
    """In the database of the accounts."""
    return Avatars(accounts.database)


def avatar_routes() -> APIRouter:
    router = APIRouter(tags=["profile"], responses=ACCOUNT_ERRORS)

    # A plain def: the first reading of a picture reduces it, in a thread.
    @router.get(
        "/users/{public_id}/photo",
        response_class=Response,
        responses={200: {"content": {"image/jpeg": {}}}, 404: {"model": ErrorBody}},
    )
    def avatar(
        public_id: str,
        avatars: Annotated[Avatars, Depends(avatars_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> Response:
        jpeg = avatars.small_jpeg(user.id, public_id)
        if jpeg is None:
            raise HTTPException(404, NO_AVATAR)
        return Response(
            jpeg, media_type="image/jpeg", headers={"Cache-Control": CACHE_CONTROL}
        )

    return router


def install_avatars(app: FastAPI) -> None:
    """The members' small pictures; after install_accounts, which sets the
    database and the errors."""
    app.include_router(avatar_routes())
