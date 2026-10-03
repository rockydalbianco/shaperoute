"""The photos of a drawing, besides its map (TASK-208, ADR-0170,
docs/API.md, «Drawings»).

Up to MAX_PHOTOS per drawing, each in its place, 1 to 3: putting a photo in
a place replaces the one there, deleting it leaves the place empty and the
others where they are, so a request sent again by a phone without network
changes nothing the second time.

The app sends a photo once, in base64 inside JSON, as the profile picture
(profile_photos.py, ADR-0146). The API keeps only what it makes of it:
upright, at most PHOTO_SIDE pixels on its longer side and saved again as
JPEG. The file of the phone is never kept, so neither is its EXIF: where
and when it was taken stays on the phone. They are kept in the database,
with the rest of the account (ADR-0115).

The owner puts and deletes them through its run in My activities; whoever
may see the drawing (drawings.drawing_seen_sql) reads them, as JPEG files.
Deleting the run, the drawing's run, or the account deletes them.
"""

from __future__ import annotations

import io
import math
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Path, Response
from PIL import Image, ImageOps
from pydantic import BaseModel, ConfigDict, Field
from route_engine.models import InvalidRequestError

from shaperoute_api.access import RateLimiter
from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.activities import UNKNOWN_ACTIVITY, Key
from shaperoute_api.db import Database
from shaperoute_api.drawings import (
    MAX_PHOTOS,
    NO_DRAWING,
    Drawings,
    MyDrawingBody,
    drawing_seen_sql,
    run_drawing,
    run_of,
)
from shaperoute_api.images import decode_image
from shaperoute_api.profile_photos import BACKGROUND, FORMATS, MAX_PIXELS
from shaperoute_api.schemas import MAX_IMAGE_BASE64, MAX_IMAGE_BYTES, ErrorBody

# The longer side kept, in pixels: a phone's screen wide, about 0.1-0.3 MB a
# photo (ADR-0170).
PHOTO_SIDE = 1080
JPEG_QUALITY = 82
# Three photos a run, and a few runs: a minute is plenty.
MAX_UPLOADS_PER_MINUTE = 20
# The address of a photo changes when the photo does (drawings.photo_url):
# a day in the phone's own cache, never in a shared one.
CACHE_CONTROL = "private, max-age=86400"

NO_PHOTO = "This drawing has no photo here."
TOO_MANY_PHOTOS = "Too many photos in a minute: wait a moment and try again."

Place = Annotated[int, Path(ge=1, le=MAX_PHOTOS, description="Its place, 1-3.")]


class DrawingPhotoRequestBody(BaseModel):
    """PUT /me/activities/{key}/drawing/photos/{n}: the photo chosen, as the
    phone has it: packages/shared-types/fixtures/drawing-photo-request.json."""

    model_config = ConfigDict(extra="forbid")

    image: str = Field(
        max_length=MAX_IMAGE_BASE64,
        description=(
            f"A JPEG or PNG file in base64, at most {MAX_IMAGE_BYTES // 1_000_000} "
            "MB before encoding."
        ),
    )


@dataclass(frozen=True)
class Photo:
    """A photo as the API keeps it."""

    jpeg: bytes
    width: int
    height: int


def fitted_jpeg(image: bytes) -> Photo:
    """The photo upright, at most PHOTO_SIDE pixels on its longer side, as
    a JPEG with nothing of the file it came from; InvalidRequestError, which
    says why, when it is not a picture."""
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
        # Never larger than it came.
        picture.thumbnail((PHOTO_SIDE, PHOTO_SIDE), Image.Resampling.LANCZOS)
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
    return Photo(out.getvalue(), picture.width, picture.height)


def _opaque(picture: Image.Image) -> Image.Image:
    """RGB, with BACKGROUND where the picture was transparent."""
    if picture.mode in ("RGBA", "LA") or "transparency" in picture.info:
        layer = picture.convert("RGBA")
        flat = Image.new("RGB", layer.size, BACKGROUND)
        flat.paste(layer, mask=layer.getchannel("A"))
        return flat
    return picture.convert("RGB")


