import type { LatLon } from "@shaperoute/shared-types";

import { BASE_LANGUAGE, type Language } from "../i18n/languages";
import { METRES_PER_MILE, metresPer } from "../units/format";
import { appUnits, type Units } from "../units/units";
import { wordsOf } from "../voice/words";
import { activeMs, durationMs, type Track } from "./trackRecorder";
import { endRecording, loadRun, RESUME_WITHIN_MS, type SavedRun } from "./trackStore";

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

function withLine(run: SavedRun | null): FreeRun | null {
  return run !== null && isFreeRun(run) && run.track.fixes.length > 1 ? run : null;
}

/** The free run left in the file, when it has a line; null otherwise. */
export function pendingFreeRun(): FreeRun | null {
  return withLine(loadRun());
}

/** Ends the run in progress, writing what there is, and gives back the
 * free run when it has a line to show. */
export function endFreeRun(): FreeRun | null {
  return withLine(endRecording());
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

/** From the first fix to `nowMs`, in milliseconds, pauses left out: 0
 * before the first fix. */
export function elapsedMs(track: Track, nowMs: number): number {
  return activeMs(track, nowMs);
}

/** "0.00 km", "12.34 km": the distance of a run, as runners read it. */
export function kmLabel(metres: number): string {
  return `${(Math.max(0, metres) / 1000).toFixed(2)} km`;
}

/** "0.00", "12.34": the kilometres alone, for where the unit is written
 * beside them. */
export function kmNumber(metres: number): string {
  return (Math.max(0, metres) / 1000).toFixed(2);
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

/** The whole kilometres in `track`: the voice says each one once. */
export function wholeKm(track: Track): number {
  return Math.floor(track.distanceM / 1000);
}

/** The whole kilometres in `track` or, with miles, its whole miles
 * (TASK-182): what the voice counts, and says each one once. */
export function wholeUnits(track: Track, units: Units = appUnits()): number {
  return Math.floor(track.distanceM / metresPer(units));
}

/**
 * What the voice says when the run passes `km` kilometres: the time so far
 * and the average pace, as a running watch does, in the voice's `language`
 * (TASK-209). With miles `km` counts miles, and the pace is a mile's
 * (TASK-182).
 */
export function kmAnnouncement(
  km: number,
  track: Track,
  language: Language = BASE_LANGUAGE,
  units: Units = appUnits(),
): string {
  const ms = durationMs(track);
  if (units === "mi") {
    const pace = track.distanceM > 0 ? (ms / track.distanceM) * METRES_PER_MILE : 0;
    return wordsOf(language, units).mile(km, ms, pace);
  }
  const pace = track.distanceM > 0 ? (ms / track.distanceM) * 1000 : 0;
  return wordsOf(language, units).kilometre(km, ms, pace);
}
