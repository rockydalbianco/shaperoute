import type { PlannedSport } from "./base.ts";

/** Inline skating on its own network, the smooth paved ways, every way both
 * ways (TASK-380, ADR-0324): 5–30 km. */
export const INLINE_SKATING = {
  activity: "inline_skating",
  distanceM: [5_000, 30_000],
} as const satisfies PlannedSport;
