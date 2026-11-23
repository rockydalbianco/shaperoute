"""Groups in a real PostgreSQL, with Expo faked (TASK-495, ADR-0402,
docs/GRUPPI.md): the limits of the fields, the filter of the texts, never
public with alpinism, the three ways in, who sees what across invites,
blocks and what was hidden, the roles and their limits, one admin always,
the role passed when the admin's account is deleted, Explore, one's own
groups, «Mute», the three pushes, the report. One test for each rule of
GRUPPI.md §2–§10 that part A holds."""

from __future__ import annotations

import base64
import io
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from route_engine.network import FileSource
from test_group_runs import error, phone, public_id, pushes, rows, signed_up
from test_push import FAST_HASHER, FakeExpo

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database, migrations
from shaperoute_api.expo_push import Expo
from shaperoute_api.groups import (
    ALPINISM_NOT_PUBLIC,
    CITY_WRONG,
    DESCRIPTION_WRONG,
    FULL,
    MAX_ADMIN_OF,
    MAX_COADMINS,
    MAX_MEMBERS,
    NAME_WRONG,
    NO_GROUP,
    NO_PLACE,
    ONLY_ADMIN,
    ONLY_ADMINS,
    ONLY_MEMBERS,
    PASS_FIRST,
    SPORTS_WRONG,
    THEY_HAVE_TOO_MANY,
    TOO_MANY_COADMINS,
    TOO_MANY_GROUPS,
    GroupDetailBody,
    GroupRequestBody,
    GroupsBody,
    MembersPageBody,
    MyGroupsBody,
)
from shaperoute_api.moderation import NOT_YOURSELF_REPORT
from shaperoute_api.notice_email import EMAIL_KINDS
from shaperoute_api.push import OWN_KINDS, TEXTS, Pusher, PushEvent, data_of, text_of
from shaperoute_api.report_email import Links, apply, reported

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
GROUPS_TS = REPO / "packages" / "shared-types" / "src" / "groups.ts"
# The migration of the groups, whatever its number when merged.
(GROUPS_SQL,) = [p for p in migrations() if p.name.endswith("_groups.sql")]

NOW = datetime(2026, 11, 23, 12, 0, tzinfo=UTC)
TRENTO = (46.067, 11.1215)
# Rovereto, about 22 km from Trento; Milan about 180 km.
ROVERETO = (45.8906, 11.0401)
MILAN = (45.4642, 9.19)
Headers = dict[str, str]
KINDS = ("group_join_request", "group_join_accepted", "group_invite")


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


@pytest.fixture
def expo() -> FakeExpo:
    return FakeExpo()


class Ticking:
    """The API's clock, a second later at each reading: who comes first in
    a test comes first in a list."""

    def __init__(self) -> None:
        self.ticks = 0

    def __call__(self) -> datetime:
        self.ticks += 1
        return NOW + timedelta(seconds=self.ticks)


@pytest.fixture
def client(database: Database, expo: FakeExpo) -> TestClient:
    accounts = Accounts(database, now=Ticking(), hasher=FAST_HASHER)
    app = create_app(
        FileSource(Path("unused.graphml")),
        accounts=accounts,
        run_places=PlaceNames(None),
    )
    app.state.pusher = Pusher(
        database, Expo(send=expo), run=lambda task: task(), later=lambda *_: None
    )
    return TestClient(app)


def asked(**changes: Any) -> dict[str, Any]:
    return {**_load("group-request.json"), **changes}


def create(client: TestClient, headers: Headers, **changes: Any) -> Any:
    return client.post("/groups", json=asked(**changes), headers=headers)


def made(client: TestClient, headers: Headers, **changes: Any) -> dict[str, Any]:
    answer = create(client, headers, **changes)
    assert answer.status_code == 201, answer.text
    return dict(answer.json())


def get(client: TestClient, headers: Headers, group_id: str) -> Any:
    return client.get(f"/groups/{group_id}", headers=headers)


def page(client: TestClient, headers: Headers, group_id: str) -> dict[str, Any]:
    answer = get(client, headers, group_id)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def join(client: TestClient, headers: Headers, group_id: str) -> Any:
    return client.put(f"/groups/{group_id}/membership", headers=headers)


