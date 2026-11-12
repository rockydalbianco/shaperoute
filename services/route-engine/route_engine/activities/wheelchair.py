"""A wheelchair or a stroller, on the wheel network (TASK-414, ADR-0343)."""

from route_engine.activities.base import Activity
from route_engine.networks.wheel import WHEEL_NETWORK_NAME

# 1-5 km (the user's choice 4), and only the simple shapes (choice 5): a
# circle, a heart, a star, a moon.
ACTIVITY = Activity(
    "wheelchair",
    (1_000, 5_000),
    network=WHEEL_NETWORK_NAME,
    shapes=("circle", "heart", "star", "moon"),
)
