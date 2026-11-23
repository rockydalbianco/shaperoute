import type { RecordedSport } from "./base.ts";

/** A day of ski touring, up on skins and down on skis, recorded without a
 * shape (TASK-415, ADR-0344), as alpine skiing (TASK-375, ADR-0319). */
export const SKI_TOURING = {
  activity: "ski_touring",
  recordOnly: true,
} as const satisfies RecordedSport;
