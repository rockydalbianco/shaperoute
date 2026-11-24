import { useSyncExternalStore } from "react";

/**
 * An item of one's gear asked for from the bell (TASK-486 part G,
 * ADR-0393): «… reached the limit you set.» touched opens the item, to
 * retire it or change its limit. `ProfileLayer` shows it over the app, as
 * the page of a group run (groupRunDoor), and takes it down when the app
 * goes elsewhere.
 */

/** One request: a new object each time. */
export type AskedGear = { readonly id: string };

let asked: AskedGear | null = null;
const listeners = new Set<() => void>();

function tell(): void {
  listeners.forEach((listener) => listener());
}

/** Asks the app to open the item `id` of one's gear. */
export function openGearItem(id: string): void {
  asked = { id };
  tell();
}

/** The item goes: closed, saved, or the app going elsewhere. */
export function closeGearItem(): void {
  if (asked !== null) {
    asked = null;
    tell();
  }
}

export function askedGear(): AskedGear | null {
  return asked;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The item asked for, and a new render when it changes. */
export function useAskedGear(): AskedGear | null {
  return useSyncExternalStore(subscribe, askedGear);
}
