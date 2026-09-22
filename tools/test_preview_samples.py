"""Deterministic tests for tools/preview_samples.py: no network, synthetic GPX."""

from __future__ import annotations

import ast
import json
import math
import re
import sys
from pathlib import Path

import pytest
from preview_samples import (
    EARTH_RADIUS_M,
    PALETTE,
    PreviewError,
    Track,
    expand_patterns,
    main,
    read_track,
    render_page,
    track_data,
)

SCRIPT = Path(__file__).with_name("preview_samples.py")
JSON_BLOCK = re.compile(
    r'<script type="application/json" id="tracks">(.*?)</script>', re.DOTALL
)

# Three points along a meridian, 0.001 degrees of latitude apart.
MERIDIAN = [(46.0, 11.0), (46.001, 11.0), (46.002, 11.0)]


def _gpx(points: list[tuple[float, float]]) -> str:
    trkpts = "\n".join(
        f'      <trkpt lat="{lat:.7f}" lon="{lon:.7f}" />' for lat, lon in points
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">\n'
        "  <trk>\n    <name>heart 5 km</name>\n    <trkseg>\n"
        f"{trkpts}\n"
        "    </trkseg>\n  </trk>\n</gpx>\n"
    )


def _write_gpx(path: Path, points: list[tuple[float, float]]) -> Path:
    path.write_text(_gpx(points), encoding="utf-8")
    return path


def _embedded(page: str) -> object:
    blocks = JSON_BLOCK.findall(page)
    assert len(blocks) == 1
    return json.loads(blocks[0])


def test_read_track_keeps_points_in_order_and_names_by_file(tmp_path: Path) -> None:
    track = read_track(_write_gpx(tmp_path / "TASK-099_heart_5km_x_v1.gpx", MERIDIAN))
    assert track.name == "TASK-099_heart_5km_x_v1"
    assert track.points == tuple(MERIDIAN)


def test_distance_along_a_meridian_is_exact(tmp_path: Path) -> None:
    track = read_track(_write_gpx(tmp_path / "a.gpx", MERIDIAN))
    expected = 2 * math.radians(0.001) * EARTH_RADIUS_M  # about 222.39 m
    assert track.distance_m == pytest.approx(expected, rel=1e-9)
    assert track.summary == "0.2 km, 3 points"


def test_invalid_xml_names_the_file(tmp_path: Path) -> None:
    path = tmp_path / "broken.gpx"
    path.write_text("<gpx><trk>", encoding="utf-8")
    with pytest.raises(PreviewError, match="broken.gpx"):
        read_track(path)


def test_gpx_without_track_points_is_an_error(tmp_path: Path) -> None:
    path = _write_gpx(tmp_path / "empty.gpx", [])
    with pytest.raises(PreviewError, match="no GPX 1.1 track points"):
        read_track(path)


def test_track_point_without_coordinates_is_an_error(tmp_path: Path) -> None:
    path = tmp_path / "bad.gpx"
    path.write_text(_gpx(MERIDIAN).replace('lon="11.0000000"', "", 1), "utf-8")
    with pytest.raises(PreviewError, match="bad.gpx"):
        read_track(path)


def test_expand_patterns_sorts_and_removes_duplicates(tmp_path: Path) -> None:
    b = _write_gpx(tmp_path / "b_v1.gpx", MERIDIAN)
    a = _write_gpx(tmp_path / "a_v1.gpx", MERIDIAN)
    _write_gpx(tmp_path / "a_v2.gpx", MERIDIAN)
    paths = expand_patterns([str(tmp_path / "*_v1.gpx"), str(a)])
    assert paths == [a, b]


def test_pattern_without_matches_is_an_error(tmp_path: Path) -> None:
    with pytest.raises(PreviewError, match="no file matches"):
        expand_patterns([str(tmp_path / "*.gpx")])


def test_embedded_json_reads_back_as_the_track_data() -> None:
    tracks = [Track("one", tuple(MERIDIAN)), Track("two", ((45.5, 11.5), (45.6, 11.6)))]
    data = _embedded(render_page(tracks, "t"))
    assert data == track_data(tracks)
    assert [d["color"] for d in data] == list(PALETTE[:2])
    assert data[0]["points"] == [list(p) for p in MERIDIAN]


def test_script_close_tag_in_a_name_stays_inside_the_json() -> None:
    name = "</script><script>alert(1)</script><!--"
    page = render_page([Track(name, tuple(MERIDIAN))], name)
    assert "<script>alert" not in page
    assert "<!--" not in page
    assert _embedded(page)[0]["name"] == name


def test_page_credits_openstreetmap() -> None:
    page = render_page([Track("one", tuple(MERIDIAN))], "t")
    assert "https://www.openstreetmap.org/copyright" in page
    assert "https://tile.openstreetmap.org/{z}/{x}/{y}.png" in page


def test_main_writes_the_same_bytes_every_time(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    _write_gpx(tmp_path / "x_v1.gpx", MERIDIAN)
    _write_gpx(tmp_path / "y_v1.gpx", [(46.1, 11.1), (46.2, 11.2)])
    pattern = str(tmp_path / "*_v1.gpx")
    first, second = tmp_path / "out" / "first.html", tmp_path / "second.html"
    assert main([pattern, "--out", str(first)]) == 0
    assert main([pattern, "--out", str(second)]) == 0
    assert first.read_bytes() == second.read_bytes()
    assert [d["name"] for d in _embedded(first.read_text("utf-8"))] == [
        "x_v1",
        "y_v1",
    ]
    assert "2 tracks -> file:" in capsys.readouterr().out


def test_main_reports_a_missing_match_in_one_line(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    out = tmp_path / "page.html"
    assert main([str(tmp_path / "*.gpx"), "--out", str(out)]) == 2
    err = capsys.readouterr().err
    assert err.startswith("preview_samples: error: no file matches")
    assert err.count("\n") == 1
    assert not out.exists()


def test_script_imports_only_the_standard_library() -> None:
    tree = ast.parse(SCRIPT.read_text(encoding="utf-8"))
    modules = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            modules.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            modules.add(node.module.split(".")[0])
    assert modules <= sys.stdlib_module_names
