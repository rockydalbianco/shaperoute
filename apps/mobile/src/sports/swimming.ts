import { DISTANCE_LIMITS_M } from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import type { MetBand, SportProfile } from "./base";

/** A swim goes by half a km, or half a mile (TASK-323 C2, the user's
 * choice): 0.5 to 3 km are six steps, whole km would be three. */
export const SWIM_STEP = 0.5;

/** Where it starts for a swim (TASK-323 C2, the user's choice): 1 km, two
 * laps of most shapes on a straight coast (ADR-0283). */
export const SWIMMING_START_KM = 1;

/** HKWorkoutSwimmingLocationType.pool: a swim in a pool in Apple Health
 * (TASK-400 part B, ADR-0334). */
export const APPLE_POOL_LOCATION = 1;

/** ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL (TASK-400 part B). */
export const HEALTH_CONNECT_POOL = 74;

/**
 * The MET of a swim at its average speed (TASK-424 part C2, the user's
 * choice of 2026-11-10: calories for every activity): the bands of a swim
 * in a pool (pool/poolKcal.ts, Compendium 2024, crawl), from their paces
 * /100 m — 2:18, 1:45 and 1:13 — to km/h.
 */
const BANDS: readonly MetBand[] = [
  { belowKmh: 360 / 138, met: 5.8 },
  { belowKmh: 360 / 105, met: 8.0 },
  { belowKmh: 360 / 73, met: 10.5 },
  { belowKmh: Infinity, met: 14.5 },
];

/**
 * A swim (TASK-323), «Swim» since TASK-400 (ADR-0334): in open water, or in
 * a pool, chosen in «Draw» (src/pool). In open water its own limits, 0.5–3 km, by half a km;
 * with «Miles» by half a mile, 0.5 to 1.5 (0.8 to 2.4 km: 2 mi are past
 * the 3 km). Its energy in open water is a pool's (TASK-424 part C2); a
 * swim in a pool counts its own (pool/poolKcal.ts), on its lengths.
 */
export const SWIMMING: SportProfile = {
  activity: "swimming",
  name: tLater("Swim"),
  emoji: "🏊",
  pace: "swim",
  onWater: true,
  noWords: true,
  laps: true,
  // Swum between the parts, lap after lap.
  partsBetween: {
    km: tLater("{drawn} km of drawing + {between} km swimming between the parts"),
    mi: tLater("{drawn} mi of drawing + {between} mi swimming between the parts"),
  },
  drawKm: [DISTANCE_LIMITS_M.swimming[0] / 1000, DISTANCE_LIMITS_M.swimming[1] / 1000],
  drawMi: [0.5, 1.5],
  step: SWIM_STEP,
  startKm: SWIMMING_START_KM,
  // `.swimming`; a swim in a pool says so (APPLE_POOL_LOCATION), one in
  // open water not yet (TASK-323 E).
  appleWorkout: 46,
  appleDistance: "HKQuantityTypeIdentifierDistanceSwimming",
  // EXERCISE_TYPE_SWIMMING_OPEN_WATER (TASK-323).
  healthConnect: 73,
  freeRunAs: "swimming",
  energy: { kind: "met", bands: BANDS },
};
