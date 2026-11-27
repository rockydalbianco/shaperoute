"""The outings of a group in a real PostgreSQL, with Expo faked (TASK-495
part C, ADR-0402, docs/GRUPPI.md §6–§8): an outing with or without a route,
created by a member only; for the members only, or for everyone in a public
group; who sees it and who may say «I'm going»; the push of a new outing,
not to who muted the group; the Feed's row with the outings of my groups
wherever they are, and without them for an app of before; the group's page;
the admin and the co-admins cancelling the outings of the others; who
leaves or is taken out losing its upcoming outings. One test for each rule.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from test_group_runs import (
    DAY,
    FIXTURES,
    INDEX_TS,
    MILAN,
    NOW,
    TRENTO,
    Headers,
    WallClock,
    asked,
    error,
    going,
    phone,
    points_at,
    public_id,
    pushes,
    rows,
    sending,
    signed_up,
)
from test_push import FAST_HASHER, FakeExpo

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.group_runs import (
    DESTINATION_WRONG,
    EVERYONE_PUBLIC,
    GROUP_NEEDED,
    MAX_DESTINATION,
    NO_GROUP,
    NO_GROUP_RUN,
    OUTING_SPORTS,
    SPORT_WRONG,
    GroupOutingRequestBody,
    GroupRunDetailBody,
    GroupRunRequestBody,
    ProfileGroupRunsBody,
)
from shaperoute_api.groups import NO_GROUP as GROUPS_NO_GROUP
from shaperoute_api.notice_email import EMAIL_KINDS
from shaperoute_api.push import OWN_KINDS, TEXTS, PushEvent, data_of, text_of

# Far from Trento, where the group and its outings are: the 50 km of the
# Feed's row do not reach.
FAR = MILAN


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


@pytest.fixture
def wall() -> WallClock:
    return WallClock()


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


@pytest.fixture
def expo() -> FakeExpo:
    return FakeExpo()


@pytest.fixture
def client(database: Database, expo: FakeExpo, wall: WallClock) -> TestClient:
    accounts = Accounts(database, now=wall, hasher=FAST_HASHER)
    app = create_app(
        FileSource(Path("unused.graphml")),
        accounts=accounts,
        run_places=PlaceNames(None),
    )
    app.state.pusher = sending(database, expo)
    return TestClient(app)


# --- Helpers ---


def user(client: TestClient, name: str, push: bool = False) -> Headers:
    """A new account, from an app that reads the sports of the outings
    without a route (reads.py)."""
    return {
        **signed_up(client, name, push),
        "X-MuW-Reads": "alpinism, hiking, ski_touring, walking",
    }


def group_of(client: TestClient, admin: Headers, access: str = "request") -> str:
    body = {**_load("group-request.json"), "access": access}
    answer = client.post("/groups", json=body, headers=admin)
    assert answer.status_code == 201, answer.text
    return str(answer.json()["id"])


def member_of(client: TestClient, admin: Headers, group_id: str, who: Headers) -> None:
    """`who` asks, or joins a public group; the admin accepts."""
    answer = client.put(f"/groups/{group_id}/membership", headers=who)
    assert answer.status_code == 200, answer.text
    if answer.json()["me"] == "requested":
        accepted = client.put(
            f"/groups/{group_id}/requests/{public_id(client, who)}", headers=admin
        )
        assert accepted.status_code == 204, accepted.text


def outing_asked(group_id: str, **changes: Any) -> dict[str, Any]:
    """The example outing without a route, a day after NOW, in `group_id`."""
    return {
        **_load("group-outing-request.json"),
        "group_id": group_id,
        "starts_at": (NOW + DAY).isoformat(),
        **changes,
    }


def create_outing(
    client: TestClient, headers: Headers, group_id: str, **changes: Any
) -> Any:
    return client.post(
        "/group-runs", json=outing_asked(group_id, **changes), headers=headers
    )


def outing(
    client: TestClient, headers: Headers, group_id: str, **changes: Any
) -> dict[str, Any]:
    answer = create_outing(client, headers, group_id, **changes)
    assert answer.status_code == 201, answer.text
    return dict(answer.json())


def route_outing(
    client: TestClient, headers: Headers, group_id: str, **changes: Any
) -> dict[str, Any]:
    """The example route, as an outing of `group_id`."""
    body = asked(group_id=group_id, **{"visibility": "group", **changes})
    answer = client.post("/group-runs", json=body, headers=headers)
    assert answer.status_code == 201, answer.text
    return dict(answer.json())


def titles(answer: Any) -> list[str]:
    assert answer.status_code == 200, answer.text
    return [one["title"] for one in answer.json()["group_runs"]]


def row_of(client: TestClient, headers: Headers, outings: bool = True) -> list[str]:
    query = f"?lat={FAR[0]}&lon={FAR[1]}" + ("&outings=true" if outings else "")
    return titles(client.get(f"/group-runs{query}", headers=headers))


def page_outings(client: TestClient, headers: Headers, group_id: str) -> Any:
    return client.get(f"/groups/{group_id}/outings", headers=headers)


def sent_to(expo: FakeExpo, name: str) -> list[str]:
    return [text for to, text, _ in pushes(expo) if to == phone(name)]


# --- The contract ---


def test_the_examples_are_the_bodies() -> None:
    GroupOutingRequestBody.model_validate(_load("group-outing-request.json"))
    whole = _load("group-outing.json")
    assert set(whole) == set(GroupRunDetailBody.model_fields)
    GroupRunDetailBody.model_validate(whole)
    ProfileGroupRunsBody.model_validate(_load("group-outings.json"))
    # A route of a group is a group run's request with the group.
    GroupRunRequestBody.model_validate(
        {**_load("group-run-request.json"), "group_id": str(uuid4())}
    )


def test_the_app_knows_the_same_limit_and_the_same_words() -> None:
    match = re.search(
        r"export const GROUP_OUTING_DESTINATION_MAX = (\d+);",
        INDEX_TS.read_text(encoding="utf-8"),
    )
    assert match is not None and int(match.group(1)) == MAX_DESTINATION
    assert NO_GROUP == GROUPS_NO_GROUP


def test_the_push_of_a_new_outing_names_the_group_and_opens_the_outing() -> None:
    outing_id = uuid4()
    assert set(TEXTS["group_outing_new"]) == {"en", "de", "it", "es", "fr"}
    event = PushEvent(
        "group_outing_new",
        1,
        2,
        text="Cima Tosa at dawn",
        group_run_id=outing_id,
        names={"en": "Dolomites Saturday Hikers"},
    )
    for language in TEXTS["group_outing_new"]:
        said = text_of(event, "ada", language)
        assert "ada" in said and "Cima Tosa at dawn" in said
        assert "Dolomites Saturday Hikers" in said
    assert data_of(event, uuid4(), "ada") == {
        "kind": "group_outing_new",
        "group_run_id": str(outing_id),
    }
    assert "group_outing_new" not in EMAIL_KINDS
    assert "group_outing_new" not in OWN_KINDS


def test_the_database_takes_every_sport_of_an_outing(database: Database) -> None:
    """0090 widens group_runs_activity_check to the sports recorded
    outdoors, under its name: the next sport's migration widens it too."""
    (row,) = rows(
        database,
        "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint"
        " WHERE conname = 'group_runs_activity_check'",
    )
    listed = set(re.findall(r"'([a-z_]+)'", row["def"]))
    assert set(OUTING_SPORTS) <= listed
    assert not {"gym", "stretching"} & listed


