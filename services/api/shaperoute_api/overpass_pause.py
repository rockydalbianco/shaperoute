"""A shorter wait before a zone's download when Overpass does not say how
long to wait (TASK-471, ADR-0385).

Before each request OSMnx reads Overpass's status page, to learn when a
slot is free. When the page cannot be read, or is not the one it expects
(with Overpass at capacity it is the 502 page), OSMnx waits a fixed minute
and then makes the request anyway: `default_pause=60`, an argument of a
private function it calls without arguments, not a setting. Measured on the
server on 2026-11-12: of the 140 and 163 s two requests waited before
`map_data_unavailable`, 120 were this minute, twice; a download that
succeeded had waited it too.

For a route someone is waiting for, the API waits APP_PAUSE_S instead (the
user's choice, 2026-11-12). Only that case changes: the wait Overpass
itself asks for ("Slot available after…") stays as it is, and so does the
download, which is long when it succeeds (75 to 200 s for a zone): no time
limit is put on it. One attempt per graph, as before (docs/MAPS.md). The
batch downloads (prefetch_zones) use the engine's OsmnxSource alone and
keep the minute.

The function is OSMnx's own (2.1.1), and private: when it is not there, or
takes no `default_pause`, nothing is changed and the minute stays, with a
warning in the log; this module's tests fail on such an OSMnx.
"""

from __future__ import annotations

import functools
import inspect
import logging
import threading
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from typing import Any

log = logging.getLogger(__name__)

# Seconds before the request when the status page says nothing usable.
APP_PAUSE_S = 5.0
# OSMnx's function, in its module `osmnx._overpass`.
PAUSE_FUNCTION = "_get_overpass_pause"
PAUSE_ARGUMENT = "default_pause"

_guard = threading.Lock()
_blocks = 0  # under way, in any thread
_original: Callable[..., float] | None = None


@contextmanager
def short_overpass_pause(pause_s: float = APP_PAUSE_S) -> Iterator[None]:
    """For the length of the block, OSMnx waits `pause_s` instead of a
    minute when Overpass's status says nothing usable. It is OSMnx's
    function that changes, so for every thread of the process: blocks may
    overlap, and the minute is back when the last one ends. Where there is
    no OSMnx (the engine on the phone, which downloads nothing) the block
    changes nothing."""
    try:
        import osmnx._overpass as overpass
    except ImportError:  # the engine on the phone: no OSMnx, no download
        yield
        return
    shortened = _enter(overpass, pause_s)
    try:
        yield
    finally:
        if shortened:
            _leave(overpass)


def _enter(overpass: Any, pause_s: float) -> bool:
    """Whether the block counts: False on an OSMnx without the function."""
    global _blocks, _original
    with _guard:
        if _blocks == 0:
            original = getattr(overpass, PAUSE_FUNCTION, None)
            if not _takes_the_pause(original):
                log.warning(
                    "osmnx has no %s(%s=): its own wait stays",
                    PAUSE_FUNCTION,
                    PAUSE_ARGUMENT,
                )
                return False
            _original = original
            setattr(overpass, PAUSE_FUNCTION, _shortened(original, pause_s))
        _blocks += 1
        return True


def _leave(overpass: Any) -> None:
    global _blocks, _original
    with _guard:
        _blocks -= 1
        if _blocks == 0:
            setattr(overpass, PAUSE_FUNCTION, _original)
            _original = None


def _takes_the_pause(function: object) -> bool:
    if not callable(function):
        return False
    try:
        return PAUSE_ARGUMENT in inspect.signature(function).parameters
    except (TypeError, ValueError):
        return False


def _shortened(original: Callable[..., float], pause_s: float) -> Callable[..., float]:
    """`original` with `pause_s` as its fallback wait. OSMnx calls it by its
    name in the module, also from inside itself while Overpass is running
    a query of ours: those calls get the same fallback."""

    @functools.wraps(original)
    def pause(base_endpoint: str, **kwargs: Any) -> float:
        kwargs.setdefault(PAUSE_ARGUMENT, pause_s)
        return float(original(base_endpoint, **kwargs))

    return pause
