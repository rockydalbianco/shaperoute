import type { LatLon } from "@shaperoute/shared-types";

import { glideOf } from "./glide";
import { nearestLanding } from "./nearestLanding";
import { destination } from "./taskRoute";
import type { Waypoint } from "./waypoints";

// An invented place and invented landings.
const HERE: LatLon = [46, 11];

function point(
  name: string,
  northKm: number,
  landing: boolean,
  altM: number | null = 400,
): Waypoint {
  return {
    name,
    code: null,
    point: destination(HERE, 0, northKm * 1000),
    altM,
    landing,
    description: null,
  };
}

it("finds the nearest landing, not the nearest waypoint", () => {
  const near = nearestLanding(
    [
      point("HILL", 1, false),
      point("FAR FIELD", 8, true),
      point("NEAR FIELD", 4, true),
    ],
    HERE,
    1400,
    glideOf(null),
  );
  expect(near?.landing.name).toBe("NEAR FIELD");
  // The sphere puts the field, the ellipsoid measures it: within metres.
  expect(near?.distM).toBeCloseTo(4000, -1);
  expect(near?.bearingDeg).toBeCloseTo(0, 3);
  // 4 km at L/D 8 takes 500 m: 1400 − 500 − 400 over the field.
  expect(near?.overM).toBeCloseTo(500, -1);
});

it("is a number below the field too, never a «yes» or «no»", () => {
  const near = nearestLanding([point("FIELD", 8, true)], HERE, 900, glideOf(null));
  expect(near?.overM).toBeCloseTo(-500, -1);
});

it("has no height without the field's or the pilot's", () => {
  expect(
    nearestLanding([point("FIELD", 2, true, null)], HERE, 900, glideOf(null))?.overM,
  ).toBeNull();
  expect(
    nearestLanding([point("FIELD", 2, true)], HERE, null, glideOf(null))?.overM,
  ).toBeNull();
});

it("is none without landings", () => {
  expect(
    nearestLanding([point("HILL", 1, false)], HERE, 900, glideOf(null)),
  ).toBeNull();
});
