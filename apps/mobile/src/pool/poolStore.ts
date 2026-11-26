import { currentOwner } from "../account/currentOwner";
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

/** A swim in the file, with the account it belongs to (TASK-507): absent
 * for one begun with nobody signed in, and before TASK-507, anyone's. */
type Kept = PoolSwim & { owner?: number };

function isKept(value: unknown): value is Kept {
  const owner = (value as { owner?: unknown } | null)?.owner;
  return isPoolSwim(value) && (owner === undefined || typeof owner === "number");
}

const kept = keptList(POOL_SWIM_FILE, isKept);

/** Whether `item` is the account's signed in now, or nobody's. */
function isMine(item: Kept): boolean {
  return item.owner === undefined || item.owner === currentOwner();
}

function withoutOwner(item: Kept): PoolSwim {
  const { owner, ...swim } = item;
  void owner;
  return swim;
}

/** The swim left under way (or ended and not saved yet); null when none. */
export function loadPoolSwim(): PoolSwim | null {
  // Another account's waits in the file, hidden, until it signs in again
  // (TASK-507, the user's choice «Nascosta finché rientra»).
  const mine = kept.load().find(isMine);
  return mine === undefined ? null : withoutOwner(mine);
}

/** Keeps `swim`, or with null forgets it; false when the phone refuses. */
export function savePoolSwim(swim: PoolSwim | null): boolean {
  const item = swim;
  // Only this account's changes: another account's stays as it was.
  const others = kept.load().filter((one) => !isMine(one));
  if (item === null) {
    return kept.save(others);
  }
  const owner = currentOwner();
  return kept.save([...others, owner === null ? item : { ...item, owner }]);
}

/** Deletes the swim of `owner` left on the phone: the account is deleted,
 * or its number is now somebody else's (account/phoneOwners.ts, TASK-507). */
export function forgetPoolSwimOf(owner: number): void {
  const list = kept.load();
  const next = list.filter((one) => one.owner !== owner);
  if (next.length !== list.length) {
    kept.save(next);
  }
}
