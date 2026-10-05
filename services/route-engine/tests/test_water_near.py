"""A shape on the water wanted somewhere (TASK-238): `near` of `fit_shape`
and of a paddling request, and the `centre` a route says its shape has.

The user drags the shape on the map; the app asks for it near where it was
left. The engine still decides: the shape is at the nearest place where it
fits, in the band, with a shore start reachable on foot.

On the hand-built fixtures of make_water_fixtures.py. No network, no keys.
"""

from __future__ import annotations

import importlib.util
import math
import re
from pathlib import Path
from types import ModuleType

import pytest

import route_engine.__main__ as cli
from route_engine import water
from route_engine.geo import LatLon, latlon_to_local, local_to_latlon
from route_engine.models import (
    NEAR_ON_WATER_ONLY,
    InvalidRequestError,
    RouteRequest,
)
from route_engine.paddling import plan_paddling, water_area
from route_engine.shapes import get_shape
from route_engine.validation import check_on_water
from route_engine.water import FileWaterSource, OverpassWaterSource, build_area
from route_engine.water_fit import (
    APPROACH_MAX_M,
    MAX_CELL_M,
    NEAR_FREE_M,
    WaterRoute,
    fit_shape,
    measure,
)

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
# As test_water.py: on the beach, and on the lakeside road's side.
COAST_START = local_to_latlon(BUILD.COAST_ORIGIN, 100.0, 80.0)
LAKE_START = local_to_latlon(BUILD.LAKE_ORIGIN, -700.0, 0.0)
# How far from the point it is wanted at a shape that fits there may be: the
# metres that cost nothing, and a cell of the grid the band is looked at on.
CLOSE_M = NEAR_FREE_M + MAX_CELL_M
HEART = list(get_shape("heart")(128))
CIRCLE = list(get_shape("circle")(128))


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


def _moved(area: water.WaterArea, route: WaterRoute, dx: float, dy: float) -> LatLon:
    """The centre of `route`, `dx` metres east and `dy` north."""
    x, y = latlon_to_local(area.origin, route.centre)
    return local_to_latlon(area.origin, x + dx, y + dy)


def _off(area: water.WaterArea, route: WaterRoute, wanted: LatLon) -> float:
    """Metres from the centre of `route` to `wanted`."""
    return math.dist(
        latlon_to_local(area.origin, route.centre),
        latlon_to_local(area.origin, wanted),
    )


def _checked(area: water.WaterArea, route: WaterRoute, distance_m: float) -> None:
    """The route is one the engine gives: closed, on the water, in the
    band, the distance asked, its legs within reach of the shore."""
    check_on_water(measure(route.points, area), distance_m)
    assert route.approach_m <= APPROACH_MAX_M


# --- The centre a route says ------------------------------------------------


def test_a_route_says_where_the_centre_of_its_shape_is(
    coast: water.WaterArea,
) -> None:
    route = fit_shape(HEART, 2000, coast, name="heart")
    x, y = latlon_to_local(coast.origin, route.centre)
    # Among the points of the shape, off the shore: the sea is south.
    ring = [latlon_to_local(coast.origin, p) for p in route.points[1:-1]]
    assert min(p[0] for p in ring) < x < max(p[0] for p in ring)
    assert min(p[1] for p in ring) < y < max(p[1] for p in ring)


@pytest.mark.parametrize("shape, free", [(HEART, False), (CIRCLE, True)])
def test_asked_where_it_is_the_shape_stays_there(
    coast: water.WaterArea, shape: list[tuple[float, float]], free: bool
) -> None:
    first = fit_shape(shape, 2000, coast, free_rotation=free)
    again = fit_shape(shape, 2000, coast, free_rotation=free, near=first.centre)
    assert again.points == first.points
    assert again.centre == first.centre


# --- Moved where it fits ------------------------------------------------------


