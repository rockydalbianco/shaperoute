/** The languages the app is written in (TASK-210, ADR-0172). */
export type Language = "en" | "de" | "it" | "es" | "fr";

export type LanguageOption = {
  id: Language;
  /** In its own language, so it is found by who reads it: «Deutsch». */
  name: string;
  /** What the phone's speech is asked for, for the voice (TASK-209). */
  speech: string;
};

/** The languages of «Settings», in the order the user gave them. */
export const LANGUAGES: readonly LanguageOption[] = [
  { id: "en", name: "English", speech: "en-US" },
  { id: "de", name: "Deutsch", speech: "de-DE" },
  { id: "it", name: "Italiano", speech: "it-IT" },
  { id: "es", name: "Español", speech: "es-ES" },
  { id: "fr", name: "Français", speech: "fr-FR" },
];

/**
 * The language the code is written in: every text is first written in it,
 * and a text with no translation is shown in it (ADR-0172).
 */
export const BASE_LANGUAGE: Language = "en";

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((option) => option.id === value);
}

/** The option of `language`, for its name and its speech. */
export function languageOption(language: Language): LanguageOption {
  return LANGUAGES.find((option) => option.id === language) ?? LANGUAGES[0];
}

/**
 * The app's language for a phone's language tag («it-IT», «de_CH»,
 * «es-419», «fr»), or null when the app is not written in it.
 */
export function languageOfTag(tag: unknown): Language | null {
  if (typeof tag !== "string") {
    return null;
  }
  const code = tag.split(/[-_]/)[0].toLowerCase();
  return isLanguage(code) ? code : null;
}
