import type { RouteResult } from "@shaperoute/shared-types";

/**
 * The routes to choose from (TASK-093, ADR-0087): the engine's choice
 * first, then its alternatives, best first. An older API sends none.
 */
export function choicesOf(result: RouteResult): RouteResult[] {
  return [result, ...(result.alternatives ?? [])];
}

/** Three routes in all, the engine's too (the user's choice, TASK-093). */
export const MAX_CHOICES = 3;

/**
 * The whole answer, when its first route is already on screen (TASK-435,
 * ADR-0361; the user's choice: «the first stays A»). The first route stays
 * the one shown, as it is; the routes of the answer follow as its
 * alternatives, best first, without the one that is the first itself (the
 * same points); MAX_CHOICES in all, so the last one is left out when the
 * engine did not keep the first. Nothing changes under the eyes: a better
 * route is another tile, with its percentage.
 */
export function withFirst(first: RouteResult, whole: RouteResult): RouteResult {
  const others = choicesOf(whole)
    .filter((route) => !samePoints(route.points, first.points))
    // As the engine's alternatives are: none of their own, and no better
    // distance, which is the request's (the first route has its own).
    .map((route) => ({ ...route, alternatives: [], better_distance_m: null }));
  return { ...first, alternatives: others.slice(0, MAX_CHOICES - 1) };
}

function samePoints(a: RouteResult["points"], b: RouteResult["points"]): boolean {
  return (
    a.length === b.length &&
    a.every((point, i) => point[0] === b[i][0] && point[1] === b[i][1])
  );
}

/** The name of a tile: A, B, C. */
export function choiceLabel(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

/** How much a route looks like the shape, as the tiles say it: "80%". */
export function likeness(result: RouteResult): string {
  return `${Math.round(result.similarity * 100)}%`;
}

/** The route chosen, kept with the result it belongs to: a new result
 * starts again from its first route. */
export type Picked = { of: RouteResult; index: number } | null;

export function pickedIndex(picked: Picked, result: RouteResult | null): number {
  if (result === null || picked === null || picked.of !== result) {
    return 0;
  }
  return Math.min(picked.index, choicesOf(result).length - 1);
}
