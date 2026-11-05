"""The items a member tags on the photos of its own posts (TASK-394,
ADR-0333, docs/API.md, «Outfit tags»).

On a photo of a drawing others see (its photos are on the server only then,
ADR-0170) its owner marks what it wears: a dot at x, y (0–1 from the top
left), the item from a fixed list, the brand, and if it likes the model and
a shop's link (outfit_links.py). At most MAX_ON_PHOTO on a photo and
MAX_IN_POST in a post.

- PUT /me/activities/{key}/drawing/photos/{n}/tags: the whole list of the
  photo. An item sent with its id stays, changed, with its counts; one not
  sent goes, with its counts. 404 without a photo in that place, 409 while
  only its owner sees the drawing, 422 outfit_tag_rejected with a reason.
- POST /outfit-tags/{id}/open: an item opened, 204.
- POST /outfit-tags/{id}/shop: «Shop» touched: the link, checked again, or
  null when it no longer opens («This link isn't available.»).

The items come with each photo, in `outfit_tags`, to whoever sees it
(drawings._details): one hidden from a report only to its owner, and the
link as kept, `hidden` and the totals only to the owner (the user's choice
5); the others ask /shop for the link. An item follows its photo: a new
order of the photos leaves it; a photo replaced or removed takes its items
along (the trigger and the foreign key of migration 0050), and so does a
drawing back to «Only me».

A count is one more for the item on that day, and nothing else: no
account, no address, no phone. The owner's own touches are not counted, nor
those past MAX_COUNTS_PER_HOUR from one address, as for Style.
"""

from __future__ import annotations

import logging
import unicodedata
from collections import defaultdict
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Path, Request, Response
from fastapi.responses import JSONResponse
from psycopg import Connection
from psycopg.rows import DictRow
from pydantic import BaseModel, ConfigDict, Field

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
from shaperoute_api.comment_filter import check_comment
from shaperoute_api.db import Database
from shaperoute_api.outfit_links import (
    CleanLink,
    OutfitLinkError,
    allowed,
    cleaned,
    has_address,
    suffixes,
)
from shaperoute_api.schemas import ErrorBody, ErrorDetail, OutfitTagReason
from shaperoute_api.style_links import MAX_URL_LENGTH
from shaperoute_api.style_posts import HOUR_S, MAX_COUNTS_PER_HOUR
from shaperoute_api.web_risk import WebRisk

log = logging.getLogger(__name__)

# The list the app shows, in this order (its words: Shoes, Top, Jacket…).
OutfitItem = Literal[
    "shoes",
    "top",
    "jacket",
    "shorts",
    "tights",
    "socks",
    "cap",
    "glasses",
    "watch",
    "backpack",
    "other",
]
MAX_ON_PHOTO = 5
MAX_IN_POST = 10
MAX_BRAND_LENGTH = 40
MAX_MODEL_LENGTH = 80
# drawings.MAX_PHOTOS, which this module cannot import at its top:
# drawings.py imports this one (a test holds them equal).
MAX_PLACE = 10

# The app's own words (TASK-394, «I testi», A.5), in English.
REJECTED: dict[OutfitTagReason, str] = {
    "not_https": "Use a link that starts with https://",
    "shortened": "Short links can't be used: paste the shop's full link.",
    "blocked": "MuW can't open this link.",
    "link_in_text": "Put the link in the link box.",
    "too_many_on_photo": f"Up to {MAX_ON_PHOTO} items on a photo.",
    "too_many_in_post": f"Up to {MAX_IN_POST} items in a post.",
    "words": "These words can't be used. Try other words.",
}
NO_BRAND = "Say the brand."
NOT_TEXT = "A brand or a model is one line of words: no control characters."
ITEM_TWICE = "Each item is sent once."
NOT_ON_PHOTO = "No item with this id on this photo."
NO_PHOTO = "No photo in this place: send the photo first."
NO_TAG = "No item with this id."


