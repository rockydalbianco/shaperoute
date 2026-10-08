"""Zones downloaded before they are asked for (TASK-137, ADR-0119): the box
holds what "Explore" asks, and the command is careful with Overpass and the
disk. No network: the source and Overpass are stand-ins."""

from __future__ import annotations

import math
from pathlib import Path

import pytest
from route_engine.geo import LatLon, local_to_latlon
from route_engine.optimizer import FAR_OFFSET_M, SHAPE_POINTS, required_area, zone_area
from route_engine.shapes import SUPPORTED_SHAPES, get_shape

import shaperoute_api.prefetch_zones as prefetch_zones
from shaperoute_api.prefetch_zones import (
    BIKE_DISTANCE_M,
    EXAMPLE_DISTANCE_M,
    EXAMPLE_SHAPES,
    FEATURED,
    ITALY,
    MIN_FREE_BYTES,
    THEMED_DISTANCE_M,
    Outcome,
    bike_zone_box,
    box_size_km,
    http_code,
    main,
    names_cached,
    prefetch,
    slot_wait_s,
    zone_box,
)
from shaperoute_api.themed import search_radius_m
from shaperoute_api.themes import THEMES

BBox = tuple[float, float, float, float]
VERCELLI: LatLon = (45.3252, 8.4228)
CENTRES: dict[str, LatLon] = {
    "Vercelli": VERCELLI,
    "Lucca": (43.8429, 10.5027),
    "Lecce": (40.3529, 18.1743),
}


def holds(outer: BBox, inner: BBox) -> bool:
    eps = 1e-9
    return (
        outer[0] <= inner[0] + eps
        and outer[1] <= inner[1] + eps
        and outer[2] >= inner[2] - eps
        and outer[3] >= inner[3] - eps
    )


def starts_on_circle(centre: LatLon, radius_m: float, n: int = 16) -> list[LatLon]:
    return [
        local_to_latlon(
            centre,
            radius_m * math.sin(2 * math.pi * i / n),
            radius_m * math.cos(2 * math.pi * i / n),
        )
        for i in range(n)
    ]


def test_the_box_holds_every_theme_and_example_from_any_start() -> None:
    box = zone_box(VERCELLI)
    for shape in {theme.shape for theme in THEMES.values()}:
        outline = get_shape(shape)(SHAPE_POINTS)
        radius = search_radius_m(THEMED_DISTANCE_M)
        for start in starts_on_circle(VERCELLI, radius) + [VERCELLI]:
            assert holds(box, required_area(outline, start, THEMED_DISTANCE_M)), shape
            # The far search from that start (Verona's Romantic needed it).
            far = zone_area(outline, start, THEMED_DISTANCE_M, FAR_OFFSET_M)
            assert holds(box, far), shape
    for shape in EXAMPLE_SHAPES:
        outline = get_shape(shape)(SHAPE_POINTS)
        for start in starts_on_circle(VERCELLI, FAR_OFFSET_M):
            assert holds(box, required_area(outline, start, EXAMPLE_DISTANCE_M)), shape
    width, height = box_size_km(box)
    assert 15 < width < 20 and 15 < height < 20


@pytest.mark.parametrize("centre", CENTRES.values(), ids=CENTRES.keys())
def test_the_first_example_asked_needs_the_area_of_all_three(centre: LatLon) -> None:
    # draw_examples asks them in this order: the zone the first one
    # downloads has to serve the others, or a city downloads twice.
    first, *others = (
        required_area(get_shape(shape)(SHAPE_POINTS), centre, EXAMPLE_DISTANCE_M)
        for shape in EXAMPLE_SHAPES
    )
    assert EXAMPLE_SHAPES[0] == "circle"
    assert all(holds(first, other) for other in others)


class Source:
    """OsmnxSource without the network: zones are names in `cache_dir`."""

    def __init__(self, cache_dir: Path, fail_on: set[str] | None = None) -> None:
        self.cache_dir = cache_dir
        self.loaded: list[BBox] = []
        self.named: list[BBox] = []
        self.fail_on = fail_on or set()
        self.city = ""

    def cache_path(self, bbox: BBox) -> Path:
        s, w, n, e = bbox
        return self.cache_dir / f"foot_{s:.5f}_{w:.5f}_{n:.5f}_{e:.5f}.graphml"

    def covering_path(self, bbox: BBox) -> Path | None:
        for path in self.cache_dir.glob("foot_*.graphml"):
            s, w, n, e = (float(p) for p in path.stem.split("_")[1:])
            if holds((s, w, n, e), bbox):
                return path
        return None

    def load(self, bbox: BBox) -> object:
        if self.city in self.fail_on:
            raise ConnectionError("refused")
        self.loaded.append(bbox)
        self.cache_path(bbox).write_bytes(b"x" * 2_000_000)
        return object()

    def named_roads(self, bbox: BBox, download: bool = True) -> object:
        assert download
        self.named.append(bbox)
        s, w, n, e = bbox
        (self.cache_dir / f"names_{s:.5f}_{w:.5f}_{n:.5f}_{e:.5f}.json").write_text(
            "[]"
        )
        return []


