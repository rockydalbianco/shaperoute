"""Paddling on water (TASK-191, ADR-0154): the water around a start, the
band within 1 km of the shore, where a shape fits in it and the start on
the shore, on the hand-built fixtures of make_water_fixtures.py.

No network and no keys. The checks of the routes read the land from the
fixtures' own definitions (the coastline's knots, the lake's ellipse), not
from what water.py builds, so a wrong side of the coastline or a lost
island would show.
"""

from __future__ import annotations

import importlib.util
import json
import math
import xml.etree.ElementTree as ET
from pathlib import Path
from types import ModuleType
from typing import Any

import numpy as np
import pytest
import shapely
from shapely.geometry import LineString, Point, box

from route_engine import water, water_fit
from route_engine.errors import ShapeNotDrawableError
from route_engine.geo import LatLon, latlon_to_local_array, local_to_latlon
from route_engine.optimizer import SHAPE_POINTS
from route_engine.shapes import get_shape
from route_engine.water import (
    FileWaterSource,
    NoWaterError,
    OverpassWaterSource,
    WaterFitError,
    WaterNotCachedError,
    build_area,
    elements_from_osm_api,
    is_lake,
    roles,
    sea_in_box,
    water_query,
)
from route_engine.water_fit import fit_shape, measure, plan_on_water, rotations

FIXTURES = Path(__file__).parent / "fixtures"
COAST = FIXTURES / "water_coast.json"
LAKE = FIXTURES / "water_lake.json"


def _builder() -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        "make_water_fixtures", FIXTURES / "make_water_fixtures.py"
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BUILD = _builder()
# On the beach, 80 m inland; on the lakeside road's side of the lake.
COAST_START = local_to_latlon(BUILD.COAST_ORIGIN, 100.0, 80.0)
LAKE_START = local_to_latlon(BUILD.LAKE_ORIGIN, -700.0, 0.0)
HEART = get_shape("heart")(SHAPE_POINTS)
CIRCLE = get_shape("circle")(SHAPE_POINTS)


def _local(origin: LatLon, points: list[LatLon]) -> np.ndarray:
    return latlon_to_local_array(origin, np.asarray(points, dtype=float))


def _dense(xy: np.ndarray, step: float = 5.0) -> np.ndarray:
    line = LineString(xy)
    steps = np.append(np.arange(0.0, line.length, step), line.length)
    return shapely.get_coordinates(shapely.line_interpolate_point(line, steps))


def _coastline() -> LineString:
    return LineString(BUILD.COAST_KNOTS)


def _in_sea(x: float, y: float) -> bool:
    return y < BUILD.coastline_y(x)


def _in_lake(x: float, y: float) -> bool:
    cx, cy = BUILD.LAKE_CENTRE
    rx, ry = BUILD.LAKE_AXES
    ix, iy, ir = BUILD.ISLAND
    inside = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1.0
    return inside and math.hypot(x - ix, y - iy) > ir


def _lake_shore() -> shapely.Geometry:
    cx, cy = BUILD.LAKE_CENTRE
    rx, ry = BUILD.LAKE_AXES
    ix, iy, ir = BUILD.ISLAND
    t = np.linspace(0, 2 * np.pi, 2000)
    outer = LineString(np.column_stack([cx + rx * np.cos(t), cy + ry * np.sin(t)]))
    island = Point(ix, iy).buffer(ir, quad_segs=64).exterior
    return shapely.union(outer, island)


@pytest.fixture(scope="module")
def coast() -> water.WaterArea:
    source = FileWaterSource(COAST)
    assert source.bbox is not None
    return build_area(source.elements(source.bbox), COAST_START, source.bbox)


@pytest.fixture(scope="module")
def lake() -> water.WaterArea:
    source = FileWaterSource(LAKE)
    assert source.bbox is not None
    return build_area(source.elements(source.bbox), LAKE_START, source.bbox)


def _xy_in(area: water.WaterArea, origin: LatLon, points: list[LatLon]) -> np.ndarray:
    """Route points in the fixture's own frame (its origin, not the start)."""
    return _local(origin, points)


# --- The fixtures are what the builder writes --------------------------------


@pytest.mark.parametrize(
    "path, make", [(COAST, "coast"), (LAKE, "lake")], ids=["coast", "lake"]
)
def test_fixture_files_match_their_builder(path: Path, make: str) -> None:
    built = json.loads(json.dumps(getattr(BUILD, make)()))
    assert json.loads(path.read_text(encoding="utf-8")) == built


# --- A closed route from the shore, on the water, within 1 km ----------------


