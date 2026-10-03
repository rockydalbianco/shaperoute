"""Water to paddle on (TASK-191, ADR-0154).

On water there is no road network: the placed shape *is* the route, as
long as all of it lies on the water (`water_fit.py` finds where it fits).
This module finds, around a start,

- the water: lakes from `natural=water`, the sea as the box minus the land
  built from `natural=coastline` (land on the left of the way, as
  OpenStreetMap draws it);
- the band a paddler may use: water within 1 km of the shore (the user's
  choice), kept off the shore (200 m at sea, 50 m on a lake), piers,
  breakwaters, groynes, reefs and marinas by a margin;
- the points of the shore that can be reached on foot: by a beach, a
  slipway, a pier, a path or a road beside the water.

Everything is in metres on the plane tangent at the requested start
(geo.py); coordinates in and out are (lat, lon). The data are OpenStreetMap
elements in the Overpass `out tags geom` format, cached apart from the
roads (`<cache>/water/`). Nothing here imports from the API or the AI, and
nothing needs the network except `OverpassWaterSource` on a cache miss.

`python -m route_engine.water` draws a shape on the water, for samples, also
from answers of the OSM API; `python -m route_engine --activity paddling`
draws one as a request does (paddling.py).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import uuid
from collections.abc import Iterable, Iterator, Sequence
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

import numpy as np
import shapely
from shapely.geometry import (
    LineString,
    MultiLineString,
    Point,
    Polygon,
    box,
    mapping,
)
from shapely.geometry.base import BaseGeometry

from route_engine.errors import ShapeNotDrawableError
from route_engine.geo import LatLon, latlon_to_local_array, local_to_latlon
from route_engine.overpass_address import reachable

# (south, west, north, east) in degrees, as network.BBox.
BBox = tuple[float, float, float, float]
Element = dict[str, Any]
XY = tuple[float, float]

# --- The band (ADR-0154) ---------------------------------------------------

# The user's choice: the drawing stays within about 1 km of the shore.
SHORE_BAND_M = 1_000.0
# Off the shore: the coastline is the mean high-water line traced from
# imagery, and on a beach the water's edge moves by tens of metres; Jesolo's
# wooden groynes reach 14-63 m past it (OSM API, 2026-10-02).
SHORE_MARGIN_M = 50.0
# At sea the shape keeps farther off the shore: past the bathers' band of
# many beach ordinances, the user's choice (TASK-191 A2, ADR-0161). Only the
# legs from the shore cross it. On a lake SHORE_MARGIN_M is the margin.
SEA_SHORE_MARGIN_M = 200.0
# Off piers, breakwaters, groynes, reefs, marinas and water that is not a
# lake or the sea (rivers, canals, lagoons, harbour basins).
OBSTACLE_MARGIN_M = 30.0
# A pier or a breakwater drawn as a line is about this wide each side.
LINE_HALF_WIDTH_M = 3.0
# Smaller `natural=water` is a pond or a pool, not a lake to paddle on.
MIN_LAKE_AREA_M2 = 100_000.0
# Land smaller than this, off the mainland, is a rock or a detached
# breakwater: kept clear of, but not a shore to stay within 1 km of.
MIN_SHORE_AREA_M2 = 10_000.0

# --- The shore start --------------------------------------------------------

# A point of the shore this close to a beach, a slipway, a pier or a way
# one can walk is reachable on foot.
ACCESS_NEAR_M = 40.0
# The shore is looked at every ACCESS_STEP_M.
ACCESS_STEP_M = 10.0

# --- OpenStreetMap ----------------------------------------------------------

LAKE_WATER: frozenset[str | None] = frozenset({None, "lake", "reservoir"})
OBSTACLE_MAN_MADE = frozenset({"pier", "breakwater", "groyne"})
NOT_WALKABLE = frozenset(
    {
        "abandoned",
        "bus_guideway",
        "busway",
        "construction",
        "corridor",
        "elevator",
        "motorway",
        "motorway_link",
        "no",
        "planned",
        "platform",
        "proposed",
        "raceway",
        "razed",
        "rest_area",
        "services",
        "trunk",
        "trunk_link",
    }
)
ACCESS_KINDS = ("beach", "slipway", "pier", "path")

WATER_QUERY = (
    "[out:json][timeout:{timeout}];"
    '(way["natural"="coastline"]({b});way["natural"="water"]({b});'
    'relation["natural"="water"]({b});)->.w;'
    "(.w;way(r.w);)->.s;"
    "(.w;"
    'way["man_made"~"^(pier|breakwater|groyne)$"]({b});'
    'relation["man_made"~"^(pier|breakwater|groyne)$"]({b});'
    'way["natural"~"^(beach|reef)$"]({b});'
    'relation["natural"~"^(beach|reef)$"]({b});'
    'way["leisure"~"^(marina|slipway|beach_resort)$"]({b});'
    'relation["leisure"~"^(marina|beach_resort)$"]({b});'
    'node["leisure"="slipway"]({b});'
    'way["landuse"="harbour"]({b});relation["landuse"="harbour"]({b});'
    'way["highway"](around.s:{near})({b});'
    ");out tags geom;"
)
WATER_TIMEOUT_S = 180

EMPTY = Polygon()


class NoWaterError(ShapeNotDrawableError):
    """No lake or sea to paddle on near the start: a request away from the
    water. A ShapeNotDrawableError, like NoRoadsError (ADR-0148), so every
    caller answers it already."""


class WaterFitError(ShapeNotDrawableError):
    """There is water, but the shape does not fit in the band near the
    start, or fits only much smaller: best_distance_m is the distance it
    fits at (TASK-031), None when it does not fit at all."""


class WaterNotCachedError(LookupError):
    """No cached water covers the area, and downloading was not allowed."""


# --- Elements ---------------------------------------------------------------


def roles(tags: dict[str, str], kind: str = "way") -> frozenset[str]:
    """What an element of this kind ("node", "way", "relation") with these
    tags is to the water: "coastline", "water", "obstacle", and the kinds
    of access to the shore. A node is only ever a slipway: a crossing or a
    lamp on the promenade is not a way to the water, its road is."""
    if kind == "node":
        return frozenset({"slipway"} if tags.get("leisure") == "slipway" else ())
    found: set[str] = set()
    natural = tags.get("natural")
    leisure = tags.get("leisure")
    man_made = tags.get("man_made")
    if natural == "coastline":
        found.add("coastline")
    if natural == "water":
        found.add("water")
    if (
        man_made in OBSTACLE_MAN_MADE
        or natural == "reef"
        or leisure == "marina"
        or tags.get("landuse") == "harbour"
    ):
        found.add("obstacle")
    if natural == "beach" or leisure == "beach_resort":
        found.add("beach")
    if leisure == "slipway":
        found.add("slipway")
    if man_made == "pier":
        found.add("pier")
    if "highway" in tags and walkable(tags):
        found.add("path")
    return frozenset(found)


def walkable(tags: dict[str, str]) -> bool:
    """A way one may walk along: not a motorway, not closed to people on
    foot (as network.FOOT_FILTER, roughly)."""
    if tags.get("highway") in NOT_WALKABLE:
        return False
    foot = tags.get("foot")
    if foot == "no":
        return False
    return not (
        tags.get("access") in ("no", "private")
        and foot not in ("yes", "designated", "permissive")
    )


def is_lake(tags: dict[str, str]) -> bool:
    """`natural=water` that is a lake to paddle on, if large enough
    (MIN_LAKE_AREA_M2): not a river, a canal, a lagoon or a marina."""
    return (
        tags.get("natural") == "water"
        and tags.get("water") in LAKE_WATER
        and tags.get("leisure") != "marina"
        and tags.get("landuse") != "harbour"
        and tags.get("seamark:type") != "harbour"
        and "amenity" not in tags
    )


def compact(elements: Iterable[Element]) -> list[Element]:
    """The elements the water needs, with only what it reads of them:
    type, id, tags and geometry (coordinates to 7 decimals, about 1 cm)."""
    kept: list[Element] = []
    for element in elements:
        tags = element.get("tags", {})
        if not roles(tags, element["type"]):
            continue
        row: Element = {"type": element["type"], "id": element.get("id"), "tags": tags}
        if element["type"] == "node":
            row["lat"] = round(float(element["lat"]), 7)
            row["lon"] = round(float(element["lon"]), 7)
        elif element["type"] == "way":
            row["geometry"] = _rounded(element.get("geometry", []))
        else:
            row["members"] = [
                {
                    "type": m.get("type"),
                    "ref": m.get("ref"),
                    "role": m.get("role", ""),
                    "geometry": _rounded(m.get("geometry", [])),
                }
                for m in element.get("members", [])
                if m.get("type") == "way" and m.get("geometry")
            ]
        kept.append(row)
    return kept


def _rounded(points: Iterable[dict[str, float] | None]) -> list[dict[str, float]]:
    return [
        {"lat": round(float(p["lat"]), 7), "lon": round(float(p["lon"]), 7)}
        for p in points
        if p is not None
    ]


def elements_from_osm_api(answers: Sequence[dict[str, Any]]) -> list[Element]:
    """Elements as `compact` keeps them, from answers of the OpenStreetMap
    API (`/api/0.6/map.json`, `/relation/<id>/full.json`), merged.

    The map call gives every way with a node in its box whole, but a
    relation only with the members it holds: a large lake needs its
    relation in full too. A member way none of the answers has is left
    out. For samples when Overpass refuses (ADR-0154), never in the API.
    """
    nodes: dict[int, dict[str, float]] = {}
    ways: dict[int, Element] = {}
    rest: dict[tuple[str, int], Element] = {}
    for answer in answers:
        for element in answer.get("elements", []):
            kind = element["type"]
            if kind == "node":
                nodes[element["id"]] = {"lat": element["lat"], "lon": element["lon"]}
                if element.get("tags"):
                    rest[("node", element["id"])] = element
            elif kind == "way":
                ways[element["id"]] = element
            else:
                rest[(kind, element["id"])] = element

    def geometry(way: Element) -> list[dict[str, float]] | None:
        points = [nodes.get(ref) for ref in way.get("nodes", [])]
        if not points or any(p is None for p in points):
            return None
        return [p for p in points if p is not None]

    out: list[Element] = []
    for way in ways.values():
        points = geometry(way)
        if points is not None:
            out.append({**way, "geometry": points})
    for (kind, _), element in sorted(rest.items()):
        if kind == "relation":
            members = []
            for member in element.get("members", []):
                way = ways.get(member["ref"]) if member["type"] == "way" else None
                points = None if way is None else geometry(way)
                if points is not None:
                    members.append({**member, "geometry": points})
            out.append({**element, "members": members})
        else:
            out.append(element)
    return compact(out)


# --- Sources and the cache --------------------------------------------------


class WaterSource(Protocol):
    def elements(self, bbox: BBox) -> list[Element]: ...


def read_water(path: Path) -> tuple[BBox | None, list[Element]]:
    """A water file: `{"bbox": [s, w, n, e], "elements": [...]}`."""
    data = json.loads(path.read_text(encoding="utf-8"))
    bbox: BBox | None = None
    if data.get("bbox"):
        south, west, north, east = (float(v) for v in data["bbox"])
        bbox = (south, west, north, east)
    return bbox, list(data["elements"])


def write_water(path: Path, bbox: BBox | None, elements: Sequence[Element]) -> None:
    """Written whole or not at all, as every cache file (ADR-0104)."""
    text = json.dumps(
        {"bbox": list(bbox) if bbox else None, "elements": list(elements)},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    with _whole(path) as temporary:
        temporary.write_text(text, encoding="utf-8")


@contextmanager
def _whole(path: Path) -> Iterator[Path]:
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex[:8]}.part")
    try:
        yield temporary
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


class FileWaterSource:
    """Water read from one file, whatever the area asked: fixtures, and
    samples built from the OSM API."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.bbox, self._elements = read_water(path)

    def elements(self, bbox: BBox) -> list[Element]:
        return self._elements


