import type { LatLon } from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";

/**
 * Where the runner is along the route (TASK-049, ADR-0052), from a GPS fix.
 *
 * A shape crosses itself and passes the same street twice, so the nearest
 * point of the whole route may be kilometres ahead or behind. The fix is
 * placed only near where the runner last was: from BACK_M behind to AHEAD_M
 * ahead, which a runner does not cover between two fixes. On a street run
 * out and back the fix is as near to both ways: going back along the route
 * costs as much as being off it, so the way ahead wins.
 */
export const BACK_M = 50;
export const AHEAD_M = 300;
/** Farther than this from the route, the runner is off it (a GPS fix in a
 * town is often 10-20 m off; a parallel street is 50 m or more). */
export const OFF_ROUTE_M = 40;

export type Located = {
  /** Metres along the route to the point nearest to the fix. */
  alongM: number;
  /** Metres from the fix to the route. */
  offM: number;
};

/** Metres along the route at each of its points. */
export function cumulative(points: LatLon[]): number[] {
  const along = [0];
  for (let i = 1; i < points.length; i += 1) {
    along.push(along[i - 1] + metresBetween(points[i - 1], points[i]));
  }
  return along;
}

/**
 * The fix placed on the route, near `fromM` (where the runner last was).
 * Works in metres on the plane tangent at the fix: segments are short.
 */
export function locate(
  points: LatLon[],
  along: number[],
  fix: LatLon,
  fromM: number,
): Located {
  let best: Located = { alongM: fromM, offM: Infinity };
  let bestCost = Infinity;
  for (let i = 1; i < points.length; i += 1) {
    if (along[i] < fromM - BACK_M) {
      continue;
    }
    if (along[i - 1] > fromM + AHEAD_M) {
      break;
    }
    const [ax, ay] = toPlane(fix, points[i - 1]);
    const [bx, by] = toPlane(fix, points[i]);
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    // The fix is the origin: the nearest point of the segment to (0, 0).
    const t = length2 > 0 ? clamp(-(ax * dx + ay * dy) / length2, 0, 1) : 0;
    const offM = Math.hypot(ax + t * dx, ay + t * dy);
    const alongM = along[i - 1] + t * (along[i] - along[i - 1]);
    const cost = offM + Math.max(0, fromM - alongM);
    if (cost < bestCost) {
      best = { alongM, offM };
      bestCost = cost;
    }
  }
  return best;
}

const EARTH_RADIUS_M = 6_371_000;

function toPlane([lat0, lon0]: LatLon, [lat, lon]: LatLon): [number, number] {
  const rad = Math.PI / 180;
  return [
    (lon - lon0) * rad * EARTH_RADIUS_M * Math.cos(lat0 * rad),
    (lat - lat0) * rad * EARTH_RADIUS_M,
  ];
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
