import { File, Paths } from "expo-file-system";

/**
 * What the phone keeps for the zones it downloads ahead, nearby and most
 * searched cities (TASK-214 part A2, ADR-0177): an anonymous id, random and
 * made here once, by which the server counts the day's bytes, and until when
 * the server said «enough for today» (429 with Retry-After: the user's cap of
 * 300 MB a day for each phone, 300 GB for the server). Beside the zones, not
 * among them: «Delete» in «Settings» leaves it.
 */

export const PHONE_HEADER = "X-Phone-Id";
/** Without a usable Retry-After, the next try is a day later. */
export const DAY_MS = 24 * 60 * 60 * 1000;

type PrefetchState = { phoneId: string; pausedUntil: number };

const ID = /^[0-9a-f]{32}$/;

function stateFile(): File {
  return new File(Paths.document, "engine", "prefetch.json");
}

function readState(): PrefetchState | null {
  try {
    const file = stateFile();
    if (!file.exists) {
      return null;
    }
    const data: unknown = JSON.parse(file.textSync());
    if (typeof data !== "object" || data === null) {
      return null;
    }
    const state = data as Record<string, unknown>;
    return typeof state.phoneId === "string" &&
      ID.test(state.phoneId) &&
      typeof state.pausedUntil === "number"
      ? { phoneId: state.phoneId, pausedUntil: state.pausedUntil }
      : null;
  } catch {
    return null;
  }
}

function saveState(state: PrefetchState): void {
  try {
    const file = stateFile();
    file.create({ overwrite: true, intermediates: true });
    file.write(JSON.stringify(state));
  } catch {
    // Next time a new id, or no pause: the server still holds the cap.
  }
}

/** 32 hex digits; not a secret, only a count's name. */
export function newPhoneId(random: () => number = Math.random): string {
  let id = "";
  for (let digit = 0; digit < 32; digit += 1) {
    id += Math.floor(random() * 16).toString(16);
  }
  return id;
}

/** The phone's id for the server's count, made the first time. */
export function phoneId(random: () => number = Math.random): string {
  const state = readState();
  if (state !== null) {
    return state.phoneId;
  }
  const made = newPhoneId(random);
  saveState({ phoneId: made, pausedUntil: 0 });
  return made;
}

/** Until when, in ms since 1970, the phone downloads nothing ahead; 0 when
 * it may. */
export function prefetchPausedUntil(): number {
  return readState()?.pausedUntil ?? 0;
}

/** No zone ahead before `until`, in ms since 1970. */
export function pausePrefetch(until: number): void {
  saveState({ phoneId: phoneId(), pausedUntil: until });
}

/** When to try again after a 429: Retry-After in seconds, never more than
 * a day; a day without it. */
export function retryAt(retryAfter: string | null, now: number): number {
  const seconds = Number(retryAfter ?? "");
  return Number.isFinite(seconds) && seconds > 0
    ? now + Math.min(seconds * 1000, DAY_MS)
    : now + DAY_MS;
}
