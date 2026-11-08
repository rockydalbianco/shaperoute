"""Snowshoeing, a small shape placed freely on open snow (TASK-413,
ADR-0342)."""

from route_engine.activities.base import Activity

# 0.5-3 km, the user's choice 2 of 2026-11-08: on snow without woods a shape
# fits up to 2 km almost everywhere, at 3 km often not, and then the error
# says the distance it fits at.
ACTIVITY = Activity("snowshoeing", (500, 3_000), on_snow=True)
