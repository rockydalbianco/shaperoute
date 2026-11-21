import { useEffect, useRef } from "react";
import { Linking } from "react-native";

import type { Account } from "../account/useAccount";
import { postLinkIn } from "./postLinkIn";

/** The phone hands the address that opened the app both as the first one
 * and as one that arrives: the same post twice within this is one. */
export const SAME_LINK_MS = 3000;

// The address the app was opened with, read once while the app is open:
// a hook mounted again must not open that post a second time.
let first: Promise<string | null> | null = null;
let firstGiven = false;
let last: { id: string; at: number } | null = null;

/** As when the app has just started; for the tests. */
export function forgetPostLinkIn(): void {
  first = null;
  firstGiven = false;
  last = null;
}

/**
 * Calls `listener` with the post of each link of a post handed to the app
 * from now on (TASK-482 part A), and of the one that opened the app, if
 * any; each one once. Addresses that are not the link of a post are left
 * alone. The returned function stops it.
 */
export function onPostLinkIn(listener: (id: string) => void): () => void {
  let stopped = false;
  const give = (id: string | null): boolean => {
    if (stopped || id === null) {
      return false;
    }
    const now = Date.now();
    if (last !== null && last.id === id && now - last.at < SAME_LINK_MS) {
      return false;
    }
    last = { id, at: now };
    listener(id);
    return true;
  };
  const subscription = Linking.addEventListener("url", (event) => {
    give(postLinkIn(event?.url));
  });
  first ??= Linking.getInitialURL().then(postLinkIn, () => null);
  void first.then((id) => {
    if (!stopped && !firstGiven) {
      firstGiven = true;
      give(id);
    }
  });
  return () => {
    stopped = true;
    subscription.remove();
  };
}

/**
 * The link of a post opened in the app (TASK-482 part A, ADR-0391): its
 * drawing is shown as the one of a notification touched is, fetched whole
 * by `openDrawing` — the API says whether it exists and who may see it.
 *
 * Only with an account: the link waits for one, as the app, just opened,
 * is still reading who is signed in.
 */
export function useIncomingPostLink(
  account: Pick<Account, "state">,
  openDrawing: (id: string) => void,
): void {
  const signedIn = account.state.status === "signedIn";
  // The link that waits for an account; the last one that arrived.
  const waiting = useRef<string | null>(null);
  // The latest of what a link that arrives needs: the door of when it
  // started listening may be an old one.
  const latest = useRef({ openDrawing, signedIn });
  useEffect(() => {
    latest.current = { openDrawing, signedIn };
  });

  useEffect(
    () =>
      onPostLinkIn((id) => {
        if (latest.current.signedIn) {
          latest.current.openDrawing(id);
        } else {
          waiting.current = id;
        }
      }),
    [],
  );

  useEffect(() => {
    const id = waiting.current;
    if (id === null || !signedIn) {
      return;
    }
    waiting.current = null;
    latest.current.openDrawing(id);
  }, [signedIn]);
}
