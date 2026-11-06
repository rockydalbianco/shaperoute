import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { TABLES } from "../i18n/translate";
import {
  WATCH_INFO_PLIST_KEYS,
  WATCH_LANGUAGES,
  WATCH_SPORT_NAMES,
  WATCH_TEXTS,
  watchInfoPlistFile,
  watchInfoPlistStrings,
  watchInfoPlistText,
  watchStrings,
  watchTextsFile,
} from "./watchTexts";

const ROOT = path.join(__dirname, "..", "..");

describe("the watch's texts", () => {
  // scripts/watch-texts.sh sets it: the files are written again, then checked.
  if (process.env.WRITE_WATCH_TEXTS === "1") {
    for (const language of WATCH_LANGUAGES) {
      const file = path.join(ROOT, watchTextsFile(language));
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, watchStrings(language));
      writeFileSync(
        path.join(ROOT, watchInfoPlistFile(language)),
        watchInfoPlistStrings(language),
      );
    }
  }

  it("are only texts the app has, translated in every language", () => {
    for (const [language, table] of Object.entries(TABLES)) {
      const missing = WATCH_TEXTS.filter((text) => table[text] === undefined);
      expect({ language, missing }).toEqual({ language, missing: [] });
    }
  });

  it.each(WATCH_LANGUAGES)(
    "are the ones of %s's file, as the script writes it",
    (language) => {
      // When this fails, run apps/mobile/scripts/watch-texts.sh.
      const text = readFileSync(path.join(ROOT, watchTextsFile(language)), "utf8");
      expect(text).toBe(watchStrings(language));
    },
  );

  it.each(WATCH_LANGUAGES)("ask Apple Health in %s as the iPhone does", (language) => {
    const text = readFileSync(path.join(ROOT, watchInfoPlistFile(language)), "utf8");
    expect(text).toBe(watchInfoPlistStrings(language));
    for (const key of WATCH_INFO_PLIST_KEYS) {
      expect(watchInfoPlistText(language, key).length).toBeGreaterThan(20);
    }
  });

  it("have the iPhone's English sentences in the watch's Info.plist", () => {
    const plist = readFileSync(
      path.join(ROOT, "targets", "watch", "Info.plist"),
      "utf8",
    );
    for (const key of WATCH_INFO_PLIST_KEYS) {
      expect(plist).toContain(`<key>${key}</key>`);
      expect(plist).toContain(`<string>${watchInfoPlistText("en", key)}</string>`);
    }
  });

  it("give each sport its name in the app's words", () => {
    expect(WATCH_SPORT_NAMES).toContain("Run");
    expect(watchStrings("it")).toContain('"Run" = "Corsa";');
    expect(watchStrings("it")).toContain('"Pause" = "Pausa";');
    expect(watchStrings("en")).toContain('"Pause" = "Pause";');
  });

  it("keep a sport with no translation in English, as the app", () => {
    const untranslated = WATCH_SPORT_NAMES.find(
      (name) => TABLES.it[name] === undefined,
    );
    if (untranslated !== undefined) {
      expect(watchStrings("it")).toContain(`"${untranslated}" = "${untranslated}";`);
    }
  });

  it("write a quote and a backslash so the file still reads", () => {
    expect(
      watchStrings("en")
        .split("\n")
        .filter((line) => line.startsWith('"')),
    ).toHaveLength(WATCH_TEXTS.length + WATCH_SPORT_NAMES.length);
    for (const line of watchStrings("de")
      .split("\n")
      .filter((l) => l.startsWith('"'))) {
      expect(line).toMatch(/^"(?:[^"\\]|\\.)*" = "(?:[^"\\]|\\.)*";$/);
    }
  });
});
