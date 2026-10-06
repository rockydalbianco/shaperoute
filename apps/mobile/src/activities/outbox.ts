import { choiceFrom, type DrawingChoice } from "../api/drawings";
import { keptList } from "../storage/keptList";
import type { RecordedRun } from "./recordedRun";

/**
 * The runs that ended and are not on the API yet (TASK-172), in a file of
 * the app's documents: a run finished without a network waits here, and
 * goes when the app next opens with one. Each belongs to the account that
 * was signed in when it ended; nobody else's phone session sends it.
 */

export const OUTBOX_FILE = "activities-outbox.json";
/** The runs of one account the phone holds before «Save» says it is full
 * (TASK-257): none is ever let go without a word. */
export const MAX_WAITING = 20;

/** «Send to Strava» on at «Save» (TASK-187), with the name typed; null:
 * the API's own name. */
export type ToStrava = { name: string | null };

/** What the API answered a run it will never take (TASK-257): its code and
 * its message, in English as it came. */
export type Refused = { code: string; message: string };

export type Waiting = RecordedRun & {
  /** The id of the account the run belongs to (User.id). */
  owner: number;
  /** Once the API has the run, it goes on to Strava (strava/stravaOutbox.ts). */
  strava?: ToStrava;
  /** Once the API has the run, what was chosen for its drawing goes too
   * (social/drawingOutbox.ts, TASK-117, TASK-208). */
  drawing?: DrawingChoice;
  /** The API will not take it: it stays on the phone, not sent again,
   * until it is discarded or tried again (TASK-257). */
  refused?: Refused;
};

function isWaiting(value: unknown): value is Waiting {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  const request = item.request as Record<string, unknown> | null | undefined;
  return (
    typeof item.id === "string" &&
    typeof item.owner === "number" &&
    typeof request === "object" &&
    request !== null &&
    Array.isArray(request.track) &&
    Array.isArray(request.pauses)
  );
}

/** Where a waiting run goes after the API: Strava, or nowhere. */
export function toStravaOf(run: Waiting): ToStrava | null {
  const strava: unknown = run.strava;
  if (typeof strava !== "object" || strava === null || !("name" in strava)) {
    return null;
  }
  const { name } = strava;
  return { name: typeof name === "string" && name !== "" ? name : null };
}

/** What was chosen for the drawing before «Save» (a choice of before
 * TASK-208, title and «Public», made whole); null when nothing was. */
export function toDrawingOf(run: Waiting): DrawingChoice | null {
  return choiceFrom(run.drawing);
}

/** Why the API will not take the run; null while it waits to be sent. */
export function refusedOf(run: Waiting): Refused | null {
  const refused: unknown = run.refused;
  if (typeof refused !== "object" || refused === null) {
    return null;
  }
  const { code, message } = refused as Record<string, unknown>;
  return {
    code: typeof code === "string" ? code : "",
    message: typeof message === "string" ? message : "",
  };
}

// Written so that a write cut short loses no run that waited (TASK-252).
const kept = keptList(OUTBOX_FILE, isWaiting);

/** The runs in the file, the oldest first; none when it cannot be read. */
export function loadOutbox(): Waiting[] {
  return kept.load();
}

/** Writes the runs; false when the phone refuses (full, no access). */
export function saveOutbox(list: Waiting[]): boolean {
  return kept.save(list);
}

/** `list` with `run` waiting too, once for its account; null when its
 * account already has MAX_WAITING runs on the phone (TASK-257). */
export function withRun(list: Waiting[], run: Waiting): Waiting[] | null {
  if (list.some((item) => item.id === run.id && item.owner === run.owner)) {
    return list;
  }
  if (list.filter((item) => item.owner === run.owner).length >= MAX_WAITING) {
    return null;
  }
  return [...list, run];
}

/** `list` without the run `id` of `owner`. */
export function withoutRun(list: Waiting[], owner: number, id: string): Waiting[] {
  return list.filter((item) => !(item.id === id && item.owner === owner));
}

/** What `keepWaiting` did: the run is on the phone; or not, because its
 * account holds MAX_WAITING runs already, or because the phone refused the
 * file. */
export type Kept = "kept" | "full" | "not_written";

/** Adds `run` to the file. */
export function keepWaiting(run: Waiting): Kept {
  const next = withRun(loadOutbox(), run);
  if (next === null) {
    return "full";
  }
  return saveOutbox(next) ? "kept" : "not_written";
}

/** Takes the run `id` of `owner` out of the file. */
export function stopWaiting(owner: number, id: string): void {
  const list = loadOutbox();
  const next = withoutRun(list, owner, id);
  if (next.length !== list.length) {
    saveOutbox(next);
  }
}

/** Marks the run `id` of `owner` as one the API will not take, or, with
 * null, as one to send again (TASK-257). */
export function markRefused(owner: number, id: string, refused: Refused | null): void {
  const list = loadOutbox();
  let found = false;
  const next = list.map((item) => {
    if (item.id !== id || item.owner !== owner) {
      return item;
    }
    found = true;
    const marked: Waiting = { ...item };
    delete marked.refused;
    return refused === null ? marked : { ...marked, refused };
  });
  if (found) {
    saveOutbox(next);
  }
}

/** Takes every run of `owner` out of the file: the account is deleted
 * (TASK-252). The runs of the other accounts stay. */
export function forgetOutboxOf(owner: number): void {
  const list = loadOutbox();
  const next = list.filter((item) => item.owner !== owner);
  if (next.length !== list.length) {
    saveOutbox(next);
  }
}
