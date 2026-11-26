import { useEffect, useState } from "react";

import { type RunStats, statsOf } from "../api/runStats";
import { holdDrawing } from "../social/drawingsDoor";
import { useFollowsDoor } from "../social/followsDoor";

type Options = { fetchFn?: typeof fetch };

/**
 * The figures of the post `drawingId` (TASK-410 part D): splits, profile,
 * cadence, calories, heart rate, read once from GET /drawings/{id} when the
 * page opens. GET /feed does not carry them. Null until they come, for a
 * post without any, and when the API cannot be reached: the page shows its
 * summary as before. The answer is held while the page is open: the map
 * the page opens reads it too, without asking again (TASK-501).
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
    const held = holdDrawing(apiUrl, token, drawingId, { fetchFn });
    void held.answer.then((outcome) => {
      if (live && outcome.kind === "ok") {
        setFound({ id: drawingId, stats: statsOf(outcome.value) });
      }
    });
    return () => {
      live = false;
      held.release();
    };
  }, [apiUrl, token, drawingId, fetchFn]);

  return found !== null && found.id === drawingId ? found.stats : null;
}
