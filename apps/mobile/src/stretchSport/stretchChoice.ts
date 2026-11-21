import { useSyncExternalStore } from "react";

import type { RoutineKey } from "../stretch/routines";

/**
 * The routine chosen on «Draw» for the sport «Stretching» (TASK-475 part
 * B): the card ticked there, read by «Start stretching». Kept while the
 * app is open; it starts on «Morning».
 */

export const FIRST_ROUTINE: RoutineKey = "morning";

let chosen: RoutineKey = FIRST_ROUTINE;
const listeners = new Set<() => void>();

export function chosenRoutine(): RoutineKey {
  return chosen;
}

export function chooseRoutine(routine: RoutineKey): void {
  chosen = routine;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The routine chosen, following each new choice. */
export function useChosenRoutine(): RoutineKey {
  return useSyncExternalStore(subscribe, chosenRoutine, chosenRoutine);
}
