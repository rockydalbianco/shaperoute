"""Recommended routes near a point: the "Explore" screen (TASK-126, ADR-0098).

The routes are the seed catalogue of TASK-125 (catalog/seed/<city>.json,
ADR-0097), read once when the API starts: nothing is planned and no graph is
read. GET /recommended-routes lists the routes that start near a point, each
with a light preview of its line; GET /recommended-routes/{id} gives one
route whole, to show on the map and export.

Until the database (TASK-114) the files are the catalogue: a new file needs
a restart of the API.
"""

from __future__ import annotations

import json
import logging
import math
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel

log = logging.getLogger(__name__)

DEFAULT_DIR = Path("catalog/seed")
# "Near you" (TASK-092, variant C): a start a short run away.
DEFAULT_RADIUS_M = 5_000
MAX_RADIUS_M = 50_000
MAX_ROUTES = 60
# The preview of a line: enough to recognise the shape on a small card.
PREVIEW_POINTS = 64
PREVIEW_DECIMALS = 5
EARTH_RADIUS_M = 6_371_008.8

LatLon = tuple[float, float]


class RecommendedRouteBody(BaseModel):
    """One route of the list: packages/shared-types/fixtures/recommended.json."""

    id: str
    city: str
    shape: str | None
    """A shape of the catalogue, or None for a word."""
    word: str | None
    """The word in capitals (TASK-125, PHRASES), or None for a shape."""
    style: str | None
    """round or block, for a word."""
    distance_m: int
    """The distance asked for."""
    route_m: int
    """The distance on the roads."""
    similarity: float
    start: tuple[float, float]
    away_m: int
    """From the point asked about to the start, in a straight line."""
    preview: list[tuple[float, float]]


class RecommendedRoutesBody(BaseModel):
    routes: list[RecommendedRouteBody]


class RecommendedRouteDetailBody(BaseModel):
    """GET /recommended-routes/{id}: the route whole, as a route result has it."""

    id: str
    city: str
    shape: str | None
    word: str | None
    style: str | None
    distance_m: int
    route_m: int
    similarity: float
    points: list[tuple[float, float]]
    license: str


@dataclass(frozen=True)
class CatalogRoute:
    id: str
    city: str
    shape: str | None
    word: str | None
    style: str | None
    distance_m: int
    route_m: int
    similarity: float
    points: tuple[LatLon, ...]
    license: str

    @property
    def start(self) -> LatLon:
        return self.points[0]


def distance_m(a: LatLon, b: LatLon) -> float:
    """Great-circle distance in metres."""
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(min(1.0, h)))


def preview(points: Sequence[LatLon], size: int = PREVIEW_POINTS) -> list[LatLon]:
    """At most `size` points of the line, evenly spread by index, first and
    last kept."""
    if len(points) <= size:
        chosen = list(points)
    else:
        step = (len(points) - 1) / (size - 1)
        chosen = [points[round(i * step)] for i in range(size)]
    return [
        (round(lat, PREVIEW_DECIMALS), round(lon, PREVIEW_DECIMALS))
        for lat, lon in chosen
    ]


def parse_city(body: dict[str, Any]) -> list[CatalogRoute]:
    """The routes of one city file, with ids stable while the file is."""
    city = str(body["city"])
    routes = []
    for i, r in enumerate(body["routes"]):
        points = tuple((float(lat), float(lon)) for lat, lon in r["points"])
        if len(points) < 2:
            continue
        shape = r.get("shape")
        word = r.get("word")
        if (shape is None) == (word is None):
            continue  # one of the two, as in a route request
        name = str(shape) if shape is not None else str(word).lower()
        routes.append(
            CatalogRoute(
                id=f"{city}-{name}-{int(r['distance_m'])}-{i}",
                city=city,
                shape=None if shape is None else str(shape),
                word=None if word is None else str(word),
                style=None if word is None else str(r.get("style", "round")),
                distance_m=int(r["distance_m"]),
                route_m=int(r["route_m"]),
                similarity=float(r["similarity"]),
                points=points,
                license=str(body.get("license", "")),
            )
        )
    return routes


class RecommendedCatalog:
    def __init__(self, routes: Iterable[CatalogRoute]) -> None:
        self.routes = {r.id: r for r in routes}

    @classmethod
    def from_dir(cls, directory: Path) -> RecommendedCatalog:
        """Every city file of `directory`; none, or a file that does not
        read, leaves those routes out and says so in the log."""
        routes: list[CatalogRoute] = []
        for path in sorted(directory.glob("*.json")):
            try:
                routes += parse_city(json.loads(path.read_text(encoding="utf-8")))
            except (OSError, ValueError, KeyError, TypeError) as exc:
                log.warning("recommended routes: %s left out (%s)", path.name, exc)
        return cls(routes)

    def __len__(self) -> int:
        return len(self.routes)

    def near(
        self,
        point: LatLon,
        radius_m: float = DEFAULT_RADIUS_M,
        shape: str | None = None,
        distance: int | None = None,
        limit: int = MAX_ROUTES,
    ) -> list[RecommendedRouteBody]:
        """The routes starting within `radius_m` of `point`, the best first;
        equally good ones nearer first. Every one is kept, even on the same
        roads (TASK-092, point 3)."""
        found = []
        for r in self.routes.values():
            if shape is not None and shape not in (r.shape, r.word):
                continue
            if distance is not None and r.distance_m != distance:
                continue
            away = distance_m(point, r.start)
            if away <= radius_m:
                found.append((r, away))
        found.sort(key=lambda f: (-f[0].similarity, f[1], f[0].id))
        return [
            RecommendedRouteBody(
                id=r.id,
                city=r.city,
                shape=r.shape,
                word=r.word,
                style=r.style,
                distance_m=r.distance_m,
                route_m=r.route_m,
                similarity=r.similarity,
                start=r.start,
                away_m=round(away),
                preview=preview(r.points),
            )
            for r, away in found[:limit]
        ]

    def get(self, route_id: str) -> RecommendedRouteDetailBody | None:
        r = self.routes.get(route_id)
        if r is None:
            return None
        return RecommendedRouteDetailBody(
            id=r.id,
            city=r.city,
            shape=r.shape,
            word=r.word,
            style=r.style,
            distance_m=r.distance_m,
            route_m=r.route_m,
            similarity=r.similarity,
            points=list(r.points),
            license=r.license,
        )
