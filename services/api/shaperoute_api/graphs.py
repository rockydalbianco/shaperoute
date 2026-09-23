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
        # One lock per zone (ADR-0032): downloading a zone makes only the
        # requests for that zone wait. The guard only covers the two dicts.
        self._zone_locks: dict[Path, threading.Lock] = {}
        self._guard = threading.Lock()

    def needs_download(self, bbox: BBox) -> bool:
        """True when no cached zone covers `bbox`: loading it means Overpass."""
        return self._source.covering_path(bbox) is None

    def load(self, bbox: BBox) -> Graph:
        started = time.perf_counter()
        key = self._source.covering_path(bbox) or self._source.cache_path(bbox)
        with self._lock_for(key):
            zone, origin = self._zone(key, bbox)
        graph = crop(zone, bbox)
        log.info(
            "graph from %s (%s), cropped in %.1f s",
            origin,
            key.name,
            time.perf_counter() - started,
        )
        return graph

    def _lock_for(self, key: Path) -> threading.Lock:
        with self._guard:
            return self._zone_locks.setdefault(key, threading.Lock())

    def _zone(self, key: Path, bbox: BBox) -> tuple[Graph, str]:
        with self._guard:
            zone = self._zones.get(key)
            if zone is not None:
                self._zones.move_to_end(key)
                return zone, "memory"
        # Checked again: another request may have downloaded it meanwhile.
        path = self._source.covering_path(bbox)
        if path is None:
            zone, origin = self._download(bbox), "network"
        else:
            zone, origin = self._read(path), "disk"
        with self._guard:
            self._zones[key] = zone
            while len(self._zones) > self._max_zones:
                self._zones.popitem(last=False)
        return zone, origin

    def _download(self, bbox: BBox) -> Graph:
        try:
            # Downloads the zone and saves it in the cache, like the CLI.
            return self._source.load(bbox)
        except Exception as exc:
            raise MapDataUnavailableError(
                f"OpenStreetMap data for this area could not be downloaded: {exc}"
            ) from exc
