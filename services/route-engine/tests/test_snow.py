"""The snow one may walk on with snowshoes (TASK-413, ADR-0342): what is off,
the slopes, the ways in, the cache. Elements and heights are made here:
no network."""

from __future__ import annotations

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
    CHOSEN,
    FileSnowSource,
    NoSnowError,
    OverpassSnowSource,
    SnowFitError,
    SnowNotCachedError,
    SnowRules,
    as_snow_error,
    build_area,
    compact,
    role,
    snow_bbox,
    snow_query,
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
