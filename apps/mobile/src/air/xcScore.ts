import type { LatLon } from "@shaperoute/shared-types";

import { distanceM } from "./taskRoute";

/**
 * The «XC score» of a flight, worked out on the phone (TASK-479 part F2,
 * ADR-0388 addition F): the public rules of the online cross-country
 * leagues, never their name, never a claim to be their score (the app says
 * «Calculated on your phone · not an official score»). Nothing is sent.
 *
 * - **Free distance**: a start, up to 3 turnpoints and a finish, in the
 *   order they were flown, placed for the longest way: ×1.0.
 * - **Triangle**: 3 turnpoints in order; it counts when the gap between a
 *   start before the first and a finish after the last is under 20 % of
 *   the triangle; the gap is taken off. Flat ×1.2, FAI (shortest side at
 *   least 28 %) ×1.4; «closed» (gap under 5 %) flat ×1.4, FAI ×1.6.
 * - The best of them is the score; distances rounded to 0.01 km and points
 *   to 0.01, on the FAI sphere (the sphere of `taskRoute`).
 *
 * The search: the flight cut to at most COARSE_FREE (free distance) or
 * COARSE_TRIANGLE (triangles) points evenly, every combination tried there,
 * then each point moved along the flight cut to FINE_POINTS while the
 * score grows. Deterministic; close to the best, not a proof of it.
 */

export type XcKind = "free" | "flat" | "fai";

export type XcScore = {
  kind: XcKind;
  /** A triangle closed within 5 %. Always false for free distance. */
  closed: boolean;
  multiplier: number;
  /** The distance scored, km to 0.01: the legs, less the gap. */
  distanceKm: number;
  /** distanceKm × multiplier, to 0.01. */
  points: number;
  start: LatLon;
  /** Free distance: up to 3, in order; a triangle: its 3 corners. */
  turnpoints: LatLon[];
  finish: LatLon;
  /** A triangle's gap from finish to start, km; null for free distance. */
  closingKm: number | null;
};

export const FREE_MULTIPLIER = 1.0;
export const FLAT_MULTIPLIER = 1.2;
export const FAI_MULTIPLIER = 1.4;
export const CLOSED_FLAT_MULTIPLIER = 1.4;
export const CLOSED_FAI_MULTIPLIER = 1.6;
/** A triangle counts below this gap, of its perimeter. */
export const MAX_GAP_SHARE = 0.2;
/** And is «closed» below this one. */
export const CLOSED_GAP_SHARE = 0.05;
/** An FAI triangle's shortest side, of its perimeter. */
export const FAI_MIN_SIDE_SHARE = 0.28;

export const COARSE_FREE = 300;
export const COARSE_TRIANGLE = 120;
export const FINE_POINTS = 2000;

const dist = (a: LatLon, b: LatLon) => distanceM(a, b, "faiSphere");

/** At most `most` of `points`, evenly, the first and the last always;
 * with the index each had. */
function evenly(points: LatLon[], most: number): number[] {
  if (points.length <= most) {
    return points.map((_, i) => i);
  }
  const step = (points.length - 1) / (most - 1);
  return Array.from({ length: most }, (_, i) => Math.round(i * step));
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** The distances between every two of `points`, a flat n × n table. */
function table(points: LatLon[]): Float64Array {
  const n = points.length;
  const out = new Float64Array(n * n);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const d = dist(points[i], points[j]);
      out[i * n + j] = d;
      out[j * n + i] = d;
    }
  }
  return out;
}

/**
 * Coordinate ascent on `chosen` (indices into `points`, in order): each in
 * turn moved to every index between its neighbours while `value` grows.
 */
function refine(
  points: LatLon[],
  chosen: number[],
  value: (at: number[]) => number,
): number[] {
  const at = [...chosen];
  let best = value(at);
  for (let round = 0; round < 6; round += 1) {
    let moved = false;
    for (let k = 0; k < at.length; k += 1) {
      const low = k === 0 ? 0 : at[k - 1];
      const high = k === at.length - 1 ? points.length - 1 : at[k + 1];
      const keep = at[k];
      let bestIndex = keep;
      for (let i = low; i <= high; i += 1) {
        at[k] = i;
        const v = value(at);
        if (v > best + 1e-9) {
          best = v;
          bestIndex = i;
        }
      }
      at[k] = bestIndex;
      moved = moved || bestIndex !== keep;
    }
    if (!moved) {
      break;
    }
  }
  return at;
}

/** Free distance: start, 3 turnpoints, finish (5 points, 4 legs). */
function freeDistance(fine: LatLon[]): XcScore {
  const pick = evenly(fine, COARSE_FREE);
  const coarse = pick.map((i) => fine[i]);
  const n = coarse.length;
  const d = table(coarse);
  const LEGS = 4;
  // best[k][j]: the longest way of k legs ending at j; from[k][j]: where
  // its last leg began.
  let best = new Float64Array(n);
  const from: Int32Array[] = [];
  for (let k = 1; k <= LEGS; k += 1) {
    const next = new Float64Array(n);
    const back = new Int32Array(n);
    let runBest = -1;
    for (let j = 0; j < n; j += 1) {
      runBest = -1;
      for (let i = 0; i <= j; i += 1) {
        const v = best[i] + d[i * n + j];
        if (v > runBest) {
          runBest = v;
          back[j] = i;
        }
      }
      next[j] = runBest;
    }
    best = next;
    from.push(back);
  }
  let end = 0;
  for (let j = 1; j < n; j += 1) {
    if (best[j] > best[end]) {
      end = j;
    }
  }
  const coarseAt = [end];
  for (let k = LEGS - 1; k >= 0; k -= 1) {
    coarseAt.unshift(from[k][coarseAt[0]]);
  }
  const length = (at: number[]) => {
    let sum = 0;
    for (let i = 1; i < at.length; i += 1) {
      sum += dist(fine[at[i - 1]], fine[at[i]]);
    }
    return sum;
  };
  const at = refine(
    fine,
    coarseAt.map((i) => pick[i]),
    length,
  );
  const distanceKm = round2(length(at) / 1000);
  return {
    kind: "free",
    closed: false,
    multiplier: FREE_MULTIPLIER,
    distanceKm,
    points: round2(distanceKm * FREE_MULTIPLIER),
    start: fine[at[0]],
    turnpoints: at.slice(1, 4).map((i) => fine[i]),
    finish: fine[at[4]],
    closingKm: null,
  };
}

