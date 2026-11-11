/**
 * The parts of a day of skiing (TASK-424 part C2b, with TASK-429): its
 * lifts and its descents, sent by the phone with the run's figures (PUT
 * /me/activities/{key}/stats, `ski_parts`), kept by the API with their
 * times on the clock of the run's track. The sum of the descents alone is
 * in every list of posts (`ski_descents`): a day's calories are counted on
 * it, as the phone counts them at the end of the day (body/energy.ts).
 *
 * A server before part C2b refuses `ski_parts` (422): the server goes
 * first, the app after.
 */

/** At most this many parts in a day. */
export const SKI_PARTS_MAX = 500;

export type SkiPartKind = "lift" | "descent";

/** A part as the phone sends it: its times on the phone's clock, the one of
 * the track's `time_ms`. */
export interface SkiPartRequest {
  kind: SkiPartKind;
  /** Which one of its kind: 1, 2, … */
  n: number;
  start_ms: number;
  end_ms: number;
  /** Its time in movement, pauses left out: never more than it lasts. */
  moving_s: number;
  metres: number;
  /** Up by a lift, down by a descent. */
  height_m: number;
  /** A descent's top speed; null for a lift, or a descent too short. */
  top_mps: number | null;
}

/** A part as the API keeps it: its times in seconds from the first point
 * of the run's track. */
export interface SkiPart {
  kind: SkiPartKind;
  n: number;
  start_s: number;
  end_s: number;
  moving_s: number;
  metres: number;
  height_m: number;
  top_mps: number | null;
}

/** The descents of a day together: what its calories are counted on. */
export interface SkiDescents {
  metres: number;
  moving_s: number;
}
