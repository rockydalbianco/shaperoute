import { useEffect, useState } from "react";

import { routeAds } from "./admob";
import type { RouteAds } from "./routeAds";

/**
 * The state the screen shows (TASK-132): a route that is ready waits behind
 * the ad, if one is ready, and shows as soon as the ad is closed. Without an
 * ad it shows at once. Every other state passes straight through.
 */
export function useAdBeforeRoute<S extends { status: string }>(
  state: S,
  ads: () => RouteAds = routeAds,
): S {
  // The state before the route was ready: what stays on screen behind the ad.
  const [before, setBefore] = useState(state);
  // Decided once per route, when it arrives.
  const [gate, setGate] = useState<{ for: S; hold: boolean; released: boolean } | null>(
    null,
  );
  if (state.status !== "done" && before !== state) {
    setBefore(state);
  }
  if (state.status === "done" && gate?.for !== state) {
    setGate({ for: state, hold: ads().ready(), released: false });
  }
  const adFor = gate?.for === state && gate.hold ? state : null;

  useEffect(() => {
    if (state.status === "waiting") {
      ads().prepare();
    }
  }, [state, ads]);

  useEffect(() => {
    if (adFor === null) {
      return;
    }
    let live = true;
    void ads()
      .show()
      .then(() => {
        if (live) {
          setGate((now) => (now?.for === adFor ? { ...now, released: true } : now));
        }
      });
    return () => {
      live = false;
    };
  }, [adFor, ads]);

  return adFor !== null && !gate?.released ? before : state;
}
