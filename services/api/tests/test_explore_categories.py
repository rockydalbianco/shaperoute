"""The categories of "Ask for a route" and the city suggestions (TASK-134):
the app's words read as themes, cities while typing. No network."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.app import create_app
from shaperoute_api.cities import CitySearch, suggest_url
from shaperoute_api.themes import THEMES, read_request

HERE = Path(__file__).parent

# apps/mobile/src/explore/presets.ts CATEGORIES, as the app sends them.
CATEGORIES = {
    "Food": "food",
    "Famous Places": "famous",
    "Romantic": "romantic",
    "Best Views": "panoramic",
    "Shopping": "shopping",
    "Culture": "culture",
    "Nightlife": "nightlife",
    "Hidden Gems": "hidden",
    "Running": "running",
    "Walking": "walking",
    "Family": "family",
    "Photography": "photography",
    "Local Experience": "local",
}


@pytest.mark.parametrize(("category", "theme"), sorted(CATEGORIES.items()))
@pytest.mark.parametrize("city", ["New York", "Barcelona", "Torino", "San Francisco"])
def test_every_category_of_the_app_is_a_theme(
    category: str, theme: str, city: str
) -> None:
    got = read_request(f"{category} in {city}")
    assert (got.theme, got.city) == (theme, city)
    assert theme in THEMES


def test_short_words_are_whole_words() -> None:
    # "bar" is nightlife, "Barcelona" is not; "pub" is not "public".
    assert read_request("a bar crawl").theme == "nightlife"
    assert read_request("public gardens").theme == "nature"
    assert read_request("percorso di corsa").theme == "running"


SUGGESTIONS = {
    "results": [
        {
            "result_type": "city",
            "name": "Parma",
            "city": "Parma",
            "state": "Emilia-Romagna",
            "country": "Italy",
            "lat": 44.8,
            "lon": 10.33,
        },
        {
            "result_type": "city",
            "name": "Paris",
            "city": "Paris",
            "state": "Ile-de-France",
            "country": "France",
            "lat": 48.86,
            "lon": 2.32,
        },
        {
            "result_type": "city",
            "name": "Paris",
            "city": "Paris",
            "state": "Ile-de-France",
            "country": "France",
            "lat": 48.85,
            "lon": 2.35,
        },
    ]
}


def test_suggestions_while_typing_once_each() -> None:
    calls: list[str] = []
    search = CitySearch("K", fetch=lambda url: calls.append(url) or SUGGESTIONS)
    assert [p.label for p in search.suggest("Par")] == [
        "Parma, Emilia-Romagna, Italy",
        "Paris, Ile-de-France, France",
    ]
    search.suggest(" par ")
    assert len(calls) == 1
    assert search.suggest("P") == []
    q = parse_qs(urlparse(suggest_url("K", "Par")).query)
    assert "type" not in q and q["text"] == ["Par"]  # places too (TASK-138)
    assert "autocomplete" in suggest_url("K", "Par")


def test_the_suggestions_endpoint() -> None:
    client = TestClient(
        create_app(
            FileSource(HERE), cities=CitySearch("K", fetch=lambda url: SUGGESTIONS)
        )
    )
    body = client.get("/city-suggestions", params={"q": "Par"}).json()
    assert [p["label"] for p in body["places"]][:2] == [
        "Parma, Emilia-Romagna, Italy",
        "Paris, Ile-de-France, France",
    ]
    off = TestClient(create_app(FileSource(HERE)))
    assert off.get("/city-suggestions", params={"q": "Par"}).status_code == 503
