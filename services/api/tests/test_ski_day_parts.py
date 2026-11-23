"""The parts of a saved day of skiing on its post (TASK-429 part C1,
ADR-0357): the lifts and descents the phone sent in the run's figures
(`ski_parts`, TASK-424 part C2b), with the fixes of the post's track each
covers and the name of its lift or piste; a day without them answers as
before.

The days are the 5.1 km of the bests' tests (test_personal_bests.py): 51
fixes, 100 m and 30 s apart.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
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
    published,
    saved,
    signed_up,
)

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.ski_day_parts import (
    CACHE_DAYS,
    CACHE_SECONDS,
    MAX_PARTS,
    NamesCache,
    SkiDayPartBody,
    StoredPartBody,
    day_parts,
    fixes_between,
    part_name,
    stored_parts,
)
from shaperoute_api.ski_days import SkiDayPartsBody, install_ski_days
from shaperoute_api.ski_names import NOTHING, SkiNames, Used

SKIING = {"X-MuW-Reads": "skiing"}
# A lift up the first 20 fixes, then a descent along the 30 after.
LIFT = {
    "kind": "lift",
    "n": 1,
    "start_ms": 1_793_664_000_000,
    "end_ms": 1_793_664_600_000,
    "moving_s": 600,
    "metres": 2000,
    "height_m": 400,
    "top_mps": None,
    "start_s": 0,
    "end_s": 600,
}
DESCENT = {
    "kind": "descent",
    "n": 1,
    "start_ms": 1_793_664_600_000,
    "end_ms": 1_793_665_500_000,
    "moving_s": 880,
    "metres": 3000,
    "height_m": 398.5,
    "top_mps": 19.4,
    "start_s": 600,
    "end_s": 1500,
}


def _named(lift: str | None, piste: str | None) -> SkiNames:
    return SkiNames(
        lifts=() if lift is None else (Used("lift", lift, "chair_lift", 1),),
        pistes=() if piste is None else (Used("piste", piste, "advanced", 1),),
    )


# --- The parts as kept, their fixes, their names ---


def test_only_parts_are_read_from_the_figures() -> None:
    assert stored_parts(None) == []
    assert stored_parts({"kcal": 300}) == []
    assert stored_parts({"ski_parts": "no"}) == []
    parts = stored_parts(
        {"ski_parts": [LIFT, {"kind": "jump"}, "x", {**DESCENT, "extra": 1}]}
    )
    assert [(p.kind, p.n) for p in parts] == [("lift", 1), ("descent", 1)]
    many = stored_parts({"ski_parts": [LIFT] * (MAX_PARTS + 20)})
    assert len(many) == MAX_PARTS


def test_a_part_covers_the_fixes_in_its_time() -> None:
    seconds = [0.0, 30.0, 60.0, 90.0, 120.0]
    assert fixes_between(seconds, 30, 90) == (1, 3)
    # A rounded second still counts.
    assert fixes_between(seconds, 29.7, 90.4) == (1, 3)
    assert fixes_between(seconds, None, 90) is None
    assert fixes_between(seconds, 90, 30) is None
    # One fix is no stretch.
    assert fixes_between(seconds, 50, 70) is None


def test_a_lift_takes_its_lifts_name_and_a_descent_its_pistes() -> None:
    names = _named("Ciampinoi", "Saslong")
    assert part_name("lift", names) == "Ciampinoi"
    assert part_name("descent", names) == "Saslong"
    assert part_name("lift", _named(None, "Saslong")) is None
    assert part_name("descent", NOTHING) is None


def test_the_parts_get_their_fixes_and_the_names_of_their_stretches() -> None:
    fixes = [(46.0 + i / 1000, 11.0, i * 30.0) for i in range(51)]
    asked: list[int] = []

    def namer(points: Any) -> SkiNames:
        asked.append(len(points))
        return (
            _named("Ciampinoi", None) if len(points) == 21 else _named(None, "Saslong")
        )

    stored = [StoredPartBody.model_validate(p) for p in (LIFT, DESCENT)]
    lift, descent = day_parts(stored, fixes, namer)
    assert (lift.from_fix, lift.to_fix, lift.name) == (0, 20, "Ciampinoi")
    assert (descent.from_fix, descent.to_fix, descent.name) == (20, 50, "Saslong")
    assert asked == [21, 31]
    assert lift.top_mps is None
    assert descent.top_mps == 19.4


def test_a_part_without_times_has_no_fixes_and_no_name() -> None:
    stored = [StoredPartBody.model_validate({**LIFT, "start_s": None, "end_s": None})]
    (part,) = day_parts(
        stored, [(46.0, 11.0, 0.0), (46.1, 11.0, 30.0)], lambda _: NOTHING
    )
    assert (part.from_fix, part.to_fix, part.name) == (None, None, None)


# --- The cache: small, short, by run and figures ---


def test_the_cache_keeps_a_day_for_a_while_and_only_so_many() -> None:
    now = [0.0]
    cache = NamesCache(size=2, seconds=10, clock=lambda: now[0])
    made: list[int] = []

    def make(run: int) -> Any:
        return lambda: made.append(run) or []

    cache.get((1, "a"), make(1))
    cache.get((1, "a"), make(1))
    assert made == [1]
    # New figures are another key.
    cache.get((1, "b"), make(1))
    assert made == [1, 1]
    now[0] = 11
    cache.get((1, "b"), make(1))
    assert made == [1, 1, 1]
    cache.get((2, "a"), make(2))
    cache.get((3, "a"), make(3))
    assert len(cache) == 2
    assert (CACHE_DAYS, CACHE_SECONDS) == (256, 600.0)


# --- The route ---


@pytest.fixture
def client(database: Database) -> TestClient:  # noqa: F811
    app = create_app(
        FileSource(Path("unused.graphml")),
        accounts=Accounts(database, now=WallClock(), hasher=FAST_HASHER),
        run_places=PlaceNames(None),
    )
    install_ski_days(app)
    return TestClient(app)


def _with_parts(database: Database, key: str, parts: list[Any]) -> None:  # noqa: F811
    with database.connect() as conn:
        conn.execute(
            "INSERT INTO run_stats (run_id, stats, updated_at)"
            " SELECT id, %s::jsonb, %s FROM runs WHERE key = %s",
            (json.dumps({"ski_parts": parts}), datetime.now(UTC), key),
        )


def test_the_post_gives_the_parts_with_their_fixes(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me, other = signed_up(client, 1), signed_up(client, 2)
    saved(client, me, KEYS[0], five_k(30, day=2, activity="skiing"))
    drawing = published(client, me, KEYS[0], "everyone")
    _with_parts(database, KEYS[0], [LIFT, DESCENT])
    for viewer in (me, other):
        answer = client.get(
            f"/drawings/{drawing}/ski-day", headers={**viewer, **SKIING}
        )
        assert answer.status_code == 200, answer.text
        body = answer.json()
        assert body["resort"] is None
        lift, descent = body["parts"]
        assert (lift["kind"], lift["n"], lift["from_fix"], lift["to_fix"]) == (
            "lift",
            1,
            0,
            20,
        )
        assert (descent["from_fix"], descent["to_fix"]) == (20, 50)
        assert descent["top_mps"] == 19.4
        # No ski tiles in the tests: no names.
        assert lift["name"] is None


def test_a_day_without_parts_answers_as_before(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client, 1)
    saved(client, me, KEYS[0], five_k(30, day=2, activity="skiing"))
    drawing = published(client, me, KEYS[0], "everyone")
    answer = client.get(f"/drawings/{drawing}/ski-day", headers={**me, **SKIING})
    # No «parts» at all: an app before them reads what it always read.
    assert answer.json() == {"resort": None, "gear": None, "snow": None}
    _with_parts(database, KEYS[0], [{"kind": "jump"}])
    again = client.get(f"/drawings/{drawing}/ski-day", headers={**me, **SKIING})
    assert again.json() == {"resort": None, "gear": None, "snow": None}


def test_the_example_is_the_body() -> None:
    example = json.loads((FIXTURES / "ski-day-parts.json").read_text(encoding="utf-8"))
    assert set(example) == set(SkiDayPartsBody.model_fields)
    SkiDayPartsBody.model_validate(example)
    for part in example["parts"]:
        assert set(part) == set(SkiDayPartBody.model_fields)
