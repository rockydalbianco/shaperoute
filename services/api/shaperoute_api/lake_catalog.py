"""The lakes of «Explore» with «Paddle» (TASK-233, TASK-250).

The user's request: every lake, not only the four places chosen by hand
(`waterPlaces.ts`), and the one near the phone first. The app comes with a
list of lakes, each with the points of its shore its examples start from
and the distance they are drawn at; this command writes it, in two steps.

The waters are the `natural=water` areas of an OpenStreetMap extract, one
GeoJSON feature a line, as `osmium export` writes them (MAPS.md, «I laghi
di Explore»):

    osmium tags-filter italy.osm.pbf wr/natural=water -o water.osm.pbf
    osmium export water.osm.pbf -f geojsonseq -o water.geojsonseq

1. The boxes whose water the lakes need, one a line, for
   `python -m shaperoute_api.water_extract --bbox`:

       python -m shaperoute_api.lake_catalog --waters water.geojsonseq --boxes

2. With that water in a cache folder (the server's `data/cache/water/`, or
   a copy of it), the lakes the map has as ponds written as lakes in it
   (TASK-250):

       python -m shaperoute_api.lake_catalog --waters water.geojsonseq \
           --cache-dir out/water-cache --ponds

3. Then the list itself, each point tried with the engine as the API draws
   on the water (`paddling.plan_water`):

       python -m shaperoute_api.lake_catalog --waters water.geojsonseq \
           --cache-dir out/water-cache

A lake is what the engine paddles on (`water.is_lake`, at least
MIN_LAKE_AREA_M2) with a name that says so. Its examples are 2 km where the
first three shapes fit, else 1.5 km, else 1 km; a lake too small for 1 km,
or with no shore to walk to, is left out, and the command says why. A long
shore has a point every SPACING_M: a route starts within 2 km of the point
asked (water_fit's MOVE_MAX_M), and the app takes the point nearest the
phone. Nothing is downloaded: a point whose water is not in the folder is
told and left out. Run the app's Prettier on the file after.

A pond with a lake's name is a lake of the list too: OpenStreetMap has Lago
di Ledro, 2 km2 of lake, as `water=pond` since 2023. The engine does not
paddle on a pond, and it is not changed: step 2 writes such a pond as
`water=lake` in the water files, where the engine reads it, and keeps what
the map says beside it (MAP_KIND_TAG).
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections.abc import Iterable, Iterator, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, TextIO

import numpy as np
import shapely
from route_engine.errors import ShapeNotDrawableError
from route_engine.geo import LatLon, latlon_to_local_array, local_to_latlon
from route_engine.models import RouteRequest
from route_engine.paddling import water_area
from route_engine.water import (
    MIN_LAKE_AREA_M2,
    SHORE_MARGIN_M,
    BBox,
    Element,
    OverpassWaterSource,
    WaterNotCachedError,
    WaterSource,
    is_lake,
    read_water,
    write_water,
)
from shapely.geometry import Polygon, shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import polylabel

from shaperoute_api.paddle_examples import ACTIVITY, SHAPES
from shaperoute_api.paddling import plan_water

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "apps" / "mobile" / "src" / "paddle" / "lakes.json"

# The distances a lake's examples are drawn at, the first that fits: the
# app's 2 km (TASK-191), then smaller for a small lake, down to the least
# the engine paddles.
DISTANCES_M = (2000, 1500, 1000)
# The app's first cards (EXAMPLE_SHAPES): a lake is in the list at the
# distance all three fit at. The other shapes are left out by the app, one
# by one, where they do not fit.
FIRST_SHAPES = SHAPES[:3]
# A point every this much shore: twice the engine's MOVE_MAX_M, so a start
# anywhere on the shore has a point whose examples reach it.
SPACING_M = 4000.0
# Points of the list this near each other are one.
SAME_POINT_M = 200.0
DECIMALS = 5
LICENSE = (
    "Lakes from OpenStreetMap data, (c) OpenStreetMap contributors, "
    "ODbL 1.0: https://www.openstreetmap.org/copyright"
)

# A name that says «lake», in the languages of Italy's maps: OpenStreetMap
# has fish farms, flood basins and quarries as `natural=water` without a
# `water` tag, which the engine paddles on as it does on a lake.
_LAKE_NAME = re.compile(
    r"\b(lago|laghi|laghetto|laghetti|lac|lacs)\b|see\b", re.IGNORECASE
)
_LAKE_KINDS = frozenset({"lake", "reservoir"})
# Tagged as a lake or a reservoir, but named as what it is: the basin of a
# power plant, a flood basin, a wetland. Not a place to send a canoe to.
_NOT_A_LAKE = re.compile(r"\b(centrale|cassa di|vasca|zona umida)\b", re.IGNORECASE)
# The kind the map has a lake of the list as, by mistake (Lago di Ledro), the
# kind it is written as in a water file, and the tag that keeps the map's.
POND = "pond"
LAKE = "lake"
MAP_KIND_TAG = "water:osm"


@dataclass(frozen=True)
class Lake:
    """A lake to paddle on: the points of its shore to ask examples from,
    the first where it is widest."""

    name: str
    points: tuple[LatLon, ...]
    # The map has it as a pond (named_pond).
    pond: bool = False


@dataclass(frozen=True)
class Entry:
    """A line of the app's list."""

    name: str
    point: LatLon
    distance_m: int


