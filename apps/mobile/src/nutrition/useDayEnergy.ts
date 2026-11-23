import { useEffect, useMemo } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { useBody } from "../body/useBody";
import { type DayEnergy, dayEnergy, type HubState, listCovers } from "./activityEnergy";
import type { LocalDay } from "./localDay";
import { useNutrition } from "./useNutrition";

/**
 * The energy of `day` at `now` (TASK-489 part C1, ADR-0397): the rest of
 * the body in «Settings», the activities of the private list that began
 * that day, and the numbers the user wrote over either.
 *
 * The list comes a page at a time, the latest first: for a day older than
 * the pages held, the next ones are asked for until the day is covered,
 * and nothing is said of the day meanwhile. A page that does not come is
 * not asked again by itself.
 */
export function useDayEnergy(day: LocalDay, now: Date): DayEnergy {
  const door = useActivitiesDoor();
  const body = useBody();
  const { edits } = useNutrition().settings;
  const { status, list, more, loadingMore, problem, loadMore } = door;

  const covered = status === "ready" && listCovers(list, more, day);
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
  return useMemo(
    () => dayEnergy({ day, now: new Date(at), hub, list, body, edits }),
    [day, at, hub, list, body, edits],
  );
}
