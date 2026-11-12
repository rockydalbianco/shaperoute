import { readFileSync } from "node:fs";
import { join } from "node:path";

import { showsMap } from "./mapOver";

// A drawing opened from a screen over the app (TASK-470 D, defect 9):
// «Play», or «Messages» in the ski mode, shows the map, as a page does. It
// once stayed opened out of sight, and the map came on the next page.

const PAGES = ["feed", "choose", "messages", "explore", "profile"];
const SKI_PAGES = ["choose", "skiDays", "skiResorts", "feed", "profile"];

test("opened from a page of the bar: the map", () => {
  expect(showsMap("feed", PAGES, true)).toBe(true);
  expect(showsMap("skiDays", SKI_PAGES, true)).toBe(true);
});

test("opened from «Play», or from «Messages» of the ski mode: the map too", () => {
  expect(showsMap("play", PAGES, true)).toBe(true);
  expect(showsMap("messages", SKI_PAGES, true)).toBe(true);
});

test("nothing opened, or a screen of its own (a run, the canvas): no map from this", () => {
  expect(showsMap("feed", PAGES, false)).toBe(false);
  expect(showsMap("play", PAGES, false)).toBe(false);
  expect(showsMap("navigate", PAGES, true)).toBe(false);
  expect(showsMap("canvas", PAGES, true)).toBe(false);
});

test("the app decides its screen with it", () => {
  const app = readFileSync(join(__dirname, "..", "..", "App.tsx"), "utf8");
  expect(app).toMatch(/const screen: Screen = showsMap\(/);
  // «Explore» seen, without an effect that sets state (App.tsx:850 before).
  expect(app).toMatch(/if \(screen === "explore" && !exploreSeen\) \{/);
});
