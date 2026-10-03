"""GET /phone-zones/{network}: the cached zone around a point, as the phone
draws on it (TASK-214, ADR-0177).

The file is written once beside the zone (phone_zones.py) and again when the
zone is newer; its ETag lets the phone ask again and get 304. A point with no
cached zone around it is a 404: the server draws routes there until a route
asked of it downloads the zone. Nothing here downloads from Overpass.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, FastAPI, Header, HTTPException, Query, Response
from fastapi.responses import FileResponse
from route_engine.network import (
    FILTERS,
    OsmnxSource,
    area_around,
    read_graph,
)

from shaperoute_api.phone_zones import SUFFIX, write_zone, zone_bbox
from shaperoute_api.schemas import ErrorBody

log = logging.getLogger(__name__)

# The zone must hold this much around the point: a route of a few km from
# there fits in it (ROUTE_ENGINE.md §4); a longer one the phone checks.
ZONE_MARGIN_M = 3000.0
NO_ZONE = "No zone around this point on the server yet."
UNKNOWN_NETWORK = f"Unknown network; one of: {', '.join(FILTERS)}."


def install_phone_zones(app: FastAPI, cache_dir: Path) -> None:
    """The zones of `cache_dir` for the phone."""
    app.include_router(phone_zone_routes(cache_dir))


def phone_zone_routes(cache_dir: Path) -> APIRouter:
    router = APIRouter()

    @router.get(
        "/phone-zones/{network}",
        response_class=FileResponse,
        responses={
            200: {"content": {"application/gzip": {}}},
            304: {"description": "The phone already has this zone."},
            404: {"model": ErrorBody},
        },
    )
    def phone_zone(
        network: str,
        lat: Annotated[float, Query(ge=-90, le=90)],
        lon: Annotated[float, Query(ge=-180, le=180)],
        if_none_match: Annotated[str | None, Header()] = None,
    ) -> Response:
        if network not in FILTERS:
            raise HTTPException(404, UNKNOWN_NETWORK)
        source = OsmnxSource(cache_dir, network, FILTERS[network])
        zone = source.covering_path(area_around([(lat, lon)], ZONE_MARGIN_M))
        if zone is None:
            raise HTTPException(404, NO_ZONE)
        path = phone_file(source, zone)
        stat = path.stat()
        tag = f'"{stat.st_mtime_ns:x}-{stat.st_size:x}"'
        if if_none_match == tag:
            return Response(status_code=304, headers={"ETag": tag})
        return FileResponse(
            path,
            media_type="application/gzip",
            filename=path.name,
            headers={"ETag": tag},
        )

    return router


def phone_file(source: OsmnxSource, zone: Path) -> Path:
    """The phone's file of the cached `zone`, written when missing or older
    than the zone. Two requests at once may both write it: each writes whole
    and the second replaces the first (write_zone)."""
    path = zone.with_name(f"{zone.stem}{SUFFIX}")
    newest = max(p.stat().st_mtime_ns for p in _zone_files(zone))
    if path.exists() and path.stat().st_mtime_ns >= newest:
        return path
    bbox = zone_bbox(path)
    assert bbox is not None  # named as OsmnxSource names its zones
    started = time.perf_counter()
    graph = read_graph(zone)
    write_zone(
        graph, source.named_roads(bbox, download=False), source.network_name, bbox, path
    )
    log.info(
        "phone zone %s written in %.1f s", path.name, time.perf_counter() - started
    )
    return path


def _zone_files(zone: Path) -> list[Path]:
    """The GraphML of the zone and its pickle, when there is one."""
    fast = zone.with_suffix(".pickle")
    return [zone, fast] if fast.exists() else [zone]
