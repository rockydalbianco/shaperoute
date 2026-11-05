import type { GymExercises } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { fetchGymExercises } from "../api/gym";
import { useFollowsDoor } from "../social/followsDoor";

/**
 * The exercises of a post of a workout, asked once per post while the app
 * runs (TASK-385 part D): the tile in the Feed and the card read the same
 * answer. A post whose owner hides them (404), or an answer that did not
 * come, is asked again the next time it is shown.
 */
const known = new Map<string, GymExercises>();
const asking = new Map<string, Promise<GymExercises | null>>();

/** For the tests: what was asked is forgotten. */
export function forgetGymExercises(): void {
  known.clear();
  asking.clear();
}

/** The exercises of the post `drawingId`; null while they come, when they
 * are hidden or when there is nobody signed in. Off: nothing is asked. */
export function useGymExercises(
  drawingId: string,
  { on = true, fetchFn }: { on?: boolean; fetchFn?: typeof fetch } = {},
): GymExercises | null {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [shown, setShown] = useState<{ id: string; exercises: GymExercises } | null>(
    null,
  );
  // Asked before, by this card or another: at once.
  const cached = on ? known.get(drawingId) : undefined;
  useEffect(() => {
    if (!on || apiUrl === null || token === null || known.has(drawingId)) {
      return;
    }
    let live = true;
    let pending = asking.get(drawingId);
    if (pending === undefined) {
      pending = fetchGymExercises(apiUrl, token, drawingId, { fetchFn }).then(
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
    void pending.then((exercises) => {
      if (live && exercises !== null) {
        setShown({ id: drawingId, exercises });
      }
    });
    return () => {
      live = false;
    };
  }, [on, apiUrl, token, drawingId, fetchFn]);
  if (cached !== undefined) {
    return cached;
  }
  return shown === null || shown.id !== drawingId ? null : shown.exercises;
}
