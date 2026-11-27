"""Where the server keeps the wind (TASK-479 part H): one file per source
and area, the newest run only, in the directory SHAPEROUTE_WINDS_DIR. The
job writes them whole (WindGrid.save); the API reads them again only when
a file changes."""

from __future__ import annotations

import os
import threading
from datetime import datetime, timedelta
from pathlib import Path

from shaperoute_api.winds.grid import WindGrid
from shaperoute_api.winds.sources import ECMWF, ICON_D2

DIR_VARIABLE = "SHAPEROUTE_WINDS_DIR"
# A run older than this is not given: the next one should be there.
FRESH = {ICON_D2: timedelta(hours=12), ECMWF: timedelta(hours=36)}
# The finer model first, where it reaches.
PREFERRED = (ICON_D2, ECMWF)


def file_of(directory: Path, grid: WindGrid) -> Path:
    return directory / f"{grid.source}-{grid.area}.npz"


class WindStore:
    def __init__(self, directory: Path | None) -> None:
        self.directory = directory
        self._lock = threading.Lock()
        self._kept: dict[Path, tuple[float, WindGrid]] = {}

    @staticmethod
    def from_environment() -> WindStore:
        value = os.environ.get(DIR_VARIABLE, "").strip()
        return WindStore(Path(value) if value else None)

    def save(self, grid: WindGrid) -> Path:
        if self.directory is None:
            raise RuntimeError(f"{DIR_VARIABLE} is not set")
        self.directory.mkdir(parents=True, exist_ok=True)
        path = file_of(self.directory, grid)
        grid.save(path)
        return path

    def grids(self) -> list[WindGrid]:
        if self.directory is None or not self.directory.is_dir():
            return []
        out = []
        with self._lock:
            for path in sorted(self.directory.glob("*.npz")):
                stamp = path.stat().st_mtime
                kept = self._kept.get(path)
                if kept is None or kept[0] != stamp:
                    try:
                        kept = (stamp, WindGrid.load(path))
                    except (OSError, ValueError, KeyError):
                        continue
                    self._kept[path] = kept
                out.append(kept[1])
        return out

    def best(self, lat: float, lon: float, now: datetime) -> WindGrid | None:
        """The finest fresh grid that covers (lat, lon), or None."""
        grids = [
            grid
            for grid in self.grids()
            if grid.covers(lat, lon)
            and now - grid.run <= FRESH.get(grid.source, FRESH[ECMWF])
        ]
        for source in PREFERRED:
            for grid in grids:
                if grid.source == source:
                    return grid
        return None
