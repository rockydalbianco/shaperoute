"""Mountain biking, on the MTB network (TASK-378, ADR-0322)."""

from route_engine.activities.base import Activity
from route_engine.networks.mtb import MTB_NETWORK_NAME

# 10-30 km, the user's choice: the limits of a ride.
ACTIVITY = Activity("mountain_biking", (10_000, 30_000), network=MTB_NETWORK_NAME)
