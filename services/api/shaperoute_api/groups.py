"""Groups: communities that last, to go out together on foot, by bike, in
the mountains (TASK-495, ADR-0402, docs/GRUPPI.md, docs/API.md «Groups»).

A group has a name, a photo, a description, 1 to MAX_SPORTS sports, a city
with its point rounded to about a kilometre (never an address) and a way
in: `public`, one taps «Join» and is in; `request`, the admin or a co-admin
accepts; `invite`, only who is invited sees it and joins. A group with
alpinism is never public (GRUPPI.md §9).

One admin, always (an index of the migration keeps a second one out; this
module keeps one in), up to MAX_COADMINS co-admins, the members. Admin and
co-admins accept, invite and take members out; only the admin changes the
group, names the co-admins and passes the role. The admin leaves only once
the role is passed, or as the last member: then the group is gone. Its
account deleted, the role goes to the oldest co-admin, then to the oldest
member; a group left without members is deleted.

Who sees a group (seen_sql): nobody kept apart from its admin
(follows.apart_sql, a block either way, a hidden admin included), who
answers 404 as for an id that is not there; the others when they are in
it, or when it is not hidden (from a report's email, TASK-291) and not
`invite`, or they were invited. Who is in it (the list, the roles) only
the members see: who is outside sees how many they are (GRUPPI.md §5,
§11). Two members kept apart do not see each other in the list.

Three pushes (push.py): a request to join, to the admin and the
co-admins; the request accepted, to who asked; an invite, to who is
invited. The outings of a group, and their push, come with part C.

Deleting an account deletes its memberships, requests and invites (ON
DELETE CASCADE), after the admin's role is passed (before_account_delete).
"""

from __future__ import annotations

import base64
import logging
import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Annotated, Any, Literal, get_args
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, Query, Request, Response
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
from shaperoute_api.activities import EPOCH, MICROSECOND, RunActivity
from shaperoute_api.avatars import avatar_url
from shaperoute_api.comment_filter import check_comment
from shaperoute_api.comments import CommentRejected
from shaperoute_api.db import Database
from shaperoute_api.drawings import (
    LISTED_COLUMNS,
    WITH_RUN_SQL,
    _details,
    _line,
    _seen,
    shown_sql,
)
from shaperoute_api.feed import (
    HALF_A_POINT,
    NEAR_M,
    NO_REACTIONS,
    FeedAuthorBody,
    FeedCardBody,
    FeedPageBody,
    _counts,
)
from shaperoute_api.follows import (
    MAX_PAGE_SIZE,
    NO_PROFILE,
    PAGE_SIZE,
    PERSON_COLUMNS,
    SMALL_PHOTOS,
    PeoplePageBody,
    PersonBody,
    _account,
    _apart,
    _person,
    apart_sql,
    checked_query,
    like_itself,
)
from shaperoute_api.group_runs import _text
from shaperoute_api.images import decode_image
from shaperoute_api.profile_photos import (
    MAX_UPLOADS_PER_MINUTE,
    ProfilePhotoRequestBody,
    square_jpeg,
)
from shaperoute_api.push import Kind, Pusher, PushEvent
from shaperoute_api.reads import EVERYTHING, Reads, Shown
from shaperoute_api.recommended import preview
from shaperoute_api.schemas import ErrorBody

log = logging.getLogger(__name__)

MAX_NAME = 40
MAX_DESCRIPTION = 500
MAX_CITY = 80
MAX_SPORTS = 3
# The groups an account is the admin of, the members of a group, the
# co-admins of a group (GRUPPI.md §2, §4).
MAX_ADMIN_OF = 5
MAX_MEMBERS = 300
MAX_COADMINS = 3
# The point of the city, rounded to this many decimals of a degree: about a
# kilometre, never an address (GRUPPI.md §2).
AREA_DECIMALS = 2
# Explore: this many groups at most.
FOUND_SIZE = 20
# The sport whose groups are never public (GRUPPI.md §9).
ALPINISM = "alpinism"
SPORTS: tuple[str, ...] = get_args(RunActivity)
# Where a page of members ended: the role's rank (0 admin, 1 co-admin, 2
# member), since when it is in the group in microseconds, its public id.
MEMBERS_CURSOR = r"^[012]-\d{1,17}-[0-9a-f]{32}$"
# Where a page of requests ended: when it was asked, and who asked.
REQUESTS_CURSOR = r"^\d{1,17}-[0-9a-f]{32}$"
# «Recent activity» (GRUPPI.md §5): the posts of these last days.
RECENT = timedelta(days=14)
# Where a page of it ended: when the post was published, and its id.
ACTIVITY_CURSOR = r"^\d{1,17}-[0-9a-f]{32}$"

Access = Literal["public", "request", "invite"]
Role = Literal["admin", "coadmin", "member"]
Me = Literal["admin", "coadmin", "member", "requested", "invited", "none"]
LatLon = tuple[float, float]

NO_GROUP = "No group with this id."
NAME_WRONG = f"A group's name is 1 to {MAX_NAME} characters, on one line."
DESCRIPTION_WRONG = f"A group's description is {MAX_DESCRIPTION} characters at most."
CITY_WRONG = f"A city is 1 to {MAX_CITY} characters, on one line."
SPORTS_WRONG = f"A group has 1 to {MAX_SPORTS} different sports."
ALPINISM_NOT_PUBLIC = "A group with alpinism asks to join, or is by invite only."
TOO_MANY_GROUPS = f"You can be the admin of {MAX_ADMIN_OF} groups at most."
THEY_HAVE_TOO_MANY = f"They are the admin of {MAX_ADMIN_OF} groups already."
FULL = f"A group has {MAX_MEMBERS} members at most."
TOO_MANY_COADMINS = f"A group has {MAX_COADMINS} co-admins at most."
ONLY_ADMIN = "Only the group's admin can do this."
ONLY_ADMINS = "Only the group's admin and co-admins can do this."
ONLY_MEMBERS = "Only the group's members can do this."
PASS_FIRST = "Pass the admin role to another member before you leave."
NOT_A_MEMBER = "This account is not a member of the group."
NO_REQUEST = "No request to join from this account."
NOT_YOURSELF = "You cannot do this to yourself."
NOT_THE_ADMIN = "The admin's role is passed, never taken."
NO_PLACE = "Give a place, or part of a name."
TOO_MANY_PHOTOS = "Too many photos in a minute: wait a moment and try again."

