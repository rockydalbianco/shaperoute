import { Platform, TurboModuleRegistry } from "react-native";

import { appleSleepReader, type SleepKitModule } from "./appleSleep";
import type { SleepReader } from "./sleepSamples";

type AppleLibrary = typeof import("@kingstinct/react-native-healthkit");

/**
 * The switch of the whole sleep in MuW (TASK-467: «Sleep last night» in a
 * post, the «Sleep» card of the profile), and the phone's reader of the
 * sleep.
 *
 * **On only from the native build of part C**, whose iOS permission text
 * speaks of the sleep beside the heart rate (`app.json`,
 * `NSHealthShareUsageDescription`). The builds before it never get this
 * code: the changed text moves the fingerprint, so no update from here
 * reaches them. Reading is asked only at the user's tap on «Show my sleep
 * from Apple Health» (`profile/OwnSleep.tsx`).
 */

/** Whether the app shows and publishes the sleep. Typed as a boolean, so
 * that what it hides still compiles and is tested either way. */
export const SLEEP_POSTS_ON: boolean = true;

/** `SLEEP_POSTS_ON`, for the screens: a test turns it off by replacing
 * this. */
export function sleepPostsOn(): boolean {
  return SLEEP_POSTS_ON;
}

let shared: SleepReader | null | undefined;

function appleReader(): SleepReader | null {
  // The HealthKit library is a Nitro module: without Nitro's native code,
  // loading it would throw.
  if (TurboModuleRegistry.get("NitroModules") === null) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const library = require("@kingstinct/react-native-healthkit") as AppleLibrary;
    // What MuW uses of it, checked against the library's own types.
    const kit: SleepKitModule = library;
    return appleSleepReader(kit);
  } catch {
    return null;
  }
}

/** The phone's reader of the sleep, made the first time: Apple Health on
 * an iPhone whose build has its native code; null elsewhere (Expo Go,
 * Android until Health Connect, part D). */
export function sleepReader(): SleepReader | null {
  if (shared === undefined) {
    shared = Platform.OS === "ios" ? appleReader() : null;
  }
  return shared;
}
