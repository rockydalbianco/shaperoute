import type { Activity } from "@shaperoute/shared-types";

import { BASE_LANGUAGE, type Language } from "../i18n/languages";
import { METRES_PER_KM, metresPer } from "../units/format";
import { appUnits, type Units } from "../units/units";
import { wordsOf } from "../voice/words";
import { isRide, kmh, rideEveryOf } from "./ride";
import { splits, unitTimesMs } from "./runMetrics";
import type { Track } from "./trackRecorder";

/**
 * What the voice adds after the kilometres (TASK-217, ADR-0180): how the
 * kilometre went against the one before. On a run, by how many seconds; on
 * a bike, the last RIDE_KM_EVERY kilometres against those before, in speed
 * and with no numbers. The times are the ones the end of the run shows
 * (`runMetrics`), pauses left out. Pure functions.
 *
 * With miles (TASK-182, ADR-0149) the same, mile against mile: the `km` of
 * these functions then counts miles, and on a bike the stretches are
 * RIDE_MI_EVERY miles long. What counts as the same pace, and as the same
 * speed, does not change with the units.
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
export function kmChangeS(
  track: Track,
  km: number,
  units: Units = appUnits(),
): number | null {
  const change = splits(track, metresPer(units))[km - 1]?.change ?? null;
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
  units: Units = appUnits(),
): string | null {
  const change = kmChangeS(track, km, units);
  if (change === null) {
    return null;
  }
  const words = wordsOf(language, units);
  if (units === "mi") {
    if (Math.abs(change) <= SAME_PACE_S) {
      return words.mileSamePace;
    }
    return change < 0 ? words.mileFaster(-change) : words.mileSlower(change);
  }
  if (Math.abs(change) <= SAME_PACE_S) {
    return words.kmSamePace;
  }
  return change < 0 ? words.kmFaster(-change) : words.kmSlower(change);
}

/**
 * The km/h of the last RIDE_KM_EVERY kilometres before `km` more (faster)
 * or fewer (slower) than those of the RIDE_KM_EVERY before them. Null
 * before twice RIDE_KM_EVERY, and for a `km` the track has not ended yet.
 * With miles, the last RIDE_MI_EVERY miles before the mile `km` against
 * those before them: still in km/h, so the same speed is the same in both.
 */
export function rideChangeKmh(
  track: Track,
  km: number,
  units: Units = appUnits(),
): number | null {
  const every = rideEveryOf(units);
  const unitM = metresPer(units);
  const times = unitTimesMs(track, unitM);
  const end = times[km - 1];
  const middle = times[km - 1 - every];
  if (km < 2 * every || end === undefined || middle === undefined) {
    return null;
  }
  const start = km === 2 * every ? 0 : times[km - 1 - 2 * every];
  // The stretch is `every` units long: in kilometres, times one.
  const secondsPerKm = (ms: number) => ms / 1000 / every / (unitM / METRES_PER_KM);
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
  units: Units = appUnits(),
): string | null {
  const change = rideChangeKmh(track, km, units);
  if (change === null) {
    return null;
  }
  const words = wordsOf(language, units);
  const every = rideEveryOf(units);
  if (units === "mi") {
    if (Math.abs(change) <= SAME_SPEED_KMH) {
      return words.rideMilesSameSpeed(every);
    }
    return change > 0 ? words.rideMilesFaster(every) : words.rideMilesSlower(every);
  }
  if (Math.abs(change) <= SAME_SPEED_KMH) {
    return words.rideSameSpeed(every);
  }
  return change > 0 ? words.rideFaster(every) : words.rideSlower(every);
}

/** The comparison said after the kilometres `km` along a route of
 * `activity`: a ride's or a run's. */
export function comparisonOf(
  km: number,
  track: Track,
  activity: Activity | undefined,
  language: Language = BASE_LANGUAGE,
  units: Units = appUnits(),
): string | null {
  return isRide(activity)
    ? rideComparison(km, track, language, units)
    : kmComparison(km, track, language, units);
}