class OutfitTagRejected(Exception):
    """An item refused: 422 outfit_tag_rejected, with `reason`."""

    def __init__(self, reason: OutfitTagReason) -> None:
        super().__init__(reason)
        self.reason: OutfitTagReason = reason


def rejected_answer(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, OutfitTagRejected)
    detail = ErrorDetail(
        code="outfit_tag_rejected", message=REJECTED[exc.reason], reason=exc.reason
    )
    return JSONResponse(status_code=422, content=ErrorBody(error=detail).model_dump())


# --- The bodies ---


class OutfitTagRequestBody(BaseModel):
    """One item of PUT …/photos/{n}/tags."""

    model_config = ConfigDict(extra="forbid")

    id: UUID | None = Field(
        default=None,
        description="One already on this photo: it stays, with its counts.",
    )
    x: float = Field(ge=0, le=1, description="From the left of the photo, 0–1.")
    y: float = Field(ge=0, le=1, description="From the top of the photo, 0–1.")
    item: OutfitItem
    brand: str = Field(max_length=MAX_BRAND_LENGTH)
    product_name: str | None = Field(default=None, max_length=MAX_MODEL_LENGTH)
    url: str | None = Field(
        default=None,
        max_length=MAX_URL_LENGTH,
        description="A shop's https page; cleaned before it is kept.",
    )


class OutfitTagsRequestBody(BaseModel):
    """PUT /me/activities/{key}/drawing/photos/{n}/tags: every item of the
    photo, in order. packages/shared-types/fixtures/outfit-tags-request.json.
    """

    model_config = ConfigDict(extra="forbid")

    # The limit of the photo is said with its reason, past this guard.
    tags: list[OutfitTagRequestBody] = Field(max_length=4 * MAX_IN_POST)


class OutfitTagBody(BaseModel):
    """An item on a photo, in its `outfit_tags`."""

    id: UUID
    x: float
    y: float
    item: OutfitItem
    brand: str
    product_name: str | None
    store: str | None = Field(
        description="What «Shop on {store}» names; null: no link, no «Shop»."
    )
    url: str | None = Field(
        description="The link as kept, to the owner only; the others ask /shop."
    )
    hidden: bool = Field(description="Hidden from a report: only its owner sees it.")
    opens: int | None = Field(description="Times opened, in all: to the owner only.")
    shops: int | None = Field(
        description="Times «Shop» was touched, in all: to the owner only."
    )


class OutfitTagsBody(BaseModel):
    """The items of the photo after a PUT, as its owner sees them."""

    tags: list[OutfitTagBody]


class OutfitShopBody(BaseModel):
    """POST /outfit-tags/{id}/shop: what the app opens in the browser."""

    url: str | None = Field(description="null: «This link isn't available.»")


# --- In the database ---


def tags_on_photos(
    conn: Connection[DictRow], ids: Sequence[UUID], viewer_id: int | None
) -> dict[tuple[UUID, int], list[OutfitTagBody]]:
    """The items on the photos of these drawings, by drawing and place, in
    their order, as `viewer_id` sees them: their owner with the hidden ones,
    the links and the totals; anyone else, or None, without. In one read."""
    found: dict[tuple[UUID, int], list[OutfitTagBody]] = defaultdict(list)
    if not ids:
        return found
    for row in conn.execute(
        "SELECT t.id, t.drawing_id, t.n, t.x, t.y, t.item, t.brand,"
        " t.product_name, t.store, t.url, t.hidden_at,"
        " coalesce(r.user_id = %(viewer)s, false) AS own, c.opens, c.shops"
        " FROM drawing_outfit_tags t JOIN drawings d ON d.id = t.drawing_id"
        " JOIN runs r ON r.id = d.run_id"
        " LEFT JOIN LATERAL (SELECT sum(k.opens) AS opens, sum(k.shops) AS shops"
        " FROM outfit_tag_clicks k WHERE k.tag_id = t.id"
        " AND r.user_id = %(viewer)s) c ON true"
        " WHERE t.drawing_id = ANY(%(ids)s)"
        " AND (t.hidden_at IS NULL OR r.user_id = %(viewer)s)"
        " ORDER BY t.drawing_id, t.n, t.position",
        {"ids": list(ids), "viewer": viewer_id},
    ):
        own: bool = row["own"]
        found[(row["drawing_id"], row["n"])].append(
            OutfitTagBody(
                id=row["id"],
                x=row["x"],
                y=row["y"],
                item=row["item"],
                brand=row["brand"],
                product_name=row["product_name"],
                store=row["store"],
                url=row["url"] if own else None,
                hidden=row["hidden_at"] is not None,
                opens=int(row["opens"] or 0) if own else None,
                shops=int(row["shops"] or 0) if own else None,
            )
        )
    return found


