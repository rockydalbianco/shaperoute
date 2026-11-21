import { tLater } from "../i18n";
import type { SportProfile } from "./base";

/**
 * A stretching session, saved without a track (TASK-475, ADR-0386), as a
 * workout at the gym: no route, no distance, no network. The routines are
 * TASK-466's (src/stretch); «Settings» and the sport panel have it since
 * part B, «Soon» until the user says yes. Apple Health and Health Connect
 * take it as flexibility, with no distance of its own; its energy a light
 * stretch's, 2.3 MET (Compendium of Physical Activities, 02101).
 */
export const STRETCHING: SportProfile = {
  activity: "stretching",
  name: tLater("Stretching"),
  emoji: "🧘",
  // `.flexibility`.
  appleWorkout: 62,
  // EXERCISE_TYPE_STRETCHING.
  healthConnect: 71,
  // Never a run without a route: a session has its own screen (part B).
  freeRunAs: undefined,
  energy: { kind: "met", bands: [{ belowKmh: Infinity, met: 2.3 }] },
};