def test_a_route_on_the_sea_starts_and_ends_on_the_shore(
    coast: water.WaterArea,
) -> None:
    route = fit_shape(HEART, 2000, coast, name="heart")
    xy = _xy_in(coast, BUILD.COAST_ORIGIN, route.points)
    coastline = _coastline()

    assert route.points[0] == route.points[-1]
    assert coastline.distance(Point(xy[0])) < 0.5  # the start is on the shore
    assert route.shore_start == route.points[0]
    # On the beach (or the pier at x = 500), the only shore reachable there.
    assert -950 <= xy[0][0] <= 950
    assert route.shore_access in ("beach", "pier", "path")
    assert abs(route.distance_m - 2000) <= 0.10 * 2000

    dense = _dense(xy)
    off_start = np.hypot(*(dense - xy[0]).T) > 1.0
    assert all(_in_sea(x, y) for x, y in dense[off_start])  # never on land
    away = shapely.distance(shapely.points(dense), coastline)
    assert away.max() <= water.SHORE_BAND_M  # never beyond 1 km
    assert route.farthest_shore_m <= water.SHORE_BAND_M
    # The shape itself keeps off the shore; only the legs cross the margin.
    ring = _dense(xy[1:-1])
    assert coastline.distance(LineString(ring)) >= water.SHORE_MARGIN_M - 0.5
    assert route.nearest_land_m >= water.SHORE_MARGIN_M - 0.5


def test_a_route_on_the_lake_keeps_off_its_island(lake: water.WaterArea) -> None:
    route = fit_shape(HEART, 4000, lake, name="heart")
    xy = _xy_in(lake, BUILD.LAKE_ORIGIN, route.points)
    shore = _lake_shore()

    assert route.points[0] == route.points[-1]
    assert shore.distance(Point(xy[0])) < 1.0
    assert abs(route.distance_m - 4000) <= 0.10 * 4000
    dense = _dense(xy)
    off_start = np.hypot(*(dense - xy[0]).T) > 1.0
    assert all(_in_lake(x, y) for x, y in dense[off_start])
    assert shapely.distance(shapely.points(dense), shore).max() <= 1000.0
    ix, iy, ir = BUILD.ISLAND
    island = Point(ix, iy).buffer(ir, quad_segs=64)
    assert LineString(dense).distance(island) >= water.SHORE_MARGIN_M - 0.5
    # The only ways to the water are the lakeside road and the pier.
    assert -1550 <= xy[0][0] <= 50
    assert route.shore_access in ("path", "pier")


def test_a_circle_on_the_lake_is_one_turn(lake: water.WaterArea) -> None:
    route = fit_shape(CIRCLE, 3000, lake, name="circle", free_rotation=True)
    assert route.rotation_deg == 0.0
    assert abs(route.distance_m - 3000) <= 0.10 * 3000


def test_the_shape_and_its_legs_keep_clear_of_piers_and_breakwaters() -> None:
    # Beside the breakwater (x = -1600..-1200, 220 m out) and the river mouth.
    start = local_to_latlon(BUILD.COAST_ORIGIN, -1400.0, 80.0)
    source = FileWaterSource(COAST)
    route, area = plan_on_water(
        HEART, 2000, start, source, name="heart", bbox=source.bbox
    )
    assert route.move_m < 600  # the beach is the nearest way in
    xy = _xy_in(area, BUILD.COAST_ORIGIN, route.points)
    assert LineString(xy).distance(Point(-1400.0, -220.0)) < 600  # near it
    breakwater = LineString([(-1600.0, -220.0), (-1200.0, -220.0)])
    river = box(-300.0, -40.0, -260.0, 400.0)
    pier = LineString([(500.0, 0.0), (500.0, -150.0)])
    line = LineString(xy)
    assert line.distance(breakwater) >= water.OBSTACLE_MARGIN_M
    assert not line.intersects(river)
    assert not line.intersects(pier.buffer(water.LINE_HALF_WIDTH_M))


def test_the_plan_is_the_same_every_time(coast: water.WaterArea) -> None:
    first = fit_shape(HEART, 2000, coast, name="heart")
    again = fit_shape(HEART, 2000, coast, name="heart")
    assert first == again


def test_measures_say_the_route_is_on_the_water(coast: water.WaterArea) -> None:
    route = fit_shape(HEART, 2000, coast, name="heart")
    measures = measure(route.points, coast)
    assert measures.closed
    assert measures.on_land_m < 0.01
    assert measures.farthest_shore_m <= water.SHORE_BAND_M
    assert measures.distance_m == pytest.approx(route.distance_m, rel=1e-6)
    # A line across the beach is on land, and says how much.
    inland = [local_to_latlon(BUILD.COAST_ORIGIN, x, 200.0) for x in (0.0, 300.0)]
    across = [route.points[0], *inland, route.points[0]]
    assert measure(across, coast).on_land_m > 300.0


