import type { LatLon } from "@shaperoute/shared-types";

/**
 * Metres on a plane tangent to the earth (TASK-479 part B1): the flight's
 * numbers are worked out in metres, never in degrees (CLAUDE.md). Over the
 * few kilometres of a flight's last minutes the plane is off by
 * centimetres.
 */

const EARTH_RADIUS_M = 6_371_008.8;
const RAD = Math.PI / 180;

/** Metres east and north of an origin. */
export type Metres = { x: number; y: number };

/** A projection to metres around `origin`. */
export function planeAt(origin: LatLon): (point: LatLon) => Metres {
  const [lat0, lon0] = origin;
  const across = Math.cos(lat0 * RAD) * EARTH_RADIUS_M * RAD;
  const along = EARTH_RADIUS_M * RAD;
  return ([lat, lon]) => ({ x: (lon - lon0) * across, y: (lat - lat0) * along });
}

/** Degrees from north, clockwise, of the step from `a` to `b`, in [0, 360). */
export function bearingOf(a: Metres, b: Metres): number {
  const degrees = Math.atan2(b.x - a.x, b.y - a.y) / RAD;
  return (degrees + 360) % 360;
}

export function lengthOf(a: Metres, b: Metres): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** The turn from bearing `from` to bearing `to`, in (-180, 180]: + to the
 * right (clockwise), − to the left. */
export function turnBetween(from: number, to: number): number {
  let turn = (to - from) % 360;
  if (turn > 180) {
    turn -= 360;
  } else if (turn <= -180) {
    turn += 360;
  }
  return turn;
}

/** The great-circle bearing from `a` to `b`, degrees from north. */
export function bearingBetween(a: LatLon, b: LatLon): number {
  const [lat1, lon1] = [a[0] * RAD, a[1] * RAD];
  const [lat2, lon2] = [b[0] * RAD, b[1] * RAD];
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/** The slope of `ys` over `xs` by least squares, or null with fewer than
 * two different `xs`. */
export function slopeOf(xs: readonly number[], ys: readonly number[]): number | null {
  const n = xs.length;
  if (n < 2) {
    return null;
  }
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i += 1) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i += 1) {
    sxx += (xs[i] - mx) * (xs[i] - mx);
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  return sxx === 0 ? null : sxy / sxx;
}
