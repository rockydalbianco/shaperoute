import type { RunActivity } from "@shaperoute/shared-types";

import type { Effort } from "../body/energy";
import type { Track } from "../navigation/trackRecorder";
import { profileOf } from "../sports";
import { type SnowDay, snowDay } from "./snowDay";

/**
 * What a recorded `track` was, as far as its energy goes (TASK-424 part
 * C2): its metres, its seconds in movement and its metres climbed; for
 * alpine skiing (`skied`, src/sports) the descents alone, lifts and the
 * time between them left out, as the user chose on 2026-11-10 («Formula
 * da sci»). Pure: the same numbers live, at the end of the day, in Apple
 * Health and on the post's page.
 */

/** The day on the snow of `track`, for a sport whose distance is the one
 * skied; null for any other. */
export function skiedDay(activity: RunActivity, track: Track): SnowDay | null {
  return profileOf(activity).skied === true ? snowDay(track) : null;
}

/**
 * The effort of `track` done as `activity`: `seconds` in movement and
 * `climbed` metres up, as the screen counts them. `day`, when the caller
 * has it already (skiedDay), saves reading the track twice.
 */
export function trackEffort(
  activity: RunActivity,
  track: Track,
  seconds: number,
  climbed: number | null,
  day: SnowDay | null = skiedDay(activity, track),
): Effort {
  if (day !== null) {
    return {
      activity,
      metres: day.skiedM,
      seconds: day.skiedMs / 1000,
      // Downhill: no climbing of one's own, the lifts did it.
      climbM: null,
    };
  }
  return { activity, metres: track.distanceM, seconds, climbM: climbed };
}