# --- Errors that say why ----------------------------------------------------


def test_far_from_the_water_is_an_error_that_says_so() -> None:
    inland = local_to_latlon(BUILD.COAST_ORIGIN, 0.0, 3500.0)
    with pytest.raises(NoWaterError, match="no lake or sea to paddle on"):
        plan_on_water(
            HEART,
            2000,
            inland,
            FileWaterSource(COAST),
            name="heart",
            bbox=FileWaterSource(COAST).bbox,
        )


def test_land_without_water_is_an_error_that_says_so() -> None:
    source = FileWaterSource(LAKE)
    assert source.bbox is not None
    elements = [e for e in source.elements(source.bbox) if e["id"] != 100]
    area = build_area(elements, LAKE_START, source.bbox)
    assert area.navigable.is_empty
    with pytest.raises(NoWaterError) as caught:
        fit_shape(HEART, 2000, area, name="heart")
    assert isinstance(caught.value, ShapeNotDrawableError)


def test_a_shape_too_large_for_the_band_is_an_error_with_what_fits(
    coast: water.WaterArea,
) -> None:
    with pytest.raises(WaterFitError, match="does not fit at 6 km") as caught:
        fit_shape(HEART, 6000, coast, name="heart")
    fits = caught.value.best_distance_m
    assert fits is not None and 2500 <= fits <= 4000
    assert isinstance(caught.value, ShapeNotDrawableError)
    # Asking for what it said fits gives a route.
    route = fit_shape(HEART, round(fits), coast, name="heart")
    assert abs(route.distance_m - fits) <= 0.10 * fits


def test_a_shape_that_does_not_fit_at_all_says_so(coast: water.WaterArea) -> None:
    with pytest.raises(WaterFitError, match="even at") as caught:
        fit_shape(HEART, 10_000, coast, name="heart")
    assert caught.value.best_distance_m is None


def test_no_shore_to_start_from_is_an_error_that_says_so() -> None:
    source = FileWaterSource(COAST)
    assert source.bbox is not None
    no_way_in = [
        e
        for e in source.elements(source.bbox)
        if not roles(e.get("tags", {}), e["type"]) & set(water.ACCESS_KINDS)
    ]
    area = build_area(no_way_in, COAST_START, source.bbox)
    assert len(area.access) == 0
    with pytest.raises(WaterFitError, match="reached on foot"):
        fit_shape(HEART, 2000, area, name="heart")


# --- The water, the band and the shore ---------------------------------------


def test_the_sea_is_right_of_the_coastline() -> None:
    square = box(-1000.0, -1000.0, 1000.0, 1000.0)
    eastward = LineString([(-1500.0, 0.0), (1500.0, 0.0)])
    sea = sea_in_box([eastward], square)
    assert sea.area == pytest.approx(2_000_000.0)
    assert sea.contains(Point(0.0, -500.0))
    westward = LineString([(1500.0, 0.0), (-1500.0, 0.0)])
    assert sea_in_box([westward], square).contains(Point(0.0, 500.0))
    # An island: a closed coastline, land on its left (counter-clockwise).
    t = np.linspace(0, 2 * np.pi, 33)
    island = LineString(np.column_stack([100 * np.cos(t), -500 + 100 * np.sin(t)]))
    with_island = sea_in_box([eastward, island], square)
    assert not with_island.contains(Point(0.0, -500.0))
    assert with_island.contains(Point(0.0, -700.0))
    assert sea_in_box([], square).is_empty


def test_the_band_is_within_1_km_of_the_shore_and_off_it(
    coast: water.WaterArea,
) -> None:
    coastline = _coastline()
    o = latlon_to_local_array(COAST_START, np.array([BUILD.COAST_ORIGIN]))[0]
    band = shapely.affinity.translate(coast.band, xoff=-o[0], yoff=-o[1])
    xs, ys = np.meshgrid(np.arange(-2900, 2900, 25.0), np.arange(-2400, 900, 25.0))
    inside = shapely.contains_xy(band, xs.ravel(), ys.ravel())
    points = shapely.points(xs.ravel()[inside], ys.ravel()[inside])
    away = shapely.distance(points, coastline)
    assert inside.sum() > 1000
    assert away.min() >= water.SHORE_MARGIN_M - 0.5
    assert away.max() <= water.SHORE_BAND_M
    # The rock is too small to be a shore: no band 1 km around it out at sea.
    assert not band.contains(Point(1500.0, -1700.0))


