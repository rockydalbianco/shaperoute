import { useCallback, useEffect, useState } from "react";

import { SKIP_LOCK_S } from "./Tour";
import { markTourSeen, tourSeen } from "./tourSeen";

/** A tour to show: a new `key` starts it from its first step. */
export type TourOn = { key: number; lockSeconds: number };

const askers = new Set<() => void>();

/** «Watch the tour» in the guide: the tour again, from its first step. */
export function askTour(): void {
  for (const ask of askers) {
    ask();
  }
}

/**
 * Whether the tour is on (TASK-266): at the first opening of the app, with
 * «Skip» waiting `SKIP_LOCK_S`; again whenever the guide asks, with «Skip»
 * at once. Seen to its end or skipped, it is kept as seen.
 */
export function useTour(): { on: TourOn | null; end: (shown: boolean) => void } {
  const [on, setOn] = useState<TourOn | null>(() =>
    tourSeen() ? null : { key: 0, lockSeconds: SKIP_LOCK_S },
  );
  useEffect(() => {
    const ask = () => setOn((now) => ({ key: (now?.key ?? 0) + 1, lockSeconds: 0 }));
    askers.add(ask);
    return () => {
      askers.delete(ask);
    };
  }, []);
  const end = useCallback((shown: boolean) => {
    if (shown) {
      markTourSeen();
    }
    setOn(null);
  }, []);
  return { on, end };
}
