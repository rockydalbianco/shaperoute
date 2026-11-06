"""The ski resorts of the world from OpenSkiData (TASK-406 part A, ADR-0338).

OpenSkiData (openskidata.org) gives every ski area of OpenStreetMap and
Skimap.org in one file, `ski_areas.geojson` (about 21 MB, rebuilt each
night): ODbL, free to use commercially, credited to OpenStreetMap
contributors, OpenSkiMap.org, Skimap.org and Who's On First. Automated
downloads at most once a day; the server takes it once a season, by hand:

    curl -fsSL -o ski_areas.geojson \\
        https://tiles.openskimap.org/geojson/ski_areas.geojson
    python -m shaperoute_api.resort_import --geojson ski_areas.geojson

Kept: the areas that are operating, have downhill pistes and a name. The
others (closed or planned, cross-country only, without a name) are left
out. The format of the file is not promised stable: a feature that does not
read as expected is left out and counted, it does not stop the import.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from shaperoute_api.db import DATABASE_VARIABLE, Database
from shaperoute_api.ski_resorts import Resort, delete_missing, save_resorts

MAX_NAME = 120
MAX_WEBSITE = 300


@dataclass(frozen=True)
class Read:
    resorts: list[Resort]
    left_out: int


def resorts_of(features: Iterable[Mapping[str, Any]]) -> Read:
    """The resorts of the features of `ski_areas.geojson`, in their order."""
    kept: list[Resort] = []
    left_out = 0
    for feature in features:
        try:
            resort = _resort(feature)
        except (KeyError, TypeError, ValueError, IndexError):
            resort = None
        if resort is None:
            left_out += 1
        else:
            kept.append(resort)
    return Read(kept, left_out)


def _resort(feature: Mapping[str, Any]) -> Resort | None:
    props = feature["properties"]
    if props.get("status") != "operating":
        return None
    if "downhill" not in (props.get("activities") or []):
        return None
    name = short_name(props.get("name") or "")
    if not name:
        return None
    lon, lat = _center(feature)
    stats = props.get("statistics") or {}
    by_type = (stats.get("lifts") or {}).get("byType") or {}
    lifts = sum(int(kind.get("count") or 0) for kind in by_type.values())
    downhill = (
        ((stats.get("runs") or {}).get("byActivity") or {}).get("downhill") or {}
    ).get("byDifficulty") or {}
    by_difficulty = {
        key: float(value.get("lengthInKm") or 0.0) for key, value in downhill.items()
    }
    place = (props.get("places") or [{}])[0]
    country = place.get("iso3166_1Alpha2")
    region = ((place.get("localized") or {}).get("en") or {}).get("region")
    return Resort(
        id=str(props["id"]),
        name=name,
        country=country if _is_country(country) else None,
        region=region[:MAX_NAME] if isinstance(region, str) and region else None,
        center=(lat, lon),
        bbox=_bbox(feature["geometry"], lat, lon),
        lifts=lifts,
        piste_km=sum(by_difficulty.values()),
        piste_km_by_difficulty=by_difficulty,
        min_elevation_m=_metres(stats.get("minElevation")),
        max_elevation_m=_metres(stats.get("maxElevation")),
        website=_website(props.get("websites") or []),
    )


def short_name(name: str) -> str:
    """The name, or as many of its comma-separated forms as fit in
    MAX_NAME («Val Gardena, Gröden, Gherdëina» whole; a name in five
    languages cut after the forms that fit)."""
    name = " ".join(name.split())
    if len(name) <= MAX_NAME:
        return name
    out = ""
    for part in name.split(", "):
        longer = f"{out}, {part}" if out else part
        if len(longer) > MAX_NAME:
            break
        out = longer
    return out or name[:MAX_NAME].rstrip()


def _center(feature: Mapping[str, Any]) -> tuple[float, float]:
    """(lon, lat): the centre OpenSkiMap shows the area at, else the point."""
    hint = (feature["properties"].get("viewportHint") or {}).get("center")
    if hint is None and feature["geometry"]["type"] == "Point":
        hint = feature["geometry"]["coordinates"]
    lon, lat = float(hint[0]), float(hint[1])
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise ValueError("centre out of range")
    return lon, lat


def _bbox(
    geometry: Mapping[str, Any], lat: float, lon: float
) -> tuple[float, float, float, float]:
    """(south, west, north, east) of the outline; the centre alone for an
    area given as a point."""
    points = list(_positions(geometry["coordinates"]))
    if geometry["type"] == "Point" or not points:
        return lat, lon, lat, lon
    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    return min(lats), min(lons), max(lats), max(lons)


def _positions(coordinates: Any) -> Iterable[tuple[float, float]]:
    if coordinates and isinstance(coordinates[0], (int, float)):
        yield float(coordinates[0]), float(coordinates[1])
        return
    for inner in coordinates:
        yield from _positions(inner)


def _is_country(code: object) -> bool:
    return (
        isinstance(code, str) and len(code) == 2 and code.isascii() and code.isupper()
    )


def _metres(value: object) -> int | None:
    return round(value) if isinstance(value, (int, float)) else None


def _website(sites: Sequence[object]) -> str | None:
    for site in sites:
        if (
            isinstance(site, str)
            and site.startswith(("https://", "http://"))
            and len(site) <= MAX_WEBSITE
        ):
            return site
    return None


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m shaperoute_api.resort_import",
        description="The ski resorts of OpenSkiData's ski_areas.geojson (TASK-406).",
    )
    parser.add_argument("--geojson", type=Path, required=True)
    parser.add_argument(
        "--clean",
        action="store_true",
        help="also remove the resorts the file no longer has",
    )
    args = parser.parse_args(argv)

    database = Database.from_env()
    if database is None:
        print(f"{DATABASE_VARIABLE} is not set.", file=sys.stderr)
        return 1
    try:
        features = json.loads(args.geojson.read_text(encoding="utf-8"))["features"]
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"Could not read {args.geojson}: {exc}", file=sys.stderr)
        return 1
    read = resorts_of(features)
    with database.connect() as conn:
        saved = save_resorts(conn, read.resorts, datetime.now(UTC))
        removed = (
            delete_missing(conn, [r.id for r in read.resorts]) if args.clean else 0
        )
    print(f"Saved {saved} ski resorts, left out {read.left_out}, removed {removed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
