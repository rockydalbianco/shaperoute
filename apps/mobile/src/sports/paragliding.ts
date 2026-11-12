import { tLater } from "../i18n";
import type { SportProfile } from "./base";

/**
 * A paragliding flight, recorded without a shape (TASK-305 parts R,
 * ADR-0375), as a day of alpine skiing; on since part R2, with the
 * numbers of the flight (src/air). Its energy: the MET of hang gliding, the
 * nearest the Compendium has (3.5), on the time in the air.
 */
export const PARAGLIDING: SportProfile = {
  activity: "paragliding",
  name: tLater("Paragliding"),
  emoji: "🪂",
  // `.other`: Apple Health has no type for it.
  appleWorkout: 3000,
  // EXERCISE_TYPE_PARAGLIDING.
  healthConnect: 47,
  // Under the numbers of the air (src/air/FlightLive.tsx), a ride's speeds
  // in km/h.
  freeRunAs: "cycling",
  energy: { kind: "met", bands: [{ belowKmh: Infinity, met: 3.5 }] },
};
