"""The takeoffs and landings on GET /flying-sites (TASK-493 part A,
ADR-0400, migration 0086): a box of the map, one site with the sites of
the other kind near it, the attribution in every answer, behind the API
key as every path."""

from __future__ import annotations

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

from shaperoute_api.access import KEY_HEADER, Access, protect
from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database
from shaperoute_api.flying_sites import (
    ATTRIBUTION,
    BOX_TOO_WIDE,
    MAX_BOX_DEG,
    NEAR_M,
    FlyingSiteBody,
    Site,
    save_sites,
)
from shaperoute_api.flying_sites_extract import flying_sites
from shaperoute_api.water_extract import read_osm_xml

SITES = Path(__file__).parent / "fixtures/flying_sites.osm.xml"
NOW = datetime(2026, 11, 23, 8, 0, tzinfo=UTC)
KEY = "a-long-enough-test-key"
# Around every made-up site.
EVERYWHERE = {"south": 45.5, "west": 10.5, "north": 46.6, "east": 11.6}


def _app(database: Database) -> TestClient:  # noqa: F811
    return TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            accounts=Accounts(database, now=WallClock(), hasher=FAST_HASHER),
            run_places=PlaceNames(None),
        )
    )


@pytest.fixture
def client(database: Database) -> TestClient:  # noqa: F811
    with database.connect() as conn:
        save_sites(conn, flying_sites(read_osm_xml(SITES)), NOW)
    return _app(database)


def _osm(answer: dict[str, object]) -> list[str]:
    sites = answer["sites"]
    assert isinstance(sites, list)
    prefix = "https://www.openstreetmap.org/"
    return [f"{s['osm_url'].removeprefix(prefix)} {s['kind']}" for s in sites]


def _id_of(client: TestClient, osm_url_end: str, kind: str) -> int:
    sites = client.get("/flying-sites", params=EVERYWHERE).json()["sites"]
    return next(
        s["id"]
        for s in sites
        if s["osm_url"].endswith(osm_url_end) and s["kind"] == kind
    )


def test_the_sites_of_a_box_with_the_attribution(client: TestClient) -> None:
    answer = client.get("/flying-sites", params=EVERYWHERE)
    assert answer.status_code == 200
    body = answer.json()
    assert body["attribution"] == ATTRIBUTION == "© OpenStreetMap contributors"
    assert body["more"] is False
    assert sorted(_osm(body)) == [
        "node/1 takeoff",
        "node/2 landing",
        "node/3 landing",
        "node/4 landing",
        "node/5 landing",
        "node/5 takeoff",
        "node/6 takeoff",
        "way/100 takeoff",
    ]
    ids = [s["id"] for s in body["sites"]]
    assert ids == sorted(ids)


def test_one_site_whole(client: TestClient) -> None:
    sites = client.get("/flying-sites", params=EVERYWHERE).json()["sites"]
    first = next(s for s in sites if s["osm_url"].endswith("/node/1"))
    assert first == {
        "id": first["id"],
        "kind": "takeoff",
        "lat": 46.0,
        "lon": 11.0,
        "name": "Monte Prova",
        "ele_m": 1200,
        "orientation": ["SE", "S", "SW"],
        "official": True,
        "osm_url": "https://www.openstreetmap.org/node/1",
        "away_m": None,
    }
    assert set(first) == set(FlyingSiteBody.model_fields)


def test_only_the_box_and_only_one_kind(client: TestClient) -> None:
    small = {"south": 45.95, "west": 10.95, "north": 46.05, "east": 11.05}
    assert sorted(_osm(client.get("/flying-sites", params=small).json())) == [
        "node/1 takeoff",
        "node/2 landing",
    ]
    takeoffs = client.get("/flying-sites", params={**EVERYWHERE, "kind": "takeoff"})
    assert sorted(_osm(takeoffs.json())) == [
        "node/1 takeoff",
        "node/5 takeoff",
        "node/6 takeoff",
        "way/100 takeoff",
    ]
    assert (
        client.get("/flying-sites", params={**EVERYWHERE, "kind": "toplanding"})
    ).status_code == 422


