import { tLater } from "../i18n";
import type { SportProfile } from "./base";

/**
 * A day of alpine skiing, recorded without a shape (TASK-375, ADR-0319).
 * Apple Health keeps the workout's total only: its own distances would be
 * a new permission to ask. Its energy (TASK-424 part C2, the user's
 * choice of 2026-11-10, «Formula da sci»): the MET of downhill skiing,
 * moderate effort, active time only (Compendium 2024: 5.3), on the
 * descents alone — the metres and the seconds of `snowDay`, lifts left out.
 */
export const SKIING: SportProfile = {
  activity: "skiing",
  name: tLater("Ski"),
  emoji: "⛷️",
  skied: true,
  // `.downhillSkiing`.
  appleWorkout: 61,
  // EXERCISE_TYPE_SKIING, downhill and cross-country alike.
  healthConnect: 61,
  // No numbers of its own until part C: a ride's speeds in km/h.
  freeRunAs: "cycling",
  energy: { kind: "met", bands: [{ belowKmh: Infinity, met: 5.3 }] },
};
