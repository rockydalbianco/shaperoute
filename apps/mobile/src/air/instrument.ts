import type { LatLon } from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";
import type { Track, TrackFix } from "../navigation/trackRecorder";
import { bearingBetween, bearingOf, lengthOf, planeAt, slopeOf } from "./airGeometry";

/**
 * The numbers of the flight screen (TASK-479 part B1, ADR-0388), from the
 * fixes the phone records: the vario now and over 30 s, the speed and the
 * track over the ground, the glide ratio, the take-off and the time in the
 * air. GPS heights are noisy from one fix to the next, so every climb is
 * a least-squares slope over a window, never the step between two fixes.
 * Numbers only: nothing here says what to do.
 */

/** The vario of now is the climb over this long. */
export const VARIO_NOW_MS = 2_000;
/** Less than this inside it says nothing. */
export const MIN_VARIO_NOW_SPAN_MS = 1_000;
/** The average vario. */
export const VARIO_AVG_MS = 30_000;
export const MIN_VARIO_AVG_SPAN_MS = 10_000;
/** The speed and the track over the ground are read over this long. */
export const GROUND_MS = 3_000;
/** The glide ratio is read over this long. */
export const GLIDE_MS = 30_000;
export const MIN_GLIDE_SPAN_MS = 15_000;
/** Sinking slower than this, the glide ratio is not a number worth showing. */
export const MIN_GLIDE_SINK_MPS = 0.2;
/** A glide ratio above this is shown as this. */
export const MAX_GLIDE_RATIO = 99;
/** A last fix older than this: nothing of now is known. */
export const STALE_MS = 20_000;
/** A step shorter than this has no track worth reading. */
const MIN_TRACK_M = 3;

export type Takeoff = { point: LatLon; altM: number | null; atMs: number };

export type Instrument = {
  /** Metres above the sea now, as the phone gives it. */
  altM: number | null;
  maxAltM: number | null;
  /** Climb now and over 30 s, m/s, + up. */
  varioMps: number | null;
  varioAvgMps: number | null;
  /** Over the ground. */
  speedMps: number | null;
  /** Degrees from north of the way over the ground. */
  trackDeg: number | null;
  /** Metres forward for each metre lost, over 30 s; null circling,
   * climbing or nearly level. */
  glideRatio: number | null;
  takeoff: Takeoff | null;
  aboveTakeoffM: number | null;
  /** From here back to the take-off. */
  takeoffDistanceM: number | null;
  takeoffBearingDeg: number | null;
  /** Since the take-off. */
  flightMs: number | null;
  /** The last fix's error radius, metres. */
  accuracyM: number | null;
};

function heightOf(fix: TrackFix): number | null {
  const height = fix.altitudeM;
  return height === undefined || height === null || !Number.isFinite(height) ? null : height;
}

/** The fixes since the last pause's gap: no window crosses one. */
function lastStretch(fixes: readonly TrackFix[]): readonly TrackFix[] {
  for (let i = fixes.length - 1; i > 0; i -= 1) {
    if (fixes[i].gap === true) {
      return fixes.slice(i);
    }
  }
  return fixes;
}

/** The fixes of the last `ms` of `fixes`. */
function lastWindow(fixes: readonly TrackFix[], ms: number): readonly TrackFix[] {
  const last = fixes[fixes.length - 1];
  let first = fixes.length - 1;
  while (first > 0 && last.timeMs - fixes[first - 1].timeMs <= ms) {
    first -= 1;
  }
  return fixes.slice(first);
}

/** The climb in m/s over the window, by least squares; null when the
 * window's heights span less than `minSpanMs`. */
export function climbOver(fixes: readonly TrackFix[], ms: number, minSpanMs: number): number | null {
  if (fixes.length === 0) {
    return null;
  }
  const window = lastWindow(fixes, ms).filter((fix) => heightOf(fix) !== null);
  if (window.length < 2 || window[window.length - 1].timeMs - window[0].timeMs < minSpanMs) {
    return null;
  }
  const t0 = window[0].timeMs;
  return slopeOf(
    window.map((fix) => (fix.timeMs - t0) / 1000),
    window.map((fix) => heightOf(fix) as number),
  );
}

/** The speed (m/s) and the track (degrees) over the ground at the end of
 * `fixes`. */
