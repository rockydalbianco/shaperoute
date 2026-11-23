import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";

/** The phone remembers here the version whose whole launch animation it
 * has seen (TASK-505, ADR-0405). */
export const INTRO_FILE = "intro-seen.json";

// Kept in this run of the app: a phone that cannot write the file does not
// forget within the run what it has just seen.
let seenNow: string | null = null;

type Config = { version?: string } | null | undefined;

/**
 * The version the whole animation is shown once for: the app's store
 * version (`version` of app.json), which changes with a release on the
 * stores and not with an update over the air. Empty without one.
 */
export function introVersion(config: Config = Constants.expoConfig): string {
  return config?.version ?? "";
}

/**
 * True once the whole launch animation was seen on this phone with this
 * version of the app: from then on the short one shows. False when the file
 * is missing or does not read, so a phone that lost it sees the whole
 * animation once more. Read at once, before the first frame.
 */
export function wholeIntroSeen(version: string = introVersion()): boolean {
  if (seenNow === version) {
    return true;
  }
  try {
    const file = new File(Paths.document, INTRO_FILE);
    if (!file.exists) {
      return false;
    }
    const data: unknown = JSON.parse(file.textSync());
    return (
      typeof data === "object" &&
      data !== null &&
      "version" in data &&
      data.version === version
    );
  } catch {
    return false;
  }
}

/** Keeps that the whole animation was seen with this version; a phone that
 * refuses keeps it until the app closes. */
export function markWholeIntroSeen(version: string = introVersion()): void {
  seenNow = version;
  try {
    const file = new File(Paths.document, INTRO_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ version }));
  } catch {
    // Read again at the next opening: the whole animation shows once more.
  }
}

/** For tests: as a new opening of the app, the file aside. */
export function forgetIntroSeen(): void {
  seenNow = null;
}