def joined(client: TestClient, headers: Headers, group_id: str) -> str:
    answer = join(client, headers, group_id)
    assert answer.status_code == 200, answer.text
    return str(answer.json()["me"])


def leave(client: TestClient, headers: Headers, group_id: str) -> Any:
    return client.delete(f"/groups/{group_id}/membership", headers=headers)


def on(
    client: TestClient, method: str, headers: Headers, group_id: str, path: str
) -> Any:
    return client.request(method, f"/groups/{group_id}/{path}", headers=headers)


def ok(answer: Any) -> None:
    assert answer.status_code == 204, answer.text


def members(client: TestClient, headers: Headers, group_id: str) -> list[str]:
    answer = client.get(f"/groups/{group_id}/members", headers=headers)
    assert answer.status_code == 200, answer.text
    return [f"{m['username']}:{m['role']}" for m in answer.json()["members"]]


def role(
    client: TestClient, admin: Headers, group_id: str, who: Headers, new: str
) -> Any:
    return client.put(
        f"/groups/{group_id}/members/{public_id(client, who)}/role",
        json={"role": new},
        headers=admin,
    )


def block(client: TestClient, who: Headers, whom: Headers) -> None:
    ok(client.put(f"/users/{public_id(client, whom)}/block", headers=who))


def found(client: TestClient, headers: Headers, query: str) -> list[str]:
    answer = client.get(f"/groups?{query}", headers=headers)
    assert answer.status_code == 200, answer.text
    return [one["name"] for one in answer.json()["groups"]]


def near(point: tuple[float, float]) -> str:
    return f"lat={point[0]}&lon={point[1]}"


def png() -> str:
    out = io.BytesIO()
    Image.new("RGB", (40, 30), (200, 80, 20)).save(out, "PNG")
    return base64.b64encode(out.getvalue()).decode("ascii")


# --- The contract ---


def test_the_examples_are_the_bodies() -> None:
    GroupRequestBody.model_validate(_load("group-request.json"))
    whole = _load("group.json")
    assert set(whole) == set(GroupDetailBody.model_fields)
    GroupDetailBody.model_validate(whole)
    GroupsBody.model_validate(_load("groups.json"))
    MyGroupsBody.model_validate(_load("my-groups.json"))
    MembersPageBody.model_validate(_load("group-members.json"))


def test_the_app_knows_the_same_limits() -> None:
    source = GROUPS_TS.read_text(encoding="utf-8")
    for name, value in (
        ("GROUP_NAME_MAX", 40),
        ("GROUP_DESCRIPTION_MAX", 500),
        ("GROUP_CITY_MAX", 80),
        ("GROUP_SPORTS_MAX", 3),
        ("GROUPS_ADMIN_MAX", MAX_ADMIN_OF),
        ("GROUP_MEMBERS_MAX", MAX_MEMBERS),
        ("GROUP_COADMINS_MAX", MAX_COADMINS),
    ):
        assert f"export const {name} = {value};" in source, name
    assert 'export const GROUP_NEVER_PUBLIC_SPORT = "alpinism";' in source


def test_the_pushes_name_the_group_and_open_it() -> None:
    group_id = uuid4()
    for kind in KINDS:
        assert set(TEXTS[kind]) == {"en", "de", "it", "es", "fr"}
        event = PushEvent(kind, 1, 2, text="Saturday Hikers", group_id=group_id)
        for language in TEXTS[kind]:
            assert "Saturday Hikers" in text_of(event, "ada", language)
        assert data_of(event, uuid4(), "ada") == {
            "kind": kind,
            "group_id": str(group_id),
        }
        assert kind not in OWN_KINDS
        assert kind not in EMAIL_KINDS
    asked_in = PushEvent(
        "group_join_request", 1, 2, text="Saturday Hikers", group_id=group_id
    )
    assert text_of(asked_in, "bob", "en") == "bob asked to join Saturday Hikers."
    assert [one["kind"] for one in _load("group-push-data.json")] == list(KINDS)


