import { DISTANCE_LIMITS_M } from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import type { SportProfile } from "./base";

/**
 * Snowshoeing (TASK-413, ADR-0342): a small shape of the catalogue, 0.5–3 km,
 * placed freely on open snow by the server, as a paddling route on the water
 * (snow/snow.ts isPlacedFree). Since part B its name and its caution have
 * their texts, the ones the user approved (choice 4, 2026-11-08), and «Start»
 * goes through the avalanche notice (snow/SnowNotice.tsx). No time under the
 * distance: a walker's pace on the snow would promise too little time. Its
 * energy is a hike's, as ski touring's (TASK-424 part C2, calories for every
 * activity): the ACSM walking equation, its metres and its metres climbed.
 */
export const SNOWSHOEING: SportProfile = {
  activity: "snowshoeing",
  name: tLater("Snowshoes"),
  // No emoji of snowshoes exists (the user's choice 1).
  emoji: "❄️",
  // A shape of the catalogue only: the engine places it where the snow has
  // room, as on the water.
  noWords: true,
  noImages: true,
  drawKm: [
    DISTANCE_LIMITS_M.snowshoeing[0] / 1000,
    DISTANCE_LIMITS_M.snowshoeing[1] / 1000,
  ],
  drawMi: [0.5, 1.5],
  step: 0.5,
  startKm: 1,
  // `.hiking`: Apple Health has no type for snowshoes (HKWorkoutActivityType
  // has snow sports for skis and boards only).
  appleWorkout: 24,
  // On foot, as a hike.
  appleDistance: "HKQuantityTypeIdentifierDistanceWalkingRunning",
  // EXERCISE_TYPE_SNOWSHOEING.
  healthConnect: 63,
  energy: { kind: "oxygen", mlKgPerM: 0.1, mlKgPerMUp: 1.8 },
  freeRunAs: "snowshoeing",
  // Off the paths, on snow that can slide (the user's choice 4).
  caution: tLater("Off-trail on snow: check the avalanche bulletin first."),
};