ROLE_RANK = "CASE gm.role WHEN 'admin' THEN 0 WHEN 'coadmin' THEN 1 ELSE 2 END"


# --- In the SQL ---


def admin_sql(group: str = "g.id") -> str:
    """The users.id of the admin of the group `group` (a column)."""
    return (
        "(SELECT gm_admin.user_id FROM group_members gm_admin"
        f" WHERE gm_admin.group_id = {group} AND gm_admin.role = 'admin')"
    )


def member_sql(viewer: str, group: str = "g.id") -> str:
    """An SQL condition: `viewer` is in the group `group`."""
    return (
        "EXISTS (SELECT 1 FROM group_members gm_in"
        f" WHERE gm_in.group_id = {group} AND gm_in.user_id = {viewer})"
    )


def invited_sql(viewer: str, group: str = "g.id") -> str:
    return (
        "EXISTS (SELECT 1 FROM group_invites gi_in"
        f" WHERE gi_in.group_id = {group} AND gi_in.user_id = {viewer})"
    )


def seen_sql(viewer: str) -> str:
    """An SQL condition: the account `viewer` sees the group `g`. `viewer`
    is a column or a placeholder holding a users.id."""
    return (
        f"(NOT {apart_sql(viewer, admin_sql())} AND ({member_sql(viewer)}"
        f" OR (g.hidden_at IS NULL AND (g.access <> 'invite'"
        f" OR {invited_sql(viewer)}))))"
    )


def counted_sql(viewer: str) -> str:
    """An SQL condition: the member `gm` counts for `viewer`."""
    return f"NOT {apart_sql(viewer, 'gm.user_id')}"


COLUMNS = (
    "g.id, g.name, g.description, g.sports, g.city, g.access, g.created_at,"
    " ST_Y(g.area::geometry) AS lat, ST_X(g.area::geometry) AS lon,"
    " ph.jpeg AS photo,"
    " (SELECT count(*) FROM group_members gm WHERE gm.group_id = g.id"
    f" AND {counted_sql('%(viewer)s')}) AS members,"
    " (SELECT gm.role FROM group_members gm WHERE gm.group_id = g.id"
    " AND gm.user_id = %(viewer)s) AS role,"
    " (SELECT gm.muted FROM group_members gm WHERE gm.group_id = g.id"
    " AND gm.user_id = %(viewer)s) AS muted,"
    " EXISTS (SELECT 1 FROM group_requests gr WHERE gr.group_id = g.id"
    " AND gr.user_id = %(viewer)s) AS requested,"
    f" {invited_sql('%(viewer)s')} AS invited"
)
FROM = "FROM groups g LEFT JOIN group_photos ph ON ph.group_id = g.id"


# --- The bodies ---


class GroupRequestBody(BaseModel):
    """POST /groups, PUT /groups/{id}: the group as its admin writes it:
    packages/shared-types/fixtures/group-request.json."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(description=f"1 to {MAX_NAME} characters, on one line.")
    description: str | None = Field(
        default=None, description=f"{MAX_DESCRIPTION} characters at most."
    )
    sports: list[RunActivity] = Field(
        min_length=1,
        max_length=MAX_SPORTS,
        description=f"1 to {MAX_SPORTS} different sports, as runs.activity.",
    )
    city: str = Field(description=f"The city's name, 1 to {MAX_CITY} characters.")
    area: LatLon = Field(
        description="A point of the city; kept rounded to about a kilometre."
    )
    access: Access


class GroupBody(BaseModel):
    """A group on a card: Explore, one's groups, an invite:
    packages/shared-types/fixtures/groups.json."""

    id: UUID
    name: str
    sports: list[str]
    city: str
    access: Access
    members: int
    """How many are in it, as who asks sees them (a block takes one out)."""
    photo: str | None = Field(
        description="A square JPEG, small, in base64; null without a photo."
    )
    me: Me
    """Where who asks stands: its role, or `requested`, `invited`, `none`."""


class GroupDetailBody(GroupBody):
    """GET /groups/{id}: the group's page: fixtures/group.json."""

    description: str | None
    area: LatLon
    """The city's point, rounded."""
    big_photo: str | None = Field(
        description="The photo, square, 256 px a side, in base64; null without."
    )
    muted: bool
    """Whether who asks, a member, put «Mute» on the group."""
    created_at: datetime


class GroupsBody(BaseModel):
    """GET /groups: Explore's groups, the nearest or the names first."""

    groups: list[GroupBody]


class MyGroupsBody(BaseModel):
    """GET /me/groups: the groups one is in, by name, and those one is
    invited to, the latest first: fixtures/my-groups.json."""

    groups: list[GroupBody]
    invites: list[GroupBody]


class MemberBody(PersonBody):
    role: Role


class MembersPageBody(BaseModel):
    """GET /groups/{id}/members, members only: the admin, the co-admins,
    the others, each by when it came in: fixtures/group-members.json."""

    members: list[MemberBody]
    next: str | None
    total: int


class RoleRequestBody(BaseModel):
    """PUT /groups/{id}/members/{public_id}/role, the admin only: `admin`
    passes the role, and the admin becomes a member."""

    model_config = ConfigDict(extra="forbid")

    role: Role


class JoinBody(BaseModel):
    """PUT /groups/{id}/membership: where who asked stands now."""

    me: Me


# --- Without the database ---


@dataclass(frozen=True)
class Written:
    """A group as kept."""

    name: str
    description: str | None
    sports: list[str]
    city: str
    area: LatLon
    access: Access


def rounded(point: LatLon) -> LatLon:
    lat, lon = point
    return (round(lat, AREA_DECIMALS), round(lon, AREA_DECIMALS))


