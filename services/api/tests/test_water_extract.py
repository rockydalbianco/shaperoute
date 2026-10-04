"""Water from an OpenStreetMap extract (TASK-225): the elements Overpass
would answer to the water query for a box, picked from an OSM XML cut, and
a file of a large box serving the requests inside it as a download of
their own box would.

No network, no osmium: the engine's hand-built water fixtures
(make_water_fixtures.py) are written here as OSM XML, with node ids, the
way an extract holds them.
"""

from __future__ import annotations

import json
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import pytest
from route_engine import water_fit
from route_engine.geo import local_to_latlon
from route_engine.shapes import get_shape
from route_engine.water import (
    BBox,
    Element,
    OverpassWaterSource,
    WaterNotCachedError,
    compact,
    read_water,
)

from shaperoute_api.water_extract import (
    MARGIN_M,
    grown,
    main,
    osmium_extract_args,
    read_osm_xml,
    water_answer,
    water_elements,
)

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "services/route-engine/tests/fixtures"
COAST_ORIGIN = (44.0, 12.65)
LAKE_ORIGIN = (45.0, 10.0)
ORDER = {"node": 0, "way": 1, "relation": 2}


def fixture(name: str) -> tuple[BBox, list[Element]]:
    data = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    south, west, north, east = data["bbox"]
    return (south, west, north, east), data["elements"]


def in_order(elements: list[Element]) -> list[Element]:
    """As Overpass answers: nodes, ways, relations, each by id."""
    return sorted(elements, key=lambda e: (ORDER[e["type"]], e["id"]))


def geometry(origin: tuple[float, float], xy: list[tuple[float, float]]) -> list[Any]:
    rows = (local_to_latlon(origin, x, y) for x, y in xy)
    return [{"lat": round(lat, 7), "lon": round(lon, 7)} for lat, lon in rows]


def way(
    origin: tuple[float, float],
    ident: int,
    tags: dict[str, str],
    xy: list[tuple[float, float]],
) -> Element:
    return {"type": "way", "id": ident, "tags": tags, "geometry": geometry(origin, xy)}


def write_osm(elements: list[Element], path: Path) -> Path:
    """`elements` in the Overpass `out geom` format as an OSM XML file: a
    node for every point (the same point, the same node), the ways by their
    nodes, the relations by their members, member ways without tags."""
    root = ET.Element("osm", version="0.6")
    ids: dict[tuple[float, float], int] = {}
    nodes: list[ET.Element] = []

    def node(point: dict[str, float], ident: int | None = None) -> int:
        key = (point["lat"], point["lon"])
        if ident is None and key in ids:
            return ids[key]
        ident = ident if ident is not None else 1_000_000 + len(ids)
        ids.setdefault(key, ident)
        nodes.append(
            ET.Element("node", id=str(ident), lat=repr(key[0]), lon=repr(key[1]))
        )
        return ident

    def tagged(parent: ET.Element, tags: dict[str, str]) -> None:
        for k, v in tags.items():
            ET.SubElement(parent, "tag", k=k, v=v)

    ways: list[ET.Element] = []
    relations: list[ET.Element] = []
    member_ways: dict[int, list[dict[str, float]]] = {}
    for element in elements:
        kind = element["type"]
        if kind == "node":
            node(element, element["id"])
            tagged(nodes[-1], element.get("tags", {}))
        elif kind == "way":
            xml = ET.Element("way", id=str(element["id"]))
            for point in element["geometry"]:
                ET.SubElement(xml, "nd", ref=str(node(point)))
            tagged(xml, element.get("tags", {}))
            ways.append(xml)
        else:
            xml = ET.Element("relation", id=str(element["id"]))
            for member in element["members"]:
                member_ways[member["ref"]] = member["geometry"]
                ET.SubElement(
                    xml,
                    "member",
                    type="way",
                    ref=str(member["ref"]),
                    role=member["role"],
                )
            tagged(xml, element.get("tags", {}))
            relations.append(xml)
    for ref, points in member_ways.items():
        xml = ET.Element("way", id=str(ref))
        for point in points:
            ET.SubElement(xml, "nd", ref=str(node(point)))
        ways.append(xml)
    root.extend([*nodes, *ways, *relations])
    ET.ElementTree(root).write(path, encoding="utf-8", xml_declaration=True)
    return path