@dataclass
class DrawingPhotos:
    """The photos of the drawings, in the database."""

    database: Database
    now: Callable[[], datetime]

    def put(self, user_id: int, key: str, n: int, image: bytes) -> bool:
        """The photo in place `n` of the run's drawing, made for its owner
        only if the run had none; False: no such run."""
        photo = fitted_jpeg(image)
        now = self.now()
        with self.database.connect() as conn:
            drawn = run_drawing(conn, user_id, key, now)
            if drawn is None:
                return False
            _, drawing_id = drawn
            conn.execute(
                "INSERT INTO drawing_photos (drawing_id, n, jpeg, width, height,"
                " updated_at) VALUES (%s, %s, %s, %s, %s, %s)"
                " ON CONFLICT (drawing_id, n) DO UPDATE SET jpeg = EXCLUDED.jpeg,"
                " width = EXCLUDED.width, height = EXCLUDED.height,"
                " updated_at = EXCLUDED.updated_at",
                (drawing_id, n, photo.jpeg, photo.width, photo.height, now),
            )
        return True

    def remove(self, user_id: int, key: str, n: int) -> bool:
        """Place `n` empty, or empty already: the same; False: no such run."""
        with self.database.connect() as conn:
            run_id = run_of(conn, user_id, key)
            if run_id is None:
                return False
            conn.execute(
                "DELETE FROM drawing_photos p USING drawings d"
                " WHERE p.drawing_id = d.id AND d.run_id = %s AND p.n = %s",
                (run_id, n),
            )
        return True

    def seen(self, viewer_id: int, drawing_id: str, n: int) -> bytes:
        """The JPEG in place `n`, for one who may see the drawing; 404 when
        it may not, as for a drawing that is not there, or when the place is
        empty."""
        try:
            wanted = UUID(drawing_id)
        except ValueError:
            raise HTTPException(404, NO_DRAWING) from None
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT p.jpeg FROM drawings d JOIN runs r ON r.id = d.run_id"
                " LEFT JOIN drawing_photos p ON p.drawing_id = d.id AND p.n = %s"
                f" WHERE d.id = %s AND {drawing_seen_sql('%s')}",
                (n, wanted, viewer_id),
            ).fetchone()
        if row is None:
            raise HTTPException(404, NO_DRAWING)
        if row["jpeg"] is None:
            raise HTTPException(404, NO_PHOTO)
        return bytes(row["jpeg"])


def drawing_photos_of(
    accounts: Annotated[Accounts, Depends(accounts_of)],
) -> DrawingPhotos:
    """In the database of the accounts, on the same clock."""
    return DrawingPhotos(accounts.database, accounts.now)


Photos = Annotated[DrawingPhotos, Depends(drawing_photos_of)]
Me = Annotated[UserBody, Depends(current_user)]


def drawing_photo_routes() -> APIRouter:
    router = APIRouter(tags=["drawings"], responses=ACCOUNT_ERRORS)
    # Per account, not per address: PUT is not among the POSTs access.py counts.
    uploads = RateLimiter(MAX_UPLOADS_PER_MINUTE)

    # A plain def: reducing a photo takes a moment, in a thread of its own.
    @router.put(
        "/me/activities/{key}/drawing/photos/{n}",
        responses={404: {"model": ErrorBody}},
    )
    def put_photo(
        key: Key,
        n: Place,
        body: DrawingPhotoRequestBody,
        photos: Photos,
        user: Me,
    ) -> MyDrawingBody:
        wait = uploads.wait_s(str(user.id))
        if wait > 0:
            raise AccountError(
                429, "too_many_requests", TOO_MANY_PHOTOS, math.ceil(wait)
            )
        if not photos.put(user.id, key, n, decode_image(body.image)):
            raise HTTPException(404, UNKNOWN_ACTIVITY)
        drawing = Drawings(photos.database, photos.now).mine(user.id, key)
        if drawing is None:
            # The run was deleted right after its photo went in.
            raise HTTPException(404, UNKNOWN_ACTIVITY)
        return drawing

    @router.delete(
        "/me/activities/{key}/drawing/photos/{n}",
        status_code=204,
        responses={404: {"model": ErrorBody}},
    )
    def remove_photo(key: Key, n: Place, photos: Photos, user: Me) -> Response:
        if not photos.remove(user.id, key, n):
            raise HTTPException(404, UNKNOWN_ACTIVITY)
        return Response(status_code=204)

    @router.get(
        "/drawings/{drawing_id}/photos/{n}",
        response_class=Response,
        responses={
            200: {"content": {"image/jpeg": {}}},
            404: {"model": ErrorBody},
        },
    )
    def get_photo(drawing_id: str, n: Place, photos: Photos, user: Me) -> Response:
        return Response(
            photos.seen(user.id, drawing_id, n),
            media_type="image/jpeg",
            headers={"Cache-Control": CACHE_CONTROL},
        )

    return router


def install_drawing_photos(app: FastAPI) -> None:
    """The photos of the drawings; after install_accounts, which sets the
    database and the errors."""
    app.include_router(drawing_photo_routes())
