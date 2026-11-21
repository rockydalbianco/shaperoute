"""A stretching session (TASK-475 part A, ADR-0386), in a real PostgreSQL:
saved as a run of stretching without a track, with its routine, and
published without a line."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import psycopg
import pytest
from fastapi.testclient import TestClient
from test_drawings import (
    KEY,
    WallClock,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    drawn,
    other,
    saved,
    signed_up,
    wall,  # noqa: F401
)

from shaperoute_api.activities import RECORD_ACTIVITIES, TRACKLESS_ACTIVITIES
from shaperoute_api.db import Database
from shaperoute_api.reads import READS_HEADER
from shaperoute_api.sports import SPORTS_BY_ACTIVITY
from shaperoute_api.stretch_sessions import StretchSessionRequestBody

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
STRETCH_KEY = "7c6b5a4f3e2d1c0b"
THIS_APP = json.loads((FIXTURES / "reads.json").read_text(encoding="utf-8"))["this_app"]
# The app of before TASK-475: the gym and a pool without a line, no stretching.
BEFORE_APP = ",".join(kind for kind in THIS_APP.split(",") if kind != "stretching")
Headers = dict[str, str]


def session(**changes: Any) -> dict[str, Any]:
    body = json.loads((FIXTURES / "stretch-session.json").read_text(encoding="utf-8"))
    return {**body, **changes}


def reading(headers: Headers, kinds: str = THIS_APP) -> Headers:
    """The app of TASK-475, which reads a stretching session."""
    return {**headers, READS_HEADER: kinds}


@pytest.fixture(autouse=True)
def after_the_session(wall: WallClock) -> None:  # noqa: F811
    # The example session is of the morning of 2026-11-05.
    wall.t = datetime(2026, 11, 5, 8, 0, tzinfo=UTC)


def kept(
    app: TestClient, headers: Headers, key: str = STRETCH_KEY, **changes: Any
) -> Any:
    answer = app.put(
        f"/me/stretch-sessions/{key}", json=session(**changes), headers=headers
    )
    assert answer.status_code == 201, answer.text
    return answer.json()


# --- The sport, without a database ---


def test_stretching_is_a_sport_without_a_track_after_the_gym() -> None:
    sport = SPORTS_BY_ACTIVITY["stretching"]
    assert sport.trackless and not sport.record_only
    assert sport.zones is None and sport.bests is None
    assert TRACKLESS_ACTIVITIES == ("gym", "stretching")
    assert "stretching" not in RECORD_ACTIVITIES


def test_the_example_is_a_request() -> None:
    body = StretchSessionRequestBody.model_validate(session())
    # 11 minutes, a pause of 1: the routine «Morning» of 10 minutes.
    assert body.duration_s() == 600
    assert (body.routine, body.minutes, body.exercises) == ("morning", 10, 10)


@pytest.mark.parametrize("routine", ["morning", "afterRun", "afterGym"])
def test_the_routines_of_the_phone_are_keys(routine: str) -> None:
    StretchSessionRequestBody.model_validate(session(routine=routine))


@pytest.mark.parametrize(
    "changes",
    [
        {"minutes": 0},
        {"minutes": 61},
        {"exercises": -1},
        {"exercises": 101},
        {"routine": ""},
        {"routine": "after run"},
        {"routine": "x" * 41},
        {"pauses": [{"from_s": 600, "to_s": 700}]},
        {"pauses": [{"from_s": 300, "to_s": 200}]},
        {"ended_at": "2026-11-05T06:30:00Z"},
        {"ended_at": "2026-11-05T10:30:01Z"},
        {"hold_s": 30},
    ],
)
def test_a_wrong_session_is_refused(changes: dict[str, Any]) -> None:
    with pytest.raises(ValueError):
        StretchSessionRequestBody.model_validate(session(**changes))


def test_a_session_without_its_routine_is_refused() -> None:
    body = session()
    del body["routine"]
    with pytest.raises(ValueError):
        StretchSessionRequestBody.model_validate(body)


# --- The database ---


def test_a_session_is_saved_once(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    first = kept(client, me)
    assert first == {
        "id": STRETCH_KEY,
        "started_at": "2026-11-05T06:30:00Z",
        "duration_s": 600,
        "routine": "morning",
        "minutes": 10,
        "exercises": 10,
    }
    again = client.put(
        f"/me/stretch-sessions/{STRETCH_KEY}", json=session(minutes=3), headers=me
    )
    assert again.status_code == 200
    assert again.json() == first
    assert client.get(f"/me/stretch-sessions/{STRETCH_KEY}", headers=me).json() == first
    stranger = other(client)
    assert (
        client.get(f"/me/stretch-sessions/{STRETCH_KEY}", headers=stranger).status_code
        == 404
    )


def test_a_session_of_the_future_is_refused(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    answer = client.put(
        f"/me/stretch-sessions/{STRETCH_KEY}",
        # Two days after the server's clock: past CLOCK_AHEAD.
        json=session(
            started_at="2026-11-07T06:30:00Z", ended_at="2026-11-07T06:41:00Z"
        ),
        headers=me,
    )
    assert answer.status_code == 422


def test_the_key_of_a_run_is_not_a_stretching_session(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    answer = client.put(f"/me/stretch-sessions/{KEY}", json=session(), headers=me)
    assert answer.status_code == 409
    assert client.get(f"/me/stretch-sessions/{KEY}", headers=me).status_code == 404


def test_a_session_goes_without_a_track_and_a_run_still_needs_one(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    kept(client, me)
    with database.connect() as conn:
        row = conn.execute(
            "SELECT user_id, activity, track IS NULL AS lineless, distance_m FROM runs"
        ).fetchone()
        assert (row["activity"], row["lineless"], row["distance_m"]) == (
            "stretching",
            True,
            0,
        )
        with pytest.raises(psycopg.errors.CheckViolation):
            conn.execute(
                "INSERT INTO runs (user_id, key, track, started_at, distance_m,"
                " duration_s, created_at, activity) VALUES"
                " (%s, 'abcdefgh12345678', NULL, now(), 0, 60, now(), 'running')",
                (row["user_id"],),
            )


def test_deleting_the_run_deletes_its_routine(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    kept(client, me)
    assert client.delete(f"/me/activities/{STRETCH_KEY}", headers=me).status_code == 204
    with database.connect() as conn:
        count = conn.execute("SELECT count(*) AS n FROM stretch_sessions").fetchone()
        assert count["n"] == 0
    assert (
        client.get(f"/me/stretch-sessions/{STRETCH_KEY}", headers=me).status_code == 404
    )


def test_it_is_in_my_activities_for_an_app_that_reads_it(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    kept(client, me)
    mine = client.get("/me/activities", headers=reading(me))
    assert mine.status_code == 200, mine.text
    assert [a["id"] for a in mine.json()["activities"]] == [STRETCH_KEY]
    # An app of before has none of it.
    before = client.get("/me/activities", headers=reading(me, BEFORE_APP))
    assert before.status_code == 200, before.text
    assert before.json()["activities"] == []


# --- Published without a line ---


def test_it_is_published_without_a_line_with_its_routine(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    kept(client, me)
    drawing_id = str(drawn(client, me, STRETCH_KEY, activity="stretching")["id"])
    with database.connect() as conn:
        row = conn.execute("SELECT track IS NULL AS lineless, trackless FROM drawings")
        assert tuple(row.fetchone().values()) == (True, True)
    seen = client.get(f"/drawings/{drawing_id}", headers=reading(reader))
    assert seen.status_code == 200, seen.text
    assert (seen.json()["activity"], seen.json()["track"]) == ("stretching", [])
    figures = client.get(f"/drawings/{drawing_id}/stretch", headers=reading(reader))
    assert figures.status_code == 200, figures.text
    assert figures.json() == {"routine": "morning", "minutes": 10, "exercises": 10}
    # An app of before, or one that reads the gym but no stretching, has
    # neither.
    for headers in (reader, reading(reader, BEFORE_APP)):
        assert client.get(f"/drawings/{drawing_id}", headers=headers).status_code == 404
        assert (
            client.get(f"/drawings/{drawing_id}/stretch", headers=headers).status_code
            == 404
        )
        feed = client.get("/feed", headers=headers)
        assert feed.status_code == 200, feed.text
        assert feed.json()["posts"] == []
    assert (
        client.get("/drawings/not-an-id/stretch", headers=reading(me)).status_code
        == 404
    )


def test_a_drawing_cannot_change_what_a_session_was(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    kept(client, me)
    # No activity with a track. Between two without one (the gym) the API
    # does not tell them apart (drawings.py, NOT_TRACKLESS): the form to
    # publish keeps a session's own sport (part B).
    for activity in ("running", "swimming"):
        drawn(client, me, STRETCH_KEY, status=422, activity=activity)
    drawn(client, me, STRETCH_KEY, activity="stretching")
    # A run with a track stays one, as before.
    drawn(client, me, KEY, status=422, activity="stretching")


def test_a_private_session_shows_nothing_to_the_others(
    client: TestClient,  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    kept(client, me)
    drawing = drawn(client, me, STRETCH_KEY, visibility="only_me")
    path = f"/drawings/{drawing['id']}/stretch"
    assert client.get(path, headers=reading(reader)).status_code == 404
    assert client.get(path, headers=reading(me)).status_code == 200