def ids(elements: list[Element]) -> set[tuple[str, int]]:
    return {(e["type"], e["id"]) for e in elements}


# --- What a download would save ---------------------------------------------


@pytest.mark.parametrize("name", ["water_coast.json", "water_lake.json"])
def test_a_fixture_comes_back_as_a_download_would_save_it(
    name: str, tmp_path: Path
) -> None:
    bbox, elements = fixture(name)
    data = read_osm_xml(write_osm(elements, tmp_path / "cut.osm"))
    assert water_elements(data, bbox) == in_order(compact(elements))


def test_the_box_keeps_what_crosses_it_and_leaves_what_is_outside(
    tmp_path: Path,
) -> None:
    bbox, elements = fixture("water_coast.json")
    o = COAST_ORIGIN
    extra = [
        # A beach and a footway by the sea, east of the box (it ends at 3000).
        way(
            o,
            20,
            {"natural": "beach"},
            [(6000, 20), (6400, 20), (6400, 60), (6000, 20)],
        ),
        way(o, 21, {"highway": "footway"}, [(5000, 50.0), (5500, 50.0)]),
        # A breakwater crossing the box's corner with no node inside it.
        way(o, 22, {"man_made": "breakwater"}, [(-3400, -2000), (-2600, -2900)]),
        # A slipway outside the box.
        {
            "type": "node",
            "id": 24,
            "tags": {"leisure": "slipway"},
            **geometry(o, [(-2500.0, 1500.0)])[0],
        },
        # A footway 60 m from any water, inside the box.
        way(o, 25, {"highway": "footway"}, [(2600, 75.0), (2900, 77.0)]),
    ]
    data = read_osm_xml(write_osm([*elements, *extra], tmp_path / "cut.osm"))
    found = ids(water_answer(data, bbox))
    assert ("way", 22) in found
    assert not found & {("way", 20), ("way", 21), ("node", 24), ("way", 25)}
    assert found - {("way", 22)} == ids(elements)


def test_a_highway_by_a_lake_is_found_by_the_relation_s_untagged_ways(
    tmp_path: Path,
) -> None:
    bbox, elements = fixture("water_lake.json")
    road = ("way", 2)  # the lakeside road, 15 m from the lake's member ways
    data = read_osm_xml(write_osm(elements, tmp_path / "cut.osm"))
    assert road in ids(water_answer(data, bbox))
    without_lake = [e for e in elements if e["type"] != "relation"]
    data = read_osm_xml(write_osm(without_lake, tmp_path / "no-lake.osm"))
    assert road not in ids(water_answer(data, bbox))


def test_a_member_missing_from_the_cut_is_left_out(tmp_path: Path) -> None:
    bbox, elements = fixture("water_lake.json")
    path = write_osm(elements, tmp_path / "cut.osm")
    tree = ET.parse(path)
    root = tree.getroot()
    for xml in root.findall("way"):
        if xml.get("id") == "103":  # the island, the inner way
            root.remove(xml)
    tree.write(path)
    lake = next(
        e for e in water_answer(read_osm_xml(path), bbox) if e["type"] == "relation"
    )
    assert [m["ref"] for m in lake["members"]] == [101, 102]


# --- A large box serves the requests inside it ------------------------------


def write_box(data_path: Path, bbox: BBox, cache: Path) -> Path:
    south, west, north, east = bbox
    code = main(
        ["--osm", str(data_path), "--bbox", f"{south},{west},{north},{east}"]
        + ["--cache-dir", str(cache)]
    )
    assert code == 0
    return OverpassWaterSource(cache).path(bbox)


