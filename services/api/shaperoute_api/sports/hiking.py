"""A hike, on the hike network (TASK-377, ADR-0321): the foot network
without the roads cars use and without the trails beyond sac_scale T3."""

from __future__ import annotations

from shaperoute_api.sports.base import ApiSport, Zones

# Its own network, so its own zones: around a city as a run's, with the
# street names of the roads whose sidewalks are apart, as on foot. One in
# memory at a time beside the foot and bike ones (decided by the agent on
# the user's behalf). No bests, as a walk (the user's choice 5). Its GPX
# says "hiking" in <type>.
SPORT = ApiSport(
    activity="hiking",
    strava_type="Hike",
    description="hiking on the trails and quiet roads of its own network, "
    "no roads cars use, no trails beyond sac_scale T3 (TASK-377)",
    zones=Zones(box="explore", street_names=True, in_memory=1),
    gpx_type="hiking",
)
