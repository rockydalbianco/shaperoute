import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { accountProblem, sessionEnded } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import {
  type Favorite,
  fetchFavorites,
  keepFavorite,
  removeFavorite,
} from "../api/favorites";
import { type Keepable, keptNow } from "./favoriteRoute";

/**
 * The favorites of who is signed in (TASK-171): the list of the API, kept
 * here while the app is open. A heart changes at once and goes back if the
 * API refuses.
 */
export type FavoritesState = {
  /**
   * "off" with nobody signed in; "loading" until the first answer; "failed"
   * when the list never arrived.
   */
  status: "off" | "loading" | "ready" | "failed";
  /** The newest first. */
  list: Favorite[];
  /** The last request that failed, in words; null once another starts. */
  problem: string | null;
  has: (id: string) => boolean;
  /** Keeps the route, or removes it when it is kept. */
  toggle: (route: Keepable) => void;
  remove: (id: string) => void;
  /** Asks the API for the list again. */
  refresh: () => void;
  clearProblem: () => void;
};

type Options = { fetchFn?: typeof fetch; key?: string | null; now?: () => Date };

type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

/** A favorite request that failed, in words (docs/UI.md, «Favorites»). */
export function favoriteProblem(failed: Failed): string {
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
  list: Favorite[];
  problem: string | null;
};

const NONE: Favorite[] = [];

export function useFavorites(
  baseUrl: string | null,
  /** The session token; null with nobody signed in. */
  token: string | null,
  /** The API says the session is over: the account signs out. */
  onSessionEnded: (token: string) => void,
  options: Options = {},
): FavoritesState {
  const [held, setHeld] = useState<Held | null>(null);
  // Read by the answers that arrive later: the list they changed may have
  // moved on. Every change goes through `change`, which keeps it.
  const current = useRef<Held | null>(null);
  // Whose answers still count: another account's are dropped.
  const tokenNow = useRef<string | null>(null);
  // The fake fetch of the tests; the same for the whole life of the app.
  const { fetchFn, key, now } = options;

  /** What the list of `asked` becomes; nothing for a token signed out since. */
  const change = useCallback((asked: string, next: (was: Held) => Partial<Held>) => {
    if (tokenNow.current !== asked) {
      return;
    }
    const was =
      current.current !== null && current.current.token === asked
        ? current.current
        : { token: asked, status: "loading" as const, list: NONE, problem: null };
    const held = { ...was, ...next(was) };
    current.current = held;
    setHeld(held);
  }, []);

  const failed = useCallback(
    (asked: string, outcome: Failed, list: (was: Favorite[]) => Favorite[]) => {
      change(asked, (was) => ({
        list: list(was.list),
        problem: favoriteProblem(outcome),
      }));
      if (sessionEnded(outcome)) {
        onSessionEnded(asked);
      }
    },
    [change, onSessionEnded],
  );

  const load = useCallback(
    (asked: string) => {
      if (baseUrl === null) {
        return;
      }
      void fetchFavorites(baseUrl, asked, { fetchFn, key }).then((outcome) => {
        if (outcome.kind === "ok") {
          change(asked, () => ({ status: "ready", list: outcome.value }));
          return;
        }
        // A list already here stays: only the first one can fail to come.
        change(asked, (was) => ({
          status: was.status === "ready" ? "ready" : "failed",
        }));
        if (sessionEnded(outcome)) {
          onSessionEnded(asked);
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

  const remove = useCallback(
    (id: string) => {
      const list = current.current?.token === token ? current.current.list : NONE;
      const index = list.findIndex((favorite) => favorite.id === id);
      if (token === null || baseUrl === null || index === -1) {
        return;
      }
      const removed = list[index];
      change(token, (was) => ({
        list: was.list.filter((favorite) => favorite.id !== id),
        problem: null,
      }));
      void removeFavorite(baseUrl, token, id, { fetchFn, key }).then((outcome) => {
        if (outcome.kind === "ok") {
          return;
        }
        // Back where it was, unless it was kept again in the meantime.
        failed(token, outcome, (was) => {
          if (was.some((favorite) => favorite.id === id)) {
            return was;
          }
          const next = [...was];
          next.splice(Math.min(index, next.length), 0, removed);
          return next;
        });
      });
    },
    [baseUrl, change, failed, fetchFn, key, token],
  );

  const keep = useCallback(
    (route: Keepable) => {
      if (token === null || baseUrl === null) {
        return;
      }
      const shown = keptNow(route, now?.() ?? new Date());
      change(token, (was) => ({ list: [shown, ...was.list], problem: null }));
      void keepFavorite(baseUrl, token, route.id, route.request, { fetchFn, key }).then(
        (outcome) => {
          if (outcome.kind === "ok") {
            // As the API has it: its date, its preview.
            change(token, (was) => ({
              list: was.list.map((favorite) =>
                favorite.id === route.id ? outcome.value : favorite,
              ),
            }));
            return;
          }
          failed(token, outcome, (was) =>
            was.filter((favorite) => favorite.id !== route.id),
          );
        },
      );
    },
    [baseUrl, change, failed, fetchFn, key, now, token],
  );

  const mine = held !== null && held.token === token ? held : null;
  const list = mine?.list ?? NONE;
  const problem = mine?.problem ?? null;
  const ids = useMemo(() => new Set(list.map((favorite) => favorite.id)), [list]);
  const has = useCallback((id: string) => ids.has(id), [ids]);
  const toggle = useCallback(
    (route: Keepable) => {
      const kept =
        current.current?.token === token &&
        current.current.list.some((favorite) => favorite.id === route.id);
      if (kept) {
        remove(route.id);
      } else {
        keep(route);
      }
    },
    [keep, remove, token],
  );
  const clearProblem = useCallback(() => {
    const now = current.current;
    if (token !== null && now?.token === token && now.problem !== null) {
      change(token, () => ({ problem: null }));
    }
  }, [change, token]);

  const status =
    token === null ? "off" : baseUrl === null ? "failed" : (mine?.status ?? "loading");
  return useMemo(
    () => ({ status, list, problem, has, toggle, remove, refresh, clearProblem }),
    [status, list, problem, has, toggle, remove, refresh, clearProblem],
  );
}
