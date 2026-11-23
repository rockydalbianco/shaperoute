"""A gravel ride, drawn as a ride on the bike network (TASK-378, ADR-0322):
a ride's zones, bests of its own."""

from __future__ import annotations

from shaperoute_api.sports.base import ApiSport
from shaperoute_api.sports.cycling import BY_BIKE

# The bike network's zones, as a walk has a run's (route_engine/walking.py).
# Its bests are a ride's distances and rules, apart from a ride's (the
# user's choice 6): personal_bests counts them for every run, as a ride's,
# and the profile shows those of the gravel rides. Its GPX says
# "gravel_biking" in <type> (decided by the agent on the user's behalf).
SPORT = ApiSport(
    activity="gravel_biking",
    strava_type="GravelRide",
    description="gravel_biking is drawn as cycling, on the bike network " "(TASK-378)",
    bests=BY_BIKE,
    gpx_type="gravel_biking",
)
