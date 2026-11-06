"""Inline skating, on the roller network (TASK-380, ADR-0324): the smooth
paved ways, no primary or secondary roads, every way both ways."""

from __future__ import annotations

from shaperoute_api.sports.base import ApiSport, Distance, SportBests, Zones, at_speed

# On skates (the user's choice 4): bests of its own over a run's distances,
# apart from a run's. A descent goes faster than any race on skates (the
# road marathon is skated at about 45 km/h): the floor is the speed of a jump
# of the GPS, 60 km/h throughout, as a ride's is 90 (decided by the agent on
# the user's behalf).
ON_SKATES_KMH = 60
ON_SKATES = SportBests(
    max_step_kmh=ON_SKATES_KMH,
    distances=tuple(
        Distance(name, metres, at_speed(metres, ON_SKATES_KMH))
        for name, metres in (
            ("5k", 5_000),
            ("10k", 10_000),
            ("half", 21_097.5),
            ("marathon", 42_195),
        )
    ),
)

# Its own network, so its own zones: as large as a ride's for 30 km, its
# longest skate, with no street names, as a ride's: its graphs hold the
# sidewalks beside the roads. One in memory at a time beside the bike one
# (docs/sports/roller.md, what it weighs). Its GPX says "inline_skating" in
# <type> (decided by the agent on the user's behalf).
SPORT = ApiSport(
    activity="inline_skating",
    strava_type="InlineSkate",
    description="inline_skating on the smooth paved ways of its own network, "
    "no primary or secondary roads, every way both ways (TASK-380)",
    zones=Zones(box="longest", street_names=False, in_memory=1),
    bests=ON_SKATES,
    gpx_type="inline_skating",
)
