"""What an activity of the register is (TASK-376, ADR-0320)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Activity:
    # Its name in the contract (packages/shared-types ACTIVITIES).
    name: str
    # Its target distances, [lowest, highest] in metres.
    distance_m: tuple[int, int]
    # The network of networks/ it is drawn on, by name; None on the water
    # and on the snow.
    network: str | None = None
    # Drawn on a lake or the sea, with no road network: where the shape fits
    # on the water it is the route (water_fit.py, ADR-0154).
    on_water: bool = False
    # On the water, also a drawn outline, an image's or one drawn by hand.
    drawn_on_water: bool = False
    # Drawn on open snow, with no network: as on the water, where the shape
    # fits on the snow one may walk on it is the route (snow.py, ADR-0342).
    on_snow: bool = False
    # The shapes of the catalogue it draws, and nothing else: no other
    # shape, no word, no image or outline (TASK-414, ADR-0343). None: every
    # one the activity's place allows.
    shapes: tuple[str, ...] | None = None
