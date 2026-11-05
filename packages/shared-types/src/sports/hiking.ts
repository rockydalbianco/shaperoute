import type { PlannedSport } from "./base.ts";

/** A hike, on the trails and the quiet roads of its own network (TASK-377,
 * ADR-0321): 1–30 km. */
export const HIKING = {
  activity: "hiking",
  distanceM: [1_000, 30_000],
} as const satisfies PlannedSport;
