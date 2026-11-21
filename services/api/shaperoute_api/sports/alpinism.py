"""A day of alpinism, recorded without a shape (TASK-463, ADR-0373, the
user's choice «Sì, registrato senza percorso» of 2026-11-11), as a day of
ski touring (TASK-415) and a paragliding flight (TASK-305 parts R): a climb
on rock, snow and ice has no shape to draw. Out of the shape game and
without personal bests: its speeds are the mountain's. Strava has no type
for it: "Hike"; its GPX says "alpinism" in <type> (technical values chosen
by the agent, which the user may change: one line here)."""

from __future__ import annotations

from shaperoute_api.sports.base import ApiSport

SPORT = ApiSport(
    activity="alpinism",
    strava_type="Hike",
    record_only=True,
    gpx_type="alpinism",
)
