import { useSyncExternalStore } from "react";

/**
 * The pages of a run in progress (TASK-169, ADR-0137; three since TASK-422,
 * ADR-0350), in the order they lie in: «Compass», the map alone turned where
 * the phone points; «Map», the map with the turn and a few numbers; «Data»,
 * every number and no map. Which one is open is kept here, one run at a
 * time as the run's controls (runControl): the card sets it, and the map,
 * which lives above the card in App.tsx, reads it to turn heading-up.
 */

export type RunPage = "compass" | "map" | "data";

/** Left to right. */
export const RUN_PAGES: readonly RunPage[] = ["compass", "map", "data"];

/** The page a run opens on. */
export const FIRST_PAGE: RunPage = "map";

/** A finger that moved this far sideways, and less up or down, is a swipe. */
export const SWIPE_M = 48;

/** The page to the right of `page`, or null at the end. */
export function pageAfter(page: RunPage): RunPage | null {
  return RUN_PAGES[RUN_PAGES.indexOf(page) + 1] ?? null;
}

/** The page to the left of `page`, or null at the start. */
export function pageBefore(page: RunPage): RunPage | null {
  return RUN_PAGES[RUN_PAGES.indexOf(page) - 1] ?? null;
}

/**
 * The page a drag of (`dx`, `dy`) points from `from` asks for, or null: a
 * swipe to the left shows the page on the right, one to the right the page
 * on the left, one page at a time; past the ends, nothing.
 */
export function swipedTo(
  dx: number,
  dy: number,
  from: RunPage = FIRST_PAGE,
): RunPage | null {
  if (Math.abs(dx) < SWIPE_M || Math.abs(dx) < 2 * Math.abs(dy)) {
    return null;
  }
  return dx < 0 ? pageAfter(from) : pageBefore(from);
}

let page: RunPage = FIRST_PAGE;

const listeners = new Set<() => void>();

export function runPage(): RunPage {
  return page;
}

export function setRunPage(next: RunPage): void {
  if (next === page) {
    return;
  }
  page = next;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeRunPage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The page open, for a screen: it is drawn again when it changes. */
export function useRunPage(): RunPage {
  return useSyncExternalStore(subscribeRunPage, runPage, runPage);
}
