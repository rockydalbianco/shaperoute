"""A member's gear (TASK-486, ADR-0393, docs/API.md, «Gear»).

Shoes, a bike, skis, a helmet, a harness, a sail: anything a member uses,
from a fixed list of kinds (GearKind, which may only grow), with its brand,
a model, a name of its own, the day it was bought, a note and a photo. An
item goes on activities (`activity_gear`, at most MAX_ON_ACTIVITY to one)
and its totals, metres, seconds and activities, are counted here from those
runs, as the totals of a profile: never numbers the phone sends.

- GET /me/gear: every item of who asks, in use first, with what only its
  owner reads (`off_profile`, `limit_m`, `defaults`, `hidden`).
- POST /me/gear, PUT /me/gear/{id}: the whole item; DELETE /me/gear/{id}.
- PUT /me/gear/{id}/photo, DELETE /me/gear/{id}/photo: one photo an item,
  upright, at most PHOTO_SIDE pixels on its longer side, a new JPEG without
  the phone's EXIF (as profile_photos.py).
- GET /me/activities/{key}/gear, PUT /me/activities/{key}/gear: the items
  of an activity, the whole list. The app sends the defaults of the sport
  at the end of an activity (`defaults`, more than one for a sport).
- GET /users/{public_id}/gear: the gear of a profile, to whoever sees the
  profile (every member but one a block keeps apart, follows.apart_sql:
  404 then, as for nobody), without the items «Hide from profile».
- GET /drawings/{id}/gear: the items on the activity of a post, to whoever
  sees the post (drawings.drawing_seen_sql: 404 otherwise), as on the
  profile: without the items «Hide from profile» (part E).
- GET /gear/{id}, GET /gear/{id}/photo: one item and its photo, to whoever
  sees it as above (a post or a tagged item opens it).

The brand, the model, the name and the note are words others read: no
address, no control characters but the note's new lines, and nothing the
comment filter refuses (422 comment_rejected, comment_filter.py). An item
is reported (moderation.py); hidden from a report's email (report_email.py)
only its owner sees it. Deleting the account deletes the gear, its photos
and its links (ON DELETE CASCADE); deleting an activity takes its links.
"""

from __future__ import annotations

import io
import math
import unicodedata
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import date, datetime
from typing import Annotated, Any, Literal, get_args
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response
from PIL import Image, ImageOps
from psycopg import Connection
from psycopg import errors as pg_errors
from psycopg.rows import DictRow
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
)
from shaperoute_api.activities import UNKNOWN_ACTIVITY, Key, RunActivity
from shaperoute_api.comment_filter import check_comment
from shaperoute_api.comments import CommentRejected
from shaperoute_api.db import Database
from shaperoute_api.drawings import NO_DRAWING, drawing_seen_sql
from shaperoute_api.follows import apart_sql
from shaperoute_api.images import decode_image
from shaperoute_api.outfit_links import has_address
from shaperoute_api.profile_photos import FORMATS, JPEG_QUALITY, MAX_PIXELS
from shaperoute_api.push import PushEvent, notify
from shaperoute_api.schemas import MAX_IMAGE_BASE64, MAX_IMAGE_BYTES, ErrorBody

# The list the app shows, grouped by its families; the migration's CHECK
# holds the same names (a test reads it). It may grow with a migration,
# never shrink.
GearKind = Literal[
    "shoes",
    "bike",
    "skis",
    "ski_boots",
    "snowboard",
    "poles",
    "boots",
    "climbing_shoes",
    "harness",
    "helmet",
    "rope",
    "crampons",
    "ice_axe",
    "snowshoes",
    "inline_skates",
    "sail",
    "board",
    "paddle",
    "boat",
    "wetsuit",
    "paraglider",
    "wheelchair",
    "clothing",
    "backpack",
    "watch",
    "other",
]
GEAR_KINDS: tuple[GearKind, ...] = get_args(GearKind)
ACTIVITIES: tuple[RunActivity, ...] = get_args(RunActivity)

