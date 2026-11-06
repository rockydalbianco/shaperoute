import { loadHealthOn } from "../health/healthChoice";
import type { HealthPhone } from "../health/healthPhone";
import type { Workout } from "../health/workout";
import { poolMetres, type PoolSwim } from "./poolSwim";

/**
 * A swim in a pool as Apple Health and Health Connect take it (TASK-400
 * part B, ADR-0334, point 6): a swim with its metres and pauses, no route,
 * no energy (a swim has none yet, TASK-323 C2), and its pool, which the
 * two builders turn into a swim in a pool (appleWorkout.ts,
 * healthConnectWorkout.ts). Null before its end.
 */
export function poolWorkoutOf(swim: PoolSwim, lengths: number): Workout | null {
  const endMs = swim.endedMs;
  if (endMs === null || endMs <= swim.startedMs) {
    return null;
  }
  return {
    activity: "swimming",
    startMs: swim.startedMs,
    endMs,
    distanceM: poolMetres(lengths, swim.poolLengthM),
    kcal: null,
    route: [],
    pauses: swim.pauses.flatMap((pause) => {
      const fromMs = Math.max(pause.fromMs, swim.startedMs);
      const toMs = Math.min(pause.toMs ?? endMs, endMs);
      return toMs > fromMs ? [{ fromMs, toMs }] : [];
    }),
    // The key on the API: the same swim written twice is one workout.
    syncId: swim.key,
    pool: { lengthM: swim.poolLengthM },
  };
}

/**
 * With «Save»: the swim also goes to the phone's health data, as a run's
 * does (health/useHealth.ts, saveToHealth), when the user said yes and the
 * permission, read now, still allows it. Never fails «Save».
 */
export async function savePoolToHealth(
  phone: HealthPhone | null,
  swim: PoolSwim,
  lengths: number,
): Promise<boolean> {
  if (phone === null || !loadHealthOn()) {
    return false;
  }
  try {
    if (!(await phone.available()) || (await phone.permission()) !== "allowed") {
      return false;
    }
    const workout = poolWorkoutOf(swim, lengths);
    return workout !== null && (await phone.write(workout));
  } catch {
    return false;
  }
}
