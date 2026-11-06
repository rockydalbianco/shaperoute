"""The MTB network: mountain bike rides (TASK-378, ADR-0322).

The bike network (networks/bike.py, ADR-0153, ADR-0167) with more ways
ridden: the paths and bridleways not closed to bikes up to mtb:scale S2,
and those that give no mtb:scale up to sac_scale T2, "mountain hiking" (the
user's choices of 2026-11-05). The bike rides every track already. Every
other way is ridden as by bike; what a bike may not ride is walked with the
bike on foot as on the bike network, one-way streets kept one way. Its
download is the bike network's, with the two scales kept on the edges.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from route_engine.networks.base import BBox, Filter, Graph, Network
from route_engine.networks.bike import (
    BIKE_ALLOWED,
    BIKE_BANNED,
    BIKE_FILTER,
    BIKE_TAGS,
    NO_ENTRY,
    bike_ways,
    download_ways,
    rideable,
)

MTB_NETWORK_NAME = "mtb"
# The ways for walking an MTB may ride where a bike walks.
TRAILS = frozenset({"path", "bridleway"})
# The hardest mtb:scale ridden, S2 (the user's choice 5).
MTB_SCALE_LIMIT = 2
# Ridden when they give a bike any mtb:scale, as on a gravel bike: the
# paths open to bikes up to S1 (docs/sports/gravel.md, the bench).
OPEN_SCALE_LIMIT = 1
# The grades of sac_scale ridden on a trail with no mtb:scale: T1 and T2.
EASY_SAC = frozenset({"hiking", "mountain_hiking"})
# The tags the rules read, kept on the edges besides the bike network's.
MTB_TAGS = (*BIKE_TAGS, "mtb:scale", "sac_scale")


def mtb_scale(tags: Mapping[str, Any]) -> int | None:
    """mtb:scale as a number ("2+" is 2), None when untagged or unreadable."""
    value = str(tags.get("mtb:scale") or "")
    return int(value[0]) if value[:1].isdigit() else None


def closed_to_bikes(tags: Mapping[str, Any]) -> bool:
    """Whether a way is closed to bikes (`bicycle=no` and the like) or to
    every vehicle (`access`, `vehicle`)."""
    return (
        tags.get("bicycle") in BIKE_BANNED
        or tags.get("access") in NO_ENTRY
        or tags.get("vehicle") in NO_ENTRY
    )


def mtb_rideable(tags: Mapping[str, Any]) -> bool:
    """Whether an MTB may ride a way with these tags (ADR-0322).

    A path or a bridleway open to bikes (`bicycle` yes, designated...) up to
    mtb:scale S1, or with none; one not closed to bikes up to S2, or, with no
    mtb:scale, up to sac_scale T2 or with none. Any other way as by bike
    (`rideable`): tracks of every grade, roads, cycleways."""
    if tags.get("highway") not in TRAILS:
        return rideable(tags)
    level = mtb_scale(tags)
    if tags.get("bicycle") in BIKE_ALLOWED and (
        level is None or level <= OPEN_SCALE_LIMIT
    ):
        return True
    if closed_to_bikes(tags):
        return False
    if level is not None:
        return level <= MTB_SCALE_LIMIT
    sac = tags.get("sac_scale")
    return sac is None or sac in EASY_SAC


def download_mtb_graph(bbox: BBox, custom_filter: Filter) -> Graph:
    """The MTB network of `bbox` from Overpass, every piece of it, named so
    (network.check_network)."""
    return bike_ways(
        download_ways(bbox, custom_filter, MTB_TAGS), mtb_rideable, MTB_NETWORK_NAME
    )


# The bike network's filter: it downloads the paths and bridleways already,
# to walk them with the bike on foot.
NETWORK = Network(MTB_NETWORK_NAME, BIKE_FILTER, download_mtb_graph, by_bike=True)
