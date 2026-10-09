"""GET /recommended, the «Recommended» row of Explore (TASK-092, ADR-0229):
the catalogue's routes near a point, the best drawn first, then the most
liked, then the most run and kept; at equal quality all of them.

The order on a small fixture without a database; then the same order read
from a real PostgreSQL, through the endpoints the app calls to save a run,
publish it, react to it and keep a route."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.best_routes import (
    ROW_SIZE,
    Uses,
    line_key,
    near,
    ranked,
    shown_percent,
)
from shaperoute_api.db import Database
from shaperoute_api.recommended import CatalogRoute, LatLon, RecommendedCatalog

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)
TRENTO = (46.067, 11.1215)
# The example run's route (activity-request.json): a square from Trento.
SQUARE: list[LatLon] = [
    (46.0671, 11.1214),
    (46.0671, 11.1344),
    (46.0761, 11.1344),
    (46.0761, 11.1214),
    (46.0671, 11.1214),
]


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def moved(line: list[LatLon], north_m: float) -> list[LatLon]:
    """The same line `north_m` metres further north: another route."""
    return [(lat + north_m / 111_195, lon) for lat, lon in line]


def route(
    name: str, similarity: float, line: list[LatLon] | None = None
) -> CatalogRoute:
    points = tuple(line or SQUARE)
    return CatalogRoute(
        id=name,
        city="trento",
        shape="star",
        word=None,
        style=None,
        distance_m=5000,
        route_m=5100,
        similarity=similarity,
        points=points,
        license="ODbL",
    )


# --- The order, without a database -------------------------------------


def ids(found: list[tuple[CatalogRoute, float]]) -> list[str]:
    return [r.id for r, _ in found]


def test_the_shape_comes_first_then_reactions_then_runs() -> None:
    found = [
        (route("liked", 0.96), 100.0),
        (route("run", 0.96), 50.0),
        (route("best", 0.97), 900.0),
        (route("nothing", 0.96), 10.0),
    ]
    uses = {
        "liked": Uses(reactions=2),
        "run": Uses(runs=5, saved=3),
        "best": Uses(),
    }
    # The best drawing before any like; the likes before any number of
    # runs; the runs before nothing, even nearer.
    assert ids(ranked(found, uses)) == ["best", "liked", "run", "nothing"]


def test_runs_and_favorites_count_together() -> None:
    found = [(route("kept", 0.9), 0.0), (route("run", 0.9), 0.0)]
    uses = {"kept": Uses(runs=1, saved=2), "run": Uses(runs=2)}
    assert ids(ranked(found, uses)) == ["kept", "run"]


def test_equally_good_routes_are_all_kept_the_nearer_first() -> None:
    # Two routes on the same streets, as good and as used: both stay
    # (ADR-0086, user 2026-10-01).
    found = [(route("far", 0.95), 800.0), (route("near", 0.95), 200.0)]
    uses = {"far": Uses(runs=1), "near": Uses(runs=1)}
    assert ids(ranked(found, uses)) == ["near", "far"]


def test_the_same_percent_is_the_same_quality() -> None:
    # 0.9651 and 0.9649 are "97%" and "96%"; 0.9651 and 0.9699 are both
    # "97%", and there the liked one wins.
    assert shown_percent(0.9651) == 97
    assert shown_percent(0.9649) == 96
    found = [(route("a", 0.9699), 0.0), (route("b", 0.9651), 0.0)]
    assert ids(ranked(found, {"b": Uses(reactions=1)})) == ["b", "a"]


def test_the_key_is_the_apps_favorite_key() -> None:
    # Written down in apps/mobile/src/favorites/favoriteKey.test.ts.
    assert line_key([(46.067, 11.1215), (46.07, 11.123)]) == "680c391da0dfaa4f"
    # South and west of zero, as the app's (computed with favoriteKey).
    assert line_key([(-33.8688, 151.2093), (-33.87, 151.21)]) == "24850f1e49fd068a"
    # Less than a metre apart is the same line.
    assert line_key(SQUARE) == line_key([(a + 2e-6, b - 2e-6) for a, b in SQUARE])
    assert line_key(SQUARE) != line_key(moved(SQUARE, 20))


def test_near_is_within_the_radius() -> None:
    catalog = RecommendedCatalog(
        [route("here", 0.9), route("far", 0.99, moved(SQUARE, 6_000))]
    )
    assert ids(near(catalog, TRENTO, 5_000)) == ["here"]


# --- Read from the database ---------------------------------------------


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


LINES = {
    # "best": the best drawing, used by nobody.
    "best": moved(SQUARE, 0),
    # "liked": a published run with two reactions.
    "liked": moved(SQUARE, 30),
    # "run": two runs and a favorite, no reactions.
    "run": moved(SQUARE, 60),
    # "near" and "far": as good, as unused: both, the nearer first.
    "near": moved(SQUARE, 90),
    "far": moved(SQUARE, 600),
}
SIMILARITY = {"best": 0.97, "liked": 0.96, "run": 0.96, "near": 0.96, "far": 0.96}


@pytest.fixture
def catalog() -> RecommendedCatalog:
    return RecommendedCatalog(
        route(name, SIMILARITY[name], line) for name, line in LINES.items()
    )


def client_of(database: Database | None, catalog: RecommendedCatalog) -> TestClient:
    return TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            accounts=(
                None if database is None else Accounts(database, hasher=FAST_HASHER)
            ),
            run_places=PlaceNames(None),
            recommended=catalog,
        )
    )


def signed_up(client: TestClient, name: str) -> dict[str, str]:
    body = {**_load("sign-up-request.json"), "email": f"{name}@example.com"}
    answer = client.post("/accounts", json={**body, "username": name})
    assert answer.status_code == 201, answer.text
    return {"Authorization": f"Bearer {answer.json()['token']}"}


def ran(
    client: TestClient, headers: dict[str, str], key: str, line: list[LatLon]
) -> None:
    """A run along `line`, saved in «My activities» as the app sends it."""
    run = {**_load("activity-request.json"), "points": line}
    answer = client.put(f"/me/activities/{key}", json=run, headers=headers)
    assert answer.status_code in (200, 201), answer.text


def published(client: TestClient, headers: dict[str, str], key: str) -> str:
    answer = client.put(
        f"/me/activities/{key}/drawing",
        json={"title": "Sunday star", "public": True},
        headers=headers,
    )
    assert answer.status_code == 200, answer.text
    return str(answer.json()["id"])


def kept(client: TestClient, headers: dict[str, str], line: list[LatLon]) -> None:
    """A route kept among the favorites, with the app's key."""
    body = {**_load("favorite-request.json"), "points": line}
    answer = client.put(f"/me/favorites/{line_key(line)}", json=body, headers=headers)
    assert answer.status_code in (200, 201), answer.text


