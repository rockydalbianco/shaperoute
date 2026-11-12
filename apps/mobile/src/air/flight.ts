import type { LiveStats, RunActivity } from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";
import type { Track, TrackFix } from "../navigation/trackRecorder";

/**
 * The numbers of a flight (TASK-305 part R2, ADR-0375), read from the fixes
 * the phone records: the altitude now and the highest, the vario, the speed
 * of the moment, and at the end the top speed. No barometer: the height is
 * the GPS's, noisy from one fix to the next, so the vario is the climb over
 * the last VARIO_WINDOW_MS, never between two fixes.
 */

/** The activities flown. */
export const FLIGHT_ACTIVITIES: ReadonlySet<RunActivity> = new Set(["paragliding"]);

export function isFlight(activity: RunActivity | null | undefined): boolean {
  return activity !== null && activity !== undefined && FLIGHT_ACTIVITIES.has(activity);
}

/** The vario is the climb over this long. */
export const VARIO_WINDOW_MS = 10_000;
/** Less than this between the two ends says nothing of the climb. */
export const MIN_VARIO_SPAN_MS = 5_000;
/** The speed of the moment is over this long. */
export const SPEED_WINDOW_MS = 5_000;
/** Less than this between the two ends says nothing of the speed. */
export const MIN_SPEED_SPAN_MS = 2_000;
/** A last fix older than this: the vario and the speed are not of now. */
export const STALE_FIX_MS = 20_000;

/** The bounds the API takes (`LiveStatsBody`, TASK-305 part R1). */
const MIN_ALT_M = -500;
const MAX_ALT_M = 9_000;
const MAX_VARIO_MPS = 30;
const MAX_SPEED_MPS = 100;

export type FlightNow = {
  /** Metres above the sea, now; null without a height. */
  altM: number | null;
  /** The highest so far. */
  maxAltM: number | null;
  /** Metres a second, + climbing, − sinking, one decimal; null when not
   * known now. */
  varioMps: number | null;
  /** Over the ground, metres a second; null when not known now. */
  speedMps: number | null;
};

function heightOf(fix: TrackFix): number | null {
  const height = fix.altitudeM;
  return height === undefined || height === null || !Number.isFinite(height)
    ? null
    : height;
}

/** The fixes since the last pause's gap: the window never crosses one. */
function lastStretch(fixes: readonly TrackFix[]): readonly TrackFix[] {
  for (let i = fixes.length - 1; i > 0; i -= 1) {
    if (fixes[i].gap === true) {
      return fixes.slice(i);
    }
  }
  return fixes;
}

/** The first fix at or after `fromMs` among `fixes`, with a height when
 * asked. */
function firstSince(
  fixes: readonly TrackFix[],
  fromMs: number,
  withHeight: boolean,
): TrackFix | null {
  for (const fix of fixes) {
    if (fix.timeMs >= fromMs && (!withHeight || heightOf(fix) !== null)) {
      return fix;
    }
  }
  return null;
}

/** The climb in m/s over the window that ends at `last`, or null. */
function varioAt(fixes: readonly TrackFix[], last: TrackFix): number | null {
  const top = heightOf(last);
  if (top === null) {
    return null;
  }
  const first = firstSince(fixes, last.timeMs - VARIO_WINDOW_MS, true);
  if (first === null || last.timeMs - first.timeMs < MIN_VARIO_SPAN_MS) {
    return null;
  }
  const from = heightOf(first) as number;
  return (top - from) / ((last.timeMs - first.timeMs) / 1000);
}

/** The speed in m/s over the window that ends at fix `end` of `fixes`,
 * not before fix `start`. */
function speedAt(fixes: readonly TrackFix[], end: number, start = 0): number | null {
  const last = fixes[end];
  let metres = 0;
  let first = end;
  while (first > start && last.timeMs - fixes[first - 1].timeMs <= SPEED_WINDOW_MS) {
    metres += metresBetween(fixes[first - 1].point, fixes[first].point);
    first -= 1;
  }
  const span = last.timeMs - fixes[first].timeMs;
  return span >= MIN_SPEED_SPAN_MS ? metres / (span / 1000) : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The numbers of the flight at `nowMs`. */
export function flightNow(track: Track, nowMs: number): FlightNow {
  const fixes = track.fixes;
  let maxAltM: number | null = null;
  let altM: number | null = null;
  for (const fix of fixes) {
    const height = heightOf(fix);
    if (height !== null) {
      altM = height;
      maxAltM = maxAltM === null ? height : Math.max(maxAltM, height);
    }
  }
  const last = fixes[fixes.length - 1];
  const fresh = last !== undefined && nowMs - last.timeMs <= STALE_FIX_MS;
  const stretch = lastStretch(fixes);
  const vario = fresh ? varioAt(stretch, last) : null;
  const speed = fresh ? speedAt(stretch, stretch.length - 1) : null;
  return {
    altM: altM === null ? null : Math.round(altM),
    maxAltM: maxAltM === null ? null : Math.round(maxAltM),
    varioMps: vario === null ? null : Math.round(vario * 10) / 10,
    speedMps: speed,
  };
}

/** The fastest speed of the moment along the whole flight, m/s, or null. */
export function topSpeedMps(track: Track): number | null {
  let top: number | null = null;
  let start = 0;
  const fixes = track.fixes;
  for (let i = 1; i < fixes.length; i += 1) {
    if (fixes[i].gap === true) {
      start = i;
      continue;
    }
    const speed = speedAt(fixes, i, start);
    if (speed !== null && speed <= MAX_SPEED_MPS) {
      top = top === null ? speed : Math.max(top, speed);
    }
  }
  return top;
}

/** The flight's numbers for a live update, within the API's bounds. */
export function flightStats(
  now: FlightNow,
): Pick<LiveStats, "alt_m" | "max_alt_m" | "vario_mps" | "speed_mps"> {
  const height = (metres: number | null) =>
    metres === null ? null : Math.round(clamp(metres, MIN_ALT_M, MAX_ALT_M));
  return {
    alt_m: height(now.altM),
    max_alt_m: height(now.maxAltM),
    vario_mps:
      now.varioMps === null
        ? null
        : Math.round(clamp(now.varioMps, -MAX_VARIO_MPS, MAX_VARIO_MPS) * 10) / 10,
    speed_mps:
      now.speedMps === null
        ? null
        : Math.round(clamp(now.speedMps, 0, MAX_SPEED_MPS) * 10) / 10,
  };
}