def checked(body: GroupRequestBody) -> Written:
    """The group within its limits (GRUPPI.md §2), its texts passed by the
    filter of the negative comments, never public with alpinism."""
    name = _text(body.name, MAX_NAME, NAME_WRONG, needed=True) or ""
    city = _text(body.city, MAX_CITY, CITY_WRONG, needed=True) or ""
    description = _text(
        body.description, MAX_DESCRIPTION, DESCRIPTION_WRONG, needed=False, lines=True
    )
    sports = list(dict.fromkeys(body.sports))
    if len(sports) != len(body.sports):
        raise AccountError(422, "invalid_request", SPORTS_WRONG)
    if ALPINISM in sports and body.access == "public":
        raise AccountError(422, "invalid_request", ALPINISM_NOT_PUBLIC)
    lat, lon = body.area
    if not (-90 <= lat <= 90 and -180 <= lon <= 180) or math.isnan(lat + lon):
        raise AccountError(422, "invalid_request", "area: a point on the Earth.")
    for text in (name, description, city):
        reason = None if text is None else check_comment(text)
        if reason is not None:
            raise CommentRejected(reason)
    return Written(name, description, sports, city, rounded(body.area), body.access)


def me_of(row: DictRow) -> Me:
    role: Role | None = row["role"]
    if role is not None:
        return role
    if row["requested"]:
        return "requested"
    if row["invited"]:
        return "invited"
    return "none"


def _photo(jpeg: Any, small: bool) -> str | None:
    if jpeg is None:
        return None
    data = bytes(jpeg)
    if small:
        return SMALL_PHOTOS.of(data)
    return base64.b64encode(data).decode("ascii")


def card_of(row: DictRow) -> GroupBody:
    return GroupBody(
        id=row["id"],
        name=row["name"],
        sports=list(row["sports"]),
        city=row["city"],
        access=row["access"],
        members=row["members"],
        photo=_photo(row["photo"], small=True),
        me=me_of(row),
    )


def detail_of(row: DictRow) -> GroupDetailBody:
    return GroupDetailBody(
        **card_of(row).model_dump(),
        description=row["description"],
        area=(round(row["lat"], AREA_DECIMALS), round(row["lon"], AREA_DECIMALS)),
        big_photo=_photo(row["photo"], small=False),
        muted=bool(row["muted"]),
        created_at=row["created_at"],
    )


def _cursor(rank: int, at: datetime, public_id: UUID) -> str:
    return f"{rank}-{(at - EPOCH) // MICROSECOND}-{public_id.hex}"


# --- The pushes ---


@dataclass(frozen=True)
class _Told:
    """A push to be sent once the transaction is over."""

    kind: Kind
    actor_id: int
    recipients: tuple[int, ...]
    group_id: UUID
    name: str


PusherOf = Callable[[], Pusher | None]


def _tell(pusher_of: PusherOf, told: Sequence[_Told]) -> None:
    """The pushes, after the write; never raises."""
    pusher = pusher_of()
    if pusher is None:
        return
    for one in told:
        for recipient in one.recipients:
            pusher.notify(
                PushEvent(
                    one.kind,
                    one.actor_id,
                    recipient,
                    text=one.name,
                    key=str(one.group_id),
                    group_id=one.group_id,
                )
            )


def _admins(conn: Connection[DictRow], group_id: UUID) -> tuple[int, ...]:
    rows = conn.execute(
        "SELECT user_id FROM group_members WHERE group_id = %s"
        " AND role IN ('admin', 'coadmin') ORDER BY role, role_since, user_id",
        (group_id,),
    ).fetchall()
    return tuple(int(row["user_id"]) for row in rows)


# --- In the database ---


