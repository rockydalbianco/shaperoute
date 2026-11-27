import { useSyncExternalStore } from "react";

import type { LocalDay } from "../nutrition/localDay";
import { appBody, saveBody } from "./bodyProfile";
import { type Cheer, withCheered } from "./weightGoal";
import {
  appWeighIns,
  type EveryWeeks,
  latestOf,
  saveWeighIns,
  subscribeWeighIns,
  type WeighIns,
  withoutWeighIn,
  withWeighIn,
} from "./weighIns";

/** The weigh-ins of the account signed in, and a new render at each change
 * (TASK-489 part K1). */
export function useWeighIns(): WeighIns {
  return useSyncExternalStore(subscribeWeighIns, appWeighIns);
}

/**
 * Keeps `kg` as the weigh-in of `day`. If it is now the latest, it becomes
 * the body's weight too (the user's choice of 2026-11-27, «Sì, così»): the
 * rest and the activities count with it from now on, and nothing already
 * saved changes.
 */
export function writeWeighIn(day: LocalDay, kg: number): void {
  const next = withWeighIn(appWeighIns(), day, kg);
  saveWeighIns(next);
  const latest = latestOf(next);
  if (latest !== null && latest.day === day) {
    saveBody({ ...appBody(), weightKg: latest.kg });
  }
}

/** Takes away the weigh-in of `day`. The body's weight stays as it is: a
 * weigh-in taken away is not a new weight. */
export function removeWeighIn(day: LocalDay): void {
  saveWeighIns(withoutWeighIn(appWeighIns(), day));
}

/** «Not now» on the card: it comes back in a few days (weighIns.ts). */
export function weighInNotNow(today: LocalDay): void {
  saveWeighIns({ ...appWeighIns(), notNow: today });
}

export function writeEvery(every: EveryWeeks): void {
  saveWeighIns({ ...appWeighIns(), every });
}

/** A congratulation seen: it does not show again. */
export function cheerSeen(cheer: Cheer): void {
  saveWeighIns(withCheered(appWeighIns(), cheer));
}

/** Any other change of the weigh-ins: the goal and the milestones. */
export function writeWeighIns(change: (weighIns: WeighIns) => WeighIns): void {
  saveWeighIns(change(appWeighIns()));
}
