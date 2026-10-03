import { I18nManager, Platform, Settings } from "react-native";

import { BASE_LANGUAGE, type Language, languageOfTag } from "./languages";

/**
 * The languages the phone asks apps for, best first: on iOS the list of
 * «Preferred Languages», elsewhere the phone's locale. Empty when the phone
 * does not say (in tests, for one).
 */
export function phoneLanguageTags(): string[] {
  const tags: string[] = [];
  if (Platform.OS === "ios") {
    try {
      const preferred: unknown = Settings.get("AppleLanguages");
      if (Array.isArray(preferred)) {
        tags.push(...preferred.filter((tag): tag is string => typeof tag === "string"));
      }
    } catch {
      // No settings to read: the locale below, if any.
    }
  }
  try {
    const locale: unknown = I18nManager.getConstants().localeIdentifier;
    if (typeof locale === "string") {
      tags.push(locale);
    }
  } catch {
    // Nothing more to read.
  }
  return tags;
}

/**
 * The app's language that comes first among the phone's languages, as iOS
 * picks one for an app; English when the app is written in none of them
 * (ADR-0172).
 */
export function phoneLanguage(tags: readonly string[] = phoneLanguageTags()): Language {
  for (const tag of tags) {
    const language = languageOfTag(tag);
    if (language !== null) {
      return language;
    }
  }
  return BASE_LANGUAGE;
}
