import type { GymLevel } from "@shaperoute/shared-types";

import { weightLabel } from "../body/bodyUnits";
import { clockLabel } from "../navigation/freeRun";
import { distanceLabel } from "../units/format";
import type { Units } from "../units/units";

/** The best set of a level as a set is read on the post (ExerciseList's
 * setLabel): «100 kg», «×30», «2:00», «10.0 km». A dumbbell's kg is per
 * hand, as it was typed. */
export function levelValue(
  level: Pick<GymLevel, "value" | "measure">,
  units: Units,
): string {
  switch (level.measure) {
    case "load_kg":
      return weightLabel(level.value, units);
    case "reps":
      return `×${Math.round(level.value)}`;
    case "duration_s":
      return clockLabel(level.value * 1000);
    case "distance_m":
      return distanceLabel(level.value, units);
  }
}