@pytest.mark.parametrize("dx", [-150.0, 150.0, 600.0])
def test_moved_along_the_shore_the_shape_is_where_it_is_wanted(
    coast: water.WaterArea, dx: float
) -> None:
    first = fit_shape(HEART, 2000, coast, name="heart")
    wanted = _moved(coast, first, dx, 0.0)
    route = fit_shape(HEART, 2000, coast, name="heart", near=wanted)
    assert _off(coast, route, wanted) <= CLOSE_M
    _checked(coast, route, 2000)
    assert route.nearest_land_m >= water.SEA_SHORE_MARGIN_M - 0.5


def test_moved_on_the_lake_the_shape_keeps_off_the_shore(
    lake: water.WaterArea,
) -> None:
    first = fit_shape(HEART, 3000, lake, name="heart")
    wanted = _moved(lake, first, 150.0, 0.0)
    route = fit_shape(HEART, 3000, lake, name="heart", near=wanted)
    assert _off(lake, route, wanted) <= CLOSE_M
    _checked(lake, route, 3000)
    assert route.nearest_land_m >= water.SHORE_MARGIN_M - 0.5


# --- Wanted where it does not fit: the nearest place where it does -----------


def test_wanted_on_land_the_shape_is_as_near_the_shore_as_it_may(
    coast: water.WaterArea,
) -> None:
    first = fit_shape(HEART, 2000, coast, name="heart")
    # 600 m north of where it is: on the beach and beyond.
    wanted = _moved(coast, first, 0.0, 600.0)
    route = fit_shape(HEART, 2000, coast, name="heart", near=wanted)
    assert _off(coast, route, wanted) < _off(coast, first, wanted)
    _checked(coast, route, 2000)
    # Still 200 m off the shore at sea (ADR-0161).
    assert route.nearest_land_m >= water.SEA_SHORE_MARGIN_M - 0.5


def test_wanted_far_out_the_shape_stays_within_reach_of_the_shore(
    lake: water.WaterArea,
) -> None:
    first = fit_shape(HEART, 3000, lake, name="heart")
    # 600 m farther from the lakeside road: no leg of 300 m reaches it.
    wanted = _moved(lake, first, 0.0, -600.0)
    route = fit_shape(HEART, 3000, lake, name="heart", near=wanted)
    assert _off(lake, route, wanted) < _off(lake, first, wanted)
    assert route.approach_m > first.approach_m
    _checked(lake, route, 3000)


def test_wanted_out_of_reach_of_the_start_the_shape_is_still_placed(
    coast: water.WaterArea,
) -> None:
    first = fit_shape(HEART, 2000, coast, name="heart")
    wanted = _moved(coast, first, 5000.0, 5000.0)
    route = fit_shape(HEART, 2000, coast, name="heart", near=wanted)
    assert _off(coast, route, wanted) < _off(coast, first, wanted)
    assert route.move_m <= 2000.0  # water_fit.MOVE_MAX_M
    _checked(coast, route, 2000)


def test_the_moved_plan_is_the_same_every_time(coast: water.WaterArea) -> None:
    first = fit_shape(HEART, 2000, coast, name="heart")
    wanted = _moved(coast, first, 150.0, -40.0)
    assert fit_shape(HEART, 2000, coast, near=wanted) == fit_shape(
        HEART, 2000, coast, near=wanted
    )


# --- As a request -------------------------------------------------------------


class Covering:
    """The water of the coast fixture, whatever area is asked."""

    def __init__(self) -> None:
        self._source = FileWaterSource(COAST)

    def elements(self, bbox: water.BBox) -> list[water.Element]:
        assert self._source.bbox is not None
        return self._source.elements(self._source.bbox)


def test_a_paddling_request_moves_its_shape() -> None:
    request = RouteRequest(
        start=COAST_START, distance_m=2000, shape="heart", activity="paddling"
    )
    first = plan_paddling(request, Covering())
    assert first.result.centre == first.route.centre

    x, y = latlon_to_local(COAST_START, first.route.centre)
    wanted = local_to_latlon(COAST_START, x + 150.0, y)
    moved = plan_paddling(
        RouteRequest(
            start=COAST_START,
            distance_m=2000,
            shape="heart",
            activity="paddling",
            near=wanted,
        ),
        Covering(),
    )
    assert moved.result.centre is not None
    assert (
        math.dist(latlon_to_local(COAST_START, moved.result.centre), (x + 150.0, y))
        <= CLOSE_M
    )
    assert moved.result.points != first.result.points


