import type { LiveItem } from "@shaperoute/shared-types";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import { fetchLives, type LiveApiOptions, setReminder } from "./liveShareApi";

/**
 * The Feed's row of lives (TASK-468 part B2a, ADR-0381): GET /lives when
 * the Feed shows, again every ROW_EVERY_MS while it does and the app is on
 * screen, and when the app comes back to it (TASK-499, as the numbers of
 * the messages and of the requests); «Remind me» on a planned one, shown at
 * once and taken back if the API says no.
 */

/** Often enough for a card to turn LIVE; the live view asks every 10 s. */
export const ROW_EVERY_MS = 60_000;
/** The row is short: the first lives only. */
export const ROW_MOST = 5;

export type Lives = {
  lives: LiveItem[];
  remind: (live: LiveItem, on: boolean) => void;
  /** Read the row again now: a live just planned or started. */
  refresh: () => void;
};

/** `api` the same object between renders (useMemo); null without an
 * account or while the Feed is hidden: no request. */
export function useLives(api: LiveApiOptions | null): Lives {
  const [lives, setLives] = useState<LiveItem[]>([]);
  const [asked, setAsked] = useState(0);
  const refresh = useCallback(() => setAsked((n) => n + 1), []);

  useEffect(() => {
    if (api === null) {
      return;
    }
    let live = true;
    const round = async () => {
      const answer = await fetchLives(api);
      if (live && answer.kind === "ok") {
        setLives(answer.value.lives.slice(0, ROW_MOST));
      }
    };
    void round();
    // Behind another app nobody sees the row: no request until it is back.
    let onScreen = true;
    const timer = setInterval(() => {
      if (onScreen) {
        void round();
      }
    }, ROW_EVERY_MS);
    const subscription = AppState.addEventListener("change", (next) => {
      const was = onScreen;
      onScreen = next === "active";
      if (onScreen && !was) {
        void round();
      }
    });
    return () => {
      live = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [api, asked]);

  const remind = useCallback(
    (item: LiveItem, on: boolean) => {
      if (api === null || item.planned_live_id === null) {
        return;
      }
      const put = (reminded: boolean) =>
        setLives((now) =>
          now.map((one) => (one.id === item.id ? { ...one, reminded } : one)),
        );
      put(on);
      void setReminder(api, item.planned_live_id, on).then((answer) => {
        if (answer.kind !== "ok") {
          put(!on);
        }
      });
    },
    [api],
  );

  return { lives, remind, refresh };
}
