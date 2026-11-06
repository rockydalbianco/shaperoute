import { CYCLING_BEST_DISTANCES, DISTANCE_LIMITS_M } from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import type { SportProfile } from "./base";

/**
 * A gravel ride (TASK-378, ADR-0322): 10–30 km, drawn by the server as a
 * ride on the bike network. Not offered yet:
 * «Settings» has no row for it until part B, which also gives its name its
 * texts (`tLater`) in the four languages and its energy from the
 * Compendium, and checks its numbers on the libraries.
 */
export const GRAVEL_BIKING: SportProfile = {
  activity: "gravel_biking",
  name: "Gravel",
  emoji: "🚲",
  // A ride's texts between the parts and the letters (the user's choice 7).
  partsBetween: {
    km: tLater("{drawn} km of drawing + {between} km riding between the parts"),
    mi: tLater("{drawn} mi of drawing + {between} mi riding between the parts"),
  },
  lettersBetween: {
    km: tLater("{letters} km of letters + {between} km riding between them"),
    mi: tLater("{letters} mi of letters + {between} mi riding between them"),
  },
  // A ride's distances, bests of its own (the user's choice 6).
  bests: { distances: CYCLING_BEST_DISTANCES, named: "km" },
  drawKm: [
    DISTANCE_LIMITS_M.gravel_biking[0] / 1000,
    DISTANCE_LIMITS_M.gravel_biking[1] / 1000,
  ],
  // `.cycling`: Apple has no gravel ride of its own.
  appleWorkout: 13,
  appleDistance: "HKQuantityTypeIdentifierDistanceCycling",
  // EXERCISE_TYPE_BIKING: nor has Health Connect.
  healthConnect: 8,
  // No energy counted until part B.
  freeRunAs: "gravel_biking",
};
