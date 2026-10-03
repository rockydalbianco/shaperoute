import type { Activity } from "@shaperoute/shared-types";

import { BASE_LANGUAGE, type Language } from "../i18n/languages";
import { wordsOf } from "../voice/words";
import { ANNOUNCE_M } from "./navigator";
import { durationMs, type Track } from "./trackRecorder";

/**
 * A route followed by bike (TASK-216, ADR-0179): what changes from a run.
 * The speed in km/h where a run has its pace, the kilometres said every
 * RIDE_KM_EVERY, and the turns said further ahead. Pure functions; a run,
 * and any other activity, is followed as before.
 */

/**
 * On a bike a turn is said this far ahead: about 18 s at 20 km/h, 14 s at
 * 25, as long as ANNOUNCE_M takes at a running pace once the words are said
 * (measured in ADR-0179). Also the stretches with the bike on foot.
 */
export const RIDE_ANNOUNCE_M = 100;

/** On a bike the voice says the kilometres every this many (the user's
 * choice, 2026-10-03): a kilometre lasts 2–3 minutes. */
export const RIDE_KM_EVERY = 10;

/** Whether a route of `activity` is followed by bike. */
export function isRide(activity: Activity | undefined): boolean {
  return activity === "cycling";
}

/** How far ahead a turn is said along a route of `activity`. */
export function announceMOf(activity: Activity | undefined): number {
  return isRide(activity) ? RIDE_ANNOUNCE_M : ANNOUNCE_M;
}

/** Kilometres per hour at `secondsPerKm`. */
export function kmh(secondsPerKm: number): number {
  return secondsPerKm > 0 ? 3600 / secondsPerKm : 0;
}

/** "24.3": a speed as cyclists read it, to a tenth of a km/h. */
export function speedNumber(secondsPerKm: number): string {
  return kmh(secondsPerKm).toFixed(1);
}

/** "+1.2" faster, "-0.8" slower, "0.0" the same: a kilometre's speed
 * against the one before, from their times in seconds. */
export function speedChange(seconds: number, before: number): string {
  const tenths = Math.round((kmh(seconds) - kmh(before)) * 10);
  const sign = tenths > 0 ? "+" : tenths < 0 ? "-" : "";
  return `${sign}${(Math.abs(tenths) / 10).toFixed(1)}`;
}

/** The kilometres of `track` the voice has said by now: every whole one on
 * a run, every RIDE_KM_EVERY on a bike. */
export function saidKmOf(track: Track, activity: Activity | undefined): number {
  const km = Math.floor(track.distanceM / 1000);
  return isRide(activity) ? Math.floor(km / RIDE_KM_EVERY) * RIDE_KM_EVERY : km;
}

/**
 * What the voice says when a ride passes `km` kilometres: the time so far
 * and the average speed, in whole km/h, in the voice's `language`.
 */
export function rideAnnouncement(
  km: number,
  track: Track,
  language: Language = BASE_LANGUAGE,
): string {
  const ms = durationMs(track);
  const speed = ms > 0 ? (track.distanceM / ms) * 3600 : 0;
  return wordsOf(language).rideKilometres(km, ms, Math.round(speed));
}
