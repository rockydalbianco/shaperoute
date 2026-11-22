/**
 * The history of one exercise at the gym (TASK-483 part A, ADR-0392,
 * docs/API.md «Gym»): `GET /me/gym-history?exercise=` or `?name=`, only the
 * account's own sets. Mirrors services/api/shaperoute_api/gym_history.py;
 * example in fixtures/gym-history.json.
 */

import type { GymSet, GymSetKind, GymSource } from "./gym.ts";

/** What a workout's point reads: for a load the best estimated one-rep max
 * (Epley, from sets of at most 12 reps), the reps of a set of the body, the
 * seconds of a timed one, the metres of a cardio block when its machine
 * shows them, otherwise its seconds. */
export const GYM_HISTORY_MEASURES = [
  "estimated_1rm_kg",
  "reps",
  "duration_s",
  "distance_m",
] as const;
export type GymHistoryMeasure = (typeof GYM_HISTORY_MEASURES)[number];

/** The records an exercise has, by its kind: a load the first four, a set
 * of the body the reps and the weight added, a timed one the seconds, a
 * cardio block the metres (when shown) and the seconds. */
export const GYM_HISTORY_RECORDS = [
  "best_estimate_kg",
  "heaviest_kg",
  "most_reps",
  "best_volume_kg",
  "longest_s",
  "farthest_m",
] as const;
export type GymHistoryRecordKind = (typeof GYM_HISTORY_RECORDS)[number];

/** The sets of at most this many reps estimate a one-rep max. */
export const MAX_ESTIMATED_REPS = 12;

/** One workout on the chart. */
export interface GymHistoryPoint {
  /** The key of the workout. */
  workout: string;
  started_at: string;
  /** Its best, in the unit of `measure`. */
  value: number;
  /** For a load, false when no set had at most 12 reps and `value` is the
   * heaviest kg; true otherwise. */
  estimated: boolean;
  /** Better than every workout before it. */
  record: boolean;
}

export interface GymHistoryRecord {
  kind: GymHistoryRecordKind;
  value: number;
  workout: string;
  started_at: string;
  /** The set that made it; absent for the volume, which is a workout's. */
  set?: GymSet;
}

export interface GymHistoryWorkout {
  /** The key the app gave the workout. */
  id: string;
  started_at: string;
  source: GymSource;
  /** Its point's value; absent when none of its sets is of `kind`. */
  value?: number;
  /** Its sets of this exercise, in order. */
  sets: GymSet[];
}

export interface GymHistory {
  /** Its key in the catalog; absent for an exercise the runner named. */
  exercise?: string;
  /** A named exercise as last written; absent for one of the catalog. */
  name?: string;
  /** The kind of the catalog, or of the last set of a named exercise;
   * absent for a named one never done, as `measure`. */
  kind?: GymSetKind;
  measure?: GymHistoryMeasure;
  /** Every workout with it. */
  workouts_count: number;
  /** One a workout, all of them, oldest first. */
  points: GymHistoryPoint[];
  records: GymHistoryRecord[];
  /** A page, the newest first. */
  workouts: GymHistoryWorkout[];
  /** `before` for the next page; absent on the last one. */
  next?: string;
}
