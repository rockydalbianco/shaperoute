import { useSyncExternalStore } from "react";

/**
 * The page of a group, and the «New group» form, asked for from anywhere in
 * the app (TASK-495 part B): one's groups on the profile, an invite, one of
 * the group's three notifications touched. `ProfileLayer` shows them over
 * the app, as the page of a group run (groupRunDoor), and takes the page
 * down when the app goes elsewhere. Nothing in `App` changes for it.
 */

/** One request: a new object each time. */
export type AskedGroup = { readonly id: string };
/** «New group» asked for: a new object each time. */
export type AskedGroupForm = { readonly kind: "new" };

let asked: AskedGroup | null = null;
let form: AskedGroupForm | null = null;
const listeners = new Set<() => void>();

function tell(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Asks the app to show the page of the group `id`. */
export function openGroupPage(id: string): void {
  asked = { id };
  tell();
}

/** The page goes: «←», a group left, or the app going elsewhere. */
export function closeGroupPage(): void {
  if (asked !== null) {
    asked = null;
    tell();
  }
}

export function askedGroup(): AskedGroup | null {
  return asked;
}

/** The group whose page is asked for, and a new render when it changes. */
export function useAskedGroup(): AskedGroup | null {
  return useSyncExternalStore(subscribe, askedGroup);
}

/** Asks the app to show the «New group» form. */
export function openNewGroupForm(): void {
  form = { kind: "new" };
  tell();
}

/** The form goes: «Not now», or the group created. */
export function closeGroupForm(): void {
  if (form !== null) {
    form = null;
    tell();
  }
}

export function askedGroupForm(): AskedGroupForm | null {
  return form;
}

/** Whether «New group» is asked for, and a new render when it changes. */
export function useAskedGroupForm(): AskedGroupForm | null {
  return useSyncExternalStore(subscribe, askedGroupForm);
}
