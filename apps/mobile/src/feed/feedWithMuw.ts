import type { MuwRoute } from "@shaperoute/shared-types";

import { adSlots, type FeedItem } from "./feedWithAds";
import type { StyleItem } from "./feedWithStyle";

/**
 * Where the routes MuW drew go in «All» (TASK-365, ADR-0310; the user's
 * choice of 2026-11-05, «1 ogni 6», also without an account, among the
 * examples): the first after the 3rd drawing, then one row in 6 at most,
 * only between two posts. A place an ad or a MuW Style post takes moves one
 * drawing down, so two of ours are never side by side. Never in «Following».
 */

/** Drawings above the first MuW route. */
export const MUW_FIRST = 3;

/** Rows between the start of two MuW routes: 5 drawings, then one. */
export const MUW_EVERY = 6;

/** A MuW route in the list, with its place among them. */
export type MuwItem = { kind: "muw"; route: MuwRoute; slot: number };

/**
 * The places for MuW routes in a list of `posts` drawings, as the number of
 * drawings above each: after the 3rd, the 8th… A place in `taken` (an ad's,
 * a Style post's) moves one drawing down, until one is free.
 */
export function muwSlots(
  posts: number,
  taken: ReadonlySet<number> = new Set(),
): number[] {
  const slots: number[] = [];
  let after = MUW_FIRST;
  while (after < posts) {
    let place = after;
    while (taken.has(place)) {
      place += 1;
    }
    if (place >= posts) {
      break;
    }
    slots.push(place);
    // The next counts from this one: never nearer than 5 drawings.
    after = place + MUW_EVERY - 1;
  }
  return slots;
}

/**
 * The rows of «All» with the MuW routes there are: `routes[i]` to slot `i`.
 * The ads' places count as taken whether their ad came or not, as for the
 * Style posts, so that a route does not move when one comes.
 */
export function feedWithMuw<P, A>(
  rows: readonly (FeedItem<P, A> | StyleItem)[],
  routes: readonly MuwRoute[],
): (FeedItem<P, A> | StyleItem | MuwItem)[] {
  if (routes.length === 0) {
    return [...rows];
  }
  const posts = rows.filter((row) => row.kind === "post").length;
  const taken = new Set(adSlots(posts));
  let above = 0;
  for (const row of rows) {
    if (row.kind === "post") {
      above = row.index + 1;
    } else if (row.kind === "style") {
      taken.add(above);
    }
  }
  const slots = muwSlots(posts, taken);
  const out: (FeedItem<P, A> | StyleItem | MuwItem)[] = [];
  let next = 0;
  for (const row of rows) {
    out.push(row);
    if (
      row.kind === "post" &&
      next < slots.length &&
      next < routes.length &&
      row.index + 1 === slots[next]
    ) {
      out.push({ kind: "muw", route: routes[next], slot: next });
      next += 1;
    }
  }
  return out;
}
