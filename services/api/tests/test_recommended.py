"""GET /recommended-routes and /recommended-routes/{id} (TASK-126, ADR-0098).

The catalogue is tests/fixtures/catalog: three shapes and a word at Trento,
and a file
that does not read. The bodies the app reads are
packages/shared-types/fixtures/recommended-routes.json and
recommended-route.json."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.app import create_app
from shaperoute_api.recommended import (
    RecommendedCatalog,
    distance_m,
    parse_city,
    preview,
    turn_of,
)

HERE = Path(__file__).parent
REPO = HERE.parents[2]
CATALOG = HERE / "fixtures" / "catalog"
CONTRACT = REPO / "packages" / "shared-types" / "fixtures"
PIAZZA_DUOMO = {"lat": 46.067, "lon": 11.1215}


def client(catalog: RecommendedCatalog | None) -> TestClient:
    return TestClient(create_app(FileSource(HERE), recommended=catalog))


@pytest.fixture
def api() -> TestClient:
    return client(RecommendedCatalog.from_dir(CATALOG))


def test_a_file_that_does_not_read_is_left_out() -> None:
    catalog = RecommendedCatalog.from_dir(CATALOG)
    assert len(catalog) == 4


def test_the_list_is_the_shared_contract(api: TestClient) -> None:
    answer = api.get("/recommended-routes", params=PIAZZA_DUOMO)
    assert answer.status_code == 200
    contract = json.loads((CONTRACT / "recommended-routes.json").read_text("utf-8"))
    assert answer.json() == contract


def test_one_route_is_the_shared_contract(api: TestClient) -> None:
    answer = api.get("/recommended-routes/trento-star-5000-0")
    assert answer.status_code == 200
    contract = json.loads((CONTRACT / "recommended-route.json").read_text("utf-8"))
    assert answer.json() == contract


def test_the_best_first_and_far_ones_left_out(api: TestClient) -> None:
    routes = api.get("/recommended-routes", params=PIAZZA_DUOMO).json()["routes"]
    # The 21 km heart starts 3.8 km away: inside 5 km, outside 3 km.
    assert [r["id"] for r in routes] == [
        "trento-star-5000-0",
        "trento-heart-10000-1",
        "trento-heart-21000-2",
        "trento-ciao-15000-3",
    ]
    near = api.get("/recommended-routes", params={**PIAZZA_DUOMO, "radius_m": 3000})
    assert [r["id"] for r in near.json()["routes"]] == [
        "trento-star-5000-0",
        "trento-heart-10000-1",
        "trento-ciao-15000-3",
    ]


def test_equally_good_routes_are_all_kept_nearest_first(api: TestClient) -> None:
    far_point = {"lat": 46.09, "lon": 11.15}
    routes = api.get(
        "/recommended-routes", params={**far_point, "shape": "heart"}
    ).json()["routes"]
    assert [r["id"] for r in routes] == [
        "trento-heart-21000-2",
        "trento-heart-10000-1",
    ]


@pytest.mark.parametrize(
    ("params", "ids"),
    [
        ({"shape": "heart"}, ["trento-heart-10000-1", "trento-heart-21000-2"]),
        ({"distance_m": 5000}, ["trento-star-5000-0"]),
        ({"shape": "cat"}, []),
        ({"shape": "CIAO"}, ["trento-ciao-15000-3"]),
    ],
)
def test_filters(api: TestClient, params: dict[str, Any], ids: list[str]) -> None:
    routes = api.get("/recommended-routes", params={**PIAZZA_DUOMO, **params})
    assert [r["id"] for r in routes.json()["routes"]] == ids


def test_unknown_id_is_404(api: TestClient) -> None:
    assert api.get("/recommended-routes/trento-cat-5000-9").status_code == 404


@pytest.mark.parametrize(
    "params",
    [{}, {"lat": 46.0}, {"lat": 91, "lon": 11}, {**PIAZZA_DUOMO, "radius_m": 10}],
)
def test_a_bad_query_is_invalid(api: TestClient, params: dict[str, Any]) -> None:
    assert api.get("/recommended-routes", params=params).status_code == 422


def test_without_a_catalogue_the_list_is_empty() -> None:
    answer = client(None).get("/recommended-routes", params=PIAZZA_DUOMO)
    assert answer.json() == {"routes": []}


def test_preview_keeps_ends_and_at_most_size_points() -> None:
    line = [(46.0 + i / 1000, 11.0) for i in range(1000)]
    small = preview(line, 64)
    assert len(small) == 64
    assert small[0] == (46.0, 11.0)
    assert small[-1] == (46.999, 11.0)
    assert preview(line[:3], 64) == [(46.0, 11.0), (46.001, 11.0), (46.002, 11.0)]


def test_distance_one_degree_of_latitude() -> None:
    assert distance_m((46.0, 11.0), (47.0, 11.0)) == pytest.approx(111_195, abs=1)


def test_the_catalogue_says_how_far_a_shape_is_turned(api: TestClient) -> None:
    """TASK-232 part C: `rotation_deg` as the engine's seed_catalog writes
    it, 0 for a route north up or one of a file written before."""
    listed = api.get("/recommended-routes", params=PIAZZA_DUOMO).json()["routes"]
    assert {r["id"]: r["rotation_deg"] for r in listed} == {
        "trento-star-5000-0": -30,
        "trento-heart-10000-1": 0,
        "trento-heart-21000-2": 0,
        "trento-ciao-15000-3": 0,
    }
    assert (
        api.get("/recommended-routes/trento-star-5000-0").json()["rotation_deg"] == -30
    )
    assert (
        api.get("/recommended-routes/trento-heart-10000-1").json()["rotation_deg"] == 0
    )


@pytest.mark.parametrize(
    ("said", "turn"),
    [
        ({}, 0.0),
        ({"rotation_deg": -30}, -30.0),
        ({"rotation_deg": 22.5}, 22.5),
        ({"rotation_deg": 0}, 0.0),
        ({"rotation_deg": "30"}, 0.0),
        ({"rotation_deg": True}, 0.0),
        ({"rotation_deg": None}, 0.0),
        ({"rotation_deg": 181}, 0.0),
        ({"rotation_deg": float("nan")}, 0.0),
    ],
)
def test_a_turn_that_does_not_read_is_north_up(
    said: dict[str, Any], turn: float
) -> None:
    assert turn_of(said) == turn
    route = {
        "shape": "heart",
        "distance_m": 5000,
        "route_m": 5000,
        "similarity": 0.9,
        "points": [[46.0, 11.0], [46.001, 11.0]],
        **said,
    }
    (parsed,) = parse_city({"city": "x", "routes": [route]})
    assert parsed.rotation_deg == turn


def test_a_route_of_one_point_is_left_out() -> None:
    body = {
        "city": "x",
        "routes": [
            {
                "shape": "heart",
                "distance_m": 5000,
                "route_m": 5000,
                "similarity": 0.9,
                "points": [[46.0, 11.0]],
            }
        ],
    }
    assert parse_city(body) == []


def test_a_word_has_its_word_and_style_and_no_shape(api: TestClient) -> None:
    route = api.get("/recommended-routes/trento-ciao-15000-3").json()
    assert (route["shape"], route["word"], route["style"]) == (None, "CIAO", "block")
    star = api.get("/recommended-routes/trento-star-5000-0").json()
    assert (star["shape"], star["word"], star["style"]) == ("star", None, None)


def test_a_route_with_both_or_neither_is_left_out() -> None:
    line = [[46.0, 11.0], [46.1, 11.1]]
    both = {
        "shape": "heart",
        "word": "CIAO",
        "distance_m": 5000,
        "route_m": 5000,
        "similarity": 0.9,
        "points": line,
    }
    neither = {"distance_m": 5000, "route_m": 5000, "similarity": 0.9, "points": line}
    assert parse_city({"city": "x", "routes": [both, neither]}) == []
