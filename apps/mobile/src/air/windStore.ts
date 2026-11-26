import type { LatLon } from "@shaperoute/shared-types";
import { useSyncExternalStore } from "react";

import { apiUrl } from "../api/apiUrl";
import { fetchWinds, isWinds, type Winds } from "../api/winds";
import { type KeptList, keptList } from "../storage/keptList";

/**
 * The wind aloft kept on the phone (TASK-479 part H): asked before the
 * flight, where there is network, and kept for the air, where there often
 * is none. Asked again for another place or when it is old; without an
 * answer the kept one stays, with its run's time always shown.
 */

export const WINDS_FILE = "winds.json";
/** Kept winds still serve this close, degrees (some 5 km). */
export const SAME_PLACE_DEG = 0.05;
/** And this long: a model runs every 3 to 12 hours. */
export const FRESH_MS = 3 * 3600 * 1000;

export type KeptWinds = { place: LatLon; fetchedAtMs: number; winds: Winds };

function isKept(value: unknown): value is KeptWinds {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  return (
    Array.isArray(one.place) &&
    one.place.length === 2 &&
    one.place.every((n) => typeof n === "number") &&
    typeof one.fetchedAtMs === "number" &&
    isWinds(one.winds)
  );
}

const kept: KeptList<KeptWinds> = keptList(WINDS_FILE, isKept);

export function stillGood(
  winds: KeptWinds | null,
  here: LatLon,
  nowMs: number,
): boolean {
  return (
    winds !== null &&
    Math.abs(winds.place[0] - here[0]) <= SAME_PLACE_DEG &&
    Math.abs(winds.place[1] - here[1]) <= SAME_PLACE_DEG &&
    nowMs - winds.fetchedAtMs < FRESH_MS
  );
}

let current: KeptWinds | null | undefined;
const listeners = new Set<() => void>();

export function windsNow(list: KeptList<KeptWinds> = kept): KeptWinds | null {
  if (current === undefined) {
    current = list.load()[0] ?? null;
  }
  return current;
}

/** The winds around `here`, asked unless the kept ones still serve. Never
 * throws: without an answer the kept ones stay. */
export async function refreshWinds(
  here: LatLon,
  nowMs: number,
  ask: (place: LatLon) => ReturnType<typeof fetchWinds> | null = (place) => {
    const base = apiUrl();
    return base === null ? null : fetchWinds(base, place);
  },
  list: KeptList<KeptWinds> = kept,
): Promise<"kept" | "fetched" | "failed"> {
  if (stillGood(windsNow(list), here, nowMs)) {
    return "kept";
  }
  try {
    const asked = ask(here);
    const outcome = asked === null ? null : await asked;
    if (outcome === null || outcome.kind !== "ok") {
      return "failed";
    }
    const next: KeptWinds = { place: here, fetchedAtMs: nowMs, winds: outcome.value };
    list.save([next]);
    current = next;
    for (const listener of listeners) {
      listener();
    }
    return "fetched";
  } catch {
    return "failed";
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWinds(): KeptWinds | null {
  return useSyncExternalStore(subscribe, () => windsNow());
}

/** For tests: as when the app starts. */
export function resetWinds(): void {
  current = undefined;
  listeners.clear();
}

/** The wind for the flight map (part H): the hour now, at the level
 * nearest `altM` (the standard atmosphere's heights), at the kept place;
 * null without a known wind there. */
export function windOnMap(
  winds: KeptWinds | null,
  nowMs: number,
  altM: number | null,
  levelHeights: Readonly<Record<number, number>>,
): { place: LatLon; hpa: number; fromDeg: number; speedMs: number } | null {
  if (winds === null) {
    return null;
  }
  const hour = [...winds.winds.hours]
    .filter((one) => Date.parse(one.time) <= nowMs + 1800_000)
    .pop();
  if (hour === undefined || nowMs - Date.parse(hour.time) > 2 * 3600_000) {
    return null;
  }
  const at = altM ?? levelHeights[700] ?? 3000;
  const known = hour.winds.filter(
    (one) => one.speed_ms !== null && one.from_deg !== null,
  );
  if (known.length === 0) {
    return null;
  }
  const nearest = known.reduce((best, one) =>
    Math.abs((levelHeights[one.hpa] ?? 0) - at) <
    Math.abs((levelHeights[best.hpa] ?? 0) - at)
      ? one
      : best,
  );
  return {
    place: winds.place,
    hpa: nearest.hpa,
    fromDeg: nearest.from_deg ?? 0,
    speedMs: nearest.speed_ms ?? 0,
  };
}
