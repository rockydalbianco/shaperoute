import type { SleepSummary } from "@shaperoute/shared-types";
import { useSyncExternalStore } from "react";

import { sleepSummaryOf } from "../api/sleep";
import { sleepPostsOn } from "./sleepModules";

/**
 * The night a post shows, as the app knows it now (TASK-467 part B2): the
 * one the list of posts carries (`sleep` of the drawing), until its owner
 * turns «Sleep last night» on or off in the post's settings; then what was
 * just chosen, at once, in the card of «Feed» and on the page of the post,
 * without asking the list again.
 */

/** By the drawing's id: the night its owner shows now, or null once hidden. */
const told = new Map<string, SleepSummary | null>();
const listeners = new Set<() => void>();

/** The owner turned «Sleep last night» on (`sleep`) or off (null). */
export function tellSleepNow(drawingId: string, sleep: SleepSummary | null): void {
  told.set(drawingId, sleep);
  listeners.forEach((listener) => listener());
}

/** For the tests: what was told is forgotten. */
export function forgetSleepNow(): void {
  told.clear();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The night to show in the post `drawingId`, whose list said `listed`
 * (unknown: read as a night here, so an answer that is not one shows
 * nothing). Null without one, and always while the sleep in a post is off
 * (`sleepPostsOn`).
 */
export function useSleepOf(drawingId: string, listed: unknown): SleepSummary | null {
  const now = useSyncExternalStore(subscribe, () => told.get(drawingId));
  if (!sleepPostsOn()) {
    return null;
  }
  return now === undefined ? sleepSummaryOf(listed) : now;
}
