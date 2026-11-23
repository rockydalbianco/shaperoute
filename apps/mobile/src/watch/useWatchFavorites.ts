import type { Direction, LatLon } from "@shaperoute/shared-types";
import { useEffect, useRef } from "react";

import {
  type Favorite,
  type FavoriteDetail,
  favoriteActivity,
  fetchFavorite,
} from "../api/favorites";
import { requestDirections } from "../api/routeDirections";
import { favoriteTitle } from "../favorites/favoriteRoute";
import type { KeptList } from "../storage/keptList";
import { isPlacedFree } from "../snow/snow";
import { type WatchLink, watchLink } from "./watchLink";
import { watchRouteOf } from "./watchRoute";
import { watchSent } from "./watchSent";

/**
 * The favorites on the Apple Watch by themselves (TASK-370 part B3a2, the
 * user's choice «Pulsante e preferiti»): every favorite of the account goes
 * to the watch, to be followed there without the phone, and one taken out
 * of the favorites is let go of there. A favorite has no directions, so each
 * is fetched whole and its directions asked for, as a run does at its start;
 * none on the water.
 *
 * One at a time: a favorite is fetched, its directions asked for and its
 * route handed to WatchConnectivity before the next, and a sync never runs
 * beside another (a change during one runs one more after it). Without the
 * network the sync stops where it is: what went is kept (watchSent.ts), and
 * the rest goes at the next change or the next opening of the app.
 */

/** What a sync needs from the world. */
export type SyncDoors = {
  link: WatchLink;
  /** The favorite whole; null when it did not come (no network, an error). */
  detail: (key: string) => Promise<FavoriteDetail | null>;
  /** The directions along the points; null when they did not come. */
  directions: (points: LatLon[]) => Promise<readonly Direction[] | null>;
  now: () => number;
  /** The keys sent, written after each, so a stop keeps what went. */
  saveSent: (keys: string[]) => void;
};

/**
 * Sends to the watch the favorites `keys` it does not have, one at a time,
 * and then the keys of all the favorites. `sent` are the keys sent before.
 * Returns the keys sent now, the ones still favorites, in order.
 */
export async function syncFavorites(
  keys: readonly string[],
  sent: readonly string[],
  doors: SyncDoors,
): Promise<string[]> {
  const favorites = new Set(keys);
  const had = sent.filter((key) => favorites.has(key));
  const done = new Set(had);
  let changed = had.length !== sent.length;
  const keep = () => doors.saveSent(keys.filter((key) => done.has(key)));
  for (const key of keys) {
    if (done.has(key)) {
      continue;
    }
    const detail = await doors.detail(key);
    if (detail === null) {
      break;
    }
    const activity = favoriteActivity(detail);
    // No turns on the water or the snow (TASK-413 B).
    const directions = isPlacedFree(activity)
      ? []
      : await doors.directions(detail.points);
    if (directions === null) {
      break;
    }
    const route = watchRouteOf({
      key,
      title: favoriteTitle(detail),
      activity,
      distanceM: detail.route_m,
      points: detail.points,
      directions,
      walks: detail.walks ?? null,
      word: detail.word,
      similarity: detail.similarity,
    });
    // A route the watch cannot keep is not tried again: it never will.
    if (route !== null) {
      doors.link.transfer({ type: "route", route, favorite: true, at: doors.now() });
    }
    done.add(key);
    changed = true;
    keep();
  }
  if (changed) {
    keep();
    doors.link.transfer({ type: "routes", favorites: [...keys], at: doors.now() });
  }
  return keys.filter((key) => done.has(key));
}

type Options = {
  link?: WatchLink | null;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
  store?: KeptList<string>;
  now?: () => number;
};

/**
 * The favorites of `list` sent to the watch whenever they change, with a
 * watch paired that has the app and an account signed in (`token`).
 */
export function useWatchFavorites(
  baseUrl: string | null,
  token: string | null,
  list: readonly Favorite[],
  {
    link = watchLink(),
    fetchFn,
    apiKey,
    store = watchSent(),
    now = Date.now,
  }: Options = {},
): void {
  const running = useRef(false);
  const again = useRef(false);
  const keys = list.map((favorite) => favorite.id);
  const keysText = keys.join(" ");
  // What a sync reads when it starts: the last list, also for the one run
  // again after a change that came while another ran.
  const latest = useRef({ keys, baseUrl, token });
  useEffect(() => {
    latest.current = { keys, baseUrl, token };
  });

  useEffect(() => {
    if (link === null || baseUrl === null || token === null) {
      return;
    }
    const watch = link;
    async function run(): Promise<void> {
      if (running.current) {
        again.current = true;
        return;
      }
      running.current = true;
      try {
        const last = latest.current;
        if (last.baseUrl !== null && last.token !== null && (await watch.ready())) {
          const url = last.baseUrl;
          const session = last.token;
          await syncFavorites(last.keys, store.load(), {
            link: watch,
            detail: async (key) => {
              const outcome = await fetchFavorite(url, session, key, {
                fetchFn,
                key: apiKey,
              });
              return outcome.kind === "ok" ? outcome.value : null;
            },
            directions: async (points) => {
              const outcome = await requestDirections(url, points, {
                fetchFn,
                key: apiKey,
              });
              return outcome.kind === "directions" ? outcome.directions : null;
            },
            now,
            saveSent: (sent) => {
              store.save(sent);
            },
          });
        }
      } finally {
        running.current = false;
      }
      if (again.current) {
        again.current = false;
        await run();
      }
    }
    void run();
    // The keys as text: a new list of the same favorites is no change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link, baseUrl, token, keysText]);
}
