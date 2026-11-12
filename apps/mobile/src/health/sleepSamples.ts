import {
  SLEEP_NIGHT_MAX_MIN,
  SLEEP_SCORE_MAX,
  type SleepSummary,
} from "@shaperoute/shared-types";

import type { HealthStore } from "./healthPhone";
import { type SleepNight, sleepNight, type SleepSample } from "./sleepNight";
import { sleepScore } from "./sleepScore";

/**
 * «Sleep last night» (TASK-467 part B2): from the sleep samples the phone's
 * health data hold to the night before an activity, as the post of that
 * activity says it. Pure functions and the shape of a reader; nothing here
 * reads Apple Health or asks for a permission: the reader that does comes
 * with the native build (part C, `sleepModules.ts`).
 *
 * Only this summary ever leaves the phone, and only with a post its owner
 * publishes: the samples, and the hours of going to bed and of waking,
 * stay here.
 */

/** Where the phone keeps the samples, as HeartReader for the heart rate. */
export type SleepReader = {
  store: HealthStore;
  available(): Promise<boolean>;
  /** Opens the phone's sheet to read the sleep. */
  ask(): Promise<void>;
  /** The samples that touch the span from `fromMs` to `toMs`, in any
   * order; none when reading was refused. */
  samples(fromMs: number, toMs: number): Promise<SleepSample[]>;
};

/** A night belongs to the day it ends in: its samples are those from this
 * hour of the evening before to the same hour of that day, on the phone's
 * clock. */
export const NIGHT_TURN_HOUR = 18;

/** An activity before this hour, with no sleep yet since the evening, is
 * still of the day before: its night is the one before that. */
export const STILL_YESTERDAY_HOUR = 6;

/** How many nights back the usual bedtime is taken from. */
export const EARLIER_NIGHTS = 14;

/** `NIGHT_TURN_HOUR` of the day `daysBack` days before the day of `atMs`,
 * on the phone's clock. */
function turnMs(atMs: number, daysBack: number): number {
  const day = new Date(atMs);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate() - daysBack,
    NIGHT_TURN_HOUR,
  ).getTime();
}

/** The day of `ms` on the phone's calendar: YYYY-MM-DD. */
export function dayOf(ms: number): string {
  const day = new Date(ms);
  const two = (value: number) => String(value).padStart(2, "0");
  return `${day.getFullYear()}-${two(day.getMonth() + 1)}-${two(day.getDate())}`;
}

/** The night in the part of `samples` between `fromMs` and `toMs`: a
 * sample across an end counts for what lies inside. */
function nightBetween(
  samples: readonly SleepSample[],
  fromMs: number,
  toMs: number,
): SleepNight | null {
  if (toMs <= fromMs) {
    return null;
  }
  return sleepNight(
    samples
      .filter((sample) => sample.toMs > fromMs && sample.fromMs < toMs)
      .map((sample) => ({
        ...sample,
        fromMs: Math.max(sample.fromMs, fromMs),
        toMs: Math.min(sample.toMs, toMs),
      })),
  );
}

/** The night that ended in the day `daysBack` days before the day of
 * `atMs`; today's only up to `atMs`. */
function nightOfDay(
  samples: readonly SleepSample[],
  atMs: number,
  daysBack: number,
): SleepNight | null {
  const toMs = turnMs(atMs, daysBack);
  return nightBetween(
    samples,
    turnMs(atMs, daysBack + 1),
    daysBack === 0 ? Math.min(toMs, atMs) : toMs,
  );
}

/** From when the samples are needed to tell the night before an activity
 * at `atMs`, with the nights its usual bedtime is taken from. */
export function sleepHistoryFromMs(atMs: number): number {
  return turnMs(atMs, EARLIER_NIGHTS + 2);
}

/** A whole number from `least` to `most`. */
function within(value: number, least: number, most: number): number {
  return Math.min(most, Math.max(least, Math.round(value)));
}

/** The night as the contract takes it (docs/API.md, «Sleep»): whole
 * minutes in its limits, the stages never more than the sleep. */
function summaryOf(night: SleepNight, score: number): SleepSummary {
  const asleepMin = within(night.asleepMin, 1, SLEEP_NIGHT_MAX_MIN);
  const summary: SleepSummary = {
    night: dayOf(night.toMs),
    score: within(score, 0, SLEEP_SCORE_MAX),
    asleep_min: asleepMin,
    awake_min: within(night.awakeMin, 0, SLEEP_NIGHT_MAX_MIN),
  };
  if (night.stages === null) {
    return summary;
  }
  const rem = within(night.stages.remMin, 0, asleepMin);
  const deep = within(night.stages.deepMin, 0, asleepMin - rem);
  // Each rounded apart, the three could pass the sleep by a minute: the
  // light sleep, the longest, gives it back.
  const light = within(night.stages.lightMin, 0, asleepMin - rem - deep);
  return { ...summary, stages: { rem_min: rem, light_min: light, deep_min: deep } };
}

/**
 * The night before an activity that began (or ended) at `atMs`, from
 * `samples`: the one the person woke up from that day, or, for an activity
 * in the small hours with no sleep yet, the one of the day before. Its
 * score has the usual bedtime of the `EARLIER_NIGHTS` nights before it,
 * when the samples reach that far. As its post says it and as it goes to
 * the API; null without such a night.
 */
export function lastNightOf(
  samples: readonly SleepSample[],
  atMs: number,
): SleepSummary | null {
  let daysBack = 0;
  let night = nightOfDay(samples, atMs, 0);
  if (night === null && new Date(atMs).getHours() < STILL_YESTERDAY_HOUR) {
    daysBack = 1;
    night = nightOfDay(samples, atMs, 1);
  }
  if (night === null) {
    return null;
  }
  const earlier: number[] = [];
  for (let back = daysBack + 1; back <= daysBack + EARLIER_NIGHTS; back += 1) {
    const before = nightOfDay(samples, atMs, back);
    if (before !== null) {
      earlier.push(before.fromMs);
    }
  }
  return summaryOf(night, sleepScore(night, earlier).score);
}

/** The night before an activity at `atMs` from `reader`; null when the
 * phone has no health data, when reading fails or was refused (which reads
 * as no samples), and without a night. */
export async function readLastNight(
  reader: SleepReader,
  atMs: number,
): Promise<SleepSummary | null> {
  try {
    if (!(await reader.available())) {
      return null;
    }
    return lastNightOf(await reader.samples(sleepHistoryFromMs(atMs), atMs), atMs);
  } catch {
    return null;
  }
}
