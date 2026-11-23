import { File, Paths } from "expo-file-system";

import { maxHeartRate, type HeartSettings, zonesOf } from "../body/heartZones";
import type { BodyProfile } from "../body/bodyProfile";
import { zoneSeconds } from "../body/zoneTime";
import { heartSummary, type HeartSample, type Span } from "../health/heartSamples";
import { activeMs, type PoolSwim } from "./poolSwim";

/**
 * The heart rate of a swim in a pool (TASK-409 part B, ADR-0334
 * precisazione D): what a watch wrote in Apple Health while it lasted. Read
 * only after the user's consent, the first tap on «Add heart rate from
 * Apple Health» (the user's «Pulsante a fine nuoto», 2026-11-08), kept on
 * the phone for the swims after it. The average and maximum go to the API
 * with the swim and show in its post unless «Show heart rate» is off; the
 * time in each zone stays on the phone (ADR-0318 point 1).
 */

export const POOL_HEART_FILE = "pool-heart.json";

/** Whether the user tapped «Add heart rate from Apple Health» once; no when
 * never, or the file does not read. */
export function loadPoolHeartOn(): boolean {
  try {
    const file = new File(Paths.document, POOL_HEART_FILE);
    if (!file.exists) {
      return false;
    }
    const data: unknown = JSON.parse(file.textSync());
    return (
      typeof data === "object" && data !== null && "on" in data && data.on === true
    );
  } catch {
    return false;
  }
}

/** Keeps the consent; a phone that refuses keeps nothing, and the button
 * shows again at the next swim. */
export function keepPoolHeartOn(): void {
  try {
    const file = new File(Paths.document, POOL_HEART_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ on: true }));
  } catch {
    // This swim is still read.
  }
}

/** The heart rate of a swim, as its end shows it. */
export type PoolHeart = {
  avgBpm: number;
  maxBpm: number;
  /** The seconds in zones 1–5; null without a max heart rate (no year of
   * birth and none typed in «Heart rate zones»). */
  zoneS: number[] | null;
};

/** The swim's window: from its start to its end, and its pauses. */
export function poolWindow(swim: PoolSwim): {
  fromMs: number;
  toMs: number;
  pauses: Span[];
} {
  const toMs = swim.endedMs ?? swim.startedMs;
  return {
    fromMs: swim.startedMs,
    toMs,
    pauses: swim.pauses.map((pause) => ({
      fromMs: pause.fromMs,
      toMs: pause.toMs ?? toMs,
    })),
  };
}

/** The heart rate of `samples`, already of the swim's window
 * (heartSamples.readHeart), with the zones of `heart` and `body`; null
 * without readings. */
export function poolHeartOf(
  samples: readonly HeartSample[],
  swim: PoolSwim,
  heart: HeartSettings,
  body: BodyProfile,
  year: number,
): PoolHeart | null {
  const summary = heartSummary(samples);
  if (summary === null) {
    return null;
  }
  const max = maxHeartRate(heart, body, year);
  const endMs = swim.endedMs ?? swim.startedMs;
  return {
    ...summary,
    zoneS: max === null ? null : zoneSeconds(samples, zonesOf(max.bpm, heart), endMs),
  };
}

/** Whether the swim lasted at all: a swim of no time has no window. */
export function hasWindow(swim: PoolSwim): boolean {
  return swim.endedMs !== null && activeMs(swim, swim.endedMs) > 0;
}
