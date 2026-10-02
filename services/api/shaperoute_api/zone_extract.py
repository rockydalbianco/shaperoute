"""Zones from an OpenStreetMap extract instead of Overpass (TASK-137, ADR-0119).

Overpass refuses an address after a few large downloads, also the server's.
For many cities at once the zones come from an extract (Geofabrik's Italy,
filtered to its roads once with `osmium tags-filter ... w/highway`): for
each zone, `osmium extract` cuts the box OSMnx would ask for, and for the
length of the download OSMnx and the engine read the answers Overpass would
give from it. Everything after the answer is OSMnx's and the engine's own,
as for a download: the cut at the border, the simplification, every
connected piece kept (ADR-0148), the files in the cache, the street names.
"""

from __future__ import annotations

import math
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from collections.abc import Callable, Iterator, Mapping
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

BBox = tuple[float, float, float, float]
Tags = Mapping[str, str]

# OSMnx downloads its graph 500 m around the box asked (graph_from_polygon);
# a little more, so the cut is OSMnx's, not osmium's.
MARGIN_M = 700.0
# One Overpass tag condition: ["k"], ["k"="v"], ["k"!="v"], ["k"~"re"], ["k"!~"re"].
_CONDITION = re.compile(r'\["([^"]+)"(?:(=|!=|~|!~)"([^"]*)")?\]')
# The named roads the foot graph leaves out (network.NAMED_ROADS_QUERY): a
# sidewalk drawn apart, under any of the four keys.
_SIDEWALK_KEY = re.compile(r"^sidewalk(:both|:left|:right)?$")
_NAMES_BOX = re.compile(
    r"\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)\);out tags geom"
)


def tag_filter(overpass: str) -> Callable[[Tags], bool]:
    """The tags an Overpass filter such as network.FOOT_FILTER keeps.
    Anything but the plain conditions above is refused, not guessed."""
    conditions: list[Callable[[Tags], bool]] = []
    position = 0
    for match in _CONDITION.finditer(overpass):
        if match.start() != position:
            break
        position = match.end()
        key, op, value = match.groups()
        conditions.append(_condition(key, op, value))
    if position != len(overpass) or not conditions:
        raise ValueError(f"not a filter this module reads: {overpass!r}")
    return lambda tags: all(condition(tags) for condition in conditions)


def _condition(key: str, op: str | None, value: str | None) -> Callable[[Tags], bool]:
    if op is None:
        return lambda tags: key in tags
    assert value is not None
    if op == "=":
        return lambda tags: tags.get(key) == value
    if op == "!=":
        return lambda tags: tags.get(key) != value
    pattern = re.compile(value)
    if op == "~":
        return lambda tags: key in tags and pattern.search(tags[key]) is not None
    return lambda tags: key not in tags or pattern.search(tags[key]) is None


def separate_sidewalk(tags: Tags) -> bool:
    return any(
        _SIDEWALK_KEY.match(key) and "separate" in value for key, value in tags.items()
    )


@dataclass
class Extract:
    """Nodes (lat, lon, tags) and ways (node ids, tags) of an OSM XML file."""

    nodes: dict[int, tuple[float, float, dict[str, str]]] = field(default_factory=dict)
    ways: dict[int, tuple[list[int], dict[str, str]]] = field(default_factory=dict)


def read_osm_xml(path: Path) -> Extract:
    extract = Extract()
    for _, element in ET.iterparse(path, events=("end",)):
        if element.tag == "node":
            tags = {t.get("k", ""): t.get("v", "") for t in element.iter("tag")}
            extract.nodes[int(element.get("id", "0"))] = (
                float(element.get("lat", "nan")),
                float(element.get("lon", "nan")),
                tags,
            )
            element.clear()
        elif element.tag == "way":
            refs = [int(nd.get("ref", "0")) for nd in element.iter("nd")]
            tags = {t.get("k", ""): t.get("v", "") for t in element.iter("tag")}
            extract.ways[int(element.get("id", "0"))] = (refs, tags)
            element.clear()
    return extract


