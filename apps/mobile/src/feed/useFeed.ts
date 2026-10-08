import type { FeedPost, LatLon } from "@shaperoute/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { sessionEnded } from "../account/messages";
import { fetchFeed } from "../api/feed";
import { useFollowsDoor } from "../social/followsDoor";

/** What «Feed» has of the drawings the members publish. */
export type FeedShown =
  /** The first page is on its way. */
  | { kind: "loading" }
  /** The pages read so far; `next` while there are more. */
  | { kind: "ready"; posts: FeedPost[]; next: string | null }
  /** Nobody signed in, an API without a feed, or an answer that did not
   * come: the examples take the place of the drawings. */
  | { kind: "off" };

export type Feed = {
  shown: FeedShown;
  /** An account is signed in and the API is known: a pull reads again. */
  signedIn: boolean;
  /** The first page is being read again, on a pull. */
  refreshing: boolean;
  /** Reads the first page again, from where the phone is now. */
  refresh: () => void;
  /** Reads the next page, when there is one and none is on its way. */
  more: () => void;
};

const OFF: FeedShown = { kind: "off" };
const LOADING: FeedShown = { kind: "loading" };

type Options = { fetchFn?: typeof fetch; key?: string | null };

/**
 * The feed of the account (TASK-118, ADR-0227): the drawings it may see,
 * its own first, then those of the people it follows, then the others'
 * near the phone, read a page at a time from the API once «Feed» is on
 * the screen (`active`). Every page of one read is asked from the same
 * point, `near` as it was at the first, so the pages agree; a pull reads
 * again from where the phone is now. Without an account, or when the
 * first page does not come, the feed is off: the page shows its examples.
 */
export function useFeed(
  active: boolean,
  near: LatLon | null,
  options: Options = {},
): Feed {
  const { apiUrl, account } = useFollowsDoor();
  const { state, sessionEnded: endSession } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const { fetchFn, key } = options;
  // What was read, with the token it was read with: another account's
  // feed is not this one's.
  const [read, setRead] = useState<{ token: string; shown: FeedShown } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // The point the pages of this read are asked from.
  const point = useRef<LatLon | null>(null);
  // The request on its way: its answer is the only one kept.
  const asking = useRef(0);
  const loadingMore = useRef(false);
  // The token the first page was asked for: once per account.
  const askedFor = useRef<string | null>(null);

  const first = useCallback(
    (of: string, url: string, from: LatLon | null, pull: boolean) => {
      const request = ++asking.current;
      loadingMore.current = false;
      askedFor.current = of;
      point.current = from;
      if (pull) {
        setRefreshing(true);
      }
      void fetchFeed(url, of, { near: point.current }, { fetchFn, key }).then(
        (outcome) => {
          if (request !== asking.current) {
            return;
          }
          setRefreshing(false);
          if (outcome.kind === "ok") {
            setRead({
              token: of,
              shown: {
                kind: "ready",
                posts: outcome.value.posts,
                next: outcome.value.next,
              },
            });
            return;
          }
          if (sessionEnded(outcome)) {
            endSession(of);
          }
          // A pull that did not come leaves what was there.
          setRead((was) =>
            pull && was !== null && was.token === of ? was : { token: of, shown: OFF },
          );
        },
      );
    },
    [endSession, fetchFn, key],
  );

  useEffect(() => {
    if (!active || token === null || apiUrl === null) {
      return;
    }
    if (askedFor.current === token) {
      return;
    }
    first(token, apiUrl, near, false);
  }, [active, apiUrl, first, near, token]);

  const refresh = useCallback(() => {
    if (token !== null && apiUrl !== null) {
      first(token, apiUrl, near, true);
    }
  }, [apiUrl, first, near, token]);

  const more = useCallback(() => {
    if (
      token === null ||
      apiUrl === null ||
      read === null ||
      read.token !== token ||
      read.shown.kind !== "ready" ||
      read.shown.next === null ||
      loadingMore.current
    ) {
      return;
    }
    const request = asking.current;
    const { next } = read.shown;
    loadingMore.current = true;
    void fetchFeed(
      apiUrl,
      token,
      { cursor: next, near: point.current },
      { fetchFn, key },
    ).then((outcome) => {
      if (request !== asking.current) {
        return;
      }
      loadingMore.current = false;
      if (outcome.kind === "ok") {
        const { posts, next: after } = outcome.value;
        setRead((was) =>
          was !== null && was.token === token && was.shown.kind === "ready"
            ? {
                token,
                shown: {
                  kind: "ready",
                  posts: [...was.shown.posts, ...posts],
                  next: after,
                },
              }
            : was,
        );
        return;
      }
      if (sessionEnded(outcome)) {
        endSession(token);
      }
      // The page did not come: the next pull asks again from the top.
    });
  }, [apiUrl, endSession, fetchFn, key, read, token]);

  const signedIn = token !== null && apiUrl !== null;
  // Nothing read for this account yet: the first page is on its way, or
  // will be as soon as «Feed» is on the screen.
  const shown: FeedShown =
    token !== null && read !== null && read.token === token
      ? read.shown
      : signedIn && active
        ? LOADING
        : OFF;
  return useMemo(
    () => ({ shown, signedIn, refreshing, refresh, more }),
    [shown, signedIn, refreshing, refresh, more],
  );
}
