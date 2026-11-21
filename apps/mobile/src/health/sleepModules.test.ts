/// <reference types="node" />

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

import appJson from "../../app.json";
import { SLEEP_POSTS_ON, sleepPostsOn, sleepReader } from "./sleepModules";

// TASK-467 part C: the sleep is on, in the build whose permission text
// speaks of it. Reading Apple Health stays in two files, and asking for
// the permission in one place.

const SRC = join(__dirname, "..");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** The code of a file, without what its comments say. */
function codeOf(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

const named = (paths: string[]) => paths.map((path) => relative(SRC, path)).sort();

test("the sleep is on", () => {
  expect(SLEEP_POSTS_ON).toBe(true);
  expect(sleepPostsOn()).toBe(true);
});

test("the build that turns it on says in its permission text that it reads the sleep", () => {
  expect(appJson.expo.ios.infoPlist.NSHealthShareUsageDescription).toMatch(/sleep/);
});

test("without the native code of Apple Health there is no reader", () => {
  // Under jest, as in Expo Go and on Android: nothing to read from.
  expect(sleepReader()).toBeNull();
});

test("only the reader and the switch load the health library or query it", () => {
  const files = sourceFiles(SRC).filter((path) => /sleep|lastNight/i.test(path));
  // The files of parts A, B2, B3 and C, at the least.
  expect(files.length).toBeGreaterThanOrEqual(15);
  const loading = files.filter((path) =>
    /react-native-healthkit|NitroModules|require\(/.test(codeOf(path)),
  );
  expect(named(loading)).toEqual(["health/sleepModules.ts"]);
  const querying = files.filter((path) =>
    /requestAuthorization|queryCategorySamples/.test(codeOf(path)),
  );
  expect(named(querying)).toEqual(["health/appleSleep.ts"]);
});

test("only the reader names the sleep type of Apple Health", () => {
  const naming = sourceFiles(SRC).filter((path) =>
    /HKCategoryTypeIdentifierSleepAnalysis/.test(readFileSync(path, "utf8")),
  );
  expect(named(naming)).toEqual(["health/appleSleep.ts"]);
});

test("the permission is asked in one place: the card of the profile", () => {
  // `reader.ask()` opens the phone's sheet: only at the user's tap.
  const asking = sourceFiles(SRC).filter(
    (path) =>
      /sleep/i.test(readFileSync(path, "utf8")) &&
      /readOwnNight\(.*\btrue\)/.test(codeOf(path)),
  );
  expect(named(asking)).toEqual(["profile/OwnSleep.tsx"]);
});
