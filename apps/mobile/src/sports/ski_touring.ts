import type { SportProfile } from "./base";

/**
 * A day of ski touring, up on skins and down on skis, recorded without a
 * shape (TASK-415, ADR-0344), as alpine skiing. Not offered yet: «Settings»
 * has no row for it until part B, which also gives its name its texts
 * (`tLater`) in the four languages, its phases and its VAM. No calories on
 * the snow (the user's choice 2).
 */
export const SKI_TOURING: SportProfile = {
  activity: "ski_touring",
  name: "Ski touring",
  emoji: "🏔️",
  // `.crossCountrySkiing`: Apple Health has no type of its own for it.
  appleWorkout: 60,
  // EXERCISE_TYPE_SKIING: nor has Health Connect.
  healthConnect: 61,
  // No numbers of its own until part B: a runner's pace.
  freeRunAs: undefined,
};
