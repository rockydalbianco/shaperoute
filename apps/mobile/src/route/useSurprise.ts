import type { Activity, LatLon } from "@shaperoute/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiKey, keyHeaders } from "../api/apiUrl";
import { isImageRequest } from "../api/routes";
import { isRecommendedList, recommendedUrl } from "../explore/recommendedRoutes";
import { appUnits, type Units } from "../units/units";
import { useUnits } from "../units/useUnits";
import { choicesOf } from "./choices";
import { offeredDistanceM } from "./distance";
import {
  GOOD_SIMILARITY,
  keepPoor,
  poorFrom,
  surpriseFile,
  type SurpriseStorage,
} from "./surpriseKept";
import {
  hasSurprise,
  type NearbyRoute,
  surpriseDistancesM,
  type SurprisePick,
  surprisePick,
} from "./surprisePick";
import type { RouteState } from "./useRouteRequest";

/**
 * «Surprise me» for «Draw» (TASK-448, ADR-0413): a tap on the pill gives a
 * shape and a distance, which «Draw» writes in its page; nothing is drawn
 * until «Draw route» (the user's choice of 2026-11-26, «Riempie e
 * aspetta»).
 *
 * The routes of the catalogue near the start are asked at the first tap,
 * not before: who never taps asks nothing. It is the request of «Explore»
 * (GET /recommended-routes, the start rounded to about a kilometre), with
 * a radius of its own, and its answer stands for NEARBY_FRESH_MS. When it
 * does not come within NEARBY_WAIT_MS the pill answers with a spare shape.
 */

/** How far from the start a route of the catalogue is still «here»: a
 * city's routes start within a kilometre of its centre, and its outskirts
 * are the same streets. */
export const SURPRISE_RADIUS_M = 10_000;
/** A list stands this long, as the one «Explore» prepares (LIST_FRESH_MS). */
export const NEARBY_FRESH_MS = 10 * 60_000;
/** How long a tap waits for the list before a spare shape. */
export const NEARBY_WAIT_MS = 2500;

// The routes near each start, by what was asked, and when.
const lists = new Map<string, { routes: NearbyRoute[]; at: number }>();

/** For tests: no list kept. */
export function forgetSurpriseNearby(): void {
  lists.clear();
}

type FetchOptions = {
  fetchFn?: typeof fetch;
  key?: string | null;
  waitMs?: number;
  now?: () => number;
};

/** What is asked for the routes near `start`: the address is also the key
 * of the list, the same rounded point and the same drawings. */
function nearbyUrl(apiUrl: string, start: LatLon, activity: Activity): string {
  return recommendedUrl(apiUrl, start, SURPRISE_RADIUS_M, activity);
}

/** The list kept for `start` and `activity`, while it is fresh. */
export function knownSurpriseNearby(
  apiUrl: string,
  start: LatLon,
  activity: Activity,
  now: number = Date.now(),
): NearbyRoute[] | undefined {
  const kept = lists.get(nearbyUrl(apiUrl, start, activity));
  return kept !== undefined && now - kept.at < NEARBY_FRESH_MS
    ? kept.routes
    : undefined;
}

/**
 * The routes of the catalogue near `start` for `activity`, as shapes and
 * distances: the list kept while it is fresh, or asked now. Null when the
 * API does not answer in time or answers something else: not kept, so the
 * next tap asks again. Never throws.
 */
