"""Snow to walk on with snowshoes (TASK-413, ADR-0342).

On snow there is no network either: as on the water (water.py, ADR-0154)
the placed shape *is* the route, as long as all of it lies on the snow one
may walk on, and it is joined to a point one reaches on foot. This module
builds that snow as a `water.WaterArea`, so `water_fit.fit_shape` places a
shape on it as it is (water.py and water_fit.py do not change: paddling and
swims stay as they are):

- the box around the start, minus what is off (the user's rules of
  2026-11-08, `tasks/TASK-413.md`, choice 3; `sports/snowshoes.md`):
  buildings (10 m round), settlements, sports pitches, gardens, quarries;
  water, wetlands and rivers (8 m); glaciers, rock, scree, cliffs (20 m);
  downhill, nordic and sled pistes and snow parks (30 m from the line,
  10 m round the area); lifts (10 m), railways and main roads (8 m);
  woods; streams (2 m); reserves and biotopes (parks, `protect_class` 2
  and 5, stay in); and every cell of 25 m steeper than 25°, with 30 m
  round every cell steeper than 30°, where avalanches start (heights.py);
- the band the shape lies in: that snow, 5 m off its edge;
- the ways in («the shore» of the water): a point every 25 m of every minor
  road, track and path on that snow.

Everything is in metres on the plane tangent at the requested start
(geo.py); coordinates in and out are (lat, lon). The data are OpenStreetMap
elements in the Overpass `out body geom` format, cached apart from the
roads and the water (`<cache>/snow/`), and the heights of heights.py
(`<cache>/heights/`). Nothing here imports from the API or the AI, and
nothing needs the network except `OverpassSnowSource` and the tiles on a
cache miss.
"""

from __future__ import annotations

import json
import logging
import math
import urllib.parse
import urllib.request
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol, runtime_checkable

import numpy as np
import shapely
from shapely.geometry.base import BaseGeometry

from route_engine.errors import ShapeNotDrawableError
from route_engine.geo import EARTH_RADIUS_M, LatLon, local_to_latlon
from route_engine.heights import Heights, SlopeGrid, slope_grid
from route_engine.water import (
    EMPTY,
    XY,
    BBox,
    Element,
    NoWaterError,
    WaterArea,
    _area,
    _lines,
    _rounded,
    _valid,
    local_box,
    overpass,
    read_water,
    write_water,
)
from route_engine.water_fit import (
    APPROACH_MAX_M,
    MIN_SCALE,
    MOVE_MAX_M,
    _branch,
    _centred,
    _outline_length,
    _reach,
)

log = logging.getLogger(__name__)

# --- The rules (TASK-413, the user's choice 3 of 2026-11-08) ----------------


@dataclass(frozen=True)
class SnowRules:
    """Where a shape may lie on the snow. The defaults are the user's
    choice (the `chosen` variant of the bench): up to 25°, 30 m off the
    slopes over 30°, no woods, no streams, no reserves."""

    max_slope_deg: float = 25.0
    # Also off: the cells within steep_margin_m of a slope over steep_deg.
    steep_deg: float = 30.0
    steep_margin_m: float = 30.0
    woods: bool = False  # woods allowed
    streams: bool = False  # streams may be crossed
    protected: bool = False  # reserves and biotopes allowed


CHOSEN = SnowRules()

# The band: the shape keeps this far inside the snow allowed.
SNOW_MARGIN_M = 5.0
# The ways in: one point every ACCESS_STEP_M of a way on the snow.
ACCESS_STEP_M = 25.0
# Around a building, a lift, a piste.
BUILDING_MARGIN_M = 10.0
LIFT_MARGIN_M = 10.0
PISTE_LINE_M = 30.0
PISTE_AREA_M = 10.0
CLIFF_LINE_M = 20.0
RIVER_M = 8.0
STREAM_M = 2.0
RAIL_M = 8.0
MAIN_ROAD_M = 8.0
# The box reaches this much past the farthest a shape may lie, so the
# margin round a steep cell just outside it is seen.
BOX_MARGIN_M = 100.0

# --- OpenStreetMap ----------------------------------------------------------

