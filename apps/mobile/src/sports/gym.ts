import { DRAWING_PHOTO_PLACES } from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import type { SportProfile } from "./base";

/**
 * A workout at the gym, saved without a track (TASK-385, ADR-0327): no
 * route, no distance, no network. Apple Health and Health Connect take it
 * as strength training, with no distance of its own.
 */
export const GYM: SportProfile = {
  activity: "gym",
  name: tLater("Gym"),
  emoji: "🏋️",
  // `.traditionalStrengthTraining`.
  appleWorkout: 50,
  // EXERCISE_TYPE_STRENGTH_TRAINING.
  healthConnect: 70,
  // Never a run without a route: a workout has its own screen (part B).
  freeRunAs: undefined,
};

/**
 * The photos of a post of a workout: 10, every place the API keeps, with
 * the tile among them (TASK-385 part D, the user's «10 foto»): one page
 * more than a run's, whose limit is DRAWING_MAX_PHOTOS.
 */
export const GYM_MAX_PHOTOS = DRAWING_PHOTO_PLACES;
