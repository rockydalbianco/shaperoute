"""Cities and places while typing in "Explore" (TASK-138, ADR-0110): the
autocomplete's answers cleaned. No network: the answers are cut from
Geoapify's, as they came on 2026-10-01."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.app import create_app
from shaperoute_api.cities import (
    MAX_SUGGESTIONS,
    CitySearch,
    parse_suggestions,
    suggestion_label,
)

HERE = Path(__file__).parent
ITALY = {"country": "Italy"}


def result(kind: str, name: str | None, lat: float, lon: float, **more: str) -> Any:
    return {"result_type": kind, "name": name, "lat": lat, "lon": lon, **more}


VER = {
    "results": [
        result("city", "Verona", 45.4385, 10.9924, city="Verona", state="Veneto"),
        # The area of the province: its middle is no start.
        result("county", "Verona", 45.4425, 10.9857, state="Veneto"),
        result("county", "Vercelli", 45.5554, 8.3463, state="Piedmont"),
        result("city", "Vercelli", 45.3252, 8.4228, city="Vercelli", state="Piedmont"),
        # A village, named with its municipality.
        result("city", "Parè", 45.8109, 9.0078, city="Colverde", state="Lombardy"),
    ]
}

ARENA = {
    "results": [
        result("amenity", "Verona Arena", 45.4390, 10.9949, city="Verona", **ITALY),
        # The same building, 40 m away, under its Italian name.
        result("amenity", "Arena di Verona", 45.4390, 10.9944, city="Verona", **ITALY),
        # A building known only by its address.
        result("building", None, 53.2590, -2.5180, city="Northwich"),
        result("street", "Via Arena di Verona", 40.5744, 17.2130, city="Statte"),
        result("city", "Arena Po", 45.0966, 9.3628, city="Arena Po", state="Lombardy"),
        result("postcode", "37121", 45.44, 10.99, city="Verona"),
    ]
}


def test_cities_with_their_centre_and_no_areas() -> None:
    got = parse_suggestions(VER)
    assert [(s.label, s.kind) for s in got] == [
        ("Verona, Veneto", "city"),
        ("Vercelli, Piedmont", "city"),
        ("Parè, Colverde", "city"),
    ]
    assert got[0].point == (45.4385, 10.9924)


def test_places_in_the_service_order_each_spot_once() -> None:
    got = parse_suggestions(ARENA)
    assert [(s.label, s.kind) for s in got] == [
        ("Verona Arena, Verona, Italy", "place"),
        ("Via Arena di Verona, Statte", "place"),
        ("Arena Po, Lombardy", "city"),
    ]


def test_a_few_at_most() -> None:
    many = {
        "results": [
            result("amenity", f"Place {i}", 45.0 + i / 100, 11.0, city="Trento")
            for i in range(MAX_SUGGESTIONS + 3)
        ]
    }
    assert len(parse_suggestions(many)) == MAX_SUGGESTIONS


def test_labels() -> None:
    milan = {"name": "Milan", "city": "Milan", "county": "Milan", "state": "Lombardy"}
    assert suggestion_label({**milan, **ITALY}, "city") == "Milan, Lombardy, Italy"
    new_york = {"name": "New York", "city": "New York", "state": "New York"}
    assert suggestion_label(new_york, "city") == "New York"
    # A place: its city, else its county or region.
    duomo = {**milan, "name": "Milan Cathedral", **ITALY}
    assert suggestion_label(duomo, "place") == "Milan Cathedral, Milan, Italy"
    assert suggestion_label({"name": "Centro", "state": "Veneto"}, "place") == (
        "Centro, Veneto"
    )
    assert suggestion_label({"street": "Via Roma", "city": "Trento"}, "place") is None


def test_bad_results_are_skipped() -> None:
    body = {
        "results": [
            "nonsense",
            {"result_type": "amenity", "name": "No point"},
            result("amenity", "", 45.0, 11.0),
            {"result_type": "city", "name": "Bool", "lat": True, "lon": 11.0},
        ]
    }
    assert parse_suggestions(body) == []
    assert parse_suggestions(None) == []


def test_the_endpoint_says_which_is_a_city() -> None:
    calls: list[str] = []

    def fetch(url: str) -> Any:
        calls.append(url)
        return ARENA

    client = TestClient(create_app(FileSource(HERE), cities=CitySearch("K", fetch)))
    body = client.get("/city-suggestions", params={"q": "arena di ver"}).json()
    assert [p["kind"] for p in body["places"]] == ["place", "place", "city"]
    assert body["places"][0] == {
        "label": "Verona Arena, Verona, Italy",
        "point": [45.439, 10.9949],
        "kind": "place",
    }
    # The same letters again cost nothing.
    client.get("/city-suggestions", params={"q": "Arena  di ver"})
    assert len(calls) == 1
