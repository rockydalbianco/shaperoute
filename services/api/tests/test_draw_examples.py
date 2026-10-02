"""draw_examples: a city's examples asked as a phone asks, before any phone."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import GraphLoader, Plan

from shaperoute_api import draw_examples
from shaperoute_api.app import create_app
from shaperoute_api.cities import CitySearch
from shaperoute_api.draw_examples import Call, Drawn, draw_city
from shaperoute_api.graphs import MapDataUnavailableError
from shaperoute_api.route_store import RouteStore

ROVERETO = {
    "name": "Rovereto",
    "city": "Rovereto",
    "state": "Trentino-Alto Adige",
    "country": "Italy",
    "lat": 45.8906,
    "lon": 11.0401,
    "result_type": "city",
}


def planner(request: RouteRequest, source: GraphLoader) -> Plan:
    if request.shape == "heart" and request.start[0] > 46:
        raise MapDataUnavailableError("no Overpass")
    result = RouteResult(
        points=[request.start, (45.8915, 11.0420), request.start],
        distance_m=5100.0,
        similarity=0.9,
        shape=request.shape,
    )
    return Plan(result=result, search=None)


def over(client: TestClient) -> Call:
    """The command's calls, answered by the app under test."""

    def call(method: str, path: str, body: dict[str, Any] | None) -> tuple[int, Any]:
        response = client.request(method, path, json=body)
        return response.status_code, response.json() if response.content else None

    return call


def api(tmp_path: Path, results: list[dict[str, Any]]) -> TestClient:
    return TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            planner=planner,
            cities=CitySearch("K", fetch=lambda url: {"results": results}),
            route_store=RouteStore(tmp_path / "routes", engine="engine-a"),
        )
    )


def test_a_city_is_drawn_once_and_then_found_kept(tmp_path: Path) -> None:
    with api(tmp_path, [ROVERETO]) as client:
        first = draw_city("Rovereto", over(client), sleep=lambda s: None)
        assert first.label == "Rovereto, Trentino-Alto Adige, Italy"
        assert first.shapes == {"heart": "drawn", "circle": "drawn", "star": "drawn"}
        # The circle is asked first: the zone it downloads serves the others.
        assert list(first.shapes) == ["circle", "heart", "star"]
        assert first.ready
        again = draw_city("Rovereto", over(client), sleep=lambda s: None)
        assert again.shapes == {"heart": "kept", "circle": "kept", "star": "kept"}
        assert again.line().startswith(
            "Rovereto, Trentino-Alto Adige, Italy: circle kept, heart kept, star kept"
        )


def test_a_city_not_found_and_a_zone_not_there_say_so(tmp_path: Path) -> None:
    with api(tmp_path, []) as client:
        nowhere = draw_city("Xyzzy", over(client), sleep=lambda s: None)
    assert nowhere.label is None and not nowhere.ready
    assert nowhere.line() == "Xyzzy: not found by the city search"

    north = {**ROVERETO, "name": "Bolzano", "city": "Bolzano", "lat": 46.4983}
    with api(tmp_path, [north]) as client:
        bolzano = draw_city("Bolzano", over(client), sleep=lambda s: None)
    # The circle is drawn; without the zone the star is not even asked.
    assert bolzano.shapes == {"circle": "drawn", "heart": "map_data_unavailable"}
    assert not bolzano.ready


def test_too_many_requests_waits_as_long_as_the_api_says() -> None:
    slept: list[float] = []
    posts = iter(
        [
            (429, {"retry_after_s": "12"}),
            (202, {"job_id": "a", "status": "done"}),
            (202, {"job_id": "b", "status": "done"}),
            (202, {"job_id": "c", "status": "queued"}),
        ]
    )

    def call(method: str, path: str, body: dict[str, Any] | None) -> tuple[int, Any]:
        if path.startswith("/cities"):
            return 200, {"places": [{"label": "Rovereto", "point": [45.89, 11.04]}]}
        if method == "POST":
            return next(posts)
        return 200, {"job_id": "c", "status": "failed", "error": {"code": "x"}}

    drawn = draw_city("Rovereto", call, sleep=slept.append)
    assert slept == [12.0, draw_examples.POLL_S]
    assert drawn.shapes == {"heart": "kept", "circle": "kept", "star": "x"}


def test_the_command_counts_the_cities_ready(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    asked: list[tuple[str, str | None]] = []

    def fake_http(api: str, key: str | None) -> Call:
        asked.append((api, key))
        return lambda method, path, body: (503, None)

    monkeypatch.setattr(draw_examples, "http_call", fake_http)
    monkeypatch.setattr(
        draw_examples,
        "draw_city",
        lambda city, call: Drawn(
            city, label=city, shapes={"heart": "kept" if city == "Rome" else "timeout"}
        ),
    )
    monkeypatch.setenv(draw_examples.KEY_VARIABLE, "a-key-only-for-this-test")
    assert draw_examples.main(["--api", "http://api", "Rome", "Rovereto"]) == 1
    assert asked == [("http://api", "a-key-only-for-this-test")]
    out = capsys.readouterr().out
    assert "Rovereto: heart timeout (0 s)" in out
    assert "1 of 2 cities have their examples" in out
    assert "a-key-only-for-this-test" not in out
