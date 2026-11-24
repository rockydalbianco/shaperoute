import { useSyncExternalStore } from "react";

import { type KeptList, keptList } from "../storage/keptList";

/**
 * How the pilot's glide is worked out (TASK-479 part D3, ADR-0388): the
 * glide ratio through the air (default 8) and the wind, the one estimated
 * in the air (B1) or none. Kept on the phone. The heights are numbers for
 * the pilot to read, never a «yes».
 */

export const GLIDE_FILE = "glide.json";

export const LD_CHOICES = [6, 7, 8, 9, 10, 11, 12] as const;
export type WindChoice = "estimated" | "none";
export const WIND_CHOICES: readonly WindChoice[] = ["estimated", "none"];

export type GlidePrefs = { ld: number; wind: WindChoice };

export const DEFAULT_GLIDE: GlidePrefs = { ld: 8, wind: "estimated" };

export function isGlidePrefs(value: unknown): value is GlidePrefs {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  return (
    (LD_CHOICES as readonly unknown[]).includes(one.ld) &&
    (WIND_CHOICES as readonly unknown[]).includes(one.wind)
  );
}

const kept: KeptList<GlidePrefs> = keptList(GLIDE_FILE, isGlidePrefs);

export function loadGlidePrefs(list: KeptList<GlidePrefs> = kept): GlidePrefs {
  return list.load()[0] ?? DEFAULT_GLIDE;
}

let current: GlidePrefs | null = null;
const listeners = new Set<() => void>();

export function glidePrefsNow(): GlidePrefs {
  current ??= loadGlidePrefs();
  return current;
}

export function setGlidePrefs(
  prefs: GlidePrefs,
  list: KeptList<GlidePrefs> = kept,
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

export function useGlidePrefs(): GlidePrefs {
  return useSyncExternalStore(subscribe, glidePrefsNow);
}

/** For tests: as when the app starts. */
export function resetGlidePrefs(): void {
  current = null;
  listeners.clear();
}
