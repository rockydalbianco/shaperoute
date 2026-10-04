"""Water from an OpenStreetMap extract instead of Overpass (TASK-225).

Overpass refuses the server's address, and often the development Mac's:
the water query (route_engine.water.WATER_QUERY) has never had an answer
(ADR-0154). As the zones of TASK-137 (zone_extract.py), the water comes
from an extract instead. osmium keeps the tags the query asks for and cuts
a box with whole multipolygons; here the elements Overpass would answer to
the query for that box are picked from it and written as a water file of
the cache. A cached file whose box contains a request's serves it
(water.OverpassWaterSource.covering_path), and build_area cuts what it
reads to the request's box: one large box per place covers every start
inside it, as if each had been downloaded.

    python -m shaperoute_api.water_extract --osm cut.osm --bbox S,W,N,E \
        --cache-dir data/cache

`--extract water.osm.pbf` cuts the box itself with osmium (MAPS.md,
«L'acqua da un estratto»). Nothing here needs the network.
"""

from __future__ import annotations

import argparse
import math
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import shapely
from route_engine.geo import latlon_to_local_array
from route_engine.water import (
    ACCESS_NEAR_M,
    BBox,
    Element,
    OverpassWaterSource,
    compact,
    write_water,
)
from shapely.geometry import box

Tags = dict[str, str]
Member = tuple[str, int, str]  # type, ref, role

# The cut is this much larger than the box: a way that crosses the box's
# edge without a node inside it, and a member of a lake near the edge,
# are in the cut whole (osmium's "smart" strategy completes the rest).
MARGIN_M = 500.0

# The water query, element type by element type: what it asks for inside
# the box besides the ways around the water (`way["highway"](around.s)`).
# `.w` of the query: the water itself, whose ways and members' ways are
# what the highways must be near.
_WATER = {
    "way": {"natural": {"coastline", "water"}},
    "relation": {"natural": {"water"}},
}
_OTHER = {
    "node": {"leisure": {"slipway"}},
    "way": {
        "man_made": {"pier", "breakwater", "groyne"},
        "natural": {"beach", "reef"},
        "leisure": {"marina", "slipway", "beach_resort"},
        "landuse": {"harbour"},
    },
    "relation": {
        "man_made": {"pier", "breakwater", "groyne"},
        "natural": {"beach", "reef"},
        "leisure": {"marina", "beach_resort"},
        "landuse": {"harbour"},
    },
}


def _asked(table: dict[str, dict[str, set[str]]], kind: str, tags: Tags) -> bool:
    return any(tags.get(key) in values for key, values in table.get(kind, {}).items())


@dataclass
class OsmData:
    """Nodes (lat, lon, tags), ways (node ids, tags) and relations (members,
    tags) of an OSM XML file."""

    nodes: dict[int, tuple[float, float, Tags]] = field(default_factory=dict)
    ways: dict[int, tuple[list[int], Tags]] = field(default_factory=dict)
    relations: dict[int, tuple[list[Member], Tags]] = field(default_factory=dict)


def read_osm_xml(path: Path) -> OsmData:
    data = OsmData()
    for _, element in ET.iterparse(path, events=("end",)):
        if element.tag not in ("node", "way", "relation"):
            continue
        ident = int(element.get("id", "0"))
        tags = {t.get("k", ""): t.get("v", "") for t in element.iter("tag")}
        if element.tag == "node":
            lat, lon = float(element.get("lat", "nan")), float(
                element.get("lon", "nan")
            )
            data.nodes[ident] = (lat, lon, tags)
        elif element.tag == "way":
            refs = [int(nd.get("ref", "0")) for nd in element.iter("nd")]
            data.ways[ident] = (refs, tags)
        else:
            members = [
                (m.get("type", ""), int(m.get("ref", "0")), m.get("role", ""))
                for m in element.iter("member")
            ]
            data.relations[ident] = (members, tags)
        element.clear()
    return data


