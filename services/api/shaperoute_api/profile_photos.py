"""The profile picture of an account (TASK-178, ADR-0146, docs/DATABASE.md).

The app sends a picture once, in base64 inside JSON as for an outline
(images.py). The API keeps only what it makes of it: upright, cropped to the
square in its middle, reduced to PHOTO_SIDE pixels a side and saved again as
JPEG (ADR-0115). The file of the phone is never kept, so neither is its EXIF:
where and when the picture was taken stays on the phone.

Every endpoint needs the token of an account (accounts.py): a picture is
set, read and removed only by its owner, until TASK-116 shows it to the
others. Deleting the account deletes the picture (ON DELETE CASCADE).
"""

from __future__ import annotations

import base64
import io
import math
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Response
from PIL import Image, ImageOps
from psycopg import errors as pg_errors
from pydantic import BaseModel, ConfigDict, Field
from route_engine.models import InvalidRequestError

from shaperoute_api.access import RateLimiter
from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    NOT_SIGNED_IN,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
    now_utc,
)
from shaperoute_api.db import Database
from shaperoute_api.images import decode_image
from shaperoute_api.schemas import MAX_IMAGE_BASE64, MAX_IMAGE_BYTES, ErrorBody

# The side of the square kept, in pixels (ADR-0115).
PHOTO_SIDE = 256
JPEG_QUALITY = 85
# What phones take and the picker sends; anything else is refused by name.
FORMATS = ("JPEG", "PNG")
# A phone's largest photo is 48 megapixels. Read before the pixels are: a
# small file may unfold into a picture that fills the memory.
MAX_PIXELS = 50_000_000
# Behind a transparent picture: a JPEG has no transparency.
BACKGROUND = (255, 255, 255)
# Reducing a picture costs a moment of CPU: nobody changes theirs more often.
MAX_UPLOADS_PER_MINUTE = 10

NO_PHOTO = "This account has no profile picture."
TOO_MANY_PHOTOS = "Too many pictures in a minute: wait a moment and try again."


class ProfilePhotoRequestBody(BaseModel):
    """PUT /me/photo: the picture chosen, as the phone has it."""

    model_config = ConfigDict(extra="forbid")

    image: str = Field(
        max_length=MAX_IMAGE_BASE64,
        description=(
            f"A JPEG or PNG file in base64, at most {MAX_IMAGE_BYTES // 1_000_000} "
            "MB before encoding."
        ),
    )


class ProfilePhotoBody(BaseModel):
    """The picture as the API keeps it:
    packages/shared-types/fixtures/profile-photo.json."""

    image: str = Field(description=f"A square JPEG, {PHOTO_SIDE} px a side, in base64.")
    updated_at: datetime


def square_jpeg(image: bytes) -> bytes:
    """The picture upright, cropped to its middle square, PHOTO_SIDE pixels a
    side, as a JPEG with nothing of the file it came from;
    InvalidRequestError, which says why, when it is not a picture."""
    try:
        picture = Image.open(io.BytesIO(image))
        kind = picture.format
        if kind not in FORMATS:
            raise InvalidRequestError(
                f"image: only JPEG and PNG pictures are supported, got {kind}"
            )
        if picture.width * picture.height > MAX_PIXELS:
            raise InvalidRequestError(
                f"image: at most {MAX_PIXELS // 1_000_000} megapixels, got "
                f"{picture.width * picture.height / 1_000_000:.0f}"
            )
        # JPEG only: decoded near the size wanted, in a fraction of the time.
        picture.draft("RGB", (2 * PHOTO_SIDE, 2 * PHOTO_SIDE))
        # A photo taken sideways says so in its EXIF: turned here, since the
        # EXIF is not kept.
        picture = ImageOps.exif_transpose(picture)
        picture = _opaque(picture)
        picture = ImageOps.fit(
            picture, (PHOTO_SIDE, PHOTO_SIDE), Image.Resampling.LANCZOS
        )
    except InvalidRequestError:
        # A ValueError too: already said in words, not to be said again.
        raise
    except OSError as exc:  # UnidentifiedImageError too
        raise InvalidRequestError(
            f"image: cannot read the picture: {exc.strerror or exc}"
        ) from None
    except (Image.DecompressionBombError, ValueError) as exc:
        raise InvalidRequestError(f"image: cannot read the picture: {exc}") from None
    out = io.BytesIO()
    picture.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return out.getvalue()


