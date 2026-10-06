import type { Activity } from "@shaperoute/shared-types";

import { BASE_LANGUAGE, type Language } from "../i18n/languages";
import { MIN_PACE_M } from "../units/format";
import { appUnits, type Units } from "../units/units";
import { wordsOf } from "../voice/words";
import { paceClock } from "./runStats";
import { durationMs, type Track } from "./trackRecorder";

/**
 * A route paddled on the water (TASK-251, ADR-0215): what changes from a
 * run. The speed in km/h where a run has its pace now and its average pace,
 * and the pace as paddlers read it, the time of 500 m, where a run has a
 * kilometre's. Pure functions; a run, and any other activity, is followed
 * as before.
 */

/** A paddler's pace is the time of this many metres, with miles too: it is
 * how canoes and rowing boats are timed everywhere. */
export const PADDLE_PACE_M = 500;

/** Written beside a paddler's pace. The same in every language. */
export const PADDLE_PACE_UNIT = "/500 m";

/** Whether a route of `activity` is paddled. */
export function isPaddle(activity: Activity | undefined): boolean {
  return activity === "paddling";
}

/** The seconds PADDLE_PACE_M take at `secondsPerKm`. */
export function per500S(secondsPerKm: number): number {
  return (secondsPerKm * PADDLE_PACE_M) / 1000;
}

/** "5:00 /500 m": the average pace on the water; null before MIN_PACE_M. */
export function paddlePaceLabel(metres: number, ms: number): string | null {
  if (metres < MIN_PACE_M || ms <= 0) {
    return null;
  }
  return `${paceClock(per500S(ms / metres))} ${PADDLE_PACE_UNIT}`;
}

/**
 * What the voice says when an outing on the water passes `km` kilometres:
 * the time so far and the average pace of 500 m, in the voice's `language`.
 * With miles `km` counts miles; the pace is of 500 m all the same.
 */
export function paddleAnnouncement(
  km: number,
  track: Track,
  language: Language = BASE_LANGUAGE,
  units: Units = appUnits(),
): string {
  const ms = durationMs(track);
  const pace = track.distanceM > 0 ? (ms / track.distanceM) * PADDLE_PACE_M : 0;
  const words = wordsOf(language, units);
  return units === "mi"
    ? words.paddleMile(km, ms, pace)
    : words.paddleKilometre(km, ms, pace);
}
