"""SHAPEROUTE_EMAIL_ROUNDS: the two daily rounds of emails to the members
start only when named (TASK-515, ADR-0410); the emails of the accounts need
no name."""

from __future__ import annotations

from typing import Any

import pytest

from shaperoute_api import __main__ as entry
from shaperoute_api.away_email import (
    DOMAIN_VARIABLE,
    KEY_VARIABLE,
    SECRET_VARIABLE,
    AwaySetup,
)
from shaperoute_api.email_rounds import (
    ROUNDS,
    VARIABLE,
    RoundsConfigError,
    off_line,
    only_named,
    rounds_from_env,
)
from shaperoute_api.notice_email import NoticeSetup

# What turns the emails on, without a round named.
EMAILS_ON = {
    KEY_VARIABLE: "re_test_key",
    SECRET_VARIABLE: "s" * 64,
    DOMAIN_VARIABLE: "api.example.test",
}


def test_no_round_when_the_variable_is_missing_or_empty() -> None:
    assert rounds_from_env({}) == frozenset()
    assert rounds_from_env({VARIABLE: ""}) == frozenset()
    assert rounds_from_env({VARIABLE: " , "}) == frozenset()


def test_the_three_variables_of_resend_alone_name_no_round() -> None:
    assert rounds_from_env(EMAILS_ON) == frozenset()


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("away", {"away"}),
        ("notices", {"notices"}),
        ("away,notices", {"away", "notices"}),
        (" Notices , AWAY ", {"away", "notices"}),
        ("away,away,", {"away"}),
    ],
)
def test_rounds_named(text: str, expected: set[str]) -> None:
    assert rounds_from_env({VARIABLE: text}) == expected


@pytest.mark.parametrize("text", ["on", "away,notice", "all", "away;notices", "1"])
def test_a_name_that_is_not_a_round_is_an_error(text: str) -> None:
    with pytest.raises(RoundsConfigError) as raised:
        rounds_from_env({VARIABLE: text})
    message = str(raised.value)
    assert VARIABLE in message
    for name in ROUNDS:
        assert name in message


def test_a_round_not_named_has_no_setup_and_the_accounts_keep_theirs() -> None:
    away_setup = AwaySetup.from_env(EMAILS_ON)
    notice_setup = NoticeSetup.from_env(EMAILS_ON)
    assert away_setup is not None
    assert notice_setup is not None
    rounds = rounds_from_env(EMAILS_ON)
    assert only_named("away", rounds, away_setup) is None
    assert only_named("notices", rounds, notice_setup) is None
    # account_email.py is given the setup itself: Resend and the links.
    assert away_setup.resend.key == "re_test_key"


def test_each_round_is_named_on_its_own() -> None:
    away_setup = AwaySetup.from_env(EMAILS_ON)
    notice_setup = NoticeSetup.from_env(EMAILS_ON)
    only_away = rounds_from_env({VARIABLE: "away"})
    assert only_named("away", only_away, away_setup) is away_setup
    assert only_named("notices", only_away, notice_setup) is None
    only_notices = rounds_from_env({VARIABLE: "notices"})
    assert only_named("away", only_notices, away_setup) is None
    assert only_named("notices", only_notices, notice_setup) is notice_setup


def test_a_round_named_without_the_emails_stays_off() -> None:
    rounds = rounds_from_env({VARIABLE: "away,notices"})
    assert only_named("away", rounds, AwaySetup.from_env({})) is None
    assert only_named("notices", rounds, NoticeSetup.from_env({})) is None


def test_the_line_of_a_round_off_says_how_to_turn_it_on() -> None:
    line = off_line("away", "Email to who is away")
    assert line == f"Email to who is away: off ({VARIABLE} does not name away)"


@pytest.fixture
def served(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    calls: dict[str, Any] = {}

    def run(app: object, host: str, port: int) -> None:
        calls.update(host=host, port=port)

    monkeypatch.setattr(entry.uvicorn, "run", run)
    return calls


def test_the_api_does_not_start_with_a_wrong_round(
    served: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv(VARIABLE, "away,everyone")
    with pytest.raises(SystemExit) as stopped:
        entry.main([])
    assert VARIABLE in str(stopped.value)
    assert "everyone" in str(stopped.value)
    assert served == {}


def test_the_api_starts_with_the_rounds_named(
    served: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv(VARIABLE, "away, notices")
    entry.main([])
    assert served == {"host": "127.0.0.1", "port": 8000}
