import { File, Paths } from "expo-file-system";

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

export type Waiting = RecordedRun & {
  /** The id of the account the run belongs to (User.id). */
  owner: number;
};

function outboxFile(): File {
  return new File(Paths.document, OUTBOX_FILE);
}

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

/** The runs in the file, the oldest first; none when it cannot be read. */
export function loadOutbox(): Waiting[] {
  try {
    const file = outboxFile();
    if (!file.exists) {
      return [];
    }
    const data: unknown = JSON.parse(file.textSync());
    return Array.isArray(data) ? data.filter(isWaiting) : [];
  } catch {
    return [];
  }
}

/** Writes the runs; false when the phone refuses (full, no access). */
export function saveOutbox(list: Waiting[]): boolean {
  try {
    const file = outboxFile();
    if (list.length === 0) {
      if (file.exists) {
        file.delete();
      }
      return true;
    }
    file.create({ overwrite: true });
    file.write(JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
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
