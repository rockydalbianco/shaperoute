"""Deterministic tests for tools/preview_turned.py: no network, synthetic GPX."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from preview_samples import PreviewError, Track
from preview_turned import case_data, main, read_rotations, render_page

DATA_BLOCK = re.compile(
    r'<script type="application/json" id="data">(.*?)</script>', re.DOTALL
)
MERIDIAN = ((46.0, 11.0), (46.001, 11.0), (46.002, 11.0))


def _gpx(points: tuple[tuple[float, float], ...]) -> str:
    trkpts = "\n".join(
        f'      <trkpt lat="{lat:.7f}" lon="{lon:.7f}" />' for lat, lon in points
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">\n'
        f"  <trk>\n    <trkseg>\n{trkpts}\n    </trkseg>\n  </trk>\n</gpx>\n"
    )


def test_the_versions_of_a_case_sit_side_by_side_each_turned() -> None:
    tracks = [
        Track("TASK-232_heart_5km_trento_v2", MERIDIAN),
        Track("TASK-232_star_5km_trento_v1", MERIDIAN),
        Track("TASK-232_heart_5km_trento_v1", MERIDIAN),
    ]
    rotations = {"TASK-232_heart_5km_trento_v2": -30.0}
    cases = case_data(tracks, rotations)
    assert [c["name"] for c in cases] == [
        "TASK-232_heart_5km_trento",
        "TASK-232_star_5km_trento",
    ]
    heart = cases[0]["samples"]
    assert isinstance(heart, list)
    assert [s["version"] for s in heart] == ["v1", "v2"]
    assert [s["rotation_deg"] for s in heart] == [0.0, -30.0]
    assert "north up" in heart[0]["note"]
    assert "turned -30°" in heart[1]["note"]
    assert heart[1]["points"] == [[46.0, 11.0], [46.001, 11.0], [46.002, 11.0]]


def test_the_page_turns_each_map_by_the_opposite_of_the_rotation() -> None:
    cases = case_data([Track("TASK-232_moon_5km_levico_v2", MERIDIAN)], {})
    page = render_page(cases, "Turned")
    match = DATA_BLOCK.search(page)
    assert match is not None
    assert json.loads(match.group(1)) == cases
    # MapLibre's bearing is clockwise, the rotation counterclockwise.
    assert "const bearing = -sample.rotation_deg;" in page
    assert render_page(cases, "Turned") == page  # same input, same page


def test_rotations_come_from_a_json_of_sample_names(tmp_path: Path) -> None:
    path = tmp_path / "TASK-232_rotations.json"
    assert read_rotations(path) == {}  # no file: all upright
    path.write_text('{"TASK-232_heart_5km_trento_v2": 45}', encoding="utf-8")
    assert read_rotations(path) == {"TASK-232_heart_5km_trento_v2": 45.0}
    for wrong in ("[1]", '{"a": 200}', '{"a": "north"}', "{"):
        path.write_text(wrong, encoding="utf-8")
        with pytest.raises(PreviewError):
            read_rotations(path)


def test_main_writes_the_page_with_the_rotations_next_to_the_samples(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    for version in ("v1", "v2"):
        name = f"TASK-232_heart_5km_trento_{version}.gpx"
        (tmp_path / name).write_text(_gpx(MERIDIAN), encoding="utf-8")
    (tmp_path / "TASK-232_rotations.json").write_text(
        '{"TASK-232_heart_5km_trento_v2": 15}', encoding="utf-8"
    )
    out = tmp_path / "out" / "turned.html"
    assert main([str(tmp_path / "TASK-232_*.gpx"), f"--out={out}"]) == 0
    assert "1 cases, 2 tracks" in capsys.readouterr().out
    match = DATA_BLOCK.search(out.read_text(encoding="utf-8"))
    assert match is not None
    [case] = json.loads(match.group(1))
    assert [s["rotation_deg"] for s in case["samples"]] == [0.0, 15.0]


def test_main_reports_a_bad_rotations_file(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    (tmp_path / "TASK-232_a_v1.gpx").write_text(_gpx(MERIDIAN), encoding="utf-8")
    bad = tmp_path / "bad.json"
    bad.write_text("{", encoding="utf-8")
    argv = [str(tmp_path / "*.gpx"), f"--rotations={bad}", f"--out={tmp_path / 'x'}"]
    assert main(argv) == 2
    assert "preview_turned: error:" in capsys.readouterr().err
