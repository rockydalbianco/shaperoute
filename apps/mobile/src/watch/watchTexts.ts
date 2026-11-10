import appJson from "../../app.json";
import de from "../../locales/de.json";
import es from "../../locales/es.json";
import fr from "../../locales/fr.json";
import it from "../../locales/it.json";
import { tLater } from "../i18n";
import { LANGUAGES, type Language } from "../i18n/languages";
import { TABLES } from "../i18n/translate";
import { WATCH_SPORTS } from "./watchSports";

/**
 * The texts of the Apple Watch app (TASK-370 part A2, ADR-0314). In part A
 * the watch says only what the app already says, with the app's own
 * translations: a test checks every one of them is in each table. The watch
 * reads them from targets/watch/<language>.lproj/Localizable.strings, and
 * the two Apple Health sentences, the iPhone's own, from InfoPlist.strings;
 * `apps/mobile/scripts/watch-texts.sh` writes both again from here. Pure:
 * no native code.
 */

/** The texts of the watch's screens, in English as the app writes them. */
export const WATCH_TEXTS: readonly string[] = [
  // src/screens/RunDashboard.tsx, the countdown and the controls
  "Get ready",
  "Pause",
  "Resume",
  "Paused",
  "Finish",
  // src/screens/RunPanel.tsx, the numbers
  "Time",
  "Distance",
  "Pace now",
  "Avg pace",
  "Last km",
  "Last mi",
  "Avg /500 m",
  "Last 500 m",
  "Avg /100 m",
  "Last 100 m",
  "Calories",
  // the summary
  "Done",
  // the routes the phone sent (part B3a); a text only the watch shows is
  // marked with tLater, so that the app's tables keep it
  "Run without a route",
  "Routes",
  tLater("Send a route from MuW on your iPhone"),
  "Favorites",
  // the run with a route (part B3b)
  tLater("Off route"),
  tLater("Arrived"),
  tLater("Reach the route to start"),
  tLater("To the {letter}"),
  tLater("Next part"),
  // the details of a workout (part B5), the run screen's and the post's
  "Elev. gain",
  "Avg heart rate",
];

/**
 * The sports' names, which the watch reads in English from sports.json and
 * translates. A name with no translation yet stays English, as in the app
 * (ADR-0172).
 */
export const WATCH_SPORT_NAMES: readonly string[] = WATCH_SPORTS.map(
  (sport) => sport.name,
);

/** Where the file of `language` is, from apps/mobile. */
export function watchTextsFile(language: Language): string {
  return `targets/watch/${language}.lproj/Localizable.strings`;
}

/** Where the Info.plist texts of `language` are, from apps/mobile. */
export function watchInfoPlistFile(language: Language): string {
  return `targets/watch/${language}.lproj/InfoPlist.strings`;
}

/** What the watch asks of Apple Health, the same sentences as the iPhone;
 * and its location during a workout (part B3b), a sentence of its own: the
 * iPhone's speaks of a locked phone and the blue bar. */
export const WATCH_INFO_PLIST_KEYS = [
  "NSHealthShareUsageDescription",
  "NSHealthUpdateUsageDescription",
  "NSLocationWhenInUseUsageDescription",
] as const;

/** The watch's location sentence, approved by the user on 2026-11-08. */
const WATCH_LOCATION: Readonly<Record<Language, string>> = {
  en: "MuW uses your location during a workout to guide you along your route and to record it.",
  it: "MuW usa la tua posizione durante un allenamento per guidarti lungo il percorso e per registrarlo.",
  de: "MuW nutzt deinen Standort während eines Trainings, um dich entlang deiner Route zu führen und sie aufzuzeichnen.",
  es: "MuW usa tu ubicación durante un entrenamiento para guiarte por la ruta y para registrarla.",
  fr: "MuW utilise votre position pendant une séance pour vous guider le long du parcours et pour l'enregistrer.",
};

type HealthKey = Exclude<
  (typeof WATCH_INFO_PLIST_KEYS)[number],
  "NSLocationWhenInUseUsageDescription"
>;

type InfoPlistTexts = Readonly<Record<HealthKey, string>>;

/** The iPhone's sentences in each language: app.json in English, the
 * locales/ files for the others. */
const INFO_PLIST: Readonly<Record<Language, InfoPlistTexts>> = {
  en: appJson.expo.ios.infoPlist,
  de: de.ios,
  it: it.ios,
  es: es.ios,
  fr: fr.ios,
};

/** The sentence of `key` in `language`: the iPhone's for Apple Health, the
 * watch's own for its location. */
export function watchInfoPlistText(
  language: Language,
  key: (typeof WATCH_INFO_PLIST_KEYS)[number],
): string {
  return key === "NSLocationWhenInUseUsageDescription"
    ? WATCH_LOCATION[language]
    : INFO_PLIST[language][key];
}

/** `text` written between the quotes of a .strings file. */
function quoted(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/** The Localizable.strings of `language`: each text by its English one. */
export function watchStrings(language: Language): string {
  const table = language === "en" ? undefined : TABLES[language];
  const lines = [...WATCH_TEXTS, ...WATCH_SPORT_NAMES].map(
    (text) => `${quoted(text)} = ${quoted(table?.[text] ?? text)};`,
  );
  return stringsFile(lines);
}

/** The InfoPlist.strings of `language`: the Apple Health sentences. */
export function watchInfoPlistStrings(language: Language): string {
  return stringsFile(
    WATCH_INFO_PLIST_KEYS.map(
      (key) => `${key} = ${quoted(watchInfoPlistText(language, key))};`,
    ),
  );
}

function stringsFile(lines: readonly string[]): string {
  return [
    "/* The watch's texts (TASK-370), written by apps/mobile/scripts/watch-texts.sh",
    "   from src/watch/watchTexts.ts: do not change them here. */",
    "",
    ...lines,
    "",
  ].join("\n");
}

/** Every language of the app, for the files of the watch. */
export const WATCH_LANGUAGES: readonly Language[] = LANGUAGES.map(
  (option) => option.id,
);
