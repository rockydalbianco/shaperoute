import { useSyncExternalStore } from "react";

import { type KeptList, keptList } from "../storage/keptList";

/**
 * How the pilot wants the flight map (TASK-479 part A1, ADR-0388): with the
 * hills in 3D or flat, turned to the way they fly or north up. Kept on the
 * phone; one choice for every «Map» widget.
 */

export const FLIGHT_MAP_FILE = "flight-map.json";

export type FlightMapPrefs = { threeD: boolean; headingUp: boolean };

export const DEFAULT_FLIGHT_MAP: FlightMapPrefs = { threeD: true, headingUp: true };

export function isFlightMapPrefs(value: unknown): value is FlightMapPrefs {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prefs = value as Record<string, unknown>;
  return typeof prefs.threeD === "boolean" && typeof prefs.headingUp === "boolean";
}

const kept: KeptList<FlightMapPrefs> = keptList(FLIGHT_MAP_FILE, isFlightMapPrefs);

export function loadFlightMapPrefs(
  list: KeptList<FlightMapPrefs> = kept,
): FlightMapPrefs {
  return list.load()[0] ?? DEFAULT_FLIGHT_MAP;
}

let current: FlightMapPrefs | null = null;
const listeners = new Set<() => void>();

export function flightMapPrefsNow(): FlightMapPrefs {
  current ??= loadFlightMapPrefs();
  return current;
}

export function setFlightMapPrefs(
  prefs: FlightMapPrefs,
  list: KeptList<FlightMapPrefs> = kept,
): void {
  current = prefs;
  list.save([prefs]);
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFlightMapPrefs(): FlightMapPrefs {
  return useSyncExternalStore(subscribe, flightMapPrefsNow);
}

/** For tests: as when the app starts. */
export function resetFlightMapPrefs(): void {
  current = null;
  listeners.clear();
}
