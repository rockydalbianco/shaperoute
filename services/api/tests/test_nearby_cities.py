"""The towns near a point, for "Near me" in "Explore" (TASK-236, ADR-0200).
No network: the answers are cut from Geoapify's Places, as they came on
2026-10-05 around Caldonazzo and Trento."""

from __future__ import annotations

import urllib.parse
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.app import create_app
from shaperoute_api.nearby_cities import (
    CITIES,
    FAR_RADIUS_M,
    NEAR_RADIUS_M,
    TOWNS,
    NearbyCities,
    Town,
    choose,
    install_nearby_cities,
    parse_towns,
    population_of,
)
from shaperoute_api.route_store import RouteStore, cell

HERE = Path(__file__).parent
CALDONAZZO = (46.0036, 11.2647)
TRENTO_CENTRE = (46.0679, 11.1211)
STATE = "Trentino – Alto Adige/Südtirol"


def place(name: str, lat: float, lon: float, population: Any = None) -> Any:
    raw = {"place": "town"} if population is None else {"population": population}
    return {
        "type": "Feature",
        "properties": {
            "name": name,
            "city": name,
            "state": STATE,
            "country": "Italy",
            "lat": lat,
            "lon": lon,
            "datasource": {"raw": raw},
        },
    }


TRENTO = place("Trento", 46.0664228, 11.1257601, 117317)
LEVICO = place("Levico Terme", 46.0091259, 11.3017774, 7915)
PERGINE = place("Pergine Valsugana", 46.0605291, 11.2406747, 21280)
BORGO = place("Borgo Valsugana", 46.0533463, 11.4566004, 6945)
ROVERETO = place("Rovereto", 45.886548, 11.0452369, 40285)
RIVA = place("Riva del Garda", 45.8857, 10.8413, 17190)
ARCO = place("Arco", 45.9177, 10.8867, 17588)
BOLZANO = place("Bolzano", 46.4981, 11.3548, 107436)


class Service:
    """Geoapify's Places: what it has for each kind and radius."""

    def __init__(self, answers: dict[tuple[str, int], list[Any]]) -> None:
        self.answers = answers
        self.calls: list[tuple[str, int, str]] = []

    def __call__(self, url: str) -> Any:
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
        kind = query["categories"][0]
        circle = query["filter"][0]
        radius = int(circle.rsplit(",", 1)[1])
        self.calls.append((kind, radius, circle))
        return {"type": "FeatureCollection", "features": self.answers[(kind, radius)]}


def around_caldonazzo() -> Service:
    return Service(
        {
            (CITIES, FAR_RADIUS_M): [TRENTO, BOLZANO],
            (TOWNS, NEAR_RADIUS_M): [LEVICO, PERGINE, BORGO],
        }
    )


def around_trento() -> Service:
    return Service(
        {
            (CITIES, FAR_RADIUS_M): [TRENTO, BOLZANO],
            (TOWNS, NEAR_RADIUS_M): [PERGINE, LEVICO],
            (TOWNS, FAR_RADIUS_M): [PERGINE, LEVICO, ROVERETO, BORGO, ARCO, RIVA],
        }
    )


def names(towns: list[Town]) -> list[str]:
    return [town.label.split(",")[0] for town in towns]


def test_four_towns_within_20_km_the_nearest_first() -> None:
    service = around_caldonazzo()
    towns = NearbyCities("K", service).towns(CALDONAZZO)
    assert names(towns) == [
        "Levico Terme",
        "Pergine Valsugana",
        "Trento",
        "Borgo Valsugana",
    ]
    # Four within 20 km: the towns further away are not asked for.
    assert [(kind, radius) for kind, radius, _ in service.calls] == [
        (CITIES, FAR_RADIUS_M),
        (TOWNS, NEAR_RADIUS_M),
    ]


def test_fewer_than_four_are_filled_with_the_nearest_up_to_50_km() -> None:
    service = around_trento()
    towns = NearbyCities("K", service).towns(TRENTO_CENTRE)
    # Trento is where the user is; Pergine and Levico are within 20 km, and
    # Rovereto and Arco are the nearest beyond: Bolzano is larger, and
    # further.
    assert names(towns) == ["Pergine Valsugana", "Levico Terme", "Rovereto", "Arco"]
    assert (TOWNS, FAR_RADIUS_M) in [(k, r) for k, r, _ in service.calls]


def test_more_than_four_within_20_km_keep_the_largest() -> None:
    crowd = [place(f"Town {n}", 46.0036, 11.30 + n / 100, 1000 * n) for n in range(9)]
    service = Service({(CITIES, FAR_RADIUS_M): [], (TOWNS, NEAR_RADIUS_M): crowd})
    towns = NearbyCities("K", service).towns(CALDONAZZO)
    assert names(towns) == ["Town 5", "Town 6", "Town 7", "Town 8"]


def test_none_around_is_an_empty_list() -> None:
    service = Service(
        {
            (CITIES, FAR_RADIUS_M): [],
            (TOWNS, NEAR_RADIUS_M): [],
            (TOWNS, FAR_RADIUS_M): [],
        }
    )
    assert NearbyCities("K", service).towns(CALDONAZZO) == []


