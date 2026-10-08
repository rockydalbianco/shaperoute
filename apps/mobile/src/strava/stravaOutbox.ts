import { sessionEnded } from "../account/messages";
import { sendToStrava, worthAgain } from "../api/strava";
import { keptList } from "../storage/keptList";

/**
 * The saved runs still to go to Strava (TASK-187), in a file of the app's
 * documents, like the runs still to go to the API (activities/outbox.ts): a
 * run saved with «Send to Strava» on joins it once the API has the run, and
 * leaves it when Strava has it, or will never take it. What waits goes
 * when the app next opens with a network. Sending again is always safe:
 * the API never makes two activities of a run.
 */

export const STRAVA_OUTBOX_FILE = "strava-outbox.json";
/** As many as the runs that can wait for the API. */
export const MAX_STRAVA_WAITING = 20;

export type StravaWaiting = {
  /** The id of the account the run belongs to (User.id). */
  owner: number;
  /** The run's key in «My activities». */
  key: string;
  /** The name typed before «Save»; null: the API's own. */
  name: string | null;
};

function isStravaWaiting(value: unknown): value is StravaWaiting {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.owner === "number" &&
    typeof item.key === "string" &&
    (item.name === null || typeof item.name === "string")
  );
}

// Written so that a write cut short loses nothing that waited (TASK-252).
const kept = keptList(STRAVA_OUTBOX_FILE, isStravaWaiting);

/** The runs in the file, the oldest first; none when it cannot be read. */
export function loadStravaOutbox(): StravaWaiting[] {
  return kept.load();
}

function saveStravaOutbox(list: StravaWaiting[]): boolean {
  return kept.save(list);
}

/** Adds `run`, once for its account; false when the file could not be written. */
export function keepForStrava(run: StravaWaiting): boolean {
  const list = loadStravaOutbox();
  if (list.some((item) => item.key === run.key && item.owner === run.owner)) {
    return true;
  }
  return saveStravaOutbox([...list, run].slice(-MAX_STRAVA_WAITING));
}

/** Takes the run `key` of `owner` out of the file. */
export function dropForStrava(owner: number, key: string): void {
  const list = loadStravaOutbox();
  const next = list.filter((item) => !(item.key === key && item.owner === owner));
  if (next.length !== list.length) {
    saveStravaOutbox(next);
  }
}

/** Takes every run of `owner` out of the file: the account is deleted
 * (TASK-252). */
export function forgetStravaOf(owner: number): void {
  const list = loadStravaOutbox();
  const next = list.filter((item) => item.owner !== owner);
  if (next.length !== list.length) {
    saveStravaOutbox(next);
  }
}

type Options = { fetchFn?: typeof fetch; key?: string | null };

/**
 * Sends the runs of `owner` that wait for Strava, the oldest first. A run
 * Strava is still reading stays for the next time; with no network, or
 * the API or Strava silent or busy, the rest waits too. A run Strava will
 * never take (not connected any more, a file it cannot read, a run
 * deleted, Strava off) leaves the file: sending it again would change
 * nothing. "session_ended" when the token opens no session any more.
 */
export async function sendWaitingToStrava(
  baseUrl: string,
  token: string,
  owner: number,
  options: Options = {},
): Promise<"done" | "session_ended"> {
  for (const run of loadStravaOutbox().filter((item) => item.owner === owner)) {
    const outcome = await sendToStrava(baseUrl, token, run.key, run.name, options);
    if (sessionEnded(outcome)) {
      return "session_ended";
    }
    if (!worthAgain(outcome)) {
      dropForStrava(owner, run.key);
      continue;
    }
    if (outcome.kind === "ok") {
      // Strava is reading it: the others may go meanwhile.
      continue;
    }
    break;
  }
  return "done";
}
