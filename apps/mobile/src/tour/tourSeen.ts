import { File, Paths } from "expo-file-system";

/** The phone remembers here that the tour was seen to its end or skipped. */
export const TOUR_FILE = "tour-seen.json";

// Kept in this run of the app: a phone that cannot write the file does not
// show the tour twice before it closes.
let seenNow = false;

/**
 * True once the tour was seen or skipped on this phone: it shows at the
 * first opening only (TASK-266). False when the file is missing or does
 * not read, so a phone that lost it shows the tour once more.
 */
export function tourSeen(): boolean {
  if (seenNow) {
    return true;
  }
  try {
    const file = new File(Paths.document, TOUR_FILE);
    if (!file.exists) {
      return false;
    }
    const data: unknown = JSON.parse(file.textSync());
    seenNow =
      typeof data === "object" && data !== null && "seen" in data && data.seen === true;
    return seenNow;
  } catch {
    return false;
  }
}

/** Keeps that the tour was seen; a phone that refuses keeps it until the
 * app closes. */
export function markTourSeen(): void {
  seenNow = true;
  try {
    const file = new File(Paths.document, TOUR_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ seen: true }));
  } catch {
    // Read again at the next opening: the tour shows once more.
  }
}

/** For tests: as a new opening of the app, the file aside. */
export function forgetTourSeen(): void {
  seenNow = false;
}