class OverpassWaterSource:
    """Water from Overpass, cached in `<cache_dir>/water/` apart from the
    road graphs: `water_<s>_<w>_<n>_<e>.json`. A file whose area contains
    the one asked serves it; else one request, one attempt (MAPS.md)."""

    def __init__(self, cache_dir: Path, download: bool = True) -> None:
        self.folder = cache_dir / "water"
        self.download = download

    def path(self, bbox: BBox) -> Path:
        south, west, north, east = bbox
        return self.folder / f"water_{south:.5f}_{west:.5f}_{north:.5f}_{east:.5f}.json"

    def covering_path(self, bbox: BBox) -> Path | None:
        """The smallest cached file whose area contains `bbox`."""
        south, west, north, east = bbox
        eps = 1e-5  # names are rounded to 5 decimals
        best: tuple[float, Path] | None = None
        for path in self.folder.glob("water_*.json"):
            try:
                s, w, n, e = (float(p) for p in path.stem.split("_")[1:])
            except ValueError:
                continue
            if (
                s <= south + eps
                and w <= west + eps
                and n >= north - eps
                and e >= east - eps
            ):
                size = (n - s) * (e - w)
                if best is None or size < best[0]:
                    best = (size, path)
        return None if best is None else best[1]

    def is_cached(self, bbox: BBox) -> bool:
        return self.covering_path(bbox) is not None

    def elements(self, bbox: BBox) -> list[Element]:
        covering = self.covering_path(bbox)
        if covering is not None:
            return read_water(covering)[1]
        if not self.download:
            raise WaterNotCachedError(f"no cached water covers {bbox}")
        elements = compact(overpass(water_query(bbox)).get("elements", []))
        write_water(self.path(bbox), bbox, elements)
        return elements


