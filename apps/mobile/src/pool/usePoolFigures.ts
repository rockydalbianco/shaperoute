import type { PoolSwimFigures } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { fetchPoolFigures } from "../api/poolSwims";
import { useFollowsDoor } from "../social/followsDoor";

/**
 * The pool and the lengths of a post of a swim in a pool, asked once per
 * post while the app runs (TASK-400 part C), as the gym's exercises
 * (gym/useGymExercises.ts): the tile in the Feed and the card read the
 * same answer. An answer that did not come is asked again the next time.
 */
const known = new Map<string, PoolSwimFigures>();
const asking = new Map<string, Promise<PoolSwimFigures | null>>();

/** For the tests: what was asked is forgotten. */
export function forgetPoolFigures(): void {
  known.clear();
  asking.clear();
}

/** The figures of the post `drawingId`; null while they come, when the API
 * does not give them or with nobody signed in. Off: nothing is asked. */
export function usePoolFigures(
  drawingId: string,
  { on = true, fetchFn }: { on?: boolean; fetchFn?: typeof fetch } = {},
): PoolSwimFigures | null {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [shown, setShown] = useState<{ id: string; figures: PoolSwimFigures } | null>(
    null,
  );
  const cached = on ? known.get(drawingId) : undefined;
  useEffect(() => {
    if (!on || apiUrl === null || token === null || known.has(drawingId)) {
      return;
    }
    let live = true;
    let pending = asking.get(drawingId);
    if (pending === undefined) {
      pending = fetchPoolFigures(apiUrl, token, drawingId, { fetchFn }).then(
        (outcome) => {
          asking.delete(drawingId);
          if (outcome.kind !== "ok") {
            return null;
          }
          known.set(drawingId, outcome.value);
          return outcome.value;
        },
      );
      asking.set(drawingId, pending);
    }
    void pending.then((figures) => {
      if (live && figures !== null) {
        setShown({ id: drawingId, figures });
      }
    });
    return () => {
      live = false;
    };
  }, [on, apiUrl, token, drawingId, fetchFn]);
  if (cached !== undefined) {
    return cached;
  }
  return shown === null || shown.id !== drawingId ? null : shown.figures;
}