# --- Creating ---


def test_a_member_creates_an_outing_without_a_route(
    client: TestClient, database: Database
) -> None:
    ada, bea = user(client, "ada"), user(client, "bea")
    group_id = group_of(client, ada)
    member_of(client, ada, group_id, bea)
    made = outing(client, bea, group_id)
    assert made["group_id"] == group_id
    assert made["group_name"] == "Dolomites Saturday Hikers"
    assert made["destination"] == "Cima Tosa, normal route"
    assert made["activity"] == "alpinism"
    assert made["city"] == "Trento"
    assert made["visibility"] == "group"
    assert made["start"] == [46.1745, 10.8692]
    assert made["points"] == [] and made["preview"] == []
    assert made["distance_m"] is None and made["route_m"] is None
    assert made["similarity"] is None
    assert made["organiser"]["username"] == "bea"
    (row,) = rows(database, "SELECT line, group_id FROM group_runs")
    assert row["line"] is None and str(row["group_id"]) == group_id


def test_an_outing_with_a_route_keeps_its_route_and_its_group(
    client: TestClient,
) -> None:
    ada = user(client, "ada")
    group_id = group_of(client, ada)
    made = route_outing(client, ada, group_id)
    assert made["group_id"] == group_id
    assert made["destination"] is None
    assert len(made["points"]) >= 2 and made["distance_m"] == 5000


