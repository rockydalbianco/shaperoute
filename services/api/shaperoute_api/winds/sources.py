"""Where the wind comes from (TASK-479 part H, ADR-0388): two free sources
under CC BY 4.0, asked by the server alone, never with a user's place.

- **DWD ICON-D2** (opendata.dwd.de): about 2 km over Germany, the Alps and
  their neighbours, hourly to 48 h. One bz2 GRIB file per variable, level
  and hour: 392 files and some 380 MB a run for LEVELS (measured on
  2026-11-26), cut to the Alps.
- **ECMWF IFS open data** (data.ecmwf.int): 0.25° over the earth, every
  3 h. One big file per step; its .index says where each field lies, so
  only the 8 fields of LEVELS are fetched by byte range, 4.8 MB of 98 MB.

The transport is a parameter: urllib on the server (no httpx in the
image), a fake in the tests.
"""

from __future__ import annotations

import bz2
import json
import time
import urllib.request
from collections.abc import Iterable, Sequence
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from typing import Protocol

import eccodes
import numpy as np

from shaperoute_api.winds.grid import LEVELS, Area, Field, WindGrid, crop, quantize

USER_AGENT = "MuW/1.0 (https://getmuw.app)"
TIMEOUT_S = 60.0
TRIES = 3
# Files asked at once: one at a time, a run of ICON-D2 took some 40 min
# on the Mac (2026-11-26); the servers answer many in parallel.
WORKERS = 8

ICON_D2 = "icon-d2"
ECMWF = "ecmwf"
ATTRIBUTION = {ICON_D2: "DWD ICON-D2, CC BY 4.0", ECMWF: "ECMWF open data, CC BY 4.0"}

ICON_D2_BASE = "https://opendata.dwd.de/weather/nwp/icon-d2/grib"
ECMWF_BASE = "https://data.ecmwf.int/forecasts"

# The areas of the take-offs: the Alps for ICON-D2; Europe and the USA,
# MuW's zones, for ECMWF.
ALPS = Area("alps", 43.5, 48.5, 4.5, 17.5)
EUROPE = Area("europe", 35.0, 72.0, -12.0, 35.0)
USA = Area("usa", 24.0, 50.0, -125.0, -66.0)

ICON_D2_HOURS = tuple(range(0, 49))
ECMWF_HOURS = tuple(range(0, 121, 3))


class Transport(Protocol):
    def get(self, url: str, byte_range: tuple[int, int] | None = None) -> bytes: ...


class Urllib:
    """GET with the server's name, a few tries a little apart."""

    def get(self, url: str, byte_range: tuple[int, int] | None = None) -> bytes:
        headers = {"User-Agent": USER_AGENT}
        if byte_range is not None:
            headers["Range"] = (
                f"bytes={byte_range[0]}-{byte_range[0] + byte_range[1] - 1}"
            )
        for attempt in range(TRIES):
            try:
                request = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(request, timeout=TIMEOUT_S) as answer:
                    return answer.read()
            except OSError:
                if attempt == TRIES - 1:
                    raise
                time.sleep(2**attempt)
        raise AssertionError("unreachable")


def fields_of(grib: bytes) -> list[Field]:
    """The fields of GRIB messages, rows south to north, longitudes
    −180…180 west to east, NaN where the model has no value."""
    out: list[Field] = []
    offset = 0
    while offset < len(grib):
        start = grib.find(b"GRIB", offset)
        if start < 0:
            break
        handle = eccodes.codes_new_from_message(grib[start:])
        try:
            length = eccodes.codes_get(handle, "totalLength")
            ni = eccodes.codes_get(handle, "Ni")
            nj = eccodes.codes_get(handle, "Nj")
            lat1 = eccodes.codes_get(handle, "latitudeOfFirstGridPointInDegrees")
            lon1 = eccodes.codes_get(handle, "longitudeOfFirstGridPointInDegrees")
            dlat = eccodes.codes_get(handle, "jDirectionIncrementInDegrees")
            dlon = eccodes.codes_get(handle, "iDirectionIncrementInDegrees")
            north_first = eccodes.codes_get(handle, "jScansPositively") == 0
            missing = eccodes.codes_get(handle, "missingValue")
            var = eccodes.codes_get(handle, "shortName")
            level = int(eccodes.codes_get(handle, "level"))
            values = eccodes.codes_get_values(handle).reshape(nj, ni).astype(np.float32)
        finally:
            eccodes.codes_release(handle)
        values[values == missing] = np.nan
        values[np.abs(values) > 500] = np.nan
        if north_first:
            values = values[::-1]
            lat1 = lat1 - (nj - 1) * dlat
        lon1 = ((lon1 + 180.0) % 360.0) - 180.0
        if lon1 + (ni - 1) * dlon > 180.0 + 1e-6:
            # A grid across the antimeridian or round the earth: turned so
            # that the longitudes rise from −180.
            lons = (lon1 + np.arange(ni) * dlon + 180.0) % 360.0 - 180.0
            order = np.argsort(lons, kind="stable")
            values = values[:, order]
            lon1 = float(lons[order[0]])
        out.append(
            Field(
                var, level, float(lat1), float(lon1), float(dlat), float(dlon), values
            )
        )
        offset = start + length
    return out


