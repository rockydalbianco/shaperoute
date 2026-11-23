"""An MTB ride, on the MTB network (TASK-378, ADR-0322): the bike network
with the trails up to mtb:scale S2 ridden too."""

from __future__ import annotations

from shaperoute_api.sports.base import ApiSport, Zones
from shaperoute_api.sports.cycling import BY_BIKE

# Its own network, so its own zones: as large as a ride's for 30 km, with no
# street names, as a ride's. One in memory at a time beside the bike one
# (docs/sports/gravel.md, what it weighs). Its bests are a ride's distances
# and rules, apart from a ride's (the user's choice 6). Its GPX says
# "mountain_biking" in <type> (decided by the agent on the user's behalf).
SPORT = ApiSport(
    activity="mountain_biking",
    strava_type="MountainBikeRide",
    description="mountain_biking on the bike network with the trails up to "
    "mtb:scale S2, or sac_scale T2 when they give none (TASK-378)",
    zones=Zones(box="longest", street_names=False, in_memory=1),
    bests=BY_BIKE,
    gpx_type="mountain_biking",
)