def run(source: Source, cities: list[str], **kwargs: object) -> list[Outcome]:
    def find(city: str) -> tuple[str, LatLon] | None:
        source.city = city
        centre = CENTRES.get(city)
        return None if centre is None else (f"{city}, Italy", centre)

    options: dict[str, object] = {
        "overpass_wait": lambda: 0.0,
        "free_bytes": lambda: 50 * 1024**3,
        "sleep": lambda s: None,
    }
    options.update(kwargs)
    return prefetch(cities, source, find, **options)  # type: ignore[arg-type]


def test_downloads_one_at_a_time_with_a_pause_then_is_ready(tmp_path: Path) -> None:
    source = Source(tmp_path)
    pauses: list[float] = []
    first = run(source, ["Vercelli", "Lucca"], pause_s=30.0, sleep=pauses.append)
    assert [(o.city, o.status) for o in first] == [
        ("Vercelli", "downloaded"),
        ("Lucca", "downloaded"),
    ]
    assert "MB" in first[0].detail and "Vercelli, Italy, 17 x 17 km" in first[0].detail
    assert pauses == [30.0]  # between the two, not before the first
    assert len(source.loaded) == 2 and len(source.named) == 2

    again = run(source, ["Vercelli", "Lucca"])
    assert [o.status for o in again] == ["ready", "ready"]
    assert len(source.loaded) == 2


def test_a_cached_zone_without_names_gets_only_the_names(tmp_path: Path) -> None:
    source = Source(tmp_path)
    source.cache_path(zone_box(VERCELLI)).write_bytes(b"graph")
    (outcome,) = run(source, ["Vercelli"])
    assert outcome.status == "downloaded" and "street names only" in outcome.detail
    assert source.loaded == [] and len(source.named) == 1
    assert names_cached(tmp_path, zone_box(VERCELLI))


def test_a_failed_city_is_left_two_failures_in_a_row_stop(tmp_path: Path) -> None:
    source = Source(tmp_path, fail_on={"Lucca"})
    pauses: list[float] = []
    outcomes = run(
        source, ["Lucca", "Vercelli", "Lecce"], pause_s=60.0, sleep=pauses.append
    )
    assert [o.status for o in outcomes] == ["missing", "downloaded", "downloaded"]
    assert "download failed" in outcomes[0].detail
    assert pauses == [60.0, 60.0]  # after the failure too

    stopping = Source(tmp_path / "other", fail_on={"Lucca", "Lecce", "Vercelli"})
    stopping.cache_dir.mkdir()
    cities = ["Lucca", "Lecce", "Vercelli"]
    outcomes = run(stopping, cities)
    assert [o.status for o in outcomes] == ["missing", "missing", "missing"]
    assert "not tried: 2 downloads failed in a row" in outcomes[2].detail


def test_overpass_silent_or_a_full_disk_downloads_nothing(tmp_path: Path) -> None:
    source = Source(tmp_path)
    silent = run(source, ["Vercelli", "Lucca"], overpass_wait=lambda: None)
    assert [o.status for o in silent] == ["missing", "missing"]
    assert "Overpass" in silent[0].detail and "not tried" in silent[1].detail
    full = run(source, ["Vercelli"], free_bytes=lambda: MIN_FREE_BYTES - 1)
    assert full[0].status == "missing" and "5 GB" in full[0].detail
    assert source.loaded == []


def test_a_budget_of_downloads_and_unknown_cities(tmp_path: Path) -> None:
    source = Source(tmp_path)
    outcomes = run(source, ["Atlantis", "Vercelli", "Lucca"], max_downloads=1)
    assert [o.status for o in outcomes] == ["not_found", "downloaded", "missing"]
    assert "after 1 downloads" in outcomes[2].detail


def test_a_dry_run_says_what_is_missing_and_downloads_nothing(tmp_path: Path) -> None:
    source = Source(tmp_path)
    outcomes = run(source, ["Vercelli"], dry_run=True, overpass_wait=pytest.fail)
    assert outcomes[0].status == "missing" and "to download" in outcomes[0].detail
    source.cache_path(zone_box(VERCELLI)).write_bytes(b"graph")
    names = run(source, ["Vercelli"], dry_run=True, overpass_wait=pytest.fail)
    assert "street names to download" in names[0].detail
    assert source.loaded == []


def test_the_presets() -> None:
    assert len(set(ITALY)) == len(ITALY) >= 40
    assert ITALY[:4] == ("Roma", "Milano", "Napoli", "Torino")
    assert {"Trento", "Vercelli", "Aosta", "Cagliari"} <= set(ITALY)
    assert len(FEATURED) == 14 and "New York" in FEATURED


