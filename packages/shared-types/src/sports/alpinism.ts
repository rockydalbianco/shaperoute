import type { RecordedSport } from "./base.ts";

/** A day of mountaineering, recorded without a shape (TASK-463, ADR-0373),
 * as a day of ski touring and a paragliding flight: a climb on rock, snow
 * and ice has no shape to draw. The API had it first (part A). */
export const ALPINISM = {
  activity: "alpinism",
  recordOnly: true,
} as const satisfies RecordedSport;
