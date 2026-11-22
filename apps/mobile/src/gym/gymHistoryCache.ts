import type { GymHistory } from "@shaperoute/shared-types";

import { isGymHistory } from "../api/gymHistory";
import { keptList } from "../storage/keptList";

/**
 * The last history the API gave for each exercise (TASK-483 part B), kept
 * on the phone: a gym in a basement often has no network, and «Last time»
 * is wanted there. Only the first page, as the API gave it; the workouts
 * still waiting to be sent are added on reading (exerciseHistory.withWaiting).
 */

export const GYM_HISTORY_FILE = "gym-history.json";

/** The exercises kept, of every account together: the most recent stay. */
export const MAX_KEPT_HISTORIES = 40;

type KeptHistory = {
  /** The account it belongs to (User.id). */
  owner: number;
  /** exerciseHistory.historyKey of the exercise. */
  of: string;
  history: GymHistory;
};

function isKeptHistory(value: unknown): value is KeptHistory {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.owner === "number" &&
    typeof item.of === "string" &&
    isGymHistory(item.history)
  );
}

const kept = keptList(GYM_HISTORY_FILE, isKeptHistory);

/** The history of `of` the phone has for `owner`; null when none. */
export function keptHistory(owner: number, of: string): GymHistory | null {
  return (
    kept.load().find((item) => item.owner === owner && item.of === of)?.history ?? null
  );
}

/** Keeps `history` of `of` for `owner`, first; the oldest go past the most. */
export function keepHistory(owner: number, of: string, history: GymHistory): void {
  const others = kept
    .load()
    .filter((item) => !(item.owner === owner && item.of === of));
  kept.save([{ owner, of, history }, ...others].slice(0, MAX_KEPT_HISTORIES));
}
