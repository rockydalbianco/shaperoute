import type { RouteResult } from "@shaperoute/shared-types";

/**
 * The routes to choose from (TASK-093, ADR-0087): the engine's choice
 * first, then its alternatives, best first. An older API sends none.
 */
export function choicesOf(result: RouteResult): RouteResult[] {
  return [result, ...(result.alternatives ?? [])];
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
