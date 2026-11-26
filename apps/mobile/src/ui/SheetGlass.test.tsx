import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { sheetFace } from "./sheetFace";
import { useGlassSheet } from "./SheetGlass";
import { type GlassMode, useGlassMode } from "./useGlassMode";

// A sheet from the bottom that can be the phone's real glass (TASK-469 B4,
// ADR-0383): it takes its face and what goes behind its content. Until the
// real glass is here, the face of part A and nothing behind.

jest.mock("./useGlassMode", () => ({
  ...jest.requireActual("./useGlassMode"),
  useGlassMode: jest.fn(),
}));

function Sheet() {
  const [glassSheet, glassBack] = useGlassSheet();
  return (
    <View testID="sheet" style={[{ padding: 8 }, glassSheet]}>
      {glassBack}
      <Text>Inside</Text>
    </View>
  );
}

test.each(["glass", "solid", "contrast"] as const)(
  "%s: the face of part A, and nothing behind the content",
  async (mode: GlassMode) => {
    jest.mocked(useGlassMode).mockReturnValue(mode);
    await render(<Sheet />);
    const sheet = screen.getByTestId("sheet");
    expect(StyleSheet.flatten(sheet.props.style as ViewStyle)).toEqual({
      padding: 8,
      ...sheetFace(mode),
    });
    // Its own content only.
    expect(sheet.children).toHaveLength(1);
    expect(screen.getByText("Inside")).toBeOnTheScreen();
  },
);

// Every sheet from the bottom takes the glass: a new one joins this list.
const SHEETS = [
  "activities/ActivitySheet.tsx",
  "feed/AddToFeed.tsx",
  "feed/PostShareSheet.tsx",
  "feed/StyleProductSheet.tsx",
  "gym/GymIntroSheet.tsx",
  "liveShare/LiveShareButton.tsx",
  "messages/AttachButton.tsx",
  "messages/MessageSheet.tsx",
  "search/FilterSheet.tsx",
  "share/EditVideoSheet.tsx",
  "ski/DayResort.tsx",
  "social/DrawingComments.tsx",
  "social/outfit/OutfitTagEditor.tsx",
  "social/outfit/OutfitTagSheet.tsx",
  "social/ReportMenu.tsx",
  "social/SuperLikeSheet.tsx",
  "social/TagPeople.tsx",
];

test.each(SHEETS)("%s takes the face, and the glass behind its content", (file) => {
  const source = readFileSync(join(__dirname, "..", file), "utf8");
  expect(source).toMatch(/const \[glassSheet, glassBack\] = useGlassSheet\(\);/);
  // The face after the sheet's own style, as before.
  expect(source).toMatch(/styles\.sheet,\s*glassSheet[,\]]/);
  // And the glass first in the sheet's box, behind what the sheet holds.
  const box = source.slice(source.search(/styles\.sheet,\s*glassSheet[,\]]/));
  expect(box).toMatch(/^[^<]*>\s*\{glassBack\}/);
});
