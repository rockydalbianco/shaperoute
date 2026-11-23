"""The snow one may walk on with snowshoes (TASK-413, ADR-0342): what is off,
the slopes, the ways in, the cache. Elements and heights are made here:
no network."""

from __future__ import annotations

import io
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from shapely.geometry import Point

from route_engine import snow
from route_engine.geo import latlon_to_local_array, local_to_latlon
from route_engine.snow import (
    BUILT_UP_PER_KM2,
    CHOSEN,
    COUNT_TIMEOUT_S,
    TOWN_HALF_M,
    CountsBuildings,
    FileSnowSource,
    NoSnowError,
    OverpassSnowSource,
    SnowFitError,
    SnowNotCachedError,
    SnowRules,
    as_snow_error,
    box_km2,
    build_area,
    buildings_in,
    built_up,
    compact,
    count_buildings,
    count_query,
    no_snow_error,
    role,
    snow_bbox,
    snow_query,
    town_bbox,
)
from route_engine.water import NoWaterError, WaterFitError, write_water

ORIGIN = (46.0, 11.0)
HALF_M = 1500.0


def _bbox(half: float = HALF_M) -> tuple[float, float, float, float]:
    south, west = local_to_latlon(ORIGIN, -half, -half)
    north, east = local_to_latlon(ORIGIN, half, half)
    return (south, west, north, east)


def _way(
    tags: dict[str, str], *xy: tuple[float, float], id_: int = 1
) -> dict[str, Any]:
    points = [local_to_latlon(ORIGIN, x, y) for x, y in xy]
    return {
        "type": "way",
        "id": id_,
        "tags": tags,
        "geometry": [{"lat": lat, "lon": lon} for lat, lon in points],
    }


def _square(tags: dict[str, str], x: float, y: float, half: float) -> dict[str, Any]:
    corners = [(x - half, y - half), (x + half, y - half), (x + half, y + half)]
    corners += [(x - half, y + half), (x - half, y - half)]
    return _way(tags, *corners)


class _Flat:
    def heights(self, points: np.ndarray) -> np.ndarray:
        return np.full(len(points), 1600.0)


class _SteepEast:
    """Flat to the west of `from_x`, `deg` degrees up to the east."""

    def __init__(self, from_x: float, deg: float = 35.0) -> None:
        self.from_x, self.rise = from_x, math.tan(math.radians(deg))

    def heights(self, points: np.ndarray) -> np.ndarray:
        x = latlon_to_local_array(ORIGIN, np.asarray(points, dtype=float))[:, 0]
        return 1600.0 + self.rise * np.maximum(x - self.from_x, 0.0)


ROAD = _way({"highway": "unclassified"}, (-1500.0, 0.0), (1500.0, 0.0))


def test_the_rules_are_the_user_s_choice() -> None:
    assert CHOSEN == SnowRules(25.0, 30.0, 30.0, woods=False, streams=False)
    assert not CHOSEN.protected


@pytest.mark.parametrize(
    ("tags", "found"),
    [
        ({"building": "yes"}, "buildings"),
        ({"landuse": "residential"}, "settlements"),
        ({"leisure": "pitch"}, "settlements"),
        ({"natural": "water"}, "water"),
        ({"natural": "glacier"}, "glacier"),
        ({"natural": "scree"}, "rock"),
        ({"natural": "cliff"}, "cliffs"),
        ({"natural": "wood"}, "woods"),
        ({"landuse": "forest"}, "woods"),
        ({"waterway": "river"}, "rivers"),
        ({"waterway": "stream"}, "streams"),
        ({"piste:type": "downhill"}, "pistes"),
        ({"piste:type": "nordic", "highway": "track"}, "pistes"),
        ({"aerialway": "chair_lift"}, "lifts"),
        ({"railway": "rail"}, "rails"),
        ({"highway": "primary"}, "main roads"),
        ({"boundary": "protected_area", "protect_class": "1a"}, "protected"),
        ({"leisure": "nature_reserve"}, "protected"),
        ({"highway": "residential"}, "road"),
        ({"highway": "track"}, "track"),
        ({"highway": "path"}, "path"),
        # Parks stay in, and a winter hiking route is snow to walk on.
        ({"boundary": "protected_area", "protect_class": "2"}, None),
        ({"boundary": "protected_area", "protect_class": "5"}, None),
        ({"piste:type": "hike"}, None),
        ({"landuse": "meadow"}, None),
        ({"highway": "proposed"}, None),
    ],
)
def test_what_each_element_is_to_the_snow(tags: dict[str, str], found: str) -> None:
    assert role(tags) == found


