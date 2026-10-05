"""The lakes of «Explore» with «Paddle» (TASK-233): which waters of an
extract are lakes of the list, the points of their shore, and the distance
the engine fits the first shapes at.

No network: the waters are drawn here in metres around a made-up origin,
and the water the engine tries them on is its hand-built lake
(make_water_fixtures.py) or a round lake made here.
"""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from pathlib import Path

import pytest
from route_engine import water
from route_engine.geo import LatLon, haversine_m, latlon_to_local, local_to_latlon
from route_engine.water import (
    BBox,
    Element,
    FileWaterSource,
    OverpassWaterSource,
    WaterNotCachedError,
)
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry

from shaperoute_api.lake_catalog import (
    DISTANCES_M,
    LICENSE,
    OUT,
    SPACING_M,
    Entry,
    Lake,
    as_json,
    entries,
    fitting_distance,
    lake_box,
    lake_name,
    lakes,
    main,
    shore_points,
)

REPO = Path(__file__).resolve().parents[3]
LAKE = REPO / "services/route-engine/tests/fixtures/water_lake.json"
ORIGIN = (45.0, 10.0)
# Beside the lakeside road of the engine's lake, as test_paddle_examples.py.
LAKE_START = local_to_latlon(ORIGIN, -700.0, 0.0)

XY = tuple[float, float]


def _ring(cx: float, cy: float, rx: float, ry: float, n: int = 72) -> list[XY]:
    points = [
        (
            cx + rx * math.cos(2 * math.pi * i / n),
            cy + ry * math.sin(2 * math.pi * i / n),
        )
        for i in range(n)
    ]
    return [*points, points[0]]


def _lonlat(xy: Sequence[XY]) -> list[list[float]]:
    rows = []
    for x, y in xy:
        lat, lon = local_to_latlon(ORIGIN, x, y)
        rows.append([lon, lat])
    return rows


def _feature(tags: dict[str, str], xy: Sequence[XY]) -> str:
    return json.dumps(
        {
            "type": "Feature",
            "properties": tags,
            "geometry": {"type": "Polygon", "coordinates": [_lonlat(xy)]},
        }
    )


def _geometry_of(feature: str) -> BaseGeometry:
    return shape(json.loads(feature)["geometry"])


# The engine's lake: an ellipse 6 km by 1.8 km centred at (0, -1100).
WIDE = _ring(0.0, -1100.0, 3000.0, 900.0)
LAKE_TAGS = {"natural": "water", "water": "lake", "name": "Lago di prova"}


class RoundLake:
    """A lake of 300 m radius with a path around it, 10 m from the water."""

    def elements(self, bbox: BBox) -> list[Element]:
        def geometry(xy: Sequence[XY]) -> list[dict[str, float]]:
            return [{"lat": lat, "lon": lon} for lon, lat in _lonlat(xy)]

        return [
            {
                "type": "way",
                "id": 1,
                "tags": {"natural": "water", "water": "lake"},
                "geometry": geometry(_ring(0.0, 0.0, 300.0, 300.0)),
            },
            {
                "type": "way",
                "id": 2,
                "tags": {"highway": "footway"},
                "geometry": geometry(_ring(0.0, 0.0, 310.0, 310.0)),
            },
        ]


class NoWater:
    def elements(self, bbox: BBox) -> list[Element]:
        raise WaterNotCachedError(f"no cached water covers {bbox}")


@pytest.mark.parametrize(
    ("tags", "name"),
    [
        (
            {"natural": "water", "water": "lake", "name": "Lago di Levico"},
            "Lago di Levico",
        ),
        (
            {"natural": "water", "water": "reservoir", "name": "Stramentizzo"},
            "Stramentizzo",
        ),
        # The Italian name where the map has two.
        (
            {
                "natural": "water",
                "water": "lake",
                "name": "Kalterer See - Lago di Caldaro",
                "name:it": "Lago di Caldaro",
            },
            "Lago di Caldaro",
        ),
        # Without the kind, the name says it.
        ({"natural": "water", "name": "Lago di Corlo"}, "Lago di Corlo"),
        ({"natural": "water", "name": "Haidersee"}, "Haidersee"),
        ({"natural": "water", "name": "Valle Fossa di Porto"}, None),
        ({"natural": "water", "name": "Bacino di Malamocco"}, None),
        # Not what the engine paddles on (water.is_lake).
        ({"natural": "water", "water": "lagoon", "name": "Laguna di Marano"}, None),
        ({"natural": "water", "water": "pond", "name": "Lago di Ledro"}, None),
        ({"natural": "water", "water": "river", "name": "Adige"}, None),
        (
            {"natural": "water", "water": "lake", "leisure": "marina", "name": "Lago"},
            None,
        ),
        ({"natural": "water", "water": "lake"}, None),
        ({"natural": "beach", "name": "Lago"}, None),
    ],
)
def test_a_lake_of_the_list_is_one_the_engine_paddles_on_with_a_lake_s_name(
    tags: dict[str, str], name: str | None
) -> None:
    assert lake_name(tags) == name