def test_only_a_member_creates_an_outing(client: TestClient) -> None:
    ada, bea = user(client, "ada"), user(client, "bea")
    group_id = group_of(client, ada, access="public")
    # Not a member, and a group that is not there: the same 404.
    assert error(create_outing(client, bea, group_id), 404, "http_error") == NO_GROUP
    assert (
        error(create_outing(client, bea, str(uuid4())), 404, "http_error") == NO_GROUP
    )
    body = asked(group_id=group_id, visibility="group")
    answer = client.post("/group-runs", json=body, headers=bea)
    assert error(answer, 404, "http_error") == NO_GROUP


def test_the_fields_of_an_outing_without_a_route(client: TestClient) -> None:
    ada = user(client, "ada")
    group_id = group_of(client, ada)
    long = "x" * (MAX_DESTINATION + 1)
    for destination in ("", "  ", long, "one\ntwo"):
        answer = create_outing(client, ada, group_id, destination=destination)
        assert error(answer, 422) == DESTINATION_WRONG
    answer = create_outing(client, ada, group_id, destination="che merda")
    error(answer, 422, "comment_rejected")
    for sport in ("gym", "stretching", "chess"):
        answer = create_outing(client, ada, group_id, activity=sport)
        assert error(answer, 422) == SPORT_WRONG
    for sport in ("alpinism", "hiking", "ski_touring", "running"):
        outing(client, ada, group_id, activity=sport, title=f"Out {sport}")
    # A meeting point outside the world, or no meeting point.
    answer = create_outing(client, ada, group_id, meeting_point=[91, 0])
    assert answer.status_code == 422
    body = outing_asked(group_id)
    del body["meeting_point"]
    assert client.post("/group-runs", json=body, headers=ada).status_code == 422


def test_who_an_outing_is_for(client: TestClient) -> None:
    ada = user(client, "ada")
    asking = group_of(client, ada)
    public = group_of(client, ada, access="public")
    # «group» needs a group; a group's outing is never for the followers.
    answer = client.post("/group-runs", json=asked(visibility="group"), headers=ada)
    assert error(answer, 422) == GROUP_NEEDED
    body = asked(group_id=asking, visibility="followers")
    answer = client.post("/group-runs", json=body, headers=ada)
    assert error(answer, 422) == EVERYONE_PUBLIC
    # Everyone, only in a public group.
    answer = create_outing(client, ada, asking, visibility="everyone")
    assert error(answer, 422) == EVERYONE_PUBLIC
    assert outing(client, ada, public, visibility="everyone")["visibility"] == (
        "everyone"
    )


# --- Who sees it ---


def test_an_outing_for_the_members_is_seen_by_the_members_only(
    client: TestClient,
) -> None:
    ada, bea, cleo = (user(client, n) for n in ("ada", "bea", "cleo"))
    group_id = group_of(client, ada, access="public")
    member_of(client, ada, group_id, bea)
    made = outing(client, ada, group_id)
    path = f"/group-runs/{made['id']}"
    assert client.get(path, headers=bea).status_code == 200
    going(client, bea, made["id"])
    # Outside, it is not there: no page, no «I'm going», not on the page.
    assert error(client.get(path, headers=cleo), 404, "http_error") == NO_GROUP_RUN
    answer = client.put(f"{path}/going", headers=cleo)
    assert error(answer, 404, "http_error") == NO_GROUP_RUN
    assert page_outings(client, cleo, group_id).json()["upcoming"] == []
    # Joined, it is.
    member_of(client, ada, group_id, cleo)
    assert client.get(path, headers=cleo).status_code == 200


def test_an_outing_for_everyone_is_seen_from_outside_a_public_group(
    client: TestClient,
) -> None:
    ada, cleo = user(client, "ada"), user(client, "cleo")
    group_id = group_of(client, ada, access="public")
    made = outing(client, ada, group_id, visibility="everyone")
    path = f"/group-runs/{made['id']}"
    assert client.get(path, headers=cleo).status_code == 200
    going(client, cleo, made["id"])
    # The group asks to join from now on: its outings for everyone go
    # back to its members.
    answer = client.put(
        f"/groups/{group_id}",
        json={**_load("group-request.json"), "access": "request"},
        headers=ada,
    )
    assert answer.status_code == 200, answer.text
    assert client.get(path, headers=cleo).status_code == 404