function groundOf(fixes: readonly TrackFix[]): { speedMps: number | null; trackDeg: number | null } {
  if (fixes.length < 2) {
    return { speedMps: null, trackDeg: null };
  }
  const window = lastWindow(fixes, GROUND_MS);
  const first = window[0];
  const last = window[window.length - 1];
  const ms = last.timeMs - first.timeMs;
  if (window.length < 2 || ms < GROUND_MS / 2) {
    return { speedMps: null, trackDeg: null };
  }
  let metres = 0;
  for (let i = 1; i < window.length; i += 1) {
    metres += metresBetween(window[i - 1].point, window[i].point);
  }
  const plane = planeAt(first.point);
  const a = plane(first.point);
  const b = plane(last.point);
  return {
    speedMps: metres / (ms / 1000),
    trackDeg: lengthOf(a, b) >= MIN_TRACK_M ? bearingOf(a, b) : null,
  };
}

/** Metres forward over metres lost, over the last GLIDE_MS of `fixes`. */
export function glideOver(fixes: readonly TrackFix[]): number | null {
  if (fixes.length < 2) {
    return null;
  }
  const window = lastWindow(fixes, GLIDE_MS);
  const ms = window[window.length - 1].timeMs - window[0].timeMs;
  if (ms < MIN_GLIDE_SPAN_MS) {
    return null;
  }
  const climb = climbOver(window, GLIDE_MS, MIN_GLIDE_SPAN_MS);
  if (climb === null || -climb < MIN_GLIDE_SINK_MPS) {
    return null;
  }
  // Straight-line distance, not the path: a glide goes somewhere.
  const forward = metresBetween(window[0].point, window[window.length - 1].point);
  return Math.min(MAX_GLIDE_RATIO, forward / (-climb * (ms / 1000)));
}

/** The take-off: the first fix at or after `takeoffMs`, the start of the
 * flight's first part in the air. */
export function takeoffOf(track: Track, takeoffMs: number | null): Takeoff | null {
  if (takeoffMs === null) {
    return null;
  }
  const fix = track.fixes.find((one) => one.timeMs >= takeoffMs);
  return fix === undefined ? null : { point: fix.point, altM: heightOf(fix), atMs: fix.timeMs };
}

/**
 * The numbers at `nowMs`. `takeoffMs` is when the flight went into the
 * air (from `flightParts`), null before; `circling` blanks the glide
 * ratio.
 */
export function instrumentNow(
  track: Track,
  nowMs: number,
  takeoffMs: number | null,
  circling: boolean,
): Instrument {
  const fixes = track.fixes;
  let altM: number | null = null;
  let maxAltM: number | null = null;
  for (const fix of fixes) {
    const height = heightOf(fix);
    if (height !== null) {
      altM = height;
      maxAltM = maxAltM === null ? height : Math.max(maxAltM, height);
    }
  }
  const last = fixes[fixes.length - 1];
  const fresh = last !== undefined && nowMs - last.timeMs <= STALE_MS;
  const stretch = lastStretch(fixes);
  const ground = fresh ? groundOf(stretch) : { speedMps: null, trackDeg: null };
  const takeoff = takeoffOf(track, takeoffMs);
  const here = last?.point ?? null;
  const takeoffAltM = takeoff?.altM ?? null;
  return {
    altM,
    maxAltM,
    varioMps: fresh ? climbOver(stretch, VARIO_NOW_MS, MIN_VARIO_NOW_SPAN_MS) : null,
    varioAvgMps: fresh ? climbOver(stretch, VARIO_AVG_MS, MIN_VARIO_AVG_SPAN_MS) : null,
    speedMps: ground.speedMps,
    trackDeg: ground.trackDeg,
    glideRatio: fresh && !circling ? glideOver(stretch) : null,
    takeoff,
    aboveTakeoffM: takeoffAltM !== null && altM !== null ? altM - takeoffAltM : null,
    takeoffDistanceM: takeoff !== null && here !== null ? metresBetween(here, takeoff.point) : null,
    takeoffBearingDeg:
      takeoff !== null && here !== null && metresBetween(here, takeoff.point) >= MIN_TRACK_M
        ? bearingBetween(here, takeoff.point)
        : null,
    flightMs: takeoff === null ? null : Math.max(0, nowMs - takeoff.atMs),
    accuracyM: last?.accuracyM ?? null,
  };
}
