"""Recommended routes near a point: the "Explore" screen (TASK-126, ADR-0098).

The routes are the seed catalogue of TASK-125 (catalog/seed/<city>.json,
ADR-0097), read once when the API starts: nothing is planned and no graph is
read. GET /recommended-routes lists the routes that start near a point, each
with a light preview of its line; GET /recommended-routes/{id} gives one
route whole, to show on the map and export. GET /catalog gives the whole
catalogue a page at a time, city by city from the nearest, for the end of
"Explore" (TASK-420 part E, ADR-0347 precisazione B).

Until the database (TASK-114) the files are the catalogue: a new file needs
a restart of the API.
"""

from __future__ import annotations

import json
import logging
import math
from collections import Counter
from collections.abc import Callable, Hashable, Iterable, Sequence
from dataclasses import dataclass
from itertools import groupby
from pathlib import Path
from typing import Any, TypeVar

from pydantic import BaseModel, SerializerFunctionWrapHandler, model_serializer

log = logging.getLogger(__name__)

DEFAULT_DIR = Path("catalog/seed")
# "Near you" (TASK-092, variant C): a start a short run away.
DEFAULT_RADIUS_M = 5_000
MAX_RADIUS_M = 50_000
MAX_ROUTES = 60
# A page of the whole catalogue (GET /catalog): a screenful and the next.
DEFAULT_PAGE = 40
MAX_PAGE = 200
# The preview of a line: enough to recognise the shape on a small card.
PREVIEW_POINTS = 64
# A word with the pen up (TASK-441): as many points for each letter, the
# walks between them left out, up to this many letters' worth.
PREVIEW_PIECE_POINTS = 32
PREVIEW_PIECES = 8
PREVIEW_DECIMALS = 5
# What a route of a city file is drawn for when it does not say (TASK-441):
# every route was a run before one could say.
RUNNING = "running"
EARTH_RADIUS_M = 6_371_008.8

LatLon = tuple[float, float]
T = TypeVar("T")


def _drop_none(body: dict[str, Any], *fields: str) -> dict[str, Any]:
    """`body` without each of `fields` that is None: the answer of a run in
    one line is what it was before the fields existed."""
    for field in fields:
        if body.get(field) is None:
            body.pop(field, None)
    return body


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
    rotation_deg: float
    """How far its shape is turned, as RouteResult.rotation_deg (TASK-232,
    ADR-0195): the app draws it turned back. 0 for a route north up, and
    for every route of a city file that does not say."""
    gaps: list[int] | None = None
    """The points of `preview` the route comes to with the pen up (TASK-441,
    ADR-0366): a card draws no segment that ends at one. Only for a word
    written letter by letter; left out of the answer for every other route."""
    activity: str | None = None
    """What it was drawn for when not a run (TASK-441 B2, ADR-0366): a ride
    is `cycling`. Left out of the answer for a run."""

    @model_serializer(mode="wrap")
    def _without_absent(self, handler: SerializerFunctionWrapHandler) -> dict[str, Any]:
        return _drop_none(handler(self), "gaps", "activity")


class RecommendedRoutesBody(BaseModel):
    routes: list[RecommendedRouteBody]


class CatalogPageBody(BaseModel):
    """GET /catalog: a page of the whole catalogue, with its size."""

    total: int
    """How many routes the catalogue has in all."""
    cities: int
    """How many cities they are in."""
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
    rotation_deg: float
    """As in the list."""
    walks: list[tuple[int, int]] | None = None
    """Where the route walks with the pen up, as RouteResult.walks (TASK-197,
    ADR-0157): pairs of indices of `points`, in order. Only for a word
    written letter by letter (TASK-441, ADR-0366); left out of the answer
    for every other route."""
    activity: str | None = None
    """As in the list: left out of the answer for a run. The app asks for
    the route again with it (RecommendedRouteDetail.activity)."""

    @model_serializer(mode="wrap")
    def _without_absent(self, handler: SerializerFunctionWrapHandler) -> dict[str, Any]:
        return _drop_none(handler(self), "walks", "activity")


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
    rotation_deg: float = 0.0
    walks: tuple[tuple[int, int], ...] = ()
    """The stretches walked with the pen up, as RouteResult.walks."""
    activity: str = RUNNING
    """What it was drawn for: a run, unless its city file says another."""

    @property
    def start(self) -> LatLon:
        return self.points[0]

    @property
    def name(self) -> str:
        """What it draws: its shape, or its word whatever the style."""
        return self.shape if self.shape is not None else str(self.word)


