import { useEffect, useState } from "react";

import { fetchDrawing } from "../api/drawings";
import { type RunStats, statsOf } from "../api/runStats";
import { useFollowsDoor } from "../social/followsDoor";

type Options = { fetchFn?: typeof fetch };

/**
 * The figures of the post `drawingId` (TASK-410 part D): splits, profile,
 * cadence, calories, heart rate, read once from GET /drawings/{id} when the
 * page opens. GET /feed does not carry them. Null until they come, for a
 * post without any, and when the API cannot be reached: the page shows its
 * summary as before.
 */
export function usePostStats(
  drawingId: string,
  options: Options = {},
): RunStats | null {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  // Kept with the post they are of: another post shows none until its own.
  const [found, setFound] = useState<{ id: string; stats: RunStats | null } | null>(
    null,
  );
  const { fetchFn } = options;

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchDrawing(apiUrl, token, drawingId, { fetchFn }).then((outcome) => {
      if (live && outcome.kind === "ok") {
        setFound({ id: drawingId, stats: statsOf(outcome.value) });
      }
    });
    return () => {
      live = false;
    };
  }, [apiUrl, token, drawingId, fetchFn]);

  return found !== null && found.id === drawingId ? found.stats : null;
}
