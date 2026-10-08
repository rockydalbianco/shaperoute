"""The email and the phone number of an account in a real PostgreSQL
(TASK-183, ADR-0150): the email changed with the password, the phone number
kept in E.164 and told to its owner only, and the accounts made before still
working."""

from __future__ import annotations

import json
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.accounts import (
    MAX_FAILED_SIGN_INS,
    AccountError,
    Accounts,
    token_hash,
)
from shaperoute_api.app import create_app
from shaperoute_api.contact import (
    EMAIL_IN_USE,
    PHONE_RULE,
    WRONG_PASSWORD,
    ChangeEmailRequestBody,
    ChangePhoneRequestBody,
    checked_phone,
)
from shaperoute_api.db import MIGRATIONS_DIR, Database, migrations

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
# Cheap parameters: every test signs up.
FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)
# The migration of the phone number, whatever its number when merged.
(CONTACT,) = [path for path in migrations() if path.name.endswith("_contact.sql")]
EMAIL = "runner@example.com"
OTHER_EMAIL = "other@example.com"
PASSWORD = "correct horse battery"
PHONE = "+393331234567"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class WallClock:
    def __init__(self) -> None:
        self.t = datetime(2026, 10, 5, 10, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.t


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


def signed_up(client: TestClient, **changes: Any) -> dict[str, str]:
    """A new account, as the header its requests carry."""
    body = {**_load("sign-up-request.json"), **changes}
    answer = client.post("/accounts", json=body)
    assert answer.status_code == 201
    return {"Authorization": f"Bearer {answer.json()['token']}"}


def other(client: TestClient) -> dict[str, str]:
    return signed_up(client, email=OTHER_EMAIL, username="other_runner")


def me(client: TestClient, headers: dict[str, str]) -> dict[str, Any]:
    answer = client.get("/me", headers=headers)
    assert answer.status_code == 200
    return dict(answer.json())


def code(answer: Any) -> str:
    return str(answer.json()["error"]["code"])


def message(answer: Any) -> str:
    return str(answer.json()["error"]["message"])


def signs_in(client: TestClient, email: str, password: str = PASSWORD) -> int:
    answer = client.post("/session", json={"email": email, "password": password})
    return int(answer.status_code)


# --- The contract and the rules, without a database ---


def test_the_examples_of_shared_types_are_the_contract() -> None:
    email = _load("change-email-request.json")
    assert set(email) == set(ChangeEmailRequestBody.model_fields)
    ChangeEmailRequestBody.model_validate(email)
    # The password of the sign-up example: the two tell one story.
    assert email["password"] == _load("sign-up-request.json")["password"]
    phone = _load("change-phone-request.json")
    assert set(phone) == set(ChangePhoneRequestBody.model_fields)
    body = ChangePhoneRequestBody.model_validate(phone)
    assert checked_phone(body.phone) == PHONE
    assert _load("session.json")["user"]["phone"] is None


def test_the_migration_comes_after_the_reactions() -> None:
    names = [path.name for path in migrations()]
    assert names.index(CONTACT.name) > names.index("0015_reactions.sql")


@pytest.mark.parametrize(
    "written",
    [
        "+393331234567",
        "+39 333 123 4567",
        "+39 333-123-4567",
        "+39 (333) 123.4567",
        "0039 333 1234567",
        "  +39 333 123 4567  ",
        "+39/333/1234567",
    ],
)
def test_a_number_is_kept_in_one_way_however_it_is_written(written: str) -> None:
    assert checked_phone(written) == PHONE


def test_the_shortest_and_the_longest_numbers_are_kept() -> None:
    assert checked_phone("+12345678") == "+12345678"
    assert checked_phone("+123456789012345") == "+123456789012345"


@pytest.mark.parametrize("nothing", [None, "", "   "])
def test_nothing_written_is_no_number(nothing: str | None) -> None:
    assert checked_phone(nothing) is None


@pytest.mark.parametrize(
    "written",
    [
        "333 123 4567",  # no country code
        "+0393331234567",  # a country code does not start with 0
        "+1234567",  # 7 digits
        "+1234567890123456",  # 16 digits
        "+39 333 12E 4567",
        "+39 333 123 4567 ext 2",
        "++393331234567",
        "+",
        "call me",
    ],
)
def test_a_number_out_of_the_rule_is_refused_in_words(written: str) -> None:
    with pytest.raises(AccountError, match="country code") as refused:
        checked_phone(written)
    assert (refused.value.status, refused.value.code) == (422, "invalid_request")
    assert refused.value.message == PHONE_RULE


# --- Who may ask ---


def test_both_endpoints_need_an_account(client: TestClient) -> None:
    for path, body in (
        ("/me/email", _load("change-email-request.json")),
        ("/me/phone", _load("change-phone-request.json")),
    ):
        answer = client.put(path, json=body)
        assert (answer.status_code, code(answer)) == (401, "not_signed_in")
        wrong = {"Authorization": "Bearer not-a-token"}
        answer = client.put(path, json=body, headers=wrong)
        assert (answer.status_code, code(answer)) == (401, "not_signed_in")


def test_without_a_database_they_are_unavailable() -> None:
    client = TestClient(create_app(FileSource(Path("unused.graphml"))))
    headers = {"Authorization": "Bearer any"}
    for path, body in (
        ("/me/email", _load("change-email-request.json")),
        ("/me/phone", _load("change-phone-request.json")),
    ):
        answer = client.put(path, json=body, headers=headers)
        assert (answer.status_code, code(answer)) == (503, "accounts_unavailable")


# --- PUT /me/email ---


def test_the_email_changes_with_the_password_and_signs_in_from_then_on(
    client: TestClient,
) -> None:
    headers = signed_up(client)
    request = _load("change-email-request.json")
    answer = client.put("/me/email", json=request, headers=headers)
    assert answer.status_code == 200
    # The answer is the account as it is now, as GET /me gives it.
    assert answer.json() == me(client, headers)
    assert answer.json()["email"] == request["email"]
    # This phone stays signed in; the new address opens the account, the old
    # one no longer does.
    assert signs_in(client, request["email"]) == 200
    assert signs_in(client, EMAIL) == 401


def test_the_new_email_is_kept_in_lower_case_without_spaces(
    client: TestClient,
) -> None:
    headers = signed_up(client)
    body = {"email": "  Runner.NEW@Example.com ", "password": PASSWORD}
    answer = client.put("/me/email", json=body, headers=headers)
    assert answer.status_code == 200
    assert answer.json()["email"] == "runner.new@example.com"


def test_a_wrong_password_changes_nothing(client: TestClient) -> None:
    headers = signed_up(client)
    body = {"email": "runner.new@example.com", "password": "not the password"}
    answer = client.put("/me/email", json=body, headers=headers)
    assert (answer.status_code, code(answer)) == (403, "wrong_credentials")
    assert message(answer) == WRONG_PASSWORD
    assert me(client, headers)["email"] == EMAIL
    # Still signed in: a wrong password is not a session that ended.
    assert signs_in(client, EMAIL) == 200


def test_wrong_passwords_are_counted_with_those_of_signing_in(
    client: TestClient,
) -> None:
    headers = signed_up(client)
    wrong = {"email": "runner.new@example.com", "password": "not the password"}
    for _ in range(MAX_FAILED_SIGN_INS):
        assert client.put("/me/email", json=wrong, headers=headers).status_code == 403
    # Even the right one waits now, here and when signing in.
    right = {**wrong, "password": PASSWORD}
    answer = client.put("/me/email", json=right, headers=headers)
    assert (answer.status_code, code(answer)) == (429, "too_many_requests")
    assert int(answer.headers["Retry-After"]) > 0
    assert signs_in(client, EMAIL) == 429
    assert me(client, headers)["email"] == EMAIL


def test_the_email_of_another_account_is_refused(client: TestClient) -> None:
    headers = signed_up(client)
    other(client)
    body = {"email": OTHER_EMAIL.upper(), "password": PASSWORD}
    answer = client.put("/me/email", json=body, headers=headers)
    assert (answer.status_code, code(answer)) == (409, "email_taken")
    assert message(answer) == EMAIL_IN_USE
    assert me(client, headers)["email"] == EMAIL


def test_ones_own_email_again_is_no_change(client: TestClient) -> None:
    headers = signed_up(client)
    body = {"email": EMAIL, "password": PASSWORD}
    answer = client.put("/me/email", json=body, headers=headers)
    assert answer.status_code == 200
    assert answer.json()["email"] == EMAIL


@pytest.mark.parametrize(
    "body",
    [
        {"email": "not an email", "password": PASSWORD},
        {"email": "runner.new@example.com"},
        {"password": PASSWORD},
        {"email": "runner.new@example.com", "password": PASSWORD, "role": "admin"},
        {"email": f"{'a' * 250}@example.com", "password": PASSWORD},
    ],
)
def test_a_request_out_of_the_contract_is_refused(
    client: TestClient, body: dict[str, Any]
) -> None:
    headers = signed_up(client)
    answer = client.put("/me/email", json=body, headers=headers)
    assert (answer.status_code, code(answer)) == (422, "invalid_request")
    assert me(client, headers)["email"] == EMAIL


def test_the_password_is_never_in_an_answer(client: TestClient) -> None:
    headers = signed_up(client)
    request = _load("change-email-request.json")
    answer = client.put("/me/email", json=request, headers=headers)
    assert PASSWORD not in answer.text
    assert "password" not in answer.json()


# --- PUT /me/phone ---


def test_a_new_account_has_no_phone_number(client: TestClient) -> None:
    assert me(client, signed_up(client))["phone"] is None


def test_a_number_is_kept_changed_and_taken_away(client: TestClient) -> None:
    headers = signed_up(client)
    answer = client.put(
        "/me/phone", json=_load("change-phone-request.json"), headers=headers
    )
    assert answer.status_code == 200
    assert answer.json()["phone"] == PHONE
    assert answer.json() == me(client, headers)
    # Another one takes its place.
    answer = client.put(
        "/me/phone", json={"phone": "+44 20 7946 0958"}, headers=headers
    )
    assert answer.json()["phone"] == "+442079460958"
    # null, or nothing written, takes it away.
    answer = client.put("/me/phone", json={"phone": None}, headers=headers)
    assert answer.status_code == 200
    assert me(client, headers)["phone"] is None
    client.put("/me/phone", json={"phone": PHONE}, headers=headers)
    answer = client.put("/me/phone", json={"phone": "  "}, headers=headers)
    assert answer.status_code == 200
    assert me(client, headers)["phone"] is None


def test_a_number_refused_is_told_in_words_and_nothing_changes(
    client: TestClient,
) -> None:
    headers = signed_up(client)
    client.put("/me/phone", json={"phone": PHONE}, headers=headers)
    answer = client.put("/me/phone", json={"phone": "333 123 4567"}, headers=headers)
    assert (answer.status_code, code(answer)) == (422, "invalid_request")
    assert message(answer) == PHONE_RULE
    assert me(client, headers)["phone"] == PHONE


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"phone": 393331234567},
        {"phone": PHONE, "email": OTHER_EMAIL},
        {"phone": "+" + "1" * 60},
    ],
)
def test_a_phone_request_out_of_the_contract_is_refused(
    client: TestClient, body: dict[str, Any]
) -> None:
    headers = signed_up(client)
    answer = client.put("/me/phone", json=body, headers=headers)
    assert (answer.status_code, code(answer)) == (422, "invalid_request")
    assert me(client, headers)["phone"] is None


