import { currentOwner } from "../account/currentOwner";
import { isGymSet } from "../api/gym";
import { keptList } from "../storage/keptList";
import type { Workout } from "./workout";

/**
 * The workout under way, in a file of the app's documents (TASK-385 part
 * B): an app closed in the middle, or killed by the phone, opens on it
 * again, with its time, its sets and its rest. Written so that a write cut
 * short loses nothing (keptList, TASK-252): a list of none or one.
 */

export const WORKOUT_FILE = "gym-workout.json";

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isEntry(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { exercise, name, kind } = value as Record<string, unknown>;
  return (
    (typeof exercise === "string" || typeof name === "string") &&
    typeof kind === "string"
  );
}

export function isWorkout(value: unknown): value is Workout {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  const rest = item.rest as Record<string, unknown> | null | undefined;
  return (
    typeof item.key === "string" &&
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
    (item.current === null || isEntry(item.current)) &&
    Array.isArray(item.sets) &&
    item.sets.every(
      (set: unknown) =>
        isGymSet(set) && isNumber((set as unknown as Record<string, unknown>).n),
    ) &&
    (rest === null ||
      (typeof rest === "object" && isNumber(rest?.fromMs) && isNumber(rest?.endsMs))) &&
    isNumber(item.rests) &&
    isNumber(item.restS) &&
    typeof item.restChoices === "object" &&
    item.restChoices !== null &&
    isNumber(item.lastActiveMs) &&
    (item.endedMs === null || isNumber(item.endedMs)) &&
    isNumber(item.nextN)
  );
}

/** A workout in the file, with the account it belongs to (TASK-507): absent
 * for one begun with nobody signed in, and before TASK-507, anyone's. */
type Kept = Workout & { owner?: number };

function isKept(value: unknown): value is Kept {
  const owner = (value as { owner?: unknown } | null)?.owner;
  return isWorkout(value) && (owner === undefined || typeof owner === "number");
}

const kept = keptList(WORKOUT_FILE, isKept);

/** Whether `item` is the account's signed in now, or nobody's. */
function isMine(item: Kept): boolean {
  return item.owner === undefined || item.owner === currentOwner();
}

function withoutOwner(item: Kept): Workout {
  const { owner, ...workout } = item;
  void owner;
  return workout;
}

/** The workout left under way (or ended and not saved yet); null when none. */
export function loadWorkout(): Workout | null {
  // Another account's waits in the file, hidden, until it signs in again
  // (TASK-507, the user's choice «Nascosta finché rientra»).
  const mine = kept.load().find(isMine);
  return mine === undefined ? null : withoutOwner(mine);
}

/** Keeps `workout`, or with null forgets it; false when the phone refuses. */
export function saveWorkout(workout: Workout | null): boolean {
  const item = workout;
  // Only this account's changes: another account's stays as it was.
  const others = kept.load().filter((one) => !isMine(one));
  if (item === null) {
    return kept.save(others);
  }
  const owner = currentOwner();
  return kept.save([...others, owner === null ? item : { ...item, owner }]);
}

/** Deletes the workout of `owner` left on the phone: the account is deleted,
 * or its number is now somebody else's (account/phoneOwners.ts, TASK-507). */
export function forgetWorkoutOf(owner: number): void {
  const list = kept.load();
  const next = list.filter((one) => one.owner !== owner);
  if (next.length !== list.length) {
    kept.save(next);
  }
}
