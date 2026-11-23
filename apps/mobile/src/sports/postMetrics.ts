import {
  RECORD_ACTIVITIES,
  type RunActivity,
  TRACKLESS_ACTIVITIES,
} from "@shaperoute/shared-types";

/**
 * What the page of a post shows of an activity of each sport (TASK-410,
 * ADR-0340). `rate`: how fast it went, as a pace ("5:25 /km", per 500 m on
 * the water, per 100 m swimming: `sportPaceLabel`) or as a speed
 * ("18.4 km/h"); none for what has no distance. `distance`: whether it has
 * one to show. With the figures of part C (`stats`): `splits`, the table of
 * the kilometres; `elevation`, the profile and the climb; `cadence`, the
 * steps a minute.
 */
export type PostMetrics = {
  distance: boolean;
  rate: "pace" | "speed" | null;
  splits: boolean;
  elevation: boolean;
  cadence: boolean;
};

/** On the water: a pace per 500 m or 100 m, no kilometres, no climb. */
const ON_WATER: ReadonlySet<RunActivity> = new Set(["paddling", "swimming"]);

/** On foot: every row and every section. */
const ON_FOOT: ReadonlySet<RunActivity> = new Set(["running", "walking", "hiking"]);

/** On wheels, on the snow and in the air a speed says more than a pace. */
const BY_SPEED: ReadonlySet<RunActivity> = new Set([
  "cycling",
  "gravel_biking",
  "mountain_biking",
  "inline_skating",
  "skiing",
  "xc_skiing",
  "paragliding",
]);

/** The rows of the summary of an activity of `activity`; a run's when none. */
export function postMetrics(activity: RunActivity | undefined): PostMetrics {
  // A workout at the gym has its time and its energy, no way nor pace.
  if (
    activity !== undefined &&
    (TRACKLESS_ACTIVITIES as readonly string[]).includes(activity)
  ) {
    return {
      distance: false,
      rate: null,
      splits: false,
      elevation: false,
      cadence: false,
    };
  }
  const water = activity !== undefined && ON_WATER.has(activity);
  // On the snow the kilometres say nothing: lifts and descents.
  const snow =
    activity !== undefined &&
    (RECORD_ACTIVITIES as readonly string[]).includes(activity);
  return {
    distance: true,
    rate: activity !== undefined && BY_SPEED.has(activity) ? "speed" : "pace",
    splits: !water && !snow,
    elevation: !water,
    // A run's when none.
    cadence: activity === undefined || ON_FOOT.has(activity),
  };
}
