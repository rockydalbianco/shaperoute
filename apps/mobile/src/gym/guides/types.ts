/**
 * How to do an exercise (TASK-411 part E): three steps and a warning, the
 * same in each language.
 */
export type Guide = readonly [string, string, string, string];

/** The guide of each exercise of the catalog, by its key. */
export type Guides = Readonly<Record<string, Guide>>;
