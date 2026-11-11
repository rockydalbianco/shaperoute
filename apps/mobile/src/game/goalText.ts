import type { GameGoal, GameMe } from "@shaperoute/shared-types";

import { decimal, t } from "../i18n";
import { inUnits, paceLabel } from "../units/format";
import { appUnits, type Units } from "../units/units";

/**
 * What a shape of the game asks, and how far along the account is, in
 * words (TASK-296, docs/GIOCO.md §5.2), in the app's units (TASK-182):
 * the API speaks in metres and seconds a kilometre.
 */

/** "5 km", "3.1 mi", "21.1 km": a goal's distance, whole when it is. */
export function goalDistanceLabel(metres: number, units: Units = appUnits()): string {
  const value = inUnits(metres, units);
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? String(rounded) : decimal(rounded)} ${units}`;
}

/**
 * The distance of one run as a runner says it (TASK-423, after use): "400 m",
 * "1 mile", "Half marathon", "Marathon"; any other as `goalDistanceLabel`.
 * Only for what one run asks: the totals stay in kilometres or miles.
 */
export function runDistanceLabel(metres: number, units: Units = appUnits()): string {
  switch (metres) {
    case 400:
      return "400 m";
    case 1609:
      return units === "mi" ? "1 mi" : t("1 mile");
    case 21097:
      return t("Half marathon");
    case 42195:
      return t("Marathon");
    default:
      return goalDistanceLabel(metres, units);
  }
}

/** "5:00 /km", "8:03 /mi": a pace of so many seconds a kilometre. */
export function goalPaceLabel(paceS: number, units: Units = appUnits()): string {
  return paceLabel(1000, paceS * 1000, units) ?? "";
}

/** "5 km in total", "400 m under 4:00 /km", "One half marathon": what the
 * shape asks. A milestone (TASK-423) is a pace any run meets, over one run:
 * its pace is not said. */
export function goalText(goal: GameGoal, units: Units = appUnits()): string {
  if (goal.kind === "distance") {
    return t("{distance} in total", {
      distance: goalDistanceLabel(goal.total_m, units),
    });
  }
  if (goal.single_run === true) {
    if (goal.distance_m === 21097) {
      return t("One half marathon");
    }
    if (goal.distance_m === 42195) {
      return t("One marathon");
    }
    return t("One run of {distance}", {
      distance: runDistanceLabel(goal.distance_m, units),
    });
  }
  return t("{distance} under {pace}", {
    distance: runDistanceLabel(goal.distance_m, units),
    pace: goalPaceLabel(goal.pace_s, units),
  });
}

/**
 * How far along a shape not unlocked yet is, in words: "14.2 / 20 km" for
 * a distance; for a pace, the best time against the target once the
 * distance was run in one go, else the longest run so far; for a milestone,
 * the longest run so far.
 */
export function progressText(
  goal: GameGoal,
  me: GameMe,
  units: Units = appUnits(),
): string {
  if (goal.kind === "distance") {
    return `${decimal(inUnits(me.counted_m, units))} / ${goalDistanceLabel(goal.total_m, units)}`;
  }
  const bestS = me.best_s[String(goal.distance_m)];
  if (goal.single_run !== true && bestS !== undefined && bestS > 0) {
    return t("Best {best} · target {target}", {
      best: paceLabel(goal.distance_m, bestS * 1000, units) ?? "",
      target: goalPaceLabel(goal.pace_s, units),
    });
  }
  return t("Longest run {distance}", {
    distance: `${decimal(inUnits(me.longest_m, units))} ${units}`,
  });
}

/** "71%": the share of the way, as the API counts it. */
export function percentText(progress: number): string {
  return `${Math.round(progress * 100)}%`;
}
