import { useSyncExternalStore } from "react";

import { type KeptList, keptList } from "../storage/keptList";
import type { ToneThresholds } from "./varioTone";

/**
 * The pilot's choices for the vario's sound (TASK-479 part C, ADR-0388),
 * kept on the phone in a file of their own, beside the flight screen's:
 * on or off, the climb that starts the beeps, the sink that starts the low
 * note (or never), and how loud.
 */

export const VARIO_SOUND_FILE = "vario-sound.json";

export const CLIMB_FROM_CHOICES = [0.1, 0.2, 0.3, 0.5] as const;
/** null: no sound when sinking. */
export const SINK_BELOW_CHOICES = [-1.5, -2, -2.5, -3, -4, null] as const;
export const VOLUMES = ["low", "medium", "high"] as const;

export type ClimbFrom = (typeof CLIMB_FROM_CHOICES)[number];
export type SinkBelow = (typeof SINK_BELOW_CHOICES)[number];
export type VarioVolume = (typeof VOLUMES)[number];

export type VarioPrefs = {
  on: boolean;
  climbFromMps: ClimbFrom;
  sinkBelowMps: SinkBelow;
  volume: VarioVolume;
};

/** The player's volume of each choice, 0 to 1. */
export const VOLUME_LEVEL: Readonly<Record<VarioVolume, number>> = {
  low: 0.35,
  medium: 0.65,
  high: 1,
};

/** Whether the sound is on before the pilot chooses. */
export const SOUND_ON_AT_FIRST = true;

export const DEFAULT_VARIO_PREFS: VarioPrefs = {
  on: SOUND_ON_AT_FIRST,
  climbFromMps: 0.2,
  sinkBelowMps: -2.5,
  volume: "high",
};

export function isVarioPrefs(value: unknown): value is VarioPrefs {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prefs = value as Record<string, unknown>;
  return (
    typeof prefs.on === "boolean" &&
    (CLIMB_FROM_CHOICES as readonly unknown[]).includes(prefs.climbFromMps) &&
    (SINK_BELOW_CHOICES as readonly unknown[]).includes(prefs.sinkBelowMps) &&
    (VOLUMES as readonly unknown[]).includes(prefs.volume)
  );
}

export function thresholdsOf(prefs: VarioPrefs): ToneThresholds {
  return { climbFromMps: prefs.climbFromMps, sinkBelowMps: prefs.sinkBelowMps };
}

const kept: KeptList<VarioPrefs> = keptList(VARIO_SOUND_FILE, isVarioPrefs);

/** The pilot's choices on this phone, or the defaults. */
export function loadVarioPrefs(list: KeptList<VarioPrefs> = kept): VarioPrefs {
  return list.load()[0] ?? DEFAULT_VARIO_PREFS;
}

export function saveVarioPrefs(
  prefs: VarioPrefs,
  list: KeptList<VarioPrefs> = kept,
): boolean {
  return list.save([prefs]);
}

/** The choices of the moment, shared by the flight screen that changes them
 * and the recording that plays the sound. */
let current: VarioPrefs | null = null;
const listeners = new Set<() => void>();

export function varioPrefsNow(): VarioPrefs {
  current ??= loadVarioPrefs();
  return current;
}

/** The choices changed, kept, and told to whoever listens. */
export function setVarioPrefs(prefs: VarioPrefs): void {
  current = prefs;
  saveVarioPrefs(prefs);
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

export function useVarioPrefs(): VarioPrefs {
  return useSyncExternalStore(subscribe, varioPrefsNow);
}

/** For tests: as when the app starts. */
export function resetVarioPrefs(): void {
  current = null;
  listeners.clear();
}
