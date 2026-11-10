import type { LiveStats } from "@shaperoute/shared-types";

import type { BodyProfile } from "../body/bodyProfile";
import { tracklessStats } from "../liveShare/liveStats";
import { gymKcal } from "./gymKcal";
import type { Entry } from "./setKinds";
import { activeMs, type Workout } from "./workout";

/**
 * What the live link of a workout at the gym sends (TASK-424 part B2): no
 * points, the time without the pauses (the rests in it, as on the screen),
 * the exercise in progress, the calories so far as the screen counts them,
 * and the watch's heart rate when there is one.
 */
export function gymLiveStats(
  workout: Workout,
  atMs: number,
  body: BodyProfile,
  name: (entry: Entry) => string,
  bpm: number | null,
): LiveStats {
  const timeMs = activeMs(workout, atMs);
  const kcal = gymKcal(
    workout.sets,
    timeMs / 1000,
    body,
    new Date(workout.startedMs).getFullYear(),
  );
  return tracklessStats({
    activeMs: timeMs,
    kcal,
    bpm,
    exercise: workout.current === null ? null : name(workout.current),
  });
}
