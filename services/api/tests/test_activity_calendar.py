"""The calendar of all one's own activities (TASK-462 part A, ADR-0372), in a
real PostgreSQL: the days of a month on the phone's time zone with their
activities of any sport and their calories, the month's sums, the twelve
months up to it, the sports of the owner; only the owner's, only of the sport
asked, only what the app reads."""

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
    other,
    saved,
    signed_up,
    wall,  # noqa: F401
)
from test_gym import kept

from shaperoute_api.activity_calendar import TREND_MONTHS, ActivityCalendarBody

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
# What the app of today reads: every sport, the gym and the pool.
THIS_APP = json.loads((FIXTURES / "reads.json").read_text(encoding="utf-8"))["this_app"]
KEYS = iter(f"ac{n:014x}" for n in range(1, 10_000))
# The example run (activity-request.json) begins on Monday 21 September
# 2026 at 13:33:20 UTC, 15:33 in Rome.
EXAMPLE_DAY = 21


def calendar(
    app: TestClient, headers: Headers, reads: str = THIS_APP, **query: str
) -> Any:
    answer = app.get(
        "/me/activity-calendar",
        params={"tz": "Europe/Rome", **query},
        headers={**headers, "X-MuW-Reads": reads},
    )
    assert answer.status_code == 200, answer.text
    return answer.json()


def ran(app: TestClient, headers: Headers, days_later: int = 0, **changes: Any) -> str:
    """The example run, `days_later` days on, of `changes`: its key."""
    key = next(KEYS)
    saved(app, headers, key, days_later=days_later, **changes)
    return key


def trained(
    app: TestClient, headers: Headers, started: datetime, minutes: int = 60
) -> str:
    """A workout at the gym of one plank begun at `started`: its key."""
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


def days_of(answer: Any) -> dict[int, list[str]]:
    return {
        day["day"]: [activity["id"] for activity in day["activities"]]
        for day in answer["days"]
    }


# --- The contract, without a database ---


def test_the_example_is_the_contract() -> None:
    example = json.loads(
        (FIXTURES / "activity-calendar.json").read_text(encoding="utf-8")
    )
    body = ActivityCalendarBody.model_validate(example)
    activities = [activity for day in body.days for activity in day.activities]
    assert body.count == len(activities)
    assert body.duration_s == sum(activity.duration_s for activity in activities)
    assert len(body.trend) == TREND_MONTHS
    assert body.trend[-1].month == body.month


# --- In the database ---


