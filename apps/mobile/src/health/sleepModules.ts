import { Platform, TurboModuleRegistry } from "react-native";

import { isPreview } from "../updates/channel";
import { appleSleepReader, type SleepKitModule } from "./appleSleep";
import type { SleepReader } from "./sleepSamples";

type AppleLibrary = typeof import("@kingstinct/react-native-healthkit");

/**
 * The switch of the whole sleep in MuW (TASK-467: «Sleep last night» in a
 * post, the «Sleep» card of the profile, the post of a night), and the
 * phone's reader of the sleep.
 *
 * **Off on the stores' build, and no reader there, until part C**: its iOS
 * permission text speaks of the heart rate only, so the sleep waits for the
 * native build with its own sentence, the privacy line, the App Privacy
 * card and the review notes, each after the user's yes. Until then, on the
 * stores' build nothing of this shows and nothing reads Apple Health: this
 * file loads no health library there and asks for no permission, and
 * `sleepModules.test.ts` holds it to that.
 *
 * **On on the testers' preview** (part C0, `isPreview`), so that the sleep
 * can be tried on a phone before the stores have it. Reading is asked only
 * at the user's tap: on «Show my sleep from Apple Health» of the profile
 * and on «Sleep» of the Feed's «+».
 */

/** Whether the stores' build shows and publishes the sleep: part C turns
 * it on. Typed as a boolean, not as the `false` it is, so that what it
 * hides still compiles and is tested. */
export const SLEEP_POSTS_ON: boolean = false;

/** Whether this copy of the app shows and publishes the sleep: everywhere
 * once `SLEEP_POSTS_ON`, until then on the testers' preview only. A test
 * turns it on or off by replacing this. */
export function sleepPostsOn(): boolean {
  return SLEEP_POSTS_ON || isPreview();
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
 * an iPhone whose build has its native code, where the sleep is on; null
 * elsewhere (the stores' build until part C, Expo Go, Android until Health
 * Connect, part D). */
export function sleepReader(): SleepReader | null {
  if (shared === undefined) {
    shared = sleepPostsOn() && Platform.OS === "ios" ? appleReader() : null;
  }
  return shared;
}
