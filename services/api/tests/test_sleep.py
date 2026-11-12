"""The nights of sleep a person publishes (TASK-467 part B1, ADR-0380), in
a real PostgreSQL: kept only while something publishes them, on the profile
only with the owner's yes, in a post unless the owner hides them; to anyone
else a night not shared, or not shown, is as one that is not there."""

from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path
from typing import Any

import psycopg
import pytest
from fastapi.testclient import TestClient
from test_drawings import (
    KEY,
    WallClock,
    api,
    database,  # noqa: F401  (the fixtures of the drawings' tests)
    drawn,
    follows,
    other,
    public_id,
    saved,
    signed_up,
    third,
    wall,  # noqa: F401
)

from shaperoute_api.db import Database
from shaperoute_api.sleep import (
    ActivitySleepBody,
    ActivitySleepRequestBody,
    SleepNightBody,
    SleepNightRequestBody,
    SleepSummaryBody,
)

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
# The example run is of the afternoon of 2026-09-21: its night is the one
# the runner woke up from that morning.
NIGHT = "2026-09-21"
NEXT_NIGHT = "2026-09-22"
EARLIER_NIGHT = "2026-09-20"
OTHER_KEY = "0f1e2d3c4b5a6978"
Headers = dict[str, str]


def example(name: str) -> dict[str, Any]:
    return dict(json.loads((FIXTURES / f"sleep-{name}.json").read_text("utf-8")))


def figures(**changes: Any) -> dict[str, Any]:
    """The example night as the phone sends it, without either switch."""
    body = example("night-request")
    del body["shared"]
    return {**body, **changes}


SUMMARY = example("summary")


@pytest.fixture
def client(database: Database, wall: WallClock) -> TestClient:  # noqa: F811
    return api(database, wall)


def shared(
    app: TestClient, headers: Headers, night: str = NIGHT, **changes: Any
) -> Any:
    answer = app.put(
        f"/me/sleep/{night}", json=figures(shared=True, **changes), headers=headers
    )
    assert answer.status_code == 200, answer.text
    return answer.json()


def attached(
    app: TestClient,
    headers: Headers,
    key: str = KEY,
    night: str = NIGHT,
    **changes: Any,
) -> Any:
    answer = app.put(
        f"/me/activities/{key}/sleep",
        json=figures(night=night, **changes),
        headers=headers,
    )
    assert answer.status_code == 200, answer.text
    return answer.json()


def nights_kept(database: Database) -> list[tuple[str, bool]]:  # noqa: F811
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT night, shared FROM sleep_nights ORDER BY night"
        ).fetchall()
    return [(row["night"].isoformat(), row["shared"]) for row in rows]


# --- The contract, without a database ---


def test_the_examples_are_the_bodies() -> None:
    sent = SleepNightRequestBody.model_validate(example("night-request"))
    assert sent.shared is True
    assert SleepNightRequestBody.model_validate(figures()).shared is None
    with_activity = ActivitySleepRequestBody.model_validate(example("activity-request"))
    # In a post the sleep starts shown (the user's choice of 2026-11-12).
    assert ActivitySleepRequestBody.model_validate(figures(night=NIGHT)).shown is True
    assert with_activity.night.isoformat() == NIGHT
    for body, name in (
        (SleepNightBody, "night"),
        (ActivitySleepBody, "activity"),
        (SleepSummaryBody, "summary"),
        (SleepSummaryBody, "summary-no-stages"),
    ):
        kept = body.model_validate(example(name))
        assert kept.model_dump(mode="json", exclude_none=True) == example(name)


@pytest.mark.parametrize(
    "changes",
    [
        {"score": -1},
        {"score": 101},
        {"score": 82.5},
        {"asleep_min": 0},
        {"asleep_min": 1_441},
        {"awake_min": -1},
        {"awake_min": 1_441},
        {"stages": {"rem_min": 96, "light_min": 268}},
        {"stages": {"rem_min": 96, "light_min": 268, "deep_min": -1}},
        # More in the stages than asleep.
        {"stages": {"rem_min": 96, "light_min": 268, "deep_min": 89}},
        {"stages": {"rem_min": 96, "light_min": 268, "deep_min": 72, "awake_min": 5}},
        # Never the samples, never an hour of going to bed or of waking.
        {"bedtime": "23:10"},
        {"samples": []},
    ],
)
def test_a_wrong_night_is_refused(changes: dict[str, Any]) -> None:
    with pytest.raises(ValueError):
        SleepNightRequestBody.model_validate(figures(**changes))
    with pytest.raises(ValueError):
        ActivitySleepRequestBody.model_validate(figures(night=NIGHT, **changes))


