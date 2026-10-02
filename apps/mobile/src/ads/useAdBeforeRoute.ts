import { useEffect, useRef } from "react";

import { routeAds } from "./admob";
import type { RouteAds } from "./routeAds";

/**
 * The ad of a search covers its wait (TASK-132, TASK-166, ADR-0102): when a
 * search starts, an ad already loaded shows at once while the engine works
 * behind it. Closed, the screen shows whatever is there by then: the route
 * if it is ready, the wait if not. Without a loaded ad the search goes on
 * without one, and an ad loads for the next. The state passes through.
 */
export function useAdBeforeRoute<S extends { status: string }>(
  state: S,
  ads: () => RouteAds = routeAds,
): S {
  const waiting = state.status === "waiting";
  // Progress updates keep the search "waiting": one ad per search, at its start.
  const wasWaiting = useRef(false);

  useEffect(() => {
    const started = waiting && !wasWaiting.current;
    wasWaiting.current = waiting;
    if (!started) {
      return;
    }
    const network = ads();
    if (network.ready()) {
      void network.show();
    } else {
      network.prepare();
    }
  }, [waiting, ads]);

  return state;
}