def test_the_lake_is_one_polygon_with_its_island(lake: water.WaterArea) -> None:
    cx, cy = BUILD.LAKE_CENTRE
    rx, ry = BUILD.LAKE_AXES
    ix, iy, ir = BUILD.ISLAND
    o = latlon_to_local_array(LAKE_START, np.array([BUILD.LAKE_ORIGIN]))[0]
    water_area = shapely.union(lake.navigable, lake.obstacles.intersection(lake.box))
    expected = math.pi * (rx * ry - ir * ir)
    assert water_area.area == pytest.approx(expected, rel=0.01)
    assert lake.dry.contains(Point(ix + o[0], iy + o[1]))  # the island is land
    assert lake.navigable.contains(Point(cx + o[0], cy + o[1]))
    # The pond on land is no lake.
    assert lake.dry.contains(Point(-3000.0 + o[0], 500.0 + o[1]))


def test_the_shore_is_reached_on_foot_only_where_a_way_comes_to_it(
    coast: water.WaterArea,
) -> None:
    o = latlon_to_local_array(COAST_START, np.array([BUILD.COAST_ORIGIN]))[0]
    xs = coast.access[:, 0] - o[0]
    kinds = np.array(coast.access_kind)
    beach = (xs >= -950) & (xs <= 950)
    slipway = np.abs(xs + 2500) <= 60
    assert beach.any() and slipway.any()
    assert (beach | slipway).all()  # not along the motorway, nor elsewhere
    assert set(kinds[slipway]) == {"slipway"}
    assert "beach" in set(kinds[beach])


def test_tags_say_what_an_element_is_to_the_water() -> None:
    groyne = {"man_made": "groyne", "highway": "footway", "foot": "yes"}
    assert roles(groyne) == {"obstacle", "path"}
    assert roles({"man_made": "pier"}) == {"obstacle", "pier"}
    assert roles({"highway": "motorway"}) == frozenset()
    assert roles({"highway": "footway", "foot": "no"}) == frozenset()
    assert roles({"highway": "service", "access": "private"}) == frozenset()
    assert roles({"natural": "coastline"}) == {"coastline"}
    marina = {"natural": "water", "leisure": "marina"}
    assert roles(marina) == {"water", "obstacle"}
    assert not is_lake(marina)
    assert is_lake({"natural": "water", "water": "lake"})
    assert is_lake({"natural": "water"})
    assert not is_lake({"natural": "water", "water": "river"})
    assert not is_lake({"natural": "water", "water": "lagoon"})
    assert roles({"building": "yes"}) == frozenset()
    # A node is a way to the water only as a slipway.
    assert roles({"leisure": "slipway"}, "node") == {"slipway"}
    assert roles({"highway": "crossing"}, "node") == frozenset()
    assert roles({"man_made": "pier"}, "node") == frozenset()


def test_rotations_keep_shapes_upright_and_turn_the_circle_not_at_all() -> None:
    assert rotations(True) == (0.0,)
    upright = rotations(False)
    assert upright[0] == 0.0
    assert sorted(upright) == [-15.0, -10.0, -5.0, 0.0, 5.0, 10.0, 15.0]


# --- Where the water comes from ----------------------------------------------


def _osm_api_answer() -> dict[str, Any]:
    def node(i: int, lat: float, lon: float, **tags: str) -> dict[str, Any]:
        row: dict[str, Any] = {"type": "node", "id": i, "lat": lat, "lon": lon}
        if tags:
            row["tags"] = tags
        return row

    return {
        "elements": [
            node(1, 44.0, 12.0),
            node(2, 44.0, 12.01),
            node(3, 44.01, 12.01),
            node(4, 44.01, 12.0, leisure="slipway"),
            node(5, 44.0, 12.005, highway="crossing"),
            {
                "type": "way",
                "id": 10,
                "nodes": [1, 2],
                "tags": {"natural": "coastline"},
            },
            {"type": "way", "id": 11, "nodes": [2, 3, 1, 2]},
            {"type": "way", "id": 12, "nodes": [1, 3], "tags": {"building": "yes"}},
            {
                "type": "relation",
                "id": 20,
                "tags": {"type": "multipolygon", "natural": "water"},
                "members": [
                    {"type": "way", "ref": 11, "role": "outer"},
                    {"type": "way", "ref": 99, "role": "outer"},
                ],
            },
        ]
    }