def test_the_query_leaves_parks_out_and_asks_the_geometry() -> None:
    query = snow_query((46.0, 11.0, 46.1, 11.1))
    assert "46.00000,11.00000,46.10000,11.10000" in query
    assert '["protect_class"!~"^(2|5)$"]' in query
    # A town's park drawn as a multipolygon is asked too (Parco Sempione).
    assert 'relation["leisure"~"^(golf_course|pitch|garden|park)$"]' in query
    assert query.endswith("out body geom;")
    assert "[timeout:180]" in query


def test_compact_keeps_what_the_snow_reads() -> None:
    elements = [
        _way({"natural": "wood", "name": "Bosco", "source": "survey"}, (0, 0), (1, 1)),
        _way({"landuse": "meadow"}, (0, 0), (1, 1)),
        {
            "type": "node",
            "id": 9,
            "lat": 46.0,
            "lon": 11.0,
            "tags": {"natural": "peak"},
        },
    ]
    kept = compact(elements)
    assert len(kept) == 1
    assert kept[0]["tags"] == {"natural": "wood", "name": "Bosco"}
    assert len(kept[0]["geometry"]) == 2


def test_a_meadow_with_a_road_is_all_snow_but_the_road_s_edge() -> None:
    area = build_area([ROAD], _Flat(), ORIGIN, _bbox())
    water = area.water
    assert water.navigable.area == pytest.approx(water.box.area)
    assert water.band.contains(Point(0.0, 500.0))
    assert water.dry.is_empty
    # The ways in: every 25 m of the road inside the box.
    assert len(water.access) == pytest.approx(3000 / 25, abs=2)
    assert set(water.access_kind) == {"road"}
    assert area.shares()["allowed"] == 1.0


def test_what_is_off_is_off_by_its_margins() -> None:
    elements = [
        ROAD,
        _square({"natural": "wood"}, 600.0, 600.0, 200.0),
        _square({"building": "yes"}, -600.0, 600.0, 10.0),
        _way({"piste:type": "downhill"}, (-600.0, -1500.0), (-600.0, -300.0)),
        _way({"highway": "primary"}, (900.0, -1500.0), (900.0, -300.0)),
        _way({"waterway": "stream"}, (-1500.0, 300.0), (1500.0, 300.0)),
        _square({"boundary": "protected_area", "protect_class": "2"}, 0, 0, 1400),
    ]
    area = build_area(elements, _Flat(), ORIGIN, _bbox())
    band = area.water.band
    assert not band.contains(Point(600.0, 600.0))  # the wood
    assert not band.intersects(Point(-600.0, 615.0))  # 10 m round the building
    assert not band.intersects(Point(-575.0, -800.0))  # 30 m from the piste
    assert band.contains(Point(-560.0, -800.0))
    assert not band.intersects(Point(905.0, -800.0))  # the main road
    assert not band.intersects(Point(0.0, 301.0))  # the stream
    assert band.contains(Point(0.0, -600.0))  # the park stays in
    assert set(area.off) == {"woods", "buildings", "pistes", "main roads", "streams"}
    # The main road is no way in, the minor road is.
    assert set(area.water.access_kind) == {"road"}


