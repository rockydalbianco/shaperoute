import { NO_BODY } from "../body/bodyProfile";
import { NO_HEART } from "../body/heartZones";
import type { HeartSample } from "../health/heartSamples";
import { gymHeartOf, gymWindow, hasGymWindow } from "./gymHeart";
import { finishWorkout, newWorkout, pauseWorkout, resumeWorkout } from "./workout";

// TASK-385 part G: the window of a workout at the gym and its heart rate,
// as a swim's (poolHeart.ts).

const T0 = Date.UTC(2026, 10, 23, 17);
const MIN = 60_000;

test("the window is the workout's start and end, its pauses left out", () => {
  let w = newWorkout("gymkey12345", T0);
  w = pauseWorkout(w, T0 + 10 * MIN);
  w = resumeWorkout(w, T0 + 15 * MIN);
  w = finishWorkout(w, T0 + 60 * MIN);
  expect(gymWindow(w)).toEqual({
    fromMs: T0,
    toMs: T0 + 60 * MIN,
    pauses: [{ fromMs: T0 + 10 * MIN, toMs: T0 + 15 * MIN }],
  });
  expect(hasGymWindow(w)).toBe(true);
});

test("a workout not ended, or of no time, has no window", () => {
  const going = newWorkout("gymkey12345", T0);
  expect(hasGymWindow(going)).toBe(false);
  expect(hasGymWindow({ ...going, endedMs: T0 })).toBe(false);
});

test("its average, maximum and zones; none without readings", () => {
  const w = finishWorkout(newWorkout("gymkey12345", T0), T0 + 20 * MIN);
  // 10 min at 120, 10 at 160, one every 5 s.
  const samples: HeartSample[] = [];
  for (let s = 0; s < 1200; s += 5) {
    const at = T0 + s * 1000;
    samples.push({ fromMs: at, toMs: at, bpm: s < 600 ? 120 : 160 });
  }
  // Born in 1986: a max of 180 in 2026.
  const body = { ...NO_BODY, birthYear: 1986 };
  const heart = gymHeartOf(samples, w, NO_HEART, body, 2026);
  expect(heart).toMatchObject({ avgBpm: 140, maxBpm: 160 });
  expect(heart?.zoneS).toHaveLength(5);
  expect(heart?.zoneS?.reduce((sum, s) => sum + s, 0)).toBeCloseTo(1200, -1);
  // Without a max heart rate, no zones.
  expect(gymHeartOf(samples, w, NO_HEART, NO_BODY, 2026)?.zoneS).toBeNull();
  expect(gymHeartOf([], w, NO_HEART, body, 2026)).toBeNull();
});
