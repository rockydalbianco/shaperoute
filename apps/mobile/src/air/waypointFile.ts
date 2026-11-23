import { File } from "expo-file-system";

import { readTask } from "./flightTask";
import type { LoadedTask, LoadedWaypoints } from "./waypointStore";
import { readWaypoints } from "./waypoints";

/**
 * The pilot's waypoint and task files, picked from «Files» (TASK-479 part
 * D1), as the airspace file of part E1: read, checked and made what the
 * phone keeps. The picker's copy in the cache is deleted once read.
 */

type ExpoDocumentPicker = typeof import("expo-document-picker");

export type Picked<T> =
  { loaded: T } | { canceled: true } | { error: "unreadable" | "empty" | "notTask" };

/** The text of a waypoint file as `LoadedWaypoints`, or why not. */
export function waypointsOf(
  text: string,
  fileName: string,
  nowMs: number,
): { loaded: LoadedWaypoints } | { error: "empty" } {
  const { waypoints, unread } = readWaypoints(text, fileName);
  return waypoints.length === 0
    ? { error: "empty" }
    : { loaded: { fileName, loadedAtMs: nowMs, waypoints, unread } };
}

/** The text of an `.xctsk` file as `LoadedTask`, or why not. */
export function taskOf(
  text: string,
  fileName: string,
  nowMs: number,
): { loaded: LoadedTask } | { error: "notTask" } {
  const result = readTask(text);
  return "task" in result
    ? { loaded: { fileName, loadedAtMs: nowMs, task: result.task } }
    : { error: "notTask" };
}

async function pickText<T>(
  make: (text: string, name: string) => { loaded: T } | { error: "empty" | "notTask" },
): Promise<Picked<T>> {
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
      return make(file.textSync(), asset.name);
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

export function pickWaypoints(
  nowMs: number = Date.now(),
): Promise<Picked<LoadedWaypoints>> {
  return pickText((text, name) => waypointsOf(text, name, nowMs));
}

export function pickTask(nowMs: number = Date.now()): Promise<Picked<LoadedTask>> {
  return pickText((text, name) => taskOf(text, name, nowMs));
}
