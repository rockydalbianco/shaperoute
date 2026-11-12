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
    CatalogRoute,
    RecommendedCatalog,
    distance_m,
    parse_city,
    pen_up_preview,
    preview,
    turn_of,
    varied,
    walks_of,
)

HERE = Path(__file__).parent
REPO = HERE.parents[2]
CATALOG = HERE / "fixtures" / "catalog"
# A word written letter by letter, the pen up between them, and a shape.
PEN_UP = HERE / "fixtures" / "catalog_pen_up"
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
    # The 21 km heart starts 3.8 km away: inside 5 km, outside 3 km. It is
    # the second heart: it comes after the best of each (TASK-441).
    assert [r["id"] for r in routes] == [
        "trento-star-5000-0",
        "trento-heart-10000-1",
        "trento-ciao-15000-3",
        "trento-heart-21000-2",
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


# GET /catalog: the whole catalogue a page at a time, city by city from the
# nearest, for the end of «Explore» (TASK-420 part E, ADR-0347
# precisazione B).


def test_a_page_of_the_catalogue_is_the_shared_contract(api: TestClient) -> None:
    answer = api.get("/catalog", params={**PIAZZA_DUOMO, "limit": 2})
    assert answer.status_code == 200
    contract = json.loads((CONTRACT / "catalog.json").read_text("utf-8"))
    assert answer.json() == contract


def test_the_page_counts_the_whole_catalogue_and_joins_with_the_next(
    api: TestClient,
) -> None:
    first = api.get("/catalog", params={**PIAZZA_DUOMO, "limit": 3}).json()
    assert (first["total"], first["cities"]) == (4, 1)
    # Inside a city, as /recommended-routes: the best of each first.
    assert [r["id"] for r in first["routes"]] == [
        "trento-star-5000-0",
        "trento-heart-10000-1",
        "trento-ciao-15000-3",
    ]
    second = api.get(
        "/catalog", params={**PIAZZA_DUOMO, "offset": 3, "limit": 3}
    ).json()
    assert [r["id"] for r in second["routes"]] == ["trento-heart-21000-2"]
    assert (second["total"], second["cities"]) == (4, 1)
    beyond = api.get("/catalog", params={**PIAZZA_DUOMO, "offset": 9}).json()
    assert beyond["routes"] == []
    assert beyond["total"] == 4
    # Each route says how far it is from the point, as in the near list.
    assert first["routes"][0]["away_m"] == 0


def _route(
    city: str, name: str, lat: float, lon: float, similarity: float, i: int = 0
) -> CatalogRoute:
    return CatalogRoute(
        id=f"{city}-{name}-5000-{i}",
        city=city,
        shape=name,
        word=None,
        style=None,
        distance_m=5000,
        route_m=5100,
        similarity=similarity,
        points=((lat, lon), (lat + 0.001, lon + 0.001)),
        license="",
    )


def _word(
    city: str,
    word: str,
    style: str,
    lat: float,
    lon: float,
    similarity: float,
    i: int = 0,
) -> CatalogRoute:
    return CatalogRoute(
        id=f"{city}-{word.lower()}-5000-{i}",
        city=city,
        shape=None,
        word=word,
        style=style,
        distance_m=5000,
        route_m=5100,
        similarity=similarity,
        points=((lat, lon), (lat + 0.001, lon + 0.001)),
        license="",
    )


def test_cities_come_from_the_nearest_whole_before_the_next() -> None:
    catalog = RecommendedCatalog(
        [
            _route("milano", "heart", 45.4642, 9.19, 0.99),
            _route("trento", "star", 46.067, 11.1215, 0.9),
            _route("trento", "heart", 46.07, 11.12, 0.95),
            _route("rovereto", "moon", 45.89, 11.04, 0.97),
        ]
    )
    from_trento = catalog.page((46.067, 11.1215), 0, 10)
    assert [r.id for r in from_trento.routes] == [
        # Trento first, its best first; then Rovereto; Milano last, however good.
        "trento-heart-5000-0",
        "trento-star-5000-0",
        "rovereto-moon-5000-0",
        "milano-heart-5000-0",
    ]
    assert (from_trento.total, from_trento.cities) == (4, 3)
    from_milan = catalog.page((45.46, 9.19), 0, 10)
    assert [r.city for r in from_milan.routes] == [
        "milano",
        "rovereto",
        "trento",
        "trento",
    ]
    # A page in the middle keeps the same order.
    assert [r.id for r in catalog.page((45.46, 9.19), 1, 2).routes] == [
        "rovereto-moon-5000-0",
        "trento-heart-5000-0",
    ]


def test_varied_puts_the_first_of_every_kind_before_the_second_of_any() -> None:
    ranked = ["a1", "a2", "b1", "a3", "c1", "b2"]
    assert varied(ranked, lambda item: item[0]) == [
        "a1",
        "b1",
        "c1",
        "a2",
        "b2",
        "a3",
    ]
    assert varied([], len) == []


def test_near_shows_the_best_of_every_shape_and_word_before_a_second() -> None:
    here = (46.067, 11.1215)
    routes = [
        _route("trento", "circle", *here, 0.99, i=0),
        _route("trento", "circle", *here, 0.98, i=1),
        _route("trento", "circle", *here, 0.97, i=2),
        _route("trento", "heart", *here, 0.93, i=3),
        _route("trento", "heart", *here, 0.92, i=4),
        _word("trento", "CIAO", "round", *here, 0.91, i=5),
        _word("trento", "CIAO", "block", *here, 0.90, i=6),
    ]
    catalog = RecommendedCatalog(routes)
    mixed = [
        "trento-circle-5000-0",
        "trento-heart-5000-3",
        "trento-ciao-5000-5",
        "trento-circle-5000-1",
        "trento-heart-5000-4",
        # The same word in the other style is a second of its kind.
        "trento-ciao-5000-6",
        "trento-circle-5000-2",
    ]
    assert [r.id for r in catalog.near(here)] == mixed
    # The limit cuts the mixed list: four cards, three kinds.
    assert [r.id for r in catalog.near(here, limit=4)] == mixed[:4]
    # One shape asked for: its routes, the best first, as before.
    assert [r.id for r in catalog.near(here, shape="circle")] == [
        "trento-circle-5000-0",
        "trento-circle-5000-1",
        "trento-circle-5000-2",
    ]


def test_a_page_mixes_inside_each_city_and_never_across_two() -> None:
    catalog = RecommendedCatalog(
        [
            _route("trento", "circle", 46.067, 11.1215, 0.99, i=0),
            _route("trento", "circle", 46.067, 11.1215, 0.98, i=1),
            _route("trento", "heart", 46.067, 11.1215, 0.93, i=2),
            _route("rovereto", "circle", 45.89, 11.04, 0.97, i=0),
            _route("rovereto", "circle", 45.89, 11.04, 0.96, i=1),
            _route("rovereto", "moon", 45.89, 11.04, 0.91, i=2),
        ]
    )
    ids = [r.id for r in catalog.page((46.067, 11.1215), 0, 10).routes]
    assert ids == [
        "trento-circle-5000-0",
        "trento-heart-5000-2",
        "trento-circle-5000-1",
        "rovereto-circle-5000-0",
        "rovereto-moon-5000-2",
        "rovereto-circle-5000-1",
    ]
    # Pages still join.
    joined = [
        r.id
        for offset in (0, 2, 4)
        for r in catalog.page((46.067, 11.1215), offset, 2).routes
    ]
    assert joined == ids


@pytest.mark.parametrize(
    "params",
    [
        {},
        {"lat": 46.0},
        {**PIAZZA_DUOMO, "limit": 0},
        {**PIAZZA_DUOMO, "limit": 201},
        {**PIAZZA_DUOMO, "offset": -1},
    ],
)
def test_a_bad_page_query_is_invalid(api: TestClient, params: dict[str, Any]) -> None:
    assert api.get("/catalog", params=params).status_code == 422


def test_without_a_catalogue_the_page_is_empty() -> None:
    answer = client(None).get("/catalog", params=PIAZZA_DUOMO)
    assert answer.json() == {"total": 0, "cities": 0, "routes": []}


# --- A word with the pen up (TASK-441, ADR-0366) -------------------------------


@pytest.fixture
def pen_up() -> TestClient:
    return client(RecommendedCatalog.from_dir(PEN_UP))


def test_the_list_with_a_word_in_pieces_is_the_shared_contract(
    pen_up: TestClient,
) -> None:
    answer = pen_up.get("/recommended-routes", params=PIAZZA_DUOMO)
    assert answer.status_code == 200
    contract = CONTRACT / "recommended-routes-pen-up.json"
    assert answer.json() == json.loads(contract.read_text("utf-8"))


def test_a_word_in_pieces_whole_is_the_shared_contract(pen_up: TestClient) -> None:
    answer = pen_up.get("/recommended-routes/trento-go-6000-0")
    assert answer.status_code == 200
    contract = CONTRACT / "recommended-route-pen-up.json"
    assert answer.json() == json.loads(contract.read_text("utf-8"))


def test_the_card_of_a_word_in_pieces_leaves_the_walk_out(pen_up: TestClient) -> None:
    routes = pen_up.get("/recommended-routes", params=PIAZZA_DUOMO).json()["routes"]
    word, shape = routes
    # Five points of G, five of O: the point walked between them is not there,
    # and O's first point is come to with the pen up.
    assert len(word["preview"]) == 10
    assert word["gaps"] == [5]
    assert [46.0672, 11.1232] not in word["preview"]
    # A route in one line says nothing new.
    assert "gaps" not in shape
    page = pen_up.get("/catalog", params=PIAZZA_DUOMO).json()["routes"]
    assert [r.get("gaps") for r in page] == [[5], None]


def test_only_a_route_in_pieces_says_its_walks(pen_up: TestClient) -> None:
    word = pen_up.get("/recommended-routes/trento-go-6000-0").json()
    assert word["walks"] == [[4, 6]]
    assert len(word["points"]) == 11
    shape = pen_up.get("/recommended-routes/trento-heart-5000-1").json()
    assert "walks" not in shape


def test_the_preview_of_pieces_thins_each_and_marks_where_the_pen_comes_down() -> None:
    line = [(46.0 + i / 10000, 11.0) for i in range(300)]
    preview_, gaps = pen_up_preview(line, [(99, 110), (199, 210)], piece_size=8)
    assert len(preview_) == 24
    assert gaps == [8, 16]
    assert preview_[0] == line[0] and preview_[7] == line[99]
    assert preview_[8] == line[110] and preview_[15] == line[199]
    assert preview_[16] == line[210] and preview_[-1] == line[-1]


def test_many_pieces_share_the_points_and_keep_two_each() -> None:
    line = [(46.0 + i / 10000, 11.0) for i in range(100)]
    walks = [(i, i + 2) for i in range(4, 95, 5)]
    preview_, gaps = pen_up_preview(line, walks, piece_size=4, pieces=2)
    assert len(gaps) == len(walks)
    assert len(preview_) == 2 * (len(walks) + 1)


@pytest.mark.parametrize(
    "walks",
    [
        None,
        [],
        "4-6",
        [[4]],
        [[4, 6, 8]],
        [[6, 4]],
        [[4, 4]],
        [[4, 11]],
        [[-1, 3]],
        [[4.0, 6]],
        [[True, 6]],
        [[4, 6], [5, 8]],
    ],
)
def test_walks_that_do_not_read_leave_the_route_in_one_line(walks: Any) -> None:
    assert walks_of({"walks": walks}, 11) == ()


def test_walks_in_order_are_kept() -> None:
    assert walks_of({"walks": [[2, 4], [4, 6], [8, 10]]}, 11) == (
        (2, 4),
        (4, 6),
        (8, 10),
    )
    assert walks_of({}, 11) == ()
