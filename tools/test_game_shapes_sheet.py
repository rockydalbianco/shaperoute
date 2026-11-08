"""Tests for tools/game_shapes_sheet.py (TASK-423): the sheet of the game's
shapes, by collection, from the body of GET /game/catalog."""

from __future__ import annotations

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import game_shapes_sheet as sheet  # noqa: E402

SVG = "{http://www.w3.org/2000/svg}"


def _shape(
    shape_id: str, collection: str, goal: dict[str, object]
) -> dict[str, object]:
    return {
        "id": shape_id,
        "names": {"en": shape_id.title(), "it": f"{shape_id} it"},
        "goal": goal,
        "outline": [[0.5, 0.0], [1.0, 1.0], [0.0, 1.0], [0.5, 0.0]],
        "collection": collection,
    }


CATALOG = {
    "rules_version": 2,
    "collections": [
        {"id": "geometry", "names": {"en": "Geometry", "it": "Geometrie"}},
        {"id": "sky", "names": {"en": "Sky", "it": "Cielo"}},
    ],
    "shapes": [
        _shape("triangle", "geometry", {"kind": "distance", "total_m": 5000}),
        _shape("lightning", "sky", {"kind": "pace", "distance_m": 1000, "pace_s": 300}),
        _shape(
            "medal",
            "sky",
            {"kind": "pace", "distance_m": 42195, "pace_s": 1200, "single_run": True},
        ),
    ],
}


def test_goal_text_is_short() -> None:
    assert sheet.goal_text({"kind": "distance", "total_m": 1_000_000}) == "K 1000"
    assert sheet.goal_text({"kind": "pace", "distance_m": 400, "pace_s": 360}) == (
        "0.4k 6:00"
    )
    assert sheet.goal_text({"kind": "pace", "distance_m": 21097, "pace_s": 330}) == (
        "21.097k 5:30"
    )
    assert (
        sheet.goal_text(
            {"kind": "pace", "distance_m": 5000, "pace_s": 1200, "single_run": True}
        )
        == "1×5K"
    )


def test_path_closes_inside_its_square() -> None:
    path = sheet.path_of([[0.0, 0.0], [1.0, 0.5], [0.0, 0.0]], 10, 20)
    corner = f"{10 + sheet.DRAWING:.1f},{20 + sheet.DRAWING / 2:.1f}"
    assert path == f"M10.0,20.0 L{corner} L10.0,20.0 Z"


def test_the_sheet_has_a_block_per_collection_and_a_drawing_per_shape() -> None:
    svg = ET.fromstring(sheet.sheet_svg(CATALOG, "it"))
    titles = [t.text for t in svg.iter(f"{SVG}text") if t.get("class") == "t"]
    assert titles == ["Geometrie · 1", "Cielo · 2"]
    assert len([p for p in svg.iter(f"{SVG}path")]) == 3
    names = [t.text for t in svg.iter(f"{SVG}text") if t.get("class") == "n"]
    assert names == ["triangle it", "lightning it", "medal it"]


def test_a_language_without_a_name_falls_back_to_english() -> None:
    svg = ET.fromstring(sheet.sheet_svg(CATALOG, "fr"))
    titles = [t.text for t in svg.iter(f"{SVG}text") if t.get("class") == "t"]
    assert titles == ["Geometry · 1", "Sky · 2"]


def test_a_catalog_before_collections_is_one_block() -> None:
    first = {k: v for k, v in CATALOG["shapes"][0].items() if k != "collection"}
    before = {"rules_version": 1, "shapes": [first]}
    svg = ET.fromstring(sheet.sheet_svg(before))
    titles = [t.text for t in svg.iter(f"{SVG}text") if t.get("class") == "t"]
    assert titles == ["— · 1"]


def test_main_writes_the_sheet(tmp_path: Path) -> None:
    source = tmp_path / "catalog.json"
    source.write_text(json.dumps(CATALOG), encoding="utf-8")
    out = tmp_path / "out" / "forme.svg"
    assert sheet.main([str(source), str(out), "--language", "en"]) == 0
    assert out.read_text(encoding="utf-8").startswith("<svg")
