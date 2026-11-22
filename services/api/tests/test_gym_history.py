"""The history of one exercise at the gym (TASK-483 A, ADR-0392), in a real
PostgreSQL: only the account's own sets, one point a workout for the chart,
the records over the whole history, the workouts a page at a time, the
newest first; a named exercise by its name without case or extra spaces."""

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

from shaperoute_api.db import Database
from shaperoute_api.gym_history import (
    _NAME_SQL,
    GymHistoryBody,
    estimated_1rm,
    same_name,
)

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
KEYS = iter(f"hc{n:014x}" for n in range(1, 10_000))


@pytest.fixture(autouse=True)
def after_the_workouts(wall: WallClock) -> None:  # noqa: F811
    # After every workout of these tests, the latest of 2026-11-10.
    wall.t = datetime(2026, 11, 20, 12, tzinfo=UTC)


def load(reps: int, kg: float, at_s: int = 600, **more: Any) -> dict[str, Any]:
    return {
        "exercise": "bench_press",
        "kind": "load",
        "reps": reps,
        "load_kg": kg,
        "at_s": at_s,
        "live": True,
        **more,
    }


def trained(
    app: TestClient,
    headers: Headers,
    day: int,
    sets: list[dict[str, Any]],
    key: str | None = None,
) -> str:
    """A workout on the evening of `day` November 2026 with `sets`: its key."""
    key = key or next(KEYS)
    started = datetime(2026, 11, day, 17, tzinfo=UTC)
    kept(
        app,
        headers,
        key,
        started_at=started.isoformat(),
        ended_at=(started + timedelta(hours=1)).isoformat(),
        pauses=[],
        sets=sets,
    )
    return key


def history(app: TestClient, headers: Headers, **query: Any) -> Any:
    answer = app.get("/me/gym-history", params=query, headers=headers)
    assert answer.status_code == 200, answer.text
    return answer.json()


def example() -> Any:
    return json.loads((FIXTURES / "gym-history.json").read_text(encoding="utf-8"))


# --- The contract, without a database ---


def test_the_example_is_the_contract() -> None:
    body = GymHistoryBody.model_validate(example())
    assert body.next == body.workouts[-1].id
    assert len(body.points) == body.workouts_count


def test_the_one_rep_max_is_epley_s() -> None:
    assert estimated_1rm(100, 1) == 100
    assert estimated_1rm(90, 6) == pytest.approx(108)
    assert estimated_1rm(70, 10) == pytest.approx(93.333, abs=0.001)


@pytest.mark.parametrize(
    ("written", "same"),
    [
        ("Smith incline", "smith incline"),
        ("  Smith   INCLINE ", "smith incline"),
        ("smith\tincline", "smith incline"),
    ],
)
def test_a_name_without_case_or_extra_spaces(written: str, same: str) -> None:
    assert same_name(written) == same


# --- In the database ---


