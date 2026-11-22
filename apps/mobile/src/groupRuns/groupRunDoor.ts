import { useSyncExternalStore } from "react";

/**
 * The page of a group run asked for from anywhere in the app (TASK-309
 * part B): the form just published, a profile's list, one of its three
 * notifications touched. `ProfileLayer` shows the page over the app, as
 * the page of a monthly challenge (contestDoor), and takes it down when the
 * app goes elsewhere. Nothing in `App` changes for it.
 */

/** One request: a new object each time. */
export type AskedGroupRun = { readonly id: string };

let asked: AskedGroupRun | null = null;
const listeners = new Set<() => void>();

function tell(): void {
  listeners.forEach((listener) => listener());
}

/** Asks the app to show the page of the group run `id`. */
export function openGroupRunPage(id: string): void {
  asked = { id };
  tell();
}

/** The page goes: «←», «Start», or the app going elsewhere. */
export function closeGroupRunPage(): void {
  if (asked !== null) {
    asked = null;
    tell();
  }
}

export function askedGroupRun(): AskedGroupRun | null {
  return asked;
}

export function subscribeAskedGroupRun(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The group run whose page is asked for, and a new render when it changes. */
export function useAskedGroupRun(): AskedGroupRun | null {
  return useSyncExternalStore(subscribeAskedGroupRun, askedGroupRun);
}