def _blocked(conn: Connection[DictRow], links: Sequence[CleanLink]) -> set[str]:
    """The domains of outfit_blocked_domains over these links' hosts."""
    domains = sorted({domain for link in links for domain in suffixes(link.host)})
    rows = conn.execute(
        "SELECT domain FROM outfit_blocked_domains WHERE domain = ANY(%s)",
        (domains,),
    ).fetchall()
    return {row["domain"] for row in rows}


def _text(value: str | None) -> str | None:
    """A brand or a model as kept, trimmed; None when empty. 422 for a
    control character, an address, or words of the filter."""
    if value is None or not value.strip():
        return None
    value = value.strip()
    if any(unicodedata.category(char).startswith("C") for char in value):
        raise AccountError(422, "invalid_request", NOT_TEXT)
    if has_address(value):
        raise OutfitTagRejected("link_in_text")
    if check_comment(value) is not None:
        raise OutfitTagRejected("words")
    return value


@dataclass(frozen=True)
class _Item:
    """An item of a PUT, checked."""

    id: UUID | None
    x: float
    y: float
    item: str
    brand: str
    product_name: str | None
    link: CleanLink | None


def _item(body: OutfitTagRequestBody) -> _Item:
    brand = _text(body.brand)
    if brand is None:
        raise AccountError(422, "invalid_request", NO_BRAND)
    link = None
    if body.url is not None and body.url.strip():
        try:
            link = cleaned(body.url)
        except OutfitLinkError as exc:
            raise OutfitTagRejected(exc.reason) from None
    return _Item(
        body.id, body.x, body.y, body.item, brand, _text(body.product_name), link
    )


