import { phoneLanguage, phoneLanguageTags } from "./phoneLanguage";

test("the first of the phone's languages the app is written in", () => {
  expect(phoneLanguage(["it-IT", "en-US"])).toBe("it");
  // Portuguese first: the app is not in it, so the next one.
  expect(phoneLanguage(["pt-BR", "es-ES", "en-US"])).toBe("es");
  expect(phoneLanguage(["de_AT"])).toBe("de");
});

test("English when the phone is in none of the five, or does not say", () => {
  expect(phoneLanguage(["pt-BR", "ja-JP"])).toBe("en");
  expect(phoneLanguage([])).toBe("en");
});

test("in tests the phone says nothing, so every test sees the app in English", () => {
  expect(phoneLanguageTags()).toEqual([]);
  expect(phoneLanguage()).toBe("en");
});