@dataclass
class Groups:
    """The groups, their members, requests and invites, in the database of
    the accounts."""

    database: Database
    now: Callable[[], datetime]
    pusher_of: PusherOf = field(default=lambda: None)

    # --- Reading ---

    def _seen(
        self,
        conn: Connection[DictRow],
        viewer_id: int,
        group_id: UUID,
        lock: bool = False,
    ) -> DictRow:
        row = conn.execute(
            f"SELECT {COLUMNS} {FROM} WHERE g.id = %(id)s AND {seen_sql('%(viewer)s')}",
            {"id": group_id, "viewer": viewer_id},
        ).fetchone()
        if row is None:
            raise AccountError(404, "http_error", NO_GROUP)
        if lock:
            conn.execute("SELECT 1 FROM groups WHERE id = %s FOR UPDATE", (group_id,))
        return row

    def get(self, viewer_id: int, group_id: UUID) -> GroupDetailBody:
        with self.database.connect() as conn:
            return detail_of(self._seen(conn, viewer_id, group_id))

    def found(
        self,
        viewer_id: int,
        point: LatLon | None,
        sport: str | None,
        q: str | None,
    ) -> GroupsBody:
        """Explore (GRUPPI.md §7): the groups seen, not hidden, not by
        invite only, of `sport` if given; with `q`, those whose name holds
        it anywhere, by name; else those within NEAR_M of `point`, the
        nearest first. 422 with neither."""
        values: dict[str, Any] = {"viewer": viewer_id, "limit": FOUND_SIZE}
        where = [seen_sql("%(viewer)s"), "g.hidden_at IS NULL", "g.access <> 'invite'"]
        if sport is not None:
            values["sport"] = sport
            where.append("%(sport)s = ANY(g.sports)")
        if q is not None:
            query = checked_query(q)
            if query is None:
                return GroupsBody(groups=[])
            values["holds"] = f"%{like_itself(query)}%"
            where.append("lower(g.name) LIKE %(holds)s")
            order = "lower(g.name), g.id"
        elif point is not None:
            values.update(lat=point[0], lon=point[1], near_m=NEAR_M)
            here = "ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326)::geography"
            where.append(f"ST_DWithin(g.area, {here}, %(near_m)s)")
            order = f"ST_Distance(g.area, {here}), g.id"
        else:
            raise AccountError(422, "invalid_request", NO_PLACE)
        with self.database.connect() as conn:
            rows = conn.execute(
                f"SELECT {COLUMNS} {FROM} WHERE {' AND '.join(where)}"
                f" ORDER BY {order} LIMIT %(limit)s",
                values,
            ).fetchall()
        return GroupsBody(groups=[card_of(row) for row in rows])

    def mine(self, viewer_id: int) -> MyGroupsBody:
        """The groups one is in, by name, and the invites one has, the
        latest first; only one's own (GRUPPI.md §7: the profile's row is
        seen by its account alone)."""
        values = {"viewer": viewer_id}
        with self.database.connect() as conn:
            groups = conn.execute(
                f"SELECT {COLUMNS} {FROM} WHERE {member_sql('%(viewer)s')}"
                f" AND {seen_sql('%(viewer)s')} ORDER BY lower(g.name), g.id",
                values,
            ).fetchall()
            invites = conn.execute(
                f"SELECT {COLUMNS} {FROM} JOIN group_invites mine"
                " ON mine.group_id = g.id AND mine.user_id = %(viewer)s"
                f" WHERE NOT {member_sql('%(viewer)s')} AND {seen_sql('%(viewer)s')}"
                " ORDER BY mine.created_at DESC, g.id",
                values,
            ).fetchall()
        return MyGroupsBody(
            groups=[card_of(row) for row in groups],
            invites=[card_of(row) for row in invites],
        )

    def members(
        self,
        viewer_id: int,
        group_id: UUID,
        limit: int = PAGE_SIZE,
        cursor: str | None = None,
    ) -> MembersPageBody:
        """Members only (403 for the others): the admin, the co-admins,
        the members, each by when it came in; nobody kept apart from who
        asks."""
        values: dict[str, Any] = {
            "group": group_id,
            "viewer": viewer_id,
            "limit": limit + 1,
        }
        after = "TRUE"
        if cursor is not None:
            rank, micros, last = cursor.split("-")
            values.update(
                rank=int(rank), at=EPOCH + int(micros) * MICROSECOND, last=UUID(last)
            )
            after = "(rank, at, public_id) > (%(rank)s, %(at)s, %(last)s)"
        listed = (
            f"SELECT {ROLE_RANK} AS rank, gm.role, gm.joined_at AS at,"
            f" {PERSON_COLUMNS} FROM group_members gm"
            " JOIN users u ON u.id = gm.user_id"
            " LEFT JOIN profile_photos p ON p.user_id = u.id"
            f" WHERE gm.group_id = %(group)s AND {counted_sql('%(viewer)s')}"
        )
        with self.database.connect() as conn:
            row = self._seen(conn, viewer_id, group_id)
            if row["role"] is None:
                raise AccountError(403, "http_error", ONLY_MEMBERS)
            rows = conn.execute(
                f"SELECT * FROM ({listed}) listed WHERE {after}"
                " ORDER BY rank, at, public_id LIMIT %(limit)s",
                values,
            ).fetchall()
        page, more = rows[:limit], len(rows) > limit
        last_row = page[-1] if page else None
        return MembersPageBody(
            members=[
                MemberBody(**_person(one).model_dump(), role=one["role"])
                for one in page
            ],
            next=(
                _cursor(last_row["rank"], last_row["at"], last_row["public_id"])
                if more and last_row is not None
                else None
            ),
            total=row["members"],
        )

    def requests(
        self,
        viewer_id: int,
        group_id: UUID,
        limit: int = PAGE_SIZE,
        cursor: str | None = None,
    ) -> PeoplePageBody:
        """Who asked to join, the first first: admin and co-admins only."""
        values: dict[str, Any] = {
            "group": group_id,
            "viewer": viewer_id,
            "limit": limit + 1,
        }
        after = "TRUE"
        if cursor is not None:
            micros, last = cursor.split("-")
            values.update(at=EPOCH + int(micros) * MICROSECOND, last=UUID(last))
            after = "(at, public_id) > (%(at)s, %(last)s)"
        asked = (
            f"SELECT gr.created_at AS at, {PERSON_COLUMNS} FROM group_requests gr"
            " JOIN users u ON u.id = gr.user_id"
            " LEFT JOIN profile_photos p ON p.user_id = u.id"
            " WHERE gr.group_id = %(group)s"
            f" AND NOT {apart_sql('%(viewer)s', 'gr.user_id')}"
            f" AND NOT {apart_sql(admin_sql('gr.group_id'), 'gr.user_id')}"
        )
        with self.database.connect() as conn:
            self._admin_or_co(conn, viewer_id, group_id)
            rows = conn.execute(
                f"SELECT * FROM ({asked}) asked WHERE {after}"
                " ORDER BY at, public_id LIMIT %(limit)s",
                values,
            ).fetchall()
            total = conn.execute(
                f"SELECT count(*) AS n FROM ({asked}) asked", values
            ).fetchone()
        assert total is not None
        page, more = rows[:limit], len(rows) > limit
        return PeoplePageBody(
            people=[_person(one) for one in page],
            next=(
                f"{(page[-1]['at'] - EPOCH) // MICROSECOND}-{page[-1]['public_id'].hex}"
                if more
                else None
            ),
            total=total["n"],
        )

    def activity(
        self,
        viewer_id: int,
        group_id: UUID,
        limit: int = PAGE_SIZE,
        cursor: str | None = None,
        reads: Reads = EVERYTHING,
    ) -> FeedPageBody:
        """«Recent activity» (GRUPPI.md §5), members only (403 for the
        others): the posts of the members published in the last RECENT, of
        a run of one of the group's sports, the latest first; only those
        `viewer_id` sees in the Feed (drawings.shown_sql: never across a
        block, never hidden, «Followers» only to a follower) and `reads`
        shows. The cards of the Feed."""
        values: dict[str, Any] = {
            "group": group_id,
            "viewer": viewer_id,
            "since": self.now() - RECENT,
            "limit": limit + 1,
        }
        after = "TRUE"
        if cursor is not None:
            micros, last = cursor.split("-")
            values.update(at=EPOCH + int(micros) * MICROSECOND, last=UUID(last))
            after = "(d.published_at, d.id) < (%(at)s, %(last)s)"
        with self.database.connect() as conn:
            row = self._seen(conn, viewer_id, group_id)
            if row["role"] is None:
                raise AccountError(403, "http_error", ONLY_MEMBERS)
            rows = conn.execute(
                f"SELECT {LISTED_COLUMNS}, u.public_id, u.username,"
                " pp.updated_at AS photo_at"
                f" FROM {WITH_RUN_SQL} JOIN users u ON u.id = d.user_id"
                " LEFT JOIN profile_photos pp ON pp.user_id = u.id"
                " JOIN groups g ON g.id = %(group)s"
                " JOIN group_members gm ON gm.group_id = g.id"
                " AND gm.user_id = d.user_id"
                " WHERE d.visibility <> 'only_me' AND d.run_id IS NOT NULL"
                " AND r.activity = ANY(g.sports)"
                " AND d.published_at >= %(since)s"
                f" AND {shown_sql('%(viewer)s')} AND {reads.drawings_sql()}"
                f" AND {after}"
                " ORDER BY d.published_at DESC, d.id DESC LIMIT %(limit)s",
                values,
            ).fetchall()
            page, more = rows[:limit], len(rows) > limit
            ids = [one["id"] for one in page]
            details = _details(conn, ids, viewer_id)
            counts = _counts(conn, ids, viewer_id)
        posts = [
            FeedCardBody(
                **_seen(one, details),
                track_preview=preview(_line(one["track"])),
                author=FeedAuthorBody(
                    public_id=one["public_id"],
                    username=one["username"],
                    photo=(
                        None
                        if one["photo_at"] is None
                        else avatar_url(one["public_id"], one["photo_at"])
                    ),
                ),
                reactions=counts.reactions.get(one["id"], NO_REACTIONS),
                comments=counts.comments.get(one["id"], 0),
            )
            for one in page
        ]
        last_one = page[-1] if more else None
        return FeedPageBody(
            posts=posts,
            next=(
                None
                if last_one is None
                else f"{(last_one['published_at'] - EPOCH) // MICROSECOND}"
                f"-{last_one['id'].hex}"
            ),
        )

    # --- Who may ---

    def _admin(
        self, conn: Connection[DictRow], user_id: int, group_id: UUID
    ) -> DictRow:
        row = self._seen(conn, user_id, group_id, lock=True)
        if row["role"] != "admin":
            raise AccountError(403, "http_error", ONLY_ADMIN)
        return row

    def _admin_or_co(
        self,
        conn: Connection[DictRow],
        user_id: int,
        group_id: UUID,
        lock: bool = False,
    ) -> DictRow:
        row = self._seen(conn, user_id, group_id, lock=lock)
        if row["role"] not in ("admin", "coadmin"):
            raise AccountError(403, "http_error", ONLY_ADMINS)
        return row

    @staticmethod
    def _member_count(conn: Connection[DictRow], group_id: UUID) -> int:
        row = conn.execute(
            "SELECT count(*) AS n FROM group_members WHERE group_id = %s", (group_id,)
        ).fetchone()
        assert row is not None
        return int(row["n"])

    @staticmethod
    def _admin_of(conn: Connection[DictRow], user_id: int) -> int:
        row = conn.execute(
            "SELECT count(*) AS n FROM group_members WHERE user_id = %s"
            " AND role = 'admin'",
            (user_id,),
        ).fetchone()
        assert row is not None
        return int(row["n"])

    def _add(self, conn: Connection[DictRow], group_id: UUID, user_id: int) -> None:
        """`user_id` in the group as a member; its request and invite gone.
        422 when the group is full."""
        if self._member_count(conn, group_id) >= MAX_MEMBERS:
            raise AccountError(422, "invalid_request", FULL)
        now = self.now()
        conn.execute(
            "INSERT INTO group_members (group_id, user_id, role, joined_at,"
            " role_since) VALUES (%s, %s, 'member', %s, %s)"
            " ON CONFLICT (group_id, user_id) DO NOTHING",
            (group_id, user_id, now, now),
        )
        self._forget(conn, group_id, user_id)

    @staticmethod
    def _forget(conn: Connection[DictRow], group_id: UUID, user_id: int) -> None:
        conn.execute(
            "DELETE FROM group_requests WHERE group_id = %s AND user_id = %s",
            (group_id, user_id),
        )
        conn.execute(
            "DELETE FROM group_invites WHERE group_id = %s AND user_id = %s",
            (group_id, user_id),
        )

    def _other(self, conn: Connection[DictRow], user_id: int, public_id: str) -> int:
        """The users.id of another account: 404 as for a profile, across a
        block or for none; 422 for oneself."""
        other = _account(conn, public_id)
        if other == user_id:
            raise AccountError(422, "invalid_request", NOT_YOURSELF)
        if _apart(conn, user_id, other):
            raise AccountError(404, "http_error", NO_PROFILE)
        return other

    # --- Writing ---

    def create(self, user_id: int, body: GroupRequestBody) -> GroupDetailBody:
        written = checked(body)
        now = self.now()
        try:
            with self.database.connect() as conn:
                # One account's groups are made one at a time: the count
                # below is the count when the row goes in.
                conn.execute("SELECT 1 FROM users WHERE id = %s FOR UPDATE", (user_id,))
                if self._admin_of(conn, user_id) >= MAX_ADMIN_OF:
                    raise AccountError(422, "invalid_request", TOO_MANY_GROUPS)
                made = conn.execute(
                    "INSERT INTO groups (name, description, sports, city, area,"
                    " access, created_at, updated_at) VALUES (%s, %s, %s, %s,"
                    " ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s, %s)"
                    " RETURNING id",
                    (
                        written.name,
                        written.description,
                        written.sports,
                        written.city,
                        written.area[1],
                        written.area[0],
                        written.access,
                        now,
                        now,
                    ),
                ).fetchone()
                assert made is not None
                conn.execute(
                    "INSERT INTO group_members (group_id, user_id, role, joined_at,"
                    " role_since) VALUES (%s, %s, 'admin', %s, %s)",
                    (made["id"], user_id, now, now),
                )
                return detail_of(self._seen(conn, user_id, made["id"]))
        except pg_errors.ForeignKeyViolation:
            # The account was deleted while it was creating.
            raise AccountError(401, "not_signed_in", NOT_SIGNED_IN) from None

    def change(
        self, user_id: int, group_id: UUID, body: GroupRequestBody
    ) -> GroupDetailBody:
        """All of it, by the admin. Who asked to join a group now public is
        let in; nobody is told."""
        written = checked(body)
        with self.database.connect() as conn:
            self._admin(conn, user_id, group_id)
            conn.execute(
                "UPDATE groups SET name = %s, description = %s, sports = %s,"
                " city = %s, area = ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,"
                " access = %s, updated_at = %s WHERE id = %s",
                (
                    written.name,
                    written.description,
                    written.sports,
                    written.city,
                    written.area[1],
                    written.area[0],
                    written.access,
                    self.now(),
                    group_id,
                ),
            )
            if written.access == "public":
                waiting = conn.execute(
                    "SELECT user_id FROM group_requests WHERE group_id = %s"
                    " ORDER BY created_at, user_id",
                    (group_id,),
                ).fetchall()
                for one in waiting:
                    if self._member_count(conn, group_id) >= MAX_MEMBERS:
                        break
                    self._add(conn, group_id, int(one["user_id"]))
            return detail_of(self._seen(conn, user_id, group_id))

    def put_photo(self, user_id: int, group_id: UUID, image: bytes) -> GroupDetailBody:
        jpeg = square_jpeg(image)
        with self.database.connect() as conn:
            self._admin(conn, user_id, group_id)
            conn.execute(
                "INSERT INTO group_photos (group_id, jpeg, updated_at)"
                " VALUES (%s, %s, %s) ON CONFLICT (group_id) DO UPDATE"
                " SET jpeg = EXCLUDED.jpeg, updated_at = EXCLUDED.updated_at",
                (group_id, jpeg, self.now()),
            )
            return detail_of(self._seen(conn, user_id, group_id))

    def remove_photo(self, user_id: int, group_id: UUID) -> None:
        with self.database.connect() as conn:
            self._admin(conn, user_id, group_id)
            conn.execute("DELETE FROM group_photos WHERE group_id = %s", (group_id,))

    def join(self, user_id: int, group_id: UUID) -> JoinBody:
        """«Join»: in at once when public or invited; else a request, told
        to the admin and the co-admins once. Twice is once."""
        told: list[_Told] = []
        try:
            with self.database.connect() as conn:
                row = self._seen(conn, user_id, group_id, lock=True)
                me = me_of(row)
                if me in ("admin", "coadmin", "member"):
                    return JoinBody(me=me)
                if row["access"] == "public" or me == "invited":
                    self._add(conn, group_id, user_id)
                    return JoinBody(me="member")
                if me == "none":
                    conn.execute(
                        "INSERT INTO group_requests (group_id, user_id, created_at)"
                        " VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                        (group_id, user_id, self.now()),
                    )
                    told.append(
                        _Told(
                            "group_join_request",
                            user_id,
                            _admins(conn, group_id),
                            group_id,
                            row["name"],
                        )
                    )
        except pg_errors.ForeignKeyViolation:
            raise AccountError(404, "http_error", NO_GROUP) from None
        _tell(self.pusher_of, told)
        return JoinBody(me="requested")

    def leave(self, user_id: int, group_id: UUID) -> None:
        """Out of the group; a request withdrawn, an invite refused. The
        admin, only as the last member: then the group is gone."""
        with self.database.connect() as conn:
            row = self._seen(conn, user_id, group_id, lock=True)
            if row["role"] == "admin":
                if self._member_count(conn, group_id) > 1:
                    raise AccountError(422, "invalid_request", PASS_FIRST)
                conn.execute("DELETE FROM groups WHERE id = %s", (group_id,))
                return
            conn.execute(
                "DELETE FROM group_members WHERE group_id = %s AND user_id = %s",
                (group_id, user_id),
            )
            self._forget(conn, group_id, user_id)

    def accept(self, user_id: int, group_id: UUID, public_id: str) -> None:
        """A request accepted by the admin or a co-admin, and who asked is
        told."""
        told: list[_Told] = []
        with self.database.connect() as conn:
            row = self._admin_or_co(conn, user_id, group_id, lock=True)
            other = self._other(conn, user_id, public_id)
            asked = conn.execute(
                "SELECT 1 FROM group_requests WHERE group_id = %s AND user_id = %s",
                (group_id, other),
            ).fetchone()
            if asked is None:
                raise AccountError(404, "http_error", NO_REQUEST)
            self._add(conn, group_id, other)
            told.append(
                _Told("group_join_accepted", user_id, (other,), group_id, row["name"])
            )
        _tell(self.pusher_of, told)

    def refuse(self, user_id: int, group_id: UUID, public_id: str) -> None:
        """A request refused; nobody is told. None already is done."""
        with self.database.connect() as conn:
            self._admin_or_co(conn, user_id, group_id)
            other = _account(conn, public_id)
            conn.execute(
                "DELETE FROM group_requests WHERE group_id = %s AND user_id = %s",
                (group_id, other),
            )

    def invite(self, user_id: int, group_id: UUID, public_id: str) -> None:
        """An invite from the admin or a co-admin, told to who is invited.
        A member already: nothing; one who asked already: let in, as
        accepted."""
        told: list[_Told] = []
        with self.database.connect() as conn:
            row = self._admin_or_co(conn, user_id, group_id, lock=True)
            other = self._other(conn, user_id, public_id)
            admin = conn.execute(
                f"SELECT {admin_sql('%(group)s')} AS id", {"group": group_id}
            ).fetchone()
            assert admin is not None
            if admin["id"] != user_id and _apart(conn, int(admin["id"]), other):
                # Who is kept apart from the admin cannot see the group.
                raise AccountError(404, "http_error", NO_PROFILE)
            state = conn.execute(
                "SELECT EXISTS (SELECT 1 FROM group_members WHERE group_id = %(g)s"
                " AND user_id = %(u)s) AS member,"
                " EXISTS (SELECT 1 FROM group_requests WHERE group_id = %(g)s"
                " AND user_id = %(u)s) AS requested",
                {"g": group_id, "u": other},
            ).fetchone()
            assert state is not None
            if state["member"]:
                return
            if state["requested"]:
                self._add(conn, group_id, other)
                kind: Kind = "group_join_accepted"
            else:
                conn.execute(
                    "INSERT INTO group_invites (group_id, user_id, invited_by,"
                    " created_at) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
                    (group_id, other, user_id, self.now()),
                )
                kind = "group_invite"
            told.append(_Told(kind, user_id, (other,), group_id, row["name"]))
        _tell(self.pusher_of, told)

    def uninvite(self, user_id: int, group_id: UUID, public_id: str) -> None:
        with self.database.connect() as conn:
            self._admin_or_co(conn, user_id, group_id)
            other = _account(conn, public_id)
            conn.execute(
                "DELETE FROM group_invites WHERE group_id = %s AND user_id = %s",
                (group_id, other),
            )

    def _role_of(self, conn: Connection[DictRow], group_id: UUID, other: int) -> Role:
        found = conn.execute(
            "SELECT role FROM group_members WHERE group_id = %s AND user_id = %s",
            (group_id, other),
        ).fetchone()
        if found is None:
            raise AccountError(404, "http_error", NOT_A_MEMBER)
        role: Role = found["role"]
        return role

    def remove(self, user_id: int, group_id: UUID, public_id: str) -> None:
        """A member taken out by the admin, or a member (not a co-admin) by
        a co-admin. It may ask again (GRUPPI.md §4)."""
        with self.database.connect() as conn:
            row = self._admin_or_co(conn, user_id, group_id, lock=True)
            other = _account(conn, public_id)
            if other == user_id:
                raise AccountError(422, "invalid_request", NOT_YOURSELF)
            role = self._role_of(conn, group_id, other)
            if role == "admin":
                raise AccountError(403, "http_error", NOT_THE_ADMIN)
            if role == "coadmin" and row["role"] != "admin":
                raise AccountError(403, "http_error", ONLY_ADMIN)
            conn.execute(
                "DELETE FROM group_members WHERE group_id = %s AND user_id = %s",
                (group_id, other),
            )

    def set_role(
        self, user_id: int, group_id: UUID, public_id: str, role: Role
    ) -> None:
        """The admin names a co-admin, takes the role back, or passes its
        own: then it is a member."""
        with self.database.connect() as conn:
            self._admin(conn, user_id, group_id)
            other = _account(conn, public_id)
            if other == user_id:
                raise AccountError(422, "invalid_request", NOT_YOURSELF)
            now = self.now()
            if self._role_of(conn, group_id, other) == role:
                return
            if role == "coadmin":
                count = conn.execute(
                    "SELECT count(*) AS n FROM group_members WHERE group_id = %s"
                    " AND role = 'coadmin'",
                    (group_id,),
                ).fetchone()
                assert count is not None
                if count["n"] >= MAX_COADMINS:
                    raise AccountError(422, "invalid_request", TOO_MANY_COADMINS)
            if role == "admin":
                conn.execute("SELECT 1 FROM users WHERE id = %s FOR UPDATE", (other,))
                if self._admin_of(conn, other) >= MAX_ADMIN_OF:
                    raise AccountError(422, "invalid_request", THEY_HAVE_TOO_MANY)
                conn.execute(
                    "UPDATE group_members SET role = 'member', role_since = %s"
                    " WHERE group_id = %s AND user_id = %s",
                    (now, group_id, user_id),
                )
            conn.execute(
                "UPDATE group_members SET role = %s, role_since = %s"
                " WHERE group_id = %s AND user_id = %s",
                (role, now, group_id, other),
            )

    def mute(self, user_id: int, group_id: UUID, muted: bool) -> None:
        with self.database.connect() as conn:
            row = self._seen(conn, user_id, group_id)
            if row["role"] is None:
                raise AccountError(403, "http_error", ONLY_MEMBERS)
            conn.execute(
                "UPDATE group_members SET muted = %s WHERE group_id = %s"
                " AND user_id = %s",
                (muted, group_id, user_id),
            )

    def before_account_delete(self, user_id: int) -> None:
        """The admin's role passed, in each group the account is the admin
        of, to the oldest co-admin, then to the oldest member; a group with
        nobody else is deleted. Never raises: the account is deleted all
        the same."""
        try:
            with self.database.connect() as conn:
                held = conn.execute(
                    "SELECT group_id FROM group_members WHERE user_id = %s"
                    " AND role = 'admin' ORDER BY group_id FOR UPDATE",
                    (user_id,),
                ).fetchall()
                for one in held:
                    group_id = one["group_id"]
                    heir = conn.execute(
                        "SELECT user_id FROM group_members WHERE group_id = %s"
                        " AND user_id <> %s ORDER BY role = 'coadmin' DESC,"
                        " CASE WHEN role = 'coadmin' THEN role_since"
                        " ELSE joined_at END, user_id LIMIT 1",
                        (group_id, user_id),
                    ).fetchone()
                    if heir is None:
                        conn.execute("DELETE FROM groups WHERE id = %s", (group_id,))
                        continue
                    now = self.now()
                    conn.execute(
                        "UPDATE group_members SET role = 'member', role_since = %s"
                        " WHERE group_id = %s AND user_id = %s",
                        (now, group_id, user_id),
                    )
                    conn.execute(
                        "UPDATE group_members SET role = 'admin', role_since = %s"
                        " WHERE group_id = %s AND user_id = %s",
                        (now, group_id, heir["user_id"]),
                    )
        except Exception:
            log.exception("groups: the admin's role was not passed")