MAX_GEAR = 200
MAX_ON_ACTIVITY = 10
MAX_BRAND_LENGTH = 40
MAX_MODEL_LENGTH = 80
MAX_NAME_LENGTH = 40
MAX_NOTE_LENGTH = 500
MIN_LIMIT_M = 1_000
MAX_LIMIT_M = 100_000_000
FIRST_DAY = date(1950, 1, 1)
# The longer side of a photo kept: a card and the item's own page.
PHOTO_SIDE = 1024
BACKGROUND = (255, 255, 255)
MAX_UPLOADS_PER_MINUTE = 10
# A photo changes only when its address does (`?v=`).
PHOTO_CACHE = "private, max-age=31536000, immutable"

NO_GEAR = "No gear with this id."
NO_PHOTO = "This gear has no photo."
NO_PROFILE = "No profile with this id."
NO_BRAND = "Say the brand."
GEAR_FULL = f"You have {MAX_GEAR} items of gear: delete one to add another."
NOT_TEXT = "One line of words: no control characters."
NO_LINKS = "Links can't go in gear."
BOUGHT_LATER = "The day it was bought can't be after today."
TOO_MANY_PHOTOS = "Too many photos in a minute: wait a moment and try again."


# --- The bodies ---


class GearRequestBody(BaseModel):
    """POST /me/gear and PUT /me/gear/{id}: the whole item."""

    model_config = ConfigDict(extra="forbid")

    kind: GearKind
    brand: str = Field(min_length=1, max_length=MAX_BRAND_LENGTH)
    model: str | None = Field(default=None, max_length=MAX_MODEL_LENGTH)
    name: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    bought_on: date | None = Field(default=None, ge=FIRST_DAY)
    note: str | None = Field(default=None, max_length=MAX_NOTE_LENGTH)
    limit_m: int | None = Field(default=None, ge=MIN_LIMIT_M, le=MAX_LIMIT_M)
    """A limit in metres (700 km for shoes): the app says when it is passed."""
    off_profile: bool = False
    """«Hide from profile»: the others do not see it; it still counts."""
    retired: bool = False
    """«Retire»: out of the choice at the end of an activity, kept."""
    defaults: list[RunActivity] = Field(default=[], max_length=len(ACTIVITIES))
    """The sports whose activities start with it chosen."""


class GearTotalsBody(BaseModel):
    distance_m: int
    duration_s: int
    activities: int


class GearBody(BaseModel):
    """An item. `off_profile`, `limit_m`, `defaults` and `hidden` only to its
    owner: absent for the others."""

    id: UUID
    kind: GearKind
    brand: str
    model: str | None = None
    name: str | None = None
    bought_on: date | None = None
    note: str | None = None
    photo_url: str | None = None
    """Where GET /gear/{id}/photo reads it, with its version."""
    retired: bool
    totals: GearTotalsBody
    created_at: datetime
    off_profile: bool | None = None
    limit_m: int | None = None
    defaults: list[RunActivity] | None = None
    hidden: bool | None = None
    """Hidden by whoever runs MuW after a report: the others do not see it."""


class GearListBody(BaseModel):
    gear: list[GearBody]


class ActivityGearRequestBody(BaseModel):
    """PUT /me/activities/{key}/gear: the whole list of the activity."""

    model_config = ConfigDict(extra="forbid")

    gear_ids: list[UUID] = Field(max_length=MAX_ON_ACTIVITY)


class GearPhotoRequestBody(BaseModel):
    """PUT /me/gear/{id}/photo: the photo chosen, as the phone has it."""

    model_config = ConfigDict(extra="forbid")

    image: str = Field(
        max_length=MAX_IMAGE_BASE64,
        description=(
            f"A JPEG or PNG file in base64, at most {MAX_IMAGE_BYTES // 1_000_000} "
            "MB before encoding."
        ),
    )


# --- The words ---


def _line(value: str | None) -> str | None:
    """A brand, a model or a name: trimmed, one line, no address, nothing
    the filter refuses; None when empty."""
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if any(unicodedata.category(ch).startswith("C") for ch in value):
        raise AccountError(422, "invalid_request", NOT_TEXT)
    return _checked(value)


def _note(value: str | None) -> str | None:
    """The note: new lines allowed, otherwise as a line."""
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if any(unicodedata.category(ch).startswith("C") and ch != "\n" for ch in value):
        raise AccountError(422, "invalid_request", NOT_TEXT)
    return _checked(value)


def _checked(value: str) -> str:
    if has_address(value):
        raise AccountError(422, "invalid_request", NO_LINKS)
    reason = check_comment(value)
    if reason is not None:
        raise CommentRejected(reason)
    return value


