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

export function liveStats(
  track: Track,
  nowMs: number,
  kcal: number | null,
  bpm: number | null,
): LiveStats {
  const heart =
    bpm !== null && Number.isFinite(bpm) && bpm >= MIN_BPM && bpm <= MAX_BPM
      ? Math.round(bpm)
      : null;
  return {
    distance_m: whole(track.distanceM, MAX_DISTANCE_M),
    // A pause still open counts up to now: the time stands still in it.
    duration_s: whole(activeMs(track, nowMs) / 1000, MAX_DURATION_S),
    climb_m: wholeOrNull(climbM(track), MAX_CLIMB_M),
    kcal: wholeOrNull(kcal, MAX_KCAL),
    heart_bpm: heart,
  };
}
