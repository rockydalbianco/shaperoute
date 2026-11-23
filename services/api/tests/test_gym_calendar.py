"""The calendar of one's own workouts at the gym (TASK-411 B, ADR-0341 point
2), in a real PostgreSQL: the days of a month on the phone's time zone with
their workouts, the month's count and time, the last workout of all; only
the owner's, and only the gym's."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient
from test_drawings import (
    WallClock,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    drawn,
    other,
    signed_up,
    wall,  # noqa: F401
)
from test_gym import kept

from shaperoute_api.gym_calendar import GymCalendarBody, known_zone

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
KEYS = iter(f"ca{n:014x}" for n in range(1, 10_000))


def trained(
    app: TestClient, headers: Headers, started: datetime, minutes: int = 60
) -> str:
    """A workout of one plank begun at `started`: its key."""
    key = next(KEYS)
    kept(
        app,
        headers,
        key,
        started_at=started.isoformat(),
        ended_at=(started + timedelta(minutes=minutes)).isoformat(),
        pauses=[],
        sets=[
            {
                "exercise": "plank",
                "kind": "timed",
                "duration_s": 60,
                "at_s": 120,
                "live": True,
            }
        ],
    )
    return key


def calendar(app: TestClient, headers: Headers, **query: str) -> Any:
    answer = app.get(
        "/me/gym-calendar", params={"tz": "Europe/Rome", **query}, headers=headers
    )
    assert answer.status_code == 200, answer.text
    return answer.json()


def days_of(answer: Any) -> dict[int, list[str]]:
    return {
        day["day"]: [workout["id"] for workout in day["workouts"]]
        for day in answer["days"]
    }


# --- The contract, without a database ---


def test_the_example_is_the_contract() -> None:
    example = json.loads((FIXTURES / "gym-calendar.json").read_text(encoding="utf-8"))
    body = GymCalendarBody.model_validate(example)
    workouts = [workout for day in body.days for workout in day.workouts]
    assert body.count == len(workouts)
    assert body.duration_s == sum(workout.duration_s for workout in workouts)


def test_a_time_zone_is_one_of_the_iana_database() -> None:
    assert known_zone("Europe/Rome")
    assert known_zone("America/New_York")
    assert not known_zone("Mars/Olympus")
    assert not known_zone("../etc")


# --- In the database ---


def test_the_month_s_days_on_the_phone_s_time_zone(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    wall.t = datetime(2026, 11, 20, 12, tzinfo=UTC)
    # 23:30 in Rome on 31 October is 22:30 UTC: October, not November.
    october = trained(client, me, datetime(2026, 10, 31, 22, 30, tzinfo=UTC))
    # 00:30 in Rome on 1 November is 23:30 UTC of 31 October: November.
    first = trained(client, me, datetime(2026, 10, 31, 23, 30, tzinfo=UTC), 30)
    morning = trained(client, me, datetime(2026, 11, 5, 7, tzinfo=UTC), 45)
    evening = trained(client, me, datetime(2026, 11, 5, 17, tzinfo=UTC))

    answer = calendar(client, me, month="2026-11")
    assert answer["month"] == "2026-11"
    assert answer["tz"] == "Europe/Rome"
    assert days_of(answer) == {1: [first], 5: [morning, evening]}
    assert answer["count"] == 3
    assert answer["duration_s"] == (30 + 45 + 60) * 60
    assert days_of(calendar(client, me, month="2026-10")) == {31: [october]}
    # In New York the same instants fall on other days.
    assert days_of(calendar(client, me, month="2026-10", tz="America/New_York")) == {
        31: [october, first]
    }
    # The last workout of all, whatever the month asked.
    assert calendar(client, me, month="2026-10")["last"]["id"] == evening


def test_this_month_when_not_asked_and_an_empty_one(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    wall.t = datetime(2026, 12, 3, 9, tzinfo=UTC)
    answer = calendar(client, me)
    assert answer["month"] == "2026-12"
    assert answer["days"] == []
    assert answer["count"] == 0
    assert answer["last"] is None
    done = trained(client, me, datetime(2026, 11, 28, 17, tzinfo=UTC))
    answer = calendar(client, me)
    assert answer["days"] == []
    assert answer["last"]["id"] == done


def test_a_workout_has_its_post_when_published(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    wall.t = datetime(2026, 11, 20, 12, tzinfo=UTC)
    quiet = trained(client, me, datetime(2026, 11, 3, 17, tzinfo=UTC))
    shown = trained(client, me, datetime(2026, 11, 4, 17, tzinfo=UTC))
    post = drawn(client, me, shown, title="Push day", visibility="only_me")["id"]
    workouts = {
        workout["id"]: workout["drawing_id"]
        for day in calendar(client, me, month="2026-11")["days"]
        for workout in day["workouts"]
    }
    assert workouts == {quiet: None, shown: post}


def test_only_the_owner_s_workouts_and_only_the_gym_s(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    someone = other(client)
    wall.t = datetime(2026, 11, 20, 12, tzinfo=UTC)
    mine = trained(client, me, datetime(2026, 11, 5, 17, tzinfo=UTC))
    trained(client, someone, datetime(2026, 11, 6, 17, tzinfo=UTC))
    assert days_of(calendar(client, me, month="2026-11")) == {5: [mine]}
    assert calendar(client, someone, month="2026-11")["count"] == 1
    # Without a token: who asks is not known.
    assert (
        client.get("/me/gym-calendar", params={"tz": "Europe/Rome"}).status_code == 401
    )


def test_a_wrong_month_or_time_zone_is_refused(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    for query in (
        {"tz": "Europe/Rome", "month": "2026-13"},
        {"tz": "Mars/Olympus"},
        {"tz": "Europe/Rome; DROP"},
        {},
    ):
        answer = client.get("/me/gym-calendar", params=query, headers=me)
        assert answer.status_code == 422, query
