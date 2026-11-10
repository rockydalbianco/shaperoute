import { Platform, TurboModuleRegistry } from "react-native";

import { WATCH_SPORTS } from "./watchSports";

type AppleLibrary = typeof import("@kingstinct/react-native-healthkit");

/**
 * The phone wakes the watch app (TASK-370 part B4): a start message reaches
 * the watch only while MuW is open there, so at the run's countdown the
 * phone also asks Apple to start a workout on the watch,
 * `HKHealthStore.startWatchApp(with:)`, which launches the app even when it
 * is closed. The HealthKit library of the 1.0.1 build has it
 * (`startWatchApp`): no native code of MuW's own. The configuration says
 * only Apple's activity type and indoors or outdoors; the app's sport comes
 * with the start message, sent again once the watch is up.
 */

/** HKWorkoutSessionLocationType. */
export const INDOOR = 2;
export const OUTDOOR = 3;

export type WakeConfiguration = { activityType: number; locationType: number };

/** What MuW uses of the HealthKit library, checked against its types. */
export type WakeModule = {
  startWatchApp(configuration: WakeConfiguration): Promise<boolean>;
};

/** Wakes the watch for a run of `activity`: true when Apple started the
 * watch's workout. */
export type WatchWaker = (activity: string) => Promise<boolean>;

/** The configuration of `activity`; none for a sport the watch does not
 * offer (the open-water swim, a newer phone's). */
export function wakeConfiguration(activity: string): WakeConfiguration | null {
  const sport = WATCH_SPORTS.find((each) => each.activity === activity);
  if (sport === undefined || !sport.onWatch) {
    return null;
  }
  return {
    activityType: sport.appleWorkout,
    locationType: sport.gps ? OUTDOOR : INDOOR,
  };
}

/** The waker on `kit`: no watch, no watch app or no permission is a false,
 * never an error. */
export function wakerOf(kit: WakeModule): WatchWaker {
  return async (activity) => {
    const configuration = wakeConfiguration(activity);
    if (configuration === null) {
      return false;
    }
    try {
      return await kit.startWatchApp(configuration);
    } catch {
      return false;
    }
  };
}

function appleWaker(): WatchWaker | null {
  // A Nitro module, as in health/healthModules.ts: without Nitro's native
  // code (Expo Go), loading it would throw.
  if (TurboModuleRegistry.get("NitroModules") === null) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const library = require("@kingstinct/react-native-healthkit") as AppleLibrary;
    const kit: WakeModule = library;
    return wakerOf(kit);
  } catch {
    return null;
  }
}

let shared: WatchWaker | null | undefined;

/** The phone's waker, made the first time; null off the iPhone and
 * without the HealthKit library's native code. */
export function watchWaker(): WatchWaker | null {
  if (shared === undefined) {
    shared = Platform.OS === "ios" ? appleWaker() : null;
  }
  return shared;
}