def lake_name(tags: dict[str, str]) -> str | None:
    """The name the app shows, the Italian one where the map has two
    («Kalterer See - Lago di Caldaro»); None when this water is not a lake
    of the list."""
    name = _name(tags)
    if not name or _NOT_A_LAKE.search(name):
        return None
    if named_pond(tags):
        return name
    if not is_lake(tags):
        return None
    if tags.get("water") in _LAKE_KINDS or _LAKE_NAME.search(name):
        return name
    return None


def _name(tags: dict[str, str]) -> str:
    return (tags.get("name:it") or tags.get("name") or "").strip()


def named_pond(tags: dict[str, str]) -> bool:
    """A pond by its tag and a lake by its name, with nothing else the
    engine would not paddle on: a lake of the list, if it has the room."""
    return (
        tags.get("water") == POND
        and _LAKE_NAME.search(_name(tags)) is not None
        and is_lake({**tags, "water": LAKE})
    )


def ponds_as_lakes(elements: Sequence[Element], names: Iterable[str]) -> list[Element]:
    """The elements of a water file with the ponds of these names written
    as lakes, for the engine to paddle on them; what the map says is kept
    in MAP_KIND_TAG. The other elements are the same objects."""
    wanted = frozenset(names)
    written: list[Element] = []
    for element in elements:
        tags = element.get("tags", {})
        if named_pond(tags) and _name(tags) in wanted:
            element = {**element, "tags": {**tags, "water": LAKE, MAP_KIND_TAG: POND}}
        written.append(element)
    return written


def _largest(geometry: BaseGeometry) -> Polygon | None:
    polygons = [
        g for g in getattr(geometry, "geoms", [geometry]) if isinstance(g, Polygon)
    ]
    return max(polygons, key=lambda p: p.area, default=None)


def _rounded(point: LatLon) -> LatLon:
    return (round(point[0], DECIMALS), round(point[1], DECIMALS))


