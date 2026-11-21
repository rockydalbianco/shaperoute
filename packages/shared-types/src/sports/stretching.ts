import type { TracklessSport } from "./base.ts";

/** A stretching session, saved without a track (TASK-475, ADR-0386). */
export const STRETCHING = {
  activity: "stretching",
  trackless: true,
} as const satisfies TracklessSport;