def test_the_endpoints_want_a_session(client: TestClient) -> None:
    some, who = str(uuid4()), str(uuid4())
    for method, path in (
        ("POST", "/groups"),
        ("GET", "/groups"),
        ("GET", "/me/groups"),
        ("GET", f"/groups/{some}"),
        ("PUT", f"/groups/{some}"),
        ("PUT", f"/groups/{some}/photo"),
        ("DELETE", f"/groups/{some}/photo"),
        ("PUT", f"/groups/{some}/membership"),
        ("DELETE", f"/groups/{some}/membership"),
        ("PUT", f"/groups/{some}/mute"),
        ("DELETE", f"/groups/{some}/mute"),
        ("GET", f"/groups/{some}/members"),
        ("DELETE", f"/groups/{some}/members/{who}"),
        ("PUT", f"/groups/{some}/members/{who}/role"),
        ("GET", f"/groups/{some}/requests"),
        ("PUT", f"/groups/{some}/requests/{who}"),
        ("DELETE", f"/groups/{some}/requests/{who}"),
        ("PUT", f"/groups/{some}/invites/{who}"),
        ("DELETE", f"/groups/{some}/invites/{who}"),
    ):
        assert client.request(method, path, json={}).status_code == 401, path


def test_without_a_database_they_answer_503() -> None:
    app = create_app(FileSource(Path("unused.graphml")), run_places=PlaceNames(None))
    answer = TestClient(app).get(
        "/me/groups", headers={"Authorization": "Bearer whatever"}
    )
    assert error(answer, 503, "accounts_unavailable")


# --- The migration ---


def test_the_new_check_keeps_every_kind_and_takes_a_group(
    database_url: str, tmp_path: Path
) -> None:
    before = [p for p in migrations() if p.name < GROUPS_SQL.name]
    for path in before:
        (tmp_path / path.name).write_bytes(path.read_bytes())
    database = Database(database_url)
    database.migrate(tmp_path)
    old = ("drawing", "comment", "user", "group_run", "message", "outfit_tag", "gear")
    with database.connect() as conn:
        user = conn.execute(
            "INSERT INTO users (email, username, password_hash, confirmed_16_at,"
            " created_at) VALUES ('a@example.com', 'ada', 'x', now(), now())"
            " RETURNING id"
        ).fetchone()
        assert user is not None
        for kind in old:
            conn.execute(
                "INSERT INTO reports (reporter_id, kind, target_id, reason,"
                " created_at) VALUES (%s, %s, %s, 'spam', now())",
                (user["id"], kind, uuid4()),
            )
    assert GROUPS_SQL.stem in database.migrate()
    kept = rows(database, "SELECT kind FROM reports ORDER BY kind")
    assert [row["kind"] for row in kept] == sorted(old)
    with database.connect() as conn:
        conn.execute(
            "INSERT INTO reports (reporter_id, kind, target_id, reason, created_at)"
            " VALUES (%s, 'group', %s, 'spam', now())",
            (user["id"], uuid4()),
        )


# --- The group (GRUPPI.md §2) ---


def test_a_group_is_created_with_its_admin_and_a_rounded_point(
    client: TestClient,
) -> None:
    ada = signed_up(client, "ada")
    group = made(client, ada, area=list(TRENTO))
    assert group["name"] == "Dolomites Saturday Hikers"
    assert group["sports"] == ["hiking", "walking"]
    assert group["city"] == "Trento"
    assert group["access"] == "request"
    assert group["me"] == "admin"
    assert group["members"] == 1
    assert group["area"] == [46.07, 11.12]
    assert group["description"].endswith("\nAll paces welcome.")
    assert group["photo"] is None and group["big_photo"] is None
    assert members(client, ada, group["id"]) == ["ada:admin"]


@pytest.mark.parametrize(
    ("changes", "message"),
    [
        ({"name": ""}, NAME_WRONG),
        ({"name": "x" * 41}, NAME_WRONG),
        ({"name": "Two\nlines"}, NAME_WRONG),
        ({"description": "x" * 501}, DESCRIPTION_WRONG),
        ({"city": " "}, CITY_WRONG),
        ({"city": "x" * 81}, CITY_WRONG),
        ({"sports": ["hiking", "hiking"]}, SPORTS_WRONG),
        ({"sports": ["alpinism"], "access": "public"}, ALPINISM_NOT_PUBLIC),
        ({"sports": ["hiking", "alpinism"], "access": "public"}, ALPINISM_NOT_PUBLIC),
    ],
)
def test_the_limits_of_the_fields(
    client: TestClient, changes: dict[str, Any], message: str
) -> None:
    ada = signed_up(client, "ada")
    assert error(create(client, ada, **changes), 422) == message