def row(client: TestClient, headers: dict[str, str], **query: Any) -> list[str]:
    params = {"lat": TRENTO[0], "lon": TRENTO[1], **query}
    answer = client.get("/recommended", params=params, headers=headers)
    assert answer.status_code == 200, answer.text
    return [r["id"] for r in answer.json()["routes"]]


def test_the_row_reads_reactions_runs_and_favorites(
    database: Database, catalog: RecommendedCatalog
) -> None:
    client = client_of(database, catalog)
    ann, bob, cid = (signed_up(client, n) for n in ("ann", "bob", "cid"))
    # Ann publishes her run along "liked"; Bob and Cid react to it.
    ran(client, ann, "annliked1", LINES["liked"])
    drawing = published(client, ann, "annliked1")
    for who, kind in ((bob, "fire"), (cid, "clap")):
        answer = client.put(
            f"/drawings/{drawing}/reaction", json={"kind": kind}, headers=who
        )
        assert answer.status_code == 200, answer.text
    # "run" is run twice, never published, and kept once.
    ran(client, bob, "bobrun001", LINES["run"])
    ran(client, cid, "cidrun001", LINES["run"])
    kept(client, ann, LINES["run"])
    # A run along a line of no catalogue route counts for none.
    ran(client, ann, "annother1", moved(SQUARE, 300))

    assert row(client, bob) == ["best", "liked", "run", "near", "far"]


def test_a_drawing_made_private_again_has_no_say(
    database: Database, catalog: RecommendedCatalog
) -> None:
    client = client_of(database, catalog)
    ann, bob = signed_up(client, "ann"), signed_up(client, "bob")
    ran(client, ann, "annnear01", LINES["near"])
    drawing = published(client, ann, "annnear01")
    answer = client.put(
        f"/drawings/{drawing}/reaction", json={"kind": "wow"}, headers=bob
    )
    assert answer.status_code == 200, answer.text
    assert row(client, bob)[:2] == ["best", "near"]
    answer = client.put(
        "/me/activities/annnear01/drawing",
        json={"title": "Sunday star", "public": False},
        headers=ann,
    )
    assert answer.status_code == 200, answer.text
    # Still run once: before "liked" and "run", which nobody touched now.
    assert row(client, bob)[:2] == ["best", "near"]
    ran(client, bob, "bobliked1", LINES["liked"])
    ran(client, ann, "annliked1", LINES["liked"])
    assert row(client, bob)[:3] == ["best", "liked", "near"]


def test_a_row_of_ten_weighs_under_100_kb(database: Database) -> None:
    # Long lines: the row carries only their 64-point previews.
    long_line = [(46.067 + i * 1e-5, 11.1215 + (i % 7) * 1e-5) for i in range(2000)]
    catalog = RecommendedCatalog(
        route(f"r{i}", 0.9, moved(long_line, i * 5)) for i in range(15)
    )
    client = client_of(database, catalog)
    headers = signed_up(client, "ann")
    answer = client.get(
        "/recommended", params={"lat": TRENTO[0], "lon": TRENTO[1]}, headers=headers
    )
    assert answer.status_code == 200, answer.text
    routes = answer.json()["routes"]
    assert len(routes) == ROW_SIZE == 10
    assert all(len(r["preview"]) == 64 for r in routes)
    assert len(answer.content) < 100_000


def test_the_body_is_the_list_of_recommended_routes(
    database: Database, catalog: RecommendedCatalog
) -> None:
    # The app reads it as GET /recommended-routes: recommended-routes.json.
    client = client_of(database, catalog)
    answer = client.get(
        "/recommended",
        params={"lat": TRENTO[0], "lon": TRENTO[1], "limit": 2},
        headers=signed_up(client, "ann"),
    )
    contract = _load("recommended-routes.json")["routes"][0]
    routes = answer.json()["routes"]
    assert len(routes) == 2
    assert all(set(r) == set(contract) for r in routes)


def test_nothing_near_is_an_empty_row(database: Database) -> None:
    client = client_of(database, RecommendedCatalog([]))
    assert row(client, signed_up(client, "ann")) == []


def test_without_a_token_401(database: Database, catalog: RecommendedCatalog) -> None:
    client = client_of(database, catalog)
    answer = client.get("/recommended", params={"lat": 46.0, "lon": 11.0})
    assert answer.status_code == 401
    assert answer.json()["error"]["code"] == "not_signed_in"


def test_without_a_database_503(catalog: RecommendedCatalog) -> None:
    answer = client_of(None, catalog).get(
        "/recommended", params={"lat": 46.0, "lon": 11.0}
    )
    assert answer.status_code == 503
