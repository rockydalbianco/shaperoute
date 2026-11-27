"""A wind grid as the server keeps it (TASK-479 part H, ADR-0388).

One model run of one source over one area: the wind's u and v at the
pressure levels LEVELS, hour by hour, on a regular latitude–longitude grid
from the south-west corner. Each value is a signed byte in steps of
UNIT_MS (±63 m/s, more than any wind a pilot meets), MISSING where the
model has none (a level under the ground). A run of the Alps from
ICON-D2 is some 55 MB, one of Europe from ECMWF some 10 MB.
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import numpy as np

# Pressure levels, hPa: about 1500, 3000, 4200 and 5500 m.
LEVELS = (850, 700, 600, 500)
UNIT_MS = 0.5
MISSING = -128


@dataclass(frozen=True)
class Area:
    """A box of the earth, degrees, west below east."""

    name: str
    south: float
    north: float
    west: float
    east: float

    def covers(self, lat: float, lon: float) -> bool:
        return self.south <= lat <= self.north and self.west <= lon <= self.east


@dataclass(frozen=True)
class Field:
    """One field of a GRIB file on a regular grid, rows south to north,
    columns west to east, longitudes in −180…180."""

    var: str
    level: int
    lat0: float
    lon0: float
    dlat: float
    dlon: float
    values: np.ndarray  # (nlat, nlon), NaN where missing


def quantize(values: np.ndarray) -> np.ndarray:
    """m/s to signed bytes of UNIT_MS, NaN to MISSING."""
    steps = np.round(np.nan_to_num(values, nan=0.0) / UNIT_MS)
    out = np.clip(steps, -127, 127).astype(np.int8)
    out[np.isnan(values)] = MISSING
    return out


def crop(field: Field, area: Area) -> Field:
    """The part of `field` inside `area`, on the same grid."""
    nlat, nlon = field.values.shape
    i0 = max(0, math.ceil((area.south - field.lat0) / field.dlat - 1e-9))
    i1 = min(nlat - 1, math.floor((area.north - field.lat0) / field.dlat + 1e-9))
    j0 = max(0, math.ceil((area.west - field.lon0) / field.dlon - 1e-9))
    j1 = min(nlon - 1, math.floor((area.east - field.lon0) / field.dlon + 1e-9))
    if i1 < i0 or j1 < j0:
        raise ValueError(f"{area.name} is outside the field")
    return Field(
        field.var,
        field.level,
        field.lat0 + i0 * field.dlat,
        field.lon0 + j0 * field.dlon,
        field.dlat,
        field.dlon,
        field.values[i0 : i1 + 1, j0 : j1 + 1],
    )


@dataclass(frozen=True)
class WindGrid:
    source: str
    area: str
    run: datetime
    hours: tuple[int, ...]
    lat0: float
    lon0: float
    dlat: float
    dlon: float
    u: np.ndarray  # int8 (hours, levels, nlat, nlon)
    v: np.ndarray

    @property
    def shape(self) -> tuple[int, int]:
        return int(self.u.shape[2]), int(self.u.shape[3])

    def covers(self, lat: float, lon: float) -> bool:
        nlat, nlon = self.shape
        return (
            self.lat0 <= lat <= self.lat0 + (nlat - 1) * self.dlat
            and self.lon0 <= lon <= self.lon0 + (nlon - 1) * self.dlon
        )

    def at(self, lat: float, lon: float) -> list[list[tuple[float, float] | None]]:
        """The wind at the grid point nearest (lat, lon): hour by hour,
        level by level, (u, v) in m/s or None where missing."""
        nlat, nlon = self.shape
        i = min(nlat - 1, max(0, round((lat - self.lat0) / self.dlat)))
        j = min(nlon - 1, max(0, round((lon - self.lon0) / self.dlon)))
        out: list[list[tuple[float, float] | None]] = []
        for h in range(len(self.hours)):
            row: list[tuple[float, float] | None] = []
            for k in range(len(LEVELS)):
                u = int(self.u[h, k, i, j])
                v = int(self.v[h, k, i, j])
                row.append(None if MISSING in (u, v) else (u * UNIT_MS, v * UNIT_MS))
            out.append(row)
        return out

    def save(self, path: Path) -> None:
        """To `path`, whole or not at all: written beside, then swapped."""
        meta = {
            "source": self.source,
            "area": self.area,
            "run": self.run.isoformat(),
            "hours": list(self.hours),
            "lat0": self.lat0,
            "lon0": self.lon0,
            "dlat": self.dlat,
            "dlon": self.dlon,
            "levels": list(LEVELS),
        }
        beside = path.with_name(path.name + ".part")
        with open(beside, "wb") as out:
            np.savez_compressed(
                out, u=self.u, v=self.v, meta=np.array(json.dumps(meta))
            )
        os.replace(beside, path)

    @staticmethod
    def load(path: Path) -> WindGrid:
        with np.load(path) as kept:
            meta = json.loads(str(kept["meta"]))
            if tuple(meta["levels"]) != LEVELS:
                raise ValueError("other levels")
            return WindGrid(
                meta["source"],
                meta["area"],
                datetime.fromisoformat(meta["run"]),
                tuple(meta["hours"]),
                meta["lat0"],
                meta["lon0"],
                meta["dlat"],
                meta["dlon"],
                kept["u"],
                kept["v"],
            )


def speed_and_from(u: float, v: float) -> tuple[float, int]:
    """Speed in m/s and the direction the wind comes from, degrees."""
    return math.hypot(u, v), round(math.degrees(math.atan2(-u, -v)) % 360) % 360
