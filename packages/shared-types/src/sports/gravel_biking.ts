import type { PlannedSport } from "./base.ts";

/** A gravel ride, drawn as a ride on the bike network (TASK-378, ADR-0322):
 * 10–30 km. */
export const GRAVEL_BIKING = {
  activity: "gravel_biking",
  distanceM: [10_000, 30_000],
} as const satisfies PlannedSport;
