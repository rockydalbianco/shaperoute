"""The monthly leaderboard at the gym (TASK-385 F, ADR-0327 point 9), in a
real PostgreSQL: each person's best live set of an exercise, in the posts
for everyone published in a month of Rome, the best first, never across a
block; and «Winner» for the first of a month that has ended, with at least
three people on it."""

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
    drawn,
    other,
    public_id,
    signed_up,
    third,
    wall,  # noqa: F401
)
from test_gym import after_the_workout, kept  # noqa: F401

from shaperoute_api import gym_leaderboard
from shaperoute_api.db import Database
from shaperoute_api.gym_catalog import EXERCISES_BY_KEY
from shaperoute_api.gym_leaderboard import GymLeaderboardBody, _best_sql

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
# The example workout's evening, 2026-11-05.
STARTED = datetime(2026, 11, 5, 17, tzinfo=UTC)
SHOWN_KEY = "cd00000000000001"
KEYS = iter(f"ab{n:014x}" for n in range(1, 10_000))


def lifted(
    app: TestClient,
    headers: Headers,
    kg: float,
    *,
    started: datetime = STARTED,
    at_s: int = 600,
    live: bool = True,
    exercise: str = "bench_press",
    visibility: str = "everyone",
    key: str | None = None,
) -> str:
    """A workout of one set of `kg`, published: its post's id."""
    key = key or next(KEYS)
    kept(
        app,
        headers,
        key,
        started_at=started.isoformat(),
        ended_at=(started + timedelta(hours=1)).isoformat(),
        pauses=[],
        sets=[
            {
                "exercise": exercise,
                "kind": "load",
                "reps": 1,
                "load_kg": kg,
                "at_s": at_s,
                "live": live,
            }
        ],
    )
    return str(drawn(app, headers, key, title="Gym", visibility=visibility)["id"])


def board(app: TestClient, headers: Headers, **query: str) -> Any:
    answer = app.get(
        "/gym/leaderboard",
        params={"exercise": "bench_press", **query},
        headers=headers,
    )
    assert answer.status_code == 200, answer.text
    return answer.json()


def ranked(answer: Any) -> list[tuple[int, str, float]]:
    return [
        (row["rank"], row["user"]["username"], row["value"]) for row in answer["rows"]
    ]


def lifter(app: TestClient, n: int) -> Headers:
    return signed_up(app, email=f"lifter{n}@example.com", username=f"lifter_{n}")


def wins(app: TestClient, owner: Headers, viewer: Headers) -> int:
    answer = app.get(f"/users/{public_id(app, owner)}", headers=viewer)
    assert answer.status_code == 200, answer.text
    return int(answer.json()["contest_wins"])


# --- The contract, without a database ---


def test_the_example_is_the_contract() -> None:
    example = json.loads(
        (FIXTURES / "gym-leaderboard.json").read_text(encoding="utf-8")
    )
    body = GymLeaderboardBody.model_validate(example)
    assert body.exercise in EXERCISES_BY_KEY
    assert [row.rank for row in body.rows] == sorted(row.rank for row in body.rows)


# --- In the database ---


