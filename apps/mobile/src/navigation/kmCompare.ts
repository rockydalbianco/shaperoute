import type { Activity } from "@shaperoute/shared-types";

import { BASE_LANGUAGE, type Language } from "../i18n/languages";
import { wordsOf } from "../voice/words";
import { isRide, kmh, RIDE_KM_EVERY } from "./ride";
import { kmTimesMs, splits } from "./runMetrics";
import type { Track } from "./trackRecorder";

/**
 * What the voice adds after the kilometres (TASK-217, ADR-0180): how the
 * kilometre went against the one before. On a run, by how many seconds; on
 * a bike, the last RIDE_KM_EVERY kilometres against those before, in speed
 * and with no numbers. The times are the ones the end of the run shows
 * (`runMetrics`), pauses left out. Pure functions.
 */

/** A kilometre within this many seconds of the one before, these too, is
 * at the same pace (the user's choice, 2026-10-03). */
export const SAME_PACE_S = 2;

/** On a bike, a stretch within this many km/h of the one before, these too,
 * is at the same speed. */
export const SAME_SPEED_KMH = 0.5;

/**
 * The seconds the kilometre `km` of `track` took more (slower) or fewer
 * (faster) than the one before, whole, as the end of the run shows them.
 * Null for the first kilometre, and for one the track has not ended yet.
 */
export function kmChangeS(track: Track, km: number): number | null {
  const change = splits(track)[km - 1]?.change ?? null;
  // Never -0, which rounding a little faster gives.
  return change === null ? null : Math.round(change) + 0;
}

/**
 * What the voice says after the kilometre `km` of a run, in its `language`:
 * faster or slower than the one before and by how many seconds, or the same
 * pace within SAME_PACE_S. Null when there is nothing to compare.
 */
export function kmComparison(
  km: number,
  track: Track,
  language: Language = BASE_LANGUAGE,
): string | null {
  const change = kmChangeS(track, km);
  if (change === null) {
    return null;
  }
  const words = wordsOf(language);
  if (Math.abs(change) <= SAME_PACE_S) {
    return words.kmSamePace;
  }
  return change < 0 ? words.kmFaster(-change) : words.kmSlower(change);
}

/**
 * The km/h of the last RIDE_KM_EVERY kilometres before `km` more (faster)
 * or fewer (slower) than those of the RIDE_KM_EVERY before them. Null
 * before twice RIDE_KM_EVERY, and for a `km` the track has not ended yet.
 */
export function rideChangeKmh(track: Track, km: number): number | null {
  const times = kmTimesMs(track);
  const end = times[km - 1];
  const middle = times[km - 1 - RIDE_KM_EVERY];
  if (km < 2 * RIDE_KM_EVERY || end === undefined || middle === undefined) {
    return null;
  }
  const start = km === 2 * RIDE_KM_EVERY ? 0 : times[km - 1 - 2 * RIDE_KM_EVERY];
  const secondsPerKm = (ms: number) => ms / 1000 / RIDE_KM_EVERY;
  return kmh(secondsPerKm(end - middle)) - kmh(secondsPerKm(middle - start));
}

/**
 * What the voice says after the kilometres `km` of a ride, in its
 * `language`: the last RIDE_KM_EVERY faster or slower than those before, or
 * at the same speed within SAME_SPEED_KMH. Null when there is nothing to
 * compare: at the first RIDE_KM_EVERY.
 */
export function rideComparison(
  km: number,
  track: Track,
  language: Language = BASE_LANGUAGE,
): string | null {
  const change = rideChangeKmh(track, km);
  if (change === null) {
    return null;
  }
  const words = wordsOf(language);
  if (Math.abs(change) <= SAME_SPEED_KMH) {
    return words.rideSameSpeed(RIDE_KM_EVERY);
  }
  return change > 0 ? words.rideFaster(RIDE_KM_EVERY) : words.rideSlower(RIDE_KM_EVERY);
}

/** The comparison said after the kilometres `km` along a route of
 * `activity`: a ride's or a run's. */
export function comparisonOf(
  km: number,
  track: Track,
  activity: Activity | undefined,
  language: Language = BASE_LANGUAGE,
): string | null {
  return isRide(activity)
    ? rideComparison(km, track, language)
    : kmComparison(km, track, language);
}
