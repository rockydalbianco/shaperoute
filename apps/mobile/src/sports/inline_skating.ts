import { DISTANCE_LIMITS_M } from "@shaperoute/shared-types";

import type { SportProfile } from "./base";

/**
 * Inline skating (TASK-380, ADR-0324): 5–30 km on the smooth paved ways of
 * its own network, which only the server draws on. Not offered yet:
 * «Settings» has no row for it until part B, which also gives its name its
 * texts (`tLater`) in the four languages, its bests, its energy from the
 * Compendium and its caution.
 */
export const INLINE_SKATING: SportProfile = {
  activity: "inline_skating",
  name: "Roller",
  emoji: "🛼",
  drawKm: [
    DISTANCE_LIMITS_M.inline_skating[0] / 1000,
    DISTANCE_LIMITS_M.inline_skating[1] / 1000,
  ],
  // `.skatingSports`; Apple Health counts no distance of skating a day.
  appleWorkout: 39,
  // EXERCISE_TYPE_SKATING.
  healthConnect: 60,
  // No energy counted until part B.
  freeRunAs: "inline_skating",
};