def test_two_accounts_may_keep_the_same_number(client: TestClient) -> None:
    # Nobody proved a number is theirs: the second is not told the first has it.
    mine, theirs = signed_up(client), other(client)
    for headers in (mine, theirs):
        answer = client.put("/me/phone", json={"phone": PHONE}, headers=headers)
        assert answer.status_code == 200
    assert me(client, mine)["phone"] == me(client, theirs)["phone"] == PHONE


def test_the_others_never_see_the_number(client: TestClient) -> None:
    mine, theirs = signed_up(client), other(client)
    client.put("/me/phone", json={"phone": PHONE}, headers=mine)
    public_id = me(client, mine)["public_id"]
    profile = client.get(f"/users/{public_id}", headers=theirs)
    assert profile.status_code == 200
    assert "phone" not in profile.json()
    found = client.get("/users", params={"q": "Runner"}, headers=theirs)
    assert found.status_code == 200
    for seen in (profile, found):
        assert PHONE not in seen.text
        assert PHONE.lstrip("+") not in seen.text


def test_the_number_goes_with_the_account(
    client: TestClient, database: Database
) -> None:
    headers = signed_up(client)
    client.put("/me/phone", json={"phone": PHONE}, headers=headers)
    assert client.delete("/me", headers=headers).status_code == 204
    with database.connect() as conn:
        left = conn.execute("SELECT count(*) AS n FROM users").fetchone()
    assert left is not None and left["n"] == 0


