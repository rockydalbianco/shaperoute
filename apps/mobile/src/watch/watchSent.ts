import { type KeptList, keptList } from "../storage/keptList";

/**
 * The favorites already sent to the Apple Watch (TASK-370 part B3a2), by
 * key: kept in a file of the app, so that opening it again does not send
 * them all again. A key is written only once its route went to
 * WatchConnectivity; one the watch let go of is written out at the next
 * sync (useWatchFavorites.ts).
 */

/** The file, in the app's documents, with a copy beside it (keptList). */
export const WATCH_SENT_FILE = "watch-favorites.json";

function isKey(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

export function watchSent(): KeptList<string> {
  return keptList(WATCH_SENT_FILE, isKey);
}