type Triangle = {
  kind: "flat" | "fai";
  closed: boolean;
  multiplier: number;
  points: number;
};

/** What a triangle of `sides` with `gap` scores; null when it does not
 * count, or is no FAI triangle when `fai`. */
function triangleOf(
  sides: [number, number, number],
  gap: number,
  fai: boolean,
): Triangle | null {
  const perimeter = sides[0] + sides[1] + sides[2];
  if (perimeter <= 0 || !(gap < MAX_GAP_SHARE * perimeter)) {
    return null;
  }
  if (fai && Math.min(...sides) < FAI_MIN_SIDE_SHARE * perimeter) {
    return null;
  }
  const closed = gap < CLOSED_GAP_SHARE * perimeter;
  const multiplier = fai
    ? closed
      ? CLOSED_FAI_MULTIPLIER
      : FAI_MULTIPLIER
    : closed
      ? CLOSED_FLAT_MULTIPLIER
      : FLAT_MULTIPLIER;
  return {
    kind: fai ? "fai" : "flat",
    closed,
    multiplier,
    points: ((perimeter - gap) / 1000) * multiplier,
  };
}

/** The best triangle, FAI or flat; null when no triangle counts. */
function bestTriangle(fine: LatLon[], fai: boolean): XcScore | null {
  const pick = evenly(fine, COARSE_TRIANGLE);
  const coarse = pick.map((i) => fine[i]);
  const n = coarse.length;
  const d = table(coarse);
  // gap[a][c]: the shortest way from a start at or before a to a finish at
  // or after c.
  const gap = new Float64Array(n * n);
  for (let a = 0; a < n; a += 1) {
    for (let c = n - 1; c >= a; c -= 1) {
      let g = d[a * n + c];
      if (a > 0) {
        g = Math.min(g, gap[(a - 1) * n + c]);
      }
      if (c < n - 1) {
        g = Math.min(g, gap[a * n + c + 1]);
      }
      gap[a * n + c] = g;
    }
  }
  let found: number[] | null = null;
  let bestPoints = 0;
  for (let a = 0; a < n; a += 1) {
    for (let b = a + 1; b < n; b += 1) {
      const ab = d[a * n + b];
      for (let c = b + 1; c < n; c += 1) {
        const t = triangleOf([ab, d[b * n + c], d[c * n + a]], gap[a * n + c], fai);
        if (t !== null && t.points > bestPoints) {
          bestPoints = t.points;
          found = [a, b, c];
        }
      }
    }
  }
  if (found === null) {
    return null;
  }
  const [a, , c] = found;
  // The start and the finish of the coarse gap.
  let s = a;
  let f = c;
  let shortest = Infinity;
  for (let i = 0; i <= a; i += 1) {
    for (let j = c; j < n; j += 1) {
      if (d[i * n + j] < shortest) {
        shortest = d[i * n + j];
        s = i;
        f = j;
      }
    }
  }
  const score = (at: number[]) => {
    const [i, p, q, r, j] = at.map((k) => fine[k]);
    const t = triangleOf([dist(p, q), dist(q, r), dist(r, p)], dist(i, j), fai);
    return t === null ? -1 : t.points;
  };
  const at = refine(
    fine,
    [s, ...found, f].map((k) => pick[k]),
    score,
  );
  const [i, p, q, r, j] = at.map((k) => fine[k]);
  const sides: [number, number, number] = [dist(p, q), dist(q, r), dist(r, p)];
  const closing = dist(i, j);
  const t = triangleOf(sides, closing, fai);
  if (t === null) {
    return null;
  }
  const distanceKm = round2((sides[0] + sides[1] + sides[2] - closing) / 1000);
  return {
    kind: t.kind,
    closed: t.closed,
    multiplier: t.multiplier,
    distanceKm,
    points: round2(distanceKm * t.multiplier),
    start: i,
    turnpoints: [p, q, r],
    finish: j,
    closingKm: round2(closing / 1000),
  };
}

/** The flight's best XC score; null with fewer than two positions. */
export function xcScoreOf(track: LatLon[]): XcScore | null {
  if (track.length < 2) {
    return null;
  }
  const fine = evenly(track, FINE_POINTS).map((i) => track[i]);
  const all = [freeDistance(fine), bestTriangle(fine, false), bestTriangle(fine, true)];
  let best: XcScore | null = null;
  for (const one of all) {
    if (one !== null && (best === null || one.points > best.points)) {
      best = one;
    }
  }
  return best;
}