# --- The endpoints ---


def groups_of(
    request: Request, accounts: Annotated[Accounts, Depends(accounts_of)]
) -> Groups:
    """In the database of the accounts, on the same clock, with the app's
    pusher."""
    return Groups(
        accounts.database,
        accounts.now,
        lambda: getattr(request.app.state, "pusher", None),
    )


Them = Annotated[Groups, Depends(groups_of)]
User = Annotated[UserBody, Depends(current_user)]
NOT_FOUND: dict[int | str, dict[str, Any]] = {
    403: {"model": ErrorBody},
    404: {"model": ErrorBody},
}


def group_routes() -> APIRouter:
    router = APIRouter(tags=["groups"], responses=ACCOUNT_ERRORS)
    # Per account, as profile_photos.py: reducing a photo costs a moment.
    uploads = RateLimiter(MAX_UPLOADS_PER_MINUTE)

    @router.post("/groups", status_code=201)
    def create(body: GroupRequestBody, groups: Them, user: User) -> GroupDetailBody:
        return groups.create(user.id, body)

    @router.get("/groups")
    def found(
        groups: Them,
        user: User,
        lat: Annotated[float | None, Query(ge=-90, le=90)] = None,
        lon: Annotated[float | None, Query(ge=-180, le=180)] = None,
        sport: Annotated[RunActivity | None, Query()] = None,
        q: Annotated[str | None, Query(max_length=100)] = None,
    ) -> GroupsBody:
        if (lat is None) != (lon is None):
            raise AccountError(422, "invalid_request", HALF_A_POINT)
        point = None if lat is None or lon is None else (lat, lon)
        return groups.found(user.id, point, sport, q)

    @router.get("/me/groups")
    def mine(groups: Them, user: User) -> MyGroupsBody:
        return groups.mine(user.id)

    @router.get("/groups/{group_id}", responses=NOT_FOUND)
    def get(group_id: UUID, groups: Them, user: User) -> GroupDetailBody:
        return groups.get(user.id, group_id)

    @router.put("/groups/{group_id}", responses=NOT_FOUND)
    def change(
        group_id: UUID, body: GroupRequestBody, groups: Them, user: User
    ) -> GroupDetailBody:
        return groups.change(user.id, group_id, body)

    # A plain def: decoding a photo takes a moment, in a thread of its own.
    @router.put("/groups/{group_id}/photo", responses=NOT_FOUND)
    def put_photo(
        group_id: UUID, body: ProfilePhotoRequestBody, groups: Them, user: User
    ) -> GroupDetailBody:
        wait = uploads.wait_s(str(user.id))
        if wait > 0:
            raise AccountError(
                429, "too_many_requests", TOO_MANY_PHOTOS, math.ceil(wait)
            )
        return groups.put_photo(user.id, group_id, decode_image(body.image))

    @router.delete("/groups/{group_id}/photo", status_code=204, responses=NOT_FOUND)
    def remove_photo(group_id: UUID, groups: Them, user: User) -> Response:
        groups.remove_photo(user.id, group_id)
        return Response(status_code=204)

    @router.put("/groups/{group_id}/membership", responses=NOT_FOUND)
    def join(group_id: UUID, groups: Them, user: User) -> JoinBody:
        return groups.join(user.id, group_id)

    @router.delete(
        "/groups/{group_id}/membership", status_code=204, responses=NOT_FOUND
    )
    def leave(group_id: UUID, groups: Them, user: User) -> Response:
        groups.leave(user.id, group_id)
        return Response(status_code=204)

    @router.put("/groups/{group_id}/mute", status_code=204, responses=NOT_FOUND)
    def mute(group_id: UUID, groups: Them, user: User) -> Response:
        groups.mute(user.id, group_id, True)
        return Response(status_code=204)

    @router.delete("/groups/{group_id}/mute", status_code=204, responses=NOT_FOUND)
    def unmute(group_id: UUID, groups: Them, user: User) -> Response:
        groups.mute(user.id, group_id, False)
        return Response(status_code=204)

    @router.get("/groups/{group_id}/members", responses=NOT_FOUND)
    def members(
        group_id: UUID,
        groups: Them,
        user: User,
        limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = PAGE_SIZE,
        cursor: Annotated[str | None, Query(pattern=MEMBERS_CURSOR)] = None,
    ) -> MembersPageBody:
        return groups.members(user.id, group_id, limit, cursor)

    @router.delete(
        "/groups/{group_id}/members/{public_id}", status_code=204, responses=NOT_FOUND
    )
    def remove(group_id: UUID, public_id: str, groups: Them, user: User) -> Response:
        groups.remove(user.id, group_id, public_id)
        return Response(status_code=204)

    @router.put(
        "/groups/{group_id}/members/{public_id}/role",
        status_code=204,
        responses=NOT_FOUND,
    )
    def set_role(
        group_id: UUID,
        public_id: str,
        body: RoleRequestBody,
        groups: Them,
        user: User,
    ) -> Response:
        groups.set_role(user.id, group_id, public_id, body.role)
        return Response(status_code=204)

    @router.get("/groups/{group_id}/activity", responses=NOT_FOUND)
    def activity(
        group_id: UUID,
        groups: Them,
        user: User,
        reads: Shown,
        limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = PAGE_SIZE,
        cursor: Annotated[str | None, Query(pattern=ACTIVITY_CURSOR)] = None,
    ) -> FeedPageBody:
        return groups.activity(user.id, group_id, limit, cursor, reads)

    @router.get("/groups/{group_id}/requests", responses=NOT_FOUND)
    def requests(
        group_id: UUID,
        groups: Them,
        user: User,
        limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = PAGE_SIZE,
        cursor: Annotated[str | None, Query(pattern=REQUESTS_CURSOR)] = None,
    ) -> PeoplePageBody:
        return groups.requests(user.id, group_id, limit, cursor)

    @router.put(
        "/groups/{group_id}/requests/{public_id}", status_code=204, responses=NOT_FOUND
    )
    def accept(group_id: UUID, public_id: str, groups: Them, user: User) -> Response:
        groups.accept(user.id, group_id, public_id)
        return Response(status_code=204)

    @router.delete(
        "/groups/{group_id}/requests/{public_id}", status_code=204, responses=NOT_FOUND
    )
    def refuse(group_id: UUID, public_id: str, groups: Them, user: User) -> Response:
        groups.refuse(user.id, group_id, public_id)
        return Response(status_code=204)

    @router.put(
        "/groups/{group_id}/invites/{public_id}", status_code=204, responses=NOT_FOUND
    )
    def invite(group_id: UUID, public_id: str, groups: Them, user: User) -> Response:
        groups.invite(user.id, group_id, public_id)
        return Response(status_code=204)

    @router.delete(
        "/groups/{group_id}/invites/{public_id}", status_code=204, responses=NOT_FOUND
    )
    def uninvite(group_id: UUID, public_id: str, groups: Them, user: User) -> Response:
        groups.uninvite(user.id, group_id, public_id)
        return Response(status_code=204)

    return router


def install_groups(app: FastAPI) -> None:
    """The groups, and the admin's role passed when an account is deleted;
    after install_accounts and install_push. Without a database the
    endpoints answer 503."""
    accounts: Accounts | None = app.state.accounts
    if accounts is not None:

        def pusher() -> Pusher | None:
            found: Pusher | None = getattr(app.state, "pusher", None)
            return found

        groups = Groups(accounts.database, accounts.now, pusher)
        app.state.before_account_delete.append(groups.before_account_delete)
    app.include_router(group_routes())