def test_the_stages_may_be_all_of_the_sleep_or_left_out() -> None:
    whole = {"rem_min": 100, "light_min": 280, "deep_min": 72}
    assert SleepNightRequestBody.model_validate(figures(stages=whole)).stages
    body = figures()
    del body["stages"]
    assert SleepNightRequestBody.model_validate(body).stages is None


def test_openapi_says_the_sleep_without_anyone_s_night(
    client: TestClient,
) -> None:
    schema = client.get("/openapi.json").json()
    paths = {path for path in schema["paths"] if path.endswith("/sleep")}
    assert paths == {
        "/users/{public_id}/sleep",
        "/me/activities/{key}/sleep",
        "/drawings/{drawing_id}/sleep",
    }
    assert {"/me/sleep/shared", "/me/sleep/{night}"} <= set(schema["paths"])
    said = json.dumps(
        [schema["paths"][path] for path in schema["paths"] if "/sleep" in path]
        + [
            body
            for name, body in schema["components"]["schemas"].items()
            if "Sleep" in name
        ]
    )
    # No example, so no figure of a night: only the shape.
    assert '"example' not in said
    assert str(SUMMARY["score"]) not in said and str(SUMMARY["asleep_min"]) not in said


# --- The night, and the profile ---


def test_a_night_is_kept_only_while_something_publishes_it(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    # Neither on the profile nor in a post: nothing to keep.
    for body in (figures(), figures(shared=False)):
        answer = client.put(f"/me/sleep/{NIGHT}", json=body, headers=me)
        assert (answer.status_code, answer.content) == (204, b"")
    assert nights_kept(database) == []
    assert client.get(f"/me/sleep/{NIGHT}", headers=me).status_code == 404
    # With the owner's yes it is on the profile.
    assert shared(client, me) == example("night")
    assert client.get(f"/me/sleep/{NIGHT}", headers=me).json() == example("night")
    assert nights_kept(database) == [(NIGHT, True)]
    # It is its owner's: another account has no night of that day.
    stranger = other(client)
    assert client.get(f"/me/sleep/{NIGHT}", headers=stranger).status_code == 404
    gone = client.patch(f"/me/sleep/{NIGHT}", json={"shared": False}, headers=stranger)
    assert gone.status_code == 404
    assert nights_kept(database) == [(NIGHT, True)]
    # The yes taken back, nothing publishes it: it goes.
    off = client.patch(f"/me/sleep/{NIGHT}", json={"shared": False}, headers=me)
    assert (off.status_code, off.content) == (204, b"")
    assert nights_kept(database) == []
    again = client.patch(f"/me/sleep/{NIGHT}", json={"shared": False}, headers=me)
    assert again.status_code == 404


def test_sent_again_the_night_has_the_new_figures_and_its_switch(
    client: TestClient,
) -> None:
    me = signed_up(client)
    shared(client, me)
    # The watch synced later: the phone sends the night again, the switch
    # left out stays as it was.
    again = client.put(
        f"/me/sleep/{NIGHT}", json=figures(score=85, asleep_min=470), headers=me
    )
    assert again.status_code == 200, again.text
    assert again.json() == {**example("night"), "score": 85, "asleep_min": 470}
    # A night no watch told the stages of answers without them.
    plain = figures(shared=True)
    del plain["stages"]
    answer = client.put(f"/me/sleep/{NIGHT}", json=plain, headers=me)
    assert "stages" not in answer.json()
    assert answer.json()["shared"] is True


def test_a_day_that_is_no_night_is_refused(
    client: TestClient, wall: WallClock  # noqa: F811
) -> None:
    me = signed_up(client)
    today = wall.t.date()
    for night, status in (
        # A phone east of the API is a day ahead of it at most.
        ((today + timedelta(days=1)).isoformat(), 200),
        ((today + timedelta(days=2)).isoformat(), 422),
        ("2019-12-31", 422),
        ("last-night", 422),
        ("2026-09-31", 422),
    ):
        answer = client.put(f"/me/sleep/{night}", json=figures(shared=True), headers=me)
        assert answer.status_code == status, night
    answer = client.put(
        f"/me/sleep/{NIGHT}", json=figures(shared=True, score=101), headers=me
    )
    assert answer.status_code == 422


def test_the_profile_shows_the_latest_night_shared(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    mine = public_id(client, me)
    saved(client, me)
    shared(client, me, EARLIER_NIGHT, score=58)
    shared(client, me, NIGHT)
    # A later night, in a post only: not on the profile.
    attached(client, me, night=NEXT_NIGHT, score=91)
    for headers in (me, reader):
        answer = client.get(f"/users/{mine}/sleep", headers=headers)
        assert answer.status_code == 200, answer.text
        assert answer.json() == SUMMARY
    # The latest taken off the profile, the one before shows.
    client.patch(f"/me/sleep/{NIGHT}", json={"shared": False}, headers=me)
    seen = client.get(f"/users/{mine}/sleep", headers=reader).json()
    assert (seen["night"], seen["score"]) == (EARLIER_NIGHT, 58)
    # «Stop sharing»: none shows, and only the night of the post is kept.
    shared(client, me, NIGHT)
    assert client.delete("/me/sleep/shared", headers=me).status_code == 204
    for headers in (me, reader):
        assert client.get(f"/users/{mine}/sleep", headers=headers).status_code == 404
    assert nights_kept(database) == [(NEXT_NIGHT, False)]


def test_a_night_not_shared_is_as_no_night_to_the_others(
    client: TestClient,
) -> None:
    me, reader, nobody = signed_up(client), other(client), third(client)
    saved(client, me)
    drawn(client, me)
    # A night in a post, shown there, was never said yes to for the profile.
    attached(client, me)
    hidden = client.get(f"/users/{public_id(client, me)}/sleep", headers=reader)
    none = client.get(f"/users/{public_id(client, nobody)}/sleep", headers=reader)
    unknown = client.get(
        "/users/00000000-0000-4000-8000-000000000000/sleep", headers=reader
    )
    no_id = client.get("/users/somebody/sleep", headers=reader)
    assert hidden.status_code == 404
    for answer in (none, unknown, no_id):
        assert (answer.status_code, answer.json()) == (404, hidden.json())
    # The owner's own profile says what the others see.
    mine = client.get(f"/users/{public_id(client, me)}/sleep", headers=me)
    assert (mine.status_code, mine.json()) == (404, hidden.json())
    # Nothing else of the profile tells there is a night: no count, no flag.
    profile = client.get(f"/users/{public_id(client, me)}", headers=reader)
    assert "sleep" not in profile.text
    # Nobody reads the nights of another by the day.
    assert client.get(f"/me/sleep/{NIGHT}", headers=reader).status_code == 404


def test_across_a_block_the_night_is_not_there(client: TestClient) -> None:
    me, reader = signed_up(client), other(client)
    mine = public_id(client, me)
    saved(client, me)
    drawing_id = str(drawn(client, me)["id"])
    shared(client, me)
    attached(client, me)
    assert client.get(f"/users/{mine}/sleep", headers=reader).status_code == 200
    assert (
        client.get(f"/drawings/{drawing_id}/sleep", headers=reader).status_code == 200
    )
    blocked = client.put(f"/users/{public_id(client, reader)}/block", headers=me)
    assert blocked.status_code == 204
    assert client.get(f"/users/{mine}/sleep", headers=reader).status_code == 404
    assert (
        client.get(f"/drawings/{drawing_id}/sleep", headers=reader).status_code == 404
    )
    assert client.get(f"/users/{mine}/sleep", headers=me).json() == SUMMARY


# --- The night of an activity, and its post ---


def test_the_post_shows_the_night_before_its_activity(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    saved(client, me)
    drawing_id = str(drawn(client, me)["id"])
    assert client.get(f"/drawings/{drawing_id}/sleep", headers=me).status_code == 404
    kept = client.put(
        f"/me/activities/{KEY}/sleep", json=example("activity-request"), headers=me
    )
    assert kept.status_code == 200, kept.text
    assert kept.json() == example("activity")
    assert client.get(f"/me/activities/{KEY}/sleep", headers=me).json() == kept.json()
    for headers in (me, reader):
        seen = client.get(f"/drawings/{drawing_id}/sleep", headers=headers)
        assert seen.status_code == 200, seen.text
        assert seen.json() == SUMMARY
    # In a post only: not on the profile until its owner says so.
    assert nights_kept(database) == [(NIGHT, False)]
    with database.connect() as conn:
        row = conn.execute("SELECT sleep_shown FROM runs").fetchone()
        assert row["sleep_shown"] is True
    # The activity of another is not one's own to give a night to.
    theirs = client.put(
        f"/me/activities/{KEY}/sleep", json=example("activity-request"), headers=reader
    )
    assert theirs.status_code == 404
    assert client.get(f"/me/activities/{KEY}/sleep", headers=reader).status_code == 404


def test_hidden_only_its_owner_reads_the_night_of_a_post(
    client: TestClient,
) -> None:
    me, reader = signed_up(client), other(client)
    saved(client, me)
    saved(client, me, OTHER_KEY, days_later=1)
    hidden = str(drawn(client, me)["id"])
    without = str(drawn(client, me, OTHER_KEY)["id"])
    assert attached(client, me, shown=False)["shown"] is False
    # To the others it is the post of an activity without a night.
    answer = client.get(f"/drawings/{hidden}/sleep", headers=reader)
    none = client.get(f"/drawings/{without}/sleep", headers=reader)
    unknown = client.get("/drawings/not-a-drawing/sleep", headers=reader)
    assert answer.status_code == 404
    for other_answer in (none, unknown):
        assert (other_answer.status_code, other_answer.json()) == (404, answer.json())
    # Nor do the post, the feed or the profile's drawings tell of it.
    for path in (
        f"/drawings/{hidden}",
        "/feed",
        f"/users/{public_id(client, me)}/drawings",
    ):
        told = client.get(path, headers=reader)
        assert told.status_code == 200, path
        assert "sleep" not in told.text, path
    # Its owner reads it, and the switch.
    assert client.get(f"/drawings/{hidden}/sleep", headers=me).json() == SUMMARY
    mine = client.get(f"/me/activities/{KEY}/sleep", headers=me).json()
    assert mine == {**SUMMARY, "shown": False}
    # The switch alone, without the figures.
    on = client.patch(f"/me/activities/{KEY}/sleep", json={"shown": True}, headers=me)
    assert on.json() == {**SUMMARY, "shown": True}
    assert client.get(f"/drawings/{hidden}/sleep", headers=reader).json() == SUMMARY
    off = client.patch(f"/me/activities/{KEY}/sleep", json={"shown": False}, headers=me)
    assert off.json()["shown"] is False
    assert client.get(f"/drawings/{hidden}/sleep", headers=reader).status_code == 404
    # An activity without a night has no switch to turn.
    no_night = client.patch(
        f"/me/activities/{OTHER_KEY}/sleep", json={"shown": True}, headers=me
    )
    assert no_night.status_code == 404


def test_the_night_is_seen_by_whoever_sees_the_post(client: TestClient) -> None:
    me, follower, stranger = signed_up(client), other(client), third(client)
    saved(client, me)
    drawing_id = str(drawn(client, me, visibility="followers")["id"])
    attached(client, me)
    follows(client, follower, me)
    path = f"/drawings/{drawing_id}/sleep"
    assert client.get(path, headers=follower).json() == SUMMARY
    assert client.get(path, headers=stranger).status_code == 404
    # Shared on the profile it shows there, to the stranger too: the two
    # switches are apart.
    client.patch(f"/me/sleep/{NIGHT}", json={"shared": True}, headers=me)
    assert client.get(path, headers=stranger).status_code == 404
    mine = public_id(client, me)
    assert client.get(f"/users/{mine}/sleep", headers=stranger).json() == SUMMARY


def test_only_the_night_before_the_activity(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    for night, status in (
        ("2026-09-18", 422),
        ("2026-09-19", 200),
        ("2026-09-23", 200),
        ("2026-09-24", 422),
        ("2027-01-01", 422),
    ):
        answer = client.put(
            f"/me/activities/{KEY}/sleep", json=figures(night=night), headers=me
        )
        assert answer.status_code == status, night
    unknown = client.put(
        f"/me/activities/{OTHER_KEY}/sleep", json=figures(night=NIGHT), headers=me
    )
    assert unknown.status_code == 404
    # Given another night, the one before is left by its only activity.
    assert nights_kept(database) == [("2026-09-23", False)]


def test_the_night_goes_with_the_last_activity_that_carried_it(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    saved(client, me, OTHER_KEY, days_later=1)
    attached(client, me, KEY, NEXT_NIGHT)
    attached(client, me, OTHER_KEY, NEXT_NIGHT)
    # Two activities of the day carry the one night.
    assert nights_kept(database) == [(NEXT_NIGHT, False)]
    assert client.delete(f"/me/activities/{KEY}", headers=me).status_code == 204
    assert nights_kept(database) == [(NEXT_NIGHT, False)]
    gone = client.delete(f"/me/activities/{OTHER_KEY}/sleep", headers=me)
    assert gone.status_code == 204
    assert nights_kept(database) == []
    assert (
        client.get(f"/me/activities/{OTHER_KEY}/sleep", headers=me).status_code == 404
    )
    # Taken away twice is taken away.
    again = client.delete(f"/me/activities/{OTHER_KEY}/sleep", headers=me)
    assert again.status_code == 204
    # Deleting the activity deletes the night only it carried...
    attached(client, me, OTHER_KEY, NEXT_NIGHT, shown=False)
    assert client.delete(f"/me/activities/{OTHER_KEY}", headers=me).status_code == 204
    assert nights_kept(database) == []


def test_a_night_on_the_profile_outlives_its_activity(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    shared(client, me)
    # The post's figures are the night's: sent with the activity, they are
    # the profile's too, and its yes stays.
    attached(client, me, score=79)
    assert nights_kept(database) == [(NIGHT, True)]
    assert client.get(f"/me/sleep/{NIGHT}", headers=me).json()["score"] == 79
    assert client.delete(f"/me/activities/{KEY}", headers=me).status_code == 204
    assert nights_kept(database) == [(NIGHT, True)]
    # Off the profile it stays while a post carries it, and goes after.
    saved(client, me, OTHER_KEY, days_later=1)
    attached(client, me, OTHER_KEY)
    off = client.patch(f"/me/sleep/{NIGHT}", json={"shared": False}, headers=me)
    assert off.status_code == 200
    assert off.json() == {**SUMMARY, "shared": False}
    gone = client.delete(f"/me/activities/{OTHER_KEY}/sleep", headers=me)
    assert gone.status_code == 204
    assert nights_kept(database) == []


def test_a_night_forgotten_leaves_its_posts_without_it(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    saved(client, me)
    drawing_id = str(drawn(client, me)["id"])
    shared(client, me)
    attached(client, me, shown=False)
    assert client.delete(f"/me/sleep/{NIGHT}", headers=me).status_code == 204
    assert nights_kept(database) == []
    for headers in (me, reader):
        gone = client.get(f"/drawings/{drawing_id}/sleep", headers=headers)
        assert gone.status_code == 404
        assert client.get(f"/drawings/{drawing_id}", headers=headers).status_code == 200
    mine = public_id(client, me)
    assert client.get(f"/users/{mine}/sleep", headers=reader).status_code == 404
    assert client.get(f"/me/activities/{KEY}/sleep", headers=me).status_code == 404
    assert client.delete(f"/me/sleep/{NIGHT}", headers=me).status_code == 204
    # Given a night again, the activity starts from the switch it is sent.
    assert attached(client, me)["shown"] is True


def test_a_deleted_account_leaves_no_night(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, them = signed_up(client), other(client)
    saved(client, me)
    shared(client, me, EARLIER_NIGHT)
    attached(client, me)
    shared(client, them)
    assert client.delete("/me", headers=me).status_code == 204
    # Only the night of the other account is left.
    assert nights_kept(database) == [(NIGHT, True)]


def test_every_sleep_endpoint_needs_a_token(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    drawing_id = drawn(client, me)["id"]
    shared(client, me)
    attached(client, me)
    for method, path, body in (
        ("GET", f"/me/sleep/{NIGHT}", None),
        ("PUT", f"/me/sleep/{NIGHT}", figures(shared=True)),
        ("PATCH", f"/me/sleep/{NIGHT}", {"shared": False}),
        ("DELETE", f"/me/sleep/{NIGHT}", None),
        ("DELETE", "/me/sleep/shared", None),
        ("GET", f"/users/{public_id(client, me)}/sleep", None),
        ("GET", f"/me/activities/{KEY}/sleep", None),
        ("PUT", f"/me/activities/{KEY}/sleep", figures(night=NIGHT)),
        ("PATCH", f"/me/activities/{KEY}/sleep", {"shown": False}),
        ("DELETE", f"/me/activities/{KEY}/sleep", None),
        ("GET", f"/drawings/{drawing_id}/sleep", None),
    ):
        answer = client.request(method, path, json=body)
        assert answer.status_code == 401, path
    # Nothing changed without one.
    assert client.get(f"/me/sleep/{NIGHT}", headers=me).json() == example("night")
    assert client.get(f"/me/activities/{KEY}/sleep", headers=me).json()["shown"] is True


# --- The database's own limits ---


def test_the_database_starts_a_night_unshared_and_a_post_shown(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    with database.connect() as conn:
        user = conn.execute("SELECT id FROM users").fetchone()
        night = conn.execute(
            "INSERT INTO sleep_nights (user_id, night, score, asleep_min, awake_min,"
            " saved_at) VALUES (%s, %s, 70, 420, 20, now()) RETURNING shared",
            (user["id"], NIGHT),
        ).fetchone()
        assert night["shared"] is False
        run = conn.execute("SELECT sleep_night_id, sleep_shown FROM runs").fetchone()
        assert (run["sleep_night_id"], run["sleep_shown"]) == (None, True)


@pytest.mark.parametrize(
    "columns",
    [
        {"score": 101},
        {"score": -1},
        {"asleep_min": 0},
        {"asleep_min": 1_441},
        {"awake_min": -1},
        {"rem_min": 90},
        {"rem_min": 90, "light_min": 250},
        {"rem_min": 90, "light_min": 250, "deep_min": -1},
        {"rem_min": 90, "light_min": 250, "deep_min": 81},
    ],
)
def test_the_database_refuses_a_wrong_night(
    client: TestClient, database: Database, columns: dict[str, int]  # noqa: F811
) -> None:
    signed_up(client)
    row = {"score": 70, "asleep_min": 420, "awake_min": 20, **columns}
    names = ", ".join(row)
    marks = ", ".join(["%s"] * len(row))
    with database.connect() as conn:
        user = conn.execute("SELECT id FROM users").fetchone()
        with pytest.raises(psycopg.errors.CheckViolation):
            conn.execute(
                f"INSERT INTO sleep_nights (user_id, night, saved_at, {names})"
                f" VALUES (%s, %s, now(), {marks})",
                (user["id"], NIGHT, *row.values()),
            )


def test_one_night_a_day_for_an_account(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, them = signed_up(client), other(client)
    shared(client, me)
    shared(client, them)
    assert nights_kept(database) == [(NIGHT, True), (NIGHT, True)]
    with database.connect() as conn:
        user = conn.execute("SELECT id FROM users LIMIT 1").fetchone()
        with pytest.raises(psycopg.errors.UniqueViolation):
            conn.execute(
                "INSERT INTO sleep_nights (user_id, night, score, asleep_min,"
                " awake_min, saved_at) VALUES (%s, %s, 70, 420, 20, now())",
                (user["id"], NIGHT),
            )