SETTLEMENTS = frozenset(
    {
        "residential",
        "industrial",
        "commercial",
        "retail",
        "farmyard",
        "construction",
        "quarry",
        "cemetery",
        "military",
        "garages",
        "allotments",
    }
)
SETTLED_LEISURE = frozenset({"golf_course", "pitch", "garden", "park"})
WATER = frozenset({"water", "wetland"})
ROCK = frozenset({"bare_rock", "scree", "shingle"})
# The pistes one does not walk on; a winter hiking or ski touring route
# (`piste:type=hike`, `skitour`) is snow one may walk on.
CLOSED_PISTES = frozenset(
    {"downhill", "nordic", "sled", "sleigh", "snow_park", "ice_skate"}
)
# A main road is no way in: one parks off it.
MAIN_ROADS = frozenset(
    {
        "motorway",
        "trunk",
        "primary",
        "secondary",
        "motorway_link",
        "trunk_link",
        "primary_link",
        "secondary_link",
    }
)
CAR_ROADS = frozenset(
    {
        "tertiary",
        "tertiary_link",
        "unclassified",
        "residential",
        "service",
        "living_street",
    }
)
TRACKS = frozenset({"track"})
PATHS = frozenset({"path", "footway", "bridleway", "steps", "pedestrian", "cycleway"})
ACCESS_KINDS = ("road", "track", "path")
# Parks (IUCN II, national parks; V, protected landscapes) stay in: there
# the rules of the park say where one walks, and the notice says so.
PARK_CLASSES = frozenset({"2", "5"})

SNOW_QUERY = (
    "[out:json][timeout:{timeout}];("
    'way["building"]({b});'
    'way["landuse"~"^(residential|industrial|commercial|retail|farmyard|'
    'construction|quarry|cemetery|military|garages|allotments)$"]({b});'
    'relation["landuse"~"^(residential|industrial|commercial|retail|quarry|'
    'military)$"]({b});'
    'way["natural"~"^(water|wetland|glacier|bare_rock|scree|shingle|cliff|wood)$"]({b});'
    'relation["natural"~"^(water|wetland|glacier|bare_rock|scree|wood)$"]({b});'
    'way["landuse"="forest"]({b});relation["landuse"="forest"]({b});'
    'way["waterway"~"^(river|stream|canal)$"]({b});'
    'way["piste:type"]({b});relation["piste:type"]({b});'
    'way["aerialway"]({b});'
    'way["railway"~"^(rail|narrow_gauge|light_rail)$"]({b});'
    'way["highway"]({b});'
    # A town's park is often a multipolygon (Parco Sempione, Milano).
    'way["leisure"~"^(golf_course|pitch|garden|park)$"]({b});'
    'relation["leisure"~"^(golf_course|pitch|garden|park)$"]({b});'
    'way["boundary"="protected_area"]["protect_class"!~"^(2|5)$"]({b});'
    'relation["boundary"="protected_area"]["protect_class"!~"^(2|5)$"]({b});'
    'way["leisure"="nature_reserve"]["protect_class"!~"^(2|5)$"]({b});'
    'relation["leisure"="nature_reserve"]["protect_class"!~"^(2|5)$"]({b});'
    ");out body geom;"
)
SNOW_TIMEOUT_S = 180

# --- A town, said before the snow is read (TASK-413 part A3) ----------------

# The town box: the square round the start where a shape may lie at all
# (MOVE_MAX_M + APPROACH_MAX_M, and BOX_MARGIN_M), the same for every shape
# and distance. The box of a request (snow_bbox) grows with the shape: for
# a 3 km heart in a valley town it reaches the mountains round it, and the
# town is no longer dense (Bolzano, the bench of A3).
TOWN_HALF_M = MOVE_MAX_M + APPROACH_MAX_M + BOX_MARGIN_M
# A town box with more buildings than this per km² is a town: no snow to
# walk on there, said before its snow is downloaded and built (16-19 s for
# Milano on the Mac, 76 s for Trento on the server the first time). Chosen
# on the bench of part A3 (sports/snowshoes.md), on the cautious side: a
# mountain village waits as before rather than hear a wrong «no». The
# densest place with snow was Asiago (180), the towns Trento (350),
# Belluno (345), Milano (700); Bolzano (207) and Aosta (247) are as dense
# as a village and go on as before.
BUILT_UP_PER_KM2 = 280.0
# The buildings are counted by Overpass with a short time (the count is
# small), or read from the snow when it is cached. A count that does not
# come is no count: the request goes on as before.
COUNT_QUERY = '[out:json][timeout:{timeout}];way["building"]({b});out count;'
COUNT_TIMEOUT_S = 5
COUNT_WAIT_S = 6.0


