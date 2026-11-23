import type { PoolSwimRequest } from "@shaperoute/shared-types";

import type { DrawingChoice } from "../api/drawings";
import { keptList } from "../storage/keptList";

/**
 * The swims in a pool saved and not on the API yet (TASK-400 part B), in a
 * file of their own, as the workouts at the gym (gym/gymOutbox.ts): a swim
 * saved without a network goes when the app next has one. Each belongs to
 * the account signed in at «Save».
 */

export const POOL_OUTBOX_FILE = "pool-outbox.json";

/** The swims of one account the phone holds, as for the workouts. */
export const MAX_POOL_WAITING = 20;

export type PoolWaiting = {
  /** The account it belongs to (User.id). */
  owner: number;
  key: string;
  request: PoolSwimRequest;
  /** Its post, as the end of the swim chose it (TASK-400 part C): it goes
   * once the API has the swim, as a workout's. Its photos and their order
   * wait in their own files. */
  drawing?: DrawingChoice;
  /** The API will not take it (422, or 409 for a key of a run): it is not
   * sent again. */
  refused?: { code: string; message: string };
};

function isPoolWaiting(value: unknown): value is PoolWaiting {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  const request = item.request as Record<string, unknown> | null | undefined;
  return (
    typeof item.owner === "number" &&
    typeof item.key === "string" &&
    typeof request === "object" &&
    request !== null &&
    typeof request.started_at === "string" &&
    typeof request.ended_at === "string" &&
    typeof request.pool_length_m === "number" &&
    typeof request.lengths === "number"
  );
}

const kept = keptList(POOL_OUTBOX_FILE, isPoolWaiting);

export function loadPoolOutbox(): PoolWaiting[] {
  return kept.load();
}

/** What keepPoolWaiting did, as keepGymWaiting. */
export type PoolKept = "kept" | "full" | "not_written";

/** Adds `swim` to the file, once. */
export function keepPoolWaiting(swim: PoolWaiting): PoolKept {
  const list = kept.load();
  if (list.some((item) => item.key === swim.key && item.owner === swim.owner)) {
    return "kept";
  }
  if (list.filter((item) => item.owner === swim.owner).length >= MAX_POOL_WAITING) {
    return "full";
  }
  return kept.save([...list, swim]) ? "kept" : "not_written";
}

/** Takes the swim `key` of `owner` out of the file. */
export function stopPoolWaiting(owner: number, key: string): void {
  const list = kept.load();
  const next = list.filter((item) => !(item.key === key && item.owner === owner));
  if (next.length !== list.length) {
    kept.save(next);
  }
}

/** Marks the swim `key` of `owner` as one the API will not take. */
export function refusePoolWaiting(
  owner: number,
  key: string,
  refused: { code: string; message: string },
): void {
  const list = kept.load();
  kept.save(
    list.map((item) =>
      item.key === key && item.owner === owner ? { ...item, refused } : item,
    ),
  );
}

/** The swims of `owner` still to send, the oldest first. */
export function poolToSend(owner: number): PoolWaiting[] {
  return kept
    .load()
    .filter((item) => item.owner === owner && item.refused === undefined);
}
