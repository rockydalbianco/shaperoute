import { useCallback, useEffect, useMemo, useState } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { type KeptPlan, useGymPlans } from "../gym/plans";
import { useFollowsDoor } from "../social/followsDoor";
import { applyTip } from "./applyTip";
import {
  apiFetchers,
  buildCoachInput,
  type CoachFetchers,
  type CoachRaw,
  fetchCoachRaw,
} from "./coachData";
import { coachTips, type Tip, tipKey } from "./rules";
import { loadSnoozed, snooze } from "./snooze";

/**
 * The Coach's page as data (TASK-491 part B, ADR-0399): the workouts, runs
 * and plans of the account from the API, the tips the rules find, and what
 * the buttons do. The plans are the phone's (`useGymPlans`), so a tip
 * applied changes the plan at once and goes to the API as any plan does.
 */

export type CoachState =
  | { kind: "signedOut" }
  | { kind: "loading" }
  | { kind: "unreachable" }
  /** `empty`: nothing done in the last 4 weeks to read tips from. */
  | { kind: "ready"; tips: Tip[]; empty: boolean };

export type Coach = {
  state: CoachState;
  /** «Apply to plan»: the plan changed and saved; the tip goes. */
  apply: (tip: Tip) => void;
  /** «OK» and «Not now»: the tip goes for a week. */
  putOff: (tip: Tip) => void;
};

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;

export function useCoach(
  fetchersOf: (apiUrl: string, token: string) => CoachFetchers = apiFetchers,
  fetchFn?: typeof fetch,
): Coach {
  const { apiUrl, account } = useFollowsDoor();
  const owner = useActivitiesDoor().owner ?? null;
  const { plans, keep } = useGymPlans(fetchFn);
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const signedIn = apiUrl !== null && token !== null && owner !== null;

  // What the API said, for the account it was asked for: another account
  // (or none) reads it as not there.
  const asked = signedIn ? `${apiUrl}|${owner}|${token}` : null;
  const [answer, setAnswer] = useState<{
    asked: string;
    raw: CoachRaw | "unreachable";
  } | null>(null);
  const raw = answer !== null && answer.asked === asked ? answer.raw : null;
  // What was put off, from the phone, and what was put off since.
  const loaded = useMemo(
    () => (owner === null ? new Set<string>() : loadSnoozed(owner)),
    [owner],
  );
  const [added, setAdded] = useState<{ owner: number; keys: string[] } | null>(null);
  const snoozed = useMemo(
    () =>
      added !== null && added.owner === owner
        ? new Set([...loaded, ...added.keys])
        : loaded,
    [loaded, added, owner],
  );

  useEffect(() => {
    if (apiUrl === null || token === null || owner === null || asked === null) {
      return;
    }
    let live = true;
    void fetchCoachRaw(fetchersOf(apiUrl, token), new Date()).then((outcome) => {
      if (live) {
        setAnswer({ asked, raw: outcome.kind === "ok" ? outcome.raw : "unreachable" });
      }
    });
    return () => {
      live = false;
    };
  }, [apiUrl, token, owner, asked, fetchersOf]);

  const state = useMemo((): CoachState => {
    if (!signedIn) {
      return { kind: "signedOut" };
    }
    if (raw === null) {
      return { kind: "loading" };
    }
    if (raw === "unreachable") {
      return { kind: "unreachable" };
    }
    // The phone's plans when it has them: they hold a tip just applied.
    const input = buildCoachInput(plans.length > 0 ? { ...raw, plans } : raw);
    const since = input.now.getTime() - FOUR_WEEKS_MS;
    const empty =
      !input.workouts.some((one) => one.startedAt.getTime() >= since) &&
      !input.runs.some((one) => one.startedAt.getTime() >= since);
    return { kind: "ready", tips: empty ? [] : coachTips(input, snoozed), empty };
  }, [signedIn, raw, plans, snoozed]);

  const putOff = useCallback(
    (tip: Tip) => {
      if (owner === null) {
        return;
      }
      const key = tipKey(tip);
      snooze(owner, key);
      setAdded((before) => ({
        owner,
        keys: [...(before !== null && before.owner === owner ? before.keys : []), key],
      }));
    },
    [owner],
  );

  const apply = useCallback(
    (tip: Tip) => {
      const change = tip.change;
      const plan =
        change === undefined ? undefined : plans.find((one) => one.key === change.plan);
      const request =
        change === undefined || plan === undefined ? null : applyTip(plan, change);
      if (plan !== undefined && request !== null) {
        // What the phone adds to a plan stays out of what is saved.
        const {
          updated_at: _updated,
          position: _position,
          owner: _owner,
          state: _state,
          ...rest
        } = request as typeof request & Partial<Pick<KeptPlan, "owner" | "state">>;
        keep(plan.key, rest);
      }
      putOff(tip);
    },
    [plans, keep, putOff],
  );

  return { state, apply, putOff };
}
