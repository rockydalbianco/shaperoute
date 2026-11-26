import Constants from "expo-constants";
import { useEffect, useMemo } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { useBody } from "../body/useBody";
import { type DayEnergy, dayEnergy, type HubState, listCovers } from "./activityEnergy";
import type { LocalDay } from "./localDay";
import { useHealthEnergy } from "./useHealthEnergy";
import { useNutrition } from "./useNutrition";

/**
 * The energy of each of `days` at `now`, in their order (TASK-489 parts C1
 * and D, ADR-0397): the rest of the body in «Settings», the activities of
 * the private list that began that day, and the numbers the user wrote over
 * either.
 *
 * With the user's yes, what Apple Health has for each day is read too
 * (part C2, useHealthEnergy.ts): its active energy counts alone on the days
 * that have it, and the workouts of other apps count on the days that do
 * not. A day still being read says nothing yet.
 *
 * The list comes a page at a time, the latest first: for days older than
 * the pages held, the next ones are asked for until the earliest day is
 * covered, and nothing is said of the days meanwhile. A page that does not
 * come is not asked again by itself.
 */
export function useDaysEnergy(days: readonly LocalDay[], now: Date): DayEnergy[] {
  const door = useActivitiesDoor();
  const body = useBody();
  const { edits } = useNutrition().settings;
  const health = useHealthEnergy(days);
  const { status, list, more, loadingMore, problem, loadMore } = door;

  // Days are «YYYY-MM-DD»: the earliest is the first in the alphabet.
  const key = days.join(",");
  const earliest = days.reduce<LocalDay | null>(
    (first, day) => (first === null || day < first ? day : first),
    null,
  );
  const covered =
    status === "ready" && (earliest === null || listCovers(list, more, earliest));
  const missing = status === "ready" && !covered;
  useEffect(() => {
    if (missing && !loadingMore && problem === null) {
      loadMore();
    }
  }, [missing, loadingMore, problem, loadMore]);

  const hub: HubState =
    status === "off"
      ? "off"
      : status === "failed" || (missing && problem !== null)
        ? "failed"
        : covered
          ? "ready"
          : "loading";
  const at = now.getTime();
  const { state, days: read } = health;
  return useMemo(
    () =>
      (key === "" ? [] : key.split(",")).map((day) =>
        dayEnergy({
          day,
          now: new Date(at),
          hub,
          list,
          body,
          edits,
          health: state,
          healthDay: read[day] ?? null,
          ownBundleId: Constants.expoConfig?.ios?.bundleIdentifier ?? null,
        }),
      ),
    [key, at, hub, list, body, edits, state, read],
  );
}

/** The energy of one day: what «Diary» shows on top (part C1). */
export function useDayEnergy(day: LocalDay, now: Date): DayEnergy {
  return useDaysEnergy([day], now)[0];
}