def test_sports_are_one_to_three_of_the_app_s(client: TestClient) -> None:
    ada = signed_up(client, "ada")
    for sports in ([], ["hiking", "cycling", "gravel_biking", "walking"], ["golf"]):
        assert create(client, ada, sports=sports).status_code == 422, sports
    group = made(client, ada, sports=["alpinism"], access="invite")
    assert group["sports"] == ["alpinism"]


def test_the_texts_at_their_limits_are_kept_without_spaces(
    client: TestClient,
) -> None:
    ada = signed_up(client, "ada")
    group = made(
        client,
        ada,
        name=f"  {'n' * 40}  ",
        description=f" {'d' * 500} ",
        city=" Trento ",
    )
    assert group["name"] == "n" * 40
    assert group["description"] == "d" * 500
    assert group["city"] == "Trento"
    assert made(client, ada, description="  ")["description"] is None


def test_the_texts_pass_the_filter_of_the_comments(client: TestClient) -> None:
    ada = signed_up(client, "ada")
    for field in ("name", "description", "city"):
        answer = create(client, ada, **{field: "che merda"})
        assert error(answer, 422, "comment_rejected"), field


def test_an_admin_of_five_groups_at_most(client: TestClient) -> None:
    ada = signed_up(client, "ada")
    for n in range(MAX_ADMIN_OF):
        made(client, ada, name=f"Group {n}")
    assert error(create(client, ada, name="One more"), 422) == TOO_MANY_GROUPS


def test_only_the_admin_changes_the_group(client: TestClient) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    group = made(client, ada, access="public")
    assert joined(client, bob, group["id"]) == "member"
    body = asked(name="Trento Hikers", access="public", sports=["hiking"])
    url = f"/groups/{group['id']}"
    assert error(client.put(url, json=body, headers=bob), 403, "http_error") == (
        ONLY_ADMIN
    )
    changed = client.put(url, json=body, headers=ada)
    assert changed.status_code == 200, changed.text
    assert changed.json()["name"] == "Trento Hikers"
    assert changed.json()["sports"] == ["hiking"]
    alpine = asked(sports=["alpinism"], access="public")
    assert error(client.put(url, json=alpine, headers=ada), 422) == (
        ALPINISM_NOT_PUBLIC
    )


def test_the_photo_is_the_admin_s_to_put_and_take_away(client: TestClient) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    group = made(client, ada, access="public")
    joined(client, bob, group["id"])
    url = f"/groups/{group['id']}/photo"
    assert client.put(url, json={"image": png()}, headers=bob).status_code == 403
    answer = client.put(url, json={"image": png()}, headers=ada)
    assert answer.status_code == 200, answer.text
    assert answer.json()["big_photo"] and answer.json()["photo"]
    big = Image.open(io.BytesIO(base64.b64decode(answer.json()["big_photo"])))
    assert big.size == (256, 256)
    ok(client.delete(url, headers=ada))
    assert page(client, bob, group["id"])["big_photo"] is None


# --- The ways in (GRUPPI.md §3) ---


def test_public_one_taps_and_is_in(client: TestClient, expo: FakeExpo) -> None:
    ada = signed_up(client, "ada", push=True)
    bob = signed_up(client, "bob")
    group = made(client, ada, access="public")
    assert joined(client, bob, group["id"]) == "member"
    assert joined(client, bob, group["id"]) == "member"
    assert page(client, bob, group["id"])["members"] == 2
    assert pushes(expo) == []


