import type { SleepNight } from "./sleepNight";
import {
  bedtimeOffMin,
  consistencyPoints,
  durationPoints,
  interruptionPoints,
  sleepBand,
  sleepScore,
} from "./sleepScore";

// TASK-467 part A, ADR-0379: MuW's own sleep score, 0 to 100 — how long
// (50), how regular the bedtime (30), how broken (20).

const BED = Date.UTC(2026, 10, 10, 22, 50);
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** The bedtimes of the nights before, each so many minutes later than the
 * same time of day as BED. */
const earlier = (...offMin: number[]) =>
  offMin.map((off, i) => BED - (i + 1) * DAY + off * MIN);

const night = (asleepMin: number, awakeMin: number): SleepNight => ({
  fromMs: BED,
  toMs: BED + (asleepMin + awakeMin) * MIN,
  asleepMin,
  awakeMin,
  stages: null,
});

test("how long: nothing up to 4 hours, everything from 8", () => {
  expect([100, 240, 360, 420, 480, 600].map(durationPoints)).toEqual([
    0, 0, 25, 37.5, 50, 50,
  ]);
});

test("how broken: everything up to 5 minutes awake, nothing from an hour", () => {
  expect([0, 5, 32.5, 60, 90].map(interruptionPoints)).toEqual([20, 20, 10, 0, 0]);
});

test("how regular: everything within a quarter of an hour, nothing from two hours", () => {
  expect([0, 15, 67.5, 120, 300].map(consistencyPoints)).toEqual([30, 30, 15, 0, 0]);
});

test("the usual bedtime is the median of the earlier ones, as a time of day", () => {
  expect(bedtimeOffMin(BED, earlier(0, 0, 0))).toBe(0);
  expect(bedtimeOffMin(BED, earlier(-10, 50, 30))).toBe(30);
  expect(bedtimeOffMin(BED, earlier(-40, -20, 0, 90))).toBe(10);
  // One very late night does not move it.
  expect(bedtimeOffMin(BED, earlier(5, 5, 5, 5, 240))).toBe(5);
});

test("around midnight, 23:50 and 00:10 are 20 minutes apart", () => {
  const before = Date.UTC(2026, 10, 10, 23, 50);
  const after = [1, 2, 3].map((days) => Date.UTC(2026, 10, 11 - days, 0, 10));
  expect(bedtimeOffMin(before, after)).toBe(20);
});

test("no usual bedtime with fewer than three earlier nights", () => {
  expect(bedtimeOffMin(BED, [])).toBeNull();
  expect(bedtimeOffMin(BED, earlier(0, 0))).toBeNull();
});

test("the bands: Poor, Fair, Good, Very good, Excellent", () => {
  expect([0, 39, 40, 59, 60, 74, 75, 89, 90, 100].map(sleepBand)).toEqual([
    "poor",
    "poor",
    "fair",
    "fair",
    "good",
    "good",
    "veryGood",
    "veryGood",
    "excellent",
    "excellent",
  ]);
});

test("a full night at the usual time is 100", () => {
  expect(sleepScore(night(480, 5), earlier(0, 10, -10))).toEqual({
    score: 100,
    band: "excellent",
    withBedtime: true,
  });
});

test("the three parts add up, to a whole number", () => {
  // 7 hours: 37.5. 20 minutes awake: 14.5. An hour off: 17.1. → 69.2
  expect(sleepScore(night(420, 20), earlier(60, 60, 60))).toEqual({
    score: 69,
    band: "good",
    withBedtime: true,
  });
  expect(sleepScore(night(200, 90), earlier(180, 180, 180))).toEqual({
    score: 0,
    band: "poor",
    withBedtime: true,
  });
});

test("with too few earlier nights, the other two parts are brought to 100", () => {
  expect(sleepScore(night(480, 0))).toEqual({
    score: 100,
    band: "excellent",
    withBedtime: false,
  });
  // 6 hours and an hour awake: 25 of 70.
  expect(sleepScore(night(360, 60), earlier(0, 0))).toEqual({
    score: 36,
    band: "poor",
    withBedtime: false,
  });
});
