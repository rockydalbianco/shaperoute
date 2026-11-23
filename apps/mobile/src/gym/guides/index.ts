import type { Language } from "../../i18n/languages";
import { GUIDES_DE } from "./de";
import { GUIDES_EN } from "./en";
import { GUIDES_ES } from "./es";
import { GUIDES_FR } from "./fr";
import { GUIDES_IT } from "./it";
import type { Guide, Guides } from "./types";

export type { Guide, Guides } from "./types";

/** The guides of the catalog in each of the app's languages. */
export const GUIDES: Readonly<Record<Language, Guides>> = {
  en: GUIDES_EN,
  it: GUIDES_IT,
  de: GUIDES_DE,
  fr: GUIDES_FR,
  es: GUIDES_ES,
};

/**
 * How to do the exercise `key` in `language` (TASK-411 part E): three
 * steps and a warning; none for an exercise the user named.
 */
export function guideOf(key: string, language: Language): Guide | null {
  return GUIDES[language][key] ?? null;
}
