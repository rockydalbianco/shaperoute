import { DISTANCE_LIMITS_M, WHEELCHAIR_BEST_DISTANCES } from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import type { SportProfile } from "./base";

/**
 * A wheelchair or a stroller (TASK-414, ADR-0343): a circle, a heart, a star
 * or a moon of 1–5 km on the ways of its own network that are pushed on
 * wheels, which only the server draws on. «Settings» has its row since part
 * B, «Soon» until the server has part A and its migration 0071, and the
 * user says yes.
 */
export const WHEELCHAIR: SportProfile = {
  activity: "wheelchair",
  name: tLater("Wheelchair & stroller"),
  emoji: "♿",
  // A circle, a heart, a star or a moon only (the user's choice 5): no
  // word, no image, no other shape, no drawing by hand. The engine refuses
  // the rest.
  noWords: true,
  noImages: true,
  shapes: ["circle", "heart", "star", "moon"],
  // At a walker's pace, 12:00 a km before there is any: whoever pushes goes
  // about as fast as a walk (decided by the agent on the user's behalf).
  timeAt: "walker",
  // Bests of its own over 1 and 5 km (the user's choice 7), «1 km», «5 km».
  bests: { distances: WHEELCHAIR_BEST_DISTANCES, named: "km" },
  drawKm: [
    DISTANCE_LIMITS_M.wheelchair[0] / 1000,
    DISTANCE_LIMITS_M.wheelchair[1] / 1000,
  ],
  // `.wheelchairWalkPace`, for a stroller too (the user's choice 8); Apple
  // Health counts no distance of it a day.
  appleWorkout: 70,
  // EXERCISE_TYPE_WHEELCHAIR.
  healthConnect: 82,
  // A walk's, ACSM walking (TASK-424 part C2): pushing a stroller is a walk,
  // and one sport counts both ways of pushing alike (the user's choice 1).
  energy: { kind: "oxygen", mlKgPerM: 0.1, mlKgPerMUp: 1.8 },
  freeRunAs: "wheelchair",
  // The map can miss kerbs, steps and slopes (the user's choice 6).
  caution: tLater(
    "Map data can miss kerbs, steps and steep slopes: check the route before you set off.",
  ),
};
