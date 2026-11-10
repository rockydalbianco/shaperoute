import type { GameMe, GameShape } from "@shaperoute/shared-types";

import { decimal, t } from "../i18n";
import { inUnits } from "../units/format";
import { appUnits, type Units } from "../units/units";
import { goalDistanceLabel, goalPaceLabel, runDistanceLabel } from "./goalText";

/**
 * How far along a locked shape is, on its card (TASK-423, after the user
 * tried «Play»): the bar and the line under it, from the account's totals
 * and best times that GET /game/me already gives.
 *
 * - A shape of the total kilometres: the share of the way, "14.2 / 20 km".
 * - A milestone: the longest run against the distance.
 * - A pace never run that far in one go: no bar, "First run 15 km in one
 *   go · longest 12 km". A share of the distance would put every pace of 15
 *   km at the same 80 %.
 * - A pace run that far: how far along between the level before it on the
 *   same distance and this one, "Best 5:00 /km · 1:00 /km to go". Empty
 *   until the level before is beaten: 5:00 /km is not 60 % of 3:00 /km.
 */
export type ShapeProgress = {
  /** 0 to 0.99; null: no bar, only the line. */
  share: number | null;
  line: string;
};

/** The most a bar shows before the shape is unlocked. */
export const MAX_SHARE = 0.99;
/** The level before the easiest pace of a distance: a minute a km slower. */
export const FIRST_STEP_S = 60;

function clampShare(value: number): number {
  return Math.round(Math.min(MAX_SHARE, Math.max(0, value)) * 100) / 100;
}

/** The pace of the level just easier than `paceS` on the same distance, in
 * seconds a kilometre: the closest slower target, or a minute more for the
 * first level. Milestones are not levels. */
export function levelBefore(
  shapes: readonly GameShape[],
  distanceM: number,
  paceS: number,
): number {
  const slower = shapes
    .map((shape) => shape.goal)
    .filter(
      (goal) =>
        goal.kind === "pace" &&
        goal.single_run !== true &&
        goal.distance_m === distanceM &&
        goal.pace_s > paceS,
    )
    .map((goal) => goal.pace_s ?? 0);
  return slower.length > 0 ? Math.min(...slower) : paceS + FIRST_STEP_S;
}

/** "12 km", "15.4 km": the longest run, whole when it is. */
function longestText(me: GameMe, units: Units): string {
  return goalDistanceLabel(me.longest_m, units);
}

export function shapeProgress(
  shape: GameShape,
  shapes: readonly GameShape[],
  me: GameMe,
  units: Units = appUnits(),
): ShapeProgress {
  const goal = shape.goal;
  if (goal.kind === "distance") {
    return {
      share: clampShare(me.counted_m / goal.total_m),
      line: `${decimal(inUnits(me.counted_m, units))} / ${goalDistanceLabel(goal.total_m, units)}`,
    };
  }
  if (goal.single_run === true) {
    return {
      share: clampShare(me.longest_m / goal.distance_m),
      line: t("Longest run {distance}", { distance: longestText(me, units) }),
    };
  }
  const distance = runDistanceLabel(goal.distance_m, units);
  const bestS = me.best_s[String(goal.distance_m)];
  if (bestS === undefined || bestS <= 0) {
    return {
      share: null,
      line:
        me.longest_m < goal.distance_m
          ? t("First run {distance} in one go · longest {longest}", {
              distance,
              longest: longestText(me, units),
            })
          : t("No time over {distance} yet", { distance }),
    };
  }
  const bestPace = (bestS * 1000) / goal.distance_m;
  const before = levelBefore(shapes, goal.distance_m, goal.pace_s);
  return {
    share: clampShare((before - bestPace) / (before - goal.pace_s)),
    line: t("Best {best} · {gap} to go", {
      best: goalPaceLabel(bestPace, units),
      gap: goalPaceLabel(Math.max(0, bestPace - goal.pace_s), units),
    }),
  };
}
