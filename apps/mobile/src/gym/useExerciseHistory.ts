import type { GymHistory } from "@shaperoute/shared-types";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { fetchGymHistory } from "../api/gymHistory";
import { useFollowsDoor } from "../social/followsDoor";
import {
  historyKey,
  historyOf,
  type WaitingWorkout,
  withWaiting,
} from "./exerciseHistory";
import { keepHistory, keptHistory } from "./gymHistoryCache";
import { loadGymOutbox } from "./gymOutbox";
import type { Entry } from "./setKinds";

/**
 * The history of `entry` (TASK-483 part B): the one kept on the phone at
 * once, then the API's; the workouts still waiting to be sent are in it.
 * Off without an account, or with an API that has no history (404): then
 * «Last time» and «History» are not shown at all.
 */
export type ExerciseHistoryState = {
  /** null while nothing is known yet, and when off. */
  history: GymHistory | null;
  /** No account, or an API without the history. */
  off: boolean;
  /** The API could not be asked and the phone has nothing kept. */
  failed: boolean;
  /** The next page, while there is one and none is being asked. */
  loadMore: (() => void) | null;
  loadingMore: boolean;
};

/** What the API said for one exercise. */
type Answer = {
  key: string;
  /** As the API gave it, without the waiting workouts; null when it did
   * not answer. */
  given: GymHistory | null;
  off: boolean;
};

function waitingOf(owner: number): WaitingWorkout[] {
  return loadGymOutbox().filter(
    (item) => item.owner === owner && item.refused === undefined,
  );
}

/** `history` with the page after it. */
function withPage(history: GymHistory, page: GymHistory): GymHistory {
  const seen = new Set(history.workouts.map((workout) => workout.id));
  const { next: _old, ...rest } = history;
  return {
    ...rest,
    workouts: [
      ...history.workouts,
      ...page.workouts.filter((workout) => !seen.has(workout.id)),
    ],
    ...(page.next === undefined ? {} : { next: page.next }),
  };
}

export function useExerciseHistory(
  entry: Entry | null,
  fetchFn?: typeof fetch,
): ExerciseHistoryState {
  const { apiUrl, account } = useFollowsDoor();
  const { owner } = useActivitiesDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  // The entry as one text: a new object each render is the same exercise.
  const entryText = entry === null ? null : JSON.stringify(entry);
  const wanted = useMemo(
    () => (entryText === null ? null : (JSON.parse(entryText) as Entry)),
    [entryText],
  );
  const key = wanted === null ? null : historyKey(wanted);
  const signedIn = apiUrl !== null && token !== null && owner !== null;
  // What the phone kept, at once (a gym without a network).
  const kept = useMemo(
    () => (owner === null || key === null ? null : keptHistory(owner, key)),
    [owner, key],
  );
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (
      wanted === null ||
      key === null ||
      apiUrl === null ||
      token === null ||
      owner === null
    ) {
      return;
    }
    let live = true;
    void fetchGymHistory(apiUrl, token, historyOf(wanted), null, { fetchFn }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok") {
          keepHistory(owner, key, outcome.value);
          setAnswer({ key, given: outcome.value, off: false });
        } else {
          setAnswer({
            key,
            given: null,
            off: outcome.kind === "api_error" && outcome.code === "http_error",
          });
        }
      },
    );
    return () => {
      live = false;
    };
  }, [wanted, key, apiUrl, token, owner, fetchFn]);

  const now = answer !== null && answer.key === key ? answer : null;
  const given = now?.given ?? (now?.off === true ? null : kept);
  const next = given?.next;
  const loadMore = useCallback(() => {
    if (
      next === undefined ||
      wanted === null ||
      key === null ||
      apiUrl === null ||
      token === null
    ) {
      return;
    }
    setLoadingMore(true);
    void fetchGymHistory(apiUrl, token, historyOf(wanted), next, { fetchFn }).then(
      (outcome) => {
        setLoadingMore(false);
        if (outcome.kind !== "ok") {
          return;
        }
        setAnswer((then) =>
          then === null || then.key !== key || then.given === null
            ? then
            : { ...then, given: withPage(then.given, outcome.value) },
        );
      },
    );
  }, [next, wanted, key, apiUrl, token, fetchFn]);

  // The file of the waiting workouts is read once for each answer.
  const history = useMemo(
    () =>
      given === null || wanted === null || owner === null
        ? null
        : withWaiting(given, waitingOf(owner), wanted),
    [given, wanted, owner],
  );
  const off = !signedIn || now?.off === true;
  return {
    history: off ? null : history,
    off,
    failed: now !== null && now.given === null && !now.off && kept === null,
    loadMore: !off && next !== undefined && !loadingMore ? loadMore : null,
    loadingMore,
  };
}
