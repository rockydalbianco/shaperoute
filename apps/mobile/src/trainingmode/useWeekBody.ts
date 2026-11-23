import type { GymCalendar, GymSet } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { fetchGymSession } from "../api/gym";
import { fetchGymCalendar, phoneTimeZone } from "../api/gymCalendar";
import { loadGymOutbox } from "../gym/gymOutbox";
import { useFollowsDoor } from "../social/followsDoor";
import {
  inWeek,
  monthsOfWeek,
  type MuscleSets,
  setsByMuscle,
  weekWorkouts,
} from "./weekBody";

/** The sets of each workout asked while the app runs: a workout saved does
 * not change its sets. */
const known = new Map<string, readonly GymSet[]>();

/** For the tests: what was asked is forgotten. */
export function forgetWeekWorkouts(): void {
  known.clear();
}

async function setsOf(
  apiUrl: string,
  token: string,
  key: string,
  fetchFn?: typeof fetch,
): Promise<readonly GymSet[]> {
  const kept = known.get(key);
  if (kept !== undefined) {
    return kept;
  }
  const outcome = await fetchGymSession(apiUrl, token, key, { fetchFn });
  if (outcome.kind !== "ok") {
    return [];
  }
  known.set(key, outcome.value.sets);
  return outcome.value.sets;
}

/**
 * The sets of each muscle since Monday (TASK-490 part B): the workouts of
 * the week from the gym calendar, their sets from the API, and the workouts
 * still waiting on the phone. Null without an account, and until the
 * calendar has answered; asked again when the account's activities change.
 */
export function useWeekBody(fetchFn?: typeof fetch): MuscleSets | null {
  const { apiUrl, account } = useFollowsDoor();
  const { owner, total } = useActivitiesDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [count, setCount] = useState<MuscleSets | null>(null);

  const signedIn = apiUrl !== null && token !== null && owner != null;

  useEffect(() => {
    if (apiUrl === null || token === null || owner == null) {
      return;
    }
    let live = true;
    void (async () => {
      const now = new Date();
      const outcomes = await Promise.all(
        monthsOfWeek(now).map((month) =>
          fetchGymCalendar(apiUrl, token, phoneTimeZone(), month, { fetchFn }),
        ),
      );
      const calendars: GymCalendar[] = outcomes.flatMap((outcome) =>
        outcome.kind === "ok" ? [outcome.value] : [],
      );
      if (calendars.length === 0) {
        return;
      }
      const keys = weekWorkouts(calendars, now);
      const sent = await Promise.all(
        keys.map((key) => setsOf(apiUrl, token, key, fetchFn)),
      );
      const waiting = loadGymOutbox()
        .filter(
          (item) =>
            item.owner === owner &&
            item.refused === undefined &&
            !keys.includes(item.key) &&
            inWeek(item.request.started_at, now),
        )
        .map((item) => item.request.sets ?? []);
      if (live) {
        setCount(setsByMuscle([...sent, ...waiting].flat()));
      }
    })();
    return () => {
      live = false;
    };
  }, [apiUrl, token, owner, total, fetchFn]);

  // Signed out: nothing, whatever an account before left here.
  return signedIn ? count : null;
}
