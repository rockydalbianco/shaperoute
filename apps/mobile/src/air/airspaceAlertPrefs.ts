import { useSyncExternalStore } from "react";

import { type KeptList, keptList } from "../storage/keptList";
import type { AlertThresholds } from "./airspaceNear";

/**
 * When the pilot is warned of an airspace of their file (TASK-479 part E2,
 * ADR-0388): within how far across (default 1000 m) and how far up or down
 * (default 100 m), and with a sound or only the line on the screen. Kept on
 * the phone.
 */

export const AIRSPACE_ALERTS_FILE = "airspace-alerts.json";

export const HORIZONTAL_CHOICES = [500, 1000, 2000] as const;
export const VERTICAL_CHOICES = [50, 100, 200] as const;

export type AirspaceAlertPrefs = AlertThresholds & { sound: boolean };

export const DEFAULT_AIRSPACE_ALERTS: AirspaceAlertPrefs = {
  horizontalM: 1000,
  verticalM: 100,
  sound: true,
};

export function isAirspaceAlertPrefs(value: unknown): value is AirspaceAlertPrefs {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  return (
    (HORIZONTAL_CHOICES as readonly unknown[]).includes(one.horizontalM) &&
    (VERTICAL_CHOICES as readonly unknown[]).includes(one.verticalM) &&
    typeof one.sound === "boolean"
  );
}

const kept: KeptList<AirspaceAlertPrefs> = keptList(
  AIRSPACE_ALERTS_FILE,
  isAirspaceAlertPrefs,
);

export function loadAirspaceAlerts(
  list: KeptList<AirspaceAlertPrefs> = kept,
): AirspaceAlertPrefs {
  return list.load()[0] ?? DEFAULT_AIRSPACE_ALERTS;
}

let current: AirspaceAlertPrefs | null = null;
const listeners = new Set<() => void>();

export function airspaceAlertsNow(): AirspaceAlertPrefs {
  current ??= loadAirspaceAlerts();
  return current;
}

export function setAirspaceAlerts(
  prefs: AirspaceAlertPrefs,
  list: KeptList<AirspaceAlertPrefs> = kept,
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

export function useAirspaceAlerts(): AirspaceAlertPrefs {
  return useSyncExternalStore(subscribe, airspaceAlertsNow);
}

/** For tests: as when the app starts. */
export function resetAirspaceAlerts(): void {
  current = null;
  listeners.clear();
}