def large_coast_box() -> BBox:
    """The coast fixture's coastline runs from x = -9000 to 9000."""
    south, west = local_to_latlon(COAST_ORIGIN, -8500.0, -6000.0)
    north, east = local_to_latlon(COAST_ORIGIN, 8500.0, 6000.0)
    return south, west, north, east


def test_a_request_inside_a_large_file_is_drawn_as_from_its_own_download(
    tmp_path: Path,
) -> None:
    _, elements = fixture("water_coast.json")
    cut = write_osm(elements, tmp_path / "cut.osm")
    heart = get_shape("heart")(128)
    start = local_to_latlon(COAST_ORIGIN, 100.0, 80.0)  # on the beach
    asked = water_fit.water_bbox(start, heart, 1500)

    large = tmp_path / "large"
    write_box(cut, large_coast_box(), large)
    own = tmp_path / "own"
    write_box(cut, asked, own)

    served = OverpassWaterSource(large, download=False)
    assert served.covering_path(asked) == served.path(large_coast_box())
    route, area = water_fit.plan_on_water(heart, 1500, start, served, name="heart")
    alone, _ = water_fit.plan_on_water(
        heart, 1500, start, OverpassWaterSource(own, download=False), name="heart"
    )
    assert route.points == alone.points
    assert route.shore_start == alone.shore_start
    assert route.distance_m == alone.distance_m
    assert area.bbox == asked


def test_a_request_past_the_large_file_s_edge_is_not_covered(tmp_path: Path) -> None:
    _, elements = fixture("water_coast.json")
    cut = write_osm(elements, tmp_path / "cut.osm")
    large = tmp_path / "large"
    write_box(cut, large_coast_box(), large)
    heart = get_shape("heart")(128)
    # 6 km east: the request's box reaches past x = 8500.
    start = local_to_latlon(COAST_ORIGIN, 6000.0, 80.0)
    with pytest.raises(WaterNotCachedError):
        water_fit.plan_on_water(
            heart, 1500, start, OverpassWaterSource(large, download=False)
        )


# --- The command ------------------------------------------------------------


def test_the_command_writes_the_file_a_download_of_the_box_would(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    bbox, elements = fixture("water_lake.json")
    cut = write_osm(elements, tmp_path / "cut.osm")
    path = write_box(cut, bbox, tmp_path / "cache")
    assert path.parent == tmp_path / "cache" / "water"
    assert read_water(path) == (bbox, water_elements(read_osm_xml(cut), bbox))
    assert f"Wrote {path}: 5 elements" in capsys.readouterr().out


def test_the_command_cuts_an_extract_with_osmium(tmp_path: Path) -> None:
    bbox, elements = fixture("water_lake.json")
    cut = write_osm(elements, tmp_path / "cut.osm")
    seen: list[list[str]] = []

    def run(args: list[str]) -> None:
        seen.append(args)
        shutil.copy(cut, args[args.index("--output") + 1])

    south, west, north, east = bbox
    code = main(
        ["--extract", "italy-water.osm.pbf", "--bbox", f"{south},{west},{north},{east}"]
        + ["--cache-dir", str(tmp_path / "cache")],
        run=run,
    )
    assert code == 0
    assert seen[0][:4] == ["osmium", "extract", "--strategy", "smart"]
    assert seen[0][-1] == "italy-water.osm.pbf"
    assert read_water(OverpassWaterSource(tmp_path / "cache").path(bbox))[1] == (
        water_elements(read_osm_xml(cut), bbox)
    )


def test_the_cut_has_a_margin_around_the_box() -> None:
    bbox = (45.0, 10.0, 45.1, 10.1)
    s, w, n, e = grown(bbox)
    assert 0.0044 < bbox[0] - s < 0.0046  # 500 m of latitude
    assert n - bbox[2] == pytest.approx(bbox[0] - s)
    assert w < bbox[1] and e > bbox[3]
    args = osmium_extract_args(Path("x.pbf"), bbox, Path("o.osm"))
    assert args[args.index("--bbox") + 1] == f"{w},{s},{e},{n}"
    assert MARGIN_M == 500.0