export async function surpriseNearby(
  apiUrl: string,
  start: LatLon,
  activity: Activity,
  {
    fetchFn = fetch,
    key = apiKey(),
    waitMs = NEARBY_WAIT_MS,
    now = Date.now,
  }: FetchOptions = {},
): Promise<NearbyRoute[] | null> {
  const known = knownSurpriseNearby(apiUrl, start, activity, now());
  if (known !== undefined) {
    return known;
  }
  const url = nearbyUrl(apiUrl, start, activity);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), waitMs);
  try {
    const response = await fetchFn(url, {
      headers: keyHeaders(key),
      signal: controller.signal,
    });
    const body: unknown = await response.json();
    if (!response.ok || !isRecommendedList(body)) {
      return null;
    }
    const routes = body.routes.map(({ shape, distance_m }) => ({ shape, distance_m }));
    lists.set(url, { routes, at: now() });
    return routes;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * What a route request's end says of a pair of «Surprise me»: the start
 * and the pair, when a shape of the catalogue asked at one of the sport's
 * surprise distances came out poorly: no route of the whole answer at
 * GOOD_SIMILARITY, or the engine refused the shape there. Null for every
 * other end, and while the other routes are still coming (TASK-435): one of
 * them may be the good one. Whoever chose the pair, the pill or the user:
 * what did not come out from here is not offered from here.
 */
export function poorPickOf(state: RouteState): {
  start: LatLon;
  pick: SurprisePick;
} | null {
  if (state.status !== "done" && state.status !== "failed") {
    return null;
  }
  const { request } = state;
  if (
    isImageRequest(request) ||
    request.shape == null ||
    request.pen_up === true ||
    (request.placement ?? "free") !== "free" ||
    !hasSurprise(request.activity)
  ) {
    return null;
  }
  const poor =
    state.status === "done"
      ? state.more !== true &&
        choicesOf(state.result).every((route) => route.similarity < GOOD_SIMILARITY)
      : state.problem.kind === "api_error" &&
        state.problem.code === "shape_not_drawable";
  if (!poor) {
    return null;
  }
  // The distance as the pill asks it: in km, or with «Miles» the whole mile.
  const distanceM = surpriseDistancesM(request.activity).find(
    (metres) =>
      metres === request.distance_m ||
      offeredDistanceM(metres, request.activity, "mi") === request.distance_m,
  );
  return distanceM === undefined
    ? null
    : { start: request.start, pick: { shape: request.shape, distanceM } };
}

/** The pick as «Draw» asks for it: its metres in km; with «Miles» the
 * nearest whole mile (5 km are 3 mi), as every distance the app offers. */
export function offeredPick(
  pick: SurprisePick,
  activity: Activity,
  units: Units = appUnits(),
): SurprisePick {
  return { ...pick, distanceM: offeredDistanceM(pick.distanceM, activity, units) };
}

export type SurpriseOptions = {
  /** The API's address; null: none, and the pill answers with spare shapes. */
  apiUrl: string | null;
  /** The start chosen in «Draw»; null: none yet. */
  start: LatLon | null;
  activity: Activity;
  /** The route request of «Draw»: what came out teaches the pill. */
  state: RouteState;
  /** The shape and the distance to write in «Draw». */
  onPick: (pick: SurprisePick) => void;
  storage?: SurpriseStorage;
  random?: () => number;
  fetchFn?: typeof fetch;
  key?: string | null;
  waitMs?: number;
  now?: () => number;
};

export type Surprise = {
  /** A tap on the pill. Nothing while the one before is still asking. */
  surprise: () => void;
  /** The routes near are being asked: the pill waits. */
  busy: boolean;
};

/**
 * The pill of «Draw» for `activity`; null for a sport without it. Each tap
 * gives another pair than the one before, and never one that came out
 * poorly from this start.
 */
export function useSurprise({
  apiUrl,
  start,
  activity,
  state,
  onPick,
  storage = surpriseFile,
  random = Math.random,
  fetchFn,
  key,
  waitMs,
  now,
}: SurpriseOptions): Surprise | null {
  const units = useUnits();
  // The pick of the tap before, as the catalogue says it (in km).
  const previous = useRef<SurprisePick | null>(null);
  const lat = start?.[0];
  const lon = start?.[1];
  // What the page asks about now: a tap that waits belongs to one start and
  // one sport, and its answer is let go when the page has moved on.
  const page = `${apiUrl} ${lat},${lon} ${activity}`;
  const [waiting, setWaiting] = useState<string | null>(null);
  const shown = useRef(page);
  useEffect(() => {
    shown.current = page;
  }, [page]);
  const busy = waiting === page;

  // What came out poorly from a start is kept for the next taps.
  useEffect(() => {
    const poor = poorPickOf(state);
    if (poor !== null) {
      keepPoor(poor.start, poor.pick, storage);
    }
  }, [state, storage]);

  const surprise = useCallback(() => {
    if (busy || !hasSurprise(activity)) {
      return;
    }
    const from: LatLon | null =
      lat === undefined || lon === undefined ? null : [lat, lon];
    const give = (nearby: readonly NearbyRoute[]) => {
      const pick = surprisePick({
        activity,
        nearby,
        previous: previous.current,
        avoid: from === null ? [] : poorFrom(from, storage),
        random,
      });
      if (pick !== null) {
        previous.current = pick;
        onPick(offeredPick(pick, activity, units));
      }
    };
    if (apiUrl === null || from === null) {
      give([]);
      return;
    }
    // The list already here: the pick at once, as every tap after the first.
    const known = knownSurpriseNearby(apiUrl, from, activity, (now ?? Date.now)());
    if (known !== undefined) {
      give(known);
      return;
    }
    setWaiting(page);
    void surpriseNearby(apiUrl, from, activity, { fetchFn, key, waitMs, now }).then(
      (routes) => {
        setWaiting((still) => (still === page ? null : still));
        if (shown.current === page) {
          give(routes ?? []);
        }
      },
    );
  }, [
    busy,
    activity,
    lat,
    lon,
    apiUrl,
    page,
    storage,
    random,
    onPick,
    units,
    fetchFn,
    key,
    waitMs,
    now,
  ]);

  return hasSurprise(activity) ? { surprise, busy } : null;
}
