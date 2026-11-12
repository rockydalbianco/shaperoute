import type { SleepReader } from "./sleepSamples";

/**
 * The switch of the whole «sleep in a post» (TASK-467 part B2), and the
 * phone's reader of the sleep.
 *
 * **Off, and no reader, until part C**: the iOS permission text of the
 * builds out today speaks of the heart rate only, so reading the sleep
 * needs the native build that comes after version 1.1.0, with the privacy
 * line, the App Privacy card and the review notes, each after the user's
 * yes. Until then nothing of this shows and nothing reads Apple Health:
 * this file loads no health library and asks for no permission, and
 * `sleepModules.test.ts` holds it to that.
 */

/** Whether the app shows and publishes the sleep in a post. Typed as a
 * boolean, not as the `false` it is, so that what it hides still compiles
 * and is tested. */
export const SLEEP_POSTS_ON: boolean = false;

/** `SLEEP_POSTS_ON`, for the screens: a test turns it on by replacing
 * this. */
export function sleepPostsOn(): boolean {
  return SLEEP_POSTS_ON;
}

/** The phone's reader of the sleep: none in this build. The one of Apple
 * Health comes with part C, where the build has its permission text. */
export function sleepReader(): SleepReader | null {
  return null;
}
