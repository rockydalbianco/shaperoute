import { File, Paths } from "expo-file-system";

import { sessionEnded } from "../account/messages";
import { type DrawingChoice, saveDrawing, worthAgain } from "../api/drawings";

/**
 * The choices of «Public» and title still to reach the API (TASK-117), in
 * a file of the app's documents, like the runs still to go to Strava
 * (strava/stravaOutbox.ts): a run saved with a title or «Public» joins it
 * once the API has the run; a choice made on a run of «My activities»
 * without a network joins it at once. Only the latest choice for a run
 * waits: it is the choice whole, and sending it again changes nothing.
 */

export const DRAWING_OUTBOX_FILE = "drawings-outbox.json";
/** As many as the runs that can wait for the API. */
export const MAX_DRAWINGS_WAITING = 20;

export type DrawingWaiting = DrawingChoice & {
  /** The id of the account the run belongs to (User.id). */
  owner: number;
  /** The run's key in «My activities». */
  key: string;
};

function outboxFile(): File {
  return new File(Paths.document, DRAWING_OUTBOX_FILE);
}

function isDrawingWaiting(value: unknown): value is DrawingWaiting {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.owner === "number" &&
    typeof item.key === "string" &&
    (item.title === null || typeof item.title === "string") &&
    typeof item.public === "boolean"
  );
}

/** The choices in the file, the oldest first; none when it cannot be read. */
export function loadDrawingOutbox(): DrawingWaiting[] {
  try {
    const file = outboxFile();
    if (!file.exists) {
      return [];
    }
    const data: unknown = JSON.parse(file.textSync());
    return Array.isArray(data) ? data.filter(isDrawingWaiting) : [];
  } catch {
    return [];
  }
}

function saveDrawingOutbox(list: DrawingWaiting[]): boolean {
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

function sameRun(a: DrawingWaiting, owner: number, key: string): boolean {
  return a.owner === owner && a.key === key;
}

/** Adds `choice` in place of any earlier one for its run; false when the
 * file could not be written. */
export function keepForDrawing(choice: DrawingWaiting): boolean {
  const others = loadDrawingOutbox().filter(
    (item) => !sameRun(item, choice.owner, choice.key),
  );
  return saveDrawingOutbox(
    [
      ...others,
      {
        owner: choice.owner,
        key: choice.key,
        title: choice.title,
        public: choice.public,
      },
    ].slice(-MAX_DRAWINGS_WAITING),
  );
}

/** The choice for the run `key` of `owner` still waiting; null when none. */
export function waitingDrawing(owner: number, key: string): DrawingWaiting | null {
  return loadDrawingOutbox().find((item) => sameRun(item, owner, key)) ?? null;
}

/** Takes `choice` out of the file, unless a newer one took its place. */
export function dropForDrawing(choice: DrawingWaiting): void {
  const list = loadDrawingOutbox();
  const next = list.filter(
    (item) =>
      !(
        sameRun(item, choice.owner, choice.key) &&
        item.title === choice.title &&
        item.public === choice.public
      ),
  );
  if (next.length !== list.length) {
    saveDrawingOutbox(next);
  }
}

type Options = { fetchFn?: typeof fetch; key?: string | null };

/**
 * Sends the choices of `owner` that wait, the oldest first. With no
 * network, or the API silent or busy, they wait on. A choice the API
 * refuses leaves the file: sending it again would change nothing. A run
 * too short to publish keeps its title, private (ADR-0159, point 4).
 * "session_ended" when the token opens no session any more.
 */
export async function sendWaitingDrawings(
  baseUrl: string,
  token: string,
  owner: number,
  options: Options = {},
): Promise<"done" | "session_ended"> {
  for (const choice of loadDrawingOutbox().filter((item) => item.owner === owner)) {
    const outcome = await saveDrawing(baseUrl, token, choice.key, choice, options);
    if (sessionEnded(outcome)) {
      return "session_ended";
    }
    if (worthAgain(outcome)) {
      break;
    }
    if (
      outcome.kind === "api_error" &&
      outcome.code === "invalid_request" &&
      choice.public &&
      choice.title !== null
    ) {
      await saveDrawing(
        baseUrl,
        token,
        choice.key,
        { title: choice.title, public: false },
        options,
      );
    }
    dropForDrawing(choice);
  }
  return "done";
}