def _opaque(picture: Image.Image) -> Image.Image:
    """RGB, with BACKGROUND where the picture was transparent."""
    if picture.mode in ("RGBA", "LA") or "transparency" in picture.info:
        layer = picture.convert("RGBA")
        flat = Image.new("RGB", layer.size, BACKGROUND)
        flat.paste(layer, mask=layer.getchannel("A"))
        return flat
    return picture.convert("RGB")


def _body(jpeg: bytes, updated_at: datetime) -> ProfilePhotoBody:
    return ProfilePhotoBody(
        image=base64.b64encode(jpeg).decode("ascii"), updated_at=updated_at
    )


@dataclass
class ProfilePhotos:
    """The profile pictures in the database."""

    database: Database
    now: Callable[[], datetime] = now_utc

    def get(self, user_id: int) -> ProfilePhotoBody | None:
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT jpeg, updated_at FROM profile_photos WHERE user_id = %s",
                (user_id,),
            ).fetchone()
        return None if row is None else _body(bytes(row["jpeg"]), row["updated_at"])

    def put(self, user_id: int, image: bytes) -> ProfilePhotoBody:
        """The new picture in place of the one before, if any."""
        jpeg = square_jpeg(image)
        now = self.now()
        try:
            with self.database.connect() as conn:
                conn.execute(
                    "INSERT INTO profile_photos (user_id, jpeg, updated_at)"
                    " VALUES (%s, %s, %s)"
                    " ON CONFLICT (user_id) DO UPDATE"
                    " SET jpeg = EXCLUDED.jpeg, updated_at = EXCLUDED.updated_at",
                    (user_id, jpeg, now),
                )
        except pg_errors.ForeignKeyViolation:
            # The account was deleted while its picture was being reduced.
            raise AccountError(401, "not_signed_in", NOT_SIGNED_IN) from None
        return _body(jpeg, now)

    def remove(self, user_id: int) -> None:
        """Gone, or never there: the same."""
        with self.database.connect() as conn:
            conn.execute("DELETE FROM profile_photos WHERE user_id = %s", (user_id,))


def photos_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> ProfilePhotos:
    """In the database of the accounts, on the same clock."""
    return ProfilePhotos(accounts.database, accounts.now)


def profile_photo_routes() -> APIRouter:
    router = APIRouter(tags=["profile"], responses=ACCOUNT_ERRORS)
    # Per account, not per address: PUT is not among the POSTs access.py counts.
    uploads = RateLimiter(MAX_UPLOADS_PER_MINUTE)

    @router.get("/me/photo", responses={404: {"model": ErrorBody}})
    def get_photo(
        photos: Annotated[ProfilePhotos, Depends(photos_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> ProfilePhotoBody:
        photo = photos.get(user.id)
        if photo is None:
            raise HTTPException(404, NO_PHOTO)
        return photo

    # A plain def: decoding a photo takes a moment, in a thread of its own.
    @router.put("/me/photo")
    def put_photo(
        body: ProfilePhotoRequestBody,
        photos: Annotated[ProfilePhotos, Depends(photos_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> ProfilePhotoBody:
        wait = uploads.wait_s(str(user.id))
        if wait > 0:
            raise AccountError(
                429, "too_many_requests", TOO_MANY_PHOTOS, math.ceil(wait)
            )
        return photos.put(user.id, decode_image(body.image))

    @router.delete("/me/photo", status_code=204)
    def remove_photo(
        photos: Annotated[ProfilePhotos, Depends(photos_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> Response:
        photos.remove(user.id)
        return Response(status_code=204)

    return router


def install_profile_photos(app: FastAPI) -> None:
    """The profile pictures of the accounts; after install_accounts, which
    sets the database and the errors."""
    app.include_router(profile_photo_routes())
