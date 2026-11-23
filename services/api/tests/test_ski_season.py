"""The season of a skier (TASK-429 part C1, ADR-0357): GET /me/ski-season
sums the asker's own days of skiing between two days, from the lifts and
descents the phone sent (`ski_parts`); a day saved before them counts as a
day only.

The days are the 5.1 km of the bests' tests (test_personal_bests.py), on the
first of November 2026 plus `day`; their clock is the third, 09:00 UTC.
"""

from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from test_personal_bests import (
    FAST_HASHER,
    FIXTURES,
    KEYS,
    WallClock,
    database,  # noqa: F401  (the fixture of the bests' tests)
    five_k,
    saved,
    signed_up,
)
from test_ski_day_parts import DESCENT, LIFT

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.ski_day_parts import StoredPartBody
from shaperoute_api.ski_season import (
    MAX_SEASON_DAYS,
    SkiSeasonBody,
    install_ski_season,
    season_of,
)

SEASON = {"from": "2026-11-01", "to": "2027-04-30"}
# Another skier's day, under a key of its own.
OTHERS_KEY = "d4e5f60718293a4b"
FASTER = {**DESCENT, "n": 2, "top_mps": 22.5, "metres": 1000, "height_m": 300}


def _parts(*rows: dict[str, Any]) -> list[StoredPartBody]:
    return [StoredPartBody.model_validate(row) for row in rows]


def test_the_sums_of_the_parts_and_the_days_without() -> None:
    season = season_of(
        date(2026, 11, 1),
        date(2027, 4, 30),
        [_parts(LIFT, DESCENT), _parts(LIFT, FASTER), []],
    )
    assert season.days == 3
    assert season.days_with_parts == 2
    assert season.descents == 2
    assert season.lifts == 2
    assert season.skied_m == 4000
    assert season.vertical_m == 698.5
    assert season.top_mps == 22.5
    assert season.moving_s == 600 + 880 + 600 + 880


def test_no_days_no_numbers() -> None:
    season = season_of(date(2026, 11, 1), date(2027, 4, 30), [])
    assert (season.days, season.descents, season.top_mps) == (0, 0, None)


@pytest.fixture
def client(database: Database) -> TestClient:  # noqa: F811
    app = create_app(
        FileSource(Path("unused.graphml")),
        accounts=Accounts(database, now=WallClock(), hasher=FAST_HASHER),
        run_places=PlaceNames(None),
    )
    install_ski_season(app)
    return TestClient(app)


def _with_parts(database: Database, key: str, parts: list[Any]) -> None:  # noqa: F811
    with database.connect() as conn:
        conn.execute(
            "INSERT INTO run_stats (run_id, stats, updated_at)"
            " SELECT id, %s::jsonb, %s FROM runs WHERE key = %s",
            (json.dumps({"ski_parts": parts}), datetime.now(UTC), key),
        )


def test_the_season_counts_only_ones_own_days_of_skiing_in_it(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, other = signed_up(client, 1), signed_up(client, 2)
    saved(client, me, KEYS[0], five_k(30, day=2, activity="skiing"))
    _with_parts(database, KEYS[0], [LIFT, DESCENT])
    saved(client, me, KEYS[1], five_k(30, day=1, activity="skiing"))
    # A run, and another's day, do not count.
    saved(client, me, KEYS[2], five_k(30, day=0))
    saved(client, other, OTHERS_KEY, five_k(30, day=0, activity="skiing"))
    _with_parts(database, OTHERS_KEY, [LIFT, FASTER])
    answer = client.get("/me/ski-season", params=SEASON, headers=me)
    assert answer.status_code == 200, answer.text
    body = answer.json()
    assert body["from"] == "2026-11-01"
    assert body["to"] == "2027-04-30"
    assert (body["days"], body["days_with_parts"]) == (2, 1)
    assert (body["descents"], body["lifts"]) == (1, 1)
    assert body["skied_m"] == 3000
    assert body["top_mps"] == 19.4
    # Outside the days asked, nothing.
    before = client.get(
        "/me/ski-season", params={"from": "2026-10-01", "to": "2026-11-01"}, headers=me
    )
    assert before.json()["days"] == 0


def test_the_season_needs_an_account_and_sensible_days(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client, 1)
    assert client.get("/me/ski-season", params=SEASON).status_code == 401
    backwards = {"from": "2027-04-30", "to": "2026-11-01"}
    assert client.get("/me/ski-season", params=backwards, headers=me).status_code == 422
    long = {"from": "2026-01-01", "to": "2027-12-31"}
    assert client.get("/me/ski-season", params=long, headers=me).status_code == 422
    assert client.get("/me/ski-season", headers=me).status_code == 422
    assert MAX_SEASON_DAYS == 400


def test_the_example_is_the_body() -> None:
    example = json.loads((FIXTURES / "ski-season.json").read_text(encoding="utf-8"))
    assert set(example) == {"from", "to"} | (
        set(SkiSeasonBody.model_fields) - {"from_day", "to_day"}
    )
    SkiSeasonBody.model_validate(
        {**example, "from_day": example["from"], "to_day": example["to"]}
    )
