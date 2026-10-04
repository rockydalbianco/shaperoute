"""The paddling examples of «Explore» that come with the app (TASK-227,
ADR-0189).

The user's choice: the examples of the places of «Explore» with «Paddle»
(the lakes and the beaches of the app's `waterPlaces.ts`) are in the app as
it is downloaded, not drawn on its first opening. This command draws them
with the engine, as the API would (`paddling.plan_water`), on the water of a
cache folder: the server's `data/cache/water/`, or a copy of it (TASK-225).
It writes them as the app keeps the examples it draws
(`exampleRoutes.ts`, `asRecommended`): for each place, under the key the app
looks it up by, its eight shapes whole.

    python -m shaperoute_api.paddle_examples --cache-dir out/water-cache

Nothing is downloaded: a place whose water is not in the folder stops the
command. The file changes with the places, the shapes and the engine; run
the app's Prettier on it after (`npx prettier --write <file>`).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from route_engine.errors import ShapeNotDrawableError
from route_engine.geo import LatLon
from route_engine.models import RouteRequest
from route_engine.water import OverpassWaterSource, WaterNotCachedError, WaterSource

from shaperoute_api.paddling import plan_water

REPO = Path(__file__).resolve().parents[3]
WATER_PLACES = REPO / "apps" / "mobile" / "src" / "paddle" / "waterPlaces.ts"
OUT = REPO / "apps" / "mobile" / "src" / "paddle" / "paddleExamples.json"

# The app's PADDLE_EXAMPLES, as its cards show them (`setShapes`): the first
# shapes, then the others of the run (TASK-176), the user's choice.
SHAPES = (
    "heart",
    "circle",
    "star",
    "moon",
    "horse",
    "snail",
    "dog_head",
    "rabbit_head",
)
DISTANCE_M = 2000
ACTIVITY = "paddling"
# As the app's: `PADDLE_EXAMPLES.prefix`, `ID_PREFIX`, `LICENSE`.
KEY_PREFIX = "paddling:"
ID_PREFIX = "example:"
LICENSE = (
    "Routes on OpenStreetMap data, (c) OpenStreetMap contributors, "
    "ODbL 1.0: https://www.openstreetmap.org/copyright"
)
# About 10 cm: what the phone's GPS cannot tell apart, a lighter app.
DECIMALS = 6

_PLACE = re.compile(
    r'name:\s*"(?P<name>[^"]+)"[^{}]*?point:\s*\[\s*(?P<lat>-?[\d.]+)\s*,'
    r"\s*(?P<lon>-?[\d.]+)\s*\]",
    re.DOTALL,
)


@dataclass(frozen=True)
class WaterPlace:
    name: str
    point: LatLon


def read_places(path: Path = WATER_PLACES) -> list[WaterPlace]:
    """The places of the app's `WATER_PLACES`, in its order."""
    text = path.read_text(encoding="utf-8")
    places = [
        WaterPlace(m["name"], (float(m["lat"]), float(m["lon"])))
        for m in _PLACE.finditer(text)
    ]
    if not places:
        raise ValueError(f"no water places in {path}")
    return places


def place_key(point: LatLon) -> str:
    """The app's `examplesKey(point, PADDLE_EXAMPLES)`."""
    return f"{KEY_PREFIX}{point[0]:.4f},{point[1]:.4f}"


def example(place: WaterPlace, shape: str, source: WaterSource) -> dict[str, Any]:
    """One example whole, as the app's `asRecommended(...).detail`."""
    request = RouteRequest(
        start=place.point, shape=shape, distance_m=DISTANCE_M, activity=ACTIVITY
    )
    result = plan_water(request, source).result
    return {
        "id": f"{ID_PREFIX}{shape}:{place_key(place.point)}",
        "city": place.name.split(",")[0].strip(),
        "shape": shape,
        "word": None,
        "style": None,
        "distance_m": DISTANCE_M,
        "route_m": round(result.distance_m, 1),
        "similarity": result.similarity,
        "points": [
            [round(lat, DECIMALS), round(lon, DECIMALS)] for lat, lon in result.points
        ],
        "license": LICENSE,
        "activity": ACTIVITY,
        # On the water the engine places the shape once (ADR-0164).
        "alternatives": [],
    }


def examples(
    places: Sequence[WaterPlace],
    source: WaterSource,
    shapes: Sequence[str] = SHAPES,
) -> dict[str, list[dict[str, Any]]]:
    """Every place's examples, under the key the app reads them by."""
    return {
        place_key(place.point): [example(place, shape, source) for shape in shapes]
        for place in places
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m shaperoute_api.paddle_examples",
        description="Write the paddling examples the app comes with (TASK-227).",
    )
    parser.add_argument(
        "--cache-dir", type=Path, required=True, help="a cache with water/ in it"
    )
    parser.add_argument("--places", type=Path, default=WATER_PLACES)
    parser.add_argument("--out", type=Path, default=OUT)
    args = parser.parse_args(argv)

    places = read_places(args.places)
    source = OverpassWaterSource(args.cache_dir, download=False)
    try:
        found = examples(places, source)
    except WaterNotCachedError as exc:
        print(f"No water for a place in {args.cache_dir}: {exc}", file=sys.stderr)
        return 1
    except ShapeNotDrawableError as exc:
        print(f"A shape does not fit: {exc}", file=sys.stderr)
        return 1
    text = json.dumps(found, ensure_ascii=False, indent=2)
    args.out.write_text(text + "\n", encoding="utf-8")
    count = sum(len(routes) for routes in found.values())
    print(f"Wrote {args.out}: {count} examples in {len(found)} places")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