def test_without_the_city_key_the_command_says_so(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.delenv("GEOAPIFY_API_KEY", raising=False)
    assert main(["Vercelli", "--dry-run"]) == 2
    assert "GEOAPIFY_API_KEY" in capsys.readouterr().out


def test_a_busy_overpass_is_waited_for_as_its_status_page_says(tmp_path: Path) -> None:
    source = Source(tmp_path)
    slept: list[float] = []
    outcomes = run(source, ["Vercelli"], overpass_wait=lambda: 37.0, sleep=slept.append)
    assert outcomes[0].status == "downloaded" and slept == [39.0]
    busy = "Rate limit: 2\nSlot available after: 2026-10-01T22:30:00Z, in 37 seconds.\n"
    assert slot_wait_s(busy) == 37.0
    assert slot_wait_s("Rate limit: 2\n2 slots available now.\n") == 0.0
    assert slot_wait_s("<html>error</html>") is None


def test_a_failed_download_says_its_http_status(tmp_path: Path) -> None:
    class TooMany(Exception):
        code = 429

    assert http_code(TooMany()) == 429
    assert http_code(ValueError()) is None
    source = Source(tmp_path, fail_on={"Lucca"})
    source.load = lambda bbox: (_ for _ in ()).throw(TooMany())  # type: ignore[method-assign]
    (outcome,) = run(source, ["Lucca"])
    assert outcome.detail == "the download failed (TooMany 429)"


# --- bike zones (TASK-190, ADR-0153) ---


def test_the_bike_box_holds_a_30_km_route_from_the_centre() -> None:
    box = bike_zone_box(VERCELLI)
    assert BIKE_DISTANCE_M == 30_000
    for shape in SUPPORTED_SHAPES:
        outline = get_shape(shape)(SHAPE_POINTS)
        # With the far search, from the centre; without, a little off it.
        far = zone_area(outline, VERCELLI, BIKE_DISTANCE_M, FAR_OFFSET_M)
        assert holds(box, far), shape
        for start in starts_on_circle(VERCELLI, 1_400.0):
            assert holds(box, required_area(outline, start, BIKE_DISTANCE_M)), shape
    # Shorter routes from farther out, with the far search.
    circle = get_shape("circle")(SHAPE_POINTS)
    for distance, radius in ((20_000, 3_400.0), (10_000, 6_900.0)):
        for start in starts_on_circle(VERCELLI, radius):
            assert holds(box, zone_area(circle, start, distance, FAR_OFFSET_M))
    width, height = box_size_km(box)
    assert 25 < width < 27 and 25 < height < 27
    # Larger than a zone of "Explore", which does not hold it.
    assert holds(box, zone_box(VERCELLI)) and not holds(zone_box(VERCELLI), box)


def test_bike_zones_are_downloaded_without_street_names(tmp_path: Path) -> None:
    source = Source(tmp_path)
    options = {"box_of": bike_zone_box, "street_names": False}
    (outcome,) = run(source, ["Vercelli"], **options)
    assert outcome.status == "downloaded"
    assert "Vercelli, Italy, 26 x 26 km" in outcome.detail
    assert source.loaded == [bike_zone_box(VERCELLI)] and source.named == []
    (again,) = run(source, ["Vercelli"], **options)
    assert again.status == "ready"


def test_the_command_takes_bike_zones_from_an_extract_only(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    with pytest.raises(SystemExit):
        main(["Trento", "--activity", "cycling"])
    assert "--extract" in capsys.readouterr().err
    asked: dict[str, object] = {}

    def recorded(cities: list[str], source: object, find: object, **kw: object) -> list:
        asked.update(kw, cities=cities, source=source)
        return []

    monkeypatch.setattr(prefetch_zones, "prefetch", recorded)
    monkeypatch.setenv("GEOAPIFY_API_KEY", "a-key-of-the-tests")
    argv = ["Trento", "--activity", "cycling", "--extract", "italy.osm.pbf"]
    assert main([*argv, "--cache-dir", str(tmp_path)]) == 0
    source = asked["source"]
    assert source.network_name == "bike"  # type: ignore[attr-defined]
    assert source.cache_dir == tmp_path  # type: ignore[attr-defined]
    assert asked["box_of"] is bike_zone_box and asked["street_names"] is False
    assert asked["zone_data"] is not None and asked["cities"] == ["Trento"]
    # On foot, as before: the zones of "Explore", with the street names.
    assert main(["Trento", "--cache-dir", str(tmp_path)]) == 0
    assert asked["source"].network_name == "foot"  # type: ignore[attr-defined]
    assert asked["box_of"] is zone_box and asked["street_names"] is True