def test_more_when_the_box_has_more_than_the_limit(client: TestClient) -> None:
    body = client.get("/flying-sites", params={**EVERYWHERE, "limit": 3}).json()
    assert len(body["sites"]) == 3
    assert body["more"] is True
    whole = client.get("/flying-sites", params={**EVERYWHERE, "limit": 8}).json()
    assert whole["more"] is False


def test_a_box_too_wide_or_upside_down_is_refused(client: TestClient) -> None:
    wide = {**EVERYWHERE, "east": EVERYWHERE["west"] + MAX_BOX_DEG + 0.01}
    answer = client.get("/flying-sites", params=wide)
    assert answer.status_code == 422
    assert answer.json()["error"]["message"] == BOX_TOO_WIDE
    upside = {**EVERYWHERE, "south": 46.7}
    assert client.get("/flying-sites", params=upside).status_code == 422
    missing = {k: v for k, v in EVERYWHERE.items() if k != "east"}
    assert client.get("/flying-sites", params=missing).status_code == 422
    exact = {**EVERYWHERE, "east": EVERYWHERE["west"] + MAX_BOX_DEG}
    assert client.get("/flying-sites", params=exact).status_code == 200


def test_a_takeoff_with_its_landings_the_nearest_first(client: TestClient) -> None:
    site_id = _id_of(client, "/node/1", "takeoff")
    answer = client.get(f"/flying-sites/{site_id}")
    assert answer.status_code == 200
    body = answer.json()
    assert body["attribution"] == ATTRIBUTION
    assert body["site"]["id"] == site_id
    assert body["site"]["away_m"] is None
    near = body["near"]
    # Node 4 is beyond NEAR_M; takeoffs are never near a takeoff.
    assert [s["osm_url"].rsplit("/", 1)[1] for s in near] == ["2", "3"]
    assert all(s["kind"] == "landing" for s in near)
    assert 2_500 < near[0]["away_m"] < 3_000
    assert 8_500 < near[1]["away_m"] < 9_500 < NEAR_M


def test_a_landing_with_the_takeoffs_above_it(client: TestClient) -> None:
    site_id = _id_of(client, "/node/2", "landing")
    near = client.get(f"/flying-sites/{site_id}").json()["near"]
    assert [s["kind"] for s in near] == ["takeoff"] * len(near)
    assert near[0]["osm_url"].endswith("/node/1")


def test_no_site_404(client: TestClient) -> None:
    assert client.get("/flying-sites/999999").status_code == 404
    assert client.get("/flying-sites/0").status_code == 422
    assert client.get("/flying-sites/nope").status_code == 422


def test_an_empty_database_an_empty_map(database: Database) -> None:  # noqa: F811
    body = _app(database).get("/flying-sites", params=EVERYWHERE).json()
    assert body == {"sites": [], "more": False, "attribution": ATTRIBUTION}


def test_the_same_site_again_keeps_its_id(database: Database) -> None:  # noqa: F811
    site = Site("node", 1, "takeoff", (46.0, 11.0), name="Old")
    with database.connect() as conn:
        save_sites(conn, [site], NOW)
        before = conn.execute("SELECT id FROM flying_sites").fetchone()
        save_sites(conn, [Site("node", 1, "takeoff", (46.0, 11.0), name="New")], NOW)
        after = conn.execute("SELECT id, name FROM flying_sites").fetchall()
    assert before is not None
    assert [(r["id"], r["name"]) for r in after] == [(before["id"], "New")]


def test_behind_the_api_key_as_every_path(database: Database) -> None:  # noqa: F811
    app = create_app(
        FileSource(Path("unused.graphml")),
        accounts=Accounts(database, now=WallClock(), hasher=FAST_HASHER),
        run_places=PlaceNames(None),
    )
    protect(app, Access(key=KEY))
    client = TestClient(app)
    for path in (
        "/flying-sites?south=46&west=11&north=46.1&east=11.1",
        "/flying-sites/1",
    ):
        assert client.get(path).status_code == 401, path
    assert (
        client.get(
            "/flying-sites?south=46&west=11&north=46.1&east=11.1",
            headers={KEY_HEADER: KEY},
        ).status_code
        == 200
    )
