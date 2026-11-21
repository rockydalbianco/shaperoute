"""The sports of the API (TASK-376, ADR-0320), in the order of the contract
(packages/shared-types RUN_ACTIVITIES, then TRACKLESS_ACTIVITIES): those
planned by the engine, those recorded without a shape, then those saved
without a track (TASK-385). A new sport is a file of this folder and a line
here."""

from __future__ import annotations

from shaperoute_api.sports import (
    alpinism,
    cycling,
    gravel_biking,
    gym,
    hiking,
    inline_skating,
    mountain_biking,
    paddling,
    paragliding,
    running,
    ski_touring,
    skiing,
    snowshoeing,
    swimming,
    walking,
    wheelchair,
    xc_skiing,
)
from shaperoute_api.sports.base import ApiSport

API_SPORTS: tuple[ApiSport, ...] = (
    running.SPORT,
    cycling.SPORT,
    paddling.SPORT,
    swimming.SPORT,
    hiking.SPORT,
    mountain_biking.SPORT,
    inline_skating.SPORT,
    snowshoeing.SPORT,
    wheelchair.SPORT,
    walking.SPORT,
    gravel_biking.SPORT,
    skiing.SPORT,
    xc_skiing.SPORT,
    ski_touring.SPORT,
    paragliding.SPORT,
    alpinism.SPORT,
    gym.SPORT,
)
SPORTS_BY_ACTIVITY: dict[str, ApiSport] = {s.activity: s for s in API_SPORTS}