def water_answer(data: OsmData, bbox: BBox) -> list[Element]:
    """What Overpass answers to water.water_query(bbox) with `out tags geom`,
    from `data`: nodes, ways and relations, each in order of id.

    In the box, as Overpass: a node inside it; a way with a node inside it
    or a segment crossing it; a relation with such a member. Around the
    water: a highway with a segment within ACCESS_NEAR_M of a way of `.w`
    or of a member way of its relations, measured in metres on the plane
    tangent at the box's centre. Ways and members missing from `data` are
    left out: the cut must hold the box whole (MARGIN_M).
    """
    south, west, north, east = bbox
    area = box(west, south, east, north)

    def point(ref: int) -> tuple[float, float] | None:
        node = data.nodes.get(ref)
        return None if node is None else (node[0], node[1])

    def coords(refs: Sequence[int]) -> list[tuple[float, float]]:
        return [p for p in (point(r) for r in refs) if p is not None]

    def in_box(refs: Sequence[int]) -> bool:
        rows = coords(refs)
        if not rows:
            return False
        if len(rows) == 1:
            return bool(area.covers(shapely.Point(rows[0][1], rows[0][0])))
        line = shapely.LineString([(lon, lat) for lat, lon in rows])
        return bool(area.intersects(line))

    def node_in_box(ref: int) -> bool:
        p = point(ref)
        return p is not None and south <= p[0] <= north and west <= p[1] <= east

    def relation_in_box(members: Sequence[Member]) -> bool:
        return any(
            (kind == "node" and node_in_box(ref))
            or (kind == "way" and ref in data.ways and in_box(data.ways[ref][0]))
            for kind, ref, _ in members
        )

    nodes = sorted(
        i
        for i, (_, _, tags) in data.nodes.items()
        if _asked(_OTHER, "node", tags) and node_in_box(i)
    )
    water_ways = {
        i
        for i, (refs, tags) in data.ways.items()
        if _asked(_WATER, "way", tags) and in_box(refs)
    }
    water_relations = {
        i
        for i, (members, tags) in data.relations.items()
        if _asked(_WATER, "relation", tags) and relation_in_box(members)
    }
    ways = water_ways | {
        i
        for i, (refs, tags) in data.ways.items()
        if _asked(_OTHER, "way", tags) and in_box(refs)
    }
    relations = water_relations | {
        i
        for i, (members, tags) in data.relations.items()
        if _asked(_OTHER, "relation", tags) and relation_in_box(members)
    }
    near = water_ways | {
        ref
        for i in water_relations
        for kind, ref, _ in data.relations[i][0]
        if kind == "way" and ref in data.ways
    }
    ways |= _highways_near(data, near, bbox, in_box)

    def geometry(refs: Sequence[int]) -> list[dict[str, float]]:
        return [{"lat": lat, "lon": lon} for lat, lon in coords(refs)]

    out: list[Element] = []
    for i in nodes:
        lat, lon, tags = data.nodes[i]
        out.append({"type": "node", "id": i, "lat": lat, "lon": lon, "tags": tags})
    for i in sorted(ways):
        refs, tags = data.ways[i]
        out.append({"type": "way", "id": i, "tags": tags, "geometry": geometry(refs)})
    for i in sorted(relations):
        members, tags = data.relations[i]
        rows: list[dict[str, Any]] = []
        for kind, ref, role in members:
            if kind == "way" and ref in data.ways:
                rows.append(
                    {
                        "type": kind,
                        "ref": ref,
                        "role": role,
                        "geometry": geometry(data.ways[ref][0]),
                    }
                )
        out.append({"type": "relation", "id": i, "tags": tags, "members": rows})
    return out


