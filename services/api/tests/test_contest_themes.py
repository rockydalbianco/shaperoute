"""The monthly challenges' theme and pushes (TASK-343, ADR-0296,
docs/CONCORSI.md §15): the bodies and their examples, GET /contests/current
with a theme, `open --theme` and `standings`, the three pushes, each once
and only to whom it is for. A contest without a theme is test_contests.py's,
unchanged."""

from __future__ import annotations

import io
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from test_contests import (
    DURING,
    MINUTE,
    Headers,
    WallClock,
    _load,
    client,  # noqa: F401  (the fixtures of the contest's tests)
    contest,
    database,  # noqa: F401
    expo,  # noqa: F401
    me,
    opened,
    posted,
    pusher,  # noqa: F401
    react,
    signed_up,
    wall,  # noqa: F401
)
from test_push import OTHER_PHONE, PHONE, TABLET, FakeExpo, push_on, put_token

from shaperoute_api.contest_clock import LAST_DAYS, ContestClock
from shaperoute_api.contest_entries import ContestEntriesBody, PastContestsBody
from shaperoute_api.contests import (
    THEME_LANGUAGES,
    ContestBody,
    Contests,
    ThemeBody,
    ThemedContestBody,
    main,
)
from shaperoute_api.db import Database, migrations
from shaperoute_api.push import TEXTS, Pusher, PushEvent, data_of, text_of

THEME: dict[str, Any] = _load("contest-themed.json")["theme"]
CHALLENGE_KINDS = ("contest_open", "contest_last_days", "contest_results")


def themed(database: Database, wall: WallClock, days: int = 30) -> UUID:  # noqa: F811
    """A monthly challenge on «Animals», from now for `days`: its id."""
    start = wall.t
    return (
        Contests(database, wall)
        .open(start, start + timedelta(days=days), ThemeBody.model_validate(THEME))
        .id
    )


def entering(
    client: TestClient, headers: Headers, contest_id: UUID, drawing: str  # noqa: F811
) -> Any:
    return client.put(f"/contests/{contest_id}/entries/{drawing}", headers=headers)


def withdrawing(
    client: TestClient, headers: Headers, contest_id: UUID, drawing: str  # noqa: F811
) -> Any:
    return client.delete(f"/contests/{contest_id}/entries/{drawing}", headers=headers)


def entered(database: Database) -> list[tuple[UUID, UUID]]:  # noqa: F811
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT contest_id, drawing_id FROM contest_entries ORDER BY created_at"
        ).fetchall()
    return [(row["contest_id"], row["drawing_id"]) for row in rows]


def sent(
    expo: FakeExpo, kind: str  # noqa: F811
) -> list[tuple[str, str, dict[str, str]]]:  # noqa: F811
    return [
        (m["to"], m["body"], m["data"]) for m in expo.sent if m["data"]["kind"] == kind
    ]


def command(
    database: Database, wall: WallClock, pusher: Pusher, *argv: str  # noqa: F811
) -> tuple[int, str]:
    out = io.StringIO()
    code = main(list(argv), database=database, pusher=pusher, now=wall, out=out)
    return code, out.getvalue()


def phone(
    client: TestClient, headers: Headers, token: str, language: str  # noqa: F811
) -> None:  # noqa: F811
    assert put_token(client, headers, token, language=language).status_code == 204
    push_on(client, headers)


# --- The contract and the texts, without a database ---


def test_the_examples_are_the_bodies() -> None:
    example = _load("contest-themed.json")
    assert set(example) == set(ThemedContestBody.model_fields)
    body = ThemedContestBody.model_validate(example)
    assert set(THEME) == set(THEME_LANGUAGES)
    assert body.entered is not None and body.mine is not None
    assert body.mine.drawing_id in body.entered
    assert body.entrants >= len(body.top)
    pages = _load("contest-entries.json")
    gallery = ContestEntriesBody.model_validate(pages["gallery"])
    assert [entry.rank for entry in gallery.entries] == [1, 2, 3]
    assert gallery.next == "3"
    past = PastContestsBody.model_validate(pages["archive"])
    assert [c.theme is None for c in past.contests] == [False, True]
    closed_at = [c.closed_at for c in past.contests]
    assert closed_at == sorted(closed_at, reverse=True)
    for one in past.contests:
        assert one.winner.drawing is not None
        assert one.winner.drawing.id == one.top[0].drawing.id
    # Without a theme the contest is still the body of before.
    assert "theme" not in ContestBody.model_fields


