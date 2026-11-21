import type { SleepNight } from "./sleepNight";

/**
 * MuW's sleep score, 0 to 100, worked out on the phone from a night
 * (TASK-467 part A, ADR-0379). It is MuW's own number, not Apple's: the
 * three parts and their weights are the ones Apple tells of its score
 * (how long, how regular the bedtime, how broken), the limits are MuW's,
 * so the two can differ by some points. Not a medical measure.
 */

/** The most each part gives; together 100. */
export const DURATION_POINTS = 50;
export const CONSISTENCY_POINTS = 30;
export const INTERRUPTION_POINTS = 20;

/** Time asleep: nothing up to 4 hours, everything from 8. */
const DURATION_NONE_MIN = 240;
const DURATION_FULL_MIN = 480;

/** Bedtime against the usual one: everything within a quarter of an hour,
 * nothing from two hours off. */
const CONSISTENCY_FULL_MIN = 15;
const CONSISTENCY_NONE_MIN = 120;

/** Time awake during the night: everything up to 5 minutes, nothing from
 * an hour. */
const INTERRUPTION_FULL_MIN = 5;
const INTERRUPTION_NONE_MIN = 60;

/** The usual bedtime needs this many earlier nights. */
export const EARLIER_NIGHTS_MIN = 3;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** `full` at `fullAt`, 0 at `noneAt`, a straight line between, flat
 * outside; `fullAt` may be on either side of `noneAt`. */
function points(value: number, noneAt: number, fullAt: number, full: number): number {
  const share = (value - noneAt) / (fullAt - noneAt);
  return full * Math.min(1, Math.max(0, share));
}

export function durationPoints(asleepMin: number): number {
  return points(asleepMin, DURATION_NONE_MIN, DURATION_FULL_MIN, DURATION_POINTS);
}

export function consistencyPoints(offMin: number): number {
  return points(offMin, CONSISTENCY_NONE_MIN, CONSISTENCY_FULL_MIN, CONSISTENCY_POINTS);
}

export function interruptionPoints(awakeMin: number): number {
  return points(
    awakeMin,
    INTERRUPTION_NONE_MIN,
    INTERRUPTION_FULL_MIN,
    INTERRUPTION_POINTS,
  );
}

/**
 * How far, in minutes, the night's bedtime is from the usual one: the
 * median of the earlier nights' bedtimes, each taken as a time of day (so
 * 23:50 and 00:10 are 20 minutes apart). Null with fewer than
 * `EARLIER_NIGHTS_MIN` earlier nights. A day is 24 hours here: the nights
 * before a change of the clocks read an hour off.
 */
export function bedtimeOffMin(
  bedtimeMs: number,
  earlierBedtimesMs: readonly number[],
): number | null {
  if (earlierBedtimesMs.length < EARLIER_NIGHTS_MIN) {
    return null;
  }
  const offs = earlierBedtimesMs
    .map((earlier) => {
      const off = (((earlier - bedtimeMs) % DAY_MS) + DAY_MS) % DAY_MS;
      return off > DAY_MS / 2 ? off - DAY_MS : off;
    })
    .sort((a, b) => a - b);
  const middle = Math.floor(offs.length / 2);
  const median =
    offs.length % 2 === 1 ? offs[middle] : (offs[middle - 1] + offs[middle]) / 2;
  return Math.abs(median) / MINUTE_MS;
}

export const SLEEP_BANDS = ["poor", "fair", "good", "veryGood", "excellent"] as const;
export type SleepBand = (typeof SLEEP_BANDS)[number];

/** The word beside the score (the user's five bands, 2026-11-11): «Poor»
 * to 39, «Fair» to 59, «Good» to 74, «Very good» to 89, «Excellent». */
export function sleepBand(score: number): SleepBand {
  if (score >= 90) {
    return "excellent";
  }
  if (score >= 75) {
    return "veryGood";
  }
  if (score >= 60) {
    return "good";
  }
  return score >= 40 ? "fair" : "poor";
}

export type SleepScore = {
  /** A whole number, 0 to 100. */
  score: number;
  band: SleepBand;
  /** False when there were too few earlier nights to know the usual
   * bedtime: the score is then the other two parts, brought to 100. */
  withBedtime: boolean;
};

/** The score of a night; `earlierBedtimesMs` are the `fromMs` of the
 * nights before it, in any order. */
export function sleepScore(
  night: SleepNight,
  earlierBedtimesMs: readonly number[] = [],
): SleepScore {
  const base = durationPoints(night.asleepMin) + interruptionPoints(night.awakeMin);
  const offMin = bedtimeOffMin(night.fromMs, earlierBedtimesMs);
  const total =
    offMin === null
      ? (base * 100) / (DURATION_POINTS + INTERRUPTION_POINTS)
      : base + consistencyPoints(offMin);
  const score = Math.round(total);
  return { score, band: sleepBand(score), withBedtime: offMin !== null };
}
