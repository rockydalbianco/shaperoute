"""Snowshoeing on open snow (TASK-413, ADR-0342): a small shape of the
catalogue placed freely on the snow one may walk on, as a paddling route on
the water, reached from a way in on foot."""

from __future__ import annotations

from shaperoute_api.sports.base import ApiSport

# No network, so no zones (the snow is downloaded at the first request of a
# place, as the water). No bests, as a hike (the user's choice 5). Strava
# calls it "Snowshoe"; its GPX says "snowshoeing" in <type>.
SPORT = ApiSport(
    activity="snowshoeing",
    strava_type="Snowshoe",
    description="snowshoeing on open snow, 0.5-3 km, a shape of the catalogue "
    "only, away from slopes over 25 degrees, woods, pistes, rock and "
    "villages, from a way in on foot (TASK-413)",
    gpx_type="snowshoeing",
)