@dataclass(frozen=True)
class _Item:
    """An item of a POST or a PUT, checked."""

    kind: str
    brand: str
    model: str | None
    name: str | None
    bought_on: date | None
    note: str | None
    limit_m: int | None
    off_profile: bool
    retired: bool
    defaults: tuple[str, ...]


def _item(body: GearRequestBody, today: date) -> _Item:
    brand = _line(body.brand)
    if brand is None:
        raise AccountError(422, "invalid_request", NO_BRAND)
    if body.bought_on is not None and body.bought_on > today:
        raise AccountError(422, "invalid_request", BOUGHT_LATER)
    return _Item(
        kind=body.kind,
        brand=brand,
        model=_line(body.model),
        name=_line(body.name),
        bought_on=body.bought_on,
        note=_note(body.note),
        limit_m=body.limit_m,
        off_profile=body.off_profile,
        retired=body.retired,
        defaults=tuple(dict.fromkeys(body.defaults)),
    )


# --- The photo ---


def gear_jpeg(image: bytes) -> bytes:
    """The photo upright, at most PHOTO_SIDE pixels on its longer side, as a
    JPEG with nothing of the file it came from; InvalidRequestError, which
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
        picture.draft("RGB", (2 * PHOTO_SIDE, 2 * PHOTO_SIDE))
        picture = ImageOps.exif_transpose(picture)
        if picture.mode in ("RGBA", "LA") or "transparency" in picture.info:
            layer = picture.convert("RGBA")
            flat = Image.new("RGB", layer.size, BACKGROUND)
            flat.paste(layer, mask=layer.getchannel("A"))
            picture = flat
        else:
            picture = picture.convert("RGB")
        picture = ImageOps.contain(
            picture, (PHOTO_SIDE, PHOTO_SIDE), Image.Resampling.LANCZOS
        )
    except InvalidRequestError:
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


def photo_url(gear_id: UUID, updated_at: datetime | None) -> str | None:
    """Where the photo is read, with its version; None without one."""
    if updated_at is None:
        return None
    return f"/gear/{gear_id}/photo?v={int(updated_at.timestamp() * 1000)}"


# --- In the database ---

# An item with its photo's version, its totals and its defaults; `WHERE`
# after it.
_SELECT = (
    "SELECT g.id, g.user_id, g.kind, g.brand, g.model, g.name, g.bought_on,"
    " g.note, g.limit_m, g.off_profile, g.retired_at, g.hidden_at,"
    " g.created_at, p.updated_at AS photo_at, t.distance_m, t.duration_s,"
    " t.activities,"
    " ARRAY(SELECT d.activity FROM gear_defaults d WHERE d.gear_id = g.id"
    " ORDER BY d.activity) AS defaults"
    " FROM gear g LEFT JOIN gear_photos p ON p.gear_id = g.id"
    " CROSS JOIN LATERAL (SELECT coalesce(sum(r.distance_m), 0) AS distance_m,"
    " coalesce(sum(r.duration_s), 0) AS duration_s, count(r.id) AS activities"
    " FROM activity_gear ag JOIN runs r ON r.id = ag.run_id"
    " WHERE ag.gear_id = g.id) t"
)
# In use first, then the retired ones; the oldest first within each.
_ORDER = " ORDER BY g.retired_at IS NOT NULL, g.created_at, g.id"


def _seen_sql(viewer: str) -> str:
    """An SQL condition: the one in `viewer` sees the item `g`. Its owner
    always; another member when the item is on the profile, not hidden after
    a report, and no block keeps the two apart. `viewer` is read twice: a
    placeholder takes its value twice."""
    return (
        f"(g.user_id = {viewer} OR (NOT g.off_profile AND g.hidden_at IS NULL"
        f" AND NOT {apart_sql(viewer, 'g.user_id')}))"
    )


def _body(row: Any, viewer_id: int) -> GearBody:
    mine = row["user_id"] == viewer_id
    return GearBody(
        id=row["id"],
        kind=row["kind"],
        brand=row["brand"],
        model=row["model"],
        name=row["name"],
        bought_on=row["bought_on"],
        note=row["note"],
        photo_url=photo_url(row["id"], row["photo_at"]),
        retired=row["retired_at"] is not None,
        totals=GearTotalsBody(
            distance_m=int(row["distance_m"]),
            duration_s=int(row["duration_s"]),
            activities=int(row["activities"]),
        ),
        created_at=row["created_at"],
        off_profile=row["off_profile"] if mine else None,
        limit_m=row["limit_m"] if mine else None,
        defaults=[d for d in row["defaults"] if d in ACTIVITIES] if mine else None,
        hidden=(row["hidden_at"] is not None) if mine else None,
    )


@dataclass
class Gear:
    """The gear in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]

    def mine(self, user_id: int) -> list[GearBody]:
        with self.database.connect() as conn:
            rows = conn.execute(
                _SELECT + " WHERE g.user_id = %s" + _ORDER, (user_id,)
            ).fetchall()
        return [_body(row, user_id) for row in rows]

    def of_profile(self, viewer_id: int, public_id: str) -> list[GearBody] | None:
        """The items the one who asks sees on a profile; None for no such
        profile or one a block keeps apart. Its owner sees it as the others
        do, with its items hidden after a report."""
        try:
            wanted = UUID(public_id)
        except ValueError:
            return None
        with self.database.connect() as conn:
            owner = conn.execute(
                "SELECT u.id FROM users u WHERE u.public_id = %s"
                f" AND NOT {apart_sql('%s', 'u.id')}",
                (wanted, viewer_id),
            ).fetchone()
            if owner is None:
                return None
            rows = conn.execute(
                _SELECT + " WHERE g.user_id = %s AND NOT g.off_profile"
                " AND (g.hidden_at IS NULL OR g.user_id = %s)" + _ORDER,
                (owner["id"], viewer_id),
            ).fetchall()
        return [_body(row, viewer_id) for row in rows]

    def of_drawing(self, viewer_id: int, drawing_id: str) -> list[GearBody] | None:
        """The items on the activity of a post (TASK-486 part E, the user's
        choice 6), for whoever sees the post; None for no such post or one
        `viewer_id` does not see. As on the profile: never the items «Hide
        from profile», not even for their owner; the ones hidden after a
        report only for their owner. A post of photos only has none."""
        try:
            wanted = UUID(drawing_id)
        except ValueError:
            return None
        with self.database.connect() as conn:
            drawing = conn.execute(
                "SELECT d.run_id FROM drawings d"
                f" WHERE d.id = %s AND {drawing_seen_sql('%s')}",
                (wanted, viewer_id),
            ).fetchone()
            if drawing is None:
                return None
            if drawing["run_id"] is None:
                return []
            rows = conn.execute(
                _SELECT + " WHERE g.id IN (SELECT ag.gear_id FROM activity_gear ag"
                " WHERE ag.run_id = %s) AND NOT g.off_profile"
                " AND (g.hidden_at IS NULL OR g.user_id = %s)" + _ORDER,
                (drawing["run_id"], viewer_id),
            ).fetchall()
        return [_body(row, viewer_id) for row in rows]

    def one(self, viewer_id: int, gear_id: UUID) -> GearBody | None:
        with self.database.connect() as conn:
            row = conn.execute(
                _SELECT + f" WHERE g.id = %s AND {_seen_sql('%s')}",
                (gear_id, viewer_id, viewer_id),
            ).fetchone()
        return None if row is None else _body(row, viewer_id)

    def _read(self, conn: Connection[DictRow], user_id: int, gear_id: UUID) -> GearBody:
        row = conn.execute(_SELECT + " WHERE g.id = %s", (gear_id,)).fetchone()
        assert row is not None
        return _body(row, user_id)

    def _write_defaults(
        self, conn: Connection[DictRow], gear_id: UUID, item: _Item
    ) -> None:
        conn.execute("DELETE FROM gear_defaults WHERE gear_id = %s", (gear_id,))
        # A retired item is chosen for no sport.
        if item.retired:
            return
        for activity in item.defaults:
            conn.execute(
                "INSERT INTO gear_defaults (gear_id, activity) VALUES (%s, %s)",
                (gear_id, activity),
            )

    def add(self, user_id: int, body: GearRequestBody) -> GearBody:
        now = self.now()
        item = _item(body, now.date())
        try:
            with self.database.connect() as conn:
                # One add at a time for an account: the count holds.
                conn.execute("SELECT 1 FROM users WHERE id = %s FOR UPDATE", (user_id,))
                count = conn.execute(
                    "SELECT count(*) AS n FROM gear WHERE user_id = %s", (user_id,)
                ).fetchone()
                assert count is not None
                if count["n"] >= MAX_GEAR:
                    raise AccountError(409, "invalid_request", GEAR_FULL)
                row = conn.execute(
                    "INSERT INTO gear (user_id, kind, brand, model, name,"
                    " bought_on, note, limit_m, off_profile, retired_at,"
                    " created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s,"
                    " %s, %s) RETURNING id",
                    (
                        user_id,
                        item.kind,
                        item.brand,
                        item.model,
                        item.name,
                        item.bought_on,
                        item.note,
                        item.limit_m,
                        item.off_profile,
                        now if item.retired else None,
                        now,
                    ),
                ).fetchone()
                assert row is not None
                self._write_defaults(conn, row["id"], item)
                return self._read(conn, user_id, row["id"])
        except pg_errors.ForeignKeyViolation:
            # The account was deleted meanwhile.
            raise AccountError(401, "not_signed_in", NOT_SIGNED_IN) from None

    def change(self, user_id: int, gear_id: UUID, body: GearRequestBody) -> GearBody:
        now = self.now()
        item = _item(body, now.date())
        with self.database.connect() as conn:
            row = conn.execute(
                "UPDATE gear SET kind = %s, brand = %s, model = %s, name = %s,"
                " bought_on = %s, note = %s, limit_m = %s, off_profile = %s,"
                # Retired again keeps its first day; back in use clears it.
                " retired_at = CASE WHEN %s THEN coalesce(retired_at, %s)"
                " ELSE NULL END"
                " WHERE id = %s AND user_id = %s RETURNING id",
                (
                    item.kind,
                    item.brand,
                    item.model,
                    item.name,
                    item.bought_on,
                    item.note,
                    item.limit_m,
                    item.off_profile,
                    item.retired,
                    now,
                    gear_id,
                    user_id,
                ),
            ).fetchone()
            if row is None:
                raise HTTPException(404, NO_GEAR)
            self._write_defaults(conn, gear_id, item)
            return self._read(conn, user_id, gear_id)

    def delete(self, user_id: int, gear_id: UUID) -> bool:
        with self.database.connect() as conn:
            row = conn.execute(
                "DELETE FROM gear WHERE id = %s AND user_id = %s RETURNING 1",
                (gear_id, user_id),
            ).fetchone()
        return row is not None

    def put_photo(self, user_id: int, gear_id: UUID, image: bytes) -> GearBody:
        jpeg = gear_jpeg(image)
        now = self.now()
        with self.database.connect() as conn:
            row = conn.execute(
                "INSERT INTO gear_photos (gear_id, jpeg, updated_at)"
                " SELECT g.id, %s, %s FROM gear g WHERE g.id = %s AND g.user_id = %s"
                " ON CONFLICT (gear_id) DO UPDATE"
                " SET jpeg = EXCLUDED.jpeg, updated_at = EXCLUDED.updated_at"
                " RETURNING gear_id",
                (jpeg, now, gear_id, user_id),
            ).fetchone()
            if row is None:
                raise HTTPException(404, NO_GEAR)
            return self._read(conn, user_id, gear_id)

    def remove_photo(self, user_id: int, gear_id: UUID) -> bool:
        """False for no such item of who asks; gone, or never there: True."""
        with self.database.connect() as conn:
            owned = conn.execute(
                "SELECT 1 FROM gear WHERE id = %s AND user_id = %s",
                (gear_id, user_id),
            ).fetchone()
            if owned is None:
                return False
            conn.execute("DELETE FROM gear_photos WHERE gear_id = %s", (gear_id,))
        return True

    def photo(self, viewer_id: int, gear_id: UUID) -> bytes | None:
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT p.jpeg FROM gear g JOIN gear_photos p ON p.gear_id = g.id"
                f" WHERE g.id = %s AND {_seen_sql('%s')}",
                (gear_id, viewer_id, viewer_id),
            ).fetchone()
        return None if row is None else bytes(row["jpeg"])

    def _run_id(self, conn: Connection[DictRow], user_id: int, key: str) -> int:
        row = conn.execute(
            "SELECT id FROM runs WHERE user_id = %s AND key = %s", (user_id, key)
        ).fetchone()
        if row is None:
            raise HTTPException(404, UNKNOWN_ACTIVITY)
        return int(row["id"])

    def _of_run(
        self, conn: Connection[DictRow], user_id: int, run_id: int
    ) -> list[GearBody]:
        rows = conn.execute(
            _SELECT + " WHERE g.id IN (SELECT ag.gear_id FROM activity_gear ag"
            " WHERE ag.run_id = %s)" + _ORDER,
            (run_id,),
        ).fetchall()
        return [_body(row, user_id) for row in rows]

    def of_activity(self, user_id: int, key: str) -> list[GearBody]:
        with self.database.connect() as conn:
            return self._of_run(conn, user_id, self._run_id(conn, user_id, key))

    def put_on_activity(
        self, user_id: int, key: str, gear_ids: Sequence[UUID]
    ) -> tuple[list[GearBody], list[GearBody]]:
        """The whole list of the activity; retired items too (an activity of
        before). 422 when an id is not of an item of who asks. With it, the
        items this list took past their limit (TASK-486 part G): under it
        before, at it or over it now."""
        wanted = list(dict.fromkeys(gear_ids))
        with self.database.connect() as conn:
            run_id = self._run_id(conn, user_id, key)
            owned = conn.execute(
                "SELECT id, limit_m, t.distance_m FROM gear g"
                " CROSS JOIN LATERAL (SELECT coalesce(sum(r.distance_m), 0)"
                " AS distance_m FROM activity_gear ag JOIN runs r"
                " ON r.id = ag.run_id WHERE ag.gear_id = g.id) t"
                " WHERE g.user_id = %s AND g.id = ANY(%s)",
                (user_id, wanted),
            ).fetchall()
            if len(owned) != len(wanted):
                raise AccountError(422, "invalid_request", NO_GEAR)
            before = {row["id"]: int(row["distance_m"]) for row in owned}
            conn.execute("DELETE FROM activity_gear WHERE run_id = %s", (run_id,))
            for gear_id in wanted:
                conn.execute(
                    "INSERT INTO activity_gear (run_id, gear_id) VALUES (%s, %s)",
                    (run_id, gear_id),
                )
            now = self._of_run(conn, user_id, run_id)
        past = [item for item in now if _crossed(item, before.get(item.id))]
        return now, past


