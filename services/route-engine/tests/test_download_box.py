"""download_box: a zone not cached is downloaded wider, on a grid."""

from __future__ import annotations

import math
import random
from pathlib import Path

import pytest

from route_engine.geo import haversine_m
from route_engine.network import (
    DOWNLOAD_GRIDS_DEG,
    DOWNLOAD_MAX_SIDE_M,
    DOWNLOAD_MIN_SIDE_M,
    BBox,
    OsmnxSource,
    area_around,
    download_box,
)

# Two zones downloaded in Bangkok on 2026-11-21/22 for two tries 0.0003 deg
# apart, and the other small ones of those days.
BANGKOK_A: BBox = (13.70620, 100.51580, 13.75580, 100.56680)
BANGKOK_B: BBox = (13.70650, 100.51610, 13.75550, 100.56650)
BANGKOK_OTHERS: list[BBox] = [
    (13.74050, 100.51280, 13.78950, 100.56320),
    (13.72950, 100.50140, 13.80050, 100.57460),
    (13.68770, 100.49040, 13.75880, 100.56360),
    (13.72450, 100.49630, 13.80550, 100.57970),
]
# Trento's bike zone, 26 km a side: wider than DOWNLOAD_MAX_SIDE_M already.
TRENTO_BIKE: BBox = (45.94940, 10.95710, 46.18350, 11.29440)


def sides_m(box: BBox) -> tuple[float, float]:
    """(north-south, east-west) sides in metres, east-west at mid latitude."""
    south, west, north, east = box
    mid = (south + north) / 2
    return (
        haversine_m((south, west), (north, west)),
        haversine_m((mid, west), (mid, east)),
    )


def contains(outer: BBox, inner: BBox, eps: float = 1e-5) -> bool:
    s, w, n, e = outer
    south, west, north, east = inner
    return s <= south + eps and w <= west + eps and n >= north - eps and e >= east - eps


def on_grid(value: float, grid: float) -> bool:
    cells = value / grid
    return abs(cells - round(cells)) < 1e-6


def random_requests(count: int, seed: int = 7) -> list[BBox]:
    """Areas of routes from 1 to 26 km a side around cities of the world."""
    rng = random.Random(seed)
    boxes: list[BBox] = []
    for _ in range(count):
        lat = rng.uniform(-60.0, 70.0)
        lon = rng.uniform(-179.0, 179.0)
        boxes.append(area_around([(lat, lon)], rng.uniform(500.0, 13_000.0)))
    return boxes


def test_two_tries_a_hair_apart_download_the_same_zone() -> None:
    assert download_box(BANGKOK_A) == download_box(BANGKOK_B)
    assert download_box(BANGKOK_A) == (13.65, 100.45, 13.8, 100.6)


def test_the_bangkok_tries_of_two_days_fit_in_two_zones() -> None:
    downloaded: list[BBox] = []
    for request in [BANGKOK_A, BANGKOK_B, *BANGKOK_OTHERS]:
        if not any(contains(zone, request) for zone in downloaded):
            downloaded.append(download_box(request))
    assert len(downloaded) == 2


def test_a_small_request_grows_to_the_least_side_and_no_more_than_the_most() -> None:
    box = download_box(BANGKOK_A)
    assert contains(box, BANGKOK_A)
    for side in sides_m(box):
        assert DOWNLOAD_MIN_SIDE_M <= side <= DOWNLOAD_MAX_SIDE_M


@pytest.mark.parametrize("request_box", random_requests(400))
def test_the_box_holds_the_request_on_a_grid_within_the_sides(
    request_box: BBox,
) -> None:
    box = download_box(request_box)
    assert contains(box, request_box)
    request_ns, request_ew = sides_m(request_box)
    ns, ew = sides_m(box)
    # Never wider than the most, unless the request already is (1% for the
    # metres of a degree here and in download_box).
    assert ns <= max(DOWNLOAD_MAX_SIDE_M, request_ns) * 1.01
    assert ew <= max(DOWNLOAD_MAX_SIDE_M, request_ew) * 1.01
    if box != request_box:
        assert any(all(on_grid(v, g) for v in box) for g in DOWNLOAD_GRIDS_DEG)
    room = DOWNLOAD_MAX_SIDE_M * 0.6
    if request_ns < room and request_ew < room:
        # Room for the least side and a grid: always grown to it.
        assert ns >= DOWNLOAD_MIN_SIDE_M * 0.99
        assert ew >= DOWNLOAD_MIN_SIDE_M * 0.99


@pytest.mark.parametrize("request_box", random_requests(200, seed=11))
def test_the_box_of_the_box_is_the_box(request_box: BBox) -> None:
    box = download_box(request_box)
    assert download_box(box) == box


def test_the_coarsest_grid_that_fits_wins() -> None:
    # 12 km around Bangkok's centre fit in 3 x 3 cells of 0.05 deg.
    assert all(on_grid(v, 0.05) for v in download_box(BANGKOK_A))
    # 15 km a side: on 0.05 deg four cells (22 km) a side, too wide.
    wide = (13.68590, 100.42500, 13.81910, 100.56200)
    box = download_box(wide)
    assert not all(on_grid(v, 0.05) for v in box)
    assert all(on_grid(v, 0.02) for v in box)
    assert box == (13.68, 100.42, 13.82, 100.58)


def test_a_request_wider_than_the_most_is_downloaded_as_it_is() -> None:
    assert download_box(TRENTO_BIKE) == TRENTO_BIKE


def test_a_request_already_on_the_grid_and_wide_enough_stays() -> None:
    box: BBox = (46.0, 11.05, 46.15, 11.25)
    assert download_box(box) == box


def test_values_off_a_grid_line_by_float_noise_count_as_on_it() -> None:
    box: BBox = (46.0 + 1e-12, 11.05 - 1e-12, 46.15 - 1e-12, 11.25 + 1e-12)
    assert download_box(box) == (46.0, 11.05, 46.15, 11.25)


def test_the_box_names_its_cache_file_without_rounding(tmp_path: Path) -> None:
    source = OsmnxSource(tmp_path)
    box = download_box(BANGKOK_A)
    name = "foot_13.65000_100.45000_13.80000_100.60000.graphml"
    assert source.cache_path(box).name == name
    for value in box:
        assert value == round(value, 5)


def test_near_the_poles_and_the_date_line_it_stays_on_the_globe() -> None:
    for request in [
        (89.95, 10.0, 89.99, 10.1),
        (-89.99, -10.1, -89.95, -10.0),
        (10.0, 179.95, 10.05, 179.99),
        (10.0, -179.99, 10.05, -179.95),
    ]:
        south, west, north, east = download_box(request)
        assert -90.0 <= south < north <= 90.0
        assert -180.0 <= west < east <= 180.0
        assert contains((south, west, north, east), request)
        assert not math.isnan(south + west + north + east)