def varied(ranked: Sequence[T], kind: Callable[[T], Hashable]) -> list[T]:
    """`ranked` with the first of every kind before the second of any, then
    the seconds, and so on, each turn in the order it had (TASK-441): a city
    with a hundred routes does not open with ten circles."""
    seen: Counter[Hashable] = Counter()
    turns = []
    for i, item in enumerate(ranked):
        k = kind(item)
        turns.append((seen[k], i))
        seen[k] += 1
    return [ranked[i] for _, i in sorted(turns)]


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


def pen_up_preview(
    points: Sequence[LatLon],
    walks: Sequence[tuple[int, int]],
    piece_size: int = PREVIEW_PIECE_POINTS,
    pieces: int = PREVIEW_PIECES,
) -> tuple[list[LatLon], list[int]]:
    """The preview of a route drawn in pieces, and its `gaps`: every piece
    drawn thinned as `preview`, the walks left out, and the first point of
    each piece after the first marked as come to with the pen up. Past
    `pieces` pieces each gets fewer points, never under two."""
    drawn, at = [], 0
    for a, b in walks:
        drawn.append(points[at : a + 1])
        at = b
    drawn.append(points[at:])
    drawn = [d for d in drawn if len(d) >= 2]
    if not drawn:
        return preview(points), []
    size = max(2, piece_size * pieces // max(pieces, len(drawn)))
    line: list[LatLon] = []
    gaps: list[int] = []
    for piece in drawn:
        if line:
            gaps.append(len(line))
        line += preview(piece, size)
    return line, gaps


def walks_of(route: dict[str, Any], points: int) -> tuple[tuple[int, int], ...]:
    """The `walks` of a route of a city file: pairs of indices of its
    points, each after the one before. None when it does not say, or says
    something that does not read so: the route is then in one line."""
    raw = route.get("walks")
    if not isinstance(raw, list) or not raw:
        return ()
    walks = []
    at = 0
    for pair in raw:
        if (
            not isinstance(pair, list | tuple)
            or len(pair) != 2
            or not all(isinstance(i, int) and not isinstance(i, bool) for i in pair)
        ):
            return ()
        a, b = pair
        if not at <= a < b < points:
            return ()
        walks.append((a, b))
        at = b
    return tuple(walks)


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
                rotation_deg=turn_of(r),
                walks=walks_of(r, len(points)),
                activity=activity_of(r),
            )
        )
    return routes


def activity_of(route: dict[str, Any]) -> str:
    """What a route of a city file says it was drawn for (`activity`,
    written by tools/catalog_bike.py): a run when it does not say, or says
    something that is not a name."""
    activity = route.get("activity")
    return activity if isinstance(activity, str) and activity else RUNNING


def _said(activity: str) -> str | None:
    """`activity` as an answer says it: not at all for a run."""
    return None if activity == RUNNING else activity


def turn_of(route: dict[str, Any]) -> float:
    """How far a route of a city file says its shape is turned
    (`rotation_deg`, written by the engine's seed_catalog since TASK-232):
    0 when it does not say, or says something that is not a turn."""
    turn = route.get("rotation_deg")
    if isinstance(turn, bool) or not isinstance(turn, int | float):
        return 0.0
    return float(turn) if math.isfinite(turn) and -180 <= turn <= 180 else 0.0


