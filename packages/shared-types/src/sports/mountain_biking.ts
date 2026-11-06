import type { PlannedSport } from "./base.ts";

/** An MTB ride on its own network, the trails up to mtb:scale S2 too
 * (TASK-378, ADR-0322): 10–30 km. */
export const MOUNTAIN_BIKING = {
  activity: "mountain_biking",
  distanceM: [10_000, 30_000],
} as const satisfies PlannedSport;
