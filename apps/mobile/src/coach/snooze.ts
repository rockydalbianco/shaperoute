import { keptList } from "../storage/keptList";

/**
 * «Not now» on a Coach tip (TASK-491 part B, ADR-0399): the tip is put
 * off for a week, on this phone, for the account that put it off. A tip
 * is known by `tipKey` (its rule and what it is about), so the same advice
 * for another exercise still shows.
 */

export const SNOOZE_FILE = "coach-snoozed.json";

/** How long «Not now» puts a tip off. */
export const SNOOZE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type Snoozed = {
  /** The account it belongs to (User.id). */
  owner: number;
  /** `tipKey` of the tip. */
  key: string;
  /** Until when, in ms since 1970. */
  untilMs: number;
};

function isSnoozed(value: unknown): value is Snoozed {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.owner === "number" &&
    typeof item.key === "string" &&
    typeof item.untilMs === "number"
  );
}

const kept = keptList(SNOOZE_FILE, isSnoozed);

/** The keys `owner` put off that are still put off at `nowMs`. */
export function snoozedIn(
  list: readonly Snoozed[],
  owner: number,
  nowMs: number,
): Set<string> {
  return new Set(
    list
      .filter((one) => one.owner === owner && one.untilMs > nowMs)
      .map((one) => one.key),
  );
}

/** The list with `key` put off for a week from `nowMs`; what has expired
 * leaves the list. */
export function withSnoozed(
  list: readonly Snoozed[],
  owner: number,
  key: string,
  nowMs: number,
): Snoozed[] {
  return [
    ...list.filter(
      (one) => one.untilMs > nowMs && !(one.owner === owner && one.key === key),
    ),
    { owner, key, untilMs: nowMs + SNOOZE_DAYS * DAY_MS },
  ];
}

/** The tips `owner` put off, read from the phone. */
export function loadSnoozed(owner: number, nowMs: number = Date.now()): Set<string> {
  return snoozedIn(kept.load(), owner, nowMs);
}

/** «Not now»: `key` put off for a week, written on the phone. */
export function snooze(owner: number, key: string, nowMs: number = Date.now()): void {
  kept.save(withSnoozed(kept.load(), owner, key, nowMs));
}