def listed(route: CatalogRoute, away: float) -> RecommendedRouteBody:
    """One route of a list, `away` metres from the point asked about."""
    line, gaps = (
        pen_up_preview(route.points, route.walks)
        if route.walks
        else (preview(route.points), [])
    )
    return RecommendedRouteBody(
        id=route.id,
        city=route.city,
        shape=route.shape,
        word=route.word,
        style=route.style,
        distance_m=route.distance_m,
        route_m=route.route_m,
        similarity=route.similarity,
        start=route.start,
        away_m=round(away),
        preview=line,
        rotation_deg=route.rotation_deg,
        gaps=gaps or None,
        activity=_said(route.activity),
    )


class RecommendedCatalog:
    def __init__(self, routes: Iterable[CatalogRoute]) -> None:
        every = list(routes)
        # The runs: what the catalogue was before a route could say its
        # activity, and what every reader that does not ask for another
        # still gets (the lists without `activity`, best_routes.py).
        self.routes = {r.id: r for r in every if r.activity == RUNNING}
        # The routes drawn for something else (TASK-441 B2): the rides.
        self.others = {r.id: r for r in every if r.activity != RUNNING}

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
        return len(self.routes) + len(self.others)

    def of(self, activity: str) -> list[CatalogRoute]:
        """The routes drawn for `activity`: none for one the catalogue does
        not have."""
        if activity == RUNNING:
            return list(self.routes.values())
        return [r for r in self.others.values() if r.activity == activity]

    def near(
        self,
        point: LatLon,
        radius_m: float = DEFAULT_RADIUS_M,
        shape: str | None = None,
        distance: int | None = None,
        limit: int = MAX_ROUTES,
        activity: str = RUNNING,
    ) -> list[RecommendedRouteBody]:
        """The routes drawn for `activity` (the runs when it is not said)
        starting within `radius_m` of `point`: the best of
        every shape and word first, then the second best of each, and so on
        (`varied`, TASK-441); in a turn the best first, equally good ones
        nearer first. Every one is kept, even on the same roads (TASK-092,
        point 3), up to `limit`."""
        found = []
        for r in self.of(activity):
            if shape is not None and shape not in (r.shape, r.word):
                continue
            if distance is not None and r.distance_m != distance:
                continue
            away = distance_m(point, r.start)
            if away <= radius_m:
                found.append((r, away))
        found.sort(key=lambda f: (-f[0].similarity, f[1], f[0].id))
        found = varied(found, lambda f: f[0].name)
        return [listed(r, away) for r, away in found[:limit]]

    def page(
        self,
        point: LatLon,
        offset: int = 0,
        limit: int = DEFAULT_PAGE,
        activity: str = RUNNING,
    ) -> CatalogPageBody:
        """The whole catalogue of `activity` (the runs when it is not said,
        and `total` and `cities` count those) from `offset`, at most `limit`
        routes: city
        by city from the one whose nearest start is nearest `point`, and
        inside a city as `near`: the best of every shape and word, then the
        second best of each, in a turn the best first and equally good ones
        nearer first. The same order on every page, so pages join."""
        routes = self.of(activity)
        away = {r.id: distance_m(point, r.start) for r in routes}
        city_away: dict[str, float] = {}
        for r in routes:
            city_away[r.city] = min(city_away.get(r.city, math.inf), away[r.id])
        ordered = sorted(
            routes,
            key=lambda r: (
                city_away[r.city],
                r.city,
                -r.similarity,
                away[r.id],
                r.id,
            ),
        )
        ordered = [
            r
            for _, routes in groupby(ordered, key=lambda r: r.city)
            for r in varied(list(routes), lambda r: r.name)
        ]
        page = ordered[max(0, offset) : max(0, offset) + max(0, limit)]
        return CatalogPageBody(
            total=len(ordered),
            cities=len(city_away),
            routes=[listed(r, away[r.id]) for r in page],
        )

    def get(self, route_id: str) -> RecommendedRouteDetailBody | None:
        r = self.routes.get(route_id) or self.others.get(route_id)
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
            rotation_deg=r.rotation_deg,
            walks=list(r.walks) or None,
            activity=_said(r.activity),
        )