def _crossed(item: GearBody, before_m: int | None) -> bool:
    """Taken past its limit just now: under it before, at it or over it
    after. Only a kind that goes far has one (the app sends it only then)."""
    return (
        item.limit_m is not None
        and before_m is not None
        and before_m < item.limit_m <= item.totals.distance_m
    )


def gear_name(item: GearBody) -> str:
    """The name the app shows (gearKinds.gearTitle): its own, or brand and
    model."""
    return item.name or " ".join(part for part in (item.brand, item.model) if part)


def limit_event(user_id: int, item: GearBody) -> PushEvent:
    """An item past its limit, told to its owner in the bell only
    (push.BELL_ONLY, TASK-486 part G). Its id and its limit tell it apart:
    one line for each limit, and a new limit can be told again."""
    return PushEvent(
        "gear_limit",
        user_id,
        user_id,
        text=gear_name(item),
        key=f"{item.id}|{item.limit_m}",
        gear_id=item.id,
    )


def gear_of(accounts: Annotated[Accounts, Depends(accounts_of)]) -> Gear:
    """In the database of the accounts, on their clock."""
    return Gear(accounts.database, accounts.now)


Items = Annotated[Gear, Depends(gear_of)]
Me = Annotated[UserBody, Depends(current_user)]
NOT_FOUND: dict[int | str, dict[str, Any]] = {404: {"model": ErrorBody}}


