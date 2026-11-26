import { GEAR_MAX_ON_ACTIVITY } from "@shaperoute/shared-types";

import { sessionEnded } from "../account/messages";
import { loadOutbox } from "../activities/outbox";
import { worthAgain } from "../api/drawings";
import { saveActivityGear } from "../api/gear";
import { loadGymOutbox } from "../gym/gymOutbox";
import { loadPoolOutbox } from "../pool/poolOutbox";
import { keptList } from "../storage/keptList";

/**
 * The gear chosen at the end of an activity (TASK-486 part C, ADR-0393),
 * in a file of the app's documents, as «Sleep last night» (sleepOut.ts):
 * told at «Save», it waits here until the API has the activity, then goes
 * with PUT /me/activities/{key}/gear. A list the API will not take (an
 * activity it does not know, an item gone) is dropped, not sent again; one
 * that waited longer than `GEAR_WAIT_DAYS` is dropped unsent. An empty
 * list is never kept: an activity just saved has no gear on the API.
 */

export const GEAR_OUTBOX_FILE = "gear-outbox.json";

/** A list waits for its activity this long at most. */
export const GEAR_WAIT_DAYS = 30;
const DAY_MS = 86_400_000;

export type GearWaiting = {
  /** The id of the account the activity belongs to (User.id). */
  owner: number;
  /** The activity's key in «My activities». */
  key: string;
  /** The ids of the items, as PUT takes them. */
  gearIds: string[];
  /** When it was kept, on the phone's clock. */
  keptMs: number;
};

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isGearWaiting(value: unknown): value is GearWaiting {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.owner === "number" &&
    typeof item.key === "string" &&
    typeof item.keptMs === "number" &&
    Array.isArray(item.gearIds) &&
    item.gearIds.length > 0 &&
    item.gearIds.length <= GEAR_MAX_ON_ACTIVITY &&
    item.gearIds.every((id) => typeof id === "string")
  );
}

// Written so that a write cut short loses nothing that waited (TASK-252).
const kept = keptList(GEAR_OUTBOX_FILE, isGearWaiting);

/** The lists in the file, the oldest first; none when it cannot be read. */
export function loadGearOutbox(): GearWaiting[] {
  return kept.load();
}

function sameActivity(item: GearWaiting, owner: number, key: string): boolean {
  return item.owner === owner && item.key === key;
}

/**
 * Keeps `gearIds` for the activity `key` of `owner`, in place of any
 * earlier list. False, and nothing kept, for no items, or more than an
 * activity takes; false too when the file could not be written: the
 * activity is saved all the same, without its gear.
 */
export function keepGearFor(
  owner: number,
  key: string,
  gearIds: readonly string[],
  nowMs: number = Date.now(),
): boolean {
  const ids = [...new Set(gearIds)];
  if (ids.length === 0 || ids.length > GEAR_MAX_ON_ACTIVITY) {
    return false;
  }
  const others = loadGearOutbox().filter((item) => !sameActivity(item, owner, key));
  return kept.save([...others, { owner, key, gearIds: ids, keptMs: nowMs }]);
}

/** Takes whatever waits for the activity `key` of `owner` out of the file. */
export function forgetGearFor(owner: number, key: string): void {
  const list = loadGearOutbox();
  const next = list.filter((item) => !sameActivity(item, owner, key));
  if (next.length !== list.length) {
    kept.save(next);
  }
}

/** The keys of what `owner` still has on the phone for the API to take: a
 * run, a workout at the gym, a swim in a pool. A list sent before its
 * activity would be answered 404, and dropped. */
function activitiesWaiting(owner: number): Set<string> {
  return new Set([
    ...loadOutbox()
      .filter((run) => run.owner === owner)
      .map((run) => run.id),
    ...loadGymOutbox()
      .filter((workout) => workout.owner === owner)
      .map((workout) => workout.key),
    ...loadPoolOutbox()
      .filter((swim) => swim.owner === owner)
      .map((swim) => swim.key),
  ]);
}

/**
 * Sends the lists of `owner` whose activity the API has, the oldest first;
 * those of an activity still on the phone wait with it. A list that went,
 * or that the API will not take, leaves the file; with no network they all
 * wait. "session_ended" when the API says the session is over.
 */
export async function sendWaitingGear(
  baseUrl: string,
  token: string,
  owner: number,
  options: Options = {},
  nowMs: number = Date.now(),
): Promise<"done" | "session_ended"> {
  const waiting = activitiesWaiting(owner);
  for (const item of loadGearOutbox()) {
    if (item.owner !== owner) {
      continue;
    }
    if (nowMs - item.keptMs > GEAR_WAIT_DAYS * DAY_MS) {
      forgetGearFor(owner, item.key);
      continue;
    }
    if (waiting.has(item.key)) {
      continue;
    }
    const outcome = await saveActivityGear(
      baseUrl,
      token,
      item.key,
      { gear_ids: item.gearIds },
      options,
    );
    if (sessionEnded(outcome)) {
      return "session_ended";
    }
    if (worthAgain(outcome)) {
      // No network, or the API is away: this list and the rest wait.
      return "done";
    }
    forgetGearFor(owner, item.key);
  }
  return "done";
}