def test_a_block_with_the_group_s_admin_hides_its_outings(
    client: TestClient,
) -> None:
    ada, bea, cleo = (user(client, n) for n in ("ada", "bea", "cleo"))
    group_id = group_of(client, ada, access="public")
    member_of(client, ada, group_id, bea)
    made = outing(client, bea, group_id, visibility="everyone")
    assert client.get(f"/group-runs/{made['id']}", headers=cleo).status_code == 200
    answer = client.put(f"/users/{public_id(client, cleo)}/block", headers=ada)
    assert answer.status_code == 204, answer.text
    assert client.get(f"/group-runs/{made['id']}", headers=cleo).status_code == 404


# --- The push ---


def test_a_new_outing_tells_the_members_but_who_muted_the_group(
    client: TestClient, expo: FakeExpo
) -> None:
    ada = user(client, "ada", push=True)
    bea = user(client, "bea", push=True)
    cleo = user(client, "cleo", push=True)
    dan = user(client, "dan", push=True)
    group_id = group_of(client, ada)
    for who in (bea, cleo):
        member_of(client, ada, group_id, who)
    assert client.put(f"/groups/{group_id}/mute", headers=cleo).status_code == 204
    expo.sent.clear()
    made = outing(client, bea, group_id)
    assert sent_to(expo, "ada") == [
        "bea planned a new outing in Dolomites Saturday Hikers: Cima Tosa at dawn"
    ]
    assert sent_to(expo, "bea") == []  # who created it
    assert sent_to(expo, "cleo") == []  # muted
    assert sent_to(expo, "dan") == []  # not a member
    ((_, _, data),) = [one for one in pushes(expo) if one[0] == phone("ada")]
    assert data == {"kind": "group_outing_new", "group_run_id": made["id"]}
    # A group run without a group tells nobody, as before.
    expo.sent.clear()
    client.post("/group-runs", json=asked(), headers=dan)
    assert pushes(expo) == []


# --- The lists ---


def test_the_feed_s_row_has_the_outings_of_my_groups_wherever_they_are(
    client: TestClient,
) -> None:
    ada, bea, cleo = (user(client, n) for n in ("ada", "bea", "cleo"))
    group_id = group_of(client, ada)
    member_of(client, ada, group_id, bea)
    outing(client, ada, group_id, title="Without a route")
    route_outing(client, ada, group_id, title="With a route")
    route_outing(
        client,
        ada,
        group_id,
        title="Far away",
        points=points_at(*TRENTO),
    )
    # Trento is 180 km from where bea's phone is.
    assert sorted(row_of(client, bea)) == [
        "Far away",
        "With a route",
        "Without a route",
    ]
    assert row_of(client, cleo) == []


def test_an_app_of_before_gets_no_outing_it_cannot_read(
    client: TestClient,
) -> None:
    ada = user(client, "ada")
    group_id = group_of(client, ada, access="public")
    outing(client, ada, group_id, title="Without a route")
    route_outing(client, ada, group_id, title="For the members")
    route_outing(client, ada, group_id, title="For everyone", visibility="everyone")
    client.post("/group-runs", json=asked(title="A group run"), headers=ada)
    assert sorted(row_of(client, ada, outings=False)) == ["A group run", "For everyone"]
    me = public_id(client, ada)
    old = client.get(f"/users/{me}/group-runs", headers=ada).json()
    assert sorted(one["title"] for one in old["upcoming"]) == [
        "A group run",
        "For everyone",
    ]
    new = client.get(f"/users/{me}/group-runs?outings=true", headers=ada).json()
    assert len(new["upcoming"]) == 4


def test_the_group_s_page_lists_its_outings(
    client: TestClient, wall: WallClock
) -> None:
    ada, bea = user(client, "ada"), user(client, "bea")
    group_id = group_of(client, ada)
    member_of(client, ada, group_id, bea)
    soon = outing(client, bea, group_id, title="Soon")
    later = outing(
        client, ada, group_id, title="Later", starts_at=(NOW + 2 * DAY).isoformat()
    )
    cancelled = outing(client, ada, group_id, title="Cancelled")
    answer = client.delete(f"/group-runs/{cancelled['id']}", headers=ada)
    assert answer.status_code == 204
    answer = page_outings(client, bea, group_id)
    assert answer.status_code == 200, answer.text
    assert [one["id"] for one in answer.json()["upcoming"]] == [
        soon["id"],
        later["id"],
    ]
    assert answer.json()["past"] == []
    wall.t = NOW + 5 * DAY
    past = page_outings(client, bea, group_id).json()["past"]
    assert [one["id"] for one in past] == [later["id"], soon["id"]]
    # An invite-only group is not there for who was not invited.
    hidden = group_of(client, ada, access="invite")
    cleo = user(client, "cleo")
    answer = page_outings(client, cleo, hidden)
    assert error(answer, 404, "http_error") == NO_GROUP