class NoSnowError(ShapeNotDrawableError):
    """No snow one may walk on near the start: a town, a valley of woods, a
    mountain too steep. A ShapeNotDrawableError, as NoWaterError, so every
    caller answers it already."""


class SnowFitError(ShapeNotDrawableError):
    """There is snow, but the shape does not fit on it near the start, or
    fits only much smaller: best_distance_m is the distance it fits at
    (TASK-031), None when it does not fit at all."""


class SnowNotCachedError(LookupError):
    """No cached snow covers the area, and downloading was not allowed."""


def no_snow_error() -> NoSnowError:
    """The error of a start with no open snow near it, as one text."""
    return NoSnowError(
        f"there is no open snow to walk on within {MOVE_MAX_M / 1000:g} km "
        "of here: off woods, pistes, rock, towns and slopes over "
        f"{CHOSEN.max_slope_deg:g}°"
    )


# --- Elements ---------------------------------------------------------------


def role(tags: dict[str, str]) -> str | None:
    """What an element with these tags is to the snow: why it is off
    ("buildings", "settlements", "water", "rivers", "glacier", "rock",
    "cliffs", "pistes", "lifts", "rails", "main roads", "woods", "streams",
    "protected"), a way in ("road", "track", "path"), or None."""
    highway = tags.get("highway")
    natural = tags.get("natural")
    if "building" in tags:
        return "buildings"
    if tags.get("landuse") in SETTLEMENTS or tags.get("leisure") in SETTLED_LEISURE:
        return "settlements"
    if natural in WATER:
        return "water"
    if natural == "glacier":
        return "glacier"
    if natural in ROCK:
        return "rock"
    if natural == "cliff":
        return "cliffs"
    if natural == "wood" or tags.get("landuse") == "forest":
        return "woods"
    if tags.get("waterway") in {"river", "canal"}:
        return "rivers"
    if tags.get("waterway") == "stream":
        return "streams"
    if tags.get("piste:type") in CLOSED_PISTES:
        return "pistes"
    if "aerialway" in tags:
        return "lifts"
    if "railway" in tags:
        return "rails"
    if highway in MAIN_ROADS:
        return "main roads"
    if (
        tags.get("boundary") == "protected_area"
        or tags.get("leisure") == "nature_reserve"
    ) and tags.get("protect_class") not in PARK_CLASSES:
        return "protected"
    if highway in CAR_ROADS:
        return "road"
    if highway in TRACKS:
        return "track"
    if highway in PATHS:
        return "path"
    return None


def compact(elements: Iterable[Element]) -> list[Element]:
    """The elements the snow needs, with only what it reads of them: type,
    id, the tags it reads and the geometry (to 7 decimals, about 1 cm)."""
    read = (
        "building",
        "landuse",
        "leisure",
        "natural",
        "waterway",
        "piste:type",
        "area",
        "aerialway",
        "railway",
        "highway",
        "boundary",
        "protect_class",
        "name",
    )
    kept: list[Element] = []
    for element in elements:
        tags = element.get("tags", {})
        if element.get("type") not in ("way", "relation") or role(tags) is None:
            continue
        row: Element = {
            "type": element["type"],
            "id": element.get("id"),
            "tags": {k: tags[k] for k in read if k in tags},
        }
        if element["type"] == "way":
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


# --- Sources and the cache --------------------------------------------------


class SnowSource(Protocol):
    def elements(self, bbox: BBox) -> list[Element]: ...


@runtime_checkable
class CountsBuildings(Protocol):
    """A snow source that can say how many buildings an area has before its
    snow is read: None when it cannot say (TASK-413 A3)."""

    def buildings(self, bbox: BBox) -> int | None: ...


