import type { LatLon } from "@shaperoute/shared-types";
import { useSyncExternalStore } from "react";

import { type KeptList, keptList } from "../storage/keptList";
import type { Waypoint } from "./waypoints";

/**
 * The waypoints the pilot puts on the flight map with a long press
 * (TASK-479 part D5, ADR-0388): «W01», «W02»… or a landing, «L01»…, kept on
 * the phone beside the file's, never sent anywhere. Their height is not
 * known: the map gives none, and a guess would make a glide's number lie.
 */

export const MANUAL_WAYPOINTS_FILE = "manual-waypoints.json";
/** Enough for a day's flying; the oldest goes when one more comes. */
export const MAX_MANUAL = 50;

function isManual(value: unknown): value is Waypoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  return (
    typeof one.name === "string" &&
    Array.isArray(one.point) &&
    one.point.length === 2 &&
    one.point.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    typeof one.landing === "boolean"
  );
}

const kept: KeptList<Waypoint> = keptList(MANUAL_WAYPOINTS_FILE, isManual);

let current: Waypoint[] | null = null;
const listeners = new Set<() => void>();

export function manualWaypointsNow(list: KeptList<Waypoint> = kept): Waypoint[] {
  current ??= list.load();
  return current;
}

function changed(next: Waypoint[], list: KeptList<Waypoint>): boolean {
  if (!list.save(next)) {
    return false;
  }
  current = next;
  for (const listener of listeners) {
    listener();
  }
  return true;
}

/** The next name of its kind: one more than the highest kept. */
export function nextName(waypoints: readonly Waypoint[], landing: boolean): string {
  const letter = landing ? "L" : "W";
  const highest = waypoints
    .map((one) => new RegExp(`^${letter}(\\d+)$`).exec(one.name)?.[1])
    .filter((n): n is string => n !== undefined)
    .reduce((top, n) => Math.max(top, Number(n)), 0);
  return `${letter}${String(highest + 1).padStart(2, "0")}`;
}

/** A waypoint at `point`; false when the phone refuses to keep it. */
export function addManualWaypoint(
  point: LatLon,
  landing: boolean,
  list: KeptList<Waypoint> = kept,
): boolean {
  const now = manualWaypointsNow(list);
  const one: Waypoint = {
    name: nextName(now, landing),
    code: null,
    point,
    altM: null,
    landing,
    description: null,
  };
  return changed([...now, one].slice(-MAX_MANUAL), list);
}

export function removeManualWaypoints(list: KeptList<Waypoint> = kept): boolean {
  return changed([], list);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useManualWaypoints(): Waypoint[] {
  return useSyncExternalStore(subscribe, () => manualWaypointsNow());
}

/** For tests: as when the app starts. */
export function resetManualWaypoints(): void {
  current = null;
  listeners.clear();
}