def water_query(bbox: BBox, timeout_s: int = WATER_TIMEOUT_S) -> str:
    south, west, north, east = bbox
    b = f"{south:.5f},{west:.5f},{north:.5f},{east:.5f}"
    return WATER_QUERY.format(timeout=timeout_s, b=b, near=round(ACCESS_NEAR_M))


def overpass(query: str) -> dict[str, Any]:
    """One request to the Overpass server OSMnx uses, with its User-Agent,
    through an address that answers (ADR-0100)."""
    import osmnx as ox

    request = urllib.request.Request(
        f"{ox.settings.overpass_url.rstrip('/')}/interpreter",
        data=urllib.parse.urlencode({"data": query}).encode(),
        headers={"User-Agent": ox.settings.http_user_agent},
    )
    with (
        reachable(ox.settings.overpass_url),
        urllib.request.urlopen(request, timeout=WATER_TIMEOUT_S + 10) as answer,
    ):
        result: dict[str, Any] = json.load(answer)
    return result


# --- Geometry from the elements ----------------------------------------------


def _xy(origin: LatLon, points: Sequence[dict[str, float]]) -> np.ndarray:
    if not points:
        return np.zeros((0, 2))
    rows = np.array([[p["lat"], p["lon"]] for p in points], dtype=float)
    return latlon_to_local_array(origin, rows)