@dataclass
class OutfitTags:
    """The items on the photos, in the database of the accounts."""

    database: Database
    now: Callable[[], datetime]
    web_risk: WebRisk

    def put(
        self, user_id: int, key: str, n: int, body: OutfitTagsRequestBody
    ) -> OutfitTagsBody | None:
        """The items of photo `n` of the run's drawing as `body` lists them;
        None: no such run."""
        # drawings.py imports this module.
        from shaperoute_api.drawings import shared_drawing

        if len(body.tags) > MAX_ON_PHOTO:
            raise OutfitTagRejected("too_many_on_photo")
        items = [_item(tag) for tag in body.tags]
        kept = [item.id for item in items if item.id is not None]
        if len(set(kept)) < len(kept):
            raise AccountError(422, "invalid_request", ITEM_TWICE)
        links = [item.link for item in items if item.link is not None]
        if links:
            # Before the run is locked: Web Risk may ask Google.
            with self.database.connect() as conn:
                blocked = _blocked(conn, links)
            if not all(allowed(link, blocked, self.web_risk) for link in links):
                raise OutfitTagRejected("blocked")
        now = self.now()
        with self.database.connect() as conn:
            # The run locked: its drawing cannot become its owner's only,
            # nor its photo change, meanwhile.
            drawing_id = shared_drawing(conn, user_id, key)
            if drawing_id is None:
                return None
            photo = conn.execute(
                "SELECT 1 FROM drawing_photos WHERE drawing_id = %s AND n = %s",
                (drawing_id, n),
            ).fetchone()
            if photo is None:
                raise AccountError(404, "http_error", NO_PHOTO)
            rows = conn.execute(
                "SELECT id, n FROM drawing_outfit_tags WHERE drawing_id = %s",
                (drawing_id,),
            ).fetchall()
            here = {row["id"] for row in rows if row["n"] == n}
            if any(item_id not in here for item_id in kept):
                raise AccountError(422, "invalid_request", NOT_ON_PHOTO)
            if len(rows) - len(here) + len(items) > MAX_IN_POST:
                raise OutfitTagRejected("too_many_in_post")
            gone = list(here - set(kept))
            if gone:
                conn.execute(
                    "DELETE FROM drawing_outfit_tags WHERE id = ANY(%s)", (gone,)
                )
            for position, item in enumerate(items):
                self._write(conn, drawing_id, n, position, item, now)
            tags = tags_on_photos(conn, [drawing_id], user_id).get((drawing_id, n))
        return OutfitTagsBody(tags=tags or [])

    @staticmethod
    def _write(
        conn: Connection[DictRow],
        drawing_id: UUID,
        n: int,
        position: int,
        item: _Item,
        now: datetime,
    ) -> None:
        """A new item, or one kept changed: its hidden_at and its counts
        stay."""
        values: dict[str, Any] = {
            "id": item.id,
            "drawing": drawing_id,
            "n": n,
            "position": position,
            "x": item.x,
            "y": item.y,
            "item": item.item,
            "brand": item.brand,
            "model": item.product_name,
            "url": None if item.link is None else item.link.url,
            "store": None if item.link is None else item.link.store,
            "now": now,
        }
        if item.id is None:
            conn.execute(
                "INSERT INTO drawing_outfit_tags (drawing_id, n, position, x, y,"
                " item, brand, product_name, url, store, created_at) VALUES"
                " (%(drawing)s, %(n)s, %(position)s, %(x)s, %(y)s, %(item)s,"
                " %(brand)s, %(model)s, %(url)s, %(store)s, %(now)s)",
                values,
            )
        else:
            conn.execute(
                "UPDATE drawing_outfit_tags SET position = %(position)s,"
                " x = %(x)s, y = %(y)s, item = %(item)s, brand = %(brand)s,"
                " product_name = %(model)s, url = %(url)s, store = %(store)s"
                " WHERE id = %(id)s",
                values,
            )

    def _seen(self, conn: Connection[DictRow], viewer_id: int, tag_id: UUID) -> DictRow:
        """The item, when `viewer_id` sees its photo; else 404, as for an id
        that is not there."""
        # drawings.py imports this module.
        from shaperoute_api.drawings import drawing_seen_sql

        row = conn.execute(
            "SELECT t.url, r.user_id = %s AS own FROM drawing_outfit_tags t"
            " JOIN drawings d ON d.id = t.drawing_id JOIN runs r ON r.id = d.run_id"
            " WHERE t.id = %s AND (t.hidden_at IS NULL OR r.user_id = %s)"
            f" AND {drawing_seen_sql('%s')}",
            (viewer_id, tag_id, viewer_id, viewer_id),
        ).fetchone()
        if row is None:
            raise HTTPException(404, NO_TAG)
        return row

    def _count(self, tag_id: UUID, column: Literal["opens", "shops"]) -> None:
        with self.database.connect() as conn:
            conn.execute(
                f"INSERT INTO outfit_tag_clicks (tag_id, day, {column})"
                " VALUES (%s, %s, 1) ON CONFLICT (tag_id, day)"
                f" DO UPDATE SET {column} = outfit_tag_clicks.{column} + 1",
                (tag_id, self.now().date()),
            )

    def open(self, viewer_id: int, tag_id: UUID, counted: bool) -> None:
        """One more open today, unless the owner opened it or `counted` is
        False; 404 for an item `viewer_id` does not see."""
        with self.database.connect() as conn:
            row = self._seen(conn, viewer_id, tag_id)
        if counted and not row["own"]:
            self._count(tag_id, "opens")

    def shop(self, viewer_id: int, tag_id: UUID, counted: bool) -> OutfitShopBody:
        """The link to open, checked again, and one more «Shop» today as
        open() counts; null without a link, or one that no longer opens:
        nothing counted then."""
        with self.database.connect() as conn:
            row = self._seen(conn, viewer_id, tag_id)
            if row["url"] is None:
                return OutfitShopBody(url=None)
            try:
                link = cleaned(row["url"])
            except OutfitLinkError:
                # outfit_links.py keeps only clean links: a row changed by hand.
                log.warning("outfit tags: the link of %s is not clean", tag_id)
                return OutfitShopBody(url=None)
            blocked = _blocked(conn, [link])
        if not allowed(link, blocked, self.web_risk):
            return OutfitShopBody(url=None)
        if counted and not row["own"]:
            self._count(tag_id, "shops")
        return OutfitShopBody(url=link.url)


