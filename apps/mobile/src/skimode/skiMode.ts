import type { Sport } from "../settings/sport";

/**
 * The ski mode (TASK-429, ADR-0357): with «Ski» chosen, MuW is an app for
 * skiing. Nothing new is kept for it: the mode is the sport already saved
 * (saveSport), so choosing another sport brings the app back as always.
 */
export function isSkiMode(sport: Sport): boolean {
  return sport === "ski";
}

/** A page of the tab bar, as the app names its screens. */
export type BarPage =
  "feed" | "choose" | "messages" | "explore" | "profile" | "skiDays" | "skiResorts";

/** The pages of the app as always: Feed, Draw, Messages, Explore, Profile. */
export const APP_PAGES: readonly BarPage[] = [
  "feed",
  "choose",
  "messages",
  "explore",
  "profile",
];

/**
 * The pages of the ski mode: Today, Days, Resorts, Feed, Profile. «Today»
 * is the page «choose» of the app: every way back to «Draw» (the end of a
 * day, «Discard») lands on it with nothing else changed. «Messages» has no
 * tab here: it opens from its button in the header.
 */
export const SKI_PAGES: readonly BarPage[] = [
  "choose",
  "skiDays",
  "skiResorts",
  "feed",
  "profile",
];

/** The pages of the tab bar for `sport`. */
export function barPagesOf(sport: Sport): readonly BarPage[] {
  return isSkiMode(sport) ? SKI_PAGES : APP_PAGES;
}

/**
 * Where the app goes when the mode changes under it: entering the ski mode
 * opens «Today»; leaving it, a page the app has no more («Days», «Resorts»)
 * goes to «Draw». Any other page stays where it is. Null: nothing to do.
 */
export function pageAfterModeChange(
  page: string,
  wasSki: boolean,
  isSki: boolean,
): BarPage | null {
  if (wasSki === isSki) {
    return null;
  }
  if (isSki) {
    return page === "choose" ? null : "choose";
  }
  return page === "skiDays" || page === "skiResorts" ? "choose" : null;
}

/**
 * The pages of the tab bar for `sport`, built from the app's own five (in
 * APP_PAGES' order) and the ski mode's own: «Today» (on «choose»), «Days»
 * and «Resorts». In the ski mode the others, «Feed» and «Profile», are the
 * app's as they are.
 */
export function shellPagesOf<P>(
  sport: Sport,
  appPages: readonly P[],
  skiOwn: { choose: P; skiDays: P; skiResorts: P },
): readonly P[] {
  if (!isSkiMode(sport)) {
    return appPages;
  }
  return SKI_PAGES.map((page) =>
    page === "choose" || page === "skiDays" || page === "skiResorts"
      ? skiOwn[page]
      : appPages[APP_PAGES.indexOf(page)],
  );
}