def _closed(xy: np.ndarray) -> bool:
    return len(xy) >= 4 and bool(np.allclose(xy[0], xy[-1]))


def _lines(element: Element, origin: LatLon) -> list[LineString]:
    if element["type"] == "way":
        xy = _xy(origin, element.get("geometry", []))
        return [LineString(xy)] if len(xy) >= 2 else []
    if element["type"] == "relation":
        out = []
        for member in element.get("members", []):
            xy = _xy(origin, member.get("geometry", []))
            if len(xy) >= 2:
                out.append(LineString(xy))
        return out
    return []


def _area(element: Element, origin: LatLon) -> BaseGeometry | None:
    """The area of a closed way or of a multipolygon relation, or None."""
    if element["type"] == "way":
        xy = _xy(origin, element.get("geometry", []))
        if not _closed(xy):
            return None
        return _valid(Polygon(xy))
    if element["type"] != "relation":
        return None
    outer: list[LineString] = []
    inner: list[LineString] = []
    for member in element.get("members", []):
        xy = _xy(origin, member.get("geometry", []))
        if len(xy) >= 2:
            (inner if member.get("role") == "inner" else outer).append(LineString(xy))
    shell = _polygonize(outer)
    if shell.is_empty:
        return None
    holes = _polygonize(inner)
    area = shell.difference(holes) if not holes.is_empty else shell
    return None if area.is_empty else area


