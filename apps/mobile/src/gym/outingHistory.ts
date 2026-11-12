import type { RunActivity } from "@shaperoute/shared-types";

import type { AccountOutcome } from "../api/accounts";
import type { ActivitiesPage } from "../api/activities";
import type { TargetSport } from "./targetWeeks";

/**
 * Where one is today, from what one did (TASK-461 B and C, ADR-0371; the
 * user's approved words: «Il più lungo che hai fatto nell'ultimo mese senza
 * fermarti. Già scritto dalle tue corse: 6,2 km il 3 novembre», «La più
 * lunga dell'ultimo mese, in un'uscita sola. Già scritto dai tuoi hike: 452
 * m il 26 ottobre»). Read from the list of «My activities».
 */

/** The last month. */
export const HISTORY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A saved activity as the list of «My activities» has it. `climb_m` is
 * read when the list says it, which today's API does not: then a hike's
 * climb is asked, not written. */
export type SavedOuting = {
  started_at: string;
  distance_m: number;
  activity?: RunActivity | string;
  climb_m?: number | null;
};

/** The activities that say where one is in a target's sport: on foot a
 * walk and a hike, on a bike any bike. A run is a run (an activity of an
 * API older than TASK-251 too). */
export const ACTIVITIES_OF: Readonly<Record<TargetSport, readonly RunActivity[]>> = {
  run: ["running"],
  walk: ["walking", "hiking"],
  hike: ["walking", "hiking"],
  bike: ["cycling", "gravel_biking", "mountain_biking"],
  gravel: ["cycling", "gravel_biking", "mountain_biking"],
  mtb: ["cycling", "gravel_biking", "mountain_biking"],
  swim: ["swimming"],
  paddle: ["paddling"],
};

/** The best of the last month: how much, and when it began. */
export type Best = { metres: number; started_at: string };

function inLastMonth(outing: SavedOuting, now: Date): boolean {
  const at = new Date(outing.started_at).getTime();
  return at <= now.getTime() && at >= now.getTime() - HISTORY_DAYS * DAY_MS;
}

function isOf(outing: SavedOuting, sport: TargetSport): boolean {
  const activity = outing.activity ?? "running";
  return (ACTIVITIES_OF[sport] as readonly string[]).includes(activity);
}

function bestOf(
  outings: readonly SavedOuting[],
  measure: (outing: SavedOuting) => number | null,
): Best | null {
  let best: Best | null = null;
  for (const outing of outings) {
    const metres = measure(outing);
    if (metres !== null && metres > 0 && (best === null || metres > best.metres)) {
      best = { metres, started_at: outing.started_at };
    }
  }
  return best;
}

/** The longest of the last month in `sport`; null without one. */
export function longestOf(
  outings: readonly SavedOuting[],
  sport: TargetSport,
  now: Date,
): Best | null {
  return bestOf(
    outings.filter((one) => isOf(one, sport) && inLastMonth(one, now)),
    (one) => one.distance_m,
  );
}

/** The most climb of the last month in one hike; null without one, or
 * when the list says no climb. */
export function mostClimbOf(outings: readonly SavedOuting[], now: Date): Best | null {
  return bestOf(
    outings.filter((one) => one.activity === "hiking" && inLastMonth(one, now)),
    (one) => (typeof one.climb_m === "number" ? one.climb_m : null),
  );
}

/** At most this many pages are read: a month is in the first ones. */
export const MAX_PAGES = 5;

/**
 * The activities of the last month, read page by page from the newest
 * until one is older than a month; what was read when a page fails.
 */
export async function lastMonthOutings(
  fetchPage: (cursor: string | null) => Promise<AccountOutcome<ActivitiesPage>>,
  now: Date,
): Promise<SavedOuting[]> {
  const since = now.getTime() - HISTORY_DAYS * DAY_MS;
  const read: SavedOuting[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const outcome = await fetchPage(cursor);
    if (outcome.kind !== "ok") {
      break;
    }
    read.push(...outcome.value.activities);
    const oldest = outcome.value.activities.at(-1);
    if (
      outcome.value.next === null ||
      oldest === undefined ||
      new Date(oldest.started_at).getTime() < since
    ) {
      break;
    }
    cursor = outcome.value.next;
  }
  return read.filter((one) => new Date(one.started_at).getTime() >= since);
}
