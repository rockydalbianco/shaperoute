import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Linking } from "react-native";

import { sessionEnded } from "../account/messages";
import type { Account } from "../account/useAccount";
import {
  connectStrava,
  disconnectStrava,
  fetchStravaActivity,
  fetchStravaStatus,
  notConnected,
  sendToStrava,
  STRAVA_OFF,
  type StravaActivity,
  type StravaOutcome,
  type StravaStatus,
  stravaProblem,
} from "../api/strava";

/** What is on its way: Strava's page asked for, or the access taken back. */
export type StravaBusy = "connecting" | "disconnecting" | null;

/**
 * Strava for the account (TASK-187), as the whole app reaches it: the end
 * of a run, a run of «My activities» and «Settings». Asked of the API only
 * when one of them shows; nothing of Strava shows until it says
 * `available`.
 */
export type StravaState = {
  /** What the API said; off until it answers, and with nobody signed in. */
  status: StravaStatus;
  busy: StravaBusy;
  /** The last change that failed, in words; null once another starts. */
  problem: string | null;
  /** Asks the API, once for this account: a screen that shows Strava calls it. */
  ensure: () => void;
  /** Opens Strava's page in the browser; back in the app, the API is asked again. */
  connect: () => void;
  /** Takes the access back on Strava. */
  disconnect: () => void;
  /** What Strava has of the saved run `key`; null with nobody signed in. */
  activityOf: (key: string) => Promise<StravaOutcome<StravaActivity> | null>;
  /** Sends the saved run `key` now, with the name typed (null: the API's). */
  send: (
    key: string,
    name: string | null,
  ) => Promise<StravaOutcome<StravaActivity> | null>;
};

const NOTHING: StravaState = {
  status: STRAVA_OFF,
  busy: null,
  problem: null,
  ensure: () => {},
  connect: () => {},
  disconnect: () => {},
  activityOf: async () => null,
  send: async () => null,
};

/** Without «Profile» around it (a test of one screen): no Strava. */
export const StravaContext = createContext<StravaState>(NOTHING);

/** Strava for a screen that shows it: asks the API the first time. */
export function useStrava(): StravaState {
  const strava = useContext(StravaContext);
  const { ensure } = strava;
  useEffect(() => {
    ensure();
  }, [ensure]);
  return strava;
}

/** Strava's page in the browser, or in the Strava app when the phone has it. */
function openInBrowser(url: string): Promise<unknown> {
  return Linking.openURL(url);
}

/** What is known for one account: another token's is nobody's. */
type Held = {
  token: string;
  status: StravaStatus;
  busy: StravaBusy;
  problem: string | null;
};

type Options = {
  fetchFn?: typeof fetch;
  key?: string | null;
  /** Opens Strava's page; the tests give their own. */
  openUrl?: (url: string) => Promise<unknown>;
};

/** Strava of the account, for «Profile» to hand to the app. */
export function useStravaOf(
  baseUrl: string | null,
  account: Account,
  options: Options = {},
): StravaState {
  const { state, sessionEnded: endSession } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [held, setHeld] = useState<Held | null>(null);
  const { fetchFn, key, openUrl = openInBrowser } = options;
  // Whose answers still count: another account's are dropped.
  const tokenNow = useRef<string | null>(token);
  useEffect(() => {
    tokenNow.current = token;
  }, [token]);
  // The token the API was asked for, so a screen does not ask again.
  const asked = useRef<string | null>(null);
  // Strava's page is open in the browser: back in the app, ask again.
  const away = useRef(false);

  const change = useCallback((of: string, next: Partial<Omit<Held, "token">>) => {
    if (tokenNow.current !== of) {
      return;
    }
    setHeld((was) => ({
      ...(was !== null && was.token === of
        ? was
        : { token: of, status: STRAVA_OFF, busy: null, problem: null }),
      ...next,
    }));
  }, []);

  const ask = useCallback(() => {
    if (token === null || baseUrl === null) {
      return;
    }
    asked.current = token;
    void fetchStravaStatus(baseUrl, token, { fetchFn, key }).then((outcome) => {
      if (outcome.kind === "ok") {
        change(token, { status: outcome.value });
      } else if (sessionEnded(outcome)) {
        endSession(token);
      }
      // Anything else: as it was, and the next screen asks again.
      else {
        asked.current = null;
      }
    });
  }, [baseUrl, change, endSession, fetchFn, key, token]);

  const ensure = useCallback(() => {
    if (token !== null && asked.current !== token) {
      ask();
    }
  }, [ask, token]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active" && away.current) {
        away.current = false;
        ask();
      }
    });
    return () => subscription.remove();
  }, [ask]);

  const connect = useCallback(() => {
    if (token === null || baseUrl === null) {
      return;
    }
    change(token, { busy: "connecting", problem: null });
    void connectStrava(baseUrl, token, { fetchFn, key }).then(async (outcome) => {
      if (outcome.kind !== "ok") {
        if (sessionEnded(outcome)) {
          endSession(token);
        }
        change(token, { busy: null, problem: stravaProblem(outcome) });
        return;
      }
      away.current = true;
      try {
        await openUrl(outcome.value);
        change(token, { busy: null });
      } catch {
        away.current = false;
        change(token, {
          busy: null,
          problem: "Could not open Strava. Try again.",
        });
      }
    });
  }, [baseUrl, change, endSession, fetchFn, key, openUrl, token]);

  const disconnect = useCallback(() => {
    if (token === null || baseUrl === null) {
      return;
    }
    change(token, { busy: "disconnecting", problem: null });
    void disconnectStrava(baseUrl, token, { fetchFn, key }).then((outcome) => {
      if (outcome.kind === "ok") {
        change(token, {
          busy: null,
          status: { available: true, connected: false, athlete: null },
        });
        return;
      }
      if (sessionEnded(outcome)) {
        endSession(token);
      }
      change(token, { busy: null, problem: stravaProblem(outcome) });
    });
  }, [baseUrl, change, endSession, fetchFn, key, token]);

  /** What a call about a run says of the account and of the athlete. */
  const heard = useCallback(
    (asking: string, outcome: StravaOutcome<StravaActivity>) => {
      if (sessionEnded(outcome)) {
        endSession(asking);
      } else if (notConnected(outcome)) {
        // Strava took the access back: «Connect with Strava» again.
        change(asking, {
          status: { available: true, connected: false, athlete: null },
        });
      }
      return outcome;
    },
    [change, endSession],
  );

  const activityOf = useCallback(
    async (runKey: string) => {
      if (token === null || baseUrl === null) {
        return null;
      }
      const outcome = await fetchStravaActivity(baseUrl, token, runKey, {
        fetchFn,
        key,
      });
      return heard(token, outcome);
    },
    [baseUrl, fetchFn, heard, key, token],
  );

  const send = useCallback(
    async (runKey: string, name: string | null) => {
      if (token === null || baseUrl === null) {
        return null;
      }
      const outcome = await sendToStrava(baseUrl, token, runKey, name, {
        fetchFn,
        key,
      });
      return heard(token, outcome);
    },
    [baseUrl, fetchFn, heard, key, token],
  );

  const mine = held !== null && token !== null && held.token === token ? held : null;
  return useMemo(
    () => ({
      status: mine?.status ?? STRAVA_OFF,
      busy: mine?.busy ?? null,
      problem: mine?.problem ?? null,
      ensure,
      connect,
      disconnect,
      activityOf,
      send,
    }),
    [mine, ensure, connect, disconnect, activityOf, send],
  );
}