def shore_points(geometry: BaseGeometry) -> tuple[LatLon, ...]:
    """Where a lake's examples are asked from: on its shore, the first where
    it is widest, then one every SPACING_M around it. `geometry` is in
    (lon, lat), as GeoJSON; none when the lake is too small for the smallest
    shape."""
    centre = geometry.centroid
    origin = (centre.y, centre.x)
    local = _largest(
        shapely.transform(
            geometry, lambda lonlat: latlon_to_local_array(origin, lonlat[:, ::-1])
        )
    )
    if local is None or local.area < MIN_LAKE_AREA_M2:
        return ()
    if not local.is_valid:
        local = _largest(shapely.make_valid(local))
        if local is None:
            return ()
    widest = polylabel(local, tolerance=10.0)
    # A circle of the smallest distance, as far from the shore as the
    # engine keeps a shape: narrower than that, nothing fits.
    room = SHORE_MARGIN_M + min(DISTANCES_M) / (2 * math.pi)
    if local.exterior.distance(widest) < room:
        return ()
    shore = local.exterior
    first = shore.project(widest)
    count = max(1, int(shore.length // SPACING_M))
    step = shore.length / count
    found: list[LatLon] = []
    for i in range(count):
        at = shore.interpolate((first + i * step) % shore.length)
        found.append(_rounded(local_to_latlon(origin, at.x, at.y)))
    return tuple(found)


def read_waters(lines: Iterable[str]) -> Iterator[tuple[dict[str, str], BaseGeometry]]:
    """The features of a GeoJSON text sequence: tags and geometry. A line
    may begin with the record separator of RFC 8142."""
    for line in lines:
        text = line.strip().lstrip("\x1e")
        if not text:
            continue
        feature = json.loads(text)
        geometry = feature.get("geometry")
        if geometry is None or geometry.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        tags = {str(k): str(v) for k, v in (feature.get("properties") or {}).items()}
        yield tags, shape(geometry)


def lakes(lines: Iterable[str]) -> list[Lake]:
    """The lakes among the waters, by name and place: the same lake drawn
    twice (a way and its relation) is one."""
    found: dict[tuple[str, LatLon], Lake] = {}
    for tags, geometry in read_waters(lines):
        name = lake_name(tags)
        if name is None:
            continue
        points = shore_points(geometry)
        if points:
            found.setdefault((name, points[0]), Lake(name, points, named_pond(tags)))
    return [found[key] for key in sorted(found)]


def _request(point: LatLon, shape_name: str, distance_m: int) -> RouteRequest:
    return RouteRequest(
        start=point, shape=shape_name, distance_m=distance_m, activity=ACTIVITY
    )


def lake_box(lake: Lake) -> BBox:
    """The area whose water the lake's examples need, at the largest
    distance and from every point: one file for the whole lake."""
    boxes = [
        water_area(_request(point, shape_name, max(DISTANCES_M)))
        for point in lake.points
        for shape_name in SHAPES
    ]
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


def fitting_distance(point: LatLon, source: WaterSource) -> int | None:
    """The largest of DISTANCES_M the first shapes all fit at from `point`;
    None when not even the smallest does."""
    for distance_m in DISTANCES_M:
        try:
            for shape_name in FIRST_SHAPES:
                plan_water(_request(point, shape_name, distance_m), source)
        except ShapeNotDrawableError:
            continue
        return distance_m
    return None


def why_not(point: LatLon, source: WaterSource) -> str:
    """Why the first shapes do not all fit from `point` even at the
    smallest distance, in the engine's words."""
    for shape_name in FIRST_SHAPES:
        try:
            plan_water(_request(point, shape_name, min(DISTANCES_M)), source)
        except ShapeNotDrawableError as error:
            return str(error)
    return ""


def write_ponds_as_lakes(found: Sequence[Lake], cache_dir: Path) -> list[Path]:
    """The water files of the folder that hold a lake of the list the map
    has as a pond, written again with it as a lake (ponds_as_lakes): the
    files the engine reads, on the server too. Done twice, it changes
    nothing the second time."""
    names = {lake.name for lake in found if lake.pond}
    changed: list[Path] = []
    if not names:
        return changed
    for path in sorted((cache_dir / "water").glob("water_*.json")):
        bbox, elements = read_water(path)
        written = ponds_as_lakes(elements, names)
        if any(a is not b for a, b in zip(elements, written, strict=True)):
            write_water(path, bbox, written)
            changed.append(path)
    return changed


def _apart(a: LatLon, b: LatLon) -> float:
    x, y = latlon_to_local_array(a, np.array([b]))[0]
    return float(math.hypot(x, y))


def entries(
    found: Sequence[Lake], source: WaterSource, log: TextIO = sys.stderr
) -> tuple[list[Entry], list[str]]:
    """The app's list, and the lakes whose water `source` does not have.
    A lake none of whose points is in the list is told to `log`, with the
    engine's reason."""
    listed: list[Entry] = []
    missing: list[str] = []
    for lake in found:
        before = len(listed)
        try:
            for point in lake.points:
                if any(
                    e.name == lake.name and _apart(e.point, point) < SAME_POINT_M
                    for e in listed
                ):
                    continue
                distance_m = fitting_distance(point, source)
                if distance_m is not None:
                    listed.append(Entry(lake.name, point, distance_m))
        except WaterNotCachedError:
            missing.append(lake.name)
            continue
        print(f"{lake.name}: {len(lake.points)} points tried", file=log)
        if len(listed) == before and not any(e.name == lake.name for e in listed):
            print(f"{lake.name}: left out, {why_not(lake.points[0], source)}", file=log)
    return listed, missing


def as_json(listed: Sequence[Entry]) -> dict[str, Any]:
    return {
        "license": LICENSE,
        "lakes": [
            {"name": e.name, "point": list(e.point), "distance_m": e.distance_m}
            for e in sorted(listed, key=lambda e: (e.name, e.point))
        ],
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m shaperoute_api.lake_catalog",
        description="Write the lakes of Explore with Paddle (TASK-233).",
    )
    parser.add_argument(
        "--waters",
        type=Path,
        required=True,
        help="the natural=water areas of an extract, a GeoJSON feature a line",
    )
    todo = parser.add_mutually_exclusive_group(required=True)
    todo.add_argument(
        "--boxes",
        action="store_true",
        help="print the S,W,N,E box of each lake, for water_extract --bbox",
    )
    todo.add_argument("--cache-dir", type=Path, help="a cache with water/ in it")
    parser.add_argument(
        "--ponds",
        action="store_true",
        help="with --cache-dir: instead of writing the list, write as lakes "
        "in the folder's water files its lakes the map has as ponds",
    )
    parser.add_argument("--out", type=Path, default=OUT)
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        metavar="NAME",
        help="only the lakes with this name (repeat); for samples",
    )
    args = parser.parse_args(argv)
    if args.ponds and args.cache_dir is None:
        parser.error("--ponds needs --cache-dir")

    with args.waters.open(encoding="utf-8") as lines:
        found = lakes(lines)
    if args.only:
        found = [lake for lake in found if lake.name in args.only]
    if args.boxes:
        for lake in found:
            south, west, north, east = lake_box(lake)
            print(f"{south:.4f},{west:.4f},{north:.4f},{east:.4f}\t{lake.name}")
        return 0
    if args.ponds:
        names = sorted({lake.name for lake in found if lake.pond})
        print(f"Lakes the map has as ponds: {', '.join(names) or 'none'}")
        for path in write_ponds_as_lakes(found, args.cache_dir):
            print(f"  written as a lake in {path}")
        return 0

    source = OverpassWaterSource(args.cache_dir, download=False)
    listed, missing = entries(found, source)
    if not listed:
        print(f"No lake of {args.waters} has its water in {args.cache_dir}")
        return 1
    text = json.dumps(as_json(listed), ensure_ascii=False, indent=2)
    args.out.write_text(text + "\n", encoding="utf-8")
    names = len({e.name for e in listed})
    print(f"Wrote {args.out}: {len(listed)} points on {names} lakes")
    if missing:
        print(f"Left out, their water is not in {args.cache_dir}:")
        for name in missing:
            print(f"  {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
