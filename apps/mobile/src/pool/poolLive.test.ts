/**
 * What the live link of a swim in a pool sends (TASK-424 part B2): the time
 * without the pauses, the lengths estimated from the pace (none before the
 * first half length), their calories, no distance, no climb.
 */
import { NO_BODY } from "../body/bodyProfile";
import { poolKcal } from "./poolKcal";
import { liveLengths, poolLiveStats } from "./poolLive";
import {
  estimateLengths,
  newPoolSwim,
  pausePoolSwim,
  resumePoolSwim,
} from "./poolSwim";

const T0 = Date.UTC(2026, 10, 10, 7);
const S = 1000;

test("no length before the first half; then the estimate of «How many lengths?»", () => {
  // 25 m at 2:00 /100 m: a length every 30 s.
  expect(liveLengths(0, 25, null)).toBe(0);
  expect(liveLengths(14, 25, null)).toBe(0);
  expect(liveLengths(15, 25, null)).toBe(1);
  expect(liveLengths(600, 25, null)).toBe(20);
  expect(liveLengths(600, 25, null)).toBe(estimateLengths(600, 25, null));
  // The pace of the last swims: 1:30 /100 m in a 50 m pool, 45 s a length.
  expect(liveLengths(22, 50, 90)).toBe(0);
  expect(liveLengths(900, 50, 90)).toBe(20);
});

test("the numbers of a swim: time without the pauses, lengths, calories", () => {
  let swim = newPoolSwim("k", 25, T0);
  swim = pausePoolSwim(swim, T0 + 300 * S);
  swim = resumePoolSwim(swim, T0 + 360 * S);
  const stats = poolLiveStats(swim, T0 + 660 * S, null, NO_BODY, null);
  expect(stats).toEqual({
    duration_s: 600,
    lengths: 20,
    kcal: poolKcal(500, 600, NO_BODY, 2026),
    heart_bpm: null,
  });
  expect(stats.kcal).toBeGreaterThan(0);
  expect(stats).not.toHaveProperty("distance_m");
});

test("in a pause the time stands still; at the start no calories", () => {
  const swim = pausePoolSwim(newPoolSwim("k", 25, T0), T0 + 120 * S);
  expect(poolLiveStats(swim, T0 + 900 * S, null, NO_BODY, null).duration_s).toBe(120);
  expect(
    poolLiveStats(newPoolSwim("k", 25, T0), T0 + 5 * S, null, NO_BODY, 130),
  ).toEqual({ duration_s: 5, lengths: 0, kcal: null, heart_bpm: 130 });
});
