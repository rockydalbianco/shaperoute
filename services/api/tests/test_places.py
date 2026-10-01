"""GET /places: Geoapify's autocomplete behind the API (TASK-123, ADR-0095).

No network: the service is a function that returns the JSON of
fixtures/geoapify-via-bel.json, written from Geoapify's documented answer.
The body the app reads is packages/shared-types/fixtures/places.json.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.app import create_app
from shaperoute_api.places import (
    CACHE_TTL_S,
    NO_KEY,
    PlacesBody,
    PlaceSearch,
    PlacesUnavailableError,
    autocomplete_url,
    parse_autocomplete,
    place_label,
)

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ANSWER = json.loads((HERE / "fixtures" / "geoapify-via-bel.json").read_text("utf-8"))
CONTRACT = REPO / "packages" / "shared-types" / "fixtures" / "places.json"
KEY = "test-key-not-real"


class Service:
    """Geoapify, as a function: records the URLs asked."""

    def __init__(self, answer: Any = ANSWER, fails: bool = False) -> None:
        self.answer = answer
        self.fails = fails
        self.urls: list[str] = []

    def __call__(self, url: str) -> Any:
        self.urls.append(url)
        if self.fails:
            raise OSError(f"cannot reach {url}")
        return self.answer


def client(places: PlaceSearch | None) -> TestClient:
    return TestClient(create_app(FileSource(HERE), places=places))


def test_the_answer_is_the_shared_contract() -> None:
    contract = json.loads(CONTRACT.read_text("utf-8"))
    places = parse_autocomplete(ANSWER)
    assert PlacesBody(places=places).model_dump(mode="json") == {
        "places": [
            {"label": p["label"], "point": list(p["point"])} for p in contract["places"]
        ]
    }


def test_get_places_answers_with_the_places_found() -> None:
    service = Service()
    response = client(PlaceSearch(KEY, service)).get(
        "/places", params={"q": "via bel", "lat": 46.07, "lon": 11.12}
    )
    assert response.status_code == 200
    assert response.json() == json.loads(CONTRACT.read_text("utf-8"))
    asked = parse_qs(urlparse(service.urls[0]).query)
    assert asked["text"] == ["via bel"]
    assert asked["limit"] == ["5"]
    assert asked["bias"] == ["proximity:11.12,46.07"]
    assert asked["apiKey"] == [KEY]


def test_the_same_letters_are_not_asked_twice() -> None:
    now = [0.0]
    service = Service()
    search = PlaceSearch(KEY, service, clock=lambda: now[0])
    first = search.search("Via Bel", (46.0701, 11.1199))
    # Other spaces and case, and a point a few metres away: the same search.
    assert search.search(" via  bel ", (46.0702, 11.1201)) == first
    assert len(service.urls) == 1
    now[0] = CACHE_TTL_S + 1
    search.search("via bel", (46.07, 11.12))
    assert len(service.urls) == 2


def test_without_a_key_the_api_says_503_and_asks_nobody() -> None:
    service = Service()
    response = client(PlaceSearch(None, service)).get("/places", params={"q": "x"})
    assert response.status_code == 503
    assert response.json()["error"]["message"] == NO_KEY
    assert service.urls == []
    assert client(None).get("/places", params={"q": "x"}).status_code == 503


def test_a_failed_service_is_503_without_the_key(
    caplog: pytest.LogCaptureFixture,
) -> None:
    response = client(PlaceSearch(KEY, Service(fails=True))).get(
        "/places", params={"q": "trento"}
    )
    assert response.status_code == 503
    assert KEY not in response.text
    assert KEY not in caplog.text


def test_a_failure_is_not_kept() -> None:
    service = Service(fails=True)
    search = PlaceSearch(KEY, service)
    with pytest.raises(PlacesUnavailableError):
        search.search("trento")
    service.fails = False
    assert search.search("trento")


@pytest.mark.parametrize(
    "params",
    [{}, {"q": ""}, {"q": "x" * 201}, {"q": "x", "lat": 91, "lon": 0}],
)
def test_a_bad_query_is_invalid_request(params: dict[str, Any]) -> None:
    response = client(PlaceSearch(KEY, Service())).get("/places", params=params)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_a_point_alone_is_not_sent() -> None:
    assert "bias" not in autocomplete_url(KEY, "trento", None)


def test_labels_match_the_apps() -> None:
    assert place_label(
        {"street": "Via Roma", "housenumber": "3", "city": "Levico"}
    ) == ("Via Roma 3, Levico")
    assert place_label({"name": "Trento", "city": "Trento", "state": "TAA"}) == (
        "Trento, TAA"
    )
    assert place_label({"country": "Italy"}) is None


def test_an_odd_answer_gives_no_places() -> None:
    assert parse_autocomplete(None) == []
    assert parse_autocomplete({"results": "x"}) == []
    assert parse_autocomplete({"results": [{"name": "A", "lat": True, "lon": 1}]}) == []
