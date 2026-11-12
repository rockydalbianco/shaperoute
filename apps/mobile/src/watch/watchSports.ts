import type { RunActivity } from "@shaperoute/shared-types";

import { SPORT_PROFILES, type SportProfile } from "../sports";

/**
 * The sports of the Apple Watch (TASK-370 part A1, ADR-0314), read from the
 * app's registry (src/sports/), so a new sport does not forget the watch.
 * The watch reads them from
 * targets/watch/Core/Sources/WatchCore/Resources/sports.json: a test keeps
 * that file equal to this table, and `apps/mobile/scripts/watch-sports.sh`
 * writes it again. Pure: no native code.
 */

/** The version of sports.json, which the watch checks (WatchSports.swift). */
export const WATCH_SPORTS_VERSION = 1;

/** Where sports.json is, from apps/mobile. */
export const WATCH_SPORTS_FILE =
  "targets/watch/Core/Sources/WatchCore/Resources/sports.json";

/** How the pace is written on the watch, as in the app: per km (or mile),
 * per 500 m on the water, per 100 m swimming. */
export type WatchPace = "km" | "paddle" | "swim";

export interface WatchSport {
  activity: RunActivity;
  /** In English, as the app names it; the watch translates it. */
  name: string;
  emoji: string;
  /** HKWorkoutActivityType, Apple's own number. */
  appleWorkout: number;
  pace: WatchPace;
  onWater: boolean;
  /** The app draws routes for it, so the watch can follow one; false, it
   * only records. */
  guided: boolean;
  /** Outdoors with the watch's GPS; false indoors. */
  gps: boolean;
  /** Offered on the watch. */
  onWatch: boolean;
}

/** What the registry does not say: the sports done indoors, with no GPS. */
const INDOORS: ReadonlySet<RunActivity> = new Set<RunActivity>(["gym"]);

/** The sports the watch does not offer yet: the open-water swim until it is
 * tried in the water with the watch (TASK-370 part C, spring 2027); a
 * paragliding flight until a part of its own brings it to the wrist
 * (TASK-305, ADR-0375: Apple has no workout type for it). */
const NOT_ON_WATCH: ReadonlySet<RunActivity> = new Set<RunActivity>([
  "swimming",
  "paragliding",
]);

export function watchSportOf(profile: SportProfile): WatchSport {
  return {
    activity: profile.activity,
    name: profile.name,
    emoji: profile.emoji,
    appleWorkout: profile.appleWorkout,
    pace: profile.pace ?? "km",
    onWater: profile.onWater === true,
    guided: profile.drawKm !== undefined,
    gps: !INDOORS.has(profile.activity),
    onWatch: !NOT_ON_WATCH.has(profile.activity),
  };
}

/** Every sport of the app, in its order; the ones off on the watch too. */
export const WATCH_SPORTS: readonly WatchSport[] = SPORT_PROFILES.map(watchSportOf);

/** sports.json as the watch reads it. */
export function watchSportsJson(sports: readonly WatchSport[] = WATCH_SPORTS): string {
  return `${JSON.stringify({ version: WATCH_SPORTS_VERSION, sports }, null, 2)}\n`;
}
