import { requireOptionalNativeModule } from "expo";
import { File } from "expo-file-system";

import type { LoadedAirspace } from "./airspaceStore";
import { readOpenAir } from "./openair";

/**
 * The pilot's airspace file, picked from «Files» (TASK-479 part E1): read,
 * checked and made a `LoadedAirspace`. The picker's copy in the cache is
 * deleted once read. Opening a file into MuW from another app would need
 * the app's native settings: not now.
 */

type ExpoDocumentPicker = typeof import("expo-document-picker");

/** Whether this app was built with expo-document-picker. */
export function airspacePickerAvailable(): boolean {
  return requireOptionalNativeModule("ExpoDocumentPicker") !== null;
}

export type PickedAirspace =
  { loaded: LoadedAirspace } | { canceled: true } | { error: "unreadable" | "empty" };

/** The text of a file as `LoadedAirspace`, or why not. */
export function airspaceOf(
  text: string,
  fileName: string,
  nowMs: number,
): { loaded: LoadedAirspace } | { error: "empty" } {
  const { airspaces, unread } = readOpenAir(text);
  if (airspaces.length === 0) {
    return { error: "empty" };
  }
  return { loaded: { fileName, loadedAtMs: nowMs, airspaces, unread } };
}

export async function pickAirspace(
  nowMs: number = Date.now(),
): Promise<PickedAirspace> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const picker = require("expo-document-picker") as ExpoDocumentPicker;
    const result = await picker.getDocumentAsync({
      type: "*/*",
      multiple: false,
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset === undefined) {
      return { canceled: true };
    }
    const file = new File(asset.uri);
    try {
      return airspaceOf(file.textSync(), asset.name, nowMs);
    } finally {
      try {
        file.delete();
      } catch {
        // The cache is the system's to empty too.
      }
    }
  } catch {
    return { error: "unreadable" };
  }
}