def test_the_label_and_the_point_are_those_of_the_city_search() -> None:
    [town] = parse_towns({"features": [LEVICO]})
    assert town == Town(
        "Levico Terme, Trentino – Alto Adige/Südtirol, Italy",
        (46.0091259, 11.3017774),
        7915,
    )


def test_a_village_is_named_by_its_own_name_not_its_municipality() -> None:
    village = place("Parè", 45.8109, 9.0078)
    village["properties"]["city"] = "Colverde"
    assert names(parse_towns({"features": [village]})) == ["Parè"]


def test_what_does_not_read_is_dropped_and_a_label_comes_once() -> None:
    body = {
        "features": [
            "nonsense",
            {"properties": {"name": "No point"}},
            {"properties": {"name": "", "lat": 45.0, "lon": 11.0}},
            {"properties": {"name": "Bool", "lat": True, "lon": 11.0}},
            LEVICO,
            LEVICO,
        ]
    }
    assert names(parse_towns(body)) == ["Levico Terme"]
    assert parse_towns(None) == []


def test_the_population_as_openstreetmap_writes_it() -> None:
    def raw(value: Any) -> dict[str, Any]:
        return {"datasource": {"raw": {"population": value}}}

    assert population_of(raw(7915)) == 7915
    assert population_of(raw("7915")) == 7915
    assert population_of(raw("7 915")) == 7915
    assert population_of(raw("about 8000")) == 0
    assert population_of(raw(True)) == 0
    assert population_of({}) == 0


def test_without_a_population_a_town_comes_after_the_others() -> None:
    known = Town("Known", (46.05, 11.30), 500)
    unknown = Town("Unknown", (46.02, 11.28), 0)
    others = [Town(f"T{n}", (46.1, 11.3 + n / 100), 9000) for n in range(3)]
    assert "Unknown" not in names(choose(CALDONAZZO, [unknown, known, *others], []))


def test_the_service_is_asked_from_the_square_not_from_the_position() -> None:
    service = around_caldonazzo()
    nearby = NearbyCities("K", service)
    nearby.towns((46.00361234, 11.26474321))
    assert {circle for _, _, circle in service.calls} == {
        f"circle:11.26,46.0,{FAR_RADIUS_M}",
        f"circle:11.26,46.0,{NEAR_RADIUS_M}",
    }
    # Another point of the same square costs nothing.
    nearby.towns((46.0012, 11.2629))
    assert len(service.calls) == 2


def test_the_answer_is_asked_again_after_a_day() -> None:
    now = [0.0]
    service = around_caldonazzo()
    nearby = NearbyCities("K", service, clock=lambda: now[0])
    nearby.towns(CALDONAZZO)
    now[0] = 23 * 3600.0
    nearby.towns(CALDONAZZO)
    assert len(service.calls) == 2
    now[0] = 25 * 3600.0
    nearby.towns(CALDONAZZO)
    assert len(service.calls) == 4


def client_with(nearby: NearbyCities, store: RouteStore | None = None) -> TestClient:
    app = create_app(FileSource(HERE))
    install_nearby_cities(app, nearby, store)
    return TestClient(app)


def test_the_endpoint_gives_the_towns_and_how_far_they_are() -> None:
    client = client_with(NearbyCities("K", around_caldonazzo()))
    response = client.get("/nearby-cities", params={"lat": 46.0036, "lon": 11.2647})
    assert response.status_code == 200
    places = response.json()["places"]
    assert [p["label"].split(",")[0] for p in places] == [
        "Levico Terme",
        "Pergine Valsugana",
        "Trento",
        "Borgo Valsugana",
    ]
    assert places[0] == {
        "label": "Levico Terme, Trentino – Alto Adige/Südtirol, Italy",
        "point": [46.0091259, 11.3017774],
        "away_m": 2929,
    }


def test_the_towns_centres_are_city_centres_for_the_kept_examples(
    tmp_path: Path,
) -> None:
    store = RouteStore(tmp_path / "routes", engine="engine-a")
    client = client_with(NearbyCities("K", around_caldonazzo()), store)
    client.get("/nearby-cities", params={"lat": 46.0036, "lon": 11.2647})
    centres = (tmp_path / "routes" / "city-centres.txt").read_text().split()
    assert cell((46.0091259, 11.3017774)) in centres
    assert len(centres) == 4


def test_without_a_key_or_an_answer_it_is_503() -> None:
    off = client_with(NearbyCities(None))
    response = off.get("/nearby-cities", params={"lat": 46.0, "lon": 11.26})
    assert response.status_code == 503
    assert response.json()["error"]["message"] == "Nearby towns are off on this API."

    def broken(url: str) -> Any:
        raise OSError(url)

    failed = client_with(NearbyCities("SECRET", broken))
    response = failed.get("/nearby-cities", params={"lat": 46.0, "lon": 11.26})
    assert response.status_code == 503
    assert "SECRET" not in response.text


def test_a_point_off_the_earth_is_refused() -> None:
    client = client_with(NearbyCities("K", around_caldonazzo()))
    assert client.get("/nearby-cities", params={"lat": 91, "lon": 0}).status_code == 422
    assert client.get("/nearby-cities").status_code == 422
