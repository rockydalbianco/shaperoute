"""A hike, on the hike network (TASK-377, ADR-0321)."""

from route_engine.activities.base import Activity
from route_engine.networks.hike import HIKE_NETWORK_NAME

# 1-30 km, the user's choice: the limits of a walk.
ACTIVITY = Activity("hiking", (1_000, 30_000), network=HIKE_NETWORK_NAME)
