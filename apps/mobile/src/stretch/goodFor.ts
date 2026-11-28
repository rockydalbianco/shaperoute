import { CATEGORIES } from "./categories";

/**
 * What an exercise is good for (TASK-520 part E, ADR-0415): the categories
 * that have it, in the catalog's order — the body's areas first, then the
 * moments, the sports, intimacy and the rest. The exercise's page lists
 * them by name.
 */
export function goodFor(exercise: string): string[] {
  return CATEGORIES.filter((category) => category.exercises.includes(exercise)).map(
    (category) => category.key,
  );
}
