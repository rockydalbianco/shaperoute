import type { LatLon, Stretch, Walk } from "@shaperoute/shared-types";

import { walksOf } from "./walks";

/**
 * The stretches of a bike route walked with the bike on foot (TASK-206,
 * ADR-0167): pairs [from, to] of indices into the route's points, both
 * included, as the API sends them in `on_foot`. Unlike the walks of a word
 * with the pen up they are part of the drawing: the route stays one yellow
 * line, and the stretches are marked over it.
 */

/** No stretches: a run, a route on the water, an API older than TASK-206. */
export const NO_STRETCHES: readonly Stretch[] = [];

/**
 * The stretches of a route when they fit its points, checked as the walks
 * are (`walksOf`, the same shape): whole indices, in order, one after the
 * other, each at least one step long. Anything else is not trusted, and the
 * route has none, as an older API sends it.
 */
export function onFootOf(
  points: readonly LatLon[],
  onFoot: readonly Stretch[] | null | undefined,
): readonly Stretch[] {
  const fit = walksOf(points, onFoot);
  return fit.length === 0 ? NO_STRETCHES : fit;
}

/**
 * The lines to mark on the map, each of at least two points: the stretches
 * that fit the route, less what of them lies on the walks of a word with
 * the pen up, which are not drawn in yellow (TASK-198).
 */
export function onFootLines(
  points: readonly LatLon[],
  onFoot: readonly Stretch[] | null | undefined,
  walks: readonly Walk[] | null | undefined = null,
): LatLon[][] {
  const stretches = onFootOf(points, onFoot);
  if (stretches.length === 0) {
    return [];
  }
  // The letters: what is between the walks, as ranges of indices.
  const drawn: [number, number][] = [];
  let from = 0;
  for (const [start, end] of walksOf(points, walks)) {
    drawn.push([from, start]);
    from = end;
  }
  drawn.push([from, points.length - 1]);
  const lines: LatLon[][] = [];
  for (const [start, end] of stretches) {
    for (const [first, last] of drawn) {
      const a = Math.max(start, first);
      const b = Math.min(end, last);
      if (a < b) {
        lines.push(points.slice(a, b + 1));
      }
    }
  }
  return lines;
}
