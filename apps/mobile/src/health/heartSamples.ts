import { HEART_BPM_MAX, HEART_BPM_MIN } from "@shaperoute/shared-types";

import type { HealthStore } from "./healthPhone";

/**
 * The heart rate a watch wrote in the phone's health data during an
 * activity, read back after it (TASK-409 part B, ADR-0334 precisazione D):
 * the readings of its window, pauses left out, and their average and
 * maximum. Built for a swim in a pool first; TASK-345 C and TASK-374 D hook
 * the runs to the same functions. MuW reads nothing else.
 *
 * Reading is asked apart from writing (appleHealth.ts writes only): the
 * first ask is the user's consent, a tap on «Add heart rate from Apple
 * Health» (the user's «Pulsante a fine nuoto», 2026-11-08). The phone never
 * says whether reading was refused: a refusal reads as no readings.
 */

/** One reading: from when to when, in ms since the epoch, and its beats a
 * minute. A watch's are mostly a moment (from = to). */
export type HeartSample = { fromMs: number; toMs: number; bpm: number };

/** A span left out, as a «Pause». */
export type Span = { fromMs: number; toMs: number };

/** Where the phone keeps the readings, as HealthPhone for writing. */
export type HeartReader = {
  store: HealthStore;
  available(): Promise<boolean>;
  /** Opens the phone's sheet to read the heart rate. */
  ask(): Promise<void>;
  /** The readings between `fromMs` and `toMs`, in any order; none when
   * reading was refused. */
  samples(fromMs: number, toMs: number): Promise<HeartSample[]>;
};

/** The average and the maximum, in whole beats a minute. */
export type HeartSummary = { avgBpm: number; maxBpm: number };

/** The readings of the window, in the limits the API takes, out of the
 * pauses, the earliest first. A reading counts where it begins. */
export function inWindow(
  samples: readonly HeartSample[],
  fromMs: number,
  toMs: number,
  pauses: readonly Span[] = [],
): HeartSample[] {
  return samples
    .filter(
      (sample) =>
        Number.isFinite(sample.bpm) &&
        sample.bpm >= HEART_BPM_MIN &&
        sample.bpm <= HEART_BPM_MAX &&
        sample.fromMs >= fromMs &&
        sample.fromMs <= toMs &&
        !pauses.some(
          (pause) => sample.fromMs >= pause.fromMs && sample.fromMs < pause.toMs,
        ),
    )
    .sort((a, b) => a.fromMs - b.fromMs);
}

/** The average and the maximum of `samples`; null without any. */
export function heartSummary(samples: readonly HeartSample[]): HeartSummary | null {
  if (samples.length === 0) {
    return null;
  }
  const total = samples.reduce((sum, sample) => sum + sample.bpm, 0);
  const max = Math.round(Math.max(...samples.map((sample) => sample.bpm)));
  // Rounded apart, the average could pass the maximum by half a beat.
  return { avgBpm: Math.min(max, Math.round(total / samples.length)), maxBpm: max };
}

/** The readings of the window from `reader`; none when it fails. */
export async function readHeart(
  reader: HeartReader,
  fromMs: number,
  toMs: number,
  pauses: readonly Span[] = [],
): Promise<HeartSample[]> {
  try {
    return inWindow(await reader.samples(fromMs, toMs), fromMs, toMs, pauses);
  } catch {
    return [];
  }
}

const HEART_RATE = "HKQuantityTypeIdentifierHeartRate";

/** What MuW uses of `@kingstinct/react-native-healthkit` to read. */
export type HeartKitModule = {
  isHealthDataAvailable(): boolean;
  requestAuthorization(request: {
    toRead: readonly [typeof HEART_RATE];
  }): Promise<boolean>;
  queryQuantitySamples(
    identifier: typeof HEART_RATE,
    options: {
      filter: { date: { startDate: Date; endDate: Date } };
      limit: number;
      ascending: boolean;
      unit: "count/min";
    },
  ): Promise<readonly { startDate: Date; endDate: Date; quantity: number }[]>;
};

/** Apple Health as a reader of the heart rate. */
export function appleHeartReader(kit: HeartKitModule): HeartReader {
  return {
    store: "apple",
    available: async () => kit.isHealthDataAvailable(),
    ask: async () => {
      await kit.requestAuthorization({ toRead: [HEART_RATE] });
    },
    samples: async (fromMs, toMs) => {
      const found = await kit.queryQuantitySamples(HEART_RATE, {
        filter: { date: { startDate: new Date(fromMs), endDate: new Date(toMs) } },
        // All of them: a watch writes one every few seconds in a workout.
        limit: 0,
        ascending: true,
        unit: "count/min",
      });
      return found.map((sample) => ({
        fromMs: sample.startDate.getTime(),
        toMs: sample.endDate.getTime(),
        bpm: sample.quantity,
      }));
    },
  };
}
