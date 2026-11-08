import { type RunActivity, TRACKLESS_ACTIVITIES } from "@shaperoute/shared-types";

/**
 * What the page of a post shows of an activity of each sport (TASK-410,
 * ADR-0340). `rate`: how fast it went, as a pace ("5:25 /km", per 500 m on
 * the water, per 100 m swimming: `sportPaceLabel`) or as a speed
 * ("18.4 km/h"); none for what has no distance. `distance`: whether it has
 * one to show.
 */
export type PostMetrics = {
  distance: boolean;
  rate: "pace" | "speed" | null;
};

/** On wheels and on the snow a speed says more than a pace. */
const BY_SPEED: ReadonlySet<RunActivity> = new Set([
  "cycling",
  "gravel_biking",
  "mountain_biking",
  "inline_skating",
  "skiing",
  "xc_skiing",
]);

/** The rows of the summary of an activity of `activity`; a run's when none. */
export function postMetrics(activity: RunActivity | undefined): PostMetrics {
  // A workout at the gym has its time and its energy, no way nor pace.
  if (
    activity !== undefined &&
    (TRACKLESS_ACTIVITIES as readonly string[]).includes(activity)
  ) {
    return { distance: false, rate: null };
  }
  return {
    distance: true,
    rate: activity !== undefined && BY_SPEED.has(activity) ? "speed" : "pace",
  };
}
