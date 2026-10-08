"""Following with a request, in a real PostgreSQL (TASK-211, ADR-0173):
asking, accepting, declining, withdrawing, unfollowing and removing; the
numbers of a profile; the search by name; never the email; a deleted
account gone from everywhere."""

from __future__ import annotations

import base64
import io
import json
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, get_args
from uuid import UUID

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from PIL import Image
from psycopg import errors as pg_errors
from route_engine.network import FileSource

from shaperoute_api.accounts import AccountError, Accounts, token_hash
from shaperoute_api.app import create_app
from shaperoute_api.db import MIGRATIONS_DIR, Database, migrations
from shaperoute_api.follows import (
    MAX_FOUND,
    MIN_QUERY_LENGTH,
    NO_PROFILE,
    NO_REQUEST,
    NOT_YOURSELF,
    QUERY_TOO_SHORT,
    SMALL_PHOTO_SIDE,
    FollowBody,
    Follows,
    FollowState,
    PeopleBody,
    PeoplePageBody,
    PersonBody,
    checked_query,
    follows_sql,
    like_itself,
    small_photo,
)
from shaperoute_api.profile_photos import square_jpeg
from shaperoute_api.profiles import NO_PROFILE as PROFILES_NO_PROFILE
from shaperoute_api.profiles import PublicProfileBody

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
# Cheap parameters: every test signs up.
FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)
# The migration of the follows, whatever its number when merged.
(FOLLOWS,) = [path for path in migrations() if path.name.endswith("_follows.sql")]
NOBODY = "8c1f7a52-3d4e-4b9a-9f61-2a7c0e5d9b13"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class WallClock:
    def __init__(self) -> None:
        self.t = datetime(2026, 10, 3, 9, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.t

    def tick(self) -> None:
        self.t += timedelta(seconds=1)


@pytest.fixture
def wall() -> WallClock:
    return WallClock()


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


def api(database: Database, wall: WallClock) -> TestClient:
    accounts = Accounts(database, now=wall, hasher=FAST_HASHER)
    return TestClient(create_app(FileSource(Path("unused.graphml")), accounts=accounts))


@pytest.fixture
def client(database: Database, wall: WallClock) -> TestClient:
    return api(database, wall)


class Member:
    """An account signed up, as its requests carry it."""

    def __init__(self, client: TestClient, username: str) -> None:
        body = {
            **_load("sign-up-request.json"),
            "email": f"{username.lower()}@example.com",
            "username": username,
        }
        answer = client.post("/accounts", json=body)
        assert answer.status_code == 201
        self.email = body["email"]
        self.username = username
        self.headers = {"Authorization": f"Bearer {answer.json()['token']}"}
        self.public_id = answer.json()["user"]["public_id"]
        self.id: int = answer.json()["user"]["id"]


def old_member(database: Database, wall: WallClock, username: str) -> Member:
    """An account and a phone's session, kept as the API of before the
    follows kept them: the code of today reads columns a database before
    them does not have (the phone number, TASK-183)."""
    member = Member.__new__(Member)
    member.email = f"{username.lower()}@example.com"
    member.username = username
    token = f"token-of-before-{username}"
    with database.connect() as conn:
        row = conn.execute(
            "INSERT INTO users"
            " (email, password_hash, username, confirmed_16_at, created_at)"
            " VALUES (%s, %s, %s, %s, %s) RETURNING id, public_id",
            (
                member.email,
                FAST_HASHER.hash(_load("sign-up-request.json")["password"]),
                username,
                wall.t,
                wall.t,
            ),
        ).fetchone()
        assert row is not None
        conn.execute(
            "INSERT INTO sessions (token_hash, user_id, created_at, last_used_at)"
            " VALUES (%s, %s, %s, %s)",
            (token_hash(token), row["id"], wall.t, wall.t),
        )
    member.headers = {"Authorization": f"Bearer {token}"}
    member.public_id = str(row["public_id"])
    member.id = row["id"]
    return member


@pytest.fixture
def ada(client: TestClient) -> Member:
    return Member(client, "Ada_runs")


@pytest.fixture
def bea(client: TestClient) -> Member:
    return Member(client, "bea.trento")


def code(answer: Any) -> str:
    return str(answer.json()["error"]["code"])


def message(answer: Any) -> str:
    return str(answer.json()["error"]["message"])


def ask(client: TestClient, who: Member, whom: Member) -> Any:
    return client.post(f"/users/{whom.public_id}/follow", headers=who.headers)


def accept(client: TestClient, who: Member, whose: Member) -> Any:
    return client.post(
        f"/me/follow-requests/{whose.public_id}/accept", headers=who.headers
    )


def decline(client: TestClient, who: Member, whose: Member) -> Any:
    return client.post(
        f"/me/follow-requests/{whose.public_id}/decline", headers=who.headers
    )


def stop(client: TestClient, who: Member, whom: Member) -> Any:
    return client.delete(f"/users/{whom.public_id}/follow", headers=who.headers)


def profile(client: TestClient, viewer: Member, of: Member) -> dict[str, Any]:
    answer = client.get(f"/users/{of.public_id}", headers=viewer.headers)
    assert answer.status_code == 200
    return dict(answer.json())


def names(client: TestClient, who: Member, path: str) -> list[str]:
    answer = client.get(path, headers=who.headers)
    assert answer.status_code == 200
    return [person["username"] for person in answer.json()["people"]]


def found(client: TestClient, who: Member, q: str) -> list[str]:
    answer = client.get("/users", params={"q": q}, headers=who.headers)
    assert answer.status_code == 200
    return [person["username"] for person in answer.json()["people"]]


def rows(database: Database) -> list[dict[str, Any]]:
    with database.connect() as conn:
        return [
            dict(row)
            for row in conn.execute(
                "SELECT follower_id, followed_id, status, asked_at, accepted_at"
                " FROM follows ORDER BY follower_id, followed_id"
            )
        ]


def a_photo(colour: tuple[int, int, int] = (30, 160, 60)) -> str:
    picture = Image.new("RGB", (300, 300), colour)
    out = io.BytesIO()
    picture.save(out, "PNG")
    return base64.b64encode(out.getvalue()).decode("ascii")


# --- The contract and the rules, without a database ---


def test_the_examples_of_shared_types_are_the_contract() -> None:
    people = PeopleBody.model_validate(_load("people.json"))
    page = PeoplePageBody.model_validate(_load("people-page.json"))
    listed = [*_load("people.json")["people"], *_load("people-page.json")["people"]]
    for person in listed:
        assert set(person) == set(PersonBody.model_fields)
    assert set(_load("people-page.json")) == set(PeoplePageBody.model_fields)
    assert FollowBody.model_validate(_load("follow.json")).follow == "requested"
    # A picture in a list is the small one.
    photo = people.people[0].photo
    assert photo is not None
    small = Image.open(io.BytesIO(base64.b64decode(photo)))
    assert (small.format, small.size) == ("JPEG", (SMALL_PHOTO_SIDE,) * 2)
    assert page.next is not None and page.total >= len(page.people)
    seen = _load("public-profile.json")
    assert set(seen) == set(PublicProfileBody.model_fields)
    assert seen["follow"] in get_args(FollowState)
    assert people.people[0].public_id == UUID(seen["public_id"])


def test_the_migration_comes_after_the_paddling_favorites() -> None:
    names = [path.name for path in migrations()]
    assert names.index(FOLLOWS.name) > names.index("0010_favorite_paddling.sql")


def test_a_query_is_at_least_two_characters_and_never_a_pattern() -> None:
    for short in ("", " ", "a", "  a  "):
        with pytest.raises(AccountError) as refused:
            checked_query(short)
        assert (refused.value.status, refused.value.code) == (422, "invalid_request")
        assert refused.value.message == QUERY_TOO_SHORT
    assert checked_query(" Ad ") == "ad"
    assert len(checked_query("a" * 20) or "") == 20
    # Longer than any username: nobody, without asking the database.
    assert checked_query("a" * 21) is None
    assert like_itself("a_b%c\\d") == "a\\_b\\%c\\\\d"
    assert MIN_QUERY_LENGTH == 2 and MAX_FOUND == 20


def test_a_small_photo_is_half_the_side_and_has_no_exif() -> None:
    picture = Image.new("RGB", (300, 300), (200, 40, 40))
    out = io.BytesIO()
    exif = Image.Exif()
    exif[0x010F] = "PhoneMaker"  # Make
    picture.save(out, "JPEG", exif=exif)
    assert Image.open(io.BytesIO(out.getvalue())).getexif()
    small = Image.open(io.BytesIO(base64.b64decode(small_photo(out.getvalue()))))
    assert (small.format, small.size) == ("JPEG", (SMALL_PHOTO_SIDE,) * 2)
    assert not small.getexif()
    # The one kept for a profile, 256 px, comes out at half its side.
    kept = square_jpeg(base64.b64decode(a_photo()))
    small = Image.open(io.BytesIO(base64.b64decode(small_photo(kept))))
    assert small.size == (SMALL_PHOTO_SIDE,) * 2
    assert len(small_photo(kept)) < 2 * len(base64.b64encode(kept))
    # The same picture gives the same bytes.
    assert small_photo(kept) == small_photo(kept)


def test_no_profile_is_said_as_the_profile_says_it() -> None:
    assert NO_PROFILE == PROFILES_NO_PROFILE


# --- Who may ask ---

ENDPOINTS = [
    ("GET", "/users?q=ad"),
    ("POST", f"/users/{NOBODY}/follow"),
    ("DELETE", f"/users/{NOBODY}/follow"),
    ("GET", "/me/follow-requests"),
    ("POST", f"/me/follow-requests/{NOBODY}/accept"),
    ("POST", f"/me/follow-requests/{NOBODY}/decline"),
    ("GET", "/me/followers"),
    ("DELETE", f"/me/followers/{NOBODY}"),
    ("GET", "/me/following"),
]


def test_every_endpoint_needs_an_account(client: TestClient) -> None:
    for method, path in ENDPOINTS:
        answer = client.request(method, path)
        assert (answer.status_code, code(answer)) == (401, "not_signed_in"), path
        wrong = {"Authorization": "Bearer not-a-token"}
        answer = client.request(method, path, headers=wrong)
        assert (answer.status_code, code(answer)) == (401, "not_signed_in"), path


def test_without_a_database_following_is_unavailable() -> None:
    client = TestClient(create_app(FileSource(Path("unused.graphml"))))
    for method, path in ENDPOINTS:
        answer = client.request(method, path, headers={"Authorization": "Bearer x"})
        assert (answer.status_code, code(answer)) == (503, "accounts_unavailable")


# --- The search ---


def test_the_search_finds_a_part_of_a_name_in_any_case_never_oneself(
    client: TestClient, ada: Member
) -> None:
    for username in ("adam.trento", "Madalena", "Bob_ad", "carla", "AD_99"):
        Member(client, username)
    # First the names that begin with it, the shortest first; then the
    # others, the shortest first; never the one who asks (Ada_runs).
    assert found(client, ada, "aD") == [
        "AD_99",
        "adam.trento",
        "Bob_ad",
        "Madalena",
    ]
    assert found(client, ada, "  CARL ") == ["carla"]
    assert found(client, ada, "zz") == []
    # The others find Ada.
    carla = Member(client, "carla_b")
    assert found(client, carla, "ada_") == ["Ada_runs"]


def test_an_underscore_is_a_letter_not_any_character(
    client: TestClient, ada: Member
) -> None:
    Member(client, "bob_ad")
    Member(client, "bobxad")
    assert found(client, ada, "b_a") == ["bob_ad"]
    assert found(client, ada, "%%") == []
    assert found(client, ada, "b%d") == []


def test_the_search_gives_at_most_twenty_and_the_same_each_time(
    client: TestClient, ada: Member
) -> None:
    for n in range(MAX_FOUND + 3):
        Member(client, f"runner{n:02d}")
    first = found(client, ada, "runner")
    assert len(first) == MAX_FOUND
    assert first == [f"runner{n:02d}" for n in range(MAX_FOUND)]
    assert found(client, ada, "runner") == first


def test_a_query_too_short_is_refused_in_words(client: TestClient, ada: Member) -> None:
    for q in ("", "a", " a "):
        answer = client.get("/users", params={"q": q}, headers=ada.headers)
        assert (answer.status_code, code(answer)) == (422, "invalid_request")
        assert message(answer) == QUERY_TOO_SHORT
    answer = client.get("/users", headers=ada.headers)
    assert (answer.status_code, message(answer)) == (422, QUERY_TOO_SHORT)


def test_the_search_gives_only_name_photo_and_public_id(
    client: TestClient, ada: Member, bea: Member
) -> None:
    client.patch("/me", json={"bio": "Hearts on Sunday."}, headers=bea.headers)
    put = client.put("/me/photo", json={"image": a_photo()}, headers=bea.headers)
    assert put.status_code == 200
    answer = client.get("/users", params={"q": "bea"}, headers=ada.headers)
    assert answer.status_code == 200
    (person,) = answer.json()["people"]
    assert set(person) == {"public_id", "username", "photo"}
    assert (person["public_id"], person["username"]) == (bea.public_id, "bea.trento")
    small = Image.open(io.BytesIO(base64.b64decode(person["photo"])))
    assert small.size == (SMALL_PHOTO_SIDE,) * 2
    # Never the email, the bio, the internal id or anything else.
    assert bea.email not in answer.text
    assert "example.com" not in answer.text
    assert "Hearts" not in answer.text
    # Not even when the query is a piece of the email.
    assert found(client, ada, "example") == []


# --- Asking, accepting, declining ---


def test_a_request_not_accepted_is_not_following(
    client: TestClient, database: Database, ada: Member, bea: Member
) -> None:
    answer = ask(client, ada, bea)
    assert (answer.status_code, answer.json()) == (200, {"follow": "requested"})
    seen = profile(client, ada, bea)
    assert (seen["follow"], seen["followers"], seen["following"]) == (
        "requested",
        0,
        0,
    )
    assert profile(client, bea, ada)["following"] == 0
    assert names(client, ada, "/me/following") == []
    assert names(client, bea, "/me/followers") == []
    # Bea sees the request, and only she does.
    assert names(client, bea, "/me/follow-requests") == ["Ada_runs"]
    assert names(client, ada, "/me/follow-requests") == []
    follows = Follows(database, datetime.now)
    assert not follows.follows(ada.id, bea.id)
    assert not follows.follows(bea.id, ada.id)


def test_accepted_it_is_following_on_both_profiles_and_lists(
    client: TestClient, database: Database, wall: WallClock, ada: Member, bea: Member
) -> None:
    ask(client, ada, bea)
    wall.tick()
    assert accept(client, bea, ada).status_code == 204
    assert profile(client, ada, bea)["follow"] == "following"
    assert profile(client, ada, bea)["followers"] == 1
    assert profile(client, bea, ada)["following"] == 1
    # Bea does not follow Ada back: that is a request of hers.
    assert profile(client, bea, ada)["follow"] == "none"
    assert names(client, ada, "/me/following") == ["bea.trento"]
    assert names(client, bea, "/me/followers") == ["Ada_runs"]
    assert names(client, bea, "/me/follow-requests") == []
    assert Follows(database, wall).follows(ada.id, bea.id)
    assert not Follows(database, wall).follows(bea.id, ada.id)
    # Asked or accepted again: nothing changes.
    before = rows(database)
    assert before[0]["accepted_at"] == wall.t
    wall.tick()
    assert ask(client, ada, bea).json() == {"follow": "following"}
    assert accept(client, bea, ada).status_code == 204
    assert rows(database) == before


def test_asking_twice_keeps_one_request_and_its_date(
    client: TestClient, database: Database, wall: WallClock, ada: Member, bea: Member
) -> None:
    ask(client, ada, bea)
    first = rows(database)
    wall.tick()
    assert ask(client, ada, bea).json() == {"follow": "requested"}
    assert rows(database) == first
    assert len(first) == 1
    assert first[0]["status"] == "pending" and first[0]["asked_at"] == wall.t - (
        timedelta(seconds=1)
    )


def test_nobody_follows_oneself(
    client: TestClient, database: Database, ada: Member
) -> None:
    answer = client.post(f"/users/{ada.public_id}/follow", headers=ada.headers)
    assert (answer.status_code, code(answer)) == (422, "invalid_request")
    assert message(answer) == NOT_YOURSELF
    assert rows(database) == []
    assert profile(client, ada, ada)["follow"] == "none"
    # Nor in the database itself.
    with pytest.raises(pg_errors.CheckViolation), database.connect() as conn:
        conn.execute(
            "INSERT INTO follows (follower_id, followed_id, status, asked_at)"
            " VALUES (%s, %s, 'pending', now())",
            (ada.id, ada.id),
        )


def test_declining_leaves_no_trace_for_the_one_who_asked(
    client: TestClient, database: Database, ada: Member, bea: Member
) -> None:
    never_asked = profile(client, ada, bea)
    ask(client, ada, bea)
    assert decline(client, bea, ada).status_code == 204
    # Ada sees Bea's profile as before asking, and nothing anywhere says no.
    assert profile(client, ada, bea) == never_asked
    assert never_asked["follow"] == "none"
    assert rows(database) == []
    for path in ("/me/following", "/me/followers", "/me/follow-requests"):
        answer = client.get(path, headers=ada.headers)
        assert answer.json() == {"people": [], "next": None, "total": 0}
    assert names(client, bea, "/me/follow-requests") == []
    # Ada may ask again, and Bea sees it as a new request.
    assert ask(client, ada, bea).json() == {"follow": "requested"}
    assert names(client, bea, "/me/follow-requests") == ["Ada_runs"]


def test_declining_twice_or_nothing_is_done_already(
    client: TestClient, ada: Member, bea: Member
) -> None:
    assert decline(client, bea, ada).status_code == 204
    ask(client, ada, bea)
    accept(client, bea, ada)
    # A follower is not a request: declining leaves it one.
    assert decline(client, bea, ada).status_code == 204
    assert names(client, bea, "/me/followers") == ["Ada_runs"]


def test_accepting_without_a_request_is_404(
    client: TestClient, database: Database, ada: Member, bea: Member
) -> None:
    answer = accept(client, bea, ada)
    assert (answer.status_code, code(answer)) == (404, "http_error")
    assert message(answer) == NO_REQUEST
    # Bea asked Ada: that does not let Ada accept herself into Bea's.
    ask(client, bea, ada)
    answer = accept(client, bea, ada)
    assert (answer.status_code, message(answer)) == (404, NO_REQUEST)
    assert [row["status"] for row in rows(database)] == ["pending"]


def test_two_who_follow_each_other_have_a_request_each(
    client: TestClient, database: Database, ada: Member, bea: Member
) -> None:
    ask(client, ada, bea)
    ask(client, bea, ada)
    accept(client, bea, ada)
    assert profile(client, ada, bea)["follow"] == "following"
    assert profile(client, bea, ada)["follow"] == "requested"
    accept(client, ada, bea)
    assert profile(client, bea, ada)["follow"] == "following"
    seen = profile(client, ada, ada)
    assert (seen["followers"], seen["following"], seen["follow"]) == (1, 1, "none")
    assert len(rows(database)) == 2


# --- Withdrawing, unfollowing, removing ---


def test_withdrawing_a_request_and_unfollowing(
    client: TestClient, ada: Member, bea: Member
) -> None:
    ask(client, ada, bea)
    assert stop(client, ada, bea).status_code == 204
    assert names(client, bea, "/me/follow-requests") == []
    assert profile(client, ada, bea)["follow"] == "none"
    ask(client, ada, bea)
    accept(client, bea, ada)
    assert stop(client, ada, bea).status_code == 204
    assert profile(client, ada, bea)["followers"] == 0
    assert names(client, bea, "/me/followers") == []
    # Nothing left to stop: done already.
    assert stop(client, ada, bea).status_code == 204


def test_removing_a_follower(client: TestClient, ada: Member, bea: Member) -> None:
    ask(client, ada, bea)
    accept(client, bea, ada)
    answer = client.delete(f"/me/followers/{ada.public_id}", headers=bea.headers)
    assert answer.status_code == 204
    assert names(client, bea, "/me/followers") == []
    assert profile(client, ada, bea)["follow"] == "none"
    assert profile(client, ada, ada)["following"] == 0
    again = client.delete(f"/me/followers/{ada.public_id}", headers=bea.headers)
    assert again.status_code == 204


@pytest.mark.parametrize(
    "asked",
    [
        NOBODY,  # nobody's
        "1",  # an internal id is not a profile id
        "Ada_runs",  # nor a username
    ],
)
def test_an_unknown_profile_is_404_everywhere(
    client: TestClient, ada: Member, asked: str
) -> None:
    for method, path in (
        ("POST", f"/users/{asked}/follow"),
        ("DELETE", f"/users/{asked}/follow"),
        ("POST", f"/me/follow-requests/{asked}/accept"),
        ("POST", f"/me/follow-requests/{asked}/decline"),
        ("DELETE", f"/me/followers/{asked}"),
    ):
        answer = client.request(method, path, headers=ada.headers)
        assert (answer.status_code, code(answer)) == (404, "http_error"), path
        assert message(answer) == NO_PROFILE


# --- A deleted account ---


def test_a_deleted_account_leaves_every_list_and_number(
    client: TestClient, database: Database, ada: Member, bea: Member
) -> None:
    cleo = Member(client, "cleo_m")
    # Ada follows Bea; Bea follows Ada; Cleo asks to follow Ada.
    ask(client, ada, bea)
    accept(client, bea, ada)
    ask(client, bea, ada)
    accept(client, ada, bea)
    ask(client, cleo, ada)
    ask(client, ada, cleo)
    assert len(rows(database)) == 4
    assert client.delete("/me", headers=ada.headers).status_code == 204
    assert rows(database) == []
    for who in (bea, cleo):
        for path in ("/me/followers", "/me/following", "/me/follow-requests"):
            answer = client.get(path, headers=who.headers)
            assert answer.json() == {"people": [], "next": None, "total": 0}
        assert found(client, who, "ada") == []
    seen = profile(client, cleo, bea)
    assert (seen["followers"], seen["following"]) == (0, 0)
    gone = client.post(f"/users/{ada.public_id}/follow", headers=bea.headers)
    assert (gone.status_code, message(gone)) == (404, NO_PROFILE)


# --- The pages of a list ---


def test_a_list_comes_in_pages_the_latest_first(
    client: TestClient, wall: WallClock, ada: Member
) -> None:
    others = [Member(client, f"runner{n}") for n in range(5)]
    for other in others:
        wall.tick()
        ask(client, other, ada)
    for other in others[:4]:
        wall.tick()
        accept(client, ada, other)
    first = client.get("/me/followers", params={"limit": 3}, headers=ada.headers)
    page = first.json()
    assert [p["username"] for p in page["people"]] == ["runner3", "runner2", "runner1"]
    assert page["total"] == 4 and page["next"] is not None
    second = client.get(
        "/me/followers",
        params={"limit": 3, "cursor": page["next"]},
        headers=ada.headers,
    ).json()
    assert second == {
        "people": [
            {"public_id": others[0].public_id, "username": "runner0", "photo": None}
        ],
        "next": None,
        "total": 4,
    }
    # The requests are in the order they were asked.
    assert names(client, ada, "/me/follow-requests") == ["runner4"]
    # Each follower sees Ada among the ones it follows.
    assert names(client, others[0], "/me/following") == ["Ada_runs"]


@pytest.mark.parametrize(
    "params", [{"limit": 0}, {"limit": 51}, {"cursor": "12-abc"}, {"cursor": "x"}]
)
def test_a_page_out_of_bounds_is_refused(
    client: TestClient, ada: Member, params: dict[str, Any]
) -> None:
    answer = client.get("/me/followers", params=params, headers=ada.headers)
    assert (answer.status_code, code(answer)) == (422, "invalid_request")


# --- For TASK-208: who may see a drawing for the followers ---


def test_follows_sql_tells_an_accepted_follow_inside_another_query(
    client: TestClient, database: Database, ada: Member, bea: Member
) -> None:
    cleo = Member(client, "cleo_m")
    ask(client, ada, bea)
    accept(client, bea, ada)
    ask(client, cleo, bea)
    with database.connect() as conn:
        seeing = conn.execute(
            "SELECT u.username FROM users u"
            f" WHERE {follows_sql('u.id', '%s')} ORDER BY u.username",
            (bea.id,),
        ).fetchall()
    # Ada follows Bea; Cleo only asked.
    assert [row["username"] for row in seeing] == ["Ada_runs"]


# --- The accounts made before the follows ---


def test_accounts_made_before_the_follows_can_follow(
    database_url: str, tmp_path: Path, wall: WallClock
) -> None:
    database = Database(database_url)
    before = [path for path in migrations() if path.name < FOLLOWS.name]
    assert "0010_favorite_paddling.sql" in [path.name for path in before]
    for path in before:
        shutil.copy(path, tmp_path / path.name)
    database.migrate(tmp_path)
    ada = old_member(database, wall, "Ada_runs")
    bea = old_member(database, wall, "bea.trento")
    # The API of TASK-211 starts: the follows' migration, and nothing else.
    assert database.migrate(MIGRATIONS_DIR) == [
        path.stem for path in migrations() if path.name >= FOLLOWS.name
    ]
    new = api(database, wall)
    seen = profile(new, ada, bea)
    assert (seen["followers"], seen["following"], seen["follow"]) == (0, 0, "none")
    assert ask(new, ada, bea).json() == {"follow": "requested"}
    assert accept(new, bea, ada).status_code == 204
    assert profile(new, ada, bea)["followers"] == 1
