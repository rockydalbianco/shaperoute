import { DE } from "./de";
import { ES } from "./es";
import { FR } from "./fr";
import { IT } from "./it";
import { appLanguage } from "./language";
import type { Language } from "./languages";

/** A language's texts, by their English text (ADR-0172). */
export type Table = Readonly<Record<string, string>>;

/** English has no table: its texts are the keys of the others. */
export const TABLES: Readonly<Record<Exclude<Language, "en">, Table>> = {
  de: DE,
  it: IT,
  es: ES,
  fr: FR,
};

/** What fills the `{name}` marks of a text. */
export type Values = Readonly<Record<string, string | number>>;

/** The languages that write «5,2» where English writes «5.2». */
const DECIMAL_COMMA: ReadonlySet<Language> = new Set(["de", "it", "es", "fr"]);

/** `value` with `digits` decimals, written as `language` writes it. */
export function decimalIn(language: Language, value: number, digits = 1): string {
  const text = value.toFixed(digits);
  return DECIMAL_COMMA.has(language) ? text.replace(".", ",") : text;
}

/** `value` with `digits` decimals, written in the app's language. */
export function decimal(value: number, digits = 1): string {
  return decimalIn(appLanguage(), value, digits);
}

/**
 * `text` in `language`, its `{name}` marks filled from `values`. A text with
 * no translation is shown in English (ADR-0172); a number is written as the
 * language writes it.
 */
export function translate(language: Language, text: string, values?: Values): string {
  const written = language === "en" ? text : (TABLES[language][text] ?? text);
  if (values === undefined) {
    return written;
  }
  return written.replace(/\{(\w+)\}/g, (mark, name: string) => {
    const value = values[name];
    if (value === undefined) {
      return mark;
    }
    return typeof value === "number"
      ? DECIMAL_COMMA.has(language)
        ? String(value).replace(".", ",")
        : String(value)
      : value;
  });
}

/**
 * `text` in the app's language. The text is the English one, written in the
 * call as it is: `t("Log out")`, `t("{count} km left", { count })`. A test
 * reads every call and checks each language has it (`tables.test.ts`), so
 * the text must be written in the call, never passed in a variable.
 */
export function t(text: string, values?: Values): string {
  return translate(appLanguage(), text, values);
}

/**
 * Marks an English text kept in a list to be translated where it is shown,
 * with `t(text)`: the test finds it here. Returns it as it is.
 */
export function tLater(text: string): string {
  return text;
}

/**
 * The text for `count` things: `one` for a single one, `other` for the
 * rest, both with a `{count}` mark (French says «0 course», so `one` is
 * never written with a «1» in it). Filled with `count` and `values`.
 */
export function tPlural(
  count: number,
  one: string,
  other: string,
  values?: Values,
): string {
  const language = appLanguage();
  // French counts 0 and 1 as one; the other four only 1.
  const single = language === "fr" ? Math.abs(count) < 2 : count === 1;
  return translate(language, single ? one : other, { ...values, count });
}