def test_request_waits_for_the_admins_and_tells_them_once(
    client: TestClient, expo: FakeExpo
) -> None:
    ada = signed_up(client, "ada", push=True)
    cleo = signed_up(client, "cleo", push=True)
    bob = signed_up(client, "bob", push=True)
    group = made(client, ada)
    assert joined(client, cleo, group["id"]) == "requested"
    ok(on(client, "PUT", ada, group["id"], f"requests/{public_id(client, cleo)}"))
    ok(role(client, ada, group["id"], cleo, "coadmin"))
    expo.sent.clear()
    assert joined(client, bob, group["id"]) == "requested"
    assert joined(client, bob, group["id"]) == "requested"
    assert page(client, bob, group["id"])["me"] == "requested"
    opens = {"kind": "group_join_request", "group_id": group["id"]}
    text = "bob asked to join Dolomites Saturday Hikers."
    assert sorted(pushes(expo)) == sorted(
        [(phone("ada"), text, opens), (phone("cleo"), text, opens)]
    )
    expo.sent.clear()
    asking = client.get(f"/groups/{group['id']}/requests", headers=cleo)
    assert [p["username"] for p in asking.json()["people"]] == ["bob"]
    ok(on(client, "PUT", cleo, group["id"], f"requests/{public_id(client, bob)}"))
    assert page(client, bob, group["id"])["me"] == "member"
    assert pushes(expo) == [
        (
            phone("bob"),
            "You're in Dolomites Saturday Hikers!",
            {"kind": "group_join_accepted", "group_id": group["id"]},
        )
    ]


def test_a_member_cannot_read_or_answer_the_requests(client: TestClient) -> None:
    ada, bob, cleo = (signed_up(client, n) for n in ("ada", "bob", "cleo"))
    group = made(client, ada, access="public")
    joined(client, bob, group["id"])
    answer = client.get(f"/groups/{group['id']}/requests", headers=bob)
    assert error(answer, 403, "http_error") == ONLY_ADMINS
    target = f"requests/{public_id(client, cleo)}"
    assert on(client, "PUT", bob, group["id"], target).status_code == 403


def test_a_request_refused_or_withdrawn_is_gone(client: TestClient) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    group = made(client, ada)
    joined(client, bob, group["id"])
    ok(on(client, "DELETE", ada, group["id"], f"requests/{public_id(client, bob)}"))
    assert page(client, bob, group["id"])["me"] == "none"
    joined(client, bob, group["id"])
    ok(leave(client, bob, group["id"]))
    assert page(client, bob, group["id"])["me"] == "none"
    answer = on(client, "PUT", ada, group["id"], f"requests/{public_id(client, bob)}")
    assert error(answer, 404, "http_error")


def test_invite_only_is_seen_only_by_who_is_invited(
    client: TestClient, expo: FakeExpo
) -> None:
    ada = signed_up(client, "ada")
    bob = signed_up(client, "bob", push=True)
    cleo = signed_up(client, "cleo")
    group = made(client, ada, access="invite", sports=["alpinism"])
    for who in (bob, cleo):
        assert error(get(client, who, group["id"]), 404, "http_error") == NO_GROUP
        assert error(join(client, who, group["id"]), 404, "http_error") == NO_GROUP
    ok(on(client, "PUT", ada, group["id"], f"invites/{public_id(client, bob)}"))
    assert page(client, bob, group["id"])["me"] == "invited"
    assert pushes(expo) == [
        (
            phone("bob"),
            "ada invited you to join Dolomites Saturday Hikers.",
            {"kind": "group_invite", "group_id": group["id"]},
        )
    ]
    mine = client.get("/me/groups", headers=bob).json()
    assert [g["me"] for g in mine["invites"]] == ["invited"] and mine["groups"] == []
    assert joined(client, bob, group["id"]) == "member"
    assert get(client, cleo, group["id"]).status_code == 404


