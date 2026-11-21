import type { GymPlan } from "@shaperoute/shared-types";

import type { RouteProgress } from "../screens/RunPanel";
import type { Sport } from "../settings/sport";
import { todayPlans, useKeptPlans } from "./plans";

/**
 * How much is left of the plan's day while it is recorded freely (TASK-461
 * B2c, ADR-0371; the user's approved words: «Registra libero e vedi quanto
 * manca ai 45 km», «Mancano 12,4 km», «Mancano 230 m di salita»). Today's
 * day of the sport being recorded, from the plans kept on the phone: its
 * distance (a run's too) or a hike's climb, as a route's what is left. None
 * without such a day, or once it is reached.
 */

/** The metres the day asks of `sport`, and whether they are of climb. */
export function dayGoal(
  plans: GymPlan[],
  sport: Sport,
  date: Date = new Date(),
): { metres: number; climb: boolean } | null {
  for (const today of todayPlans(plans, date)) {
    const outing = today.outing;
    if (outing !== undefined && outing.sport === sport) {
      if (outing.kind === "climb" && outing.climb_m !== undefined) {
        return { metres: outing.climb_m, climb: true };
      }
      if (outing.kind !== "intervals" && outing.distance_m !== undefined) {
        return { metres: outing.distance_m, climb: false };
      }
    }
    const run = today.run;
    if (
      sport === "run" &&
      run !== undefined &&
      run.kind !== "intervals" &&
      run.distance_m !== undefined
    ) {
      return { metres: run.distance_m, climb: false };
    }
  }
  return null;
}

/** What is left of the day's goal after `doneM` (metres run, or climbed);
 * null once it is reached. */
export function goalProgress(
  goal: { metres: number; climb: boolean } | null,
  doneM: number,
): RouteProgress | null {
  if (goal === null || doneM >= goal.metres) {
    return null;
  }
  return {
    remainingM: goal.metres - doneM,
    done: Math.max(0, doneM) / goal.metres,
    ...(goal.climb ? { climb: true } : {}),
  };
}

/** While recording freely: what is left of today's day of `sport`. */
export function usePlanToGo(
  sport: Sport,
  distanceM: number,
  climbedM: number | null,
): RouteProgress | null {
  const plans = useKeptPlans();
  const goal = dayGoal(plans, sport);
  return goalProgress(goal, goal?.climb === true ? (climbedM ?? 0) : distanceM);
}
