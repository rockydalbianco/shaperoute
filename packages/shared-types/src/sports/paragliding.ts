import type { RecordedSport } from "./base.ts";

/** A paragliding flight, recorded without a shape (TASK-305 parts R,
 * ADR-0375), as a day of alpine skiing (TASK-375, ADR-0319): the planner of
 * shapes in the glide cone (ADR-0265) waits for an airspace licence. */
export const PARAGLIDING = {
  activity: "paragliding",
  recordOnly: true,
} as const satisfies RecordedSport;
