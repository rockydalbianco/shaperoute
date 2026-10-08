import {
  BASE_LANGUAGE,
  isLanguage,
  languageOfTag,
  languageOption,
  LANGUAGES,
} from "./languages";

test("the five languages, in the order the user gave them, each in its own name", () => {
  expect(LANGUAGES.map((option) => option.name)).toEqual([
    "English",
    "Deutsch",
    "Italiano",
    "Español",
    "Français",
  ]);
  expect(BASE_LANGUAGE).toBe("en");
  // The voice keeps the English it speaks today (TASK-209).
  expect(languageOption("en").speech).toBe("en-US");
  expect(languageOption("it").speech).toBe("it-IT");
});

test("a phone's language tag gives the app's language, or none", () => {
  expect(languageOfTag("it-IT")).toBe("it");
  expect(languageOfTag("de_CH")).toBe("de");
  expect(languageOfTag("es-419")).toBe("es");
  expect(languageOfTag("FR")).toBe("fr");
  expect(languageOfTag("en")).toBe("en");
  expect(languageOfTag("pt-BR")).toBeNull();
  expect(languageOfTag("")).toBeNull();
  expect(languageOfTag(undefined)).toBeNull();
  expect(isLanguage("it")).toBe(true);
  expect(isLanguage("phone")).toBe(false);
});
