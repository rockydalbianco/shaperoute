import { useSyncExternalStore } from "react";

/**
 * Whether pocket mode is on, for what lies outside the run's card: the map
 * under the black screen stops blinking the route ahead (TASK-224), which
 * no one sees. `usePocketMode` says it; there is one pocket mode at a time.
 */
let on = false;
const listeners = new Set<() => void>();

export function setPocketOn(next: boolean): void {
  if (on === next) {
    return;
  }
  on = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isOn(): boolean {
  return on;
}

export function usePocketOn(): boolean {
  return useSyncExternalStore(subscribe, isOn, isOn);
}
