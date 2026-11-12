"""A wheelchair or a stroller, on the wheel network (TASK-414, ADR-0343): the
foot network without steps, raised kerbs, rough surfaces, steep ways and big
roads with no sidewalk; 1-5 km, a circle, a heart, a star or a moon."""

from __future__ import annotations

from shaperoute_api.sports.base import ApiSport, Distance, SportBests, Zones, at_speed

# Pushed (the user's choice 7): bests of its own over 1 and 5 km. Whoever
# pushes a wheelchair or a stroller does not reach a run's 25 km/h, the speed
# of a jump of the GPS on foot: the floor of both distances is that speed
# throughout, as a skate's is its own (decided by the agent on the user's
# behalf).
PUSHED_KMH = 25
PUSHED = SportBests(
    max_step_kmh=PUSHED_KMH,
    distances=tuple(
        Distance(name, metres, at_speed(metres, PUSHED_KMH))
        for name, metres in (("1k", 1_000), ("5k", 5_000))
    ),
)

# Its own network, so its own zones: as large as its longest route, 5 km,
# with the street names of the roads whose sidewalks are apart, as on foot.
# One in memory at a time beside the others (docs/sports/wheelchair.md,
# what it weighs). Strava and Apple Health call it a wheelchair for a
# stroller too (the user's choice 8); its GPX says "wheelchair" in <type>.
SPORT = ApiSport(
    activity="wheelchair",
    strava_type="Wheelchair",
    description="wheelchair for a wheelchair or a stroller, 1-5 km, a circle, a "
    "heart, a star or a moon, on its own network: no steps, raised kerbs, rough "
    "surfaces or big roads without a sidewalk (TASK-414)",
    zones=Zones(box="longest", street_names=True, in_memory=1),
    bests=PUSHED,
    gpx_type="wheelchair",
)
