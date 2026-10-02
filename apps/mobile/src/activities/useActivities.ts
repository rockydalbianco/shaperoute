import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { accountProblem, sessionEnded } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import { type Activity, fetchActivities, removeActivity } from "../api/activities";

/**
 * The runs of who is signed in (TASK-172): the list of the API, a page at a
 * time, kept here while the app is open. A run deleted leaves the list at
 * once and comes back if the API refuses.
 */
export type ActivitiesState = {
  /**
   * "off" with nobody signed in; "loading" until the first answer; "failed"
   * when the list never arrived.
   */
  status: "off" | "loading" | "ready" | "failed";
  /** The latest first: the pages asked for so far. */
  list: Activity[];
  /** How many runs the account has; null until the API has said. */
  total: number | null;
  /** There are runs after the ones in `list`. */
  more: boolean;
  /** The next page is on its way. */
  loadingMore: boolean;
  /** The last request that failed, in words; null once another starts. */
  problem: string | null;
  /** Asks the API for the list again, from its first page. */
  refresh: () => void;
  /** Asks for the page after the last one here. */
  loadMore: () => void;
  remove: (id: string) => void;
  /** A run the API has just saved: first in the list it belongs to. */
  saved: (token: string, activity: Activity) => void;
  clearProblem: () => void;
};

type Options = { fetchFn?: typeof fetch; key?: string | null };

type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

/** A request of the activities that failed, in words (docs/UI.md, «My
 * activities»). */
export function activityProblem(failed: Failed): string {
  // The API says it in words the user can act on: the list is full.
  if (failed.kind === "api_error" && failed.code === "invalid_request") {
    return failed.message;
  }
  return accountProblem(failed);
}

/** The list of one account: another token's is nobody's. */
type Held = {
  token: string;
  status: "loading" | "ready" | "failed";
  list: Activity[];
  total: number | null;
  /** The cursor of the page after `list`; null when there is none. */
  next: string | null;
  loadingMore: boolean;
  problem: string | null;
};

const NONE: Activity[] = [];

/** When a run began, in milliseconds; 0 for a moment that is not one. */
function startOf(activity: Activity): number {
  const ms = Date.parse(activity.started_at);
  return Number.isNaN(ms) ? 0 : ms;
}

