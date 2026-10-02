import { File, Paths } from "expo-file-system";

/**
 * The «Send to Strava» switch at the end of a run (TASK-187) remembers the
 * last choice, on the phone (the user's choice, 2026-10-02): on the first
 * time, then as it was left.
 */

export const STRAVA_CHOICE_FILE = "strava.json";

/** Whether the next run that ends goes to Strava too; on when never chosen. */
export function loadSendToStrava(): boolean {
  try {
    const file = new File(Paths.document, STRAVA_CHOICE_FILE);
    if (!file.exists) {
      return true;
    }
    const data: unknown = JSON.parse(file.textSync());
    return !(
      typeof data === "object" &&
      data !== null &&
      "send" in data &&
      data.send === false
    );
  } catch {
    return true;
  }
}

/** Keeps the choice for the next run; a phone that refuses keeps nothing. */
export function saveSendToStrava(send: boolean): void {
  try {
    const file = new File(Paths.document, STRAVA_CHOICE_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ send }));
  } catch {
    // The switch still says it for this run.
  }
}