# --- The accounts made before the phone number ---


def test_accounts_made_before_the_phone_number_keep_working(
    database_url: str, tmp_path: Path, wall: WallClock
) -> None:
    database = Database(database_url)
    before = [path for path in migrations() if path.name < CONTACT.name]
    assert "0015_reactions.sql" in [path.name for path in before]
    for path in before:
        shutil.copy(path, tmp_path / path.name)
    database.migrate(tmp_path)
    # As the API of before wrote it: an account and a phone's session.
    token = "token-of-before"
    with database.connect() as conn:
        conn.execute(
            "WITH made AS (INSERT INTO users"
            " (email, password_hash, username, confirmed_16_at, created_at)"
            " VALUES (%s, %s, %s, %s, %s) RETURNING id)"
            " INSERT INTO sessions (token_hash, user_id, created_at, last_used_at)"
            " SELECT %s, id, %s, %s FROM made",
            (
                EMAIL,
                FAST_HASHER.hash(PASSWORD),
                "Runner_42",
                wall.t,
                wall.t,
                token_hash(token),
                wall.t,
                wall.t,
            ),
        )
    headers = {"Authorization": f"Bearer {token}"}

    # The API of TASK-183 starts: the phone's migration, and nothing else.
    assert database.migrate(MIGRATIONS_DIR) == [
        path.stem for path in migrations() if path.name >= CONTACT.name
    ]
    new = api(database, wall)
    # The session of before still opens, without a number; both changes work.
    assert me(new, headers)["phone"] is None
    assert (
        new.put("/me/phone", json={"phone": PHONE}, headers=headers).status_code == 200
    )
    changed = new.put(
        "/me/email", json=_load("change-email-request.json"), headers=headers
    )
    assert changed.status_code == 200
    assert changed.json()["phone"] == PHONE
