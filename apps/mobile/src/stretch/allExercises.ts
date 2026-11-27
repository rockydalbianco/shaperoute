import { type Exercise, EXERCISES, MORE_EXERCISES } from "./exercises";
import { NEW_EXERCISES } from "./exercisesMore";

/**
 * Every stretching exercise the app knows, in one list (TASK-520,
 * ADR-0415): the five after a run, the ten of the routines, and the ones
 * the new categories add as they arrive. A routine someone saved or
 * published names its exercises by `key` (TASK-466 part E), so a key is
 * never changed or given to another exercise: `allExercises.test.ts` keeps
 * the ones in use.
 */
export const ALL_EXERCISES: readonly Exercise[] = [
  ...EXERCISES,
  ...MORE_EXERCISES,
  ...NEW_EXERCISES,
];

const BY_KEY: ReadonlyMap<string, Exercise> = new Map(
  ALL_EXERCISES.map((exercise) => [exercise.key, exercise]),
);

/** The exercise with this key; none, when this version does not know it. */
export function exerciseByKey(key: string): Exercise | undefined {
  return BY_KEY.get(key);
}

/** Whether the exercise is a movement, done again and again for its time. */
export function isMove(exercise: Exercise): boolean {
  return exercise.kind === "move";
}
