"""Inline skating, on the roller network (TASK-380, ADR-0324)."""

from route_engine.activities.base import Activity
from route_engine.networks.roller import ROLLER_NETWORK_NAME

# 5-30 km, the user's choice 3.
ACTIVITY = Activity("inline_skating", (5_000, 30_000), network=ROLLER_NETWORK_NAME)