def test_every_sport_on_its_day_with_its_calories(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    wall.t = datetime(2026, 9, 30, 12, tzinfo=UTC)
    run = ran(client, me)
    hike = ran(client, me, days_later=2, activity="hiking")
    gym = trained(client, me, datetime(2026, 9, 21, 17, tzinfo=UTC), 55)
    stats = client.put(f"/me/activities/{run}/stats", json={"kcal": 355}, headers=me)
    assert stats.status_code == 200, stats.text

    answer = calendar(client, me, month="2026-09")
    assert answer["month"] == "2026-09"
    assert answer["sport"] is None
    assert days_of(answer) == {EXAMPLE_DAY: [run, gym], EXAMPLE_DAY + 2: [hike]}
    first = answer["days"][0]["activities"]
    assert [one["activity"] for one in first] == ["running", "gym"]
    assert [one["kcal"] for one in first] == [355, None]
    assert first[0]["shape"] == "star"
    assert answer["count"] == 3
    activities = [one for day in answer["days"] for one in day["activities"]]
    assert answer["duration_s"] == sum(one["duration_s"] for one in activities)
    assert answer["distance_m"] == round(
        sum(one["distance_m"] for one in activities), 1
    )
    assert gym in [one["id"] for one in activities if one["distance_m"] == 0]
    assert sorted(answer["sports"]) == ["gym", "hiking", "running"]


def test_one_sport_only(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    wall.t = datetime(2026, 9, 30, 12, tzinfo=UTC)
    ran(client, me)
    second = ran(client, me, days_later=3)
    hike = ran(client, me, days_later=2, activity="hiking")
    answer = calendar(client, me, month="2026-09", sport="hiking")
    assert answer["sport"] == "hiking"
    assert days_of(answer) == {EXAMPLE_DAY + 2: [hike]}
    assert answer["trend"][-1]["count"] == 1
    # The sports are all the owner's, the most first, whatever is asked.
    assert answer["sports"] == ["running", "hiking"]
    assert days_of(calendar(client, me, month="2026-09", sport="running"))[
        EXAMPLE_DAY + 3
    ] == [second]
    unknown = client.get(
        "/me/activity-calendar",
        params={"tz": "Europe/Rome", "sport": "flying"},
        headers=me,
    )
    assert unknown.status_code == 422


def test_the_twelve_months_up_to_the_month(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    # Signed up on the day of the last run: a token of a year before ends.
    wall.t = datetime(2027, 9, 30, 12, tzinfo=UTC)
    me = signed_up(client)
    september = ran(client, me)
    ran(client, me, days_later=1)
    ran(client, me, days_later=30)  # 21 October 2026
    ran(client, me, days_later=365)  # 21 September 2027

    answer = calendar(client, me, month="2027-08")
    months = [month["month"] for month in answer["trend"]]
    assert months[0] == "2026-09" and months[-1] == "2027-08"
    assert len(months) == TREND_MONTHS
    counts = {month["month"]: month["count"] for month in answer["trend"]}
    assert counts["2026-09"] == 2
    assert counts["2026-10"] == 1
    assert sum(counts.values()) == 3
    assert answer["days"] == []
    one = calendar(client, me, month="2026-09")["days"][0]["activities"][0]
    assert one["id"] == september
    last = calendar(client, me, month="2026-09")["trend"][-1]
    assert abs(last["distance_m"] - 2 * one["distance_m"]) <= 0.1
    assert last["duration_s"] == 2 * one["duration_s"]


def test_the_month_s_days_on_the_phone_s_time_zone(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    wall.t = datetime(2026, 11, 20, 12, tzinfo=UTC)
    # 00:30 in Rome on 1 November is 23:30 UTC of 31 October: November.
    first = trained(client, me, datetime(2026, 10, 31, 23, 30, tzinfo=UTC), 30)
    assert days_of(calendar(client, me, month="2026-11")) == {1: [first]}
    assert days_of(calendar(client, me, month="2026-10", tz="America/New_York")) == {
        31: [first]
    }
    # This month on the phone's clock when not asked.
    assert calendar(client, me)["month"] == "2026-11"


def test_only_what_the_app_reads(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    wall.t = datetime(2026, 9, 30, 12, tzinfo=UTC)
    run = ran(client, me)
    ran(client, me, days_later=2, activity="hiking")
    trained(client, me, datetime(2026, 9, 21, 17, tzinfo=UTC))
    # An app before X-MuW-Reads reads running, cycling and paddling only.
    answer = calendar(client, me, reads="", month="2026-09")
    assert days_of(answer) == {EXAMPLE_DAY: [run]}
    assert answer["sports"] == ["running"]
    assert answer["trend"][-1]["count"] == 1


def test_only_the_owner_s(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me = signed_up(client)
    someone = other(client)
    wall.t = datetime(2026, 9, 30, 12, tzinfo=UTC)
    ran(client, someone)
    answer = calendar(client, me, month="2026-09")
    assert answer["days"] == []
    assert answer["count"] == 0
    assert answer["sports"] == []
    assert all(month["count"] == 0 for month in answer["trend"])
    assert (
        client.get("/me/activity-calendar", params={"tz": "Europe/Rome"}).status_code
        == 401
    )


def test_a_time_zone_and_a_month_of_the_calendar(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    for query in ({"tz": "Mars/Olympus"}, {"tz": "Europe/Rome", "month": "2026-13"}):
        answer = client.get("/me/activity-calendar", params=query, headers=me)
        assert answer.status_code == 422, query
