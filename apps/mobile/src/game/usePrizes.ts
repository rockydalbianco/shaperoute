import type { GamePrizes, GamePrizesShown } from "@shaperoute/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { accountProblem, sessionEnded } from "../account/messages";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import { noGame } from "./gameApi";
import { fetchGamePrizes, saveShownPrizes } from "./prizesApi";
import type { Done } from "./useTeams";

/**
 * The prizes of who is signed in (TASK-423 part E, docs/GIOCO.md §5.4):
 * asked of the API while «Prizes» is on screen and kept while the app is
 * open, as the personal challenges are (`usePersonal`). "off" without an
 * account; "none" on an API before TASK-423 part E (its 404).
 */
export type PrizesShown =
  | { status: "off" }
  | { status: "loading" }
  | { status: "ready"; prizes: GamePrizes }
  | { status: "none" }
  | { status: "failed"; problem: string };

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** What the API said to one account; another account's is nobody's. */
type Held = {
  token: string;
  state: Extract<PrizesShown, { status: "loading" | "ready" | "none" | "failed" }>;
};

// The last answer, for the tab to come back to without a wait.
let kept: { token: string; prizes: GamePrizes } | null = null;

const LOADING: PrizesShown = { status: "loading" };
const OFF: PrizesShown = { status: "off" };

export function usePrizes(
  active: boolean,
  options: Options = {},
): {
  shown: PrizesShown;
  refresh: () => void;
  /** What the profile shows (TASK-423 E2b): the prizes again, or why not. */
  show: (choice: GamePrizesShown) => Promise<Done<GamePrizes>>;
} {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const endSession = account.sessionEnded;
  const { fetchFn, key } = options;
  const [held, setHeld] = useState<Held | null>(() =>
    kept === null
      ? null
      : { token: kept.token, state: { status: "ready", prizes: kept.prizes } },
  );
  const asking = useRef(0);

  const ask = useCallback(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    const request = ++asking.current;
    void fetchGamePrizes(apiUrl, token, { fetchFn, key }).then((outcome) => {
      if (request !== asking.current) {
        return;
      }
      if (outcome.kind === "ok") {
        kept = { token, prizes: outcome.value };
        setHeld({ token, state: { status: "ready", prizes: outcome.value } });
        return;
      }
      if (noGame(outcome)) {
        kept = null;
        setHeld({ token, state: { status: "none" } });
        return;
      }
      if (sessionEnded(outcome)) {
        endSession(token);
      }
      setHeld({ token, state: { status: "failed", problem: accountProblem(outcome) } });
    });
  }, [apiUrl, endSession, fetchFn, key, token]);

  // On screen with an account: asked, and asked again each time the page
  // comes back; the last answer stays in view meanwhile.
  useEffect(() => {
    if (active && token !== null) {
      ask();
    }
  }, [active, ask, token]);

  const refresh = useCallback(() => {
    if (token !== null) {
      setHeld({ token, state: { status: "loading" } });
      ask();
    }
  }, [ask, token]);

  const show = useCallback(
    async (choice: GamePrizesShown): Promise<Done<GamePrizes>> => {
      if (apiUrl === null || token === null) {
        return { ok: false, problem: t("Sign in to collect shapes.") };
      }
      const outcome = await saveShownPrizes(apiUrl, token, choice, { fetchFn, key });
      if (outcome.kind === "ok") {
        kept = { token, prizes: outcome.value };
        setHeld({ token, state: { status: "ready", prizes: outcome.value } });
        return { ok: true, value: outcome.value };
      }
      if (sessionEnded(outcome)) {
        endSession(token);
      }
      return { ok: false, problem: accountProblem(outcome) };
    },
    [apiUrl, endSession, fetchFn, key, token],
  );

  const shown: PrizesShown =
    token === null ? OFF : held !== null && held.token === token ? held.state : LOADING;
  return { shown, refresh, show };
}

/** For the tests: as an app just opened. */
export function forgetPrizes(): void {
  kept = null;
}