export function useActivities(
  baseUrl: string | null,
  /** The session token; null with nobody signed in. */
  token: string | null,
  /** The API says the session is over: the account signs out. */
  onSessionEnded: (token: string) => void,
  options: Options = {},
): ActivitiesState {
  const [held, setHeld] = useState<Held | null>(null);
  // Read by the answers that arrive later: the list they changed may have
  // moved on. Every change goes through `change`, which keeps it.
  const current = useRef<Held | null>(null);
  // Whose answers still count: another account's are dropped.
  const tokenNow = useRef<string | null>(null);
  // Which first page the list comes from: a page after an older one is
  // dropped.
  const asked = useRef(0);
  // The fake fetch of the tests; the same for the whole life of the app.
  const { fetchFn, key } = options;

  /** What the list of `of` becomes; nothing for a token signed out since. */
  const change = useCallback((of: string, next: (was: Held) => Partial<Held>) => {
    if (tokenNow.current !== of) {
      return;
    }
    const was =
      current.current !== null && current.current.token === of
        ? current.current
        : {
            token: of,
            status: "loading" as const,
            list: NONE,
            total: null,
            next: null,
            loadingMore: false,
            problem: null,
          };
    const held = { ...was, ...next(was) };
    current.current = held;
    setHeld(held);
  }, []);

  const load = useCallback(
    (of: string) => {
      if (baseUrl === null) {
        return;
      }
      asked.current += 1;
      const mine = asked.current;
      void fetchActivities(baseUrl, of, null, { fetchFn, key }).then((outcome) => {
        if (asked.current !== mine) {
          return;
        }
        if (outcome.kind === "ok") {
          change(of, () => ({
            status: "ready",
            list: outcome.value.activities,
            total: outcome.value.total,
            next: outcome.value.next,
            loadingMore: false,
          }));
          return;
        }
        // A list already here stays: only the first one can fail to come.
        change(of, (was) => ({
          status: was.status === "ready" ? "ready" : "failed",
          // A page asked for before this is dropped when it comes.
          loadingMore: false,
        }));
        if (sessionEnded(outcome)) {
          onSessionEnded(of);
        }
      });
    },
    [baseUrl, change, fetchFn, key, onSessionEnded],
  );

  // A new account, or the same when the app opens: its list.
  useEffect(() => {
    tokenNow.current = token;
    if (token !== null) {
      load(token);
    }
  }, [token, load]);

  const refresh = useCallback(() => {
    if (token !== null) {
      // A list that never came is waited for again; one that did stays.
      change(token, (was) => ({
        status: was.status === "failed" ? "loading" : was.status,
      }));
      load(token);
    }
  }, [change, load, token]);

  const loadMore = useCallback(() => {
    const now = current.current;
    if (
      token === null ||
      baseUrl === null ||
      now === null ||
      now.token !== token ||
      now.next === null ||
      now.loadingMore
    ) {
      return;
    }
    const mine = asked.current;
    const cursor = now.next;
    change(token, () => ({ loadingMore: true, problem: null }));
    void fetchActivities(baseUrl, token, cursor, { fetchFn, key }).then((outcome) => {
      // The list was asked for again from its first page: this page
      // belongs to the old one.
      if (asked.current !== mine) {
        return;
      }
      if (outcome.kind === "ok") {
        change(token, (was) => {
          const here = new Set(was.list.map((activity) => activity.id));
          return {
            list: [
              ...was.list,
              ...outcome.value.activities.filter((activity) => !here.has(activity.id)),
            ],
            total: outcome.value.total,
            next: outcome.value.next,
            loadingMore: false,
          };
        });
        return;
      }
      change(token, () => ({
        loadingMore: false,
        problem: activityProblem(outcome),
      }));
      if (sessionEnded(outcome)) {
        onSessionEnded(token);
      }
    });
  }, [baseUrl, change, fetchFn, key, onSessionEnded, token]);

  const remove = useCallback(
    (id: string) => {
      const list = current.current?.token === token ? current.current.list : NONE;
      const index = list.findIndex((activity) => activity.id === id);
      if (token === null || baseUrl === null || index === -1) {
        return;
      }
      const removed = list[index];
      change(token, (was) => ({
        list: was.list.filter((activity) => activity.id !== id),
        total: was.total === null ? null : Math.max(0, was.total - 1),
        problem: null,
      }));
      void removeActivity(baseUrl, token, id, { fetchFn, key }).then((outcome) => {
        if (outcome.kind === "ok") {
          return;
        }
        // Back where it was, unless the list has it again in the meantime.
        change(token, (was) => {
          if (was.list.some((activity) => activity.id === id)) {
            return { problem: activityProblem(outcome) };
          }
          const next = [...was.list];
          next.splice(Math.min(index, next.length), 0, removed);
          return {
            list: next,
            total: was.total === null ? null : was.total + 1,
            problem: activityProblem(outcome),
          };
        });
        if (sessionEnded(outcome)) {
          onSessionEnded(token);
        }
      });
    },
    [baseUrl, change, fetchFn, key, onSessionEnded, token],
  );

  const saved = useCallback(
    (of: string, activity: Activity) => {
      change(of, (was) => {
        if (was.status !== "ready" || was.list.some((a) => a.id === activity.id)) {
          // No list yet: the one on its way has the run already.
          return {};
        }
        const total = was.total === null ? null : was.total + 1;
        const began = startOf(activity);
        const last = was.list[was.list.length - 1];
        // A run of long ago, sent late: it is on a page not asked for yet.
        if (was.next !== null && last !== undefined && began < startOf(last)) {
          return { total };
        }
        // Before the first run that began earlier: the latest stays first.
        const at = was.list.findIndex((other) => startOf(other) < began);
        const list = [...was.list];
        list.splice(at === -1 ? list.length : at, 0, activity);
        return { list, total };
      });
    },
    [change],
  );

  const mine = held !== null && held.token === token ? held : null;
  const list = mine?.list ?? NONE;
  const total = mine?.total ?? null;
  const more = mine !== null && mine.next !== null;
  const loadingMore = mine?.loadingMore ?? false;
  const problem = mine?.problem ?? null;
  const clearProblem = useCallback(() => {
    const now = current.current;
    if (token !== null && now?.token === token && now.problem !== null) {
      change(token, () => ({ problem: null }));
    }
  }, [change, token]);

  const status =
    token === null ? "off" : baseUrl === null ? "failed" : (mine?.status ?? "loading");
  return useMemo(
    () => ({
      status,
      list,
      total,
      more,
      loadingMore,
      problem,
      refresh,
      loadMore,
      remove,
      saved,
      clearProblem,
    }),
    [
      status,
      list,
      total,
      more,
      loadingMore,
      problem,
      refresh,
      loadMore,
      remove,
      saved,
      clearProblem,
    ],
  );
}
