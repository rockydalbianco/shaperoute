import type { GamePersonal } from "@shaperoute/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { accountProblem, sessionEnded } from "../account/messages";
import { useFollowsDoor } from "../social/followsDoor";
import { noGame } from "./gameApi";
import { fetchGamePersonal, offsetNow } from "./personalApi";

/**
 * The personal challenges and the streak of who is signed in (TASK-423
 * part D, docs/GIOCO.md §6.6–6.7): asked of the API while «Challenges» is
 * on screen, on the phone's clock, and kept while the app is open, as the
 * teams are (`useTeams`). "off" without an account; "none" on an API
 * before TASK-423 part C (its 404): the tab shows no cards and no error.
 */
export type PersonalShown =
  | { status: "off" }
  | { status: "loading" }
  | { status: "ready"; personal: GamePersonal }
  | { status: "none" }
  | { status: "failed"; problem: string };

type Options = {
  fetchFn?: typeof fetch;
  key?: string | null;
  /** The phone's offset from UTC; the tests give theirs. */
  offsetMin?: number;
};

/** What the API said to one account; another account's is nobody's. */
type Held = {
  token: string;
  state: Extract<PersonalShown, { status: "loading" | "ready" | "none" | "failed" }>;
};

// The last answer, for the tab to come back to without a wait.
let kept: { token: string; personal: GamePersonal } | null = null;

const LOADING: PersonalShown = { status: "loading" };
const OFF: PersonalShown = { status: "off" };

export function usePersonal(
  active: boolean,
  options: Options = {},
): { shown: PersonalShown; refresh: () => void } {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const endSession = account.sessionEnded;
  const { fetchFn, key, offsetMin } = options;
  const [held, setHeld] = useState<Held | null>(() =>
    kept === null
      ? null
      : { token: kept.token, state: { status: "ready", personal: kept.personal } },
  );
  const asking = useRef(0);

  const ask = useCallback(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    const request = ++asking.current;
    void fetchGamePersonal(apiUrl, token, offsetMin ?? offsetNow(), {
      fetchFn,
      key,
    }).then((outcome) => {
      if (request !== asking.current) {
        return;
      }
      if (outcome.kind === "ok") {
        kept = { token, personal: outcome.value };
        setHeld({ token, state: { status: "ready", personal: outcome.value } });
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
  }, [apiUrl, endSession, fetchFn, key, offsetMin, token]);

  // On screen with an account: asked, and asked again each time the tab
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

  const shown: PersonalShown =
    token === null ? OFF : held !== null && held.token === token ? held.state : LOADING;
  return { shown, refresh };
}

/** For the tests: as an app just opened. */
export function forgetPersonal(): void {
  kept = null;
}
