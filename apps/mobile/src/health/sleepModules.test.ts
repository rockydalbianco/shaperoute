/// <reference types="node" />

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { SLEEP_POSTS_ON, sleepPostsOn, sleepReader } from "./sleepModules";

// TASK-467 part B2, the Coordinatore's condition: until the native build of
// part C (after version 1.1.0, with the privacy line and the App Privacy
// card), nothing in `main` reads the sleep from Apple Health, and the sleep
// in a post is off. Turning either on is part C's change, and this test's.

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

test("the sleep in a post is off", () => {
  expect(SLEEP_POSTS_ON).toBe(false);
  expect(sleepPostsOn()).toBe(false);
});

test("the phone has no reader of the sleep", () => {
  expect(sleepReader()).toBeNull();
});

test("no file of the sleep loads the health library or asks to read", () => {
  const files = sourceFiles(SRC).filter((path) => /sleep|lastNight/i.test(path));
  // The files of parts A and B2, at the least.
  expect(files.length).toBeGreaterThanOrEqual(10);
  for (const path of files) {
    const code = readFileSync(path, "utf8")
      // What a comment says of the library is not a use of it.
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect({ path, loads: /react-native-healthkit/.test(code) }).toEqual({
      path,
      loads: false,
    });
    expect({
      path,
      asks: /requestAuthorization|queryCategorySamples|NitroModules|require\(/.test(
        code,
      ),
    }).toEqual({ path, asks: false });
  }
});

test("the only file that names the sleep type of Apple Health is none yet", () => {
  const named = sourceFiles(SRC).filter((path) =>
    /HKCategoryTypeIdentifierSleepAnalysis/.test(readFileSync(path, "utf8")),
  );
  expect(named).toEqual([]);
});
