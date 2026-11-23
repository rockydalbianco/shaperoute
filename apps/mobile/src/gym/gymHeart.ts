import type { BodyProfile } from "../body/bodyProfile";
import { type HeartSettings, maxHeartRate, zonesOf } from "../body/heartZones";
import { zoneSeconds } from "../body/zoneTime";
import { heartSummary, type HeartSample, type Span } from "../health/heartSamples";
import type { PoolHeart } from "../pool/poolHeart";
import { activeMs, type Workout } from "./workout";

/**
 * The heart rate of a workout at the gym (TASK-385 part G, ADR-0327 point
 * 7), as a swim in a pool has it (pool/poolHeart.ts): what a watch wrote
 * in Apple Health from its start to its end, its pauses left out. Read
 * after the same consent as the pool's (the user's «Un sì per tutti»,
 * 2026-11-23): one tap on «Add heart rate from Apple Health», at the end
 * of either, reads both from then on. The average and maximum go to the
 * API with the workout and show in its post unless «Show heart rate» is
 * off; the time in each zone stays on the phone (ADR-0318 point 1).
 */

/** The heart rate of a workout, as its end shows it: the swim's. */
export type GymHeart = PoolHeart;

/** The workout's window: from its start to its end, and its pauses. */
export function gymWindow(workout: Workout): {
  fromMs: number;
  toMs: number;
  pauses: Span[];
} {
  const toMs = workout.endedMs ?? workout.startedMs;
  return {
    fromMs: workout.startedMs,
    toMs,
    pauses: workout.pauses.map((pause) => ({
      fromMs: pause.fromMs,
      toMs: pause.toMs ?? toMs,
    })),
  };
}

/** Whether the workout ended and lasted at all: one of no time has no
 * window. */
export function hasGymWindow(workout: Workout): boolean {
  return workout.endedMs !== null && activeMs(workout, workout.endedMs) > 0;
}

/** The heart rate of `samples`, already of the workout's window
 * (heartSamples.readHeart), with the zones of `heart` and `body`; null
 * without readings. */
export function gymHeartOf(
  samples: readonly HeartSample[],
  workout: Workout,
  heart: HeartSettings,
  body: BodyProfile,
  year: number,
): GymHeart | null {
  const summary = heartSummary(samples);
  if (summary === null) {
    return null;
  }
  const max = maxHeartRate(heart, body, year);
  const endMs = workout.endedMs ?? workout.startedMs;
  return {
    ...summary,
    zoneS: max === null ? null : zoneSeconds(samples, zonesOf(max.bpm, heart), endMs),
  };
}
