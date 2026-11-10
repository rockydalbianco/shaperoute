import { DISTANCE_LIMITS_M } from "@shaperoute/shared-types";

import type { SportProfile } from "./base";

/**
 * Snowshoeing (TASK-413, ADR-0342): a small shape of the catalogue, 0.5–3 km,
 * placed freely on open snow by the server, as a paddling route on the water.
 * Not offered yet: «Settings» has no row for it and the search leaves it out
 * until part B, which also gives its name and its caution their texts
 * (`tLater`) in the four languages, the safety notice before the first
 * «Start», its time and its calories.
 */
export const SNOWSHOEING: SportProfile = {
  activity: "snowshoeing",
  name: "Snowshoes",
  // No emoji of snowshoes exists (the user's choice 1).
  emoji: "❄️",
  // A shape of the catalogue only: the engine places it where the snow has
  // room, as on the water.
  noWords: true,
  noImages: true,
  drawKm: [
    DISTANCE_LIMITS_M.snowshoeing[0] / 1000,
    DISTANCE_LIMITS_M.snowshoeing[1] / 1000,
  ],
  drawMi: [0.5, 1.5],
  step: 0.5,
  startKm: 1,
  // `.hiking`: Apple Health has no type for it (part B checks again).
  appleWorkout: 24,
  // On foot, as a hike.
  appleDistance: "HKQuantityTypeIdentifierDistanceWalkingRunning",
  // EXERCISE_TYPE_SNOWSHOEING.
  healthConnect: 63,
  freeRunAs: "snowshoeing",
};