def test_the_example_is_what_the_api_answers(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    trained(client, me, 2, [load(10, 70), load(9, 70, 780)], "hb00000000000001")
    trained(client, me, 6, [load(5, 82.5), load(8, 75, 780)], "hb00000000000002")
    trained(client, me, 10, [load(15, 60), load(14, 60, 780)], "hb00000000000003")
    # Another exercise in the same workout is not in it.
    trained(client, me, 12, [{**load(5, 140), "exercise": "back_squat"}])
    first = history(client, me, exercise="bench_press", limit=2)
    assert GymHistoryBody.model_validate(first) == GymHistoryBody.model_validate(
        example()
    )
    # Empty fields are left out, not null.
    assert "name" not in first
    assert "set" not in first["records"][-1]
    rest = history(client, me, exercise="bench_press", limit=2, before=first["next"])
    assert [workout["id"] for workout in rest["workouts"]] == ["hb00000000000001"]
    assert "next" not in rest
    assert rest["points"] == first["points"]


def test_only_one_s_own_sets(client: TestClient) -> None:  # noqa: F811
    me, you = signed_up(client), other(client)
    trained(client, you, 3, [load(5, 120)])
    assert history(client, me, exercise="bench_press") == {
        "exercise": "bench_press",
        "kind": "load",
        "measure": "estimated_1rm_kg",
        "workouts_count": 0,
        "points": [],
        "records": [],
        "workouts": [],
    }
    trained(client, me, 4, [load(5, 60)])
    mine = history(client, me, exercise="bench_press")
    assert [record["value"] for record in mine["records"]][:2] == [70.0, 60.0]


def test_a_named_exercise_by_its_name_without_case_or_spaces(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)

    def named(name: str, reps: int) -> dict[str, Any]:
        return {
            "name": name,
            "kind": "bodyweight",
            "reps": reps,
            "at_s": 600,
            "live": True,
        }

    trained(client, me, 2, [named("Ring dips", 8)])
    trained(client, me, 5, [named("  ring   DIPS ", 11)])
    trained(client, me, 7, [named("Ring dips deep", 20)])
    answer = history(client, me, name="ring dips")
    assert answer["name"] == "  ring   DIPS "
    assert "exercise" not in answer
    assert answer["kind"] == "bodyweight"
    assert answer["measure"] == "reps"
    assert [point["value"] for point in answer["points"]] == [8.0, 11.0]
    assert [record["kind"] for record in answer["records"]] == ["most_reps"]
    nobody = history(client, me, name="Muscle up")
    assert nobody["workouts_count"] == 0
    assert "kind" not in nobody and "measure" not in nobody


def test_what_a_point_reads_by_the_kind(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    trained(
        client,
        me,
        3,
        [
            {
                "exercise": "plank",
                "kind": "timed",
                "duration_s": 60,
                "at_s": 300,
                "live": True,
            },
            {
                "exercise": "plank",
                "kind": "timed",
                "duration_s": 90,
                "at_s": 600,
                "live": True,
            },
            {
                "exercise": "treadmill",
                "kind": "cardio",
                "duration_s": 900,
                "distance_m": 2400,
                "at_s": 1800,
                "live": True,
            },
        ],
    )
    plank = history(client, me, exercise="plank")
    assert plank["measure"] == "duration_s"
    assert plank["points"][0]["value"] == 90
    assert [record["kind"] for record in plank["records"]] == ["longest_s"]
    treadmill = history(client, me, exercise="treadmill")
    assert treadmill["measure"] == "distance_m"
    assert treadmill["points"][0]["value"] == 2400
    assert [record["kind"] for record in treadmill["records"]] == [
        "farthest_m",
        "longest_s",
    ]


def test_sets_added_after_stop_count_too(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    trained(client, me, 3, [load(3, 100, live=False)])
    assert history(client, me, exercise="bench_press")["points"][0]["value"] == 110


def test_what_is_refused(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    assert client.get("/me/gym-history", headers=me).status_code == 422
    both = client.get(
        "/me/gym-history", params={"exercise": "bench_press", "name": "x"}, headers=me
    )
    assert both.status_code == 422
    blank = client.get("/me/gym-history", params={"name": "   "}, headers=me)
    assert blank.status_code == 422
    unknown = client.get(
        "/me/gym-history", params={"exercise": "no_such_lift"}, headers=me
    )
    assert unknown.status_code == 404
    assert unknown.json()["error"]["message"] == "unknown_exercise"
    page = client.get(
        "/me/gym-history",
        params={"exercise": "bench_press", "before": "ffffffffffffffff"},
        headers=me,
    )
    assert page.status_code == 404
    assert page.json()["error"]["message"] == "unknown_workout"
    signed_out = client.get("/me/gym-history", params={"exercise": "bench_press"})
    assert signed_out.status_code == 401


def test_the_name_in_sql_is_the_name_in_python(
    database: Database,  # noqa: F811
) -> None:
    written = ["Smith incline", "  Smith   INCLINE ", "smith\tincline", "Ab wheel"]
    with database.connect() as conn:
        for name in written:
            row = conn.execute(
                f"SELECT {_NAME_SQL} AS same FROM (SELECT %s::text AS name) s",
                (name,),
            ).fetchone()
            assert row["same"] == same_name(name)


def test_the_sets_are_read_through_the_runs_of_the_account(
    database: Database,  # noqa: F811
) -> None:
    """The history reads the runs of one account, not every set."""
    with database.connect() as conn:
        conn.execute("SET enable_seqscan = off")
        plan = "\n".join(
            str(next(iter(row.values())))
            for row in conn.execute(
                "EXPLAIN SELECT s.n FROM runs r JOIN gym_sets s ON s.run_id = r.id"
                " WHERE r.user_id = %s AND r.activity = 'gym'"
                " AND s.exercise = %s ORDER BY r.started_at, r.id, s.n",
                (1, "bench_press"),
            ).fetchall()
        )
    assert "runs_user_started_idx" in plan
