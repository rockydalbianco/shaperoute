"""The points on the water «Explore» draws its «Paddle» shapes from
(TASK-246 part B, ADR-0211).

The app's lists of lakes (lake_catalog.py, TASK-233) and of beaches
(beach_catalog.py, TASK-245): points on a shore, each with the distance its
shapes are drawn at. A phone asks for the eight shapes of the three points
nearest it, from the point itself (the app's `requestOf`). A point of these
lists is no one's position, as a city's centre is not (route_store.py): the
API keeps the routes drawn from them, and `draw_examples --water` draws
them before any phone asks.

The lists are the app's files, read where the repository has them; the API
image has them at the same place (Dockerfile). A list that is not there is
as empty: the API then keeps only a city's examples, as before.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from route_engine.geo import LatLon

log = logging.getLogger(__name__)

REPO = Path(__file__).resolve().parents[3]
PADDLE = REPO / "apps" / "mobile" / "src" / "paddle"
# Each file with the key its points are under.
LISTS: tuple[tuple[Path, str], ...] = (
    (PADDLE / "lakes.json", "lakes"),
    (PADDLE / "beaches.json", "beaches"),
)


@dataclass(frozen=True)
class WaterSpot:
    name: str
    point: LatLon
    distance_m: int


def read_spots(lists: Sequence[tuple[Path, str]] = LISTS) -> list[WaterSpot]:
    """Every point of `lists`, in their order. A file that is not there or
    does not read is left out, and said in the log."""
    spots: list[WaterSpot] = []
    for path, key in lists:
        try:
            items = json.loads(path.read_text(encoding="utf-8"))[key]
            found = [
                WaterSpot(
                    name=str(item["name"]),
                    point=(float(item["point"][0]), float(item["point"][1])),
                    distance_m=int(item["distance_m"]),
                )
                for item in items
            ]
        except (OSError, ValueError, KeyError, TypeError, IndexError) as exc:
            log.warning("water spots of %s not read: %s", path.name, type(exc).__name__)
            continue
        spots += found
    return spots
