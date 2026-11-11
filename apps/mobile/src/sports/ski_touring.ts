import { tLater } from "../i18n";
import type { SportProfile } from "./base";

/**
 * A day of ski touring, up on skins and down on skis, recorded without a
 * shape (TASK-415, ADR-0344), as alpine skiing. Offered since part B, with
 * its phases and its VAM (`activities/mountainPhases.ts`): its own end of
 * the tour and its numbers over the run's. Its energy is
 * a hike's (TASK-424 part C2: the user's choice of 2026-11-10, calories for
 * every activity, takes the place of choice 2, «no calories on the snow»):
 * the ACSM walking equation, its metres and above all its metres climbed.
 */
export const SKI_TOURING: SportProfile = {
  activity: "ski_touring",
  name: tLater("Ski touring"),
  emoji: "🏔️",
  // `.crossCountrySkiing`: Apple Health has no type of its own for it.
  appleWorkout: 60,
  // EXERCISE_TYPE_SKIING: nor has Health Connect.
  healthConnect: 61,
  // A runner's pace on the run's card: the tour's own numbers are over it.
  freeRunAs: undefined,
  energy: { kind: "oxygen", mlKgPerM: 0.1, mlKgPerMUp: 1.8 },
};
