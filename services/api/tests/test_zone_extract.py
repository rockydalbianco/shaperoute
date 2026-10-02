"""Zones from an OpenStreetMap extract (TASK-137, ADR-0119): the Overpass
filter read the same way, and OSMnx and the engine fed from a small extract
instead of Overpass. No network, no osmium: the extract is written here."""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest
from route_engine.network import FOOT_FILTER, OsmnxSource, read_named_roads

from shaperoute_api.zone_extract import (
    grown,
    names_answer,
    network_answer,
    osmium_extract_args,
    read_osm_xml,
    served_from,
    tag_filter,
    zone_from_extract,
)

FOOT = tag_filter(FOOT_FILTER)
BOX = (45.0, 8.0, 45.004, 8.006)  # south, west, north, east: ~450 x 470 m


def test_the_foot_filter_reads_as_overpass_does() -> None:
    assert FOOT({"highway": "footway"})
    assert FOOT({"highway": "residential", "sidewalk": "both"})
    assert not FOOT({"highway": "motorway"})
    assert not FOOT({"highway": "motorway_link"})
    assert not FOOT({"highway": "service", "service": "private"})
    assert not FOOT({"highway": "primary", "sidewalk": "separate"})
    assert not FOOT({"highway": "primary", "sidewalk:left": "separate"})
    assert not FOOT({"highway": "path", "foot": "no"})
    assert not FOOT({"highway": "pedestrian", "area": "yes"})
    assert not FOOT({"highway": "track", "access": "private"})
    assert not FOOT({"building": "yes"})


def test_other_filters_are_refused_not_guessed() -> None:
    with pytest.raises(ValueError):
        tag_filter('["highway"](if: t["width"] > 2)')
    with pytest.raises(ValueError):
        tag_filter("")
    assert tag_filter('["a"="b"]["c"!="d"]')({"a": "b"})
    assert not tag_filter('["a"="b"]["c"!="d"]')({"a": "b", "c": "d"})


def grid_xml() -> str:
    """Nine nodes 200 m apart, the paths between them; a motorway the foot
    graph leaves out; a named road whose sidewalks are drawn apart."""
    nodes = []
    ids: dict[tuple[int, int], int] = {}
    for row in range(3):
        for col in range(3):
            node = 100 + 3 * row + col
            ids[(row, col)] = node
            lat, lon = 45.0 + 0.0018 * row + 0.0002, 8.0 + 0.0025 * col + 0.0005
            nodes.append(f'<node id="{node}" lat="{lat:.7f}" lon="{lon:.7f}"/>')
    ways = []
    way = 10
    for row in range(3):
        refs = "".join(f'<nd ref="{ids[(row, c)]}"/>' for c in range(3))
        ways.append(f'<way id="{way}">{refs}<tag k="highway" v="footway"/></way>')
        way += 1
    for col in range(3):
        refs = "".join(f'<nd ref="{ids[(r, col)]}"/>' for r in range(3))
        ways.append(f'<way id="{way}">{refs}<tag k="highway" v="residential"/></way>')
        way += 1
    motorway = '<tag k="highway" v="motorway"/>'
    ways.append(f'<way id="90"><nd ref="100"/><nd ref="108"/>{motorway}</way>')
    ways.append(
        '<way id="91"><nd ref="102"/><nd ref="106"/><tag k="highway" v="primary"/>'
        '<tag k="name" v="Via Roma"/><tag k="sidewalk" v="separate"/></way>'
    )
    body = "".join(nodes + ways)
    return f'<?xml version="1.0"?><osm version="0.6">{body}</osm>'


@pytest.fixture
def grid(tmp_path: Path) -> Path:
    path = tmp_path / "grid.osm"
    path.write_text(grid_xml())
    return path


def test_the_answers_overpass_would_give(grid: Path) -> None:
    extract = read_osm_xml(grid)
    assert len(extract.nodes) == 9 and len(extract.ways) == 8
    network = network_answer(extract, FOOT)
    ways = [e for e in network["elements"] if e["type"] == "way"]
    nodes = [e for e in network["elements"] if e["type"] == "node"]
    assert [w["id"] for w in ways] == [10, 11, 12, 13, 14, 15]  # no 90, no 91
    assert [n["id"] for n in nodes] == sorted(n["id"] for n in nodes)
    assert network["elements"][0]["type"] == "node"  # nodes first, as `out;`

    names = names_answer(extract, BOX)["elements"]
    assert [(w["id"], w["tags"]["name"]) for w in names] == [(91, "Via Roma")]
    assert len(names[0]["geometry"]) == 2
    assert names_answer(extract, (46.0, 9.0, 46.1, 9.1))["elements"] == []


def test_osmnx_and_the_engine_build_the_zone_from_the_extract(
    grid: Path, tmp_path: Path
) -> None:
    source = OsmnxSource(tmp_path / "cache")
    with served_from(read_osm_xml(grid)):
        graph = source.load(BOX)
        roads = source.named_roads(BOX, download=True)
    # Simplified as OSMnx does: the four corners join two ways and are only
    # bends; the four sides' middles and the centre stay. No motorway.
    assert graph.number_of_nodes() == 5
    kinds = set()
    for _, _, data in graph.edges(data=True):
        value = data.get("highway")
        kinds |= set(value) if isinstance(value, list) else {value}
    assert kinds == {"footway", "residential"}
    # Two-way, as network_type="walk" makes them.
    assert all(graph.has_edge(v, u) for u, v in graph.edges())
    assert source.cache_path(BOX).exists()
    assert [r.name for r in roads] == ["Via Roma"]
    names_file = next((tmp_path / "cache").glob("names_*.json"))
    assert [r.name for r in read_named_roads(names_file)] == ["Via Roma"]


def test_outside_the_block_nothing_is_served(grid: Path) -> None:
    import osmnx._overpass as osmnx_overpass
    import route_engine.network as network

    before = (osmnx_overpass._download_overpass_network, network._overpass)
    with served_from(read_osm_xml(grid)):
        assert network._overpass is not before[1]
    assert (osmnx_overpass._download_overpass_network, network._overpass) == before


def test_osmium_cuts_the_box_with_a_margin(grid: Path, tmp_path: Path) -> None:
    asked: list[list[str]] = []

    def run(args: list[str]) -> None:
        asked.append(args)
        shutil.copy(grid, args[args.index("--output") + 1])

    source = OsmnxSource(tmp_path / "cache")
    with zone_from_extract(Path("/data/italy.pbf"), BOX, run=run):
        graph = source.load(BOX)
    assert graph.number_of_nodes() == 5
    (args,) = asked
    assert args[:4] == ["osmium", "extract", "--strategy", "complete_ways"]
    west, south, east, north = (
        float(x) for x in args[args.index("--bbox") + 1].split(",")
    )
    s, w, n, e = grown(BOX)
    assert (south, west, north, east) == pytest.approx((s, w, n, e))
    assert s < BOX[0] and n > BOX[2]
    assert args[-1] == "/data/italy.pbf"
    assert osmium_extract_args(Path("x.pbf"), BOX, Path("o.osm"))[-1] == "x.pbf"
