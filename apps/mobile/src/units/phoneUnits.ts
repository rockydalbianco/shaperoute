import { I18nManager, Platform, Settings } from "react-native";

import type { Units } from "./units";

/**
 * What the phone says of how it measures (TASK-182); every part is missing
 * on a phone that does not say (in tests, for one).
 */
export type PhoneMeasures = {
  /** iOS «Measurement System» set by hand: `AppleMetricUnits`. */
  metric?: unknown;
  /** With it, `AppleMeasurementUnits`: "Centimeters" or "Inches". */
  measurement?: unknown;
  /** The phone's locales, best first: "en_US", "en_GB@rg=uszzzz". */
  locales: readonly string[];
};

/**
 * The regions whose measurement system has roads in miles, as iOS counts
 * them: the United States, Liberia and Myanmar (the US system) and the
 * United Kingdom (its own).
 */
const MILE_REGIONS: ReadonlySet<string> = new Set(["US", "GB", "LR", "MM"]);

/** What the phone says now. */
export function phoneMeasures(): PhoneMeasures {
  const measures: { metric?: unknown; measurement?: unknown; locales: string[] } = {
    locales: [],
  };
  if (Platform.OS === "ios") {
    try {
      measures.metric = Settings.get("AppleMetricUnits") as unknown;
      measures.measurement = Settings.get("AppleMeasurementUnits") as unknown;
      const locale: unknown = Settings.get("AppleLocale");
      if (typeof locale === "string") {
        measures.locales.push(locale);
      }
    } catch {
      // No settings to read: the locale below, if any.
    }
  }
  try {
    const locale: unknown = I18nManager.getConstants().localeIdentifier;
    if (typeof locale === "string") {
      measures.locales.push(locale);
    }
  } catch {
    // Nothing more to read.
  }
  return measures;
}

function isYes(value: unknown): boolean {
  return value === true || value === 1;
}

function isNo(value: unknown): boolean {
  return value === false || value === 0;
}

/**
 * The units a locale asks for: its measurement system when it names one
 * ("en_US@measure=metric", "en-US-u-ms-metric"), else its region, the one
 * set over it first ("en_GB@rg=uszzzz"). Null when it has neither.
 */
export function unitsOfLocale(identifier: string): Units | null {
  const [base, keywords = ""] = identifier.split("@");
  const asked = new Map<string, string>();
  for (const pair of keywords.split(";")) {
    const [name, value] = pair.split("=");
    if (name && value) {
      asked.set(name.toLowerCase(), value.toLowerCase());
    }
  }
  const parts = base.split(/[-_]/);
  // "-u-ms-metric-rg-gbzzzz": the same, as a language tag writes it.
  const extension = parts.findIndex((part, at) => at > 0 && part.toLowerCase() === "u");
  const tags = extension === -1 ? parts : parts.slice(0, extension);
  if (extension !== -1) {
    const rest = parts.slice(extension + 1).map((part) => part.toLowerCase());
    for (const name of ["ms", "rg"]) {
      const at = rest.indexOf(name);
      if (at !== -1 && rest[at + 1] !== undefined) {
        asked.set(name, rest[at + 1]);
      }
    }
  }
  const system = asked.get("measure") ?? asked.get("ms");
  if (system === "metric") {
    return "km";
  }
  if (system === "ussystem" || system === "uksystem" || system === "imperial") {
    return "mi";
  }
  const region =
    asked.get("rg")?.slice(0, 2) ??
    tags.slice(1).find((tag) => /^[A-Za-z]{2}$/.test(tag));
  if (region === undefined) {
    return null;
  }
  return MILE_REGIONS.has(region.toUpperCase()) ? "mi" : "km";
}

/**
 * The phone's units: miles where the phone measures roads in miles,
 * kilometres everywhere else and whenever the phone does not say (ADR-0149).
 * A measurement system set by hand on iOS comes first, read as iOS reads
 * it: not metric is the US system, metric with inches the UK's, both in
 * miles. Then the phone's region.
 */
export function phoneUnits(measures: PhoneMeasures = phoneMeasures()): Units {
  const { metric, measurement } = measures;
  if (isNo(metric)) {
    return "mi";
  }
  if (isYes(metric)) {
    return measurement === "Inches" ? "mi" : "km";
  }
  if (measurement === "Inches") {
    return "mi";
  }
  if (measurement === "Centimeters") {
    return "km";
  }
  for (const locale of measures.locales) {
    const units = unitsOfLocale(locale);
    if (units !== null) {
      return units;
    }
  }
  return "km";
}
