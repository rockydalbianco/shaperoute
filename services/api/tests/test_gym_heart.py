"""The heart rate of a workout at the gym (TASK-385 part G, ADR-0327 punto
7): what a watch wrote in Apple Health while it lasted, its average and
maximum, saved with the workout and shown in its post unless «Show heart
rate» is off; always to its owner."""

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
from shaperoute_api.pool_swims import MAX_HEART_BPM, MIN_HEART_BPM


def with_heart(**changes: Any) -> dict[str, Any]:
    body = json.loads((FIXTURES / "gym-session-heart.json").read_text(encoding="utf-8"))
    return {**body, **changes}


# --- The contract, without a database ---


def test_the_example_is_the_workout_with_its_heart_rate() -> None:
    body = GymSessionRequestBody.model_validate(with_heart())
    assert (body.heart_avg_bpm, body.heart_max_bpm, body.heart_shown) == (
        118,
        164,
        True,
    )
    plain = {k: v for k, v in with_heart().items() if not k.startswith("heart_")}
    assert plain == workout()
    # An app before part G sends none of it, and «Show heart rate» is on.
    before = GymSessionRequestBody.model_validate(workout())
    assert (before.heart_avg_bpm, before.heart_max_bpm) == (None, None)
    assert before.heart_shown is True


@pytest.mark.parametrize(
    "changes",
    [
        # Both or neither.
        {"heart_max_bpm": None},
        {"heart_avg_bpm": None},
        # The average is not above the maximum.
        {"heart_avg_bpm": 170, "heart_max_bpm": 160},
        # Beats a watch can have written.
        {"heart_avg_bpm": MIN_HEART_BPM - 1},
        {"heart_max_bpm": MAX_HEART_BPM + 1},
    ],
)
def test_a_heart_rate_the_watch_cannot_have_written_is_refused(
    changes: dict[str, Any],
) -> None:
    with pytest.raises(ValidationError):
        GymSessionRequestBody.model_validate(with_heart(**changes))


def test_a_workout_written_by_hand_has_no_heart_rate() -> None:
    with pytest.raises(ValidationError, match="no heart rate"):
        GymSessionRequestBody.model_validate(
            by_hand(heart_avg_bpm=120, heart_max_bpm=150)
        )


# --- With the database ---


def test_the_heart_rate_is_saved_with_the_workout(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    path = f"/me/gym-sessions/{GYM_KEY}"
    first = client.put(path, json=with_heart(heart_shown=False), headers=me)
    assert first.status_code == 201, first.text
    saved = first.json()
    assert (saved["heart_avg_bpm"], saved["heart_max_bpm"]) == (118, 164)
    assert saved["heart_shown"] is False
    assert client.get(path, headers=me).json() == saved
    # Sent again, it stays as it was.
    again = client.put(path, json=with_heart(heart_avg_bpm=90), headers=me)
    assert again.status_code == 200
    assert again.json() == saved


def test_a_workout_without_it_answers_none_of_it(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    answer = client.put(f"/me/gym-sessions/{GYM_KEY}", json=workout(), headers=me)
    assert answer.status_code == 201, answer.text
    assert not any(name.startswith("heart_") for name in answer.json())


def heart_post(app: TestClient, headers: dict[str, str], **changes: Any) -> str:
    answer = app.put(
        f"/me/gym-sessions/{GYM_KEY}", json=with_heart(**changes), headers=headers
    )
    assert answer.status_code == 201, answer.text
    return str(drawn(app, headers, GYM_KEY, title="Push day")["id"])


def test_the_post_shows_it_to_whoever_sees_its_exercises(
    client: TestClient,  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    path = f"/drawings/{heart_post(client, me)}/exercises"
    body = client.get(path, headers=reading(reader)).json()
    assert (body["heart_avg_bpm"], body["heart_max_bpm"]) == (118, 164)
    assert "heart_shown" not in body


def test_with_show_heart_rate_off_only_its_owner_sees_it(
    client: TestClient,  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    path = f"/drawings/{heart_post(client, me, heart_shown=False)}/exercises"
    seen = client.get(path, headers=reading(reader))
    assert seen.status_code == 200, seen.text
    assert not any(name.startswith("heart_") for name in seen.json())
    assert seen.json()["sets"] == workout()["sets"]
    own = client.get(path, headers=reading(me)).json()
    assert (own["heart_avg_bpm"], own["heart_max_bpm"]) == (118, 164)
