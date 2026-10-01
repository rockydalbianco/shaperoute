"""Road graphs for the API: zones kept in memory, crops never saved (ADR-0030).

Crops are 3 to 170 MB for each new start, and the API gets a new start
with every request; since TASK-136 the CLI's OsmnxSource does not save them
either (ADR-0108). Here zone graphs stay in memory and each
request gets its own crop, which the engine is free to change. The crop is
ZoneCrop's: the graph `network.crop` gives, made in a fraction of the time
(ADR-0082).
"""

from __future__ import annotations

import gc
import logging
import threading
import time
from collections import OrderedDict
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Protocol

from route_engine.network import BBox, Graph, read_graph
from route_engine.sidewalks import NamedRoad
from route_engine.zone_crop import ZoneCrop

log = logging.getLogger(__name__)

# A zone graph takes hundreds of MB in memory (Milan's pickle alone is 44 MB).
MAX_ZONES = 2


_gc_guard = threading.Lock()
_gc_pauses = 0
_gc_was_enabled = False


@contextmanager
def _gc_paused() -> Iterator[None]:
    """No garbage collection while a crop is made (ADR-0082).

    A crop is some hundred thousand new dicts that all stay: each time the
    collector wakes up for them it walks the whole zone in memory, and finds
    nothing. That was most of the time of a crop. Collection is only put
    off: it is on again when the last crop under way ends, if it was on.
    """
    global _gc_pauses, _gc_was_enabled
    with _gc_guard:
        if _gc_pauses == 0:
            _gc_was_enabled = gc.isenabled()
            gc.disable()
        _gc_pauses += 1
    try:
        yield
    finally:
        with _gc_guard:
            _gc_pauses -= 1
            if _gc_pauses == 0 and _gc_was_enabled:
                gc.enable()


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
        self._zones: OrderedDict[Path, ZoneCrop] = OrderedDict()
        # One lock per zone (ADR-0032): downloading a zone makes only the
        # requests for that zone wait. The guard only covers the two dicts.
        self._zone_locks: dict[Path, threading.Lock] = {}
        self._guard = threading.Lock()

    def named_roads(self, bbox: BBox) -> list[NamedRoad]:
        """The names the foot graph leaves out around `bbox`, from the cached
        file only (ADR-0057): none from a source without them, or with no
        file for the zone. A route never waits for Overpass for a name."""
        named_roads = getattr(self._source, "named_roads", None)
        if named_roads is None:
            return []
        roads: list[NamedRoad] = named_roads(bbox, download=False)
        return roads

    def needs_download(self, bbox: BBox) -> bool:
        """True when no cached zone covers `bbox`: loading it means Overpass."""
        return self._source.covering_path(bbox) is None

    def load(self, bbox: BBox) -> Graph:
        started = time.perf_counter()
        key = self._source.covering_path(bbox) or self._source.cache_path(bbox)
        with self._lock_for(key):
            zone, origin = self._zone(key, bbox)
        # Outside the lock: the zone is only read, and the crop is this
        # request's own (nodes, edges and their attributes).
        with _gc_paused():
            graph = zone.crop(bbox)
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

    def _zone(self, key: Path, bbox: BBox) -> tuple[ZoneCrop, str]:
        with self._guard:
            zone = self._zones.get(key)
            if zone is not None:
                self._zones.move_to_end(key)
                return zone, "memory"
        # Checked again: another request may have downloaded it meanwhile.
        path = self._source.covering_path(bbox)
        if path is None:
            zone, origin = ZoneCrop(self._download(bbox)), "network"
        else:
            zone, origin = ZoneCrop(self._read(path)), "disk"
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
