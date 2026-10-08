import { t, tLater } from "../i18n";

/** The three pages side by side, in their order (docs/UI.md). */
export type PageName = "feed" | "draw" | "explore";

/** Their names in the header, in English (TASK-210): `pageTitle` translates. */
const TITLES: Readonly<Record<PageName, string>> = {
  feed: tLater("Feed"),
  draw: tLater("Draw"),
  explore: tLater("Explore"),
};

/** The name of a page as the header shows it, in the app's language. */
export function pageTitle(page: PageName): string {
  return t(TITLES[page]);
}
