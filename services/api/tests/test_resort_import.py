"""The ski resorts read from OpenSkiData's ski_areas.geojson (TASK-406 part
A, ADR-0338): which areas are kept, and what each keeps. No database."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest

from shaperoute_api import resort_import
from shaperoute_api.db import DATABASE_VARIABLE
from shaperoute_api.resort_import import (
    MAX_NAME,
    FormatError,
    resorts_of,
    short_name,
)

AREAS = Path(__file__).parent / "fixtures" / "ski" / "ski_areas.geojson"


def _features() -> list[dict[str, Any]]:
    return json.loads(AREAS.read_text(encoding="utf-8"))["features"]


def test_only_operating_downhill_areas_with_a_name_are_kept() -> None:
    read = resorts_of(_features())
    assert [r.id for r in read.resorts] == ["aaa1", "bbb2", "ccc3", "hhh8"]
    # Nameless, abandoned, cross-country only.
    assert read.left_out == 3


def test_a_resort_keeps_its_place_lifts_pistes_and_heights() -> None:
    valley = resorts_of(_features()).resorts[0]
    assert valley.name == "Test Valley, Testtal"
    assert (valley.country, valley.region) == ("IT", "Bolzano/Bozen")
    # The centre OpenSkiMap shows it at, as (lat, lon); the outline's box.
    assert valley.center == (46.55, 11.75)
    assert valley.bbox == (46.50, 11.70, 46.60, 11.80)
    # Every lift, of every type; only the downhill pistes, by difficulty.
    assert valley.lifts == 4
    assert valley.piste_km == pytest.approx(15.75)
    assert valley.piste_km_by_difficulty == {"easy": 10.25, "advanced": 5.5}
    assert (valley.min_elevation_m, valley.max_elevation_m) == (1200, 2500)
    # The first website that is one: a misspelt scheme is skipped.
    assert valley.website == "https://valley.example/"


def test_a_point_area_has_its_centre_as_its_box() -> None:
    hill = resorts_of(_features()).resorts[1]
    assert hill.center == (46.07, 11.12)
    assert hill.bbox == (46.07, 11.12, 46.07, 11.12)
    assert (hill.lifts, hill.piste_km) == (1, pytest.approx(0.4))
    assert hill.website is None
    assert hill.min_elevation_m is None


def test_a_multipolygon_box_takes_every_part_and_no_place_is_none() -> None:
    north = resorts_of(_features()).resorts[2]
    assert north.bbox == (59.9, 10.0, 60.3, 10.6)
    assert (north.country, north.region) == (None, None)
    assert (north.lifts, north.piste_km, north.piste_km_by_difficulty) == (0, 0, {})


def test_a_long_name_keeps_the_forms_that_fit() -> None:
    forms = ["国家高山滑雪中心", "Nationales Ski-Alpin-Zentrum Xiaohaituo"]
    forms += ["National Alpine Skiing Centre", "centro nazionale di sci alpino"]
    name = ", ".join(forms)
    assert len(name) > MAX_NAME - 20
    long = name + ", " + "x" * 80
    assert short_name(long) == name
    assert short_name("  Val   Gardena ") == "Val Gardena"
    assert short_name("y" * 200) == "y" * MAX_NAME


def test_without_a_database_the_import_stops(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.delenv(DATABASE_VARIABLE, raising=False)
    assert resort_import.main(["--geojson", str(AREAS)]) == 1
    assert DATABASE_VARIABLE in capsys.readouterr().err


def _broken(change: str) -> list[dict[str, Any]]:
    """The fixture with one change to its first resort, «Test Valley»."""
    features = copy.deepcopy(_features())
    props = features[0]["properties"]
    if change == "no statistics":
        del props["statistics"]
    elif change == "no lift count":
        del props["statistics"]["lifts"]["byType"]["gondola"]["count"]
    elif change == "km as text":
        props["statistics"]["runs"]["byActivity"]["downhill"]["byDifficulty"]["easy"][
            "lengthInKm"
        ] = "10"
    elif change == "no geometry":
        del features[0]["geometry"]
    elif change == "a line":
        features[0]["geometry"] = {"type": "LineString", "coordinates": [[1, 2]]}
    elif change == "no activities":
        del props["activities"]
    return features


@pytest.mark.parametrize(
    ("change", "field"),
    [
        ("no statistics", "statistics is missing"),
        ("no lift count", "gondola.count is missing"),
        ("km as text", "easy.lengthInKm is not a number"),
        ("no geometry", "geometry is missing"),
        ("a line", "geometry.type is 'LineString'"),
        ("no activities", "activities is missing"),
    ],
)
def test_a_changed_format_stops_with_the_field(change: str, field: str) -> None:
    with pytest.raises(FormatError, match="feature 0 \\(id aaa1\\): ") as error:
        resorts_of(_broken(change))
    assert field in str(error.value)


def test_a_field_a_left_out_area_does_not_need_is_not_asked() -> None:
    features = _features()
    # The abandoned one has no statistics and no geometry it would need.
    closed = next(f for f in features if f["properties"]["id"] == "eee5")
    del closed["properties"]["statistics"]
    del closed["geometry"]
    assert resorts_of(features).left_out == 3


def test_a_changed_format_writes_nothing(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    tmp_path: Path,
) -> None:
    broken = tmp_path / "ski_areas.geojson"
    broken.write_text(json.dumps({"features": _broken("no statistics")}))
    # Read before the database is touched: an address no one answers is fine.
    monkeypatch.setenv(DATABASE_VARIABLE, "postgresql://nobody@127.0.0.1:1/none")
    assert resort_import.main(["--geojson", str(broken)]) == 1
    err = capsys.readouterr().err
    assert "the format changed, nothing written" in err
    assert "statistics is missing" in err
    no_features = tmp_path / "empty.geojson"
    no_features.write_text("{}")
    assert resort_import.main(["--geojson", str(no_features)]) == 1
    assert "features is missing" in capsys.readouterr().err
