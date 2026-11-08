import { CYCLING_BEST_DISTANCES, DISTANCE_LIMITS_M } from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import type { MetBand, SportProfile } from "./base";

const MPH_KMH = 1.609344;

/** Bicycling, Compendium 2024, as a ride (cycling.ts): under 10 mph 4.0
 * (01010), 10–11.9 6.8, 12–13.9 8.0, 14–15.9 10.0, 16–19 12.0 (01050), 20
 * and over 15.8. A sport's file imports no other sport's. */
const BANDS: readonly MetBand[] = [
  { belowKmh: 10 * MPH_KMH, met: 4.0 },
  { belowKmh: 12 * MPH_KMH, met: 6.8 },
  { belowKmh: 14 * MPH_KMH, met: 8.0 },
  { belowKmh: 16 * MPH_KMH, met: 10.0 },
  { belowKmh: 20 * MPH_KMH, met: 12.0 },
  { belowKmh: Infinity, met: 15.8 },
];

/**
 * A gravel ride (TASK-378, ADR-0322): 10–30 km, drawn by the server as a
 * ride on the bike network. «Settings» has its row since part B, «Soon»
 * until the server has part A.
 */
export const GRAVEL_BIKING: SportProfile = {
  activity: "gravel_biking",
  name: tLater("Gravel"),
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
  energy: { kind: "met", bands: BANDS },
  freeRunAs: "gravel_biking",
  rides: true,
};
