"""The beaches of «Paddle» besides Jesolo and Riccione (TASK-245).

The user's request: more places by the sea, in «Explore» and in «Another
place». The user chose the places (PLACES, seaside towns on every coast of
Italy); this command finds, for each, the point of its shore the examples
start from and the distance they are drawn at, and writes the list the app
comes with. Only the places the engine draws on are in it: at sea a shape
keeps 200 m off the shore and within 1 km of it (water.SEA_SHORE_MARGIN_M).

As the lakes' list (lake_catalog.py), in two steps:

1. The boxes whose water the places need, one a line, for
   `python -m shaperoute_api.water_extract --bbox`. With `--cache-dir`, the
   places a file there already covers are left out (Rimini is in the water
   of Riccione, TASK-225):

       python -m shaperoute_api.beach_catalog --boxes --cache-dir out/water-cache

2. With that water in a cache folder (the server's `data/cache/water/`, or
   a copy of it), the list itself:

       python -m shaperoute_api.beach_catalog --cache-dir out/water-cache

A place is the town as OpenStreetMap has it (its `place` node), written
here. Its point is not written by hand: it is a point of the shore one
walks to (water.build_area, the engine's own), on a beach where there is
one, the nearest to the town within REACH_M, and the first of a few where
the first three shapes fit at 2 km; else where they fit at 1.5 km, else at
1 km. A place with no such point is left out, and the command says why.
Nothing is downloaded: a place whose water is not in the folder is told and
left out. Run the app's Prettier on the file after.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, TextIO

import numpy as np
from route_engine.errors import ShapeNotDrawableError
from route_engine.geo import LatLon, local_to_latlon
from route_engine.models import DISTANCE_LIMITS_M, RouteRequest
from route_engine.paddling import water_area
from route_engine.water import (
    BBox,
    OverpassWaterSource,
    WaterNotCachedError,
    WaterSource,
    build_area,
)

from shaperoute_api.lake_catalog import DECIMALS, DISTANCES_M, FIRST_SHAPES, Entry
from shaperoute_api.paddle_examples import ACTIVITY, SHAPES
from shaperoute_api.paddling import plan_water

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "apps" / "mobile" / "src" / "paddle" / "beaches.json"

# The shore looked at around a town: its place in OpenStreetMap is the main
# square, which may be a walk from the beach (Villasimius: 2 km).
REACH_M = 3000.0
# The largest request the API takes on the water: a place's box holds it
# from every start within REACH_M of the town.
LARGEST_M = DISTANCE_LIMITS_M[ACTIVITY][1]
# The points of a place's shore that are tried, the nearest first, each at
# least APART_M from the ones before: a route starts within 2 km of the
# point asked (water_fit.MOVE_MAX_M), so nearer points try the same water.
TRIES = 4
APART_M = 500.0
LICENSE = (
    "Beaches from OpenStreetMap data, (c) OpenStreetMap contributors, "
    "ODbL 1.0: https://www.openstreetmap.org/copyright"
)


@dataclass(frozen=True)
class Place:
    """A seaside town: the name the app shows and where the map has it."""

    name: str
    town: LatLon


# The user's choice (2026-10-05): 29 known places, on every coast. Each
# town is where OpenStreetMap has its `place` node («Ostia» is Lido di
# Ostia, «Cavallino» the village of Cavallino-Treporti).
PLACES: tuple[Place, ...] = (
    Place("Alassio", (44.00801, 8.17303)),
    Place("Alghero", (40.55873, 8.31532)),
    Place("Bibione", (45.64273, 13.05467)),
    Place("Caorle", (45.59791, 12.88763)),
    Place("Castiglione della Pescaia", (42.76393, 10.87909)),
    Place("Cattolica", (43.96399, 12.74415)),
    Place("Cavallino", (45.48203, 12.55287)),
    Place("Cefalù", (38.03496, 14.02446)),
    Place("Cesenatico", (44.19993, 12.39697)),
    Place("Forte dei Marmi", (43.95959, 10.16994)),
    Place("Gallipoli", (40.05469, 17.97578)),
    Place("Lignano Sabbiadoro", (45.69016, 13.14077)),
    Place("Mondello", (38.20621, 13.32455)),
    Place("Ostia", (41.73185, 12.27796)),
    Place("Otranto", (40.14567, 18.49076)),
    Place("Pescara", (42.46961, 14.20593)),
    Place("Rimini", (44.05939, 12.56844)),
    Place("San Benedetto del Tronto", (42.95253, 13.88071)),
    Place("San Teodoro", (40.77164, 9.67042)),
    Place("San Vito lo Capo", (38.17235, 12.73493)),
    Place("Sanremo", (43.81704, 7.77506)),
    Place("Senigallia", (43.71495, 13.21795)),
    Place("Sestri Levante", (44.27145, 9.39586)),
    Place("Sottomarina", (45.2149, 12.29389)),
    Place("Sperlonga", (41.26021, 13.43311)),
    Place("Tropea", (38.67527, 15.89485)),
    Place("Viareggio", (43.86724, 10.25061)),
    Place("Vieste", (41.88276, 16.17918)),
    Place("Villasimius", (39.14314, 9.52085)),
)


@dataclass(frozen=True)
class LeftOut:
    """A place that is not in the list, and why."""

    name: str
    why: str


def _request(point: LatLon, shape_name: str, distance_m: int) -> RouteRequest:
    return RouteRequest(
        start=point, shape=shape_name, distance_m=distance_m, activity=ACTIVITY
    )


def _around(point: LatLon, half_m: float) -> BBox:
    south, west = local_to_latlon(point, -half_m, -half_m)
    north, east = local_to_latlon(point, half_m, half_m)
    return (south, west, north, east)


def place_box(place: Place) -> BBox:
    """The area whose water the place needs: what the largest request asks
    from any start within REACH_M of the town. One file for the place."""
    south, west, north, east = _around(place.town, REACH_M)
    boxes = [
        water_area(_request(corner, shape_name, LARGEST_M))
        for corner in ((south, west), (north, east))
        for shape_name in SHAPES
    ]
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


def shore_points(place: Place, source: WaterSource) -> list[LatLon]:
    """The points of the shore to try for a place, the best first: where
    one walks to the water within REACH_M of the town, on a beach before
    any other way to the shore, the nearest first, and no two within
    APART_M. At most TRIES."""
    bbox = _around(place.town, REACH_M)
    area = build_area(source.elements(bbox), place.town, bbox)
    if not len(area.access):
        return []
    away = np.hypot(area.access[:, 0], area.access[:, 1])
    on_beach = np.array([kind == "beach" for kind in area.access_kind])
    order = np.lexsort((away, ~on_beach))
    chosen: list[np.ndarray] = []
    for i in order:
        if away[i] > REACH_M or len(chosen) == TRIES:
            continue
        at = area.access[i]
        if all(np.hypot(*(at - other)) >= APART_M for other in chosen):
            chosen.append(at)
    return [
        (round(lat, DECIMALS), round(lon, DECIMALS))
        for lat, lon in area.to_latlon((float(x), float(y)) for x, y in chosen)
    ]


def fitting(point: LatLon, source: WaterSource) -> tuple[int | None, str]:
    """The largest of DISTANCES_M the first shapes all fit at from `point`;
    None, and what the engine says of the smallest, when none does."""
    why = ""
    for distance_m in DISTANCES_M:
        try:
            for shape_name in FIRST_SHAPES:
                plan_water(_request(point, shape_name, distance_m), source)
        except ShapeNotDrawableError as exc:
            why = f"{shape_name} of {distance_m} m: {exc}"
            continue
        return distance_m, ""
    return None, why


def entries(
    places: Sequence[Place], source: WaterSource, log: TextIO = sys.stderr
) -> tuple[list[Entry], list[LeftOut]]:
    """The app's list, and the places that are not in it."""
    listed: list[Entry] = []
    left_out: list[LeftOut] = []
    for place in places:
        try:
            points = shore_points(place, source)
            best: Entry | None = None
            why = f"no shore to walk to within {REACH_M:.0f} m of the town"
            for point in points:
                distance_m, said = fitting(point, source)
                if distance_m is None:
                    why = said
                elif best is None or distance_m > best.distance_m:
                    best = Entry(place.name, point, distance_m)
                if distance_m == max(DISTANCES_M):
                    break
        except WaterNotCachedError:
            left_out.append(LeftOut(place.name, "its water is not in the folder"))
            continue
        if best is None:
            left_out.append(LeftOut(place.name, why))
        else:
            listed.append(best)
        print(f"{place.name}: {len(points)} points of the shore", file=log)
    return listed, left_out


