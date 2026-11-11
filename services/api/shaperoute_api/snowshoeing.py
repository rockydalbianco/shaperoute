"""Snowshoe routes in the API (TASK-413 part A2, ADR-0342).

On the snow there is no network, as on the water (paddling.py): the
engine's `plan_snowshoeing` places a small shape of the catalogue freely on
the snow one may walk on, away from steep slopes, woods, pistes, rock and
villages, and joins it to a way in on foot. The API gives it the snow of its
cache folder, `<cache>/snow/` beside `water/`, downloaded from Overpass at
the first request of a place, and the heights of `<cache>/heights/`, the
Terrarium tiles downloaded the same way. It answers the plan as any other
route: a RouteResult with no directions (they are read on a road graph) and
no alternatives (the engine places the shape once). No zone in memory: no
graph.
"""

from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Protocol, runtime_checkable

import numpy as np
from route_engine.heights import Heights, TerrariumTiles
from route_engine.models import RouteRequest
from route_engine.optimizer import Plan
from route_engine.snow import OverpassSnowSource
from route_engine.snowshoeing import plan_snowshoeing
from route_engine.water import BBox, Element

from shaperoute_api.graphs import MapDataUnavailableError

log = logging.getLogger(__name__)


@runtime_checkable
class SnowGround(Protocol):
    """What a route on the snow is drawn on: the snow of an area, and the
    heights its slopes are read from."""

    def elements(self, bbox: BBox) -> list[Element]: ...

    def heights(self) -> Heights: ...


class ServerSnow:
    """The snow and the heights of the API's cache folder. A cached snow
    file whose area contains the one asked serves it, else one Overpass
    request, saved for the next (snow.OverpassSnowSource); a tile of heights
    missing is downloaded and saved (heights.TerrariumTiles). A download
    that fails is map_data_unavailable, as a zone's (graphs.ZoneGraphs)."""

    def __init__(self, cache_dir: Path) -> None:
        self._cache_dir = cache_dir
        self._source = OverpassSnowSource(cache_dir)
        # One download at a time: snow is asked for rarely, and a request
        # for the same area meanwhile finds the file the first one saved.
        self._downloading = threading.Lock()

    @property
    def folder(self) -> Path:
        return self._source.folder

    def needs_download(self, bbox: BBox) -> bool:
        """True when no cached file covers `bbox`: reading it means Overpass."""
        return not self._source.is_cached(bbox)

    def elements(self, bbox: BBox) -> list[Element]:
        started = time.perf_counter()
        if self.needs_download(bbox):
            with self._downloading:
                # Checked again: the download before may have covered it.
                if self.needs_download(bbox):
                    return _logged("network", self._download(bbox), started)
        return _logged("disk", self._source.elements(bbox), started)

    def heights(self) -> Heights:
        """The heights for one request: the tiles of the cache, new each
        time so that the decoded tiles of every place asked are not kept in
        memory while the API lives."""
        return ServerHeights(TerrariumTiles(self._cache_dir))

    def _download(self, bbox: BBox) -> list[Element]:
        try:
            return self._source.elements(bbox)
        except Exception as exc:
            raise MapDataUnavailableError(
                f"OpenStreetMap snow for this area could not be downloaded: {exc}"
            ) from exc


class ServerHeights:
    """The heights of `tiles`, a tile that cannot be downloaded said as
    map_data_unavailable rather than as an engine error."""

    def __init__(self, tiles: TerrariumTiles) -> None:
        self._tiles = tiles

    def heights(self, points: np.ndarray) -> np.ndarray:
        try:
            return self._tiles.heights(points)
        except OSError as exc:
            raise MapDataUnavailableError(
                f"the heights for this area could not be downloaded: {exc}"
            ) from exc


def _logged(origin: str, elements: list[Element], started: float) -> list[Element]:
    log.info(
        "snow from %s, %d elements, in %.1f s",
        origin,
        len(elements),
        time.perf_counter() - started,
    )
    return elements


def plan_snow(request: RouteRequest, snow: SnowGround) -> Plan:
    """The plan of a snowshoe request on `snow`: the engine's route, closed,
    from a way in and checked on the snow; no search, so no directions, and
    no alternatives. NoSnowError and SnowFitError are ShapeNotDrawableError:
    shape_not_drawable, with the distance the shape fits at
    (errors.suggested_distance)."""
    planned = plan_snowshoeing(request, snow, snow.heights())
    route = planned.route
    # No position: the log never has where a user is (API.md, «Grafi»).
    log.info(
        "on the snow: %s %d m, scale %.2f, %s start, legs of %.0f m",
        request.shape,
        request.distance_m,
        route.scale,
        route.shore_access,
        route.approach_m,
    )
    return Plan(result=planned.result, search=None)
