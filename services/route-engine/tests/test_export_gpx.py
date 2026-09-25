import re
import shutil
import xml.etree.ElementTree as ET
from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path

import pytest

from route_engine.__main__ import main
from route_engine.export_gpx import (
    GPX_NAMESPACE,
    OSM_COPYRIGHT_URL,
    OSM_LICENSE,
    route_name,
    to_gpx,
)
from route_engine.geo import path_length_m
from route_engine.network import OsmnxSource
from route_engine.optimizer import required_area
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


def test_metadata_credits_openstreetmap_in_gpx_order() -> None:
    root = _parse(to_gpx(_heart_route(), "heart", WHEN))
    metadata = root.find("gpx:metadata", NS)
    assert metadata is not None
    order = [child.tag.split("}")[1] for child in metadata]
    assert order == ["name", "author", "copyright", "link", "time"]
    copyright_ = metadata.find("gpx:copyright", NS)
    assert copyright_ is not None
    assert copyright_.get("author") == "OpenStreetMap contributors"
    assert copyright_.findtext("gpx:license", namespaces=NS) == OSM_LICENSE
    link = metadata.find("gpx:link", NS)
    assert link is not None and link.get("href") == OSM_COPYRIGHT_URL
    assert link.findtext("gpx:text", namespaces=NS) == "© OpenStreetMap contributors"


def test_naive_time_is_rejected() -> None:
    with pytest.raises(ValueError, match="timezone-aware"):
        to_gpx(_heart_route(), "heart", datetime(2026, 9, 22))


@pytest.mark.parametrize(
    ("distance_m", "expected"),
    [(5000, "heart 5 km · 2026-09-22"), (15500, "heart 15.5 km · 2026-09-22")],
)
def test_route_name(distance_m: int, expected: str) -> None:
    assert route_name("heart", distance_m, WHEN) == expected


FIXTURE = Path(__file__).parent / "fixtures" / "levico_walk_1km.graphml"


def _cli_args(out: Path, cache_dir: Path) -> list[str]:
    return [
        "--shape=heart",
        "--distance=1000",
        "--start=46.0122,11.2986",
        f"--out={out}",
        f"--cache-dir={cache_dir}",
    ]


def _seed_cache(cache_dir: Path, optimize: bool = True) -> None:
    """Put the Levico fixture where the CLI looks for a 1 km heart's graph."""
    heart = get_shape("heart")(64)
    bbox = required_area(heart, LEVICO, 1000.0, optimize)
    cache_dir.mkdir()
    shutil.copy(FIXTURE, OsmnxSource(cache_dir).cache_path(bbox))


# With the optimizer, a 1 km heart does not fit the small Levico fixture, so
# the CLI searches up to 2 km away (ADR-0040) and downloads that zone: on CI
# it hung on Overpass. The far search has its own offline tests in
# test_optimizer.py.
@pytest.mark.parametrize(
    "optimize", [pytest.param(True, marks=pytest.mark.network), False]
)
def test_cli_writes_road_route_to_out(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], optimize: bool
) -> None:
    cache_dir = tmp_path / "cache"
    _seed_cache(cache_dir, optimize)
    out = tmp_path / "heart.gpx"
    args = _cli_args(out, cache_dir) + ([] if optimize else ["--no-optimize"])
    assert main(args) == 0
    root = _parse(out.read_text(encoding="utf-8"))
    points = root.findall("gpx:trk/gpx:trkseg/gpx:trkpt", NS)
    latlon = [(float(p.attrib["lat"]), float(p.attrib["lon"])) for p in points]
    assert points[0].attrib == points[-1].attrib
    if not optimize:
        # Along the roads there are more points than the 65 of the shape.
        # The optimizer may shrink the heart, so the count says nothing there.
        assert len(points) > 65
    printed = capsys.readouterr().out
    assert "similarity:" in printed
    assert "running beside itself" in printed and "m in tunnels" in printed
    assert ("attempts:" in printed) == optimize
    on_roads = re.search(r"on roads:\s+(\d+) m", printed)
    assert on_roads is not None
    assert int(on_roads.group(1)) == pytest.approx(path_length_m(latlon), abs=1.0)


def test_cli_never_overwrites_an_existing_file(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    out = tmp_path / "heart.gpx"
    out.write_text("keep me", encoding="utf-8")
    with pytest.raises(SystemExit) as exc_info:
        main(_cli_args(out, tmp_path / "cache"))
    assert exc_info.value.code == 2
    assert "already exists" in capsys.readouterr().err
    assert out.read_text(encoding="utf-8") == "keep me"
