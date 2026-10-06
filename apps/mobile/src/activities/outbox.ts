import type { DrawingChoice } from "../api/drawings";
import { keptList } from "../storage/keptList";
import type { RecordedRun } from "./recordedRun";

/**
 * The runs that ended and are not on the API yet (TASK-172), in a file of
 * the app's documents: a run finished without a network waits here, and
 * goes when the app next opens with one. Each belongs to the account that
 * was signed in when it ended; nobody else's phone session sends it.
 */

export const OUTBOX_FILE = "activities-outbox.json";
/** A phone a long time without a network keeps the latest runs. */
export const MAX_WAITING = 20;

/** «Send to Strava» on at «Save» (TASK-187), with the name typed; null:
 * the API's own name. */
export type ToStrava = { name: string | null };

export type Waiting = RecordedRun & {
  /** The id of the account the run belongs to (User.id). */
  owner: number;
  /** Once the API has the run, it goes on to Strava (strava/stravaOutbox.ts). */
  strava?: ToStrava;
  /** Once the API has the run, its title and «Public» go too
   * (social/drawingOutbox.ts, TASK-117). */
  drawing?: DrawingChoice;
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

/** The title and «Public» chosen before «Save»; null when nothing was. */
export function toDrawingOf(run: Waiting): DrawingChoice | null {
  const drawing: unknown = run.drawing;
  if (typeof drawing !== "object" || drawing === null) {
    return null;
  }
  const { title, public: on } = drawing as Record<string, unknown>;
  if (typeof on !== "boolean") {
    return null;
  }
  return {
    title: typeof title === "string" && title !== "" ? title : null,
    public: on,
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

/** `list` with `run` waiting too: once for its account, the oldest dropped
 * past MAX_WAITING. */
export function withRun(list: Waiting[], run: Waiting): Waiting[] {
  if (list.some((item) => item.id === run.id && item.owner === run.owner)) {
    return list;
  }
  return [...list, run].slice(-MAX_WAITING);
}

/** `list` without the run `id` of `owner`. */
export function withoutRun(list: Waiting[], owner: number, id: string): Waiting[] {
  return list.filter((item) => !(item.id === id && item.owner === owner));
}

/** Adds `run` to the file; false when it could not be written. */
export function keepWaiting(run: Waiting): boolean {
  return saveOutbox(withRun(loadOutbox(), run));
}

/** Takes the run `id` of `owner` out of the file. */
export function stopWaiting(owner: number, id: string): void {
  const list = loadOutbox();
  const next = withoutRun(list, owner, id);
  if (next.length !== list.length) {
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