# --- Cancelling ---


def test_the_admins_cancel_the_outings_of_the_others(
    client: TestClient, expo: FakeExpo
) -> None:
    ada = user(client, "ada", push=True)
    bea = user(client, "bea", push=True)
    cleo = user(client, "cleo", push=True)
    dan = user(client, "dan", push=True)
    group_id = group_of(client, ada)
    for who in (bea, cleo, dan):
        member_of(client, ada, group_id, who)
    made = outing(client, bea, group_id)
    going(client, cleo, made["id"])
    # A member does not cancel another's: as for an outing not its own.
    answer = client.delete(f"/group-runs/{made['id']}", headers=dan)
    assert error(answer, 404, "http_error") == NO_GROUP_RUN
    expo.sent.clear()
    assert client.delete(f"/group-runs/{made['id']}", headers=ada).status_code == 204
    assert sent_to(expo, "bea") == ["ada cancelled Cima Tosa at dawn."]
    assert sent_to(expo, "cleo") == ["ada cancelled Cima Tosa at dawn."]
    assert detail_of(client, bea, made["id"])["status"] == "cancelled"
    # A co-admin too.
    answer = client.put(
        f"/groups/{group_id}/members/{public_id(client, dan)}/role",
        json={"role": "coadmin"},
        headers=ada,
    )
    assert answer.status_code == 204, answer.text
    other = outing(client, bea, group_id, title="Another")
    assert client.delete(f"/group-runs/{other['id']}", headers=dan).status_code == 204
    # But only before the start, and the change stays the organiser's.
    third = outing(client, bea, group_id, title="Third")
    answer = client.put(
        f"/group-runs/{third['id']}",
        json={**_load("group-run-change.json"), "destination": "Elsewhere"},
        headers=ada,
    )
    assert error(answer, 404, "http_error") == NO_GROUP_RUN


def detail_of(client: TestClient, headers: Headers, outing_id: str) -> Any:
    answer = client.get(f"/group-runs/{outing_id}", headers=headers)
    assert answer.status_code == 200, answer.text
    return answer.json()


@pytest.mark.parametrize("how", ["leaves", "is_removed"])
def test_who_leaves_or_is_removed_loses_its_upcoming_outings(
    client: TestClient, expo: FakeExpo, how: str
) -> None:
    ada = user(client, "ada", push=True)
    bea = user(client, "bea", push=True)
    cleo = user(client, "cleo", push=True)
    group_id = group_of(client, ada)
    other_group = group_of(client, ada, access="public")
    for who in (bea, cleo):
        member_of(client, ada, group_id, who)
    member_of(client, ada, other_group, bea)
    mine = outing(client, bea, group_id)
    elsewhere = outing(client, bea, other_group, title="Elsewhere")
    going(client, cleo, mine["id"])
    expo.sent.clear()
    if how == "leaves":
        answer = client.delete(f"/groups/{group_id}/membership", headers=bea)
    else:
        answer = client.delete(
            f"/groups/{group_id}/members/{public_id(client, bea)}", headers=ada
        )
    assert answer.status_code == 204, answer.text
    assert sent_to(expo, "cleo") == ["bea cancelled Cima Tosa at dawn."]
    assert detail_of(client, bea, mine["id"])["status"] == "cancelled"
    assert detail_of(client, bea, elsewhere["id"])["status"] == "upcoming"


# --- Changing ---


def test_the_destination_changes_with_an_outing_without_a_route_only(
    client: TestClient,
) -> None:
    ada = user(client, "ada")
    group_id = group_of(client, ada)
    made = outing(client, ada, group_id)
    change = _load("group-run-change.json")
    path = f"/group-runs/{made['id']}"
    answer = client.put(path, json=change, headers=ada)
    assert error(answer, 422) == DESTINATION_WRONG
    answer = client.put(
        path, json={**change, "destination": "Cima Brenta"}, headers=ada
    )
    assert answer.status_code == 200, answer.text
    assert answer.json()["destination"] == "Cima Brenta"
    route = route_outing(client, ada, group_id, title="With a route")
    answer = client.put(
        f"/group-runs/{route['id']}",
        json={**change, "destination": "Cima Brenta"},
        headers=ada,
    )
    assert error(answer, 422) == DESTINATION_WRONG
