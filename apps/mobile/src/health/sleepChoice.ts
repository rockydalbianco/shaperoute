import { File, Paths } from "expo-file-system";

/**
 * The user's yes to MuW reading the sleep from Apple Health (TASK-467):
 * said once, with «Show my sleep from Apple Health» on the «Sleep» card of
 * the profile (part B3), and kept on the phone, as the yes to the heart
 * rate of a swim (`pool/poolHeart.ts`). Until it is there the end of an
 * activity reads no sleep and shows no «Sleep last night». It is taken
 * back in the Health app, never here: a permission turned off reads as no
 * sleep.
 */

export const SLEEP_CHOICE_FILE = "sleep-health.json";

/** Whether the user said yes; no when never asked, or the file does not
 * read. */
export function loadSleepOn(): boolean {
  try {
    const file = new File(Paths.document, SLEEP_CHOICE_FILE);
    if (!file.exists) {
      return false;
    }
    const data: unknown = JSON.parse(file.textSync());
    return (
      typeof data === "object" && data !== null && "on" in data && data.on === true
    );
  } catch {
    return false;
  }
}

/** Keeps the yes; a phone that refuses keeps nothing, and the card asks
 * again. */
export function keepSleepOn(): void {
  try {
    const file = new File(Paths.document, SLEEP_CHOICE_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ on: true }));
  } catch {
    // Nothing is read until the yes is kept.
  }
}