def grid_of(
    source: str,
    area: Area,
    run: datetime,
    hours: Sequence[int],
    by_hour: Iterable[list[Field]],
) -> WindGrid:
    """The fields of each hour, cut to `area`, as one grid."""
    u_hours: list[np.ndarray] = []
    v_hours: list[np.ndarray] = []
    first: Field | None = None
    for fields in by_hour:
        found = {(f.var, f.level): crop(f, area) for f in fields}
        u_levels = []
        v_levels = []
        for level in LEVELS:
            u = found.get(("u", level))
            v = found.get(("v", level))
            if u is None or v is None:
                raise ValueError(f"{source}: no wind at {level} hPa")
            first = first or u
            u_levels.append(quantize(u.values))
            v_levels.append(quantize(v.values))
        u_hours.append(np.stack(u_levels))
        v_hours.append(np.stack(v_levels))
    if first is None:
        raise ValueError(f"{source}: no hour")
    return WindGrid(
        source,
        area.name,
        run,
        tuple(hours),
        first.lat0,
        first.lon0,
        first.dlat,
        first.dlon,
        np.stack(u_hours),
        np.stack(v_hours),
    )


def icon_d2_url(run: datetime, var: str, level: int, hour: int) -> str:
    return (
        f"{ICON_D2_BASE}/{run:%H}/{var}/icon-d2_germany_regular-lat-lon_pressure-level_"
        f"{run:%Y%m%d%H}_{hour:03d}_{level}_{var}.grib2.bz2"
    )


def icon_d2(
    run: datetime,
    transport: Transport,
    hours: Sequence[int] = ICON_D2_HOURS,
    area: Area = ALPS,
) -> WindGrid:
    wanted = [(var, level) for level in LEVELS for var in ("u", "v")]

    def one(hour: int, var: str, level: int) -> list[Field]:
        packed = transport.get(icon_d2_url(run, var, level, hour))
        return fields_of(bz2.decompress(packed))

    def hour_fields(pool: ThreadPoolExecutor, hour: int) -> list[Field]:
        parts = pool.map(lambda wanted_one: one(hour, *wanted_one), wanted)
        return [field for part in parts for field in part]

    with ThreadPoolExecutor(WORKERS) as pool:
        return grid_of(ICON_D2, area, run, hours, (hour_fields(pool, h) for h in hours))


def ecmwf_url(run: datetime, hour: int) -> str:
    return (
        f"{ECMWF_BASE}/{run:%Y%m%d}/{run:%H}z/ifs/0p25/oper/"
        f"{run:%Y%m%d%H}0000-{hour}h-oper-fc.grib2"
    )


def ecmwf_ranges(index: str) -> list[tuple[int, int]]:
    """Where the u and v of LEVELS lie in a step's file, by its .index."""
    wanted = {str(level) for level in LEVELS}
    ranges = []
    for line in index.splitlines():
        if not line.strip():
            continue
        entry = json.loads(line)
        if (
            entry.get("levtype") == "pl"
            and entry.get("param") in ("u", "v")
            and entry.get("levelist") in wanted
        ):
            ranges.append((int(entry["_offset"]), int(entry["_length"])))
    return sorted(ranges)


def ecmwf(
    run: datetime,
    transport: Transport,
    hours: Sequence[int] = ECMWF_HOURS,
    areas: Sequence[Area] = (EUROPE, USA),
) -> list[WindGrid]:
    # Cut as they come: 41 steps of the whole earth would be over a GB.
    by_area: list[list[list[Field]]] = [[] for _ in areas]
    for hour in hours:
        url = ecmwf_url(run, hour)
        index = transport.get(url.removesuffix(".grib2") + ".index").decode()
        with ThreadPoolExecutor(WORKERS) as pool:
            parts = pool.map(
                lambda byte_range, url=url: fields_of(transport.get(url, byte_range)),
                ecmwf_ranges(index),
            )
            fields = [field for part in parts for field in part]
        for kept, area in zip(by_area, areas, strict=True):
            kept.append([crop(field, area) for field in fields])
    return [
        grid_of(ECMWF, area, run, hours, kept)
        for kept, area in zip(by_area, areas, strict=True)
    ]


def latest_run(now: datetime, every_h: int, ready_after_h: float) -> datetime:
    """The newest run of a model that runs every `every_h` hours and is
    whole `ready_after_h` hours after its start."""
    ready = now.astimezone(UTC) - timedelta(hours=ready_after_h)
    hour = ready.hour - ready.hour % every_h
    return ready.replace(hour=hour, minute=0, second=0, microsecond=0)
