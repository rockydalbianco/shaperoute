import type { SleepSummary } from "@shaperoute/shared-types";
import { File, Paths } from "expo-file-system";

import { lastNightOf, sleepHistoryFromMs, type SleepReader } from "./sleepSamples";

/**
 * Last night for the «Sleep» card of one's own profile (TASK-467 part B3):
 * read from the phone's health data after the tap on «Show my sleep from
 * Apple Health», and again each time the profile opens once that yes is
 * kept (`sleepChoice.ts`). Nothing here reads Apple Health by itself: the
 * reader is given, and there is none until the native build (part C,
 * `sleepModules.ts`).
 */

/** What the card has to say of last night. */
export type OwnNight =
  | { kind: "night"; night: SleepSummary }
  /** «No sleep data for last night in Apple Health.» */
  | { kind: "none" }
  /** «MuW can't read your sleep…»: no health data on this phone, or the
   * reading failed. */
  | { kind: "refused" };

/**
 * The night the person woke up from on the day of `nowMs`, from `reader`.
 * With `asking`, the phone's sheet to read the sleep opens first: only at
 * the user's tap, never when the profile opens.
 */
export async function readOwnNight(
  reader: SleepReader,
  nowMs: number,
  asking: boolean,
): Promise<OwnNight> {
  try {
    if (!(await reader.available())) {
      return { kind: "refused" };
    }
    if (asking) {
      await reader.ask();
    }
    const samples = await reader.samples(sleepHistoryFromMs(nowMs), nowMs);
    const night = lastNightOf(samples, nowMs);
    return night === null ? { kind: "none" } : { kind: "night", night };
  } catch {
    return { kind: "refused" };
  }
}

/** Where the phone keeps that «Share your sleep?» was answered with a
 * yes: it is asked the first time only. */
export const SLEEP_SHARE_FILE = "sleep-share.json";

/** Whether the first «Share» was confirmed on this phone; no when unread. */
export function loadSleepShareConfirmed(): boolean {
  try {
    const file = new File(Paths.document, SLEEP_SHARE_FILE);
    if (!file.exists) {
      return false;
    }
    const data: unknown = JSON.parse(file.textSync());
    return (
      typeof data === "object" &&
      data !== null &&
      "confirmed" in data &&
      data.confirmed === true
    );
  } catch {
    return false;
  }
}

/** Keeps the yes; a phone that refuses asks again the next time. */
export function keepSleepShareConfirmed(): void {
  try {
    const file = new File(Paths.document, SLEEP_SHARE_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ confirmed: true }));
  } catch {
    // Asked again: the yes stays the user's to give.
  }
}
