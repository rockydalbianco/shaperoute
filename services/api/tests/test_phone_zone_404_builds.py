"""GET /phone-zones/{network} when the server has no zone around the phone
(TASK-214 part G): the zone is prepared as a kept place is (TASK-334), and
the phone finds it when it asks again."""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from route_engine.network import BBox, FileSource, OsmnxSource

from shaperoute_api.app import create_app
from shaperoute_api.phone_zone_api import NO_ZONE, install_phone_zones, phone_file
from shaperoute_api.phone_zone_places import PAUSE_FILE, PlaceBuilds
from shaperoute_api.phone_zones import zone_name

REPO = Path(__file__).resolve().parents[3]
LEVICO_GRAPH = REPO / "services/route-engine/tests/fixtures/levico_walk_1km.graphml"
# Levico's zone holds 3 km around Levico; Trento, Rovereto and Arco are
# outside it.
BBOX = (45.95, 11.2, 46.07, 11.4)
LEVICO = {"lat": 46.0122, "lon": 11.2986}
TRENTO = {"lat": 46.07, "lon": 11.12}
ROVERETO = {"lat": 45.89, "lon": 11.04}
ARCO = {"lat": 45.92, "lon": 10.89}
RIVA = {"lat": 45.89, "lon": 10.84}
PHONE = {"X-Phone-Id": "0123456789abcdef0123456789abcdef"}


def saved(source: OsmnxSource, bbox: BBox) -> None:
    """A download that saves Levico's roads under the zone's name."""
    shutil.copy(LEVICO_GRAPH, source.cache_path(bbox))


@pytest.fixture
def cache(tmp_path: Path) -> Path:
    shutil.copy(LEVICO_GRAPH, tmp_path / f"{zone_name('foot', BBOX)}.graphml")
    return tmp_path


def client_with(cache: Path, builds: PlaceBuilds) -> TestClient:
    app = create_app(FileSource(LEVICO_GRAPH))
    install_phone_zones(app, cache, places=builds)
    return TestClient(app)


@pytest.fixture
def builds(cache: Path) -> PlaceBuilds:
    return PlaceBuilds(cache, phone_file, download=saved, background=False)


@pytest.fixture
def client(cache: Path, builds: PlaceBuilds) -> TestClient:
    return client_with(cache, builds)


def around(client: TestClient, place: dict[str, float], **extra: object) -> int:
    response = client.get("/phone-zones/foot", params={**place, **extra}, headers=PHONE)
    return response.status_code


def test_no_zone_still_answers_404_and_prepares_it(
    client: TestClient, builds: PlaceBuilds
) -> None:
    response = client.get("/phone-zones/foot", params=TRENTO, headers=PHONE)
    assert response.status_code == 404
    assert NO_ZONE in response.text  # the app reads it as before
    assert builds.work_once()
    assert not builds.work_once()  # one zone, prepared once
    assert around(client, TRENTO) == 200  # the next opening finds it


def test_asked_twice_meanwhile_it_is_prepared_once(
    client: TestClient, builds: PlaceBuilds
) -> None:
    assert around(client, TRENTO) == 404
    assert around(client, TRENTO) == 404
    assert builds.work_once()
    assert not builds.work_once()


def test_a_zone_the_server_has_prepares_nothing(
    client: TestClient, builds: PlaceBuilds
) -> None:
    assert around(client, LEVICO) == 200
    assert not builds.work_once()


def test_a_zone_asked_ahead_prepares_nothing(
    client: TestClient, builds: PlaceBuilds
) -> None:
    assert around(client, TRENTO, prefetch=True) == 404
    assert not builds.work_once()


def test_the_same_daily_count_as_the_kept_places(
    client: TestClient, builds: PlaceBuilds
) -> None:
    for place in (TRENTO, ROVERETO, ARCO, RIVA):
        assert around(client, place) == 404
    prepared = 0
    while builds.work_once():
        prepared += 1
    assert prepared == 3  # PLACES_A_DAY for one phone


def test_nothing_starts_while_routes_are_drawn(cache: Path) -> None:
    drawing = {"now": True}
    builds = PlaceBuilds(
        cache,
        phone_file,
        download=saved,
        background=False,
        busy=lambda: drawing["now"],
    )
    client = client_with(cache, builds)
    assert around(client, TRENTO) == 404
    assert not builds.work_once()
    drawing["now"] = False
    assert builds.work_once()
    assert around(client, TRENTO) == 200


def test_the_pause_file_holds_it(
    cache: Path, client: TestClient, builds: PlaceBuilds
) -> None:
    (cache / PAUSE_FILE).touch()
    assert around(client, TRENTO) == 404
    assert not builds.work_once()
    (cache / PAUSE_FILE).unlink()
    assert builds.work_once()


def test_the_log_never_says_where_the_phone_is(
    client: TestClient, builds: PlaceBuilds, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.DEBUG):
        assert around(client, TRENTO) == 404
        assert builds.work_once()
        assert around(client, TRENTO) == 200
    # The server's own lines: the test client writes its URLs too.
    text = "\n".join(
        record.getMessage()
        for record in caplog.records
        if record.name.startswith(("shaperoute_api", "route_engine", "uvicorn"))
    )
    assert "place zone" in text
    for number in ("46.07", "11.12", "46.0", "11.1"):
        assert number not in text
