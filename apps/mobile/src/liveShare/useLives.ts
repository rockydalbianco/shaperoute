import type { LiveItem } from "@shaperoute/shared-types";
import { useCallback, useEffect, useState } from "react";

import { fetchLives, type LiveApiOptions, setReminder } from "./liveShareApi";

/**
 * The Feed's row of lives (TASK-468 part B2a, ADR-0381): GET /lives when
 * the Feed shows, again every ROW_EVERY_MS while it does; «Remind me» on a
 * planned one, shown at once and taken back if the API says no.
 */

/** Often enough for a card to turn LIVE; the live view asks every 10 s. */
export const ROW_EVERY_MS = 60_000;
/** The row is short: the first lives only. */
export const ROW_MOST = 5;

export type Lives = {
  lives: LiveItem[];
  remind: (live: LiveItem, on: boolean) => void;
};

/** `api` the same object between renders (useMemo); null without an
 * account or while the Feed is hidden: no request. */
export function useLives(api: LiveApiOptions | null): Lives {
  const [lives, setLives] = useState<LiveItem[]>([]);

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
    const timer = setInterval(() => void round(), ROW_EVERY_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [api]);

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

  return { lives, remind };
}
