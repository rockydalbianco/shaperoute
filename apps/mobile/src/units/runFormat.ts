import {
  inUnits,
  METRES_PER_FOOT,
  METRES_PER_KM,
  METRES_PER_MILE,
  metresPer,
  shortBelowM,
} from "./format";
import { appUnits, type Units } from "./units";

/**
 * What a run in progress writes and says in the app's units (TASK-182,
 * part C; ADR-0149): the numbers of the run's screens, the banner of a
 * turn, the feet the voice says. The track, the points where the voice
 * speaks of a turn and what is kept stay in metres: these only turn metres,
 * and seconds per kilometre, into what is shown or said. In kilometres each
 * one gives what the run's screens wrote before.
 */

/** "2.34": the distance of a run without its unit, which is written beside
 * it: in kilometres or in miles, two decimals and a point in every language. */
export function runDistanceNumber(metres: number, units: Units = appUnits()): string {
  return inUnits(Math.max(0, metres), units).toFixed(2);
}

/**
 * The seconds one of `units` takes at `secondsPerKm`: a pace per mile from
 * a pace per kilometre. In kilometres, the same number.
 */
export function perUnitS(secondsPerKm: number, units: Units = appUnits()): number {
  return units === "mi"
    ? secondsPerKm * (METRES_PER_MILE / METRES_PER_KM)
    : secondsPerKm;
}

/** "/km", "/mi": written beside a pace. The same in every language. */
export function paceUnit(units: Units = appUnits()): string {
  return units === "mi" ? "/mi" : "/km";
}

/** "km/h", "mph": written beside a speed. The same in every language. */
export function speedUnit(units: Units = appUnits()): string {
  return units === "mi" ? "mph" : "km/h";
}

/** `metres` over `ms` in kilometres per hour or, with miles, in miles per
 * hour; 0 before any time has passed. */
export function speedIn(metres: number, ms: number, units: Units = appUnits()): number {
  return ms > 0 ? (metres / metresPer(units) / ms) * 3_600_000 : 0;
}

/** A short distance is said in feet to the nearest fifty, as
 * `shortDistanceLabel` writes it. */
export const FEET_STEP = 50;

/** Feet as a runner hears them: `metres` to FEET_STEP feet, and never
 * "0 feet". */
export function roundFeet(metres: number): number {
  const feet = Math.round(metres / METRES_PER_FOOT / FEET_STEP) * FEET_STEP;
  return Math.max(FEET_STEP, feet);
}

/**
 * For the banner of a turn with miles: "150 ft", and from a thousand feet
 * "0.4 mi", with a point as the banner writes kilometres.
 */
export function milesBannerLabel(metres: number): string {
  return metres < shortBelowM("mi")
    ? `${roundFeet(metres)} ft`
    : `${inUnits(metres, "mi").toFixed(1)} mi`;
}
