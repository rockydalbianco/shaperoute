import { tLater } from "../i18n";
import type { SportProfile } from "./base";

/**
 * A day of mountaineering, on rock, snow and ice, recorded without a shape
 * (TASK-463, ADR-0373), as a day of ski touring: there is no shape to draw
 * up a mountain. «Settings» has its row since part B, «Soon» until the
 * server has part A and the user says yes. Before the first one, once, the
 * notice «Before you climb» (mountain/climbNotice.ts). Its energy is a
 * hike's, as ski touring's: the ACSM walking equation, its metres climbed
 * above all.
 */
export const ALPINISM: SportProfile = {
  activity: "alpinism",
  name: tLater("Mountaineering"),
  emoji: "🧗",
  // `.climbing`.
  appleWorkout: 9,
  // EXERCISE_TYPE_ROCK_CLIMBING: Health Connect has no mountaineering.
  healthConnect: 51,
  // A hike's numbers on the run's card: distance, time and the climb.
  freeRunAs: "hiking",
  energy: { kind: "oxygen", mlKgPerM: 0.1, mlKgPerMUp: 1.8 },
};
