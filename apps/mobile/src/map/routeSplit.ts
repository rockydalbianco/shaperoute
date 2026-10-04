import type { LatLon, Walk } from "@shaperoute/shared-types";

import { walksOf } from "../route/walks";

/**
 * The route cut where the runner is (TASK-224): the part run, drawn solid
 * yellow, and the part left, dashed and blinking.
 *
 * Only what is drawn is cut. With a word with the pen up (TASK-198) those
 * are the letters: the walks between them stay grey and dashed as before.
 * The stretches with the bike on foot (TASK-206) stay over both parts.
 */
export type RouteSplit = { done: LatLon[][]; ahead: LatLon[][] };

/**
 * The map is told of the runner's progress in steps of this many metres: a
 * fix a second at a running pace moves it a step every two seconds or so,
 * and the line run stays a few pixels behind the arrow at most.
 */
export const PROGRESS_STEP_M = 5;

/** Where the line run ends, in metres along the route; Infinity once the
 * route is run to its end, so nothing is left dashed after «You have
 * arrived». */
export function doneMetres(progress: { alongM: number; arrived: boolean }): number {
  if (progress.arrived) {
    return Infinity;
  }
  return Math.floor(progress.alongM / PROGRESS_STEP_M) * PROGRESS_STEP_M;
}

/**
 * The drawn lines of the route, cut at `doneM` metres along it. `along` is
 * the metres along the route at each of its points (`cumulative`). A line
 * the cut falls inside is split there: its two halves share the point of
 * the cut, so the yellow line and the dashes meet.
 */
export function splitRoute(
  points: readonly LatLon[],
  along: readonly number[],
  doneM: number,
  walks: readonly Walk[] | null = null,
): RouteSplit {
  const done: LatLon[][] = [];
  const ahead: LatLon[][] = [];
  for (const [from, to] of drawnRanges(points, walks)) {
    if (along[to] <= doneM) {
      done.push(points.slice(from, to + 1));
    } else if (along[from] >= doneM) {
      ahead.push(points.slice(from, to + 1));
    } else {
      // along[from] < doneM < along[to]: the cut is on a segment of this line.
      let i = from;
      while (along[i + 1] <= doneM) {
        i += 1;
      }
      const cut = pointAt(points[i], points[i + 1], along[i], along[i + 1], doneM);
      done.push([...points.slice(from, i + 1), cut]);
      ahead.push([cut, ...points.slice(i + 1, to + 1)]);
    }
  }
  return { done, ahead };
}

/** The ranges of points drawn, both ends included: the whole route, or the
 * letters of a word with the pen up, each at least one step long. */
function drawnRanges(
  points: readonly LatLon[],
  walks: readonly Walk[] | null,
): [number, number][] {
  if (points.length < 2) {
    return [];
  }
  const ranges: [number, number][] = [];
  let from = 0;
  for (const [start, end] of walksOf(points, walks)) {
    ranges.push([from, start]);
    from = end;
  }
  ranges.push([from, points.length - 1]);
  return ranges.filter(([start, end]) => end > start);
}

/** The point `m` metres along the route, on the segment from `a` to `b`. */
function pointAt(a: LatLon, b: LatLon, aM: number, bM: number, m: number): LatLon {
  const t = bM > aM ? (m - aM) / (bM - aM) : 0;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}
