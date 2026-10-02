"""The zone graphs of each activity (TASK-190, ADR-0153).

A running route is drawn on the foot network, a cycling route on the bike
network: each has its own cached zones (`foot_*`, `bike_*`), and the engine
refuses a graph of another network (`network.check_network`). The API keeps
one ZoneGraphs for each and gives a route the one of its activity. What has
no activity, the themed routes and the directions of a route of "Explore",
is on foot, as before.
"""

from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path

from route_engine.models import SUPPORTED_ACTIVITIES, InvalidRequestError
from route_engine.network import OsmnxSource
from route_engine.optimizer import GraphLoader

from shaperoute_api.graphs import MAX_ZONES, ZoneGraphs

# Zones kept in memory, for each activity. A bike zone for 30 km is about
# 26 km a side (prefetch_zones.bike_zone_box), two to three times the area
# of a foot zone: one at a time, and a bike request in another city reads
# its zone from the disk again (docs/tasks/TASK-190.md, the memory).
ZONES_IN_MEMORY: dict[str, int] = {"running": MAX_ZONES, "cycling": 1}


def check_supported(activity: str) -> None:
    """The activities of the contract (models.SUPPORTED_ACTIVITIES): the
    engine may draw more, which the API does not offer before it gives them
    their network."""
    if activity not in SUPPORTED_ACTIVITIES:
        raise InvalidRequestError(
            f"unsupported activity {activity!r}; "
            f"choose one of: {', '.join(SUPPORTED_ACTIVITIES)}"
        )


class ActivityGraphs:
    """One graph loader for each activity of the contract."""

    def __init__(self, graphs: Mapping[str, GraphLoader]) -> None:
        self._graphs = dict(graphs)

    @classmethod
    def from_cache(cls, cache_dir: Path) -> ActivityGraphs:
        """Each activity's zones in `cache_dir`, downloaded there when
        missing, as the CLI does (OsmnxSource.for_activity)."""
        return cls(
            {
                activity: ZoneGraphs(
                    OsmnxSource.for_activity(cache_dir, activity),
                    max_zones=ZONES_IN_MEMORY[activity],
                )
                for activity in SUPPORTED_ACTIVITIES
            }
        )

    def for_activity(self, activity: str) -> GraphLoader:
        check_supported(activity)
        graphs = self._graphs.get(activity)
        if graphs is None:
            raise InvalidRequestError(f"no {activity} routes on this API")
        return graphs


# What the API is given to draw with: the graphs of each activity, or, in
# the tests, one graph loader for every route.
Graphs = ActivityGraphs | GraphLoader


def source_for(graphs: Graphs, activity: str) -> GraphLoader:
    """The graphs a route of `activity` is drawn on: those of its network,
    or the only ones there are; on a network not its own the engine refuses
    to draw it (WrongNetworkError, an engine_error)."""
    if isinstance(graphs, ActivityGraphs):
        return graphs.for_activity(activity)
    return graphs
