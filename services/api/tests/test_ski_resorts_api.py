"""The ski resorts in the database and on GET /ski-resorts (TASK-406 part A,
ADR-0338, migration 0054): found by name or near a place, one by id, behind
the API key as every path, with a limit on what one search gives."""

from __future__ import annotations

import json
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from test_personal_bests import (
    FAST_HASHER,
    WallClock,
    database,  # noqa: F401  (the fixture of the bests' tests)
)

from shaperoute_api import resort_import
from shaperoute_api.access import KEY_HEADER, Access, protect
from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import DATABASE_VARIABLE, Database
from shaperoute_api.resort_import import resorts_of
from shaperoute_api.ski_resorts import (
    MAX_FOUND,
    Resort,
    delete_missing,
    resorts_named,
    save_resorts,
)
from shaperoute_api.ski_resorts_api import install_ski_resorts

AREAS = Path(__file__).parent / "fixtures" / "ski" / "ski_areas.geojson"
NOW = datetime(2026, 11, 6, 12, 0, tzinfo=UTC)
KEY = "a-long-enough-test-key"


def _resorts() -> list[Resort]:
    features = json.loads(AREAS.read_text(encoding="utf-8"))["features"]
    return resorts_of(features).resorts


def _app(database: Database) -> TestClient:  # noqa: F811
    app = create_app(
        FileSource(Path("unused.graphml")),
        accounts=Accounts(database, now=WallClock(), hasher=FAST_HASHER),
        run_places=PlaceNames(None),
    )
    install_ski_resorts(app)
    return TestClient(app)


@pytest.fixture
def client(database: Database) -> TestClient:  # noqa: F811
    with database.connect() as conn:
        save_resorts(conn, _resorts(), NOW)
    return _app(database)


def _ids(answer: object) -> list[str]:
    assert hasattr(answer, "json")
    return [r["id"] for r in answer.json()["resorts"]]  # type: ignore[attr-defined]


def test_by_name_ignoring_case_the_names_that_start_with_it_first(
    client: TestClient,
) -> None:
    assert _ids(client.get("/ski-resorts", params={"q": "test valley"})) == ["aaa1"]
    # «hill» starts no name: «Little Hill», by lifts then name.
    assert _ids(client.get("/ski-resorts", params={"q": "HILL"})) == ["bbb2"]
    # «l» is in three names; «Little Hill» starts with it, then the most lifts.
    assert _ids(client.get("/ski-resorts", params={"q": "l"})) == [
        "bbb2",
        "aaa1",
        "ccc3",
    ]
    # Left out at the import: never found.
    assert _ids(client.get("/ski-resorts", params={"q": "Closed"})) == []


def test_a_name_with_percent_or_underscore_is_read_as_text(client: TestClient) -> None:
    assert _ids(client.get("/ski-resorts", params={"q": "100%"})) == ["hhh8"]
    assert _ids(client.get("/ski-resorts", params={"q": "w_p"})) == ["hhh8"]
    assert _ids(client.get("/ski-resorts", params={"q": "%"})) == ["hhh8"]


def test_near_a_place_the_nearest_first_with_how_far(client: TestClient) -> None:
    # Trento: Little Hill, then the valley, then the park, then Norway.
    answer = client.get("/ski-resorts", params={"lat": 46.07, "lon": 11.12, "limit": 3})
    assert answer.status_code == 200
    resorts = answer.json()["resorts"]
    assert [r["id"] for r in resorts] == ["bbb2", "aaa1", "hhh8"]
    assert resorts[0]["away_m"] < 50
    assert 60_000 < resorts[1]["away_m"] < 80_000


def test_one_resort_whole(client: TestClient) -> None:
    answer = client.get("/ski-resorts/aaa1")
    assert answer.status_code == 200
    assert answer.json() == {
        "id": "aaa1",
        "name": "Test Valley, Testtal",
        "country": "IT",
        "region": "Bolzano/Bozen",
        "lat": 46.55,
        "lon": 11.75,
        "bbox": [46.5, 11.7, 46.6, 11.8],
        "lifts": 4,
        "piste_km": 15.8,
        "piste_km_by_difficulty": {"easy": 10.2, "advanced": 5.5},
        "min_elevation_m": 1200,
        "max_elevation_m": 2500,
        "website": "https://valley.example/",
        "away_m": None,
    }
    missing = client.get("/ski-resorts/nope")
    assert missing.status_code == 404
    assert missing.json()["error"]["message"] == "No ski resort with this id."


