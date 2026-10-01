import type { LatLon } from "@shaperoute/shared-types";

import type { Track } from "./trackRecorder";
import { endRun, loadRun, RESUME_WITHIN_MS, type SavedRun } from "./trackStore";

/**
 * A run without a route (TASK-149, ADR-0122): «Run» on the first screen
 * records the track and nothing else. It lives in the same file as a run
 * along a route (TASK-112), with no route in it, so it survives the app
 * being closed in the same way; with no shape it has no score.
 */

/** The route of a free run: none. One list, so the recorder is not restarted. */
export const FREE_ROUTE: LatLon[] = [];

/** A free run in the file: no route, and a line to show. */
export type FreeRun = SavedRun;

export function isFreeRun(run: SavedRun): boolean {
  return run.route.length === 0;
}

/** The free run left in the file, when it has a line; null otherwise. */
export function pendingFreeRun(): FreeRun | null {
  const run = loadRun();
  return run !== null && isFreeRun(run) && run.track.fixes.length > 1 ? run : null;
}

/** Ends the run in progress, writing what there is, and gives back the
 * free run when it has a line to show. */
export function endFreeRun(): FreeRun | null {
  endRun();
  return pendingFreeRun();
}

/** Whether «Run» again would go on with `run`'s track (trackStore). */
export function canResume(run: FreeRun, nowMs: number): boolean {
  const last = run.track.fixes[run.track.fixes.length - 1];
  return (
    run.status !== "arrived" &&
    last !== undefined &&
    nowMs - last.timeMs <= RESUME_WITHIN_MS
  );
}

/** From the first fix to `nowMs`, in milliseconds: 0 before the first fix. */
export function elapsedMs(track: Track, nowMs: number): number {
  const first = track.fixes[0];
  return first === undefined ? 0 : Math.max(0, nowMs - first.timeMs);
}

/** "0.00 km", "12.34 km": the distance of a run, as runners read it. */
export function kmLabel(metres: number): string {
  return `${(Math.max(0, metres) / 1000).toFixed(2)} km`;
}

/** "0:07", "12:34", "1:02:03": a running clock. */
export function clockLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/** Below this the pace is noise: the first strides and the GPS settling. */
export const MIN_PACE_M = 100;

/** "5:42 /km", the average pace; null before MIN_PACE_M. */
export function paceLabel(metres: number, ms: number): string | null {
  if (metres < MIN_PACE_M || ms <= 0) {
    return null;
  }
  const secondsPerKm = Math.round(ms / metres);
  const minutes = Math.floor(secondsPerKm / 60);
  return `${minutes}:${String(secondsPerKm % 60).padStart(2, "0")} /km`;
}