def test_an_invite_refused_or_withdrawn_hides_the_group_again(
    client: TestClient,
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    group = made(client, ada, access="invite")
    target = f"invites/{public_id(client, bob)}"
    ok(on(client, "PUT", ada, group["id"], target))
    ok(leave(client, bob, group["id"]))
    assert get(client, bob, group["id"]).status_code == 404
    ok(on(client, "PUT", ada, group["id"], target))
    ok(on(client, "DELETE", ada, group["id"], target))
    assert get(client, bob, group["id"]).status_code == 404


def test_inviting_who_asked_lets_it_in(client: TestClient, expo: FakeExpo) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob", push=True)
    group = made(client, ada)
    joined(client, bob, group["id"])
    ok(on(client, "PUT", ada, group["id"], f"invites/{public_id(client, bob)}"))
    assert page(client, bob, group["id"])["me"] == "member"
    assert [p[2]["kind"] for p in pushes(expo)] == ["group_join_accepted"]


def test_a_block_with_the_admin_hides_the_group_and_keeps_out(
    client: TestClient,
) -> None:
    ada, bob, cleo = (signed_up(client, n) for n in ("ada", "bob", "cleo"))
    group = made(client, ada, access="public", area=list(TRENTO))
    block(client, ada, bob)
    assert get(client, bob, group["id"]).status_code == 404
    assert join(client, bob, group["id"]).status_code == 404
    assert found(client, bob, near(TRENTO)) == []
    # Nor can the admin invite one it is kept apart from, nor a co-admin.
    joined(client, cleo, group["id"])
    ok(role(client, ada, group["id"], cleo, "coadmin"))
    answer = on(client, "PUT", cleo, group["id"], f"invites/{public_id(client, bob)}")
    assert error(answer, 404, "http_error")
    # The other way round too: who blocks the admin no longer sees it.
    block(client, cleo, ada)
    assert get(client, cleo, group["id"]).status_code == 404


def test_full_at_three_hundred(client: TestClient, database: Database) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    group = made(client, ada, access="public")
    with database.connect() as conn:
        for n in range(MAX_MEMBERS - 1):
            made_user = conn.execute(
                "INSERT INTO users (email, username, password_hash, confirmed_16_at,"
                " created_at) VALUES (%s, %s, 'x', now(), now()) RETURNING id",
                (f"m{n}@example.com", f"m{n}"),
            ).fetchone()
            assert made_user is not None
            conn.execute(
                "INSERT INTO group_members (group_id, user_id, role, joined_at,"
                " role_since) VALUES (%s, %s, 'member', now(), now())",
                (group["id"], made_user["id"]),
            )
    assert error(join(client, bob, group["id"]), 422) == FULL


# --- Who sees what (GRUPPI.md §5) ---


def test_who_is_in_only_the_members_see(client: TestClient) -> None:
    ada, bob, cleo = (signed_up(client, n) for n in ("ada", "bob", "cleo"))
    group = made(client, ada, access="public")
    joined(client, bob, group["id"])
    outside = page(client, cleo, group["id"])
    assert outside["members"] == 2 and outside["me"] == "none"
    answer = client.get(f"/groups/{group['id']}/members", headers=cleo)
    assert error(answer, 403, "http_error") == ONLY_MEMBERS
    assert members(client, bob, group["id"]) == ["ada:admin", "bob:member"]


def test_two_members_kept_apart_do_not_see_each_other(client: TestClient) -> None:
    ada, bob, cleo = (signed_up(client, n) for n in ("ada", "bob", "cleo"))
    group = made(client, ada, access="public")
    joined(client, bob, group["id"])
    joined(client, cleo, group["id"])
    block(client, bob, cleo)
    assert members(client, bob, group["id"]) == ["ada:admin", "bob:member"]
    assert page(client, bob, group["id"])["members"] == 2
    assert members(client, ada, group["id"]) == [
        "ada:admin",
        "bob:member",
        "cleo:member",
    ]


def test_hidden_from_a_report_only_the_members_see_it(
    client: TestClient, database: Database
) -> None:
    ada, bob, cleo = (signed_up(client, n) for n in ("ada", "bob", "cleo"))
    group = made(client, ada, access="public", area=list(TRENTO))
    joined(client, bob, group["id"])
    with database.connect() as conn:
        conn.execute(
            "UPDATE groups SET hidden_at = now() WHERE id = %s", (group["id"],)
        )
    assert get(client, cleo, group["id"]).status_code == 404
    assert join(client, cleo, group["id"]).status_code == 404
    assert found(client, cleo, near(TRENTO)) == []
    assert page(client, bob, group["id"])["me"] == "member"
    assert found(client, bob, near(TRENTO)) == []


# --- The roles (GRUPPI.md §4) ---


def test_three_co_admins_at_most_named_by_the_admin_only(client: TestClient) -> None:
    ada = signed_up(client, "ada")
    others = [signed_up(client, f"m{n}") for n in range(MAX_COADMINS + 1)]
    group = made(client, ada, access="public")
    for other in others:
        joined(client, other, group["id"])
    assert role(client, others[0], group["id"], others[1], "coadmin").status_code == 403
    for other in others[:MAX_COADMINS]:
        ok(role(client, ada, group["id"], other, "coadmin"))
    last = role(client, ada, group["id"], others[-1], "coadmin")
    assert error(last, 422) == TOO_MANY_COADMINS
    ok(role(client, ada, group["id"], others[0], "member"))
    ok(role(client, ada, group["id"], others[-1], "coadmin"))


def test_a_co_admin_takes_out_members_not_co_admins(client: TestClient) -> None:
    ada, bob, cleo, dan = (signed_up(client, n) for n in ("ada", "bob", "cleo", "dan"))
    group = made(client, ada, access="public")
    for who in (bob, cleo, dan):
        joined(client, who, group["id"])
    ok(role(client, ada, group["id"], bob, "coadmin"))
    ok(role(client, ada, group["id"], cleo, "coadmin"))
    out = f"members/{public_id(client, cleo)}"
    assert on(client, "DELETE", bob, group["id"], out).status_code == 403
    admin_out = f"members/{public_id(client, ada)}"
    assert on(client, "DELETE", bob, group["id"], admin_out).status_code == 403
    ok(on(client, "DELETE", bob, group["id"], f"members/{public_id(client, dan)}"))
    ok(on(client, "DELETE", ada, group["id"], out))
    assert members(client, ada, group["id"]) == ["ada:admin", "bob:coadmin"]
    # Taken out, it may ask again.
    assert joined(client, dan, group["id"]) == "member"


def test_the_admin_leaves_only_after_passing_the_role(
    client: TestClient, database: Database
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    group = made(client, ada, access="public")
    joined(client, bob, group["id"])
    assert error(leave(client, ada, group["id"]), 422) == PASS_FIRST
    ok(role(client, ada, group["id"], bob, "admin"))
    assert members(client, bob, group["id"]) == ["bob:admin", "ada:member"]
    assert role(client, ada, group["id"], bob, "member").status_code == 403
    ok(leave(client, ada, group["id"]))
    # The last member leaves: the group is gone.
    ok(leave(client, bob, group["id"]))
    assert rows(database, "SELECT id FROM groups") == []


def test_the_role_is_passed_to_one_admin_of_less_than_five(
    client: TestClient,
) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    for n in range(MAX_ADMIN_OF):
        made(client, bob, name=f"Bob's {n}")
    group = made(client, ada, access="public")
    joined(client, bob, group["id"])
    answer = role(client, ada, group["id"], bob, "admin")
    assert error(answer, 422) == THEY_HAVE_TOO_MANY


def test_the_admin_s_account_deleted_passes_the_role(
    client: TestClient, database: Database
) -> None:
    ada, bob, cleo, dan = (signed_up(client, n) for n in ("ada", "bob", "cleo", "dan"))
    with_co = made(client, ada, name="With co-admins", access="public")
    with_members = made(client, ada, name="With members", access="public")
    alone = made(client, ada, name="Alone")
    for who in (bob, cleo, dan):
        joined(client, who, with_co["id"])
    ok(role(client, ada, with_co["id"], dan, "coadmin"))
    ok(role(client, ada, with_co["id"], cleo, "coadmin"))
    joined(client, cleo, with_members["id"])
    joined(client, bob, with_members["id"])
    ok(client.delete("/me", headers=ada))
    # The oldest co-admin; the oldest member; nobody, and the group is gone.
    assert members(client, bob, with_co["id"])[0] == "dan:admin"
    assert members(client, bob, with_members["id"])[0] == "cleo:admin"
    left = rows(database, "SELECT id FROM groups WHERE id = %s", alone["id"])
    assert left == []
    admins = rows(
        database, "SELECT count(*) AS n FROM group_members WHERE role = 'admin'"
    )
    assert admins == [{"n": 2}]


# --- Finding them (GRUPPI.md §7) ---


def test_explore_finds_the_near_ones_and_names_anywhere(client: TestClient) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    made(client, ada, name="Trento Hikers", area=list(TRENTO), access="public")
    made(client, ada, name="Rovereto Riders", area=list(ROVERETO), sports=["cycling"])
    made(client, ada, name="Milan Walkers", area=list(MILAN), sports=["walking"])
    made(client, ada, name="Secret Ropes", area=list(TRENTO), access="invite")
    assert found(client, bob, near(TRENTO)) == ["Trento Hikers", "Rovereto Riders"]
    assert found(client, bob, f"{near(TRENTO)}&sport=cycling") == ["Rovereto Riders"]
    assert found(client, bob, "q=walk") == ["Milan Walkers"]
    assert found(client, bob, "q=ropes") == []
    assert found(client, bob, "q=r%25") == []
    assert error(client.get("/groups", headers=bob), 422) == NO_PLACE
    half = client.get(f"/groups?lat={TRENTO[0]}", headers=bob)
    assert half.status_code == 422


def test_one_s_own_groups_by_name_only_for_oneself(client: TestClient) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    made(client, ada, name="Zeta", access="public")
    alpha = made(client, bob, name="Alpha", access="public")
    joined(client, ada, alpha["id"])
    mine = client.get("/me/groups", headers=ada).json()
    assert [g["name"] for g in mine["groups"]] == ["Alpha", "Zeta"]
    assert [g["me"] for g in mine["groups"]] == ["member", "admin"]


# --- «Mute» (GRUPPI.md §8) ---


def test_mute_is_a_member_s_own(client: TestClient) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    group = made(client, ada, access="public")
    assert on(client, "PUT", bob, group["id"], "mute").status_code == 403
    joined(client, bob, group["id"])
    ok(on(client, "PUT", bob, group["id"], "mute"))
    assert page(client, bob, group["id"])["muted"] is True
    assert page(client, ada, group["id"])["muted"] is False
    ok(on(client, "DELETE", bob, group["id"], "mute"))
    assert page(client, bob, group["id"])["muted"] is False


# --- Reporting (GRUPPI.md §10) ---


def test_a_group_is_reported_of_its_admin_and_hidden_from_the_email(
    client: TestClient, database: Database
) -> None:
    ada, bob, cleo = (signed_up(client, n) for n in ("ada", "bob", "cleo"))
    group = made(client, ada, access="public")
    joined(client, bob, group["id"])
    body = {"kind": "group", "id": group["id"], "reason": "offensive"}
    ok(client.post("/reports", json=body, headers=cleo))
    own = client.post("/reports", json=body, headers=ada)
    assert error(own, 422) == NOT_YOURSELF_REPORT
    nothing = {**body, "id": str(uuid4())}
    assert client.post("/reports", json=nothing, headers=cleo).status_code == 404
    (report,) = rows(database, "SELECT id FROM reports")
    with database.connect() as conn:
        told = reported(conn, report["id"])
        assert told is not None
        assert told.author == "ada"
        assert "Name: Dolomites Saturday Hikers" in told.lines
        link = Links(b"s" * 32, "https://api.example").new(
            "hide", "group", UUID(group["id"]), NOW
        )
        assert apply(conn, link, NOW) == "done"
    assert get(client, cleo, group["id"]).status_code == 404
    assert page(client, bob, group["id"])["me"] == "member"


def test_the_bell_keeps_the_group_to_open(client: TestClient) -> None:
    ada, bob = signed_up(client, "ada"), signed_up(client, "bob")
    group = made(client, ada)
    joined(client, bob, group["id"])
    answer = client.get("/notifications", headers=ada)
    assert answer.status_code == 200, answer.text
    (line,) = answer.json()["notifications"]
    assert line["kind"] == "group_join_request"
    assert line["opens"] == {"kind": "group_join_request", "group_id": group["id"]}
    assert line["text"] == "bob asked to join Dolomites Saturday Hikers."


def test_deleting_an_account_takes_its_requests_and_invites(
    client: TestClient, database: Database
) -> None:
    ada, bob, cleo = (signed_up(client, n) for n in ("ada", "bob", "cleo"))
    group = made(client, ada)
    joined(client, bob, group["id"])
    ok(on(client, "PUT", ada, group["id"], f"invites/{public_id(client, cleo)}"))
    ok(client.delete("/me", headers=bob))
    ok(client.delete("/me", headers=cleo))
    assert rows(database, "SELECT * FROM group_requests") == []
    assert rows(database, "SELECT * FROM group_invites") == []
    assert page(client, ada, group["id"])["members"] == 1