def test_by_name_or_by_place_never_both_never_neither(client: TestClient) -> None:
    for params in (
        {},
        {"q": "   "},
        {"lat": 46.0},
        {"q": "Hill", "lat": 46.0, "lon": 11.0},
    ):
        answer = client.get("/ski-resorts", params=params)
        assert answer.status_code == 422, params
    assert client.get("/ski-resorts", params={"q": "x" * 61}).status_code == 422
    assert client.get("/ski-resorts", params={"lat": 91, "lon": 0}).status_code == 422


def test_one_search_gives_at_most_max_found(database: Database) -> None:  # noqa: F811
    many = [
        Resort(
            f"r{i:03d}",
            f"Resort {i:03d}",
            None,
            None,
            (46.0, 11.0 + i / 1000),
            (46.0, 11.0, 46.0, 11.0),
            lifts=i,
            piste_km=1.0,
        )
        for i in range(MAX_FOUND + 5)
    ]
    with database.connect() as conn:
        save_resorts(conn, many, NOW)
        assert len(resorts_named(conn, "Resort", 500)) == MAX_FOUND
        # The most lifts first, among names that all start with it.
        assert resorts_named(conn, "Resort", 2)[0].id == f"r{MAX_FOUND + 4:03d}"
    client = _app(database)
    assert (
        client.get(
            "/ski-resorts", params={"q": "R", "limit": MAX_FOUND + 1}
        ).status_code
        == 422
    )
    found = client.get(
        "/ski-resorts", params={"lat": 46.0, "lon": 11.0, "limit": MAX_FOUND}
    )
    assert len(found.json()["resorts"]) == MAX_FOUND


def test_an_import_again_replaces_and_a_clean_one_removes(
    database: Database,  # noqa: F811
) -> None:
    resorts = _resorts()
    with database.connect() as conn:
        assert save_resorts(conn, resorts, NOW) == 4
        renamed = [Resort(**{**vars(resorts[0]), "name": "Renamed Valley"})]
        assert save_resorts(conn, renamed, NOW) == 1
        assert [r.name for r in resorts_named(conn, "Valley", 10)] == ["Renamed Valley"]
        assert delete_missing(conn, ["aaa1"]) == 3
        count = conn.execute("SELECT count(*) AS n FROM ski_resorts").fetchone()
    assert count is not None and count["n"] == 1


def test_behind_the_api_key_as_every_path(database: Database) -> None:  # noqa: F811
    app = create_app(
        FileSource(Path("unused.graphml")),
        accounts=Accounts(database, now=WallClock(), hasher=FAST_HASHER),
        run_places=PlaceNames(None),
    )
    install_ski_resorts(app)
    protect(app, Access(key=KEY))
    client = TestClient(app)
    for path in ("/ski-resorts?q=Hill", "/ski-resorts/aaa1", "/ski-resorts/nope"):
        assert client.get(path).status_code == 401, path
    assert (
        client.get("/ski-resorts?q=Hill", headers={KEY_HEADER: KEY}).status_code == 200
    )


def _count(database: Database) -> int:  # noqa: F811
    with database.connect() as conn:
        row = conn.execute("SELECT count(*) AS n FROM ski_resorts").fetchone()
    assert row is not None
    return int(row["n"])


def test_the_import_writes_every_resort_or_none(
    database: Database,  # noqa: F811
) -> None:
    resorts = _resorts()
    # The third breaks a CHECK of 0054: the first two go back too.
    bad = [resorts[0], resorts[1], replace(resorts[2], name="")]
    with pytest.raises(Exception, match="ski_resorts_name_check"):
        with database.connect() as conn:
            save_resorts(conn, bad, NOW)
    assert _count(database) == 0


def test_the_command_imports_the_file(
    database: Database,  # noqa: F811
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv(DATABASE_VARIABLE, database.url)
    assert resort_import.main(["--geojson", str(AREAS)]) == 0
    assert "Saved 4 ski resorts, left out 3, removed 0" in capsys.readouterr().out
    assert _count(database) == 4
    with database.connect() as conn:
        save_resorts(conn, [replace(_resorts()[0], id="gone")], NOW)
    assert resort_import.main(["--geojson", str(AREAS), "--clean"]) == 0
    assert "removed 1" in capsys.readouterr().out
    assert _count(database) == 4