def test_the_rules_may_let_woods_streams_and_reserves_in() -> None:
    elements = [
        _square({"natural": "wood"}, 600.0, 600.0, 200.0),
        _way({"waterway": "stream"}, (-1500.0, 300.0), (1500.0, 300.0)),
        _square({"leisure": "nature_reserve"}, -600.0, -600.0, 200.0),
    ]
    off = build_area(elements, _Flat(), ORIGIN, _bbox())
    assert set(off.off) == {"woods", "streams", "protected"}
    rules = SnowRules(woods=True, streams=True, protected=True)
    allowed = build_area(elements, _Flat(), ORIGIN, _bbox(), rules)
    assert allowed.off == {}
    assert allowed.water.band.contains(Point(600.0, 600.0))


def test_steep_slopes_are_off_with_a_margin() -> None:
    area = build_area([ROAD], _SteepEast(500.0), ORIGIN, _bbox())
    steep = area.off["steep"]
    over_25 = area.slopes.steeper_than(25.0).bounds[0]
    over_30 = area.slopes.steeper_than(30.0).bounds[0]
    # The slope starts at x = 500: the cells over 25° from there (a cell
    # either side), and 30 m round those over 30°.
    assert 475.0 <= over_25 <= over_30 <= 550.0
    assert steep.bounds[0] == pytest.approx(min(over_25, over_30 - 30.0), abs=0.5)
    assert not area.water.band.intersects(Point(800.0, 0.0))
    assert area.water.band.contains(Point(0.0, 500.0))
    # The road on the steep side is no way in.
    assert area.water.access[:, 0].max() < 500.0
    # A gentle slope stays in.
    gentle = build_area([ROAD], _SteepEast(500.0, deg=20.0), ORIGIN, _bbox())
    assert "steep" not in gentle.off


def test_the_box_of_a_request_reaches_the_farthest_shape() -> None:
    circle = [(math.cos(t), math.sin(t)) for t in np.linspace(0, 2 * math.pi, 129)]
    south, west, north, east = snow_bbox(ORIGIN, circle, 3000)
    lo = latlon_to_local_array(ORIGIN, np.array([[south, west], [north, east]]))
    half = (lo[1, 0] - lo[0, 0]) / 2
    radius = 3000 / (2 * math.pi)
    assert half == pytest.approx(2000 + 300 + 2 * radius + 100, abs=20)


