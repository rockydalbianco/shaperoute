import { CYCLING_BEST_DISTANCES, DISTANCE_LIMITS_M } from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import type { SportProfile } from "./base";

/**
 * An MTB ride (TASK-378, ADR-0322): 10–30 km on the trails and the roads of
 * its own network, which only the server draws on. «Settings» has its row
 * since part B, «Soon» until the server has part A.
 */
export const MOUNTAIN_BIKING: SportProfile = {
  activity: "mountain_biking",
  name: tLater("MTB"),
  emoji: "🚵",
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
    DISTANCE_LIMITS_M.mountain_biking[0] / 1000,
    DISTANCE_LIMITS_M.mountain_biking[1] / 1000,
  ],
  // `.cycling`: Apple has no MTB ride of its own.
  appleWorkout: 13,
  appleDistance: "HKQuantityTypeIdentifierDistanceCycling",
  // EXERCISE_TYPE_BIKING: nor has Health Connect.
  healthConnect: 8,
  // «Bicycling, mountain, general», Compendium 2024 (01009): 8.5 at any
  // speed, which on a trail says little of the effort.
  energy: { kind: "met", bands: [{ belowKmh: Infinity, met: 8.5 }] },
  freeRunAs: "mountain_biking",
  rides: true,
  // Its trails go up to mtb:scale S2 (the user's choice 5).
  caution: tLater("Trails can be technical: check the route before you set off."),
};
