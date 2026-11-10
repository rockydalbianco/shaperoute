"""A snowshoe route: a shape placed freely on the snow, from a way in, and
checked (TASK-413, ADR-0342). Elements and heights are made here: no
network."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from shapely.geometry import LineString

import route_engine.__main__ as cli
from route_engine.activities import ENGINE_ACTIVITIES, ENGINE_ONLY
from route_engine.geo import latlon_to_local_array, local_to_latlon
from route_engine.models import (
    ACTIVITIES,
    DISTANCE_LIMITS_M,
    FREE_ACTIVITIES,
    ON_SNOW_SHAPES_ONLY,
    SNOW_ACTIVITIES,
    SUPPORTED_ACTIVITIES,
    WATER_ACTIVITIES,
    InvalidRequestError,
    RouteRequest,
    check_drawn_on_land,
    check_outline_drawn,
)
from route_engine.paddling import WATER_SHAPE_POINTS
from route_engine.shapes import get_shape
from route_engine.snow import NoSnowError, SnowFitError
from route_engine.snowshoeing import (
    check_on_snow,
    plan_snowshoeing,
    snow_pieces,
    snow_shape,
)
from route_engine.validation import InvalidRouteError
from route_engine.water_fit import WaterMeasures

START = (46.0, 11.0)


def _way(tags: dict[str, str], *xy: tuple[float, float]) -> dict[str, Any]:
    points = [local_to_latlon(START, x, y) for x, y in xy]
    return {
        "type": "way",
        "id": 1,
        "tags": tags,
        "geometry": [{"lat": lat, "lon": lon} for lat, lon in points],
    }


def _square(tags: dict[str, str], x: float, y: float, half: float) -> dict[str, Any]:
    corners = [(x - half, y - half), (x + half, y - half), (x + half, y + half)]
    corners += [(x - half, y + half), (x - half, y - half)]
    return _way(tags, *corners)


ROAD = _way({"highway": "track"}, (-4000.0, 0.0), (4000.0, 0.0))


class _Source:
    def __init__(self, *elements: dict[str, Any]) -> None:
        self._elements = list(elements)
        self.asked: list[tuple[float, float, float, float]] = []

    def elements(self, bbox: tuple[float, float, float, float]) -> list[dict[str, Any]]:
        self.asked.append(bbox)
        return self._elements


class _Flat:
    def heights(self, points: np.ndarray) -> np.ndarray:
        return np.full(len(points), 1600.0)


class _Ramp:
    """`deg` degrees up to the east everywhere."""

    def __init__(self, deg: float) -> None:
        self.rise = math.tan(math.radians(deg))

    def heights(self, points: np.ndarray) -> np.ndarray:
        x = latlon_to_local_array(START, np.asarray(points, dtype=float))[:, 0]
        return 1600.0 + self.rise * x


def _request(shape: str = "circle", distance_m: int = 1000, **kw: Any) -> RouteRequest:
    return RouteRequest(
        start=START, shape=shape, distance_m=distance_m, activity="snowshoeing", **kw
    )


# --- The activity -------------------------------------------------------------


def test_snowshoeing_is_drawn_by_the_engine_and_in_the_contract() -> None:
    # In ENGINE_ONLY until TASK-413 part A2, which gives it to the contract,
    # after the skate.
    assert ENGINE_ONLY == ()
    (activity,) = (a for a in ENGINE_ACTIVITIES if a.name == "snowshoeing")
    assert SUPPORTED_ACTIVITIES[-1] == "snowshoeing"
    assert ACTIVITIES[-1] == "snowshoeing"
    assert DISTANCE_LIMITS_M["snowshoeing"] == (500, 3_000)
    assert SNOW_ACTIVITIES == {"snowshoeing"}
    assert FREE_ACTIVITIES == WATER_ACTIVITIES | {"snowshoeing"}
    assert activity.on_snow and not activity.on_water and activity.network is None


def test_a_request_on_the_snow_takes_a_shape_of_the_catalogue() -> None:
    assert _request(distance_m=500).distance_m == 500
    with pytest.raises(InvalidRequestError, match="between 500 and 3000"):
        _request(distance_m=3500)
    with pytest.raises(InvalidRequestError, match=ON_SNOW_SHAPES_ONLY):
        RouteRequest(start=START, word="hi", distance_m=2000, activity="snowshoeing")
    with pytest.raises(InvalidRequestError, match=ON_SNOW_SHAPES_ONLY):
        check_drawn_on_land("snowshoeing", "an image")
    with pytest.raises(InvalidRequestError, match=ON_SNOW_SHAPES_ONLY):
        check_outline_drawn("snowshoeing", "a drawing")
    # The shape may be moved, as on the water; laps are a swim's.
    assert _request(near=(46.001, 11.001)).near == (46.001, 11.001)
    with pytest.raises(InvalidRequestError):
        _request(laps=2)


def test_the_shape_of_a_request_is_the_water_s() -> None:
    assert snow_shape(_request()) == list(get_shape("circle")(WATER_SHAPE_POINTS))
    assert snow_pieces(_request()) == []
    with pytest.raises(ValueError, match="not drawn on the snow"):
        snow_shape(RouteRequest(start=START, shape="circle", distance_m=1000))


# --- The plan -----------------------------------------------------------------


def test_a_circle_on_an_open_meadow_starts_from_the_track() -> None:
    source = _Source(ROAD)
    plan = plan_snowshoeing(_request(), source, _Flat())
    result, route = plan.result, plan.route
    assert len(source.asked) == 1
    assert result.points[0] == result.points[-1]
    assert abs(result.distance_m - 1000) <= 100
    assert result.similarity == 1.0 and result.shape == "circle"
    assert route.scale == pytest.approx(1.0, abs=0.05)
    assert route.shore_access == "track"
    # The way in is on the track (y = 0), within 2 km of the start.
    x, y = latlon_to_local_array(START, np.array([route.shore_start]))[0]
    assert abs(y) < 1.0 and math.hypot(x, y) <= 2000.0
    assert plan.area.water.wet.contains(
        LineString(latlon_to_local_array(START, np.asarray(result.points, dtype=float)))
    )


def test_the_shape_keeps_off_the_woods_and_the_slopes() -> None:
    # Woods north of the track, a building on it: the shape lies south.
    wood = _square({"natural": "wood"}, 0.0, 2000.0, 1990.0)
    plan = plan_snowshoeing(_request(), _Source(ROAD, wood), _Flat())
    xy = latlon_to_local_array(START, np.asarray(plan.result.points, dtype=float))
    assert xy[:, 1].max() <= 10.0 + 1e-6
    assert plan.route.nearest_land_m >= 5.0 - 1e-6


def test_a_wood_everywhere_leaves_no_snow() -> None:
    wood = _square({"natural": "wood"}, 0.0, 0.0, 5000.0)
    with pytest.raises(NoSnowError, match="no open snow"):
        plan_snowshoeing(_request(), _Source(ROAD, wood), _Flat())


def test_a_mountain_too_steep_leaves_no_snow() -> None:
    with pytest.raises(NoSnowError):
        plan_snowshoeing(_request(), _Source(ROAD), _Ramp(32.0))
    # A gentle one is snow to walk on.
    plan = plan_snowshoeing(_request(), _Source(ROAD), _Ramp(15.0))
    assert abs(plan.result.distance_m - 1000) <= 100


def test_a_shape_too_big_for_a_clearing_says_what_fits() -> None:
    # A clearing of 600 × 600 m in a wood, the track through it.
    clearing = {
        "type": "relation",
        "id": 2,
        "tags": {"natural": "wood"},
        "members": [
            {"type": "way", "role": "outer", "geometry": _ring(0.0, 0.0, 5000.0)},
            {"type": "way", "role": "inner", "geometry": _ring(0.0, 0.0, 300.0)},
        ],
    }
    with pytest.raises(SnowFitError) as caught:
        plan_snowshoeing(_request(distance_m=3000), _Source(ROAD, clearing), _Flat())
    assert caught.value.best_distance_m is not None
    assert 1000 <= caught.value.best_distance_m <= 2500
    assert "on open snow here: it fits at" in str(caught.value)
    # The same clearing holds a small circle.
    plan = plan_snowshoeing(_request(distance_m=1000), _Source(ROAD, clearing), _Flat())
    assert abs(plan.result.distance_m - 1000) <= 100


def _ring(x: float, y: float, half: float) -> list[dict[str, float]]:
    corners = [(x - half, y - half), (x + half, y - half), (x + half, y + half)]
    corners += [(x - half, y + half), (x - half, y - half)]
    return [
        {"lat": lat, "lon": lon}
        for lat, lon in (local_to_latlon(START, cx, cy) for cx, cy in corners)
    ]


def test_with_the_pen_up_a_shape_in_pieces_is_drawn_piece_by_piece() -> None:
    plan = plan_snowshoeing(
        _request("smiley", 2000, pen_up=True), _Source(ROAD), _Flat()
    )
    assert plan.result.walks
    assert abs(plan.result.distance_m - 2000) <= 200


def test_a_shape_asked_near_a_point_is_placed_there() -> None:
    # Within reach of the track: the leg to it is at most 300 m.
    near = local_to_latlon(START, 600.0, -350.0)
    plan = plan_snowshoeing(_request(near=near), _Source(ROAD), _Flat())
    x, y = latlon_to_local_array(START, np.array([plan.result.centre]))[0]
    assert math.hypot(x - 600.0, y + 350.0) <= 60.0


def test_the_checks_of_a_route_on_the_snow() -> None:
    good = WaterMeasures(1000.0, 0.0, math.inf, True)
    check_on_snow(good, 1000)
    with pytest.raises(InvalidRouteError, match="does not end"):
        check_on_snow(WaterMeasures(1000.0, 0.0, 0.0, False), 1000)
    with pytest.raises(InvalidRouteError, match="off it"):
        check_on_snow(WaterMeasures(1000.0, 3.0, 0.0, True), 1000)
    with pytest.raises(InvalidRouteError, match="not within 10%"):
        check_on_snow(WaterMeasures(1200.0, 0.0, 0.0, True), 1000)


# --- The command line -----------------------------------------------------------


class _Tiles:
    def __init__(self, cache_dir: Path) -> None:
        self.cache_dir = cache_dir

    def is_cached(self, bbox: Any) -> bool:
        return True

    def heights(self, points: np.ndarray) -> np.ndarray:
        return _Flat().heights(points)


class _CliSource(_Source):
    def __init__(self, cache_dir: Path) -> None:
        super().__init__(ROAD)

    def is_cached(self, bbox: Any) -> bool:
        return False


def test_the_command_line_draws_on_the_snow(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(cli, "OverpassSnowSource", _CliSource)
    monkeypatch.setattr(cli, "TerrariumTiles", _Tiles)
    out = tmp_path / "snow.gpx"
    code = cli.main(
        [
            "--shape=heart",
            "--distance=1000",
            "--start=46.0,11.0",
            "--activity=snowshoeing",
            f"--out={out}",
            f"--cache-dir={tmp_path}",
        ]
    )
    printed = capsys.readouterr().out
    assert code == 0
    assert "Snow: downloading" in printed and "Heights: from the cache" in printed
    assert "way in:" in printed and "(track)" in printed
    assert "slope at most 0 deg" in printed
    assert out.read_text(encoding="utf-8").startswith("<?xml")


def test_the_command_line_says_why_there_is_no_route(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    class Wooded(_CliSource):
        def __init__(self, cache_dir: Path) -> None:
            _Source.__init__(self, ROAD, _square({"natural": "wood"}, 0, 0, 5000))

    monkeypatch.setattr(cli, "OverpassSnowSource", Wooded)
    monkeypatch.setattr(cli, "TerrariumTiles", _Tiles)
    code = cli.main(
        [
            "--shape=circle",
            "--distance=1000",
            "--start=46.0,11.0",
            "--activity=snowshoeing",
            f"--out={tmp_path / 'none.gpx'}",
            f"--cache-dir={tmp_path}",
        ]
    )
    assert code == 1
    assert "No route: there is no open snow" in capsys.readouterr().err


@pytest.mark.parametrize(
    ("extra", "message"),
    [
        (["--nearby=2"], "on the snow the start is looked for"),
        (["--no-optimize"], "on the snow the shape is placed"),
        (["--word=hi"], ON_SNOW_SHAPES_ONLY),
    ],
)
def test_the_command_line_refuses_what_is_for_roads(
    extra: list[str], message: str, capsys: pytest.CaptureFixture[str]
) -> None:
    argv = ["--distance=2000", "--start=46.0,11.0", "--activity=snowshoeing", *extra]
    if not any(a.startswith("--word") for a in extra):
        argv.append("--shape=circle")
    with pytest.raises(SystemExit) as caught:
        cli.parse_args(argv)
    assert caught.value.code == 2
    assert message in capsys.readouterr().err
