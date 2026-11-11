"""The plans of the gym (TASK-411 C, ADR-0341 point 3), in a real
PostgreSQL: kept with the phone's key, listed in their order, the latest
change wins, dropped; at most twenty; only the owner's; the workout that
followed one says so, and the calendar writes its name and the days
skipped. A plan made with the guide keeps its weeks (`program`, 0066): the
days planned follow its cycle and the weeks written by hand."""

from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from test_drawings import (
    WallClock,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    other,
    saved,
    signed_up,
    wall,  # noqa: F401
)
from test_gym import kept

from shaperoute_api.gym_plans import (
    MAX_PLANS,
    GymPlanItemBody,
    GymPlanRequestBody,
    GymPlanRunBody,
    GymPlansBody,
    GymPlanSessionBody,
    GymProgramBody,
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
MUSCLE = EXAMPLE["plans"][2]
LIFT_AND_RUN = EXAMPLE["plans"][3]


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
    assert [plan.key for plan in body.plans] == [
        PUSH["key"],
        LEGS["key"],
        MUSCLE["key"],
        LIFT_AND_RUN["key"],
    ]


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


def program(**changes: Any) -> dict[str, Any]:
    return {**MUSCLE["program"], **changes}


@pytest.mark.parametrize(
    "changes",
    [
        # One workout a day, at least one, days of the week.
        {"sessions": [MUSCLE["program"]["sessions"][0]] * 2},
        {"sessions": []},
        {"sessions": [{"day": 8, "name": "A", "items": []}]},
        # A week written by hand is one of the cycle, from the second, once.
        {"weeks": 3},
        {"custom": [{"week": 1, "sessions": []}]},
        {"custom": [{"week": 2, "sessions": []}] * 2},
        # From 1 to 12 weeks; a mode and a goal it knows; a step of 0–20 kg.
        {"weeks": 0},
        {"weeks": 13},
        {"mode": "random"},
        {"goal": "speed"},
        {"step_kg": 25},
    ],
)
def test_a_program_s_weeks_are_of_its_cycle(changes: dict[str, Any]) -> None:
    with pytest.raises(ValueError):
        GymProgramBody.model_validate(program(**changes))


def test_a_program_has_at_most_300_exercises() -> None:
    item = {"exercise": "plank", "kind": "timed", "sets": 1}
    full = [{"day": day, "name": "A", "items": [item] * 30} for day in range(1, 8)]
    weeks = [{"week": week, "sessions": full} for week in (2, 3)]
    with pytest.raises(ValueError):
        GymProgramBody.model_validate(program(sessions=full, custom=weeks))


def test_the_workout_of_a_day_follows_the_cycle() -> None:
    body = GymProgramBody.model_validate(MUSCLE["program"])

    def names(day: date) -> list[str]:
        return [
            item.exercise or "" for one in body.sessions_on(day) for item in one.items
        ]

    # It starts on Monday 2 November 2026: nothing before.
    assert names(date(2026, 11, 1)) == []
    assert names(date(2026, 11, 2)) == ["bench_press", "lateral_raise"]
    assert names(date(2026, 11, 4)) == ["lat_pulldown", "pull_up"]
    assert names(date(2026, 11, 3)) == []
    # The fourth week is written by hand: Monday only.
    assert names(date(2026, 11, 23)) == ["push_up"]
    assert names(date(2026, 11, 25)) == []
    # Then the cycle starts again.
    assert names(date(2026, 11, 30)) == ["bench_press", "lateral_raise"]
    assert body.days() == [1, 3, 5]


def test_a_program_started_midweek_counts_from_its_monday() -> None:
    body = GymProgramBody.model_validate(program(starts_on="2026-11-18"))
    # Wednesday the 18th is in week 1; Monday the 16th is before it.
    assert body.sessions_on(date(2026, 11, 16)) == []
    assert body.sessions_on(date(2026, 11, 18))[0].name == "Back, biceps"
    # Monday the 7th of December is week 4, the one written by hand.
    assert body.sessions_on(date(2026, 12, 7))[0].items[0].exercise == "push_up"


@pytest.mark.parametrize(
    "run",
    [
        # An easy or long run: a distance or a time, not both, no reps.
        {"kind": "easy"},
        {"kind": "easy", "distance_m": 5000, "duration_s": 1800},
        {"kind": "long", "distance_m": 12000, "reps": 2},
        # Intervals: reps, each in metres or seconds.
        {"kind": "intervals", "reps": 6},
        {"kind": "intervals", "reps": 6, "rep_m": 400, "rep_s": 90},
        {"kind": "intervals", "reps": 6, "rep_m": 400, "distance_m": 5000},
        # A kind it knows, values in their range.
        {"kind": "tempo", "distance_m": 5000},
        {"kind": "easy", "distance_m": 50},
    ],
)
def test_a_run_day_has_the_fields_of_its_kind(run: dict[str, Any]) -> None:
    with pytest.raises(ValueError):
        GymPlanRunBody.model_validate(run)


def test_a_run_day_has_no_exercises() -> None:
    item = {"exercise": "plank", "kind": "timed", "sets": 1}
    run = {"kind": "easy", "distance_m": 5000}
    with pytest.raises(ValueError):
        GymPlanSessionBody.model_validate(
            {"day": 2, "name": "Run", "items": [item], "run": run}
        )
    body = GymProgramBody.model_validate(LIFT_AND_RUN["program"])
    tuesday = body.sessions_on(date(2026, 11, 3))
    assert tuesday[0].run is not None and tuesday[0].run.distance_m == 5000
    assert body.days() == [1, 2, 4, 6]


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


def test_a_program_is_kept_and_an_older_app_leaves_it(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    # The days are the program's, whatever the phone sends.
    made = put(client, me, MUSCLE["key"], request(MUSCLE, days=[]))
    assert made.status_code == 201, made.text
    assert comparable(made.json()) == comparable(MUSCLE)

    # An app older than the guide sends no program: it stays.
    older_app = {
        field: value
        for field, value in request(MUSCLE, name="Muscle").items()
        if field != "program"
    }
    older_app["updated_at"] = "2026-11-10T10:00:00Z"
    kept_plan = put(client, me, MUSCLE["key"], older_app).json()
    assert kept_plan["name"] == "Muscle"
    assert kept_plan["program"] == MUSCLE["program"]

    # Null makes it a plan of one workout again.
    plain = request(MUSCLE, program=None, days=[2], updated_at="2026-11-10T11:00:00Z")
    answer = put(client, me, MUSCLE["key"], plain).json()
    assert "program" not in answer
    assert answer["days"] == [2]


def test_the_calendar_skips_the_days_of_the_cycle(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    wall.t = datetime(2026, 11, 2, 8, tzinfo=UTC)
    put(client, me, MUSCLE["key"], request(MUSCLE))
    wall.t = datetime(2026, 11, 26, 12, tzinfo=UTC)
    kept(
        client,
        me,
        "wk00000000000001",
        started_at="2026-11-02T17:00:00+00:00",
        ended_at="2026-11-02T18:00:00+00:00",
        pauses=[],
        sets=[],
        plan=MUSCLE["key"],
    )
    answer = client.get(
        "/me/gym-calendar",
        params={"tz": "Europe/Rome", "month": "2026-11"},
        headers=me,
    ).json()
    # Monday, Wednesday and Friday of three weeks, but the fourth (from
    # Monday the 23rd) has Monday only; Thursday the 26th is today.
    assert [one["day"] for one in answer["skipped"]] == [
        4,
        6,
        9,
        11,
        13,
        16,
        18,
        20,
        23,
    ]
    assert {one["plan"] for one in answer["skipped"]} == {"Muscle · 3 days"}


def test_a_run_day_is_done_by_a_run(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    # Monday 21 September 2026, the day of the example run.
    wall.t = datetime(2026, 9, 21, 8, tzinfo=UTC)
    program = {**LIFT_AND_RUN["program"], "starts_on": "2026-09-21"}
    made = put(client, me, LIFT_AND_RUN["key"], request(LIFT_AND_RUN, program=program))
    assert made.status_code == 201, made.text
    assert comparable(made.json()) == comparable({**LIFT_AND_RUN, "program": program})
    # A run on Tuesday the 22nd (the example, a day on): its run day is done.
    wall.t = datetime(2026, 9, 27, 12, tzinfo=UTC)
    saved(client, me, days_later=1)
    answer = client.get(
        "/me/gym-calendar",
        params={"tz": "Europe/Rome", "month": "2026-09"},
        headers=me,
    ).json()
    # Monday the 21st (the gym), Thursday the 24th (intervals) and Saturday
    # the 26th (long run) without; Tuesday the 22nd run.
    assert [one["day"] for one in answer["skipped"]] == [21, 24, 26]
