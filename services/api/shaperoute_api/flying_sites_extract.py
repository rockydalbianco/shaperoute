"""The takeoffs and landings of free flying from OpenStreetMap extracts
(TASK-493 part A, ADR-0400).

The map of takeoffs reads them from the database (flying_sites.py). They
come from Geofabrik's extracts, as the lifts and pistes do
(ski_extract.py), because Overpass refuses the server (ADR-0154): osmium
keeps the objects with a free-flying tag, and this command writes the
sites, each replacing the row of its OSM object and kind.

    osmium tags-filter italy-latest.osm.pbf nwr/free_flying:site \
        nwr/free_flying:takeoff nwr/free_flying:landing \
        -o italy-flying.osm.pbf
    python -m shaperoute_api.flying_sites_extract \
        --extract italy-flying.osm.pbf austria-flying.osm.pbf --clean

Read (taginfo, 2026-11-23): the old `free_flying:site` (takeoff, launch,
landing, toplanding; several with «;»), the newer `free_flying:takeoff`
and `free_flying:landing` (yes), `free_flying:site_orientation` (compass
points with «;»), `free_flying:official` and `ele`. Nodes are points, ways
the middle of their nodes; relations are left out (a handful). An object
tagged takeoff and landing at once is two sites. `--clean` removes the
sites no extract of this run had: give it every extract at once. Nothing
here needs the network; the writing is one transaction.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from collections.abc import Callable, Mapping, Sequence
from datetime import UTC, datetime
from pathlib import Path

from shaperoute_api.db import DATABASE_VARIABLE, Database
from shaperoute_api.flying_sites import (
    COMPASS,
    MAX_NAME,
    Site,
    SiteKind,
    delete_older,
    save_sites,
)
from shaperoute_api.water_extract import OsmData, read_osm_xml

# The values of free_flying:site that are a takeoff or a landing. The rest
# (training, towing, packing, a number) are not a place to fly from or to.
SITE_KINDS: Mapping[str, SiteKind] = {
    "takeoff": "takeoff",
    "launch": "takeoff",
    "landing": "landing",
    "toplanding": "landing",
}
KINDS: tuple[SiteKind, ...] = ("takeoff", "landing")
LOWEST_M = -500
HIGHEST_M = 9000
FEET = 0.3048

_SEPARATORS = re.compile(r"[;,/\s]+")
_NUMBER = re.compile(r"^\s*(-?\d+(?:[.,]\d+)?)\s*(m|ft|')?\s*$", re.IGNORECASE)


def kinds_of(tags: Mapping[str, str]) -> list[SiteKind]:
    """takeoff, landing, both or neither, in that order."""
    found: set[SiteKind] = set()
    for value in _SEPARATORS.split(tags.get("free_flying:site", "").lower()):
        kind = SITE_KINDS.get(value)
        if kind is not None:
            found.add(kind)
    for kind in KINDS:
        if tags.get(f"free_flying:{kind}", "").strip().lower() == "yes":
            found.add(kind)
    return [k for k in KINDS if k in found]


def orientation_of(value: str) -> tuple[str, ...]:
    """The compass points of free_flying:site_orientation, each once, in
    compass order. A number of degrees is the nearest of the sixteen
    points; anything else (a range «SW-NW», a word) is left out."""
    found: set[str] = set()
    for part in _SEPARATORS.split(value.strip().upper()):
        if part in COMPASS:
            found.add(part)
        elif part.isdigit() and int(part) <= 360:
            found.add(COMPASS[round(int(part) / 22.5) % 16])
    return tuple(point for point in COMPASS if point in found)


def ele_of(value: str | None) -> int | None:
    """OSM's `ele` in whole metres: «1234», «1234 m», «1234.5», «4000 ft»;
    None for anything else or out of range."""
    if not value:
        return None
    match = _NUMBER.match(value)
    if match is None:
        return None
    metres = float(match.group(1).replace(",", "."))
    if (match.group(2) or "").lower() in ("ft", "'"):
        metres *= FEET
    rounded = round(metres)
    return rounded if LOWEST_M <= rounded <= HIGHEST_M else None


def official_of(value: str | None) -> bool | None:
    word = (value or "").strip().lower()
    if word == "yes":
        return True
    if word in ("no", "false"):
        return False
    return None


def name_of(value: str | None) -> str | None:
    name = " ".join((value or "").split())
    return name[:MAX_NAME].rstrip() or None


def _sites(
    osm_type: str, ident: int, point: tuple[float, float], tags: Mapping[str, str]
) -> list[Site]:
    return [
        Site(
            osm_type="node" if osm_type == "node" else "way",
            osm_id=ident,
            kind=kind,
            point=point,
            name=name_of(tags.get("name")),
            ele_m=ele_of(tags.get("ele")),
            orientation=orientation_of(tags.get("free_flying:site_orientation", "")),
            official=official_of(tags.get("free_flying:official")),
        )
        for kind in kinds_of(tags)
    ]


def flying_sites(data: OsmData) -> list[Site]:
    """The takeoffs and landings of `data`: nodes, then ways, by id. A way
    with none of its nodes in the extract is left out."""
    out: list[Site] = []
    for ident in sorted(data.nodes):
        lat, lon, tags = data.nodes[ident]
        if tags:
            out += _sites("node", ident, (lat, lon), tags)
    for ident in sorted(data.ways):
        refs, tags = data.ways[ident]
        if not kinds_of(tags):
            continue
        # A closed way names its first node twice: count it once.
        unique = list(dict.fromkeys(refs))
        points = [data.nodes[r][:2] for r in unique if r in data.nodes]
        if not points:
            continue
        lat = sum(p[0] for p in points) / len(points)
        lon = sum(p[1] for p in points) / len(points)
        out += _sites("way", ident, (lat, lon), tags)
    return out


def osmium_cat_args(pbf: Path, out: Path) -> list[str]:
    """An extract already filtered to the free-flying objects, as OSM XML."""
    return ["osmium", "cat", "--overwrite", "--output", str(out), str(pbf)]


Run = Callable[[list[str]], None]


def _run(args: list[str]) -> None:
    subprocess.run(args, check=True, capture_output=True)


def main(
    argv: Sequence[str] | None = None,
    run: Run = _run,
    database: Database | None = None,
    now: datetime | None = None,
) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m shaperoute_api.flying_sites_extract",
        description="The takeoffs and landings of OpenStreetMap extracts"
        " (TASK-493).",
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--osm", type=Path, nargs="+", help="OSM XML files")
    source.add_argument(
        "--extract",
        type=Path,
        nargs="+",
        help="extracts filtered to the free-flying objects",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="also remove the sites none of these extracts has",
    )
    args = parser.parse_args(argv)

    if database is None:
        database = Database.from_env()
    if database is None:
        print(f"{DATABASE_VARIABLE} is not set.", file=sys.stderr)
        return 1
    sites: list[Site] = []
    try:
        if args.osm is not None:
            for path in args.osm:
                sites += flying_sites(read_osm_xml(path))
        else:
            with tempfile.TemporaryDirectory(prefix="flying-") as folder:
                for index, pbf in enumerate(args.extract):
                    cut = Path(folder) / f"flying-{index}.osm"
                    run(osmium_cat_args(pbf, cut))
                    sites += flying_sites(read_osm_xml(cut))
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"Could not read the extracts, nothing written: {exc}", file=sys.stderr)
        return 1
    # An object in two extracts (a site on a border) once: the last wins.
    unique = {(s.osm_type, s.osm_id, s.kind): s for s in sites}
    started = now or datetime.now(UTC)
    # One transaction (Database.connect): every site or none.
    with database.connect() as conn:
        saved = save_sites(conn, unique.values(), started)
        removed = delete_older(conn, started) if args.clean else 0
    takeoffs = sum(1 for s in unique.values() if s.kind == "takeoff")
    print(
        f"Saved {saved} flying sites: {takeoffs} takeoffs,"
        f" {saved - takeoffs} landings; removed {removed}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
