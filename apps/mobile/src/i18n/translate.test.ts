import { saveLanguageChoice } from "./language";
import { decimal, decimalIn, t, TABLES, tLater, tPlural, translate } from "./translate";

afterEach(() => saveLanguageChoice("phone"));

test("English is the text as written; the others read their table", () => {
  expect(translate("en", "Log out")).toBe("Log out");
  expect(translate("it", "Log out")).toBe(TABLES.it["Log out"]);
  expect(translate("it", "Log out")).not.toBe("Log out");
});

test("a text with no translation is shown in English (ADR-0172)", () => {
  expect(translate("de", "A text nobody translated")).toBe("A text nobody translated");
});

test("marks are filled, numbers written as the language writes them", () => {
  expect(translate("en", "{name}, coming soon", { name: "Units" })).toBe(
    "Units, coming soon",
  );
  expect(translate("en", "{km} km", { km: 5.2 })).toBe("5.2 km");
  expect(translate("it", "{km} km", { km: 5.2 })).toBe("5,2 km");
  expect(translate("en", "{missing} stays", {})).toBe("{missing} stays");
  expect(decimalIn("en", 5.25, 1)).toBe("5.3");
  expect(decimalIn("fr", 5.25, 1)).toBe("5,3");
  expect(decimalIn("de", 12, 2)).toBe("12,00");
});

test("t, decimal and tPlural follow the app's language", () => {
  expect(t("Log out")).toBe("Log out");
  expect(decimal(3.14159, 2)).toBe("3.14");
  saveLanguageChoice("it");
  expect(t("Log out")).toBe(TABLES.it["Log out"]);
  expect(decimal(3.14159, 2)).toBe("3,14");
});

test("plurals: one for a single thing, French also for none", () => {
  const runs = (count: number) => tPlural(count, "{count} run", "{count} runs");
  expect([runs(0), runs(1), runs(2)]).toEqual(["0 runs", "1 run", "2 runs"]);
  saveLanguageChoice("fr");
  // Not in the table: English words, with the French choice of form.
  expect([runs(0), runs(1), runs(2)]).toEqual(["0 run", "1 run", "2 runs"]);
});

test("tLater keeps the English text for a t() where it is shown", () => {
  expect(tLater("Units")).toBe("Units");
});
