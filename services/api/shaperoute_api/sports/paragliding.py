"""A paragliding flight, recorded without a shape (TASK-305 parts R,
ADR-0375), as a day of alpine skiing (TASK-375, ADR-0319): the planner of
shapes in the glide cone (ADR-0265) waits for an airspace licence. Out of
the shape game and without personal bests: its speeds are the wind's as
much as the pilot's. Strava has no type for it: "Workout"; its GPX says
"paragliding" in <type> (decided by the agent on the user's behalf)."""

from __future__ import annotations

from shaperoute_api.sports.base import ApiSport

SPORT = ApiSport(
    activity="paragliding",
    strava_type="Workout",
    record_only=True,
    gpx_type="paragliding",
)