def outfit_tags_of(
    request: Request, accounts: Annotated[Accounts, Depends(accounts_of)]
) -> OutfitTags:
    """In the database of the accounts, on the same clock, with the Web Risk
    of app.state."""
    return OutfitTags(accounts.database, accounts.now, request.app.state.web_risk)


Tags = Annotated[OutfitTags, Depends(outfit_tags_of)]
Me = Annotated[UserBody, Depends(current_user)]
Place = Annotated[int, Path(ge=1, le=MAX_PLACE, description="Its place, 1-10.")]
NOT_FOUND: dict[int | str, dict[str, Any]] = {404: {"model": ErrorBody}}


# --- The endpoints ---


def outfit_tag_routes() -> APIRouter:
    router = APIRouter(tags=["outfit tags"], responses=ACCOUNT_ERRORS)
    by_address = RateLimiter(MAX_COUNTS_PER_HOUR, HOUR_S)

    def counted(request: Request) -> bool:
        address = request.client.host if request.client else "unknown"
        return by_address.wait_s(address) == 0

    @router.put(
        "/me/activities/{key}/drawing/photos/{n}/tags",
        responses={404: {"model": ErrorBody}, 409: {"model": ErrorBody}},
    )
    def put_tags(
        key: Key, n: Place, body: OutfitTagsRequestBody, tags: Tags, user: Me
    ) -> OutfitTagsBody:
        answer = tags.put(user.id, key, n, body)
        if answer is None:
            raise HTTPException(404, UNKNOWN_ACTIVITY)
        return answer

    @router.post("/outfit-tags/{tag_id}/open", status_code=204, responses=NOT_FOUND)
    def open_tag(tag_id: UUID, tags: Tags, user: Me, request: Request) -> Response:
        tags.open(user.id, tag_id, counted(request))
        return Response(status_code=204)

    @router.post("/outfit-tags/{tag_id}/shop", responses=NOT_FOUND)
    def shop_tag(
        tag_id: UUID, tags: Tags, user: Me, request: Request
    ) -> OutfitShopBody:
        return tags.shop(user.id, tag_id, counted(request))

    return router


def install_outfit_tags(app: FastAPI, web_risk: WebRisk | None = None) -> None:
    """The items on the photos; after install_accounts, which sets the
    database and the errors. Web Risk from the environment unless given,
    its lists kept up to date in a thread when it has a key."""
    risk = web_risk if web_risk is not None else WebRisk.from_env()
    risk.start()
    app.state.web_risk = risk
    app.add_exception_handler(OutfitTagRejected, rejected_answer)
    app.include_router(outfit_tag_routes())
