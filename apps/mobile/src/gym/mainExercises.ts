import type { GymSet } from "@shaperoute/shared-types";

import type { Language } from "../i18n/languages";
import { rowsOf } from "./ExerciseList";

/** How many exercises the tile names. */
export const MAIN_EXERCISES = 3;

/**
 * The main exercises of a workout, as its tile names them (TASK-385 part
 * D, the user's «esercizi principali»): those with the most sets, at most
 * MAIN_EXERCISES; with as many sets, the one done first. Decided by the
 * agent on the user's behalf.
 */
export function mainExercises(sets: readonly GymSet[], language: Language): string[] {
  return rowsOf(sets, language)
    .map((row, first) => ({ row, first }))
    .sort((a, b) => b.row.sets.length - a.row.sets.length || a.first - b.first)
    .slice(0, MAIN_EXERCISES)
    .map(({ row }) => row.name);
}
