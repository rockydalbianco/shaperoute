"""The beaches of «Paddle» (TASK-245): the box of water a seaside place
needs, the point of its shore the examples start from, and the distance the
engine fits the first shapes at.

No network: the sea the engine tries a place on is its hand-built coast
(make_water_fixtures.py), around a made-up town, or a channel made here.
"""

from __future__ import annotations

import io
import json
from collections.abc import Sequence
from pathlib import Path

import pytest
from route_engine import water
from route_engine.geo import LatLon, haversine_m, latlon_to_local, local_to_latlon
from route_engine.models import RouteRequest
from route_engine.paddling import water_area
from route_engine.water import (
    BBox,
    Element,
    FileWaterSource,
    OverpassWaterSource,
    WaterNotCachedError,
)

from shaperoute_api import beach_catalog
from shaperoute_api.beach_catalog import (
    APART_M,
    LARGEST_M,
    LICENSE,
    OUT,
    PLACES,
    REACH_M,
    TRIES,
    LeftOut,
    Place,
    as_json,
    entries,
    fitting,
    main,
    place_box,
    shore_points,
)
from shaperoute_api.lake_catalog import DISTANCES_M, Entry
from shaperoute_api.paddle_examples import SHAPES

REPO = Path(__file__).resolve().parents[3]
COAST = REPO / "services/route-engine/tests/fixtures/water_coast.json"
# The fixture's coast runs west to east through its origin, the sea to the
# south: a beach from 900 m west to 900 m east, a slipway 2.5 km west.
ORIGIN = (44.0, 12.65)
# A town with its square 300 m behind the middle of the beach.
TOWN = Place("Marina di prova", local_to_latlon(ORIGIN, 0.0, 300.0))
# Too far from the sea to walk to it.
INLAND = Place("Prova Alta", local_to_latlon(ORIGIN, 0.0, 6000.0))

XY = tuple[float, float]


def _local(point: LatLon) -> XY:
    return latlon_to_local(ORIGIN, point)


class Channel:
    """A channel 300 m wide with a beach on its north side: at sea a shape
    keeps 200 m off every shore, and here nothing is that far."""

    def elements(self, bbox: BBox) -> list[Element]:
        def geometry(xy: Sequence[XY]) -> list[dict[str, float]]:
            rows = []
            for x, y in xy:
                lat, lon = local_to_latlon(ORIGIN, x, y)
                rows.append({"lat": lat, "lon": lon})
            return rows

        def way(ident: int, tags: dict[str, str], xy: Sequence[XY]) -> Element:
            return {"type": "way", "id": ident, "tags": tags, "geometry": geometry(xy)}

        return [
            # Land on the left of a coastline: north of the first, south of
            # the second.
            way(1, {"natural": "coastline"}, [(-9000.0, 0.0), (9000.0, 0.0)]),
            way(2, {"natural": "coastline"}, [(9000.0, -300.0), (-9000.0, -300.0)]),
            way(
                3,
                {"natural": "beach"},
                [
                    (-500.0, -2.0),
                    (500.0, -2.0),
                    (500.0, 40.0),
                    (-500.0, 40.0),
                    (-500.0, -2.0),
                ],
            ),
        ]


class NoWater:
    def elements(self, bbox: BBox) -> list[Element]:
        raise WaterNotCachedError(f"no cached water covers {bbox}")


def test_the_places_are_the_user_s_choice_each_once_in_italy() -> None:
    assert len(PLACES) == 67
    names = [place.name for place in PLACES]
    assert names == sorted(set(names))
    for place in PLACES:
        lat, lon = place.town
        assert 35.4 < lat < 47.1 and 6.6 < lon < 18.6


def test_a_place_s_box_holds_the_largest_request_from_any_start_near_the_town() -> None:
    south, west, north, east = place_box(TOWN)
    for dx, dy in ((-REACH_M, -REACH_M), (REACH_M, REACH_M), (0.0, 0.0)):
        start = local_to_latlon(TOWN.town, dx, dy)
        for shape_name in SHAPES:
            asked = water_area(
                RouteRequest(
                    start=start,
                    shape=shape_name,
                    distance_m=LARGEST_M,
                    activity="paddling",
                )
            )
            assert south <= asked[0] and west <= asked[1]
            assert asked[2] <= north and asked[3] <= east


def test_the_shore_points_are_on_the_beach_first_the_nearest_to_the_town() -> None:
    points = [_local(p) for p in shore_points(TOWN, FileWaterSource(COAST))]

    assert 1 < len(points) <= TRIES
    # The middle of the beach, in front of the square, on the water's edge.
    assert abs(points[0][0]) < 20 and abs(points[0][1]) < 20
    for i, a in enumerate(points):
        for b in points[:i]:
            assert ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5 >= APART_M - 2
    # The beach before the slipway, which is the last: the promenade is too
    # far from the water, and the motorway is not walked.
    *on_beach, last = points
    assert all(abs(x) < 950 for x, _ in on_beach)
    assert abs(last[0] + 2500) < 50


def test_a_town_too_far_from_the_sea_has_no_shore_point() -> None:
    assert shore_points(INLAND, FileWaterSource(COAST)) == []