def test_a_long_shore_has_a_point_every_four_km_the_first_where_it_is_widest() -> None:
    lake = _geometry_of(_feature(LAKE_TAGS, WIDE))
    points = shore_points(lake)
    # The ellipse's shore is 13 km long.
    assert len(points) == 3
    # The first is where the lake is widest: at the middle of a long side.
    x, y = _local(points[0])
    assert abs(x) < 50
    assert min(abs(y + 200), abs(y + 2000)) < 15
    # All on the shore, about a third of it apart.
    for point in points:
        px, py = _local(point)
        assert abs((px / 3000) ** 2 + ((py + 1100) / 900) ** 2 - 1) < 0.03
    for a, b in zip(points, points[1:], strict=False):
        assert haversine_m(a, b) > SPACING_M / 2
    assert all(len(f"{v}".split(".")[1]) <= 5 for point in points for v in point)


def _local(point: LatLon) -> XY:
    return latlon_to_local(ORIGIN, point)


def test_a_small_lake_has_one_point_and_a_pond_none() -> None:
    # 400 m of radius: a 1 km circle and its 50 m from the shore fit.
    small = _geometry_of(_feature(LAKE_TAGS, _ring(0.0, 0.0, 400.0, 400.0)))
    assert len(shore_points(small)) == 1
    # 150 m: not even the smallest shape.
    pond = _geometry_of(_feature(LAKE_TAGS, _ring(0.0, 0.0, 150.0, 150.0)))
    assert shore_points(pond) == ()
    # Long and narrow: large enough by its area, too narrow for a shape.
    canal = _geometry_of(_feature(LAKE_TAGS, _ring(0.0, 0.0, 3000.0, 120.0)))
    assert shore_points(canal) == ()


def test_the_lakes_are_read_from_a_geojson_sequence_once_each() -> None:
    lines = [
        # As `osmium export -f geojsonseq`: a record separator before each.
        "\x1e" + _feature(LAKE_TAGS, WIDE),
        # The same lake again, as its relation.
        _feature(LAKE_TAGS, WIDE),
        _feature(
            {"natural": "water", "water": "lake", "name": "Lago Piccolo"},
            _ring(9000.0, 0.0, 400.0, 400.0),
        ),
        _feature({"natural": "water", "water": "lake"}, _ring(0, 9000, 500, 500)),
        _feature(
            {"natural": "water", "water": "lagoon", "name": "Laguna"},
            _ring(0.0, -9000.0, 2000.0, 2000.0),
        ),
        json.dumps(
            {
                "type": "Feature",
                "properties": LAKE_TAGS,
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[10, 45], [10.1, 45]],
                },
            }
        ),
        "",
    ]
    found = lakes(lines)
    assert [lake.name for lake in found] == ["Lago Piccolo", "Lago di prova"]
    assert [len(lake.points) for lake in found] == [1, 3]


def test_a_lake_s_box_holds_what_every_point_s_examples_need() -> None:
    lake = Lake("Lago di prova", shore_points(_geometry_of(_feature(LAKE_TAGS, WIDE))))
    south, west, north, east = lake_box(lake)
    for point in lake.points:
        # The start may move 2 km, and the shape lies beyond it.
        assert haversine_m(point, (south, point[1])) > 3000
        assert haversine_m(point, (north, point[1])) > 3000
        assert haversine_m(point, (point[0], west)) > 3000
        assert haversine_m(point, (point[0], east)) > 3000


def test_the_first_shapes_fit_at_two_km_on_a_wide_lake() -> None:
    assert fitting_distance(LAKE_START, FileWaterSource(LAKE)) == 2000


