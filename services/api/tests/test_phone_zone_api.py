"""GET /phone-zones/{network} (phone_zone_api.py, TASK-214, ADR-0177)."""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Any

import osmnx as ox
import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api import __main__ as entry
from shaperoute_api.app import create_app
from shaperoute_api.phone_zone_api import install_phone_zones, main, write_all
from shaperoute_api.phone_zones import SUFFIX, read_zone, zone_name

REPO = Path(__file__).resolve().parents[3]
LEVICO_GRAPH = REPO / "services/route-engine/tests/fixtures/levico_walk_1km.graphml"
BBOX = (45.95, 11.2, 46.07, 11.4)
LEVICO = {"lat": 46.0122, "lon": 11.2986}


@pytest.fixture
def cache(tmp_path: Path) -> Path:
    shutil.copy(LEVICO_GRAPH, tmp_path / f"{zone_name('foot', BBOX)}.graphml")
    return tmp_path


@pytest.fixture
def client(cache: Path) -> TestClient:
    app = create_app(FileSource(LEVICO_GRAPH))
    install_phone_zones(app, cache)
    return TestClient(app)


def test_the_zone_around_a_point(client: TestClient, tmp_path: Path) -> None:
    response = client.get("/phone-zones/foot", params=LEVICO)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/gzip"
    name = f"{zone_name('foot', BBOX)}{SUFFIX}"
    assert name in response.headers["content-disposition"]
    assert response.headers["etag"]
    received = tmp_path / "received" / name
    received.parent.mkdir()
    received.write_bytes(response.content)
    graph, _ = read_zone(received)
    expected = ox.load_graphml(LEVICO_GRAPH)  # test_phone_zones checks it all
    assert list(graph.nodes(data=True)) == list(expected.nodes(data=True))
    assert list(graph.edges(keys=True)) == list(expected.edges(keys=True))


def test_a_zone_the_phone_has_is_not_sent_again(client: TestClient) -> None:
    tag = client.get("/phone-zones/foot", params=LEVICO).headers["etag"]
    again = client.get(
        "/phone-zones/foot", params=LEVICO, headers={"If-None-Match": tag}
    )
    assert again.status_code == 304
    assert again.content == b""


def test_a_newer_zone_is_written_again(client: TestClient, cache: Path) -> None:
    tag = client.get("/phone-zones/foot", params=LEVICO).headers["etag"]
    zone = cache / f"{zone_name('foot', BBOX)}.graphml"
    later = zone.stat().st_mtime_ns + 10**10
    os.utime(zone, ns=(later, later))
    again = client.get(
        "/phone-zones/foot", params=LEVICO, headers={"If-None-Match": tag}
    )
    assert again.status_code == 200
    assert again.headers["etag"] != tag


def test_no_zone_around_the_point(client: TestClient) -> None:
    response = client.get("/phone-zones/foot", params={"lat": 45.4642, "lon": 9.19})
    assert response.status_code == 404
    assert "No zone around this point" in response.text


def test_the_other_network_has_its_own_zones(client: TestClient) -> None:
    assert client.get("/phone-zones/bike", params=LEVICO).status_code == 404


@pytest.mark.parametrize(
    ("network", "params", "status"),
    [
        ("water", LEVICO, 404),
        ("..", LEVICO, 404),
        ("foot", {"lat": 91, "lon": 11.3}, 422),
        ("foot", {"lat": 46.0}, 422),
    ],
)
def test_wrong_requests(
    client: TestClient, network: str, params: dict[str, float], status: int
) -> None:
    assert client.get(f"/phone-zones/{network}", params=params).status_code == status


def test_the_api_started_from_the_command_line_has_it(
    monkeypatch: pytest.MonkeyPatch, cache: Path
) -> None:
    served: dict[str, Any] = {}

    def run(app: Any, host: str, port: int) -> None:
        served["app"] = app

    monkeypatch.setattr(entry.uvicorn, "run", run)
    entry.main(["--cache-dir", str(cache)])
    client = TestClient(served["app"])
    assert client.get("/phone-zones/foot", params=LEVICO).status_code == 200


def test_the_server_starts_the_api_from_the_command_line() -> None:
    """The server runs `python -m shaperoute_api` (Dockerfile, compose.yaml):
    main() installs /phone-zones; create_app alone would not."""
    dockerfile = (REPO / "Dockerfile").read_text(encoding="utf-8")
    assert 'CMD ["python", "-m", "shaperoute_api", ' in dockerfile
    compose = (REPO / "deploy/compose.yaml").read_text(encoding="utf-8")
    assert "- python\n      - -m\n      - shaperoute_api\n" in compose


def test_every_cached_zone_written_ahead(
    cache: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    (cache / "bike_x.graphml").touch()  # not a zone name: left alone
    main(["--cache-dir", str(cache)])
    phone = cache / f"{zone_name('foot', BBOX)}{SUFFIX}"
    assert phone.exists()
    assert f"{phone.name}: " in capsys.readouterr().out
    written = phone.stat().st_mtime_ns
    assert write_all(cache) == [phone]
    assert phone.stat().st_mtime_ns == written  # up to date: not written again
