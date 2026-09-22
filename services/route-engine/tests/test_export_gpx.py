import re
import xml.etree.ElementTree as ET
from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path

import pytest

from route_engine.__main__ import main
from route_engine.export_gpx import GPX_NAMESPACE, route_name, to_gpx
from route_engine.projection import initial_scale, project_shape
from route_engine.shapes import get_shape

NS = {"gpx": GPX_NAMESPACE}
LEVICO = (46.0122, 11.2986)
WHEN = datetime(2026, 9, 22, 18, 30, tzinfo=UTC)
COORDINATE = re.compile(r"^-?\d{1,3}\.\d{7}$")


def _heart_route() -> list[tuple[float, float]]:
    heart = get_shape("heart")(64)
    return project_shape(heart, LEVICO, initial_scale(heart, 5000.0))


def _parse(document: str) -> ET.Element:
    return ET.fromstring(document.encode("utf-8"))


def test_document_is_gpx_1_1() -> None:
    root = _parse(to_gpx(_heart_route(), "heart", WHEN))
    assert root.tag == f"{{{GPX_NAMESPACE}}}gpx"
    assert root.get("version") == "1.1"
    assert root.get("creator")


def test_one_track_one_segment_one_point_per_coordinate() -> None:
    route = _heart_route()
    root = _parse(to_gpx(route, "heart", WHEN))
    assert len(root.findall("gpx:trk", NS)) == 1
    assert len(root.findall("gpx:trk/gpx:trkseg", NS)) == 1
    assert len(root.findall("gpx:trk/gpx:trkseg/gpx:trkpt", NS)) == len(route)


def test_first_and_last_points_coincide_at_start() -> None:
    root = _parse(to_gpx(_heart_route(), "heart", WHEN))
    points = root.findall("gpx:trk/gpx:trkseg/gpx:trkpt", NS)
    first = (points[0].get("lat"), points[0].get("lon"))
    assert first == (points[-1].get("lat"), points[-1].get("lon"))
    assert first == ("46.0122000", "11.2986000")


def test_coordinates_have_seven_decimals() -> None:
    root = _parse(to_gpx([(-33.9, 18.4), (46.0122, 11.2986)], "x", WHEN))
    for point in root.findall("gpx:trk/gpx:trkseg/gpx:trkpt", NS):
        assert COORDINATE.match(point.get("lat", ""))
        assert COORDINATE.match(point.get("lon", ""))


def test_metadata_has_name_author_and_utc_time() -> None:
    local = WHEN.astimezone(timezone(timedelta(hours=2)))
    root = _parse(to_gpx(_heart_route(), "heart 5 km · 2026-09-22", local))
    assert root.findtext("gpx:metadata/gpx:name", namespaces=NS) == (
        "heart 5 km · 2026-09-22"
    )
    assert root.findtext("gpx:metadata/gpx:author/gpx:name", namespaces=NS)
    assert root.findtext("gpx:metadata/gpx:time", namespaces=NS) == (
        "2026-09-22T18:30:00Z"
    )
    assert root.findtext("gpx:trk/gpx:name", namespaces=NS) == (
        "heart 5 km · 2026-09-22"
    )


def test_naive_time_is_rejected() -> None:
    with pytest.raises(ValueError, match="timezone-aware"):
        to_gpx(_heart_route(), "heart", datetime(2026, 9, 22))


@pytest.mark.parametrize(
    ("distance_m", "expected"),
    [(5000, "heart 5 km · 2026-09-22"), (15500, "heart 15.5 km · 2026-09-22")],
)
def test_route_name(distance_m: int, expected: str) -> None:
    assert route_name("heart", distance_m, WHEN) == expected


def _cli_args(out: Path) -> list[str]:
    return [
        "--shape=heart",
        "--distance=5000",
        "--start=46.0122,11.2986",
        f"--out={out}",
    ]


def test_cli_writes_gpx_to_out(tmp_path: Path) -> None:
    out = tmp_path / "heart.gpx"
    assert main(_cli_args(out)) == 0
    root = _parse(out.read_text(encoding="utf-8"))
    assert len(root.findall("gpx:trk/gpx:trkseg/gpx:trkpt", NS)) == 65


def test_cli_never_overwrites_an_existing_file(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    out = tmp_path / "heart.gpx"
    out.write_text("keep me", encoding="utf-8")
    with pytest.raises(SystemExit) as exc_info:
        main(_cli_args(out))
    assert exc_info.value.code == 2
    assert "already exists" in capsys.readouterr().err
    assert out.read_text(encoding="utf-8") == "keep me"
