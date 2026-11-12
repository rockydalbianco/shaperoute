import { readFileSync } from "node:fs";
import { join } from "node:path";

// The way back from the left edge on iOS (TASK-470 E, ADR-0384, the user's
// choice «A, la pagina segue»): every page that opens over the app as a
// view has it, on its own root, with the same close as its «←» and the
// same «on» as Android's back. Not «Profile» as a tab, where a finger from
// the edge goes to the tab before. The source is checked, so a page that
// loses it later is caught.

const SRC = join(__dirname, "..");

const PAGES: { file: string; edge: RegExp }[] = [
  {
    file: "messages/MessagesOverlay.tsx",
    edge: /useEdgeBack\(back, screen !== null\)/,
  },
  { file: "bell/BellOverlay.tsx", edge: /useEdgeBack\(close\)/ },
  { file: "screens/PeopleScreen.tsx", edge: /useEdgeBack\([^;]*, !hidden\)/ },
  { file: "contest/ContestPage.tsx", edge: /useEdgeBack\([^;]*, !hidden\)/ },
  {
    file: "screens/ProfileScreen.tsx",
    edge: /useEdgeBack\([^;]*about !== null \|\| inside,\s*\)/,
  },
  {
    file: "game/PlayOverlay.tsx",
    edge: /useEdgeBack\(\(\) => closeTopLayer\(\) \|\| onBack\(\)\)/,
  },
  { file: "ski/ResortPage.tsx", edge: /useEdgeBack\(onBack\)/ },
  { file: "skimode/SkiDayPage.tsx", edge: /useEdgeBack\(onBack\)/ },
];

test.each(PAGES)(
  "$file has the way back from the edge on its root",
  ({ file, edge }) => {
    const source = readFileSync(join(SRC, file), "utf8");
    expect(source).toMatch(edge);
    // The finger's handlers, the movement and the shade, all three.
    expect(source).toMatch(/\{\.\.\.edge\.handlers\}/);
    expect(source).toMatch(/edge\.style/);
    expect(source).toMatch(/\{edge\.shade\}/);
  },
);
