import type { LatLon } from "@shaperoute/shared-types";

import type { FlightTask, Turnpoint } from "./flightTask";

/**
 * The shortest way through a task's cylinders (TASK-479 part D2,
 * ADR-0388): one point on the edge of each cylinder, moved round its
 * circle until the whole way is as short as it gets, again and again until
 * no point moves a metre. Distances on the FAI sphere or on the WGS84
 * ellipsoid, as the task's file says.
 */

export type Earth = FlightTask["earth"];

const RAD = Math.PI / 180;
/** The FAI sphere's radius. */
export const FAI_RADIUS_M = 6_371_000;
const WGS84_A = 6_378_137;
const WGS84_F = 1 / 298.257223563;

/** Haversine on the FAI sphere. */
function sphereM(a: LatLon, b: LatLon): number {
  const dLat = (b[0] - a[0]) * RAD;
  const dLon = (b[1] - a[1]) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * FAI_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Andoyer–Lambert on the WGS84 ellipsoid: within a metre over a task's
 * legs. */
function ellipsoidM(a: LatLon, b: LatLon): number {
  const F = ((a[0] + b[0]) / 2) * RAD;
  const G = ((a[0] - b[0]) / 2) * RAD;
  const L = ((a[1] - b[1]) / 2) * RAD;
  const sinG = Math.sin(G) ** 2;
  const cosG = Math.cos(G) ** 2;
  const sinF = Math.sin(F) ** 2;
  const cosF = Math.cos(F) ** 2;
  const sinL = Math.sin(L) ** 2;
  const cosL = Math.cos(L) ** 2;
  const S = sinG * cosL + cosF * sinL;
  const C = cosG * cosL + sinF * sinL;
  if (S === 0) {
    return 0;
  }
  if (C === 0) {
    // Antipodes: no task has them.
    return Math.PI * WGS84_A;
  }
  const w = Math.atan(Math.sqrt(S / C));
  const R = Math.sqrt(S * C) / w;
  const D = 2 * w * WGS84_A;
  const H1 = (3 * R - 1) / (2 * C);
  const H2 = (3 * R + 1) / (2 * S);
  return D * (1 + WGS84_F * H1 * sinF * cosG - WGS84_F * H2 * cosF * sinG);
}

/** The distance from `a` to `b`, metres, on the task's earth. */
export function distanceM(a: LatLon, b: LatLon, earth: Earth): number {
  return earth === "faiSphere" ? sphereM(a, b) : ellipsoidM(a, b);
}

/** The point `distM` from `from` towards `bearingDeg`, on the sphere: what
 * the edge of a cylinder needs, within centimetres. */
export function destination(from: LatLon, bearingDeg: number, distM: number): LatLon {
  const d = distM / FAI_RADIUS_M;
  const t = bearingDeg * RAD;
  const lat1 = from[0] * RAD;
  const lon1 = from[1] * RAD;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(t),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(t) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [lat2 / RAD, ((lon2 / RAD + 540) % 360) - 180];
}

/** Stop when no point moved more than this. */
export const SETTLED_M = 1;
const MAX_ROUNDS = 60;
const SAMPLES = 36;

/** Where on `cylinder`'s edge the way from `before` to `after` (or ending
 * there, with `after` null) is shortest. */
function bestOnEdge(
  cylinder: Turnpoint,
  before: LatLon,
  after: LatLon | null,
  earth: Earth,
): LatLon {
  const centre = cylinder.waypoint.point;
  if (cylinder.radiusM <= 0) {
    return centre;
  }
  const at = (deg: number) => destination(centre, deg, cylinder.radiusM);
  const cost = (deg: number) => {
    const p = at(deg);
    return (
      distanceM(before, p, earth) + (after === null ? 0 : distanceM(p, after, earth))
    );
  };
  let best = 0;
  let bestCost = Infinity;
  for (let i = 0; i < SAMPLES; i += 1) {
    const deg = (i * 360) / SAMPLES;
    const c = cost(deg);
    if (c < bestCost) {
      bestCost = c;
      best = deg;
    }
  }
  // Golden section between the samples on either side.
  let lo = best - 360 / SAMPLES;
  let hi = best + 360 / SAMPLES;
  const k = (Math.sqrt(5) - 1) / 2;
  let x1 = hi - k * (hi - lo);
  let x2 = lo + k * (hi - lo);
  let f1 = cost(x1);
  let f2 = cost(x2);
  // A millidegree is under a metre on a 50 km cylinder.
  while (hi - lo > 1e-3) {
    if (f1 < f2) {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - k * (hi - lo);
      f1 = cost(x1);
    } else {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + k * (hi - lo);
      f2 = cost(x2);
    }
  }
  return at((lo + hi) / 2);
}

export type Route = {
  /** One point per cylinder, in order, after `from`. */
  points: LatLon[];
  /** The legs' lengths: from `from` to the first point, then point to
   * point. */
  legsM: number[];
  totalM: number;
};

/**
 * The shortest way from `from` through `cylinders` in order. A goal line
 * is crossed at its middle, the goal's centre: the line stands across the
 * last leg.
 */
export function shortestRoute(
  from: LatLon,
  cylinders: readonly Turnpoint[],
  earth: Earth,
  goalLine = false,
): Route {
  const n = cylinders.length;
  const fixedLast = goalLine && n > 0;
  // Start from the centres.
  const points: LatLon[] = cylinders.map((one) => one.waypoint.point);
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    let moved = 0;
    for (let i = 0; i < n; i += 1) {
      if (fixedLast && i === n - 1) {
        continue;
      }
      const before = i === 0 ? from : points[i - 1];
      const after = i === n - 1 ? null : points[i + 1];
      const next = bestOnEdge(cylinders[i], before, after, earth);
      moved = Math.max(moved, distanceM(points[i], next, earth));
      points[i] = next;
    }
    if (moved < SETTLED_M) {
      break;
    }
  }
  const legsM: number[] = [];
  let previous = from;
  for (const point of points) {
    legsM.push(distanceM(previous, point, earth));
    previous = point;
  }
  return { points, legsM, totalM: legsM.reduce((sum, one) => sum + one, 0) };
}

/** The whole task's shortest way: from the first turnpoint's centre (the
 * takeoff, as the competition tools count it) through the others. */
export function taskRoute(task: FlightTask): Route {
  const [first, ...rest] = task.turnpoints;
  return shortestRoute(
    first.waypoint.point,
    rest,
    task.earth,
    task.goal.type === "line",
  );
}