class FileSnowSource:
    """Snow read from one file (water.read_water's format), whatever the
    area asked: fixtures and samples."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.bbox, self._elements = read_water(path)

    def elements(self, bbox: BBox) -> list[Element]:
        return self._elements

    def buildings(self, bbox: BBox) -> int | None:
        return buildings_in(self._elements, bbox)


class OverpassSnowSource:
    """Snow from Overpass, cached in `<cache_dir>/snow/` apart from the
    roads and the water: `snow_<s>_<w>_<n>_<e>.json`, in water.read_water's
    format. A file whose area contains the one asked serves it; else one
    request, one attempt (MAPS.md)."""

    def __init__(self, cache_dir: Path, download: bool = True) -> None:
        self.folder = cache_dir / "snow"
        self.download = download

    def path(self, bbox: BBox) -> Path:
        south, west, north, east = bbox
        return self.folder / f"snow_{south:.5f}_{west:.5f}_{north:.5f}_{east:.5f}.json"

    def covering_path(self, bbox: BBox) -> Path | None:
        """The smallest cached file whose area contains `bbox`."""
        south, west, north, east = bbox
        eps = 1e-5  # names are rounded to 5 decimals
        best: tuple[float, Path] | None = None
        for path in self.folder.glob("snow_*.json"):
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
            raise SnowNotCachedError(f"no cached snow covers {bbox}")
        elements = compact(overpass(snow_query(bbox)).get("elements", []))
        write_water(self.path(bbox), bbox, elements)
        return elements

    def count_path(self, bbox: BBox) -> Path:
        south, west, north, east = bbox
        return self.folder / (
            f"count_{south:.5f}_{west:.5f}_{north:.5f}_{east:.5f}.json"
        )

    def buildings(self, bbox: BBox) -> int | None:
        """The buildings of `bbox`: read from the cached snow that covers
        it, else from the cached count, else counted by Overpass and saved.
        None when Overpass does not answer in time or answers wrong, or
        downloading is not allowed: the request then goes on as before."""
        covering = self.covering_path(bbox)
        if covering is not None:
            return buildings_in(read_water(covering)[1], bbox)
        path = self.count_path(bbox)
        try:
            return int(json.loads(path.read_text())["buildings"])
        except (OSError, ValueError, KeyError, TypeError):
            pass
        if not self.download:
            return None
        try:
            count = count_buildings(count_query(bbox))
        except Exception as exc:  # any failure of the count: go on as before
            log.info("snow: no count of the buildings (%s)", type(exc).__name__)
            return None
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"bbox": list(bbox), "buildings": count}))
        return count


def snow_query(bbox: BBox, timeout_s: int = SNOW_TIMEOUT_S) -> str:
    south, west, north, east = bbox
    b = f"{south:.5f},{west:.5f},{north:.5f},{east:.5f}"
    return SNOW_QUERY.format(timeout=timeout_s, b=b)


def count_query(bbox: BBox, timeout_s: int = COUNT_TIMEOUT_S) -> str:
    south, west, north, east = bbox
    b = f"{south:.5f},{west:.5f},{north:.5f},{east:.5f}"
    return COUNT_QUERY.format(timeout=timeout_s, b=b)


def count_buildings(query: str, wait_s: float = COUNT_WAIT_S) -> int:
    """The ways an Overpass `out count` query counts. Not through
    overpass_address's lock: a download of minutes may hold it, and the
    count must be short. An address that refuses is tried after the other
    by the connection itself; any failure raises."""
    import osmnx as ox

    request = urllib.request.Request(
        f"{ox.settings.overpass_url.rstrip('/')}/interpreter",
        data=urllib.parse.urlencode({"data": query}).encode(),
        headers={"User-Agent": ox.settings.http_user_agent},
    )
    with urllib.request.urlopen(request, timeout=wait_s) as answer:
        result: dict[str, Any] = json.load(answer)
    return int(result["elements"][0]["tags"]["ways"])


def buildings_in(elements: Iterable[Element], bbox: BBox) -> int:
    """The buildings among `elements` with a point inside `bbox`, as
    Overpass counts the ways of a box."""
    south, west, north, east = bbox
    count = 0
    for element in elements:
        if element.get("type") != "way" or "building" not in element.get("tags", {}):
            continue
        if any(
            south <= p["lat"] <= north and west <= p["lon"] <= east
            for p in element.get("geometry", [])
        ):
            count += 1
    return count


def box_km2(bbox: BBox) -> float:
    """The area of `bbox` in km², on the sphere of geo.py near its middle."""
    south, west, north, east = bbox
    km_per_degree = math.radians(EARTH_RADIUS_M / 1000)
    middle = math.radians((south + north) / 2)
    return (north - south) * (east - west) * km_per_degree**2 * math.cos(middle)


def town_bbox(start: LatLon) -> BBox:
    """The town box round `start` (TOWN_HALF_M), rounded outward to 1e-4°
    as snow_bbox: the same start finds the same count."""
    south, west = local_to_latlon(start, -TOWN_HALF_M, -TOWN_HALF_M)
    north, east = local_to_latlon(start, TOWN_HALF_M, TOWN_HALF_M)
    step = 1e-4
    return (
        math.floor(south / step) * step,
        math.floor(west / step) * step,
        math.ceil(north / step) * step,
        math.ceil(east / step) * step,
    )


def built_up(buildings: int | None, bbox: BBox) -> bool:
    """True when `bbox` has more than BUILT_UP_PER_KM2 buildings per km²: a
    town. False when the count is None (not known)."""
    return buildings is not None and buildings > BUILT_UP_PER_KM2 * box_km2(bbox)


# --- The area ---------------------------------------------------------------


@dataclass(frozen=True)
class SnowArea:
    """The snow around a start: `water` is it as water_fit reads it (the
    snow allowed as `navigable`, the band, the ways in as `access`), with
    the slopes and what is off, by reason (the keys of `role`, and
    "steep"), for the checks and the bench."""

    water: WaterArea
    slopes: SlopeGrid
    off: dict[str, BaseGeometry]

    def shares(self) -> dict[str, float]:
        """How much of the box each reason takes, and how much is allowed."""
        box = self.water.box
        total = box.area
        out = {
            k: round(g.intersection(box).area / total, 3) for k, g in self.off.items()
        }
        out["allowed"] = round(self.water.navigable.area / total, 3)
        return out


def build_area(
    elements: Sequence[Element],
    heights: Heights,
    origin: LatLon,
    bbox: BBox,
    rules: SnowRules = CHOSEN,
) -> SnowArea:
    """The snow one may walk on inside `bbox`, around `origin`, by `rules`,
    the slopes from `heights`, and its ways in."""
    area = local_box(origin, bbox)
    off: dict[str, list[BaseGeometry]] = {}
    access: dict[str, list[BaseGeometry]] = {kind: [] for kind in ACCESS_KINDS}

    def add(reason: str, geometry: BaseGeometry | None) -> None:
        if geometry is not None and not geometry.is_empty:
            off.setdefault(reason, []).append(geometry.intersection(area))

    for element in elements:
        tags = element.get("tags", {})
        found = role(tags)
        if found is None:
            continue
        if found in ACCESS_KINDS:
            access[found].extend(_lines(element, origin))
            continue
        if found == "woods" and rules.woods:
            continue
        if found == "streams" and rules.streams:
            continue
        if found == "protected" and rules.protected:
            continue
        add(found, _off(found, element, origin, tags))
    union = shapely.unary_union
    reasons = {k: _valid(union(v)) for k, v in off.items()}
    slopes = slope_grid(origin, area.bounds, heights)
    steep = slopes.steeper_than(rules.max_slope_deg)
    if rules.steep_margin_m > 0:
        steeper = slopes.steeper_than(rules.steep_deg)
        if not steeper.is_empty:
            steep = union([steep, steeper.buffer(rules.steep_margin_m)])
    if not steep.is_empty:
        reasons["steep"] = _valid(steep.intersection(area))
    parts = [g for g in reasons.values() if not g.is_empty]
    blocked = _valid(union(parts)) if parts else EMPTY
    allowed = _valid(area.difference(blocked)) if parts else area
    band = _valid(allowed.buffer(-SNOW_MARGIN_M))
    wet = allowed.buffer(0.5)
    points, kinds = _access_points(wet, access)
    return SnowArea(
        water=WaterArea(
            origin=origin,
            bbox=bbox,
            box=area,
            navigable=allowed,
            wet=wet,
            dry=blocked,
            # What the shape keeps off; the edge of the box when nothing is.
            shore=blocked if parts else area.exterior.buffer(1.0),
            obstacles=EMPTY,
            band=band,
            access=points,
            access_kind=kinds,
        ),
        slopes=slopes,
        off=reasons,
    )


def _off(
    reason: str, element: Element, origin: LatLon, tags: dict[str, str]
) -> BaseGeometry | None:
    """What an element of `reason` takes of the snow."""

    def line(width: float) -> BaseGeometry | None:
        lines = _lines(element, origin)
        return shapely.unary_union(lines).buffer(width) if lines else None

    if reason == "buildings":
        polygon = _area(element, origin)
        return polygon.buffer(BUILDING_MARGIN_M) if polygon is not None else None
    if reason == "cliffs":
        return _area(element, origin) or line(CLIFF_LINE_M)
    if reason == "rivers":
        return line(RIVER_M)
    if reason == "streams":
        return line(STREAM_M)
    if reason == "pistes":
        if tags.get("area") == "yes" or element["type"] == "relation":
            polygon = _area(element, origin)
            if polygon is not None:
                return polygon.buffer(PISTE_AREA_M)
        return line(PISTE_LINE_M)
    if reason == "lifts":
        return line(LIFT_MARGIN_M)
    if reason == "rails":
        return line(RAIL_M)
    if reason == "main roads":
        return line(MAIN_ROAD_M)
    return _area(element, origin)


def _access_points(
    wet: BaseGeometry, access: dict[str, list[BaseGeometry]]
) -> tuple[np.ndarray, tuple[str, ...]]:
    """A point every ACCESS_STEP_M along each way in that lies on the snow
    allowed, roads first, then tracks, then paths."""
    shapely.prepare(wet)
    rows: list[np.ndarray] = []
    kinds: list[str] = []
    for kind in ACCESS_KINDS:
        for line in access[kind]:
            if line.length <= 0:
                continue
            steps = np.arange(0.0, line.length, ACCESS_STEP_M)
            xy = shapely.get_coordinates(shapely.line_interpolate_point(line, steps))
            xy = xy[shapely.contains_xy(wet, xy[:, 0], xy[:, 1])]
            rows.append(xy)
            kinds += [kind] * len(xy)
    if not kinds:
        return np.zeros((0, 2)), ()
    return np.concatenate(rows), tuple(kinds)


# --- From a request ---------------------------------------------------------


def snow_bbox(
    start: LatLon,
    shape: Sequence[XY],
    distance_m: float,
    pieces: Sequence[Sequence[XY]] = (),
) -> BBox:
    """The area whose snow a request needs: the shape may lie as far as
    MOVE_MAX_M + APPROACH_MAX_M from the start, as on the water
    (water_fit.water_bbox), with no shore band round it but BOX_MARGIN_M.
    Rounded outward to 1e-4° (≈ 10 m), so the same request finds the same
    file."""
    unit = _centred(shape)
    parts = _branch(shape, pieces)
    if parts is None:
        radius = float(np.hypot(*unit.T).max()) * distance_m / _outline_length(shape)
    else:
        radius = (
            _reach(unit, parts) * distance_m / (_outline_length(shape) + parts.extra)
        )
    half = MOVE_MAX_M + APPROACH_MAX_M + 2 * radius + BOX_MARGIN_M
    south, west = local_to_latlon(start, -half, -half)
    north, east = local_to_latlon(start, half, half)
    step = 1e-4
    return (
        math.floor(south / step) * step,
        math.floor(west / step) * step,
        math.ceil(north / step) * step,
        math.ceil(east / step) * step,
    )


def as_snow_error(
    error: ShapeNotDrawableError, name: str, distance_m: float
) -> ShapeNotDrawableError:
    """The error water_fit gives, said for the snow (sports/snowshoes.md:
    its texts speak of water): NoWaterError as NoSnowError, WaterFitError as
    SnowFitError, with the distance the shape fits at."""
    km = distance_m / 1000
    if isinstance(error, NoWaterError):
        return no_snow_error()
    if error.best_distance_m is not None:
        return SnowFitError(
            f"the {name} does not fit at {km:g} km on open snow here: "
            f"it fits at {error.best_distance_m / 1000:.1f} km",
            best_distance_m=error.best_distance_m,
        )
    if "reached on foot" in str(error):
        return SnowFitError(
            f"the {name} fits on the snow here, but no road, track or path "
            f"within {APPROACH_MAX_M:g} m of it"
        )
    return SnowFitError(
        f"the {name} does not fit on open snow here, even at "
        f"{MIN_SCALE * km:.1f} km"
    )
