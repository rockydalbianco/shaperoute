import type { LatLon } from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";
import { POOR_FIX_M } from "./navigator";

/**
 * The track of a run (TASK-112, ADR-0091): pure functions from GPS fixes to
 * the line that was run, its length and how long it took. What to do with a
 * doubtful fix is decided here once; the score cleans the rest (ADR-0090).
 */

/** A fix closer than this to the last one kept adds nothing to the line. */
export const MIN_STEP_M = 5;
/** A fix less accurate than this is not where the runner was (ADR-0070). */
export const MAX_ACCURACY_M = POOR_FIX_M;

export type TrackFix = {
  point: LatLon;
  /** When the fix was taken, in milliseconds. */
  timeMs: number;
  /** Radius of the fix's error, in metres, when the phone gives it. */
  accuracyM: number | null;
};

export type Track = {
  fixes: TrackFix[];
  /** Length of the line through the fixes, in metres. */
  distanceM: number;
};

export function emptyTrack(): Track {
  return { fixes: [], distanceM: 0 };
}

/** `track` with `fix` at its end, or `track` itself when the fix is dropped. */
export function addFix(track: Track, fix: TrackFix): Track {
  const [lat, lon] = fix.point;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(fix.timeMs)) {
    return track;
  }
  if (fix.accuracyM !== null && fix.accuracyM > MAX_ACCURACY_M) {
    return track;
  }
  const last = track.fixes[track.fixes.length - 1];
  if (last === undefined) {
    return { fixes: [fix], distanceM: 0 };
  }
  // The phone's clock can step back; the line goes on in the order of arrival.
  if (fix.timeMs < last.timeMs) {
    return track;
  }
  const stepM = metresBetween(last.point, fix.point);
  if (stepM < MIN_STEP_M) {
    return track;
  }
  return { fixes: [...track.fixes, fix], distanceM: track.distanceM + stepM };
}

/** From the first fix to the last, in milliseconds: pauses included. */
export function durationMs(track: Track): number {
  const first = track.fixes[0];
  const last = track.fixes[track.fixes.length - 1];
  return first === undefined || last === undefined ? 0 : last.timeMs - first.timeMs;
}