def test_osm_api_answers_become_water_elements() -> None:
    elements = elements_from_osm_api([_osm_api_answer()])
    by_id = {(e["type"], e["id"]): e for e in elements}
    assert set(by_id) == {("way", 10), ("relation", 20), ("node", 4)}
    coastline = by_id[("way", 10)]["geometry"]
    assert coastline == [{"lat": 44.0, "lon": 12.0}, {"lat": 44.0, "lon": 12.01}]
    members = by_id[("relation", 20)]["members"]
    assert [m["ref"] for m in members] == [11]  # way 99 is in no answer
    assert len(members[0]["geometry"]) == 4


def test_the_cache_serves_an_area_inside_it_without_downloading(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def refused(query: str) -> dict[str, Any]:
        raise AssertionError("downloaded")

    monkeypatch.setattr(water, "overpass", refused)
    source = OverpassWaterSource(tmp_path)
    file_source = FileWaterSource(COAST)
    assert file_source.bbox is not None
    south, west, north, east = file_source.bbox
    water.write_water(source.path(file_source.bbox), file_source.bbox, [])
    inside = (south + 0.001, west + 0.001, north - 0.001, east - 0.001)
    assert source.is_cached(inside)
    assert source.elements(inside) == []
    with pytest.raises(WaterNotCachedError):
        OverpassWaterSource(tmp_path, download=False).elements(
            (south - 1, west, north, east)
        )


def test_a_miss_downloads_once_and_keeps_only_what_the_water_needs(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    asked: list[str] = []
    coast = json.loads(COAST.read_text(encoding="utf-8"))
    noise = {"type": "way", "id": 77, "tags": {"building": "yes"}, "geometry": []}

    def answer(query: str) -> dict[str, Any]:
        asked.append(query)
        return {"elements": [*coast["elements"], noise]}

    monkeypatch.setattr(water, "overpass", answer)
    bbox = (44.0, 12.6, 44.1, 12.7)
    source = OverpassWaterSource(tmp_path)
    first = source.elements(bbox)
    again = source.elements(bbox)
    assert len(asked) == 1
    assert first == again == water.compact(coast["elements"])
    assert source.path(bbox).name == "water_44.00000_12.60000_44.10000_12.70000.json"
    assert source.path(bbox).parent == tmp_path / "water"
    assert not list((tmp_path / "water").glob(".*.part"))


def test_the_overpass_query_asks_for_the_water_and_the_ways_to_it() -> None:
    query = water_query((44.0, 12.6, 44.1, 12.7))
    assert query.startswith("[out:json][timeout:180];")
    assert '"natural"="coastline"' in query
    assert 'relation["natural"="water"](44.00000,12.60000,44.10000,12.70000)' in query
    assert "(around.s:40)" in query
    assert query.endswith("out tags geom;")


def test_water_bbox_covers_the_reach_of_a_shape() -> None:
    south, west, north, east = water_fit.water_bbox(COAST_START, HEART, 2000)
    corners = latlon_to_local_array(
        COAST_START, np.array([[south, west], [north, east]])
    )
    half = water_fit.MOVE_MAX_M + water_fit.APPROACH_MAX_M + water.SHORE_BAND_M
    assert -corners[0][0] >= half and corners[1][1] >= half


# --- From the command line ---------------------------------------------------


def test_the_command_line_writes_a_closed_gpx(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    out = tmp_path / "heart.gpx"
    lat, lon = COAST_START
    code = water.main(
        [
            "--shape",
            "heart",
            "--distance",
            "2000",
            "--start",
            f"{lat},{lon}",
            "--water-file",
            str(COAST),
            "--out",
            str(out),
            "--geojson",
            str(tmp_path / "heart.geojson"),
        ]
    )
    assert code == 0
    printed = capsys.readouterr().out
    assert "shore start" in printed and "farthest from the shore" in printed
    ns = {"g": "http://www.topografix.com/GPX/1/1"}
    points = ET.parse(out).getroot().findall(".//g:trkpt", ns)
    assert len(points) > 100
    assert points[0].attrib == points[-1].attrib
    layers = {
        f["properties"]["layer"]
        for f in json.loads((tmp_path / "heart.geojson").read_text())["features"]
    }
    assert {"band", "route", "access"} <= layers


def test_the_command_line_says_when_there_is_no_water(
    capsys: pytest.CaptureFixture[str],
) -> None:
    lat, lon = local_to_latlon(BUILD.COAST_ORIGIN, 0.0, 3500.0)
    code = water.main(
        [
            "--shape",
            "heart",
            "--distance",
            "2000",
            "--start",
            f"{lat},{lon}",
            "--water-file",
            str(COAST),
        ]
    )
    assert code == 2
    assert "No route: there is no lake or sea" in capsys.readouterr().err
