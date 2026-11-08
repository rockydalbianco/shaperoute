import {
  DISTANCE_LIMITS_M,
  INLINE_SKATING_BEST_DISTANCES,
} from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import type { MetBand, SportProfile } from "./base";

/** Roller blading, in-line skating, Compendium 2024: 14.4 km/h 7.5 (15591),
 * 17.7 km/h 9.8 (15592), 21.0–21.7 km/h 12.3 (15593), 24.0 km/h 15.5
 * (15594); each band up to halfway to the next speed. */
const BANDS: readonly MetBand[] = [
  { belowKmh: 16, met: 7.5 },
  { belowKmh: 19.5, met: 9.8 },
  { belowKmh: 23, met: 12.3 },
  { belowKmh: Infinity, met: 15.5 },
];

/**
 * Inline skating (TASK-380, ADR-0324): 5–30 km on the smooth paved ways of
 * its own network, which only the server draws on. «Settings» has its row
 * since part B, «Soon» until the server has part A.
 */
export const INLINE_SKATING: SportProfile = {
  activity: "inline_skating",
  name: tLater("Roller"),
  emoji: "🛼",
  // At the skater's own pace, 4:00 a km before there is any (the user's
  // choice, 2026-11-06).
  timeAt: "skater",
  // A run's races, bests of their own (the user's choice 4).
  bests: { distances: INLINE_SKATING_BEST_DISTANCES, named: "race" },
  drawKm: [
    DISTANCE_LIMITS_M.inline_skating[0] / 1000,
    DISTANCE_LIMITS_M.inline_skating[1] / 1000,
  ],
  // `.skatingSports`; Apple Health counts no distance of skating a day.
  appleWorkout: 39,
  // EXERCISE_TYPE_SKATING.
  healthConnect: 60,
  energy: { kind: "met", bands: BANDS },
  freeRunAs: "inline_skating",
  // Skaters share the roads and go fast downhill (the user's choice 5).
  caution: tLater(
    "Watch for traffic and steep descents: check the route before you set off.",
  ),
};
