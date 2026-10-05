import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { sessionEnded } from "../account/messages";
import type { Account } from "../account/useAccount";
import { countFollowRequests } from "../api/follows";

/**
 * Who asks to follow the account and waits for its answer (TASK-239), as
 * the whole app reaches it: the number on the way to «Profile», and the
 * lists of «Profile», which know it better once they are on screen.
 */
export type FollowRequests = {
  /** How many wait for an answer; 0 until the API has said. */
  count: number;
  /** «Profile» has the list, or answered a request: its number is the newest. */
  counted: (count: number) => void;
};

/** Without «Profile» around it (a test of one screen): nobody waits. */
export const FollowRequestsContext = createContext<FollowRequests>({
  count: 0,
  counted: () => {},
});

export function useFollowRequests(): FollowRequests {
  return useContext(FollowRequestsContext);
}

/** How often the app asks while it is open: a request is seen within a minute. */
export const REQUESTS_EVERY_MS = 60_000;

type Options = {
  fetchFn?: typeof fetch;
  key?: string | null;
  /** The time between two questions; the tests give their own. */
  everyMs?: number;
};

/** The number of one account: another token's is nobody's. */
type Held = { token: string; count: number };

/**
 * The requests of the account, for «Profile» to hand to the app: asked
 * when the account is known, every minute while the app is on screen, and
 * when the app comes back to it. Without an answer the last number stays:
 * a number is never worth an error on screen.
 */
export function useFollowRequestsOf(
  baseUrl: string | null,
  account: Pick<Account, "state" | "sessionEnded">,
  options: Options = {},
): FollowRequests {
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [held, setHeld] = useState<Held | null>(null);
  // How many times «Profile» said the number: an answer asked before the
  // last one is older than it.
  const said = useRef(0);
  const { fetchFn, key, everyMs = REQUESTS_EVERY_MS } = options;

  useEffect(() => {
    if (token === null || baseUrl === null) {
      return;
    }
    let live = true;
    // An API older than following has no requests: asked once.
    let off = false;
    let onScreen = true;
    const ask = () => {
      if (off) {
        return;
      }
      const before = said.current;
      void countFollowRequests(baseUrl, token, { fetchFn, key }).then((outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok") {
          if (said.current === before) {
            setHeld({ token, count: outcome.value });
          }
        } else if (outcome.kind === "api_error" && outcome.code === "http_error") {
          off = true;
        } else if (sessionEnded(outcome)) {
          onSessionEnded(token);
        }
      });
    };
    ask();
    const timer = setInterval(() => {
      if (onScreen) {
        ask();
      }
    }, everyMs);
    const subscription = AppState.addEventListener("change", (next) => {
      const was = onScreen;
      onScreen = next === "active";
      if (onScreen && !was) {
        ask();
      }
    });
    return () => {
      live = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [baseUrl, everyMs, fetchFn, key, onSessionEnded, token]);

  const counted = useCallback(
    (count: number) => {
      if (token === null) {
        return;
      }
      said.current += 1;
      setHeld((was) =>
        was !== null && was.token === token && was.count === count
          ? was
          : { token, count },
      );
    },
    [token],
  );
  const count = held !== null && held.token === token ? held.count : 0;
  return useMemo(() => ({ count, counted }), [count, counted]);
}
