"""Paddling routes in the API (TASK-191 part B, ADR-0161, ADR-0164).

On the water there is no road network: the engine's `plan_paddling` places
a shape of the catalogue on a lake or the sea, within 1 km of the shore, and
joins it to a start on the shore reachable on foot (ADR-0154). The API gives
it the water of its cache folder, `<cache>/water/` beside the zones,
downloaded from Overpass on a miss, and answers its plan as any other route:
a RouteResult, with no directions (they are read on a road graph, and the
water has none) and no alternatives (the engine places the shape once).
"""

from __future__ import annotations

import logging
import threading
import time
from pathlib import Path

from route_engine.models import RouteRequest
from route_engine.optimizer import Plan
from route_engine.paddling import plan_paddling
from route_engine.water import BBox, Element, OverpassWaterSource, WaterSource

from shaperoute_api.graphs import MapDataUnavailableError

log = logging.getLogger(__name__)


class ServerWater:
    """The water of the API's cache folder (water.OverpassWaterSource): a
    cached file whose area contains the one asked serves it, else one
    Overpass request, saved for the next. A download that fails is
    map_data_unavailable, as a zone's (graphs.ZoneGraphs)."""

    def __init__(self, cache_dir: Path) -> None:
        self._source = OverpassWaterSource(cache_dir)
        # One download at a time: water is asked for rarely, and a request
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
                    return self._logged("network", self._download(bbox), started)
        return self._logged("disk", self._source.elements(bbox), started)

    def _download(self, bbox: BBox) -> list[Element]:
        try:
            return self._source.elements(bbox)
        except Exception as exc:
            raise MapDataUnavailableError(
                f"OpenStreetMap water for this area could not be downloaded: {exc}"
            ) from exc

    @staticmethod
    def _logged(origin: str, elements: list[Element], started: float) -> list[Element]:
        log.info(
            "water from %s, %d elements, in %.1f s",
            origin,
            len(elements),
            time.perf_counter() - started,
        )
        return elements


def plan_water(request: RouteRequest, water: WaterSource) -> Plan:
    """The plan of a paddling request on `water`: the engine's route, closed,
    from the shore and checked on the water; no search, so no directions,
    and no alternatives. NoWaterError and WaterFitError are
    ShapeNotDrawableError: shape_not_drawable, with the distance the shape
    fits at (errors.suggested_distance)."""
    planned = plan_paddling(request, water)
    route = planned.route
    # No position: the log never has where a user is (API.md, «Grafi»).
    log.info(
        "on the water: %s %d m, scale %.2f, %s start, legs of %.0f m",
        request.shape,
        request.distance_m,
        route.scale,
        route.shore_access,
        route.approach_m,
    )
    return Plan(result=planned.result, search=None)
