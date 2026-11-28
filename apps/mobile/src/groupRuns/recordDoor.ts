import { useEffect, useRef } from "react";

import { runControl } from "../navigation/runControl";
import { ALL_SPORTS, runActivityOf, saveSport, type Sport } from "../settings/sport";

/**
 * «Start» of a group outing without a route (TASK-495 part C2,
 * docs/GRUPPI.md §6): the recording of its sport, without a route. The page
 * of the outing asks here; the door chooses the sport as «Settings» would
 * and `App` opens the recording, as «Record your day» does on «Draw». A run
 * already going on is never cut short: the request is dropped.
 */

/** One request: a new object each time. */
type AskedRecord = { readonly sport: Sport };

let asked: AskedRecord | null = null;
const listeners = new Set<() => void>();

/** The sport an outing's activity is recorded as, or null for one this
 * app does not know or has no recording of (the gym, the stretching). */
export function sportOfActivity(activity: string): Sport | null {
  const sport = ALL_SPORTS.find((one) => runActivityOf(one.id) === activity);
  if (sport === undefined || sport.id === "gym" || sport.id === "stretch") {
    return null;
  }
  return sport.id;
}

/** Asks the app to record `activity` without a route; false when it cannot
 * (a sport it does not know, a run already going on). */
export function askRecord(activity: string): boolean {
  const sport = sportOfActivity(activity);
  if (sport === null || runControl().phase !== "idle") {
    return false;
  }
  saveSport(sport);
  asked = { sport };
  listeners.forEach((listener) => listener());
  return true;
}

/** For the tests: what is asked and not taken yet. */
export function askedRecord(): AskedRecord | null {
  return asked;
}

/**
 * `App`'s side: `onAsked` with the sport of each request, once. The sport
 * is already chosen when it is called.
 */
export function useRecordAsked(onAsked: (sport: Sport) => void): void {
  const latest = useRef(onAsked);
  useEffect(() => {
    latest.current = onAsked;
  }, [onAsked]);
  useEffect(() => {
    const take = () => {
      const request = asked;
      if (request !== null) {
        asked = null;
        latest.current(request.sport);
      }
    };
    listeners.add(take);
    take();
    return () => {
      listeners.delete(take);
    };
  }, []);
}
