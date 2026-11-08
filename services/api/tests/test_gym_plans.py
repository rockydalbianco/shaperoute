"""The plans of the gym (TASK-411 C, ADR-0341 point 3), in a real
PostgreSQL: kept with the phone's key, listed in their order, the latest
change wins, dropped; at most twenty; only the owner's; the workout that
followed one says so, and the calendar writes its name and the days
skipped."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from test_drawings import (
    WallClock,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    other,
    signed_up,
    wall,  # noqa: F401
)
from test_gym import kept

from shaperoute_api.gym_plans import (
    MAX_PLANS,
    GymPlanItemBody,
    GymPlanRequestBody,
    GymPlansBody,
    days_mask,
    mask_days,
)

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
EXAMPLE = json.loads((FIXTURES / "gym-plans.json").read_text(encoding="utf-8"))
PUSH = EXAMPLE["plans"][0]
LEGS = EXAMPLE["plans"][1]


def request(plan: dict[str, Any], **changes: Any) -> dict[str, Any]:
    body = {field: value for field, value in plan.items() if field != "key"}
    return {**body, **changes}


def put(app: TestClient, headers: Headers, key: str, body: dict[str, Any]) -> Any:
    return app.put(f"/me/gym-plans/{key}", json=body, headers=headers)


def listed(app: TestClient, headers: Headers) -> list[dict[str, Any]]:
    answer = app.get("/me/gym-plans", headers=headers)
    assert answer.status_code == 200, answer.text
    return [comparable(plan) for plan in answer.json()["plans"]]


def comparable(plan: dict[str, Any]) -> dict[str, Any]:
    """The plan with its moment as an instant, whatever offset it is
    written with."""
    when = datetime.fromisoformat(plan["updated_at"].replace("Z", "+00:00"))
    return {**plan, "updated_at": when}


# --- The contract, without a database ---


def test_the_example_is_the_contract() -> None:
    body = GymPlansBody.model_validate(EXAMPLE)
    assert [plan.key for plan in body.plans] == [PUSH["key"], LEGS["key"]]


def test_the_days_are_seven_bits() -> None:
    assert days_mask([1, 4]) == 0b1001
    assert mask_days(0b1001) == [1, 4]
    assert mask_days(days_mask([7, 1, 3])) == [1, 3, 7]


@pytest.mark.parametrize(
    "item",
    [
        # Of the catalog and named, or neither.
        {"exercise": "plank", "name": "Plank", "kind": "timed", "sets": 1},
        {"kind": "timed", "sets": 1},
        # A field another kind has.
        {"exercise": "plank", "kind": "timed", "sets": 1, "reps": 10},
        # Not the kind of its exercise; not in the catalog.
        {"exercise": "plank", "kind": "load", "sets": 1},
        {"exercise": "sled_push", "kind": "load", "sets": 1},
        # Sets from 1 to 20.
        {"exercise": "plank", "kind": "timed", "sets": 0},
        {"exercise": "plank", "kind": "timed", "sets": 21},
    ],
)
def test_an_item_has_the_fields_of_its_kind(item: dict[str, Any]) -> None:
    with pytest.raises(ValueError):
        GymPlanItemBody.model_validate(item)


def test_a_plan_s_days_are_of_the_week_once() -> None:
    for days in ([0], [8], [1, 1]):
        with pytest.raises(ValueError):
            GymPlanRequestBody.model_validate(request(PUSH, days=days))
    with pytest.raises(ValueError):
        GymPlanRequestBody.model_validate(request(PUSH, name=""))


# --- In the database ---


def test_kept_with_its_key_listed_in_order_and_dropped(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    assert listed(client, me) == []
    legs = put(client, me, LEGS["key"], request(LEGS))
    assert legs.status_code == 201, legs.text
    # The values not aimed at are left out, not null.
    assert comparable(legs.json()) == comparable(LEGS)
    assert put(client, me, PUSH["key"], request(PUSH)).status_code == 201
    # Sent twice it is kept once.
    assert put(client, me, PUSH["key"], request(PUSH)).status_code == 200
    assert listed(client, me) == [comparable(PUSH), comparable(LEGS)]

    # A newer change replaces it; an older one does not.
    newer = request(PUSH, name="Push A", updated_at="2026-11-08T10:00:00Z")
    assert put(client, me, PUSH["key"], newer).json()["name"] == "Push A"
    older = request(PUSH, name="Push old", updated_at="2026-11-08T08:00:00Z")
    assert put(client, me, PUSH["key"], older).json()["name"] == "Push A"

    assert client.delete(f"/me/gym-plans/{PUSH['key']}", headers=me).status_code == 204
    # Dropping one that is not there is no error: a phone may ask again.
    assert client.delete(f"/me/gym-plans/{PUSH['key']}", headers=me).status_code == 204
    assert [plan["key"] for plan in listed(client, me)] == [LEGS["key"]]


def test_at_most_twenty_plans(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    for n in range(MAX_PLANS):
        assert put(client, me, f"plan{n:012d}", request(LEGS)).status_code == 201
    full = put(client, me, "plan999999999999", request(LEGS))
    assert full.status_code == 422
    # One already kept still changes.
    assert put(client, me, "plan000000000000", request(LEGS)).status_code == 200


def test_only_the_owner_s(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    someone = other(client)
    put(client, me, PUSH["key"], request(PUSH))
    assert listed(client, someone) == []
    # The same key is another plan for another account.
    assert put(client, someone, PUSH["key"], request(LEGS)).status_code == 201
    assert listed(client, me)[0]["name"] == "Push"
    assert client.get("/me/gym-plans").status_code == 401


def test_a_workout_keeps_its_plan_and_the_calendar_its_days(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    # Monday 2 November 2026: the plans are made.
    wall.t = datetime(2026, 11, 2, 8, tzinfo=UTC)
    put(client, me, PUSH["key"], request(PUSH))  # Monday and Thursday
    put(client, me, LEGS["key"], request(LEGS))  # Wednesday

    def workout(started: datetime, plan: str | None) -> str:
        key = f"wk{int(started.timestamp()):014d}"
        changes: dict[str, Any] = {
            "started_at": started.isoformat(),
            "ended_at": (started + timedelta(hours=1)).isoformat(),
            "pauses": [],
            "sets": [],
        }
        if plan is not None:
            changes["plan"] = plan
        kept(client, me, key, **changes)
        return key

    wall.t = datetime(2026, 11, 12, 12, tzinfo=UTC)
    # Monday the 2nd, Push done; Wednesday the 4th, a free workout: Legs
    # skipped; Thursday the 5th nothing: Push skipped; Monday the 9th, Push.
    pushed = workout(datetime(2026, 11, 2, 17, tzinfo=UTC), PUSH["key"])
    free = workout(datetime(2026, 11, 4, 17, tzinfo=UTC), None)
    workout(datetime(2026, 11, 9, 17, tzinfo=UTC), PUSH["key"])

    saved = client.get(f"/me/gym-sessions/{pushed}", headers=me).json()
    assert saved["plan"] == PUSH["key"]
    assert "plan" not in client.get(f"/me/gym-sessions/{free}", headers=me).json()

    answer = client.get(
        "/me/gym-calendar",
        params={"tz": "Europe/Rome", "month": "2026-11"},
        headers=me,
    ).json()
    plans = {
        workout["id"]: workout["plan"]
        for day in answer["days"]
        for workout in day["workouts"]
    }
    assert plans[pushed] == "Push"
    assert plans[free] is None
    # Today is Thursday the 12th: its Push is not skipped yet.
    assert answer["skipped"] == [
        {"day": 4, "plan": "Legs"},
        {"day": 5, "plan": "Push"},
        {"day": 11, "plan": "Legs"},
    ]

    # A plan dropped: its workouts stay, without its name, and its days go.
    client.delete(f"/me/gym-plans/{PUSH['key']}", headers=me)
    answer = client.get(
        "/me/gym-calendar",
        params={"tz": "Europe/Rome", "month": "2026-11"},
        headers=me,
    ).json()
    assert {w["plan"] for d in answer["days"] for w in d["workouts"]} == {None}
    assert answer["skipped"] == [
        {"day": 4, "plan": "Legs"},
        {"day": 11, "plan": "Legs"},
    ]
