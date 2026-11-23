import type { LiveStats } from "@shaperoute/shared-types";

import { climbM } from "../navigation/runMetrics";
import { activeMs, type Track } from "../navigation/trackRecorder";

/**
 * The numbers of the moment a live link sends (TASK-424 part B1): read from
 * the track as the recording screen has it, at the time of the update, in
 * the whole units and within the bounds the API takes (`LiveStatsBody`).
 * The calories come as the screen counts them; the heart rate from the
 * watch, when there is one.
 */

const MAX_DISTANCE_M = 2_000_000;
const MAX_DURATION_S = 200_000;
const MAX_CLIMB_M = 50_000;
const MAX_KCAL = 50_000;
const MIN_BPM = 25;
const MAX_BPM = 250;
const MAX_LENGTHS = 1000;
const MAX_EXERCISE_CHARS = 80;

function whole(value: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round(value)));
}

function wholeOrNull(value: number | null, max: number): number | null {
  return value === null || !Number.isFinite(value) ? null : whole(value, max);
}

/** The screen's «Calories», "187", as a number; null for none. */
export function kcalOf(energy: string | null): number | null {
  if (energy === null) {
    return null;
  }
  const kcal = Number(energy);
  return Number.isFinite(kcal) ? kcal : null;
}

/** The watch's heart rate, whole; null for none or one out of bounds. */
function heartOf(bpm: number | null): number | null {
  return bpm !== null && Number.isFinite(bpm) && bpm >= MIN_BPM && bpm <= MAX_BPM
    ? Math.round(bpm)
    : null;
}

export function liveStats(
  track: Track,
  nowMs: number,
  kcal: number | null,
  bpm: number | null,
): LiveStats {
  const heart = heartOf(bpm);
  return {
    distance_m: whole(track.distanceM, MAX_DISTANCE_M),
    // A pause still open counts up to now: the time stands still in it.
    duration_s: whole(activeMs(track, nowMs) / 1000, MAX_DURATION_S),
    climb_m: wholeOrNull(climbM(track), MAX_CLIMB_M),
    kcal: wholeOrNull(kcal, MAX_KCAL),
    heart_bpm: heart,
  };
}

/** What a recording without a track knows (TASK-424 part B2): a swim in a
 * pool, a workout at the gym. */
export type TracklessNumbers = {
  /** Without the pauses. */
  activeMs: number;
  kcal: number | null;
  bpm: number | null;
  /** A swim in a pool: the lengths estimated from the pace. */
  lengths?: number | null;
  /** At the gym: the exercise in progress. */
  exercise?: string | null;
};

/** The numbers of a recording without a track, within the API's bounds: no
 * distance nor climb, the time, the calories (none for zero, as on the
 * screen), the heart rate, and the lengths or the exercise. */
export function tracklessStats(numbers: TracklessNumbers): LiveStats {
  const stats: LiveStats = {
    duration_s: whole(numbers.activeMs / 1000, MAX_DURATION_S),
    kcal:
      numbers.kcal === null || !(numbers.kcal > 0)
        ? null
        : whole(numbers.kcal, MAX_KCAL),
    heart_bpm: heartOf(numbers.bpm),
  };
  if (numbers.lengths !== undefined) {
    stats.lengths = wholeOrNull(numbers.lengths, MAX_LENGTHS);
  }
  if (numbers.exercise !== undefined) {
    // The API counts characters, not UTF-16 units.
    const name = Array.from(numbers.exercise?.trim() ?? "")
      .slice(0, MAX_EXERCISE_CHARS)
      .join("")
      .trim();
    stats.exercise = name === "" ? null : name;
  }
  return stats;
}
