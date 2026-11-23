import { appBody, type BodyProfile } from "../body/bodyProfile";
import { loadHealthOn } from "../health/healthChoice";
import type { HealthPhone } from "../health/healthPhone";
import type { Workout as HealthWorkout } from "../health/workout";
import { gymKcal } from "./gymKcal";
import { activeMs, type Workout } from "./workout";

/**
 * A workout at the gym as Apple Health and Health Connect take it (TASK-385
 * part C, ADR-0327): strength training (src/sports/gym.ts) with its energy
 * (gymKcal.ts) and its pauses, no route and no distance, indoors
 * (appleWorkout.ts). A cardio block's metres are the block's, not the
 * workout's: none is written. Null before its end.
 */
export function gymWorkoutOf(
  workout: Workout,
  body: BodyProfile = appBody(),
): HealthWorkout | null {
  const endMs = workout.endedMs;
  if (endMs === null || endMs <= workout.startedMs) {
    return null;
  }
  const kcal = gymKcal(
    workout.sets,
    activeMs(workout, endMs) / 1000,
    body,
    new Date(workout.startedMs).getFullYear(),
  );
  return {
    activity: "gym",
    startMs: workout.startedMs,
    endMs,
    distanceM: 0,
    kcal: kcal > 0 ? kcal : null,
    route: [],
    pauses: workout.pauses.flatMap((pause) => {
      const fromMs = Math.max(pause.fromMs, workout.startedMs);
      const toMs = Math.min(pause.toMs ?? endMs, endMs);
      return toMs > fromMs ? [{ fromMs, toMs }] : [];
    }),
    // The key on the API: the same workout written twice is one workout.
    syncId: workout.key,
  };
}

/**
 * With «Save»: the workout also goes to the phone's health data, as a run's
 * does (health/useHealth.ts, saveToHealth), when the user said yes and the
 * permission, read now, still allows it. Never fails «Save».
 */
export async function saveGymToHealth(
  phone: HealthPhone | null,
  workout: Workout,
): Promise<boolean> {
  if (phone === null || !loadHealthOn()) {
    return false;
  }
  try {
    if (!(await phone.available()) || (await phone.permission()) !== "allowed") {
      return false;
    }
    const written = gymWorkoutOf(workout);
    return written !== null && (await phone.write(written));
  } catch {
    return false;
  }
}
