"""The cities "Explore" shows first already have a heart, a circle and a star
in the seed catalogue (TASK-163, ADR-0132): no network, the files of the
repository only.

"Explore" lists the routes that start within 5 km of the centre the API gives
for a city's name. Those centres are written here as the API answered on
2026-10-02 (GET /cities): a featured city added to the app without its three
shapes in the catalogue, or moved away from them, fails here.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

import pytest

LatLon = tuple[float, float]

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED = REPO_ROOT / "catalog" / "seed"
PRESETS = REPO_ROOT / "apps" / "mobile" / "src" / "explore" / "presets.ts"

# As route_engine/geo.py and the API (recommended.py).
EARTH_RADIUS_M = 6_371_008.8
# "Near you" in the app and the API: NEAR_RADIUS_M, DEFAULT_RADIUS_M.
NEAR_RADIUS_M = 5_000
SHAPES = ("heart", "circle", "star")

# The chip of "Explore" and the centre GET /cities gives for it.
CENTRES: dict[str, LatLon] = {
    "New York": (40.7127, -74.0060),
    "London": (51.5074, -0.1278),
    "Paris": (48.8535, 2.3484),
    "Tokyo": (35.6769, 139.7639),
    "Rome": (41.8933, 12.4829),
    "Milan": (45.4642, 9.1896),
    "Torino": (45.0678, 7.6825),
    "Barcelona": (41.3826, 2.1771),
    "Dubai": (25.2647, 55.2924),
    "Amsterdam": (52.3731, 4.8925),
    "Berlin": (52.5174, 13.3951),
    "Lisbon": (38.7078, -9.1366),
    "Sydney": (-33.8698, 151.2083),
    "San Francisco": (37.7879, -122.4075),
}


def metres(a: LatLon, b: LatLon) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(min(1.0, h)))


def featured_cities() -> list[str]:
    """The names of FEATURED_CITIES, read from the app's own file."""
    text = PRESETS.read_text(encoding="utf-8")
    block = re.search(r"FEATURED_CITIES = \[(.*?)\] as const", text, re.DOTALL)
    assert block is not None, "FEATURED_CITIES not found in presets.ts"
    return re.findall(r'"([^"]+)"', block.group(1))


def starts() -> list[tuple[str, LatLon]]:
    """(shape, where it starts) of every shape of the catalogue."""
    found = []
    for path in sorted(SEED.glob("*.json")):
        body = json.loads(path.read_text(encoding="utf-8"))
        for route in body["routes"]:
            if "shape" in route:
                lat, lon = route["points"][0]
                found.append((route["shape"], (lat, lon)))
    return found


def test_every_featured_city_has_its_centre_here() -> None:
    assert sorted(featured_cities()) == sorted(CENTRES)


# Featured cities still without their shapes, and why. Strict: the day the
# shapes are in the catalogue the test fails until the city leaves this table.
MISSING = {
    "Berlin": "no zone to plan on: not on the server (TASK-137), Overpass closed",
}


@pytest.mark.parametrize(
    "city",
    [
        (
            pytest.param(c, marks=pytest.mark.xfail(reason=MISSING[c], strict=True))
            if c in MISSING
            else c
        )
        for c in sorted(CENTRES)
    ],
)
def test_a_featured_city_has_a_heart_a_circle_and_a_star_near(city: str) -> None:
    near = {
        shape
        for shape, start in starts()
        if shape in SHAPES and metres(CENTRES[city], start) <= NEAR_RADIUS_M
    }
    assert near == set(SHAPES), f"{city} lacks {sorted(set(SHAPES) - near)}"