def test_an_exercise_without_a_scale_has_none(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    missing = client.get(
        "/gym/leaderboard", params={"exercise": "sled_push"}, headers=me
    )
    assert missing.status_code == 404
    assert missing.json()["error"]["message"] == "unknown_exercise"
    month = client.get(
        "/gym/leaderboard",
        params={"exercise": "bench_press", "month": "2026-13"},
        headers=me,
    )
    assert month.status_code == 422
    assert (
        client.get("/gym/leaderboard", params={"exercise": "bench_press"}).status_code
        == 401
    )


def test_each_person_s_best_live_set_the_best_first(
    client: TestClient,  # noqa: F811
) -> None:
    me, you, they = signed_up(client), other(client), third(client)
    lifted(client, me, 80)
    lifted(client, me, 90)
    lifted(client, you, 100)
    # Over the cap of the bench press, or added after «Stop»: not counted.
    cap = EXERCISES_BY_KEY["bench_press"].capped_at()
    assert cap is not None
    lifted(client, you, cap + 10)
    lifted(client, they, 120, live=False)
    lifted(client, they, 70)
    answer = board(client, me)
    assert answer["month"] == "2026-11"
    assert answer["measure"] == "load_kg"
    assert answer["people"] == 3
    assert ranked(answer) == [
        (1, "other_runner", 100.0),
        (2, "Runner_42", 90.0),
        (3, "third_runner", 70.0),
    ]
    assert answer["mine"]["rank"] == 2


def test_a_tie_goes_to_the_set_logged_first(client: TestClient) -> None:  # noqa: F811
    me, you = signed_up(client), other(client)
    lifted(client, me, 100, at_s=1200)
    lifted(client, you, 100, at_s=300)
    assert ranked(board(client, me)) == [
        (1, "other_runner", 100.0),
        (2, "Runner_42", 100.0),
    ]


def test_only_posts_for_everyone_with_their_exercises_shown_count(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    me, you, they = signed_up(client), other(client), third(client)
    lifted(client, me, 100, visibility="followers")
    lifted(client, you, 90, key=SHOWN_KEY)
    hidden = lifted(client, they, 110)
    # Hidden by the moderation, from a report of its post.
    with database.connect() as conn:
        conn.execute("UPDATE drawings SET hidden_at = now() WHERE id = %s", (hidden,))
    assert ranked(board(client, me)) == [(1, "other_runner", 90.0)]
    assert board(client, me)["mine"] is None
    # Its owner hides the exercises: its row goes.
    shown = client.put(
        f"/me/gym-sessions/{SHOWN_KEY}/show-exercises",
        json={"show": False},
        headers=you,
    )
    assert shown.status_code == 204, shown.text
    assert board(client, me)["rows"] == []


def test_a_block_takes_the_row_away_and_the_ranks_stay(
    client: TestClient,  # noqa: F811
) -> None:
    me, you, they = signed_up(client), other(client), third(client)
    lifted(client, me, 80)
    lifted(client, you, 100)
    lifted(client, they, 90)
    answer = client.put(f"/users/{public_id(client, you)}/block", headers=me)
    assert answer.status_code == 204, answer.text
    seen = board(client, me)
    assert ranked(seen) == [(2, "third_runner", 90.0), (3, "Runner_42", 80.0)]
    assert seen["people"] == 3


def test_the_month_is_of_the_workout_and_of_its_post(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me, you = signed_up(client), other(client)
    wall.t = datetime(2026, 10, 20, 19, tzinfo=UTC)
    lifted(client, me, 70, started=datetime(2026, 10, 20, 17, tzinfo=UTC))
    # Begun on the last evening of October, published in November: neither.
    wall.t = datetime(2026, 11, 1, 10, tzinfo=UTC)
    lifted(client, you, 200, started=datetime(2026, 10, 31, 17, tzinfo=UTC))
    wall.t = datetime(2026, 11, 5, 18, 10, tzinfo=UTC)
    lifted(client, you, 60)
    assert ranked(board(client, me, month="2026-10")) == [(1, "Runner_42", 70.0)]
    assert ranked(board(client, me)) == [(1, "other_runner", 60.0)]
    assert board(client, me, month="2026-09")["rows"] == []


def test_the_first_fifty_and_mine_besides(
    client: TestClient,  # noqa: F811
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(gym_leaderboard, "TOP", 1)
    me, you = signed_up(client), other(client)
    lifted(client, me, 80)
    lifted(client, you, 100)
    answer = board(client, me)
    assert ranked(answer) == [(1, "other_runner", 100.0)]
    assert answer["mine"]["rank"] == 2


def test_the_month_is_read_through_the_index_of_the_feed(
    database: Database,  # noqa: F811
) -> None:
    """The leaderboard of a month reads the posts of the month, not all
    of them: with a few rows the planner would scan, so it is told not to."""
    query = "EXPLAIN " + _best_sql(
        "s.exercise = %(exercise)s"
        " AND d.published_at >= %(start)s AND d.published_at < %(end)s"
    )
    with database.connect() as conn:
        conn.execute("SET enable_seqscan = off")
        plan = "\n".join(
            str(next(iter(row.values())))
            for row in conn.execute(
                query,
                {
                    "exercise": "bench_press",
                    "start": datetime(2026, 11, 1, tzinfo=UTC),
                    "end": datetime(2026, 12, 1, tzinfo=UTC),
                },
            ).fetchall()
        )
    assert "drawings_published_idx" in plan


def test_the_first_of_a_month_ended_with_three_people_is_a_winner(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me, you, they = signed_up(client), other(client), third(client)
    wall.t = datetime(2026, 10, 20, 19, tzinfo=UTC)
    october = datetime(2026, 10, 20, 17, tzinfo=UTC)
    lifted(client, me, 100, started=october)
    lifted(client, you, 90, started=october)
    # Two people on the squat: no winner.
    lifted(client, me, 150, started=october, exercise="back_squat")
    lifted(client, you, 140, started=october, exercise="back_squat")
    assert wins(client, me, you) == 0
    lifted(client, they, 80, started=october)
    assert wins(client, me, you) == 1
    assert wins(client, you, me) == 0


def test_a_month_not_ended_has_no_winner(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    """The month that counts as ended is the database's own: today's month
    never makes a winner."""
    today = datetime.now(UTC).replace(microsecond=0)
    wall.t = today
    lifters = [signed_up(client), other(client), third(client), lifter(client, 4)]
    for n, headers in enumerate(lifters):
        lifted(client, headers, 100 - n, started=today - timedelta(hours=2))
    assert wins(client, lifters[0], lifters[1]) == 0