def gear_routes() -> APIRouter:
    router = APIRouter(tags=["gear"], responses=ACCOUNT_ERRORS)
    # Per account, not per address: PUT is not among the POSTs access.py counts.
    uploads = RateLimiter(MAX_UPLOADS_PER_MINUTE)

    @router.get("/me/gear", response_model_exclude_none=True)
    def my_gear(gear: Items, user: Me) -> GearListBody:
        return GearListBody(gear=gear.mine(user.id))

    @router.post("/me/gear", status_code=201, response_model_exclude_none=True)
    def add_gear(body: GearRequestBody, gear: Items, user: Me) -> GearBody:
        return gear.add(user.id, body)

    @router.put(
        "/me/gear/{gear_id}", responses=NOT_FOUND, response_model_exclude_none=True
    )
    def change_gear(
        gear_id: UUID, body: GearRequestBody, gear: Items, user: Me
    ) -> GearBody:
        return gear.change(user.id, gear_id, body)

    @router.delete("/me/gear/{gear_id}", status_code=204, responses=NOT_FOUND)
    def delete_gear(gear_id: UUID, gear: Items, user: Me) -> Response:
        if not gear.delete(user.id, gear_id):
            raise HTTPException(404, NO_GEAR)
        return Response(status_code=204)

    # A plain def: reducing a photo takes a moment, in a thread of its own.
    @router.put(
        "/me/gear/{gear_id}/photo",
        responses=NOT_FOUND,
        response_model_exclude_none=True,
    )
    def put_gear_photo(
        gear_id: UUID, body: GearPhotoRequestBody, gear: Items, user: Me
    ) -> GearBody:
        wait = uploads.wait_s(str(user.id))
        if wait > 0:
            raise AccountError(
                429, "too_many_requests", TOO_MANY_PHOTOS, math.ceil(wait)
            )
        return gear.put_photo(user.id, gear_id, decode_image(body.image))

    @router.delete("/me/gear/{gear_id}/photo", status_code=204, responses=NOT_FOUND)
    def remove_gear_photo(gear_id: UUID, gear: Items, user: Me) -> Response:
        if not gear.remove_photo(user.id, gear_id):
            raise HTTPException(404, NO_GEAR)
        return Response(status_code=204)

    @router.get(
        "/me/activities/{key}/gear",
        responses=NOT_FOUND,
        response_model_exclude_none=True,
    )
    def activity_gear(key: Key, gear: Items, user: Me) -> GearListBody:
        return GearListBody(gear=gear.of_activity(user.id, key))

    @router.put(
        "/me/activities/{key}/gear",
        responses=NOT_FOUND,
        response_model_exclude_none=True,
    )
    def put_activity_gear(
        key: Key,
        body: ActivityGearRequestBody,
        gear: Items,
        user: Me,
        request: Request,
    ) -> GearListBody:
        items, past = gear.put_on_activity(user.id, key, body.gear_ids)
        for item in past:
            notify(request, limit_event(user.id, item))
        return GearListBody(gear=items)

    @router.get(
        "/users/{public_id}/gear",
        responses=NOT_FOUND,
        response_model_exclude_none=True,
    )
    def profile_gear(public_id: str, gear: Items, user: Me) -> GearListBody:
        found = gear.of_profile(user.id, public_id)
        if found is None:
            raise HTTPException(404, NO_PROFILE)
        return GearListBody(gear=found)

    @router.get(
        "/drawings/{drawing_id}/gear",
        responses=NOT_FOUND,
        response_model_exclude_none=True,
    )
    def post_gear(drawing_id: str, gear: Items, user: Me) -> GearListBody:
        found = gear.of_drawing(user.id, drawing_id)
        if found is None:
            raise HTTPException(404, NO_DRAWING)
        return GearListBody(gear=found)

    @router.get(
        "/gear/{gear_id}", responses=NOT_FOUND, response_model_exclude_none=True
    )
    def one_gear(gear_id: UUID, gear: Items, user: Me) -> GearBody:
        found = gear.one(user.id, gear_id)
        if found is None:
            raise HTTPException(404, NO_GEAR)
        return found

    @router.get(
        "/gear/{gear_id}/photo",
        response_class=Response,
        responses={200: {"content": {"image/jpeg": {}}}, 404: {"model": ErrorBody}},
    )
    def gear_photo(gear_id: UUID, gear: Items, user: Me) -> Response:
        jpeg = gear.photo(user.id, gear_id)
        if jpeg is None:
            raise HTTPException(404, NO_PHOTO)
        return Response(
            jpeg, media_type="image/jpeg", headers={"Cache-Control": PHOTO_CACHE}
        )

    return router


def install_gear(app: FastAPI) -> None:
    """The members' gear; after install_accounts, which sets the database
    and the errors, and install_comments, which answers CommentRejected."""
    app.include_router(gear_routes())
