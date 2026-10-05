/// <reference types="node" />

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * The app's ads are between the posts of «Feed», and nowhere else
 * (TASK-235, ADR-0198): no ad when a route is asked for, in «Draw» or in
 * «Explore», as there was before (ADR-0102). This test reads the app's code
 * and checks that only the Feed's screen takes code from `src/ads/`.
 */

const APP = join(__dirname, "..", "..");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

test("only «Feed» shows ads: no ad when a route is asked for", () => {
  const users = [join(APP, "App.tsx"), ...sourceFiles(join(APP, "src"))]
    .map((path) => relative(APP, path))
    .filter((where) => !where.startsWith(join("src", "ads")))
    // Types are no ad: `import type` brings in no code.
    .filter((where) =>
      /import\s+(?!type\s)[^;]*?from\s+"(\.\.?\/)+(src\/)?ads\//.test(
        readFileSync(join(APP, where), "utf8"),
      ),
    );
  expect(users).toEqual([join("src", "screens", "FeedScreen.tsx")]);
});
