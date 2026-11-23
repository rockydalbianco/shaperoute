import type { SkiResort } from "@shaperoute/shared-types";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { useDrawingsDoor } from "../social/drawingsDoor";

/**
 * «Your resorts» (TASK-406 part D3, the user's choice of 2026-11-08): the
 * resorts the account follows, first in the «Ski» search and in «Change»,
 * with «Follow» on a resort's page. One list for the whole app, read once
 * from the API for each session; a tap changes it at once, and back if the
 * API refuses it. No notifications.
 */

type Kept = { asked: unknown; resorts: SkiResort[] };

let kept: Kept | null = null;
const listeners = new Set<() => void>();

function keep(next: Kept | null) {
  kept = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** For the tests: the next screen reads the list again. */
export function forgetFollowedResorts(): void {
  keep(null);
}

const NONE: SkiResort[] = [];

export function useFollowedResorts(): {
  followed: SkiResort[];
  isFollowed: (resortId: string) => boolean;
  toggle: (resort: SkiResort) => void;
} {
  const { followedResortsOf, followResortOf } = useDrawingsDoor();
  const snapshot = useSyncExternalStore(subscribe, () => kept);
  // Read for this session's door: another account's list is not this one's.
  const mine = snapshot !== null && snapshot.asked === followedResortsOf;
  useEffect(() => {
    if (followedResortsOf === undefined || mine) {
      return;
    }
    let live = true;
    void followedResortsOf().then((resorts) => {
      if (live && resorts !== null) {
        keep({ asked: followedResortsOf, resorts });
      }
    });
    return () => {
      live = false;
    };
  }, [followedResortsOf, mine]);
  const followed = mine ? snapshot.resorts : NONE;

  const isFollowed = useCallback(
    (resortId: string) => followed.some((resort) => resort.id === resortId),
    [followed],
  );

  const toggle = useCallback(
    (resort: SkiResort) => {
      if (followResortOf === undefined) {
        return;
      }
      const on = !followed.some((one) => one.id === resort.id);
      const before = followed;
      // The last followed first, as the API lists them.
      const after = on
        ? [{ ...resort, away_m: null }, ...before]
        : before.filter((one) => one.id !== resort.id);
      keep({ asked: followedResortsOf, resorts: after });
      void followResortOf(resort.id, on).then((done) => {
        if (!done && kept !== null && kept.resorts === after) {
          keep({ asked: followedResortsOf, resorts: before });
        }
      });
    },
    [followResortOf, followed, followedResortsOf],
  );

  return { followed, isFollowed, toggle };
}
