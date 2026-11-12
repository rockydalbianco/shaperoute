import { DISTANCE_LIMITS_M } from "@shaperoute/shared-types";

import type { SportProfile } from "./base";

/**
 * A wheelchair or a stroller (TASK-414, ADR-0343): a circle, a heart, a star
 * or a moon of 1–5 km on the ways of its own network that are pushed on
 * wheels, which only the server draws on. Not offered yet: «Settings» has
 * no row for it and the search leaves it out until part B, which also gives
 * its name and its caution their texts (`tLater`) in the four languages,
 * the four shapes in «Draw», its bests and the distance Apple Health
 * counts.
 */
export const WHEELCHAIR: SportProfile = {
  activity: "wheelchair",
  name: "Wheelchair & stroller",
  emoji: "♿",
  // A circle, a heart, a star or a moon only: the engine refuses the rest.
  noWords: true,
  noImages: true,
  drawKm: [
    DISTANCE_LIMITS_M.wheelchair[0] / 1000,
    DISTANCE_LIMITS_M.wheelchair[1] / 1000,
  ],
  // `.wheelchairWalkPace`, for a stroller too (the user's choice 8).
  appleWorkout: 70,
  // EXERCISE_TYPE_WHEELCHAIR.
  healthConnect: 82,
  // A walk's for now, ACSM walking (TASK-424 part C2, an energy for every
  // activity): pushing a stroller is a walk; part B checks a wheelchair's
  // against the Compendium's wheelchair activities.
  energy: { kind: "oxygen", mlKgPerM: 0.1, mlKgPerMUp: 1.8 },
  freeRunAs: "wheelchair",
};