def _polygonize(lines: Sequence[LineString]) -> BaseGeometry:
    """The faces closed by `lines`, which may be pieces of rings meeting at
    their ends, as the ways of a multipolygon relation."""
    if not lines:
        return EMPTY
    noded = shapely.unary_union(lines)
    faces = shapely.polygonize(list(shapely.get_parts(noded)))
    return _valid(shapely.unary_union(list(shapely.get_parts(faces))))


def _valid(geometry: BaseGeometry) -> BaseGeometry:
    return geometry if geometry.is_valid else shapely.make_valid(geometry)


def _body(element: Element, origin: LatLon) -> BaseGeometry:
    """What an obstacle takes of the water: its area when it has one, else
    its line or point widened by LINE_HALF_WIDTH_M."""
    area = _area(element, origin)
    if area is not None:
        return area
    if element["type"] == "node":
        x, y = latlon_to_local_array(
            origin, np.array([[element["lat"], element["lon"]]])
        )[0]
        return Point(x, y).buffer(LINE_HALF_WIDTH_M)
    lines = _lines(element, origin)
    return shapely.unary_union(lines).buffer(LINE_HALF_WIDTH_M) if lines else EMPTY


def _shape(element: Element, origin: LatLon) -> BaseGeometry:
    """Where an access feature is: its area, else its lines or its point."""
    if element["type"] == "node":
        x, y = latlon_to_local_array(
            origin, np.array([[element["lat"], element["lon"]]])
        )[0]
        return Point(x, y)
    area = _area(element, origin)
    if area is not None:
        return area
    lines = _lines(element, origin)
    return MultiLineString(lines) if lines else EMPTY


def sea_in_box(coastlines: Sequence[LineString], area: Polygon) -> BaseGeometry:
    """The sea inside `area` from the coastline: the faces into which the
    coastline cuts the box, each on the land side (left of the way) or the
    sea side (right). With no coastline in the box there is no sea: open
    sea far from any shore is no place for the band either."""
    pieces = [
        part
        for line in coastlines
        for part in shapely.get_parts(line.intersection(area))
        if isinstance(part, LineString) and part.length > 0
    ]
    if not pieces:
        return EMPTY
    noded = shapely.unary_union([area.exterior, *pieces])
    faces = list(shapely.get_parts(shapely.polygonize(list(shapely.get_parts(noded)))))
    segments = _segments(coastlines)
    tree = shapely.STRtree(segments[2])
    sea = [face for face in faces if _sea_side(face, segments, tree)]
    return _valid(shapely.unary_union(sea)) if sea else EMPTY


