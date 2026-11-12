"""The foot zones kept warm in the route workers (TASK-464, ADR-0374).

Measured in TASK-445: reading a zone from disk cost 0.6 s on the Mac and
0.5–3.3 s on the server, in 5 routes of 20. A worker kept two zones
(graphs.MAX_ZONES) and each of the two workers (route_processes, ADR-0242)
kept its own; a city has many zones, since the smallest one that covers a
request wins (OsmnxSource.covering_path); and after each update of the
server the workers start empty. So the same zones were read again and again.

Here, in the workers only and for the routes on foot (a run, a walk), the
zones are kept up to a memory ceiling instead of two at most, and each
worker loads the zones used most as soon as it starts, in a thread of its
own: it answers its first route at once, and a route that wants a zone being
loaded waits for that load, never reads it twice.

The zone a route is drawn on is chosen as before (covering_path), read as
before (read_graph) and cropped as before (ZoneCrop): only when it is read
changes, so the routes are the same, bit for bit (test_warm_zones).

Memory: a zone in memory takes about ZONE_MB_PER_PICKLE_MB times its pickle
on disk (TASK-276: a worker with the zones of Trento, 19 MB, and Milan,
44 MB, took 893 MB, about 150 MB of them its imports). The ceiling is the
SHAPEROUTE_ZONES_MB variable, ZONES_MB when unset: a prudent default, the
server's own value is chosen from its real memory. At least the MAX_ZONES
zones of before are kept whatever their size, so no zone is read more often
than before.

Which zones are used most is counted in `zone-usage/running.json` in the
cache: a small file each worker rewrites whole (atomically, under a lock) at
each route. A missing or broken file only means no zone is warmed; a file
that cannot be written is left as it is. The route never fails for it.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
import threading
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path

from route_engine.network import BBox, Graph, OsmnxSource, read_graph
from route_engine.optimizer import GraphLoader
from route_engine.walking import drawn_as
from route_engine.zone_crop import ZoneCrop

from shaperoute_api.activity_graphs import ActivityGraphs, check_supported
from shaperoute_api.graphs import MAX_ZONES, ZoneGraphs, ZoneSource

try:  # The API runs on Linux and macOS; elsewhere the file is not locked.
    import fcntl
except ImportError:  # pragma: no cover
    fcntl = None  # type: ignore[assignment]

log = logging.getLogger(__name__)

# The activity whose zones are kept warm: a run's foot network, which a walk
# shares (walking.drawn_as).
WARM_ACTIVITY = "running"
# The memory ceiling of the warm zones of one worker, in MB.
ZONES_MB_VARIABLE = "SHAPEROUTE_ZONES_MB"
ZONES_MB = 500
# The most zones one worker keeps, however small.
MAX_WARM_ZONES = 16
# A zone in memory, in MB for each MB of its pickle (module docstring).
ZONE_MB_PER_PICKLE_MB = 12.0
# A pickle is about this part of its GraphML (Trento: 19 MB of 43).
PICKLE_PER_GRAPHML = 0.45
# Where the uses of the zones are counted, in the cache.
USAGE_FOLDER = "zone-usage"
# The zones counted, the most used kept.
MAX_COUNTED = 200


class ZonesConfigError(ValueError):
    """SHAPEROUTE_ZONES_MB is not a whole number of MB."""


def zones_mb_from_env(environ: dict[str, str] | None = None) -> int:
    """The memory ceiling of the warm zones: SHAPEROUTE_ZONES_MB, ZONES_MB
    when unset or empty."""
    raw = (os.environ if environ is None else environ).get(ZONES_MB_VARIABLE, "")
    raw = raw.strip()
    if not raw:
        return ZONES_MB
    try:
        value = int(raw)
    except ValueError:
        raise ZonesConfigError(
            f"{ZONES_MB_VARIABLE} must be a whole number of MB, not {raw!r}"
        ) from None
    if value < 0:
        raise ZonesConfigError(f"{ZONES_MB_VARIABLE} must not be negative")
    return value


def zone_mb(path: Path) -> float:
    """What the zone of `path` (its GraphML) takes in memory, estimated from
    its pickle, or from the GraphML when there is no pickle yet; 0 when
    neither is there."""
    for file, part in ((path.with_suffix(".pickle"), 1.0), (path, PICKLE_PER_GRAPHML)):
        try:
            size = file.stat().st_size
        except OSError:
            continue
        return size / 1e6 * part * ZONE_MB_PER_PICKLE_MB
    return 0.0


class ZoneUsage:
    """How many times each zone was used, by name, in a JSON file shared by
    the workers. Never raises: the routes do not depend on it."""

    def __init__(
        self,
        path: Path,
        clock: Callable[[], float] = time.time,
        max_counted: int = MAX_COUNTED,
    ) -> None:
        self.path = path
        self._clock = clock
        self._max_counted = max_counted

    def note(self, name: str) -> None:
        """One more use of the zone `name`."""
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self._locked():
                counts = self._read()
                uses, _ = counts.get(name, (0, 0.0))
                counts[name] = (uses + 1, self._clock())
                self._write(_ranked(counts)[: self._max_counted])
        except Exception as exc:
            log.warning("zone usage not written to %s: %r", self.path, exc)

    def most_used(self) -> list[str]:
        """The zones' names, the most used first; of those used as often,
        the one used last first."""
        try:
            return [name for name, _ in _ranked(self._read())]
        except Exception as exc:
            log.warning("zone usage not read from %s: %r", self.path, exc)
            return []

    def _read(self) -> dict[str, tuple[int, float]]:
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}
        zones = raw.get("zones") if isinstance(raw, dict) else None
        counts: dict[str, tuple[int, float]] = {}
        if not isinstance(zones, list):
            return counts
        for entry in zones:
            try:
                name, uses, last = (
                    entry["name"],
                    int(entry["uses"]),
                    float(entry["last"]),
                )
            except (TypeError, KeyError, ValueError):
                continue
            if isinstance(name, str) and name and "/" not in name and uses > 0:
                counts[name] = (uses, last)
        return counts

    def _write(self, ranked: list[tuple[str, tuple[int, float]]]) -> None:
        data = {
            "zones": [
                {"name": name, "uses": uses, "last": last}
                for name, (uses, last) in ranked
            ]
        }
        # Written beside it and moved over it: a reader sees the old file or
        # the new one, never half of one.
        handle, temporary = tempfile.mkstemp(
            dir=self.path.parent, prefix=self.path.name, suffix=".tmp"
        )
        try:
            with os.fdopen(handle, "w", encoding="utf-8") as file:
                json.dump(data, file)
            os.replace(temporary, self.path)
        except BaseException:
            Path(temporary).unlink(missing_ok=True)
            raise

    @contextmanager
    def _locked(self) -> Iterator[None]:
        """The two workers count one after the other, not over each other."""
        if fcntl is None:  # pragma: no cover
            yield
            return
        lock = self.path.with_name(self.path.name + ".lock")
        with lock.open("a") as file:
            fcntl.flock(file.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(file.fileno(), fcntl.LOCK_UN)


def _ranked(
    counts: dict[str, tuple[int, float]],
) -> list[tuple[str, tuple[int, float]]]:
    return sorted(counts.items(), key=lambda item: (-item[1][0], -item[1][1], item[0]))


class WarmZoneGraphs(ZoneGraphs):
    """ZoneGraphs that keeps its zones up to `budget_mb` (at least
    MAX_ZONES of them, at most `max_zones`), counts their uses in `usage`
    and loads the most used ones ahead (warm)."""

    def __init__(
        self,
        source: ZoneSource,
        cache_dir: Path,
        usage: ZoneUsage,
        budget_mb: float = ZONES_MB,
        max_zones: int = MAX_WARM_ZONES,
        read: Callable[[Path], Graph] = read_graph,
        size_mb: Callable[[Path], float] = zone_mb,
    ) -> None:
        super().__init__(source, max_zones=max(max_zones, MAX_ZONES), read=read)
        self._cache_dir = cache_dir
        self._usage = usage
        self._budget_mb = budget_mb
        self._size_mb = size_mb
        self._sizes: dict[Path, float] = {}

    @property
    def kept(self) -> list[str]:
        """The names of the zones in memory, the least recently used first."""
        with self._guard:
            return [key.name for key in self._zones]

    def _zone(self, key: Path, bbox: BBox) -> tuple[ZoneCrop, str]:
        zone, origin = super()._zone(key, bbox)
        if origin != "memory":
            size = self._size_mb(key)
            with self._guard:
                self._sizes[key] = size
                self._fit()
        self._usage.note(key.name)
        return zone, origin

    def _fit(self) -> None:
        """Called with the guard held: the least recently used zones out
        while over the budget, but never the MAX_ZONES last ones."""
        while len(self._zones) > MAX_ZONES and self._used_mb() > self._budget_mb:
            key, _ = self._zones.popitem(last=False)
            self._sizes.pop(key, None)
        for key in list(self._sizes):
            if key not in self._zones:
                del self._sizes[key]

    def _used_mb(self) -> float:
        return sum(self._sizes.get(key, 0.0) for key in self._zones)

    def warm(self) -> list[str]:
        """The most used zones read now, while they fit in the budget beside
        the zones already in memory; the names of those read. Those already
        in memory, or gone from the cache, are passed over; one that cannot
        be read is logged and passed over."""
        warmed: list[str] = []
        for name in self._usage.most_used():
            key = self._cache_dir / name
            with self._guard:
                if len(self._zones) >= self._max_zones:
                    break
                if key in self._zones:
                    continue
                room = self._budget_mb - self._used_mb()
            if not key.exists():
                continue
            size = self._size_mb(key)
            if size > room:
                continue
            if self._warm_one(key, size):
                warmed.append(name)
        return warmed

    def _warm_one(self, key: Path, size: float) -> bool:
        started = time.perf_counter()
        with self._lock_for(key):
            with self._guard:
                if key in self._zones:
                    return False
            try:
                zone = ZoneCrop(self._read(key))
            except Exception as exc:
                log.warning("zone %s not warmed: %r", key.name, exc)
                return False
            with self._guard:
                # A route may have filled the room meanwhile: its zones stay.
                if (
                    len(self._zones) >= self._max_zones
                    or self._used_mb() + size > self._budget_mb
                ):
                    return False
                self._zones[key] = zone
                # Among the least recently used: a route's zone outlives it.
                self._zones.move_to_end(key, last=False)
                self._sizes[key] = size
        log.info(
            "zone %s warmed in %.1f s (~%.0f MB)",
            key.name,
            time.perf_counter() - started,
            size,
        )
        return True

    def warm_in_background(self) -> threading.Thread:
        """warm() in a thread of its own: the worker answers at once."""
        thread = threading.Thread(
            target=self._warm_logged, name="warm-zones", daemon=True
        )
        thread.start()
        return thread

    def _warm_logged(self) -> None:
        try:
            warmed = self.warm()
        except Exception:  # pragma: no cover - warm() logs its own errors
            log.exception("zones not warmed")
            return
        log.info("%d zones warmed", len(warmed))


class WarmActivityGraphs(ActivityGraphs):
    """ActivityGraphs whose routes on foot are drawn on `warm`."""

    def __init__(self, base: ActivityGraphs, warm: WarmZoneGraphs) -> None:
        super().__init__({}, water=base.water, snow=base.snow)
        self._base = base
        self.warm = warm

    def for_activity(self, activity: str) -> GraphLoader:
        check_supported(activity)
        if drawn_as(activity) == WARM_ACTIVITY:
            return self.warm
        return self._base.for_activity(activity)


def warm_graphs(
    cache_dir: Path,
    budget_mb: int = ZONES_MB,
    in_background: bool = True,
) -> WarmActivityGraphs:
    """A route worker's zones (route_processes.GraphsFactory): those of
    ActivityGraphs.from_cache, the foot ones kept warm up to `budget_mb`
    and warmed now, in the background."""
    base = ActivityGraphs.from_cache(cache_dir)
    warm = WarmZoneGraphs(
        OsmnxSource.for_activity(cache_dir, WARM_ACTIVITY),
        cache_dir,
        ZoneUsage(cache_dir / USAGE_FOLDER / f"{WARM_ACTIVITY}.json"),
        budget_mb=budget_mb,
    )
    if in_background:
        warm.warm_in_background()
    return WarmActivityGraphs(base, warm)
