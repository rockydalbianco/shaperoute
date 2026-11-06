"""The ski resorts read from OpenSkiData's ski_areas.geojson (TASK-406 part
A, ADR-0338): which areas are kept, and what each keeps. No database."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from shaperoute_api import resort_import
from shaperoute_api.db import DATABASE_VARIABLE
from shaperoute_api.resort_import import MAX_NAME, resorts_of, short_name

AREAS = Path(__file__).parent / "fixtures" / "ski" / "ski_areas.geojson"


def _features() -> list[dict[str, Any]]:
    return json.loads(AREAS.read_text(encoding="utf-8"))["features"]


def test_only_operating_downhill_areas_with_a_name_are_kept() -> None:
    read = resorts_of(_features())
    assert [r.id for r in read.resorts] == ["aaa1", "bbb2", "ccc3", "hhh8"]
    # Nameless, abandoned, cross-country only, and one that does not read.
    assert read.left_out == 4


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