def test_the_migration_comes_after_the_contests() -> None:
    names = [path.name for path in migrations()]
    assert "0039_contest_themes.sql" in names
    assert names.index("0039_contest_themes.sql") > names.index("0030_contests.sql")


def test_the_three_pushes_say_the_theme_in_the_five_languages() -> None:
    contest_id = uuid4()
    titles = {language: THEME[language]["title"] for language in THEME_LANGUAGES}
    for kind in CHALLENGE_KINDS:
        assert set(TEXTS[kind]) == set(THEME_LANGUAGES)
        event = PushEvent(kind, 1, 1, key=str(contest_id), contest_id=contest_id, names=titles)  # type: ignore[arg-type]  # noqa: E501
        for language in THEME_LANGUAGES:
            said = text_of(event, "ada", language)
            assert titles[language] in said and "{" not in said and "ada" not in said
        # Touched, the page of the challenge.
        assert data_of(event, uuid4(), "ada") == {
            "kind": kind,
            "contest_id": str(contest_id),
        }
    event = PushEvent("contest_open", 1, 1, contest_id=contest_id, names=titles)
    assert text_of(event, "ada", "en") == (
        "New MuW challenge: “Animals”. Run your drawing and enter it when you publish."
    )
    # A language the theme lacks: in the phone's language, with the English title.
    event = PushEvent(
        "contest_results", 1, 1, contest_id=contest_id, names={"en": "Animals"}
    )
    assert (
        text_of(event, "ada", "it")
        == "La sfida MuW «Animals» è finita: guarda chi ha vinto!"
    )


# --- GET /contests/current ---


