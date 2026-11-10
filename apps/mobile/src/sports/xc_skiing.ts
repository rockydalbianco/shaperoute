import { tLater } from "../i18n";
import type { MetBand, SportProfile } from "./base";

/** A mile an hour in km/h: the Compendium's speeds are in mph. */
const MPH_KMH = 1.609344;

/** The MET of cross-country skiing at its average moving speed
 * (Compendium 2024): slow, under 4 mph; moderate, 4.0–4.9 mph; brisk,
 * 5.0–7.9 mph; racing, 8 mph and more. */
const BANDS: readonly MetBand[] = [
  { belowKmh: 4 * MPH_KMH, met: 6.8 },
  { belowKmh: 5 * MPH_KMH, met: 9.0 },
  { belowKmh: 8 * MPH_KMH, met: 12.5 },
  { belowKmh: Infinity, met: 15.0 },
];

/** A day of cross-country skiing, recorded without a shape (TASK-375,
 * ADR-0319), as alpine skiing. Its energy from its average moving speed
 * (TASK-424 part C2, the user's choice of 2026-11-10: calories for every
 * activity). */
export const XC_SKIING: SportProfile = {
  activity: "xc_skiing",
  name: tLater("Cross-country ski"),
  emoji: "🎿",
  // `.crossCountrySkiing`.
  appleWorkout: 60,
  // EXERCISE_TYPE_SKIING: Health Connect has no type of its own for it.
  healthConnect: 61,
  // No numbers of its own until part C: a runner's pace.
  freeRunAs: undefined,
  energy: { kind: "met", bands: BANDS },
};
