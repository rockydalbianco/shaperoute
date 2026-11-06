import { keptList } from "../storage/keptList";
import type { PoolSwim } from "./poolSwim";

/**
 * The swim in a pool under way, in a file of the app's documents (TASK-400
 * part B), as a workout at the gym (gym/workoutStore.ts): an app closed in
 * the middle, or killed by the phone, opens on it again, with its time and
 * its pauses. A list of none or one.
 */

export const POOL_SWIM_FILE = "pool-swim.json";

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isPoolSwim(value: unknown): value is PoolSwim {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.key === "string" &&
    isNumber(item.poolLengthM) &&
    isNumber(item.startedMs) &&
    Array.isArray(item.pauses) &&
    item.pauses.every(
      (pause: unknown) =>
        typeof pause === "object" &&
        pause !== null &&
        isNumber((pause as Record<string, unknown>).fromMs) &&
        ((pause as Record<string, unknown>).toMs === null ||
          isNumber((pause as Record<string, unknown>).toMs)),
    ) &&
    (item.endedMs === null || isNumber(item.endedMs))
  );
}

const kept = keptList(POOL_SWIM_FILE, isPoolSwim);

/** The swim left under way (or ended and not saved yet); null when none. */
export function loadPoolSwim(): PoolSwim | null {
  return kept.load()[0] ?? null;
}

/** Keeps `swim`, or with null forgets it; false when the phone refuses. */
export function savePoolSwim(swim: PoolSwim | null): boolean {
  return kept.save(swim === null ? [] : [swim]);
}
