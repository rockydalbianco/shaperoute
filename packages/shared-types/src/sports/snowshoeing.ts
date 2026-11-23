import type { PlannedSport } from "./base.ts";

/** Snowshoeing (TASK-413, ADR-0342): a small shape of the catalogue placed
 * freely on open snow one may walk on, away from steep slopes, woods,
 * pistes, rock and villages, reached from a way in on foot: 0.5–3 km. */
export const SNOWSHOEING = {
  activity: "snowshoeing",
  distanceM: [500, 3_000],
} as const satisfies PlannedSport;