def network_answer(extract: Extract, keep: Callable[[Tags], bool]) -> dict[str, Any]:
    """What Overpass answers to OSMnx's query: the ways the filter keeps and
    all their nodes, each type in order of id, as `out;` gives them."""
    ways = sorted(
        (i, refs, tags)
        for i, (refs, tags) in extract.ways.items()
        if keep(tags) and all(r in extract.nodes for r in refs)
    )
    used = sorted({r for _, refs, _ in ways for r in refs})
    elements: list[dict[str, Any]] = [
        {
            "type": "node",
            "id": n,
            "lat": extract.nodes[n][0],
            "lon": extract.nodes[n][1],
        }
        | ({"tags": extract.nodes[n][2]} if extract.nodes[n][2] else {})
        for n in used
    ]
    elements += [
        {"type": "way", "id": i, "nodes": refs} | ({"tags": tags} if tags else {})
        for i, refs, tags in ways
    ]
    return {
        "version": 0.6,
        "generator": "shaperoute zone_extract",
        "elements": elements,
    }


def names_answer(extract: Extract, bbox: BBox) -> dict[str, Any]:
    """What Overpass answers to network.NAMED_ROADS_QUERY for `bbox`."""
    south, west, north, east = bbox

    def inside(node: int) -> bool:
        lat, lon, _ = extract.nodes[node]
        return south <= lat <= north and west <= lon <= east

    elements = []
    for i in sorted(extract.ways):
        refs, tags = extract.ways[i]
        if not ("highway" in tags and "name" in tags and separate_sidewalk(tags)):
            continue
        if not all(r in extract.nodes for r in refs) or not any(
            inside(r) for r in refs
        ):
            continue
        geometry = [
            {"lat": extract.nodes[r][0], "lon": extract.nodes[r][1]} for r in refs
        ]
        elements.append({"type": "way", "id": i, "tags": tags, "geometry": geometry})
    return {
        "version": 0.6,
        "generator": "shaperoute zone_extract",
        "elements": elements,
    }


@contextmanager
def served_from(extract: Extract) -> Iterator[None]:
    """For the block, OSMnx's network download and the engine's names query
    are answered from `extract`; no request leaves the machine."""
    import osmnx._overpass as osmnx_overpass
    import route_engine.network as network

    def download(polygon: Any, network_type: str, custom_filter: Any) -> Iterator[Any]:
        filters = [custom_filter] if isinstance(custom_filter, str) else custom_filter
        if not filters:
            raise ValueError("a zone from an extract needs the engine's filter")
        keeps = [tag_filter(f) for f in filters]
        yield network_answer(extract, lambda tags: any(k(tags) for k in keeps))

    def names(query: str) -> dict[str, Any]:
        match = _NAMES_BOX.search(query)
        if match is None or "sidewalk" not in query:
            raise ValueError("only the named roads query is answered from an extract")
        south, west, north, east = (float(g) for g in match.groups())
        return names_answer(extract, (south, west, north, east))

    @contextmanager
    def no_address(url: str) -> Iterator[None]:
        yield None

    saved = (
        osmnx_overpass._download_overpass_network,
        network._overpass,
        network.reachable,
    )
    osmnx_overpass._download_overpass_network = download  # type: ignore[assignment]
    network._overpass = names  # type: ignore[assignment]
    network.reachable = no_address  # type: ignore[assignment]
    try:
        yield
    finally:
        (
            osmnx_overpass._download_overpass_network,
            network._overpass,
            network.reachable,
        ) = saved


def grown(bbox: BBox, margin_m: float = MARGIN_M) -> BBox:
    south, west, north, east = bbox
    dlat = margin_m / 111_320
    dlon = margin_m / (111_320 * math.cos(math.radians((south + north) / 2)))
    return (south - dlat, west - dlon, north + dlat, east + dlon)


def osmium_extract_args(pbf: Path, bbox: BBox, out: Path) -> list[str]:
    south, west, north, east = bbox
    return [
        "osmium",
        "extract",
        "--strategy",
        "complete_ways",
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


@contextmanager
def zone_from_extract(pbf: Path, bbox: BBox, run: Run = _run) -> Iterator[None]:
    """`bbox`'s data cut from `pbf`, served as Overpass would for the block."""
    with tempfile.TemporaryDirectory(prefix="zone-") as folder:
        out = Path(folder) / "zone.osm"
        run(osmium_extract_args(pbf, grown(bbox), out))
        extract = read_osm_xml(out)
        with served_from(extract):
            yield
