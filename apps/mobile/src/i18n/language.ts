import { File, Paths } from "expo-file-system";

import { isLanguage, type Language } from "./languages";
import { phoneLanguage } from "./phoneLanguage";

/**
 * What «Settings» keeps (TASK-210): a language, or "phone" to follow the
 * phone's own, which is what the app does until one is chosen (ADR-0172).
 */
export type LanguageChoice = Language | "phone";

export const LANGUAGE_FILE = "language.json";

/** The choice kept on this phone; "phone" when none was made or it does not read. */
export function loadLanguageChoice(): LanguageChoice {
  try {
    const file = new File(Paths.document, LANGUAGE_FILE);
    if (!file.exists) {
      return "phone";
    }
    const data: unknown = JSON.parse(file.textSync());
    const language =
      typeof data === "object" && data !== null && "language" in data
        ? data.language
        : null;
    return isLanguage(language) ? language : "phone";
  } catch {
    return "phone";
  }
}

/** The language a choice shows the app in. */
export function languageOf(
  choice: LanguageChoice,
  phone: () => Language = phoneLanguage,
): Language {
  return choice === "phone" ? phone() : choice;
}

/** The app's language now; read from the phone on first use. */
let current: Language | null = null;

/** The language the app is shown in now (and the voice's, TASK-209). */
export function appLanguage(): Language {
  if (current === null) {
    current = languageOf(loadLanguageChoice());
  }
  return current;
}

/** Told of each new language, while the app is open. */
const listeners = new Set<(language: Language) => void>();

/**
 * Calls `listener` with each language the app turns to from now on, until
 * the returned function is called: the app follows «Settings» at once.
 */
export function subscribeLanguage(listener: (language: Language) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Keeps the choice for the next opening and shows the app in it now; a
 * phone that refuses to keep it still has it until the app closes.
 */
export function saveLanguageChoice(choice: LanguageChoice): void {
  try {
    const file = new File(Paths.document, LANGUAGE_FILE);
    if (choice === "phone") {
      if (file.exists) {
        file.delete();
      }
    } else {
      file.create({ overwrite: true });
      file.write(JSON.stringify({ language: choice }));
    }
  } catch {
    // The choice still holds while the app is open.
  }
  const language = languageOf(choice);
  if (language === current) {
    return;
  }
  current = language;
  for (const listener of listeners) {
    listener(language);
  }
}