def as_json(listed: Sequence[Entry]) -> dict[str, Any]:
    return {
        "license": LICENSE,
        "beaches": [
            {"name": e.name, "point": list(e.point), "distance_m": e.distance_m}
            for e in sorted(listed, key=lambda e: (e.name, e.point))
        ],
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m shaperoute_api.beach_catalog",
        description="Write the beaches of Paddle (TASK-245).",
    )
    parser.add_argument(
        "--boxes",
        action="store_true",
        help="print the S,W,N,E box of each place, for water_extract --bbox",
    )
    parser.add_argument("--cache-dir", type=Path, help="a cache with water/ in it")
    parser.add_argument("--out", type=Path, default=OUT)
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        metavar="NAME",
        help="only the places with this name (repeat); for samples",
    )
    args = parser.parse_args(argv)
    if not args.boxes and args.cache_dir is None:
        parser.error("one of --boxes and --cache-dir is needed")

    places = [p for p in PLACES if not args.only or p.name in args.only]
    source = (
        None
        if args.cache_dir is None
        else OverpassWaterSource(args.cache_dir, download=False)
    )
    if args.boxes:
        for place in places:
            box = place_box(place)
            if source is not None and source.is_cached(box):
                continue
            south, west, north, east = box
            print(f"{south:.4f},{west:.4f},{north:.4f},{east:.4f}\t{place.name}")
        return 0

    assert source is not None
    listed, left_out = entries(places, source)
    if not listed:
        print(f"No place has its water in {args.cache_dir}")
        return 1
    text = json.dumps(as_json(listed), ensure_ascii=False, indent=2)
    args.out.write_text(text + "\n", encoding="utf-8")
    print(f"Wrote {args.out}: {len(listed)} places")
    if left_out:
        print("Left out:")
        for place in left_out:
            print(f"  {place.name}: {place.why}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
