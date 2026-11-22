import type { LatLon } from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";
import type { Stroke } from "./matching";

/**
 * How closely the roads follow a drawing (TASK-347 part C, ADR-0300): the
 * score under the map, 0 to 100, and the stretches of the route where the
 * roads went far from the finger, drawn in a third colour.
 *
 * While drawing, the score is the share of the points drawn that have a road
 * within FAR_M; once «Draw route» has answered, the engine's own similarity
 * takes its place (engineScore), as ADR-0300 has it. Never in the posts.
 */

/** A point drawn farther than this from its route was corrected hard. */
export const FAR_M = 40;

/** The strokes the score counts: those the roads draw, or guess in the
 * fields. */
function anchored(strokes: readonly Stroke[]): Stroke[] {
  return strokes.filter(
    (stroke) =>
      (stroke.state === "matched" || stroke.state === "off_roads") &&
      stroke.match !== null,
  );
}

/** The score while drawing, 0 to 100; null before any stroke is anchored. */
export function drawingScore(strokes: readonly Stroke[]): number | null {
  let near = 0;
  let all = 0;
  for (const stroke of anchored(strokes)) {
    for (const away of stroke.match?.away_m ?? []) {
      all += 1;
      if (away <= FAR_M) {
        near += 1;
      }
    }
  }
  return all === 0 ? null : Math.round((100 * near) / all);
}

/** The engine's similarity of a route, 0 to 1, as the score. */
export function engineScore(similarity: number): number {
  return Math.round(100 * Math.min(1, Math.max(0, similarity)));
}

/** The index of the point of `route` nearest to `point`. */
function nearestIndex(route: readonly LatLon[], point: LatLon): number {
  let best = 0;
  let bestM = Infinity;
  route.forEach((each, i) => {
    const m = metresBetween(each, point);
    if (m < bestM) {
      bestM = m;
      best = i;
    }
  });
  return best;
}

/**
 * The stretches of a stroke's route where the roads went farther than
 * FAR_M from the finger: for each run of points drawn far, the route from
 * the point nearest to the run's first to the one nearest to its last, one
 * point either side, so a single point far still shows. None for a stroke
 * the roads do not draw.
 */
export function farStretches(stroke: Stroke): LatLon[][] {
  if (stroke.state !== "matched" || stroke.match === null) {
    return [];
  }
  const { points: route, away_m } = stroke.match;
  if (route.length < 2) {
    return [];
  }
  const runs: [number, number][] = [];
  away_m.forEach((away, i) => {
    if (away <= FAR_M) {
      return;
    }
    const last = runs[runs.length - 1];
    if (last !== undefined && last[1] === i - 1) {
      last[1] = i;
    } else {
      runs.push([i, i]);
    }
  });
  return runs.map(([first, last]) => {
    const a = nearestIndex(route, stroke.points[first]);
    const b = nearestIndex(route, stroke.points[last]);
    const from = Math.max(0, Math.min(a, b) - 1);
    const to = Math.min(route.length - 1, Math.max(a, b) + 1);
    return route.slice(from, to + 1);
  });
}
