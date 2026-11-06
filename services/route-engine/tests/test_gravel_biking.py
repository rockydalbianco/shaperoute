"""A gravel ride (TASK-378 part A, ADR-0322): the API's activity
"gravel_biking", 10-30 km, drawn as a ride on the bike network, as a walk is
drawn as a run (route_engine/walking.py). The engine itself does not know it
(models.py and network.py are as before), so the routes kept keep their
fingerprint."""

from __future__ import annotations

from pathlib import Path

import pytest

from route_engine import walking
from route_engine.models import (
    DISTANCE_LIMITS_M,
    SUPPORTED_ACTIVITIES,
    InvalidRequestError,
    RouteRequest,
)
from route_engine.network import BIKE_NETWORK_NAME, NETWORKS, OsmnxSource

START = (46.0122, 11.2986)


def test_a_gravel_ride_is_an_activity_of_the_api_not_of_the_engine() -> None:
    assert "gravel_biking" in walking.API_ACTIVITIES
    assert "gravel_biking" not in SUPPORTED_ACTIVITIES
    assert "gravel_biking" not in DISTANCE_LIMITS_M
    assert "gravel_biking" not in NETWORKS
    assert walking.API_DISTANCE_LIMITS_M["gravel_biking"] == (10_000, 30_000)


def test_the_api_offers_it_after_the_walk_both_drawn_as_another() -> None:
    assert walking.API_ACTIVITIES == (
        *SUPPORTED_ACTIVITIES,
        "walking",
        "gravel_biking",
    )
    assert walking.DRAWN_AS == {
        "walking": ("running", (1_000, 30_000)),
        "gravel_biking": ("cycling", (10_000, 30_000)),
    }


def test_a_gravel_ride_is_within_the_distances_of_a_ride() -> None:
    low, high = walking.GRAVEL_DISTANCE_M
    ride_low, ride_high = DISTANCE_LIMITS_M[walking.RIDE]
    assert ride_low <= low and high <= ride_high


def test_a_gravel_ride_goes_on_the_bike_network_with_no_network_of_its_own() -> None:
    assert walking.drawn_as("gravel_biking") == "cycling"
    assert NETWORKS[walking.drawn_as("gravel_biking")] == BIKE_NETWORK_NAME
    source = OsmnxSource.for_activity(Path("cache"), walking.drawn_as("gravel_biking"))
    assert source.network_name == BIKE_NETWORK_NAME
    bbox = (46.0, 11.0, 46.1, 11.1)
    # The bike zones of a ride: no file of its own.
    assert source.cache_path(bbox).name.startswith("bike_")


@pytest.mark.parametrize("distance", [10_000, 20_000, 30_000])
def test_a_gravel_ride_asks_the_engine_for_a_ride(distance: int) -> None:
    activity = walking.engine_activity("gravel_biking", distance)
    request = RouteRequest(
        start=START, shape="heart", distance_m=distance, activity=activity
    )
    assert request.activity == "cycling"


@pytest.mark.parametrize("distance", [1_000, 9_999, 30_001, 50_000])
def test_a_gravel_ride_out_of_its_distances_is_refused(distance: int) -> None:
    with pytest.raises(
        InvalidRequestError, match="10000 and 30000 metres for gravel_biking"
    ):
        walking.engine_activity("gravel_biking", distance)


def test_a_walk_is_drawn_as_before() -> None:
    assert walking.drawn_as("walking") == "running"
    assert walking.engine_activity("walking", 5_000) == "running"
    with pytest.raises(InvalidRequestError, match="1000 and 30000 metres for walking"):
        walking.engine_activity("walking", 999)


def test_the_activities_of_the_engine_are_drawn_as_they_are() -> None:
    for activity in SUPPORTED_ACTIVITIES:
        assert walking.drawn_as(activity) == activity
        assert walking.engine_activity(activity, 40_000) == activity