def test_a_face_in_pieces_is_moved_whole() -> None:
    def ask(near: LatLon | None) -> RouteRequest:
        return RouteRequest(
            start=COAST_START,
            distance_m=3000,
            shape="smiley",
            activity="paddling",
            pen_up=True,
            near=near,
        )

    first = plan_paddling(ask(None), Covering())
    x, y = latlon_to_local(COAST_START, first.route.centre)
    wanted = local_to_latlon(COAST_START, x - 150.0, y)
    moved = plan_paddling(ask(wanted), Covering())
    assert moved.result.walks  # the eyes and the mouth, each on its own
    assert (
        math.dist(latlon_to_local(COAST_START, moved.route.centre), (x - 150.0, y))
        <= CLOSE_M
    )


def test_only_a_shape_on_the_water_is_placed_near_a_point() -> None:
    with pytest.raises(InvalidRequestError, match=NEAR_ON_WATER_ONLY):
        RouteRequest(
            start=COAST_START, distance_m=5000, shape="heart", near=COAST_START
        )


def test_the_point_a_shape_is_wanted_near_is_a_place_on_earth() -> None:
    with pytest.raises(InvalidRequestError, match="latitude"):
        RouteRequest(
            start=COAST_START,
            distance_m=2000,
            shape="heart",
            activity="paddling",
            near=(91.0, 11.0),
        )


# --- From the command line ----------------------------------------------------


def _argv(cache: Path, *more: str, activity: str = "paddling") -> list[str]:
    lat, lon = COAST_START
    return [
        "--shape",
        "heart",
        "--distance",
        "2000" if activity == "paddling" else "5000",
        f"--start={lat},{lon}",
        "--activity",
        activity,
        "--cache-dir",
        str(cache),
        *more,
    ]


def _centre_printed(printed: str) -> LatLon:
    found = re.search(r"centre:\s+(-?[\d.]+), (-?[\d.]+)", printed)
    assert found is not None, printed
    return float(found[1]), float(found[2])


def test_the_command_line_prints_the_centre_and_moves_the_shape(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    def refused(query: str) -> dict[str, object]:
        raise AssertionError("downloaded")

    monkeypatch.setattr(water, "overpass", refused)
    request = RouteRequest(
        start=COAST_START, distance_m=2000, shape="heart", activity="paddling"
    )
    source = FileWaterSource(COAST)
    bbox = water_area(request)
    water.write_water(
        OverpassWaterSource(tmp_path).path(bbox), bbox, source.elements(bbox)
    )

    assert cli.main(_argv(tmp_path, "--out", str(tmp_path / "heart.gpx"))) == 0
    first = _centre_printed(capsys.readouterr().out)
    x, y = latlon_to_local(COAST_START, first)
    lat, lon = local_to_latlon(COAST_START, x + 150.0, y)

    moved_out = str(tmp_path / "moved.gpx")
    assert cli.main(_argv(tmp_path, f"--near={lat},{lon}", "--out", moved_out)) == 0
    printed = capsys.readouterr().out
    assert "m from where it was asked" in printed
    moved = _centre_printed(printed)
    assert (
        math.dist(latlon_to_local(COAST_START, moved), (x + 150.0, y)) <= CLOSE_M + 1.0
    )


def test_the_command_line_moves_a_shape_only_on_the_water(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    lat, lon = COAST_START
    with pytest.raises(SystemExit) as stopped:
        cli.main(_argv(tmp_path, f"--near={lat},{lon}", activity="running"))
    assert stopped.value.code == 2
    assert NEAR_ON_WATER_ONLY in capsys.readouterr().err
