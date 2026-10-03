import { File, Paths } from "expo-file-system";
import { useCallback, useRef, useState } from "react";

/** The phone remembers here that the safety notice was read (TASK-191). */
export const PADDLE_NOTICE_FILE = "paddle-notice.json";

// Read once in this run of the app: «I understand» holds until it closes
// even on a phone that could not keep the file.
let seenNow = false;

/**
 * True once «I understand» was tapped on this phone: the notice shows at the
 * first «Start» on the water only (the user's choice, ADR-0169). False when
 * the file is missing or does not read.
 */
export function noticeSeen(): boolean {
  if (seenNow) {
    return true;
  }
  try {
    const file = new File(Paths.document, PADDLE_NOTICE_FILE);
    if (!file.exists) {
      return false;
    }
    const data: unknown = JSON.parse(file.textSync());
    seenNow =
      typeof data === "object" && data !== null && "seen" in data && data.seen === true;
    return seenNow;
  } catch {
    return false;
  }
}

/** Keeps that the notice was read; a phone that refuses keeps it until the
 * app closes, and shows the notice again at the next opening. */
export function markNoticeSeen(): void {
  seenNow = true;
  try {
    const file = new File(Paths.document, PADDLE_NOTICE_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ seen: true }));
  } catch {
    // Read again at the next opening: the notice shows once more.
  }
}

/** For tests: as a new opening of the app, the file aside. */
export function forgetNoticeSeen(): void {
  seenNow = false;
}

/**
 * «Start» on the water, through the safety notice the first time
 * (TASK-191): `ask` starts at once once the notice was read, or shows it
 * and waits; «I understand» (`accept`) keeps that and starts, «Not now»
 * (`dismiss`) starts nothing.
 */
export function usePaddleNotice(): {
  asking: boolean;
  ask: (start: () => void) => void;
  accept: () => void;
  dismiss: () => void;
} {
  const [asking, setAsking] = useState(false);
  const waiting = useRef<(() => void) | null>(null);

  const ask = useCallback((start: () => void) => {
    if (noticeSeen()) {
      start();
      return;
    }
    waiting.current = start;
    setAsking(true);
  }, []);

  const accept = useCallback(() => {
    markNoticeSeen();
    const start = waiting.current;
    waiting.current = null;
    setAsking(false);
    start?.();
  }, []);

  const dismiss = useCallback(() => {
    waiting.current = null;
    setAsking(false);
  }, []);

  return { asking, ask, accept, dismiss };
}
