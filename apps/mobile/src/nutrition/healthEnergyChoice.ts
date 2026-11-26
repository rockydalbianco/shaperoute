import { File, Paths } from "expo-file-system";

/**
 * The user's yes to MuW reading workouts and active energy from Apple
 * Health for «Nutrition» (TASK-489 part C2): said once, with «Use Apple
 * Health» in «Energy you use», and kept on the phone, as the yes to the
 * sleep (`health/sleepChoice.ts`). Until it is there nothing is read.
 * «Stop using Apple Health» forgets it here; the permission itself is
 * taken back in the Health app, and one turned off reads as no data.
 */

export const HEALTH_ENERGY_CHOICE_FILE = "nutrition-health.json";

/** Whether the user said yes; no when never asked, or the file does not
 * read. */
export function loadHealthEnergyOn(): boolean {
  try {
    const file = new File(Paths.document, HEALTH_ENERGY_CHOICE_FILE);
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

/** Keeps the yes, or forgets it; false when the phone did not keep it. */
export function keepHealthEnergyOn(on: boolean): boolean {
  try {
    const file = new File(Paths.document, HEALTH_ENERGY_CHOICE_FILE);
    if (on) {
      file.create({ overwrite: true });
      file.write(JSON.stringify({ on: true }));
    } else if (file.exists) {
      file.delete();
    }
    return true;
  } catch {
    // Nothing is read until the yes is kept.
    return false;
  }
}