def test_the_challenge_says_its_theme_its_entrants_and_what_who_asks_entered(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    ada, bea, cal = (signed_up(client, name) for name in ("ada", "bea", "cal"))
    contest_id = themed(database, wall)
    cat = posted(client, ada, 1, "Cat")
    wall.t += MINUTE
    dog = posted(client, ada, 2, "Dog")
    wall.t += MINUTE
    fish = posted(client, bea, 3, "Fish")
    for who, drawing in ((ada, cat), (ada, dog), (bea, fish)):
        assert entering(client, who, contest_id, drawing).status_code == 204
        wall.t += MINUTE
    react(client, cal, fish)

    seen = contest(client)
    ThemedContestBody.model_validate(seen)
    assert seen["theme"] == THEME
    assert seen["entrants"] == 2
    assert "entered" not in seen and "mine" not in seen
    assert [entry["drawing"]["id"] for entry in seen["top"]] == [fish, cat, dog]
    assert contest(client, ada)["entered"] == [cat, dog]
    assert contest(client, cal)["entered"] == []
    assert contest(client, cal)["mine"] is None


def test_a_contest_without_a_theme_is_answered_as_before(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    opened(database, wall)
    posted(client, ada, 1, "Post")
    for headers in (None, ada):
        seen = contest(client, headers)
        assert {"theme", "entrants", "entered"}.isdisjoint(seen)
        assert set(seen) <= set(ContestBody.model_fields)


# --- The commands ---


def test_open_with_a_theme_checks_it_first_then_tells_whoever_has_the_pushes_on(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
    pusher: Pusher,  # noqa: F811
    expo: FakeExpo,  # noqa: F811
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    ada, bea, cal, dan = (signed_up(client, n) for n in ("ada", "bea", "cal", "dan"))
    phone(client, ada, PHONE, "it")
    phone(client, bea, OTHER_PHONE, "de")
    push_on(client, bea, False)
    push_on(client, cal)  # the pushes on, no phone
    phone(client, dan, TABLET, "en")
    with database.connect() as conn:
        conn.execute(
            "UPDATE users SET hidden_at = now() WHERE id = %s", (me(client, dan)["id"],)
        )
    period = ["--from", "2026-12-01T00:00+01:00", "--to", "2026-12-31T23:59:59+01:00"]

    def opening(theme: Any) -> tuple[int, str]:
        path = tmp_path / "theme.json"
        path.write_text(theme if isinstance(theme, str) else json.dumps(theme))
        return command(database, wall, pusher, "open", *period, "--theme", str(path))

    # Refused before anything is opened: a language missing, too long a
    # title, a field more, not JSON at all.
    without_fr = {k: v for k, v in THEME.items() if k != "fr"}
    assert opening(without_fr) == (2, "")
    assert "has no fr" in capsys.readouterr().err
    assert opening({**THEME, "de": {"title": "T" * 61, "description": "D"}}) == (2, "")
    assert "de.title" in capsys.readouterr().err
    assert opening({**THEME, "pt": THEME["en"]}) == (2, "")
    assert "pt" in capsys.readouterr().err
    assert opening("{not json") == (2, "")
    assert "not a JSON file" in capsys.readouterr().err
    with database.connect() as conn:
        assert conn.execute("SELECT count(*) AS n FROM contests").fetchone()["n"] == 0
    assert expo.sent == []

    code, said = opening(THEME)
    assert code == 0
    first, second = said.splitlines()
    assert first.startswith("contests: opened ")
    assert second == "contests: the theme is «Animals»; 1 account(s) told with a push"
    (contest_id,) = [row for row in _ids(database)]
    assert sent(expo, "contest_open") == [
        (
            PHONE,
            "Nuova sfida MuW: «Animali». Corri il tuo disegno e iscrivilo quando"
            " lo pubblichi.",
            {"kind": "contest_open", "contest_id": str(contest_id)},
        )
    ]
    # The theme as the table keeps it: the five languages.
    with database.connect() as conn:
        kept = conn.execute("SELECT theme FROM contests").fetchone()["theme"]
    assert kept == THEME


def test_open_without_a_theme_tells_nobody(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
    pusher: Pusher,  # noqa: F811
    expo: FakeExpo,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    phone(client, ada, PHONE, "en")
    code, _ = command(
        database,
        wall,
        pusher,
        "open",
        "--from",
        "2026-12-01T00:00+01:00",
        "--to",
        "2026-12-31T23:59:59+01:00",
    )
    assert code == 0 and expo.sent == []


def test_standings_says_the_theme_and_the_entries(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
    pusher: Pusher,  # noqa: F811
) -> None:
    ada, bea = signed_up(client, "ada"), signed_up(client, "bea")
    contest_id = themed(database, wall)
    cat = posted(client, ada, 1, "Cat")
    dog = posted(client, ada, 2, "Dog")
    posted(client, bea, 3, "Not entered")
    for drawing in (cat, dog):
        assert entering(client, ada, contest_id, drawing).status_code == 204
    code, said = command(database, wall, pusher, "standings")
    lines = said.splitlines()
    assert code == 0
    assert lines[0] == (
        "contests: the theme is «Animals»; 2 drawing(s) entered by 1 account(s)"
    )
    assert lines[1] == "contests: the first 10"
    assert len(lines) == 4


# --- The pushes of the last days and of the results ---


def test_the_last_days_are_told_once_to_who_published_and_entered_nothing(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
    pusher: Pusher,  # noqa: F811
    expo: FakeExpo,  # noqa: F811
) -> None:
    ada, bea, cal, dan = (signed_up(client, n) for n in ("ada", "bea", "cal", "dan"))
    for who, token in ((ada, PHONE), (bea, OTHER_PHONE), (cal, TABLET)):
        phone(client, who, token, "en")
    put_token(client, dan, "ExponentPushToken[phone-of-dan]", language="en")
    push_on(client, dan)
    contest_id = themed(database, wall, days=10)
    cat = posted(client, ada, 1, "Cat")  # entered: not told
    assert entering(client, ada, contest_id, cat).status_code == 204
    posted(client, bea, 2, "Not entered")  # published, not entered: told
    posted(client, cal, 3, "Private", visibility="only_me")  # nothing for everyone
    # dan never published: not told.
    clock = ContestClock(database, wall, lambda: pusher)

    wall.t = DURING + timedelta(days=10) - LAST_DAYS - MINUTE
    assert clock.check() == []
    wall.t += 2 * MINUTE
    assert clock.check() == [contest_id]
    assert sent(expo, "contest_last_days") == [
        (
            OTHER_PHONE,
            "3 days left for the MuW challenge “Animals”: publish a run and enter it!",
            {"kind": "contest_last_days", "contest_id": str(contest_id)},
        )
    ]
    # Once: another check, another process, tell nobody.
    wall.t += timedelta(hours=1)
    assert clock.check() == []
    assert ContestClock(database, wall, lambda: pusher).check() == []
    assert len(sent(expo, "contest_last_days")) == 1


def test_a_contest_without_a_theme_has_no_last_days(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
    pusher: Pusher,  # noqa: F811
    expo: FakeExpo,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    phone(client, ada, PHONE, "en")
    opened(database, wall)
    posted(client, ada, 1, "Post")
    clock = ContestClock(database, wall, lambda: pusher)
    wall.t = datetime(2026, 11, 14, 12, 0, tzinfo=wall.t.tzinfo)
    assert clock.check() == []
    assert [m for m in expo.sent if m["data"]["kind"] in CHALLENGE_KINDS] == []


def test_the_results_go_to_who_took_part_and_the_winner_hears_it_won(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
    pusher: Pusher,  # noqa: F811
    expo: FakeExpo,  # noqa: F811
) -> None:
    ada, bea, cal = (signed_up(client, n) for n in ("ada", "bea", "cal"))
    for who, token, language in (
        (ada, PHONE, "fr"),
        (bea, OTHER_PHONE, "es"),
        (cal, TABLET, "de"),
    ):
        phone(client, who, token, language)
    contest_id = themed(database, wall, days=10)
    cat = posted(client, ada, 1, "Cat")
    wall.t += MINUTE
    fish = posted(client, bea, 2, "Fish")
    posted(client, cal, 3, "Not entered")
    for who, drawing in ((ada, cat), (bea, fish)):
        assert entering(client, who, contest_id, drawing).status_code == 204
    react(client, cal, fish)
    wall.t += timedelta(days=10)
    expo.sent.clear()

    code, said = command(database, wall, pusher, "close")
    assert code == 0 and "the winner is bea" in said
    assert sent(expo, "contest_won") == [
        (
            OTHER_PHONE,
            "¡Has ganado el concurso MuW! Tu publicación ha recibido más reacciones"
            " que ninguna otra.",
            {"kind": "contest_won", "drawing_id": fish},
        )
    ]
    assert sent(expo, "contest_results") == [
        (
            PHONE,
            "Le défi MuW « Animaux » est terminé : découvre qui a gagné !",
            {"kind": "contest_results", "contest_id": str(contest_id)},
        )
    ]
    # Run again: nothing is closed, nothing is told.
    assert command(database, wall, pusher, "close")[0] == 1
    assert len(sent(expo, "contest_results")) == 1


def test_the_app_has_the_clock_of_the_last_days(
    client: TestClient,  # noqa: F811
) -> None:  # noqa: F811
    assert isinstance(client.app.state.contest_clock, ContestClock)  # type: ignore[attr-defined]


def _ids(database: Database) -> list[UUID]:  # noqa: F811
    with database.connect() as conn:
        return [row["id"] for row in conn.execute("SELECT id FROM contests")]
