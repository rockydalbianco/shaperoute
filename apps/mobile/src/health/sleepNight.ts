/**
 * A night of sleep, from what the phone's health data hold about it
 * (TASK-467 part A, ADR-0379): when it began and ended, the time asleep,
 * the time awake in between and the time in each stage. Pure functions:
 * reading the samples from Apple Health comes with the native build, and
 * nothing here asks for a permission.
 *
 * MuW cannot read Apple's own sleep score (HealthKit has no type for it),
 * so `sleepScore.ts` works one out from this.
 */

/** A stage, as MuW shows it. «light» is Apple Health's «Core»; «asleep» is
 * sleep whose stage was not told (a phone without a watch). */
export type SleepStage = "awake" | "rem" | "light" | "deep" | "asleep";

/** One sample: from when to when, in ms since the epoch, and its stage. */
export type SleepSample = { fromMs: number; toMs: number; stage: SleepStage };

export type SleepNight = {
  /** Fell asleep, and woke for the last time. */
  fromMs: number;
  toMs: number;
  /** Whole minutes asleep, and not asleep between `fromMs` and `toMs`. */
  asleepMin: number;
  awakeMin: number;
  /** Whole minutes in each stage; null when no sample told a stage. Sleep
   * of no told stage is in `asleepMin` only. */
  stages: { remMin: number; lightMin: number; deepMin: number } | null;
};

const MINUTE_MS = 60_000;

/** A silence longer than this ends a stretch of sleep: what comes after is
 * another one (a nap, the next night). */
export const SLEEP_GAP_MIN = 60;

/** Under this much sleep there is no night to speak of. */
export const SLEEP_NIGHT_MIN = 60;

/** Apple Health's `HKCategoryValueSleepAnalysis`; null for «in bed», which
 * says nothing about sleep, and for a value MuW does not know. */
export function stageOfAppleValue(value: number): SleepStage | null {
  switch (value) {
    case 1:
      return "asleep";
    case 2:
      return "awake";
    case 3:
      return "light";
    case 4:
      return "deep";
    case 5:
      return "rem";
    default:
      return null;
  }
}

/** Where two sources overlap, the one that says more wins: a told stage
 * over «awake», «awake» over sleep of no told stage. */
const RANK: Record<SleepStage, number> = {
  deep: 5,
  rem: 4,
  light: 3,
  awake: 2,
  asleep: 1,
};

const sleeps = (stage: SleepStage) => stage !== "awake";

/** The samples as spans that do not overlap, the earliest first, the same
 * stage in a row joined. Samples with no length or no time are left out. */
export function sleepSpans(samples: readonly SleepSample[]): SleepSample[] {
  const good = samples.filter(
    (sample) =>
      Number.isFinite(sample.fromMs) &&
      Number.isFinite(sample.toMs) &&
      sample.toMs > sample.fromMs,
  );
  const edges = [
    ...new Set(good.flatMap((sample) => [sample.fromMs, sample.toMs])),
  ].sort((a, b) => a - b);
  const spans: SleepSample[] = [];
  for (let i = 0; i + 1 < edges.length; i += 1) {
    const fromMs = edges[i];
    const toMs = edges[i + 1];
    let stage: SleepStage | null = null;
    for (const sample of good) {
      if (
        sample.fromMs <= fromMs &&
        sample.toMs >= toMs &&
        (stage === null || RANK[sample.stage] > RANK[stage])
      ) {
        stage = sample.stage;
      }
    }
    if (stage === null) {
      continue;
    }
    const last = spans[spans.length - 1];
    if (last !== undefined && last.stage === stage && last.toMs === fromMs) {
      last.toMs = toMs;
    } else {
      spans.push({ fromMs, toMs, stage });
    }
  }
  return spans;
}

function nightOf(spans: readonly SleepSample[]): SleepNight | null {
  const asleep = spans.filter((span) => sleeps(span.stage));
  if (asleep.length === 0) {
    return null;
  }
  const fromMs = asleep[0].fromMs;
  const toMs = asleep[asleep.length - 1].toMs;
  const ms = (stage?: SleepStage) =>
    asleep
      .filter((span) => stage === undefined || span.stage === stage)
      .reduce((sum, span) => sum + (span.toMs - span.fromMs), 0);
  const minutes = (value: number) => Math.round(value / MINUTE_MS);
  const asleepMs = ms();
  const staged = asleep.some((span) => span.stage !== "asleep");
  return {
    fromMs,
    toMs,
    asleepMin: minutes(asleepMs),
    awakeMin: minutes(toMs - fromMs - asleepMs),
    stages: staged
      ? {
          remMin: minutes(ms("rem")),
          lightMin: minutes(ms("light")),
          deepMin: minutes(ms("deep")),
        }
      : null,
  };
}

/**
 * The night in the samples: of the stretches of sleep a silence of more
 * than `SLEEP_GAP_MIN` sets apart, the one with the most sleep, so a nap
 * in the same samples is not the night. It runs from falling asleep to the
 * last waking: time awake before and after is not in it, and time with no
 * sample inside it counts as awake. Null with less than `SLEEP_NIGHT_MIN`
 * of sleep.
 */
export function sleepNight(samples: readonly SleepSample[]): SleepNight | null {
  const stretches: SleepSample[][] = [];
  for (const span of sleepSpans(samples)) {
    const stretch = stretches[stretches.length - 1];
    const last = stretch?.[stretch.length - 1];
    if (last !== undefined && span.fromMs - last.toMs <= SLEEP_GAP_MIN * MINUTE_MS) {
      stretch.push(span);
    } else {
      stretches.push([span]);
    }
  }
  let best: SleepNight | null = null;
  for (const stretch of stretches) {
    const night = nightOf(stretch);
    if (night !== null && (best === null || night.asleepMin > best.asleepMin)) {
      best = night;
    }
  }
  return best !== null && best.asleepMin >= SLEEP_NIGHT_MIN ? best : null;
}
