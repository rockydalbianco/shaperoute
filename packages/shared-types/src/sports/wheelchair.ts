import type { PlannedSport } from "./base.ts";

/** A wheelchair or a stroller on its own network, without steps, raised
 * kerbs, rough surfaces or big roads with no sidewalk (TASK-414, ADR-0343):
 * 1–5 km, and only a circle, a heart, a star or a moon. */
export const WHEELCHAIR = {
  activity: "wheelchair",
  distanceM: [1_000, 5_000],
} as const satisfies PlannedSport;
