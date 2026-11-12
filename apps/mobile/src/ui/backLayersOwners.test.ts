import { readFileSync } from "node:fs";
import { join } from "node:path";

// Every page that opens over the app as a view, with a «←» of its own, gives
// Android's «back» to it (TASK-470, bug 2): without, «back» changed the tab
// under the page left open, or left the app. A `Modal` has its own
// `onRequestClose` and is not here. The source is checked, so a page that
// loses its line later is caught.

const SRC = join(__dirname, "..");

const PAGES: { file: string; closes: RegExp }[] = [
  // Over the app, from ProfileLayer.
  {
    file: "messages/MessagesOverlay.tsx",
    closes: /useBackCloses\(screen !== null, back\)/,
  },
  { file: "bell/BellOverlay.tsx", closes: /useBackCloses\(true, close\)/ },
  { file: "screens/PeopleScreen.tsx", closes: /useBackCloses\(!hidden,/ },
  { file: "contest/ContestPage.tsx", closes: /useBackCloses\(!hidden, archive \?/ },
  {
    file: "screens/ProfileScreen.tsx",
    closes: /useBackCloses\(\s*about !== null \|\| inside \|\| onBack !== undefined,/,
  },
  // «Play», and its pages.
  { file: "game/PlayOverlay.tsx", closes: /useBackCloses\(true, onBack\)/ },
  { file: "game/PlayScreen.tsx", closes: /useBackCloses\(prizesShown,/ },
  // Inside the tabs of the ski mode.
  { file: "ski/ResortPage.tsx", closes: /useBackCloses\(true, onBack\)/ },
  { file: "skimode/SkiDayPage.tsx", closes: /useBackCloses\(true, onBack\)/ },
  // The map, where it has its «←».
  {
    file: "screens/MapScreen.tsx",
    closes: /useBackCloses\(active && !hasBanner, onBack\)/,
  },
];

test.each(PAGES)("$file gives Android's «back» to its «←»", ({ file, closes }) => {
  expect(readFileSync(join(SRC, file), "utf8")).toMatch(closes);
});

test("a page in a tab asks the stack, never `BackHandler` itself: out of sight it would still take «back»", () => {
  for (const { file } of PAGES) {
    expect(readFileSync(join(SRC, file), "utf8")).not.toMatch(/BackHandler/);
  }
});
