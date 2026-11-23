import { useEffect, useMemo, useState } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { useKeptPlans } from "../gym/plans";
import type { Workout } from "../gym/workout";
import { useFollowsDoor } from "../social/followsDoor";
import {
  apiFetchers,
  type CoachFetchers,
  type CoachRaw,
  fetchCoachRaw,
} from "./coachData";
import { nextTimeTip } from "./nextTime";
import type { Tip } from "./rules";

/**
 * The «Next time» tip of a workout just ended (TASK-491 part C): the
 * account's workouts from the API with this one added, and the phone's
 * plans when it has them. Signed out, nothing is asked and there is none;
 * while the API answers, or when it does not, none either.
 */
export function useNextTime(
  workout: Workout,
  fetchersOf: (apiUrl: string, token: string) => CoachFetchers = apiFetchers,
): Tip | null {
  const { apiUrl, account } = useFollowsDoor();
  const owner = useActivitiesDoor().owner ?? null;
  const plans = useKeptPlans();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const asked =
    apiUrl !== null && token !== null && owner !== null
      ? `${apiUrl}|${owner}|${token}`
      : null;
  const [answer, setAnswer] = useState<{ asked: string; raw: CoachRaw } | null>(null);
  const raw = answer !== null && answer.asked === asked ? answer.raw : null;

  useEffect(() => {
    if (apiUrl === null || token === null || asked === null) {
      return;
    }
    let live = true;
    const fetchers = fetchersOf(apiUrl, token);
    // Only the gym counts here: the runs are not asked for, and their
    // absence alone does not make an answer.
    const gymOnly: CoachFetchers = {
      ...fetchers,
      activities: async () => ({ kind: "unreachable", url: "" }),
    };
    void fetchCoachRaw(gymOnly, new Date()).then((outcome) => {
      if (live && outcome.kind === "ok") {
        setAnswer({ asked, raw: outcome.raw });
      }
    });
    return () => {
      live = false;
    };
  }, [apiUrl, token, asked, fetchersOf]);

  return useMemo(
    () =>
      raw === null
        ? null
        : nextTimeTip(plans.length > 0 ? { ...raw, plans } : raw, workout),
    [raw, plans, workout],
  );
}