def test_the_cache_serves_an_area_it_covers(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    asked: list[str] = []

    def fake_overpass(query: str) -> dict[str, Any]:
        asked.append(query)
        return {"elements": [ROAD, _way({"landuse": "meadow"}, (0, 0), (1, 1))]}

    monkeypatch.setattr(snow, "overpass", fake_overpass)
    source = OverpassSnowSource(tmp_path)
    big = _bbox(2000.0)
    assert not source.is_cached(big)
    elements = source.elements(big)
    assert len(asked) == 1 and len(elements) == 1
    assert source.path(big).is_file()
    # A smaller area is served from the file of the bigger one.
    assert source.elements(_bbox(1000.0)) == elements
    assert len(asked) == 1
    offline = OverpassSnowSource(tmp_path, download=False)
    assert offline.elements(_bbox(1000.0)) == elements
    with pytest.raises(SnowNotCachedError):
        offline.elements(_bbox(3000.0))


def test_a_file_source_reads_the_water_format(tmp_path: Path) -> None:
    path = tmp_path / "snow.json"
    write_water(path, _bbox(), [ROAD])
    source = FileSnowSource(path)
    assert source.elements(_bbox(10.0)) == json.loads(path.read_text())["elements"]
    assert source.bbox == pytest.approx(_bbox())


def test_the_errors_of_the_water_are_said_for_the_snow() -> None:
    none = as_snow_error(NoWaterError("no lake"), "heart", 1000)
    assert isinstance(none, NoSnowError)
    assert "snow" in str(none) and "water" not in str(none)
    fits = as_snow_error(WaterFitError("x", best_distance_m=1700.0), "heart", 3000)
    assert isinstance(fits, SnowFitError)
    assert fits.best_distance_m == 1700.0
    assert str(fits) == (
        "the heart does not fit at 3 km on open snow here: it fits at 1.7 km"
    )
    far = as_snow_error(
        WaterFitError("the star fits ..., but no shore ... can be reached on foot"),
        "star",
        1000,
    )
    assert isinstance(far, SnowFitError) and "road, track or path" in str(far)
    small = as_snow_error(WaterFitError("does not fit even at"), "star", 1000)
    assert isinstance(small, SnowFitError) and small.best_distance_m is None
    assert "even at 0.4 km" in str(small)


# --- A town, said before the snow is read (TASK-413 A3) ----------------------

BUILT_UP = Path(__file__).parent / "fixtures" / "snow_built_up.json"


def _house(x: float, y: float, id_: int) -> dict[str, Any]:
    return _square({"building": "house"}, x, y, 5.0) | {"id": id_}


def test_a_box_is_measured_in_km2() -> None:
    assert box_km2(_bbox(1000.0)) == pytest.approx(4.0, rel=1e-3)
    assert box_km2(_bbox(2500.0)) == pytest.approx(25.0, rel=1e-3)


def test_the_town_box_is_where_a_shape_may_lie_round_the_start() -> None:
    assert TOWN_HALF_M == 2000 + 300 + 100
    box = town_bbox(ORIGIN)
    assert box_km2(box) == pytest.approx((2 * TOWN_HALF_M / 1000) ** 2, rel=0.01)
    south, west, north, east = box
    assert south < ORIGIN[0] < north and west < ORIGIN[1] < east


def test_a_town_is_a_box_with_more_buildings_than_the_threshold() -> None:
    bbox = _bbox(1000.0)  # 4 km²
    limit = BUILT_UP_PER_KM2 * box_km2(bbox)
    assert built_up(math.floor(limit) + 1, bbox)
    assert not built_up(math.floor(limit) - 1, bbox)
    # A count not known is no town: the request goes on as before.
    assert not built_up(None, bbox)


def _places() -> list[dict[str, Any]]:
    return list(json.loads(BUILT_UP.read_text())["places"])


@pytest.mark.parametrize("place", _places(), ids=lambda p: str(p["name"]))
def test_the_places_of_the_bench_are_towns_or_snow_as_measured(
    place: dict[str, Any],
) -> None:
    """The buildings counted in the town box of real places (Overpass, or
    the bench's cached snow; sports/snowshoes.md, the bench of A3). The
    mountain villages and the ski resorts must never be called towns: there
    a wrong «no» is worse than the wait."""
    bbox = tuple(place["bbox"])
    assert bbox == pytest.approx(town_bbox(tuple(place["start"])), abs=1e-4)
    at_once = place["expected"] == "no snow at once"
    assert built_up(place["buildings"], bbox) is at_once


def test_the_threshold_keeps_a_margin_over_every_place_with_snow() -> None:
    """The densest place with snow stays well under the threshold: a village
    that grows a little is still not a town."""
    densities = [
        p["buildings"] / box_km2(tuple(p["bbox"]))
        for p in _places()
        if p["kind"] == "snow"
    ]
    assert max(densities) < 0.75 * BUILT_UP_PER_KM2


def test_every_place_with_snow_is_planned_as_before() -> None:
    for place in _places():
        if place["kind"] == "snow":
            assert place["expected"] == "planned as before", place["name"]


def test_the_places_cover_what_the_coordinatore_asked() -> None:
    names = {p["name"] for p in _places()}
    asked = {"Asiago", "Cortina d'Ampezzo", "Livigno", "Bormio", "Trento", "Bolzano"}
    assert asked | {"Milano, Duomo", "Moena"} <= names


def test_the_buildings_of_a_box_are_counted_as_overpass_counts_them() -> None:
    bbox = _bbox(1000.0)
    elements = [
        _house(0.0, 0.0, 1),
        _house(500.0, 500.0, 2),
        _house(5000.0, 0.0, 3),  # outside the box
        _square({"landuse": "residential"}, 0, 0, 300),  # not a building
        {"type": "relation", "id": 9, "tags": {"building": "yes"}, "members": []},
    ]
    assert buildings_in(elements, bbox) == 2


def test_the_count_query_is_short_and_counts_ways() -> None:
    query = count_query((45.9, 10.9, 46.1, 11.1))
    assert f"[timeout:{COUNT_TIMEOUT_S}]" in query
    assert 'way["building"](45.90000,10.90000,46.10000,11.10000)' in query
    assert query.endswith("out count;")


def test_the_count_is_read_from_overpass_answer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    waited: list[float] = []

    def urlopen(request: Any, timeout: float) -> io.BytesIO:
        waited.append(timeout)
        answer = {"elements": [{"type": "count", "tags": {"ways": "1234"}}]}
        return io.BytesIO(json.dumps(answer).encode())

    monkeypatch.setattr(snow.urllib.request, "urlopen", urlopen)
    assert count_buildings(count_query(_bbox())) == 1234
    assert waited == [snow.COUNT_WAIT_S]


def test_the_count_comes_from_the_cached_snow_without_the_network(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def no_network(query: str) -> int:
        raise AssertionError("the network was asked")

    monkeypatch.setattr(snow, "count_buildings", no_network)
    source = OverpassSnowSource(tmp_path)
    write_water(
        source.path(_bbox(3000.0)),
        _bbox(3000.0),
        [ROAD, _house(0.0, 0.0, 1), _house(2500.0, 0.0, 2)],
    )
    assert isinstance(source, CountsBuildings)
    assert source.buildings(_bbox(3000.0)) == 2
    assert source.buildings(_bbox(1000.0)) == 1


def test_the_count_is_asked_once_and_kept_in_the_cache(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    asked: list[str] = []

    def counted(query: str) -> int:
        asked.append(query)
        return 4321

    monkeypatch.setattr(snow, "count_buildings", counted)
    source = OverpassSnowSource(tmp_path)
    assert source.buildings(_bbox()) == 4321
    assert source.buildings(_bbox()) == 4321
    assert asked == [count_query(_bbox())]
    assert source.count_path(_bbox()).is_file()
    # Offline the cached count is read; a count never asked is not known.
    offline = OverpassSnowSource(tmp_path, download=False)
    assert offline.buildings(_bbox()) == 4321
    assert offline.buildings(_bbox(900.0)) is None
    # The count's file is no snow: the snow is still downloaded.
    assert not source.is_cached(_bbox())


@pytest.mark.parametrize(
    "failure",
    [
        TimeoutError("late"),
        OSError("Overpass said 429"),
        ValueError("not JSON"),
        KeyError("elements"),
    ],
    ids=["timeout", "refused", "not json", "no count"],
)
def test_a_count_that_fails_or_comes_late_goes_on_as_before(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, failure: Exception
) -> None:
    def fails(query: str) -> int:
        raise failure

    monkeypatch.setattr(snow, "count_buildings", fails)
    source = OverpassSnowSource(tmp_path)
    assert source.buildings(_bbox()) is None
    # Nothing is kept: the next request asks again.
    assert not source.count_path(_bbox()).exists()


def test_a_broken_count_file_is_asked_again(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(snow, "count_buildings", lambda query: 7)
    source = OverpassSnowSource(tmp_path)
    source.count_path(_bbox()).parent.mkdir(parents=True)
    source.count_path(_bbox()).write_text("{")
    assert source.buildings(_bbox()) == 7


def test_a_file_source_counts_its_buildings(tmp_path: Path) -> None:
    path = tmp_path / "snow.json"
    write_water(path, _bbox(), [ROAD, _house(0.0, 0.0, 1)])
    assert FileSnowSource(path).buildings(_bbox()) == 1


def test_no_snow_is_one_text() -> None:
    error = as_snow_error(NoWaterError("no water"), "heart", 1000.0)
    assert isinstance(error, NoSnowError)
    assert str(error) == str(no_snow_error())
