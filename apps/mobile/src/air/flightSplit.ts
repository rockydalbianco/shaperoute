import type { RunActivity } from "@shaperoute/shared-types";

import { type FlightSplitStats, isFlightSplit } from "../api/runStats";

import type { BodyProfile } from "../body/bodyProfile";
import { activeKcal } from "../body/energy";
import { t } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { isShown } from "../feed/feedPosts";
import type { SamplePost } from "../feed/sampleFeed";
import type { Track } from "../navigation/trackRecorder";
import { topSpeedMps } from "./flight";
import type { FlightPart } from "./flightParts";

/**
 * A race on foot and in the air in words and calories (TASK-305 part R6b):
 * the line of the Feed, «On foot 1:58:40 · In the air 1:43:30» (the user's
 * words of 2026-11-12), and the calories counted part by part, each with its
 * own effort: on foot a run's or a hike's by its pace, in the air the
 * flight's MET (src/sports/paragliding.ts).
 */

/** Faster than this on foot is a run, slower a hike: 7:30 /km. */
export const RUN_PACE_S_PER_KM = 450;

/** «On foot 1:58:40 · In the air 1:43:30»: the two kinds' times. */
export function splitLine(footMs: number, airMs: number): string {
  return t("On foot {foot} · In the air {air}", {
    foot: clockLabel(footMs),
    air: clockLabel(airMs),
  });
}

/** A member's post of a race on foot and in the air: its two kinds added
 * up, as every list of posts gives them (`flight_split`, TASK-305 part
 * R6a); null for any other post and for an API before it. */
export function postSplit(post: SamplePost): FlightSplitStats | null {
  if (!isShown(post)) {
    return null;
  }
  const split: unknown = (post.drawing as { flight_split?: unknown }).flight_split;
  return isFlightSplit(split) ? split : null;
}

/** «On foot 1:58:40 · In the air 1:43:30» of a post's split. */
export function postSplitLine(split: FlightSplitStats): string {
  return splitLine(split.foot.seconds * 1000, split.air.seconds * 1000);
}

/** The top speed of a race's parts in the air alone: the car of the
 * retrieve, on foot, is no speed of the flight. Null without one. */
export function airTopSpeedMps(
  track: Track,
  parts: readonly FlightPart[],
): number | null {
  let top: number | null = null;
  for (const part of parts) {
    if (part.kind !== "air") {
      continue;
    }
    const fixes = track.fixes.filter(
      (fix) => fix.timeMs >= part.startMs && fix.timeMs <= part.endMs,
    );
    const speed = topSpeedMps({ fixes, distanceM: part.metres });
    if (speed !== null) {
      top = top === null ? speed : Math.max(top, speed);
    }
  }
  return top;
}

/** The activity a part's effort is counted as. */
export function partActivity(part: FlightPart): RunActivity {
  if (part.kind === "air") {
    return "paragliding";
  }
  const seconds = part.movingMs / 1000;
  return part.metres > 0 && (seconds / part.metres) * 1000 < RUN_PACE_S_PER_KM
    ? "running"
    : "hiking";
}

/** The active calories of the parts, each with its own effort. */
export function flightKcal(
  parts: readonly FlightPart[],
  body: BodyProfile,
  year: number,
): number {
  return parts.reduce(
    (sum, part) =>
      sum +
      activeKcal(
        {
          activity: partActivity(part),
          metres: part.metres,
          seconds: part.movingMs / 1000,
          climbM: part.climbM,
        },
        body,
        year,
      ),
    0,
  );
}
