"""The ski resorts of the world from OpenSkiData (TASK-406 part A, ADR-0338).

OpenSkiData (openskidata.org) gives every ski area of OpenStreetMap and
Skimap.org in one file, `ski_areas.geojson` (about 21 MB, rebuilt each
night): ODbL, free to use commercially, credited to OpenStreetMap
contributors, OpenSkiMap.org, Skimap.org and Who's On First. Automated
downloads at most once a day, never their vector tiles; the server takes it
once a season, by hand, saying who it is:

    curl -fsSL -A "MuW/1.0 (getmuw.app)" -o ski_areas.geojson \\
        https://tiles.openskimap.org/geojson/ski_areas.geojson
    python -m shaperoute_api.resort_import --geojson ski_areas.geojson

Kept: the areas that are operating, have downhill pistes and a name. The
others (closed or planned, cross-country only, without a name) are left
out and counted. The format of the file is not promised stable: a field the
import needs that is missing, or of another kind, stops it with the field's
name, before anything is written. The writing is one transaction: every
resort or none.
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


class FormatError(ValueError):
    """The file is not what the import reads: which feature, which field."""


@dataclass(frozen=True)
class Read:
    resorts: list[Resort]
    left_out: int


def resorts_of(features: Iterable[Mapping[str, Any]]) -> Read:
    """The resorts of the features of `ski_areas.geojson`, in their order;
    FormatError at the first feature the import cannot read."""
    kept: list[Resort] = []
    left_out = 0
    for n, feature in enumerate(features):
        resort = _Reader(feature, n).resort()
        if resort is None:
            left_out += 1
        else:
            kept.append(resort)
    return Read(kept, left_out)


class _Reader:
    """One feature, read field by field: a field that is not there, or not
    of its kind, is a FormatError naming it."""

    def __init__(self, feature: object, n: int) -> None:
        self.feature = feature
        self.n = n

    def fail(self, field: str, what: str) -> FormatError:
        ident = ""
        if isinstance(self.feature, Mapping):
            props = self.feature.get("properties")
            if isinstance(props, Mapping) and "id" in props:
                ident = f" (id {props['id']})"
        return FormatError(f"feature {self.n}{ident}: {field} {what}")

    def get(
        self, value: object, path: Sequence[str], kind: type | tuple[type, ...]
    ) -> Any:
        for key in path:
            if not isinstance(value, Mapping) or key not in value:
                raise self.fail(".".join(path), "is missing")
            value = value[key]
        if not isinstance(value, kind) or isinstance(value, bool):
            raise self.fail(".".join(path), f"is not {_kind_name(kind)}")
        return value

    def optional(
        self,
        value: Mapping[str, Any],
        path: Sequence[str],
        kind: type | tuple[type, ...],
    ) -> Any:
        """A field the source may leave out (or give as null); of its kind
        when it is there."""
        for key in path[:-1]:
            value = value.get(key) or {}
            if not isinstance(value, Mapping):
                raise self.fail(".".join(path), "is not an object")
        found = value.get(path[-1])
        if found is None:
            return None
        if not isinstance(found, kind) or isinstance(found, bool):
            raise self.fail(".".join(path), f"is not {_kind_name(kind)}")
        return found

    def resort(self) -> Resort | None:
        props = self.get(self.feature, ["properties"], Mapping)
        ident = self.get(props, ["id"], (str, int))
        status = self.optional(props, ["status"], str)
        activities = self.get(props, ["activities"], list)
        name = short_name(self.optional(props, ["name"], str) or "")
        if status != "operating" or "downhill" not in activities or not name:
            return None
        geometry = self.get(self.feature, ["geometry"], Mapping)
        kind = self.get(geometry, ["type"], str)
        coordinates = self.get(geometry, ["coordinates"], list)
        lon, lat = self._center(props, kind, coordinates)
        stats = self.get(props, ["statistics"], Mapping)
        by_type = self.get(stats, ["lifts", "byType"], Mapping)
        lifts = 0
        for lift in by_type:
            lifts += self.get(by_type, [lift, "count"], int)
        runs = self.get(stats, ["runs", "byActivity"], Mapping)
        downhill = self.optional(runs, ["downhill", "byDifficulty"], Mapping) or {}
        by_difficulty: dict[str, float] = {}
        for difficulty in downhill:
            km = self.get(downhill, [difficulty, "lengthInKm"], (int, float))
            by_difficulty[difficulty] = float(km)
        places = self.optional(props, ["places"], list) or []
        place = places[0] if places and isinstance(places[0], Mapping) else {}
        country = place.get("iso3166_1Alpha2")
        region = self.optional(place, ["localized", "en", "region"], str)
        return Resort(
            id=str(ident),
            name=name,
            country=country if _is_country(country) else None,
            region=region[:MAX_NAME] if region else None,
            center=(lat, lon),
            bbox=self._bbox(kind, coordinates, lat, lon),
            lifts=lifts,
            piste_km=sum(by_difficulty.values()),
            piste_km_by_difficulty=by_difficulty,
            min_elevation_m=_metres(
                self.optional(stats, ["minElevation"], (int, float))
            ),
            max_elevation_m=_metres(
                self.optional(stats, ["maxElevation"], (int, float))
            ),
            website=_website(self.optional(props, ["websites"], list) or []),
        )

    def _center(
        self, props: Mapping[str, Any], kind: str, coordinates: list[Any]
    ) -> tuple[float, float]:
        """(lon, lat): the centre OpenSkiMap shows the area at, else the point."""
        hint = self.optional(props, ["viewportHint", "center"], list)
        if hint is None and kind == "Point":
            hint = coordinates
        if hint is None:
            raise self.fail("properties.viewportHint.center", "is missing")
        if len(hint) < 2 or not all(isinstance(v, (int, float)) for v in hint[:2]):
            raise self.fail("properties.viewportHint.center", "is not [lon, lat]")
        lon, lat = float(hint[0]), float(hint[1])
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise self.fail("properties.viewportHint.center", "is out of range")
        return lon, lat

    def _bbox(
        self, kind: str, coordinates: list[Any], lat: float, lon: float
    ) -> tuple[float, float, float, float]:
        """(south, west, north, east) of the outline; the centre alone for an
        area given as a point."""
        if kind == "Point":
            return lat, lon, lat, lon
        if kind not in ("Polygon", "MultiPolygon"):
            raise self.fail("geometry.type", f"is {kind!r}, not a point or a polygon")
        points = list(self._positions(coordinates))
        if not points:
            return lat, lon, lat, lon
        lons = [p[0] for p in points]
        lats = [p[1] for p in points]
        return min(lats), min(lons), max(lats), max(lons)

    def _positions(self, coordinates: Any) -> Iterable[tuple[float, float]]:
        if not isinstance(coordinates, list):
            raise self.fail("geometry.coordinates", "is not a list")
        if coordinates and isinstance(coordinates[0], (int, float)):
            yield float(coordinates[0]), float(coordinates[1])
            return
        for inner in coordinates:
            yield from self._positions(inner)


def _kind_name(kind: type | tuple[type, ...]) -> str:
    kinds = kind if isinstance(kind, tuple) else (kind,)
    names = {
        Mapping: "an object",
        list: "a list",
        str: "a text",
        int: "a number",
        float: "a number",
    }
    return " or ".join(dict.fromkeys(names.get(k, k.__name__) for k in kinds))


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


def _is_country(code: object) -> bool:
    return (
        isinstance(code, str) and len(code) == 2 and code.isascii() and code.isupper()
    )


def _metres(value: float | None) -> int | None:
    return None if value is None else round(value)


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
        body = json.loads(args.geojson.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print(f"Could not read {args.geojson}: {exc}", file=sys.stderr)
        return 1
    try:
        if not isinstance(body, Mapping) or not isinstance(body.get("features"), list):
            raise FormatError("features is missing")
        read = resorts_of(body["features"])
    except FormatError as exc:
        print(
            f"{args.geojson}: the format changed, nothing written: {exc}",
            file=sys.stderr,
        )
        return 1
    # One transaction (Database.connect): every resort or none.
    with database.connect() as conn:
        saved = save_resorts(conn, read.resorts, datetime.now(UTC))
        kept = [r.id for r in read.resorts]
        removed = delete_missing(conn, kept) if args.clean else 0
    print(f"Saved {saved} ski resorts, left out {read.left_out}, removed {removed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
