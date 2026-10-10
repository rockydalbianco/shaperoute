import { useSyncExternalStore } from "react";

/**
 * The members blocked or unblocked while the app is open (TASK-121,
 * ADR-0228). The API already leaves them out of every list it sends; this
 * is for what is on the screen now: the cards of «Feed» of someone just
 * blocked go away at once, and «Profile» reads its lists again. A new
 * read of the feed has none of them anyway.
 */

let blocked: ReadonlySet<string> = new Set();
/** Changes at every block and unblock: what reads lists reads them again. */
let version = 0;
const listeners = new Set<() => void>();

function changed(next: ReadonlySet<string>): void {
  blocked = next;
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

/** The member with this `public_id` was just blocked. */
export function markBlocked(publicId: string): void {
  changed(new Set([...blocked, publicId]));
}

/** The member with this `public_id` was just unblocked. */
export function markUnblocked(publicId: string): void {
  changed(new Set([...blocked].filter((id) => id !== publicId)));
}

/** Forgets every change: for the tests. */
export function forgetBlocked(): void {
  blocked = new Set();
  version = 0;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether the member with this `public_id` was blocked while the app is open. */
export function useBlockedNow(publicId: string | null): boolean {
  return useSyncExternalStore(subscribe, () =>
    publicId === null ? false : blocked.has(publicId),
  );
}

/** A number that changes at every block and unblock. */
export function useBlocksVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}
