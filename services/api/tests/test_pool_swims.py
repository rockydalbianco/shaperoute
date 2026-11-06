"""A swim in a pool (TASK-400, ADR-0334), in a real PostgreSQL: saved as a
run of swimming without a track, with its pool and its lengths, and
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

from shaperoute_api.db import Database
from shaperoute_api.pool_swims import PoolSwimRequestBody
from shaperoute_api.reads import READS_HEADER

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
POOL_KEY = "5a4b3c2d1e0f9a8b"
THIS_APP = json.loads((FIXTURES / "reads.json").read_text(encoding="utf-8"))["this_app"]
Headers = dict[str, str]


def swim(**changes: Any) -> dict[str, Any]:
    body = json.loads((FIXTURES / "pool-swim.json").read_text(encoding="utf-8"))
    return {**body, **changes}


def reading(headers: Headers) -> Headers:
    return {**headers, READS_HEADER: THIS_APP}


@pytest.fixture(autouse=True)
def after_the_swim(wall: WallClock) -> None:  # noqa: F811
    # The example swim is of the morning of 2026-11-05.
    wall.t = datetime(2026, 11, 5, 8, 0, tzinfo=UTC)


def kept(app: TestClient, headers: Headers, key: str = POOL_KEY, **changes: Any) -> Any:
    answer = app.put(f"/me/pool-swims/{key}", json=swim(**changes), headers=headers)
    assert answer.status_code == 201, answer.text
    return answer.json()


# --- The contract, without a database ---


def test_the_example_is_a_request() -> None:
    body = PoolSwimRequestBody.model_validate(swim())
    # 42 minutes, a pause of 2: 60 lengths of 25 m.
    assert body.duration_s() == 2_400
    assert body.distance_m() == 1_500


def test_a_pool_of_a_third_is_kept_to_the_centimetre() -> None:
    body = PoolSwimRequestBody.model_validate(swim(pool_length_m=100 / 3, lengths=30))
    assert body.pool_m() == 33.33
    assert body.distance_m() == 1_000


@pytest.mark.parametrize(
    "changes",
    [
        {"pool_length_m": 9.99},
        {"pool_length_m": 100.01},
        {"lengths": 0},
        {"lengths": 1_001},
        {"pauses": [{"from_s": 2_400, "to_s": 2_600}]},
        {"pauses": [{"from_s": 300, "to_s": 200}]},
        {"ended_at": "2026-11-05T07:00:00Z"},
        {"ended_at": "2026-11-06T07:00:01Z"},
        {"strokes": 12},
    ],
)
def test_a_wrong_swim_is_refused(changes: dict[str, Any]) -> None:
    with pytest.raises(ValueError):
        PoolSwimRequestBody.model_validate(swim(**changes))


# --- The database ---


def test_a_swim_is_saved_once(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    first = kept(client, me)
    assert first == {
        "id": POOL_KEY,
        "started_at": "2026-11-05T07:00:00Z",
        "duration_s": 2_400,
        "distance_m": 1_500,
        "pool_length_m": 25.0,
        "lengths": 60,
    }
    again = client.put(f"/me/pool-swims/{POOL_KEY}", json=swim(lengths=2), headers=me)
    assert again.status_code == 200
    assert again.json() == first
    assert client.get(f"/me/pool-swims/{POOL_KEY}", headers=me).json() == first
    stranger = other(client)
    assert client.get(f"/me/pool-swims/{POOL_KEY}", headers=stranger).status_code == 404


def test_too_fast_for_a_swimmer_is_refused(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    # 60 lengths of 50 m in 40 minutes: 1.25 m/s, a fast swimmer.
    assert (
        client.put(
            f"/me/pool-swims/{POOL_KEY}", json=swim(pool_length_m=50), headers=me
        ).status_code
        == 201
    )
    # 1000 lengths of 25 m in 40 minutes: no one.
    answer = client.put(
        "/me/pool-swims/0123456789abcdef", json=swim(lengths=1_000), headers=me
    )
    assert answer.status_code == 422


def test_the_key_of_a_run_is_not_a_swim_in_a_pool(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    answer = client.put(f"/me/pool-swims/{KEY}", json=swim(), headers=me)
    assert answer.status_code == 409
    assert client.get(f"/me/pool-swims/{KEY}", headers=me).status_code == 404


def test_only_the_gym_and_a_swim_go_without_a_track(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    kept(client, me)
    with database.connect() as conn:
        row = conn.execute(
            "SELECT user_id, activity, track IS NULL AS lineless FROM runs"
        ).fetchone()
        assert (row["activity"], row["lineless"]) == ("swimming", True)
        with pytest.raises(psycopg.errors.CheckViolation):
            conn.execute(
                "INSERT INTO runs (user_id, key, track, started_at, distance_m,"
                " duration_s, created_at, activity) VALUES"
                " (%s, 'abcdefgh12345678', NULL, now(), 0, 60, now(), 'running')",
                (row["user_id"],),
            )


def test_deleting_the_run_deletes_its_pool(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    kept(client, me)
    assert client.delete(f"/me/activities/{POOL_KEY}", headers=me).status_code == 204
    with database.connect() as conn:
        count = conn.execute("SELECT count(*) AS n FROM pool_swims").fetchone()
        assert count["n"] == 0
    assert client.get(f"/me/pool-swims/{POOL_KEY}", headers=me).status_code == 404


# --- Published without a line ---


def test_it_is_published_without_a_line_with_its_pool(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    kept(client, me)
    drawing_id = str(drawn(client, me, POOL_KEY, activity="swimming")["id"])
    with database.connect() as conn:
        row = conn.execute("SELECT track IS NULL AS lineless, trackless FROM drawings")
        assert tuple(row.fetchone().values()) == (True, True)
    seen = client.get(f"/drawings/{drawing_id}", headers=reading(reader))
    assert seen.status_code == 200, seen.text
    assert (seen.json()["activity"], seen.json()["track"]) == ("swimming", [])
    figures = client.get(f"/drawings/{drawing_id}/pool-swim", headers=reading(reader))
    assert figures.status_code == 200, figures.text
    assert figures.json() == {"pool_length_m": 25.0, "lengths": 60}
    # An app that reads no swim without a track has neither.
    assert client.get(f"/drawings/{drawing_id}", headers=reader).status_code == 404
    assert (
        client.get(f"/drawings/{drawing_id}/pool-swim", headers=reader).status_code
        == 404
    )
    assert (
        client.get("/drawings/not-an-id/pool-swim", headers=reading(me)).status_code
        == 404
    )


def test_a_drawing_cannot_change_what_a_swim_in_a_pool_was(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    kept(client, me)
    for activity in ("running", "gym"):
        drawn(client, me, POOL_KEY, status=422, activity=activity)
    drawn(client, me, POOL_KEY, activity="swimming")
    # A run with a track stays one, as before.
    drawn(client, me, KEY, status=422, activity="gym")


def test_a_private_swim_shows_nothing_to_the_others(
    client: TestClient,  # noqa: F811
) -> None:
    me, reader = signed_up(client), other(client)
    kept(client, me)
    drawing = drawn(client, me, POOL_KEY, visibility="only_me")
    path = f"/drawings/{drawing['id']}/pool-swim"
    assert client.get(path, headers=reading(reader)).status_code == 404
    assert client.get(path, headers=reading(me)).status_code == 200
