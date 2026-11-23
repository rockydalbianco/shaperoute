import { useSyncExternalStore } from "react";

import { type KeptList, keptList } from "../storage/keptList";
import type { FlightTask } from "./flightTask";
import type { Waypoint } from "./waypoints";

/**
 * The pilot's waypoints and task, kept (TASK-479 part D1, ADR-0388): as
 * read from their files, with the file's name and when it was loaded, on
 * the phone only, for flights without network. One waypoint file and one
 * task at a time: a new one takes the place of the old. Never sent.
 */

export const WAYPOINTS_FILE = "waypoints.json";
export const TASK_FILE = "task.json";

export type LoadedWaypoints = {
  fileName: string;
  loadedAtMs: number;
  waypoints: Waypoint[];
  /** Lines of the file that could not be read. */
  unread: number;
};

export type LoadedTask = {
  fileName: string;
  loadedAtMs: number;
  task: FlightTask;
};

function isWaypoint(value: unknown): value is Waypoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  return (
    typeof one.name === "string" &&
    Array.isArray(one.point) &&
    one.point.length === 2 &&
    one.point.every((n) => typeof n === "number") &&
    typeof one.landing === "boolean"
  );
}

export function isLoadedWaypoints(value: unknown): value is LoadedWaypoints {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  return (
    typeof one.fileName === "string" &&
    typeof one.loadedAtMs === "number" &&
    typeof one.unread === "number" &&
    Array.isArray(one.waypoints) &&
    one.waypoints.every(isWaypoint)
  );
}

export function isLoadedTask(value: unknown): value is LoadedTask {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  const task = one.task as Record<string, unknown> | null | undefined;
  return (
    typeof one.fileName === "string" &&
    typeof one.loadedAtMs === "number" &&
    typeof task === "object" &&
    task !== null &&
    Array.isArray(task.turnpoints) &&
    task.turnpoints.length >= 2 &&
    task.turnpoints.every(
      (point: unknown) =>
        typeof point === "object" &&
        point !== null &&
        isWaypoint((point as Record<string, unknown>).waypoint) &&
        typeof (point as Record<string, unknown>).radiusM === "number",
    )
  );
}

/** One kept value with its listeners: the waypoints, or the task. */
function store<T>(file: string, check: (value: unknown) => value is T) {
  const kept: KeptList<T> = keptList(file, check);
  let current: T | null | undefined;
  const listeners = new Set<() => void>();
  const now = (): T | null => {
    if (current === undefined) {
      current = kept.load()[0] ?? null;
    }
    return current;
  };
  return {
    now,
    /** Kept, or taken away with null; false when the phone refuses to
     * write it (the one of before stays). */
    set(next: T | null, list: KeptList<T> = kept): boolean {
      if (!list.save(next === null ? [] : [next])) {
        return false;
      }
      current = next;
      for (const listener of listeners) {
        listener();
      }
      return true;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset(): void {
      current = undefined;
      listeners.clear();
    },
  };
}

const waypoints = store(WAYPOINTS_FILE, isLoadedWaypoints);
const task = store(TASK_FILE, isLoadedTask);

export const waypointsNow = waypoints.now;
export const setWaypoints = waypoints.set;
export const taskNow = task.now;
export const setTask = task.set;

export function useWaypoints(): LoadedWaypoints | null {
  return useSyncExternalStore(waypoints.subscribe, waypoints.now);
}

export function useTask(): LoadedTask | null {
  return useSyncExternalStore(task.subscribe, task.now);
}

/** For tests: as when the app starts. */
export function resetWaypointStore(): void {
  waypoints.reset();
  task.reset();
}