def _segments(
    lines: Sequence[LineString],
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Every directed segment of `lines`: starts, ends, and as geometries."""
    starts, ends = [], []
    for line in lines:
        xy = np.asarray(line.coords)
        starts.append(xy[:-1])
        ends.append(xy[1:])
    a = np.concatenate(starts)
    b = np.concatenate(ends)
    keep = np.hypot(*(b - a).T) > 0
    a, b = a[keep], b[keep]
    return a, b, shapely.linestrings(np.stack([a, b], axis=1))


def _sea_side(
    face: Polygon,
    segments: tuple[np.ndarray, np.ndarray, np.ndarray],
    tree: shapely.STRtree,
) -> bool:
    """Whether `face` lies right of the coastline, on the sea: a vote of its
    longest edges that run along the coastline, each looking whether the
    face is on its left."""
    starts, ends, _ = segments
    rings = [np.asarray(r.coords) for r in [face.exterior, *face.interiors]]
    a = np.concatenate([xy[:-1] for xy in rings])
    b = np.concatenate([xy[1:] for xy in rings])
    lengths = np.hypot(*(b - a).T)
    vote = 0.0
    counted = 0
    for i in np.argsort(-lengths, kind="stable"):
        length, p, q = float(lengths[i]), a[i], b[i]
        if length <= 1e-6:
            break
        middle = (p + q) / 2.0
        near = tree.query(Point(middle), predicate="dwithin", distance=1e-3)
        if len(near) == 0:
            continue  # an edge of the box
        k = int(near[0])
        direction = ends[k] - starts[k]
        left = np.array([-direction[1], direction[0]]) / np.hypot(*direction)
        probe = middle + left * min(0.05, 0.25 * length)
        vote += length if face.contains(Point(probe)) else -length
        counted += 1
        if counted >= 8:
            break
    return vote < 0


# --- The area ---------------------------------------------------------------


@dataclass
class WaterArea:
    """The water around a start, in metres on the plane tangent at it."""

    origin: LatLon
    bbox: BBox
    box: Polygon
    # Lakes and sea, without piers, breakwaters, marinas and other water.
    navigable: BaseGeometry
    # The same, half a metre wider: a leg from the shore starts on its edge.
    wet: BaseGeometry
    # Everything in the box that is not lake or sea: land and islands.
    dry: BaseGeometry
    # The land that counts as shore for the 1 km: dry without rocks.
    shore: BaseGeometry
    obstacles: BaseGeometry
    band: BaseGeometry
    # Shore points reachable on foot, (k, 2) metres, and why each is.
    access: np.ndarray
    access_kind: tuple[str, ...]
    _prepared: bool = field(default=False, repr=False)

    def prepare(self) -> None:
        if not self._prepared:
            for geometry in (self.navigable, self.wet, self.dry, self.band):
                shapely.prepare(geometry)
            self._prepared = True

    def to_latlon(self, points: Iterable[XY]) -> list[LatLon]:
        return [local_to_latlon(self.origin, x, y) for x, y in points]


def local_box(origin: LatLon, bbox: BBox) -> Polygon:
    south, west, north, east = bbox
    corners = latlon_to_local_array(origin, np.array([[south, west], [north, east]]))
    (x0, y0), (x1, y1) = corners
    return box(x0, y0, x1, y1)


def build_area(elements: Sequence[Element], origin: LatLon, bbox: BBox) -> WaterArea:
    """The water, the land, the obstacles, the band and the shore points
    reachable on foot inside `bbox`, around `origin`."""
    area = local_box(origin, bbox)
    coastlines: list[LineString] = []
    lakes: list[BaseGeometry] = []
    blocked: list[BaseGeometry] = []
    access: dict[str, list[BaseGeometry]] = {kind: [] for kind in ACCESS_KINDS}
    reach = area.buffer(ACCESS_NEAR_M)
    for element in elements:
        tags = element.get("tags", {})
        found = roles(tags, element["type"])
        if "coastline" in found:
            coastlines.extend(_lines(element, origin))
        if "water" in found:
            polygon = _area(element, origin)
            if polygon is not None:
                if is_lake(tags) and polygon.area >= MIN_LAKE_AREA_M2:
                    lakes.append(polygon.intersection(area))
                else:
                    blocked.append(polygon.intersection(area))
        if "obstacle" in found:
            blocked.append(_body(element, origin).intersection(area))
        for kind in ACCESS_KINDS:
            if kind in found:
                where = _shape(element, origin)
                if not where.is_empty and where.intersects(reach):
                    access[kind].append(where.intersection(reach))
    sea = sea_in_box(coastlines, area)
    water = _valid(shapely.unary_union([sea, *lakes]))
    obstacles = _valid(shapely.unary_union(blocked)) if blocked else EMPTY
    navigable = _valid(water.difference(obstacles)) if blocked else water
    dry = _valid(area.difference(water))
    mainland, shore = _shores(dry, area)
    edge = max(SHORE_MARGIN_M, OBSTACLE_MARGIN_M)
    band = navigable.intersection(area.buffer(-edge))
    if not band.is_empty:
        band = band.intersection(shore.buffer(SHORE_BAND_M))
        band = band.difference(dry.buffer(SHORE_MARGIN_M))
        if not sea.is_empty and not shore.is_empty:
            band = band.difference(shore.buffer(SEA_SHORE_MARGIN_M).intersection(sea))
        if not obstacles.is_empty:
            band = band.difference(obstacles.buffer(OBSTACLE_MARGIN_M))
    points, kinds = _access_points(mainland, area, navigable, access)
    return WaterArea(
        origin=origin,
        bbox=bbox,
        box=area,
        navigable=navigable,
        wet=navigable.buffer(0.5),
        dry=dry,
        shore=shore,
        obstacles=obstacles,
        band=_valid(band),
        access=points,
        access_kind=kinds,
    )


def _shores(dry: BaseGeometry, area: Polygon) -> tuple[BaseGeometry, BaseGeometry]:
    """The mainland (dry land reaching the edge of the box) and the shore
    (the mainland and every island of at least MIN_SHORE_AREA_M2)."""
    edge = area.exterior
    mainland, shore = [], []
    for part in shapely.get_parts(dry):
        if part.distance(edge) < 0.01:
            mainland.append(part)
            shore.append(part)
        elif part.area >= MIN_SHORE_AREA_M2:
            shore.append(part)
    union = shapely.unary_union
    return (
        union(mainland) if mainland else EMPTY,
        union(shore) if shore else EMPTY,
    )


def _access_points(
    mainland: BaseGeometry,
    area: Polygon,
    navigable: BaseGeometry,
    access: dict[str, list[BaseGeometry]],
) -> tuple[np.ndarray, tuple[str, ...]]:
    """Points every ACCESS_STEP_M along the mainland's shore that touch
    open water and lie within ACCESS_NEAR_M of a way in (ACCESS_KINDS,
    in that order of preference)."""
    none = (np.zeros((0, 2)), ())
    if mainland.is_empty or navigable.is_empty:
        return none
    shoreline = mainland.boundary.difference(area.exterior.buffer(0.01))
    samples = []
    for line in shapely.get_parts(shoreline):
        if line.length <= 0:
            continue
        steps = np.arange(0.0, line.length, ACCESS_STEP_M)
        points = shapely.line_interpolate_point(line, steps)
        samples.append(shapely.get_coordinates(points))
    if not samples:
        return none
    xy = np.concatenate(samples)
    wet = navigable.buffer(1.0)
    shapely.prepare(wet)
    xy = xy[shapely.contains_xy(wet, xy[:, 0], xy[:, 1])]
    kinds = np.full(len(xy), "", dtype=object)
    points = shapely.points(xy)
    for kind in ACCESS_KINDS:
        if not access[kind] or not len(xy):
            continue
        tree = shapely.STRtree(access[kind])
        hits, _ = tree.query(points, predicate="dwithin", distance=ACCESS_NEAR_M)
        near = np.zeros(len(xy), dtype=bool)
        near[hits] = True
        kinds[near & (kinds == "")] = kind
    keep = kinds != ""
    return xy[keep], tuple(str(k) for k in kinds[keep])


# --- To look at -------------------------------------------------------------


def to_geojson(
    area: WaterArea, route: Sequence[LatLon] | None = None
) -> dict[str, Any]:
    """The band, the land, the obstacles, the shore points reachable on foot
    and a route as a GeoJSON FeatureCollection in (lon, lat), to look at."""

    def degrees(geometry: BaseGeometry) -> BaseGeometry:
        def convert(xy: np.ndarray) -> np.ndarray:
            rows = [local_to_latlon(area.origin, x, y) for x, y in xy]
            return np.array([[lon, lat] for lat, lon in rows]).reshape(-1, 2)

        return shapely.transform(geometry, convert)

    features = []
    for name, geometry in (
        ("band", area.band),
        ("dry", area.dry),
        ("obstacles", area.obstacles),
    ):
        if not geometry.is_empty:
            features.append(
                {
                    "type": "Feature",
                    "properties": {"layer": name},
                    "geometry": mapping(degrees(geometry.simplify(1.0))),
                }
            )
    if len(area.access):
        features.append(
            {
                "type": "Feature",
                "properties": {"layer": "access"},
                "geometry": mapping(degrees(shapely.multipoints(area.access))),
            }
        )
    if route is not None:
        features.append(
            {
                "type": "Feature",
                "properties": {"layer": "route"},
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[lon, lat] for lat, lon in route],
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


# --- Command line -----------------------------------------------------------


def _latlon(text: str) -> LatLon:
    lat, lon = (float(part) for part in text.split(","))
    return lat, lon


def _bbox(text: str) -> BBox:
    south, west, north, east = (float(part) for part in text.split(","))
    return south, west, north, east


def main(argv: Sequence[str] | None = None) -> int:
    """`python -m route_engine.water`: a shape on the water, for samples,
    from a water file or answers of the OSM API. A request is drawn by
    `python -m route_engine --activity paddling` (paddling.py)."""
    from route_engine.export_gpx import route_name, to_gpx
    from route_engine.shapes import FREE_ROTATION, get_shape
    from route_engine.water_fit import plan_on_water

    parser = argparse.ArgumentParser(
        prog="python -m route_engine.water",
        description="Draw a shape on the water of a lake or the sea (TASK-191).",
    )
    parser.add_argument("--shape", required=True)
    parser.add_argument("--distance", type=int, required=True, help="metres")
    parser.add_argument("--start", type=_latlon, required=True, help="LAT,LON")
    parser.add_argument("--points", type=int, default=128, help="outline vertices")
    data = parser.add_mutually_exclusive_group()
    data.add_argument("--water-file", type=Path, help="a water file (fixtures)")
    data.add_argument(
        "--osm-api",
        type=Path,
        action="append",
        help="an answer of the OSM API (map.json, relation full.json); repeat",
    )
    parser.add_argument("--bbox", type=_bbox, help="S,W,N,E the data cover")
    parser.add_argument("--save-water", type=Path, help="write the water file")
    parser.add_argument("--cache-dir", type=Path, default=Path("data/cache"))
    parser.add_argument("--out", type=Path, help="GPX to write")
    parser.add_argument("--geojson", type=Path, help="band and route to look at")
    args = parser.parse_args(argv)

    try:
        make_shape = get_shape(args.shape)
    except ValueError as exc:
        parser.error(str(exc))
    shape = make_shape(args.points)
    free = args.shape in FREE_ROTATION
    bbox: BBox | None = args.bbox
    source: WaterSource
    if args.water_file is not None:
        file_source = FileWaterSource(args.water_file)
        bbox = bbox or file_source.bbox
        source = file_source
    elif args.osm_api:
        if bbox is None:
            parser.error("--osm-api needs --bbox: the area the answers cover")
        answers = [json.loads(p.read_text(encoding="utf-8")) for p in args.osm_api]
        elements = elements_from_osm_api(answers)
        if args.save_water is not None:
            write_water(args.save_water, bbox, elements)
            print(f"Wrote {args.save_water}: {len(elements)} elements")
        source = _Fixed(elements)
    else:
        source = OverpassWaterSource(args.cache_dir)

    lat, lon = args.start
    print(f"Paddle route: {args.shape}, {args.distance} m, from {lat}, {lon}")
    began = time.perf_counter()
    try:
        route, area = plan_on_water(
            shape,
            args.distance,
            args.start,
            source,
            name=args.shape,
            free_rotation=free,
            bbox=bbox,
        )
    except ShapeNotDrawableError as exc:
        print(f"No route: {exc}", file=sys.stderr)
        return 2
    seconds = time.perf_counter() - began
    s_lat, s_lon = route.shore_start
    print(f"  distance:      {route.distance_m:.0f} m (asked {args.distance})")
    print(f"  scale:         {route.scale:.2f} of full size")
    print(f"  rotation:      {route.rotation_deg:+.0f}°")
    print(
        f"  shore start:   {s_lat:.6f}, {s_lon:.6f} ({route.shore_access}), "
        f"{route.move_m:.0f} m from the start"
    )
    print(f"  leg:           {route.approach_m:.0f} m each way")
    print(f"  nearest land:  {route.nearest_land_m:.0f} m (the shape)")
    print(f"  farthest from the shore: {route.farthest_shore_m:.0f} m")
    print(f"  cost:          {route.cost:.3f}")
    print(f"  time:          {seconds:.1f} s")
    if args.out is not None:
        when = datetime.now(UTC)
        name = route_name(args.shape, args.distance, when)
        args.out.write_text(to_gpx(route.points, name, when), encoding="utf-8")
        print(f"Wrote {args.out}")
    if args.geojson is not None:
        text = json.dumps(to_geojson(area, route.points))
        args.geojson.write_text(text, encoding="utf-8")
        print(f"Wrote {args.geojson}")
    return 0


class _Fixed:
    def __init__(self, elements: list[Element]) -> None:
        self._elements = elements

    def elements(self, bbox: BBox) -> list[Element]:
        return self._elements


if __name__ == "__main__":
    raise SystemExit(main())
