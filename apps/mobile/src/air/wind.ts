import type { Track, TrackFix } from "../navigation/trackRecorder";
import { type Metres, planeAt } from "./airGeometry";
import { type Circling, circlings } from "./thermal";

/**
 * The wind from the drift while circling (TASK-479 part B1, ADR-0388). A
 * wing circling at a steady airspeed in a wind moves over the ground at
 * airspeed + wind: its ground velocities lie on a circle whose centre is
 * the wind and whose radius is the airspeed. A least-squares circle
 * through them (Kåsa's fit) gives both. An estimate with its age, shown as
 * a number, never as advice.
 */

/** A circling must turn at least this much to tell the wind. */
export const MIN_WIND_TURN = 360;
/** The velocity of a step is read over at least this long. */
export const MIN_VELOCITY_MS = 1_000;
/** A wing's airspeed lies in here; a fit outside is noise. */
export const MIN_AIRSPEED_MPS = 5;
export const MAX_AIRSPEED_MPS = 25;
/** A wind faster than this is noise for a paraglider. */
export const MAX_WIND_MPS = 25;
/** At most this many velocities, the last ones, go in a fit. */
const MAX_VELOCITIES = 240;

export type Wind = {
  /** Where the wind blows from, degrees from north, as the weather says it. */
  fromDeg: number;
  speedMps: number;
  /** The airspeed the fit found, m/s. */
  airspeedMps: number;
  /** When the circling it came from ended. */
  atMs: number;
};

/** The ground velocities of `fixes`, m/s east and north. */
export function velocitiesOf(fixes: readonly TrackFix[]): Metres[] {
  if (fixes.length < 2) {
    return [];
  }
  const plane = planeAt(fixes[0].point);
  const at = fixes.map((fix) => plane(fix.point));
  const out: Metres[] = [];
  let from = 0;
  for (let i = 1; i < fixes.length; i += 1) {
    if (fixes[i].gap === true) {
      from = i;
      continue;
    }
    const ms = fixes[i].timeMs - fixes[from].timeMs;
    if (ms < MIN_VELOCITY_MS) {
      continue;
    }
    out.push({ x: (at[i].x - at[from].x) / (ms / 1000), y: (at[i].y - at[from].y) / (ms / 1000) });
    from = i;
  }
  return out;
}

/** Solves a 3×3 system by Cramer's rule; null when it has no single
 * answer. */
function solve3(m: number[][], v: number[]): [number, number, number] | null {
  const det = (a: number[][]) =>
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const d = det(m);
  if (Math.abs(d) < 1e-9) {
    return null;
  }
  const column = (k: number) => m.map((row, i) => row.map((cell, j) => (j === k ? v[i] : cell)));
  return [det(column(0)) / d, det(column(1)) / d, det(column(2)) / d];
}

/** The least-squares circle through `points`: its centre and radius. */
export function circleFit(points: readonly Metres[]): { centre: Metres; radius: number } | null {
  if (points.length < 3) {
    return null;
  }
  // x² + y² + D x + E y + F = 0, in the least squares.
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0;
  for (const { x, y } of points) {
    const z = x * x + y * y;
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
    sz += z;
    sxz += x * z;
    syz += y * z;
  }
  const n = points.length;
  const answer = solve3(
    [
      [sxx, sxy, sx],
      [sxy, syy, sy],
      [sx, sy, n],
    ],
    [-sxz, -syz, -sz],
  );
  if (answer === null) {
    return null;
  }
  const [d, e, f] = answer;
  const centre = { x: -d / 2, y: -e / 2 };
  const squared = centre.x * centre.x + centre.y * centre.y - f;
  return squared <= 0 ? null : { centre, radius: Math.sqrt(squared) };
}

/** The wind from one circling of `track`, or null when it does not tell. */
export function windOfCircling(track: Track, circling: Circling): Wind | null {
  if (Math.abs(circling.turnDeg) < MIN_WIND_TURN) {
    return null;
  }
  const velocities = velocitiesOf(track.fixes.slice(circling.from, circling.to + 1)).slice(
    -MAX_VELOCITIES,
  );
  const fit = circleFit(velocities);
  if (fit === null) {
    return null;
  }
  const speedMps = Math.hypot(fit.centre.x, fit.centre.y);
  if (
    fit.radius < MIN_AIRSPEED_MPS ||
    fit.radius > MAX_AIRSPEED_MPS ||
    speedMps > MAX_WIND_MPS
  ) {
    return null;
  }
  // The centre is where the air goes; the weather says where it comes from.
  const fromDeg = ((Math.atan2(-fit.centre.x, -fit.centre.y) * 180) / Math.PI + 360) % 360;
  return { fromDeg, speedMps, airspeedMps: fit.radius, atMs: circling.endMs };
}

/** The wind of the last circling that tells one, or null. */
export function windNow(track: Track, all: readonly Circling[] = circlings(track)): Wind | null {
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const wind = windOfCircling(track, all[i]);
    if (wind !== null) {
      return wind;
    }
  }
  return null;
}
