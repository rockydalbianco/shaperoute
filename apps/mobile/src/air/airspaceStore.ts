import { useSyncExternalStore } from "react";

import { type KeptList, keptList } from "../storage/keptList";
import type { Airspace } from "./openair";

/**
 * The pilot's airspace file, kept (TASK-479 part E1, ADR-0388): its volumes
 * as read, its name and when it was loaded, on the phone only, for flights
 * without network. MuW never sends it anywhere and never brings one of its
 * own. One file at a time: a new one takes the place of the old.
 */

export const AIRSPACE_FILE = "airspace.json";

export type LoadedAirspace = {
  fileName: string;
  loadedAtMs: number;
  airspaces: Airspace[];
  /** Lines of the file that could not be read. */
  unread: number;
};

function isAirspace(value: unknown): value is Airspace {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  return (
    typeof one.class === "string" &&
    typeof one.name === "string" &&
    typeof one.floor === "object" &&
    one.floor !== null &&
    typeof one.ceiling === "object" &&
    one.ceiling !== null &&
    Array.isArray(one.points) &&
    one.points.length >= 3
  );
}

export function isLoadedAirspace(value: unknown): value is LoadedAirspace {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  return (
    typeof one.fileName === "string" &&
    typeof one.loadedAtMs === "number" &&
    typeof one.unread === "number" &&
    Array.isArray(one.airspaces) &&
    one.airspaces.every(isAirspace)
  );
}

const kept: KeptList<LoadedAirspace> = keptList(AIRSPACE_FILE, isLoadedAirspace);

export function loadAirspace(
  list: KeptList<LoadedAirspace> = kept,
): LoadedAirspace | null {
  return list.load()[0] ?? null;
}

let current: LoadedAirspace | null | undefined;
const listeners = new Set<() => void>();

export function airspaceNow(): LoadedAirspace | null {
  if (current === undefined) {
    current = loadAirspace();
  }
  return current;
}

/** The pilot's file kept, or taken away with null; false when the phone
 * refuses to write it (the one of before stays). */
export function setAirspace(
  next: LoadedAirspace | null,
  list: KeptList<LoadedAirspace> = kept,
): boolean {
  const saved = list.save(next === null ? [] : [next]);
  if (!saved) {
    return false;
  }
  current = next;
  for (const listener of listeners) {
    listener();
  }
  return true;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAirspace(): LoadedAirspace | null {
  return useSyncExternalStore(subscribe, airspaceNow);
}

/** For tests: as when the app starts. */
export function resetAirspace(): void {
  current = undefined;
  listeners.clear();
}
