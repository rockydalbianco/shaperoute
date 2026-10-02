import type { LatLon, RouteResult, Walk } from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";

/**
 * The walks of a word with the pen up (TASK-197, ADR-0157; TASK-198): pairs
 * [from, to] of indices into the route's points, both included, each from
 * the end of a letter to the start of the next. The route stays one line to
 * follow; the walks say which of it is walked, not drawn.
 */

/** No walks: a shape, a word with the pen down, an API older than TASK-197. */
export const NO_WALKS: readonly Walk[] = [];

/**
 * The walks of a route when they fit its points: whole indices, in order,
 * one after the other, each at least one step long. Anything else is not
 * trusted, and the route is one line, as an older API sends it: the API is
 * ours, but it is another program.
 */
export function walksOf(
  points: readonly LatLon[],
  walks: readonly Walk[] | null | undefined,
): readonly Walk[] {
  if (!Array.isArray(walks) || walks.length === 0) {
    return NO_WALKS;
  }
  const fit: Walk[] = [];
  let after = 0;
  for (const walk of walks as readonly unknown[]) {
    if (!Array.isArray(walk) || walk.length !== 2) {
      return NO_WALKS;
    }
    const [from, to]: unknown[] = walk;
    if (
      typeof from !== "number" ||
      typeof to !== "number" ||
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < after ||
      to <= from ||
      to >= points.length
    ) {
      return NO_WALKS;
    }
    fit.push([from, to]);
    after = to;
  }
  return fit;
}

/**
 * The route cut where the pen goes up and where it comes down: the letters,
 * and the walks between them, each a line of at least two points. A letter
 * ends where its walk begins, and the next begins where the walk ends.
 */
export function piecesOf(
  points: readonly LatLon[],
  walks: readonly Walk[],
): { letters: LatLon[][]; walks: LatLon[][] } {
  const letters: LatLon[][] = [];
  const walked: LatLon[][] = [];
  let from = 0;
  for (const [start, end] of walks) {
    letters.push(points.slice(from, start + 1));
    walked.push(points.slice(start, end + 1));
    from = end;
  }
  letters.push(points.slice(from));
  return {
    letters: letters.filter((line) => line.length > 1),
    walks: walked,
  };
}

/** The metres of the walks, along the route's points. */
export function walkedMetres(
  points: readonly LatLon[],
  walks: readonly Walk[],
): number {
  let total = 0;
  for (const [from, to] of walks) {
    for (let i = from + 1; i <= to; i += 1) {
      total += metresBetween(points[i - 1], points[i]);
    }
  }
  return total;
}

/**
 * A word with the pen up in metres: its letters, which the run records and
 * the distance asked for is of, and its walks, which it does not (ADR-0157);
 * null for any other route. The letters' are the route's distance less the
 * walks'.
 */
export function penSplit(
  result: Pick<RouteResult, "points" | "distance_m" | "walks">,
): { lettersM: number; walksM: number } | null {
  const walks = walksOf(result.points, result.walks);
  if (walks.length === 0) {
    return null;
  }
  const walksM = walkedMetres(result.points, walks);
  return { lettersM: Math.max(0, result.distance_m - walksM), walksM };
}
