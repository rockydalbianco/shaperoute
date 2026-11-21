import type { StretchSessionRequest } from "@shaperoute/shared-types";

import type { StretchDone } from "../stretch/StretchScreen";
import { keptList } from "../storage/keptList";

/**
 * The stretching sessions finished and not on the API yet (TASK-475 part B,
 * ADR-0386), in a file of their own as the gym's workouts
 * (gym/gymOutbox.ts): one finished without a network goes when the app next
 * has one. Each belongs to the account signed in when it ended.
 */

export const STRETCH_OUTBOX_FILE = "stretch-outbox.json";

/** The sessions of one account the phone holds, as for the gym. */
export const MAX_STRETCH_WAITING = 20;

export type StretchWaiting = {
  /** The account it belongs to (User.id). */
  owner: number;
  key: string;
  request: StretchSessionRequest;
  /** The API will not take it (422, or 409 for a key of a run): it is not
   * sent again. */
  refused?: { code: string; message: string };
};

function isStretchWaiting(value: unknown): value is StretchWaiting {
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
    typeof request.routine === "string"
  );
}

const kept = keptList(STRETCH_OUTBOX_FILE, isStretchWaiting);

export function loadStretchOutbox(): StretchWaiting[] {
  return kept.load();
}

/** What keepStretchWaiting did, as keepGymWaiting. */
export type StretchKept = "kept" | "full" | "not_written";

/** Adds `session` to the file, once. */
export function keepStretchWaiting(session: StretchWaiting): StretchKept {
  const list = kept.load();
  if (list.some((item) => item.key === session.key && item.owner === session.owner)) {
    return "kept";
  }
  if (
    list.filter((item) => item.owner === session.owner).length >= MAX_STRETCH_WAITING
  ) {
    return "full";
  }
  return kept.save([...list, session]) ? "kept" : "not_written";
}

/** Takes the session `key` of `owner` out of the file. */
export function stopStretchWaiting(owner: number, key: string): void {
  const list = kept.load();
  const next = list.filter((item) => !(item.key === key && item.owner === owner));
  if (next.length !== list.length) {
    kept.save(next);
  }
}

/** Marks the session `key` of `owner` as one the API will not take. */
export function refuseStretchWaiting(
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

/** The sessions of `owner` still to send, the oldest first. */
export function stretchToSend(owner: number): StretchWaiting[] {
  return kept
    .load()
    .filter((item) => item.owner === owner && item.refused === undefined);
}

/** The API keeps a session of at most four hours (stretch_sessions.py). */
const MAX_SESSION_MS = 4 * 3600 * 1000;

/**
 * What the API is sent for a session that ended, or null for one with no
 * exercise held to its end (left at once: nothing to keep), one whose
 * length was not chosen, or one longer than the API keeps.
 */
export function stretchRequest(done: StretchDone): StretchSessionRequest | null {
  const length = done.endedAt - done.startedAt;
  if (done.exercises < 1 || done.minutes === null) {
    return null;
  }
  if (!(length > 0 && length <= MAX_SESSION_MS)) {
    return null;
  }
  const length_s = length / 1000;
  return {
    started_at: new Date(done.startedAt).toISOString(),
    ended_at: new Date(done.endedAt).toISOString(),
    pauses: done.pauses
      .map((pause) => ({
        from_s: Math.min(pause.from_s, length_s),
        to_s: Math.min(pause.to_s, length_s),
      }))
      .filter((pause) => pause.to_s >= pause.from_s),
    routine: done.routine,
    minutes: done.minutes,
    exercises: done.exercises,
  };
}
