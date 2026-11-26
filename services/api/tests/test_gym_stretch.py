"""The stretching at the end of a workout at the gym (TASK-466 part C,
ADR-0378): «Remember to stretch», then «After gym», kept inside the workout
(the user's choice, «Dentro l'allenamento»), shown in its post with the
exercises. A workout without it answers exactly as before."""

from __future__ import annotations

import json
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from test_drawings import (
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    drawn,
    other,
    signed_up,
    wall,  # noqa: F401
)
from test_gym import (
    FIXTURES,
    GYM_KEY,
    after_the_workout,  # noqa: F401
    by_hand,
    reading,
    workout,
)

from shaperoute_api.gym_sessions import GymSessionRequestBody

STRETCH = {"routine": "afterGym", "minutes": 5, "duration_s": 312, "exercises": 6}
# What a workout answered before part C: no field more, none less.
SESSION_KEYS = {
    "id",
    "started_at",
    "duration_s",
    "rests",
    "rest_s",
    "show_exercises",
    "sets",
    "source",
}
EXERCISES_KEYS = {"rests", "rest_s", "sets", "new_levels"}


def with_stretch(**changes: Any) -> dict[str, Any]:
    body = json.loads(
        (FIXTURES / "gym-session-stretch.json").read_text(encoding="utf-8")
    )
    return {**body, **changes}


# --- The contract, without a database ---


def test_the_example_is_the_workout_with_its_stretching() -> None:
    body = GymSessionRequestBody.model_validate(with_stretch())
    assert body.stretch is not None
    assert body.stretch.model_dump() == STRETCH
    plain = {k: v for k, v in with_stretch().items() if k != "stretch"}
    assert plain == workout()
    # An app before part C sends none of it.
    assert GymSessionRequestBody.model_validate(workout()).stretch is None


@pytest.mark.parametrize(
    "changes",
    [
        {"routine": "after gym!"},
        {"minutes": 0},
        {"minutes": 61},
        {"duration_s": 0},
        {"duration_s": 4 * 3600 + 1},
        {"exercises": -1},
        {"exercises": 101},
        {"extra": 1},
    ],
)
def test_stretching_a_phone_cannot_have_recorded_is_refused(
    changes: dict[str, Any],
) -> None:
    with pytest.raises(ValidationError):
        GymSessionRequestBody.model_validate(
            with_stretch(stretch={**STRETCH, **changes})
        )


def test_a_workout_written_by_hand_has_no_stretching() -> None:
    with pytest.raises(ValidationError, match="no stretching"):
        GymSessionRequestBody.model_validate(by_hand(stretch=STRETCH))


# --- With the database ---


def test_the_stretching_is_saved_with_the_workout(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    path = f"/me/gym-sessions/{GYM_KEY}"
    first = client.put(path, json=with_stretch(), headers=me)
    assert first.status_code == 201, first.text
    saved = first.json()
    assert saved["stretch"] == STRETCH
    assert client.get(path, headers=me).json() == saved
    # Sent again, it stays as it was.
    again = client.put(
        path, json=with_stretch(stretch={**STRETCH, "minutes": 10}), headers=me
    )
    assert again.status_code == 200
    assert again.json() == saved


def test_a_workout_without_it_answers_exactly_as_before(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    path = f"/me/gym-sessions/{GYM_KEY}"
    put = client.put(path, json=workout(), headers=me)
    assert put.status_code == 201, put.text
    get = client.get(path, headers=me)
    for answer in (put, get):
        assert b"stretch" not in answer.content
        assert set(answer.json()) == SESSION_KEYS
    drawing = str(drawn(client, me, GYM_KEY, title="Push day")["id"])
    seen = client.get(f"/drawings/{drawing}/exercises", headers=reading(me))
    assert seen.status_code == 200, seen.text
    assert b"stretch" not in seen.content
    assert set(seen.json()) == EXERCISES_KEYS


def stretch_post(app: TestClient, headers: dict[str, str], **changes: Any) -> str:
    answer = app.put(
        f"/me/gym-sessions/{GYM_KEY}", json=with_stretch(**changes), headers=headers
    )
    assert answer.status_code == 201, answer.text
    return str(drawn(app, headers, GYM_KEY, title="Push day")["id"])


def test_the_post_shows_it_with_the_exercises(
    client: TestClient,  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    path = f"/drawings/{stretch_post(client, me)}/exercises"
    seen = client.get(path, headers=reading(reader))
    assert seen.status_code == 200, seen.text
    assert seen.json()["stretch"] == STRETCH


def test_with_the_exercises_hidden_only_its_owner_sees_it(
    client: TestClient,  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    path = f"/drawings/{stretch_post(client, me, show_exercises=False)}/exercises"
    assert client.get(path, headers=reading(reader)).status_code == 404
    own = client.get(path, headers=reading(me))
    assert own.status_code == 200, own.text
    assert own.json()["stretch"] == STRETCH


def test_deleting_the_workout_deletes_its_stretching(
    client: TestClient,  # noqa: F811
    database: Any,  # noqa: F811
) -> None:
    me = signed_up(client)
    assert (
        client.put(
            f"/me/gym-sessions/{GYM_KEY}", json=with_stretch(), headers=me
        ).status_code
        == 201
    )
    with database.connect() as conn:
        assert (
            conn.execute("SELECT count(*) AS n FROM gym_stretches").fetchone()["n"] == 1
        )
    deleted = client.delete(f"/me/activities/{GYM_KEY}", headers=me)
    assert deleted.status_code == 204, deleted.text
    with database.connect() as conn:
        assert (
            conn.execute("SELECT count(*) AS n FROM gym_stretches").fetchone()["n"] == 0
        )
