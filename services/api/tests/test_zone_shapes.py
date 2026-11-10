"""The zones of the longest routes stay as they were when the catalogue grew
(TASK-418, ADR-0346): every zone kept on the server keeps its key."""

from __future__ import annotations

import pytest
from route_engine.models import DISTANCE_LIMITS_M
from route_engine.shapes import SUPPORTED_SHAPES

from shaperoute_api.prefetch_zones import ZONE_SHAPES, longest_route_box

CENTRE = (45.0, 9.0)
# The boxes main gave on 2026-11-10, before the new shapes, around CENTRE.
BEFORE = {
    "running": (44.82, 8.7454, 45.18, 9.2546),
    "cycling": (44.883, 8.8345, 45.117, 9.1655),
    "paddling": (44.9617, 8.9459, 45.0383, 9.0541),
    "swimming": (44.968, 8.9548, 45.032, 9.0452),
    "hiking": (44.883, 8.8345, 45.117, 9.1655),
    "mountain_biking": (44.883, 8.8345, 45.117, 9.1655),
    "inline_skating": (44.883, 8.8345, 45.117, 9.1655),
    "snowshoeing": (44.968, 8.9548, 45.032, 9.0452),
}


def test_the_zone_shapes_are_the_catalogue_before_the_new_shapes() -> None:
    assert len(ZONE_SHAPES) == 17
    assert set(ZONE_SHAPES) <= set(SUPPORTED_SHAPES)
    # The catalogue grew past them: the new shapes leave the zones alone.
    assert {"pear", "leaning_tower"} <= set(SUPPORTED_SHAPES) - set(ZONE_SHAPES)


@pytest.mark.parametrize("activity", sorted(BEFORE))
def test_the_box_of_the_longest_route_does_not_move(activity: str) -> None:
    box = longest_route_box(activity)(CENTRE)
    assert box == pytest.approx(BEFORE[activity], abs=1e-6)


def test_every_activity_with_a_longest_route_is_checked() -> None:
    assert set(BEFORE) <= set(DISTANCE_LIMITS_M)
