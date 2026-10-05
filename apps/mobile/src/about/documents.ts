import type { Language } from "../i18n/languages";
import { EN } from "./content/en";
import { IT } from "./content/it";

/**
 * The three texts under «ABOUT» in «Settings» (TASK-184, ADR-0205): the
 * mini guide and the first drafts of the terms and of the privacy text.
 *
 * They are long texts, so they do not go through `t()`, whose key is the
 * English text itself: each language has its own file in `content/`, and
 * a language without one reads the English.
 */
export type AboutId = "help" | "terms" | "privacy";

export const ABOUT_IDS: readonly AboutId[] = ["help", "terms", "privacy"];

/** A paragraph, or a list of short points. */
export type AboutBlock = string | { readonly bullets: readonly string[] };

export type AboutSection = {
  readonly heading: string;
  readonly blocks: readonly AboutBlock[];
};

export type AboutDocument = {
  /** The text's own name, over it: longer than the row that opens it. */
  readonly title: string;
  /**
   * A draft is not approved yet: the page says so before anything else, and
   * shows `updated`. The user approves the legal texts, not the agent.
   */
  readonly draft: boolean;
  /** The day of the last change, written as the language writes it. */
  readonly updated: string | null;
  readonly sections: readonly AboutSection[];
};

export type AboutContent = Readonly<Record<AboutId, AboutDocument>>;

/**
 * What the drafts leave for the user to fill before approving them, written
 * the same in every language so that it is found at a glance: who runs
 * Sgrava, where to write, and which law governs the terms.
 */
export const PLACEHOLDER = {
  name: "[name]",
  contact: "[contact email]",
  law: "[governing law]",
} as const;

/** Anything between square brackets is still to fill: the page marks it. */
export const PLACEHOLDER_PATTERN = /(\[[^\]]+\])/;

/** German, Spanish and French come after the drafts are approved. */
const CONTENT: Partial<Record<Language, AboutContent>> = { en: EN, it: IT };

/** The language the texts are read in with the app in `language`. */
export function aboutLanguage(language: Language): Language {
  return CONTENT[language] === undefined ? "en" : language;
}

/** The text `id` in `language`, or in English when the language has none. */
export function aboutDocument(id: AboutId, language: Language): AboutDocument {
  return (CONTENT[language] ?? EN)[id];
}

export function isAboutId(value: string): value is AboutId {
  return (ABOUT_IDS as readonly string[]).includes(value);
}