def _highways_near(
    data: OsmData,
    near: set[int],
    bbox: BBox,
    in_box: Callable[[Sequence[int]], bool],
) -> set[int]:
    """The highways in the box within ACCESS_NEAR_M of a way in `near`."""
    south, west, north, east = bbox
    origin = ((south + north) / 2.0, (west + east) / 2.0)

    def line(refs: Sequence[int]) -> shapely.LineString | shapely.Point | None:
        rows = [data.nodes[r][:2] for r in refs if r in data.nodes]
        if not rows:
            return None
        xy = latlon_to_local_array(origin, np.array(rows, dtype=float))
        return shapely.Point(xy[0]) if len(xy) == 1 else shapely.LineString(xy)

    water = [g for g in (line(data.ways[i][0]) for i in sorted(near)) if g is not None]
    if not water:
        return set()
    lines = [
        (i, line(refs))
        for i, (refs, tags) in data.ways.items()
        if "highway" in tags and in_box(refs)
    ]
    kept = [(i, g) for i, g in lines if g is not None]
    if not kept:
        return set()
    tree = shapely.STRtree(water)
    hits, _ = tree.query(
        [g for _, g in kept], predicate="dwithin", distance=ACCESS_NEAR_M
    )
    return {kept[int(k)][0] for k in hits}


def water_elements(data: OsmData, bbox: BBox) -> list[Element]:
    """The elements of a water file for `bbox`, as a download would save
    them (water.OverpassWaterSource): the answer, compacted."""
    return compact(water_answer(data, bbox))


def grown(bbox: BBox, margin_m: float = MARGIN_M) -> BBox:
    south, west, north, east = bbox
    dlat = margin_m / 111_320
    dlon = margin_m / (111_320 * math.cos(math.radians((south + north) / 2)))
    return (south - dlat, west - dlon, north + dlat, east + dlon)


def osmium_extract_args(pbf: Path, bbox: BBox, out: Path) -> list[str]:
    """The cut of `bbox` and MARGIN_M around it, with whole multipolygons
    (a lake crossing the edge comes with all its ways, as from Overpass)."""
    south, west, north, east = grown(bbox)
    return [
        "osmium",
        "extract",
        "--strategy",
        "smart",
        "--bbox",
        f"{west},{south},{east},{north}",
        "--overwrite",
        "--output",
        str(out),
        str(pbf),
    ]


Run = Callable[[list[str]], None]


def _run(args: list[str]) -> None:
    subprocess.run(args, check=True, capture_output=True)


def write_from(data: OsmData, bbox: BBox, cache_dir: Path) -> tuple[Path, int]:
    """The water file of `bbox` in `<cache_dir>/water/`, named as a download
    of that box; returns it and how many elements it holds."""
    elements = water_elements(data, bbox)
    path = OverpassWaterSource(cache_dir).path(bbox)
    write_water(path, bbox, elements)
    return path, len(elements)


def _bbox(text: str) -> BBox:
    south, west, north, east = (float(part) for part in text.split(","))
    return south, west, north, east


def main(argv: Sequence[str] | None = None, run: Run = _run) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m shaperoute_api.water_extract",
        description="The water of a box from an OpenStreetMap extract (TASK-225).",
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--osm", type=Path, help="an OSM XML file holding the box")
    source.add_argument(
        "--extract", type=Path, help="an extract filtered to the water's tags"
    )
    parser.add_argument("--bbox", type=_bbox, required=True, help="S,W,N,E")
    parser.add_argument("--cache-dir", type=Path, default=Path("data/cache"))
    args = parser.parse_args(argv)

    if args.osm is not None:
        data = read_osm_xml(args.osm)
    else:
        with tempfile.TemporaryDirectory(prefix="water-") as folder:
            cut = Path(folder) / "water.osm"
            run(osmium_extract_args(args.extract, args.bbox, cut))
            data = read_osm_xml(cut)
    try:
        path, count = write_from(data, args.bbox, args.cache_dir)
    except OSError as exc:
        print(f"Could not write the water: {exc}", file=sys.stderr)
        return 1
    size = path.stat().st_size / 1e6
    print(f"Wrote {path}: {count} elements, {size:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
