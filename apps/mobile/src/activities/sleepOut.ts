import type { ActivitySleepRequest } from "@shaperoute/shared-types";

import { sessionEnded } from "../account/messages";
import { worthAgain } from "../api/drawings";
import { isSleepSummary, saveActivitySleep } from "../api/sleep";
import { loadGymOutbox } from "../gym/gymOutbox";
import { loadPoolOutbox } from "../pool/poolOutbox";
import { keptList } from "../storage/keptList";
import { loadOutbox } from "./outbox";

/**
 * «Sleep last night» of the runs still to reach the API (TASK-467 part
 * B2), in a file of the app's documents, like the choices for their
 * drawings (social/drawingOutbox.ts): told at «Save», it waits here until
 * the API has the run, then goes with PUT /me/activities/{key}/sleep. A
 * workout at the gym and a swim in a pool are runs to the API, with a key
 * of the same kind and an outbox of their own: their nights wait here the
 * same way (part B2b).
 *
 * Only a night its owner shows waits here: with «Sleep last night» off, or
 * a post nobody else sees, nothing is kept and nothing is sent (the user's
 * choice, 2026-11-11: the server has only what is published). A night the
 * API will not take (not the night before the activity, an activity it
 * does not know) is dropped, not sent again; one that waited longer than
 * `SLEEP_WAIT_DAYS` is dropped unsent.
 */

export const SLEEP_OUTBOX_FILE = "sleep-outbox.json";

/** A night waits for its run this long at most. */
export const SLEEP_WAIT_DAYS = 30;
const DAY_MS = 86_400_000;

export type SleepWaiting = {
  /** The id of the account the run belongs to (User.id). */
  owner: number;
  /** The run's key in «My activities». */
  key: string;
  /** What goes to the API. */
  sleep: ActivitySleepRequest;
  /** When it was kept, on the phone's clock. */
  keptMs: number;
};

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isSleepWaiting(value: unknown): value is SleepWaiting {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.owner === "number" &&
    typeof item.key === "string" &&
    typeof item.keptMs === "number" &&
    isSleepSummary(item.sleep) &&
    (item.sleep as ActivitySleepRequest).shown === true
  );
}

// Written so that a write cut short loses nothing that waited (TASK-252).
const kept = keptList(SLEEP_OUTBOX_FILE, isSleepWaiting);

/** The nights in the file, the oldest first; none when it cannot be read. */
export function loadSleepOutbox(): SleepWaiting[] {
  return kept.load();
}

function sameRun(item: SleepWaiting, owner: number, key: string): boolean {
  return item.owner === owner && item.key === key;
}

/**
 * Keeps `sleep` for the run `key` of `owner`, in place of any earlier one.
 * False, and nothing kept, for a night that is not shown: it has no reason
 * to leave the phone. False too when the file could not be written: the
 * run is saved all the same, without its night.
 */
export function keepSleepFor(
  owner: number,
  key: string,
  sleep: ActivitySleepRequest,
  nowMs: number = Date.now(),
): boolean {
  if (sleep.shown !== true || !isSleepSummary(sleep)) {
    return false;
  }
  const others = loadSleepOutbox().filter((item) => !sameRun(item, owner, key));
  return kept.save([...others, { owner, key, sleep, keptMs: nowMs }]);
}

/** Takes whatever waits for the run `key` of `owner` out of the file: the
 * run was discarded, or its night has gone. */
export function forgetSleepFor(owner: number, key: string): void {
  const list = loadSleepOutbox();
  const next = list.filter((item) => !sameRun(item, owner, key));
  if (next.length !== list.length) {
    kept.save(next);
  }
}

/** The keys of what `owner` still has on the phone for the API to take: a
 * run (outbox.ts), a workout at the gym, a swim in a pool. A night sent
 * before its activity would be answered 404, and dropped. */
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
 * Sends the nights of `owner` whose activity the API has, the oldest first:
 * those of a run, a workout or a swim still waiting on the phone wait with
 * it. A
 * night that went, or that the API will not take, leaves the file; with no
 * network they all wait. "session_ended" when the API says the session is
 * over: the rest waits for the next one.
 */
export async function sendWaitingSleep(
  baseUrl: string,
  token: string,
  owner: number,
  options: Options = {},
  nowMs: number = Date.now(),
): Promise<"done" | "session_ended"> {
  const waiting = activitiesWaiting(owner);
  for (const item of loadSleepOutbox()) {
    if (item.owner !== owner) {
      continue;
    }
    if (nowMs - item.keptMs > SLEEP_WAIT_DAYS * DAY_MS) {
      forgetSleepFor(owner, item.key);
      continue;
    }
    if (waiting.has(item.key)) {
      continue;
    }
    const outcome = await saveActivitySleep(
      baseUrl,
      token,
      item.key,
      item.sleep,
      options,
    );
    if (sessionEnded(outcome)) {
      return "session_ended";
    }
    if (worthAgain(outcome)) {
      // No network, or the API is away: this night and the rest wait.
      return "done";
    }
    forgetSleepFor(owner, item.key);
  }
  return "done";
}
