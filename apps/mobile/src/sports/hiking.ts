import { DISTANCE_LIMITS_M } from "@shaperoute/shared-types";

import type { SportProfile } from "./base";

/**
 * A hike (TASK-377, ADR-0321): 1–30 km on the trails and quiet roads of its
 * own network, which only the server draws on. Not offered yet: «Settings»
 * has no row for it until part B, which also gives its name its texts
 * (`tLater`) in the four languages.
 */
export const HIKING: SportProfile = {
  activity: "hiking",
  name: "Hike",
  emoji: "⛰️",
  timeAt: "walker",
  drawKm: [DISTANCE_LIMITS_M.hiking[0] / 1000, DISTANCE_LIMITS_M.hiking[1] / 1000],
  // `.hiking`.
  appleWorkout: 24,
  // On foot, as Apple's own Workout app counts a hike.
  appleDistance: "HKQuantityTypeIdentifierDistanceWalkingRunning",
  // EXERCISE_TYPE_HIKING.
  healthConnect: 37,
  // ACSM walking, as a walk, the climb included: VO₂ = 3.5 + 0.1·v + 1.8·v·grade.
  energy: { kind: "oxygen", mlKgPerM: 0.1, mlKgPerMUp: 1.8 },
  freeRunAs: "hiking",
};
