"""A day of ski touring, up on skins and down on skis, recorded without a
shape (TASK-415, ADR-0344), as a day of alpine skiing (TASK-375, ADR-0319).
Out of the shape game and without personal bests, as skiing: its speeds are
no runner's nor rider's. Strava calls it "BackcountrySki"; its GPX says
"ski_touring" in <type> (decided by the agent on the user's behalf)."""

from __future__ import annotations

from shaperoute_api.sports.base import ApiSport

SPORT = ApiSport(
    activity="ski_touring",
    strava_type="BackcountrySki",
    record_only=True,
    gpx_type="ski_touring",
)
