"""The wind job (TASK-479 part H, ADR-0388): fetches the newest run of DWD
ICON-D2 and of ECMWF open data, cuts it to the areas of the take-offs and
keeps it in SHAPEROUTE_WINDS_DIR, where GET /winds reads it. Every 6 hours
on the server (the step that starts it is the Coordinatore's, with the
user's yes). One source failing leaves the other's file and the last
good run of its own: GET /winds gives a run only while it is fresh.

    SHAPEROUTE_WINDS_DIR=/app/data/cache/winds \
        python -m shaperoute_api.winds.job [icon-d2|ecmwf]

In the package, not in tools/: the image copies services/ only. On the
server, from the host: docker compose exec -T api python -m
shaperoute_api.winds.job icon-d2 (about 6 min) and … ecmwf (about 6 min),
every 6 hours.
"""

from __future__ import annotations

import logging
import sys
import time
from datetime import UTC, datetime

from shaperoute_api.winds.sources import (
    ECMWF,
    ICON_D2,
    Urllib,
    ecmwf,
    icon_d2,
    latest_run,
)
from shaperoute_api.winds.store import WindStore

log = logging.getLogger("winds.job")

# ICON-D2 runs every 3 hours, whole about 2 hours after; ECMWF open data
# every 12 hours to 240 h, whole about 8 hours after.
ICON_D2_EVERY_H, ICON_D2_READY_H = 3, 2.5
ECMWF_EVERY_H, ECMWF_READY_H = 12, 8.0


def run(sources: list[str], now: datetime | None = None) -> int:
    store = WindStore.from_environment()
    if store.directory is None:
        log.error("SHAPEROUTE_WINDS_DIR is not set")
        return 2
    now = now or datetime.now(UTC)
    transport = Urllib()
    failed = 0
    for source in sources:
        start = time.monotonic()
        try:
            if source == ICON_D2:
                grids = [
                    icon_d2(
                        latest_run(now, ICON_D2_EVERY_H, ICON_D2_READY_H), transport
                    )
                ]
            else:
                grids = ecmwf(latest_run(now, ECMWF_EVERY_H, ECMWF_READY_H), transport)
            for grid in grids:
                path = store.save(grid)
                log.info(
                    "%s %s run %s kept in %s", grid.source, grid.area, grid.run, path
                )
        except Exception:  # noqa: BLE001 — one source failing leaves the other
            failed += 1
            log.exception("%s failed", source)
        log.info("%s took %.0f s", source, time.monotonic() - start)
    return 1 if failed == len(sources) else 0


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    wanted = sys.argv[1:] or [ICON_D2, ECMWF]
    unknown = [s for s in wanted if s not in (ICON_D2, ECMWF)]
    if unknown:
        log.error("unknown sources: %s", unknown)
        return 2
    return run(wanted)


if __name__ == "__main__":
    sys.exit(main())