def test_the_first_shapes_fit_at_two_km_off_an_open_beach() -> None:
    point, *_ = shore_points(TOWN, FileWaterSource(COAST))
    assert fitting(point, FileWaterSource(COAST)) == (2000, "")


def test_where_no_shape_fits_the_engine_s_words_say_why() -> None:
    point = local_to_latlon(ORIGIN, 0.0, 0.0)
    distance_m, why = fitting(point, Channel())
    assert distance_m is None
    assert why.startswith("heart of 1000 m: ")


def test_the_list_has_a_place_once_and_says_why_another_is_not_in_it() -> None:
    log = io.StringIO()
    listed, left_out = entries([TOWN, INLAND], FileWaterSource(COAST), log)
    (entry,) = listed
    assert entry.name == "Marina di prova" and entry.distance_m == 2000
    assert haversine_m(entry.point, TOWN.town) < 320
    assert left_out == [
        LeftOut("Prova Alta", "no shore to walk to within 3000 m of the town")
    ]

    channel_town = Place("Canale", local_to_latlon(ORIGIN, 0.0, 100.0))
    listed, left_out = entries([channel_town], Channel(), log)
    assert listed == []
    ((name, why),) = [(p.name, p.why) for p in left_out]
    assert name == "Canale" and why.startswith("heart of 1000 m: ")

    listed, left_out = entries([TOWN], NoWater(), log)
    assert listed == []
    assert left_out == [LeftOut("Marina di prova", "its water is not in the folder")]


def test_the_file_is_the_app_s_list_by_name() -> None:
    written = as_json(
        [Entry("Rimini", (44.07, 12.58), 2000), Entry("Alassio", (44.0, 8.17), 1500)]
    )
    assert written == {
        "license": LICENSE,
        "beaches": [
            {"name": "Alassio", "point": [44.0, 8.17], "distance_m": 1500},
            {"name": "Rimini", "point": [44.07, 12.58], "distance_m": 2000},
        ],
    }


def _cache(tmp_path: Path, box: BBox) -> Path:
    """A cache folder with the fixture's coast as the water of `box`."""
    cache = tmp_path / "cache"
    elements = FileWaterSource(COAST).elements(box)
    water.write_water(OverpassWaterSource(cache).path(box), box, elements)
    return cache


def test_the_command_prints_the_boxes_a_cache_does_not_cover_yet(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main(["--boxes"]) == 0
    lines = capsys.readouterr().out.splitlines()
    assert [line.split("\t")[1] for line in lines] == [p.name for p in PLACES]
    rimini = next(p for p in PLACES if p.name == "Rimini")
    south, west, north, east = (
        float(v) for v in lines[PLACES.index(rimini)].split("\t")[0].split(",")
    )
    assert (south, west, north, east) == pytest.approx(place_box(rimini), abs=1e-9)

    # The water of Riccione on the server (TASK-225) holds Rimini's box.
    cache = _cache(tmp_path, (43.903, 12.435, 44.147, 12.845))
    assert main(["--boxes", "--cache-dir", str(cache)]) == 0
    names = [line.split("\t")[1] for line in capsys.readouterr().out.splitlines()]
    assert names == [p.name for p in PLACES if p.name != "Rimini"]

    assert main(["--boxes", "--only", "Alassio"]) == 0
    assert capsys.readouterr().out.endswith("\tAlassio\n")


def test_the_command_writes_the_places_whose_water_is_in_the_cache(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(beach_catalog, "PLACES", (TOWN, INLAND))
    cache = _cache(tmp_path, place_box(TOWN))
    out = tmp_path / "beaches.json"

    assert main(["--cache-dir", str(cache), "--out", str(out)]) == 0

    written = json.loads(out.read_text(encoding="utf-8"))
    assert written["license"] == LICENSE
    (row,) = written["beaches"]
    assert row["name"] == "Marina di prova" and row["distance_m"] == 2000
    said = capsys.readouterr().out
    assert "1 places" in said
    # The other town's shore is outside the file: nothing is downloaded.
    assert "Prova Alta: its water is not in the folder" in said


def test_without_the_water_nothing_is_downloaded_nor_written(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    out = tmp_path / "beaches.json"
    assert main(["--cache-dir", str(tmp_path / "empty"), "--out", str(out)]) == 1
    assert not out.exists()
    assert "No place" in capsys.readouterr().out


def test_the_command_needs_one_of_its_two_steps() -> None:
    with pytest.raises(SystemExit):
        main([])


def test_the_app_s_list_is_one_this_command_writes() -> None:
    written = json.loads(OUT.read_text(encoding="utf-8"))
    assert written["license"] == LICENSE
    rows = written["beaches"]
    assert rows
    assert rows == sorted(rows, key=lambda e: (e["name"], e["point"]))
    towns = {place.name: place.town for place in PLACES}
    # One point a place, on the shore near its town.
    assert len({row["name"] for row in rows}) == len(rows)
    for row in rows:
        assert set(row) == {"name", "point", "distance_m"}
        assert row["distance_m"] in DISTANCES_M
        lat, lon = row["point"]
        assert haversine_m((lat, lon), towns[row["name"]]) <= REACH_M * 1.01