def test_a_small_lake_has_its_examples_at_a_smaller_distance() -> None:
    start = local_to_latlon(ORIGIN, 0.0, 305.0)
    # 300 m of radius: a 2 km circle is 318 m, and stays 50 m from the shore.
    found = fitting_distance(start, RoundLake())
    assert found is not None and found < 2000
    assert found in DISTANCES_M


def test_a_point_with_no_water_near_is_left_out() -> None:
    far = local_to_latlon(ORIGIN, 0.0, 9000.0)
    assert fitting_distance(far, FileWaterSource(LAKE)) is None


def test_the_list_has_each_point_once_and_says_whose_water_is_missing() -> None:
    near = local_to_latlon(ORIGIN, -650.0, 0.0)
    found = [
        Lake("Lago di prova", (LAKE_START, near, local_to_latlon(ORIGIN, 0, 9000))),
    ]
    listed, missing = entries(found, FileWaterSource(LAKE))
    # The second point is 50 m from the first: one; the third has no water.
    assert listed == [Entry("Lago di prova", LAKE_START, 2000)]
    assert missing == []

    listed, missing = entries(found, NoWater())
    assert listed == []
    assert missing == ["Lago di prova"]


def test_the_file_is_the_app_s_list_by_name() -> None:
    written = as_json(
        [Entry("Lago B", (45.2, 10.0), 1000), Entry("Lago A", (45.1, 10.0), 2000)]
    )
    assert written == {
        "license": LICENSE,
        "lakes": [
            {"name": "Lago A", "point": [45.1, 10.0], "distance_m": 2000},
            {"name": "Lago B", "point": [45.2, 10.0], "distance_m": 1000},
        ],
    }


def _waters(tmp_path: Path) -> Path:
    waters = tmp_path / "water.geojsonseq"
    waters.write_text(_feature(LAKE_TAGS, WIDE) + "\n", encoding="utf-8")
    return waters


def test_the_command_prints_each_lake_s_box(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main(["--waters", str(_waters(tmp_path)), "--boxes"]) == 0
    (line,) = capsys.readouterr().out.splitlines()
    box, name = line.split("\t")
    assert name == "Lago di prova"
    south, west, north, east = (float(v) for v in box.split(","))
    assert south < 45.0 - 0.03 < 45.0 + 0.02 < north
    assert west < 10.0 - 0.06 < 10.0 + 0.06 < east


def test_the_command_writes_the_lakes_whose_water_is_in_the_cache(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    cache = tmp_path / "cache"
    box = (44.9, 9.9, 45.1, 10.1)
    elements = FileWaterSource(LAKE).elements(box)
    water.write_water(OverpassWaterSource(cache).path(box), box, elements)
    out = tmp_path / "lakes.json"

    code = main(
        [
            "--waters",
            str(_waters(tmp_path)),
            "--cache-dir",
            str(cache),
            "--out",
            str(out),
        ]
    )

    assert code == 0
    written = json.loads(out.read_text(encoding="utf-8"))
    assert written["license"] == LICENSE
    # The only way to the fixture's water is its north shore.
    assert written["lakes"]
    assert {e["name"] for e in written["lakes"]} == {"Lago di prova"}
    assert all(e["distance_m"] in DISTANCES_M for e in written["lakes"])
    assert "on 1 lakes" in capsys.readouterr().out


def test_without_the_water_nothing_is_downloaded_nor_written(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    out = tmp_path / "lakes.json"
    code = main(
        [
            "--waters",
            str(_waters(tmp_path)),
            "--cache-dir",
            str(tmp_path / "empty"),
            "--out",
            str(out),
        ]
    )
    assert code == 1
    assert not out.exists()
    assert "No lake" in capsys.readouterr().out


def test_the_app_s_list_is_one_this_command_writes() -> None:
    written = json.loads(OUT.read_text(encoding="utf-8"))
    assert written["license"] == LICENSE
    rows = written["lakes"]
    assert rows == sorted(rows, key=lambda e: (e["name"], e["point"]))
    for row in rows:
        assert set(row) == {"name", "point", "distance_m"}
        assert row["distance_m"] in DISTANCES_M
        lat, lon = row["point"]
        assert -90 <= lat <= 90 and -180 <= lon <= 180
    assert len({(e["name"], *e["point"]) for e in rows}) == len(rows)
