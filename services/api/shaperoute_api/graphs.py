"""Road graphs for the API: zones kept in memory, crops never saved (ADR-0030).

The CLI's OsmnxSource saves every crop beside its zone, from 3 to 110 MB for
each new start: fine for a few reference cases, not for an API that gets a
new start with every request. Here zone graphs stay in memory and each
request gets its own crop, which the engine is free to change.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import OrderedDict
from collections.abc import Callable
from pathlib import Path
from typing import Protocol

from route_engine.network import BBox, Graph, crop, read_graph

log = logging.getLogger(__name__)

# A zone graph takes hundreds of MB in memory (Milan's pickle alone is 44 MB).
MAX_ZONES = 2


class MapDataUnavailableError(RuntimeError):
    """The area is not cached and OpenStreetMap data could not be downloaded."""


class ZoneSource(Protocol):
    """What ZoneGraphs needs of the engine's OsmnxSource."""

    def covering_path(self, bbox: BBox) -> Path | None: ...
    def cache_path(self, bbox: BBox) -> Path: ...
    def load(self, bbox: BBox) -> Graph: ...


class ZoneGraphs:
    """GraphLoader that keeps the most recently used zone graphs in memory."""

    def __init__(
        self,
        source: ZoneSource,
        max_zones: int = MAX_ZONES,
        read: Callable[[Path], Graph] = read_graph,
    ) -> None:
        self._source = source
        self._max_zones = max_zones
        self._read = read
        self._zones: OrderedDict[Path, Graph] = OrderedDict()
        # Two requests at once must not read or download the same zone twice.
        self._lock = threading.Lock()

    def load(self, bbox: BBox) -> Graph:
        started = time.perf_counter()
        with self._lock:
            path = self._source.covering_path(bbox)
            if path is None:
                origin = "network"
                zone = self._download(bbox)
                path = self._source.cache_path(bbox)
            elif path in self._zones:
                origin = "memory"
                zone = self._zones[path]
            else:
                origin = "disk"
                zone = self._read(path)
            self._remember(path, zone)
        graph = crop(zone, bbox)
        log.info(
            "graph from %s (%s), cropped in %.1f s",
            origin,
            path.name,
            time.perf_counter() - started,
        )
        return graph

    def _download(self, bbox: BBox) -> Graph:
        try:
            # Downloads the zone and saves it in the cache, like the CLI.
            return self._source.load(bbox)
        except Exception as exc:
            raise MapDataUnavailableError(
                f"OpenStreetMap data for this area could not be downloaded: {exc}"
            ) from exc

    def _remember(self, path: Path, zone: Graph) -> None:
        self._zones[path] = zone
        self._zones.move_to_end(path)
        while len(self._zones) > self._max_zones:
            self._zones.popitem(last=False)
