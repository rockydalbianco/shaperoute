import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react-native";
import { type StyleProp, StyleSheet, Text, type ViewStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ActivitySheet } from "../activities/ActivitySheet";
import { color, glass, radius } from "../theme/tokens";
import { sheetFace } from "./sheetFace";
import { type GlassMode, useGlassMode } from "./useGlassMode";

// The sheets from the bottom in the glass look (TASK-469 A7a, ADR-0383,
// «Capsula»): the top corners at 28, the rim of the laid glass with its
// light on top and a soft shadow up, the face still `surface` so the words
// keep their contrast. «Reduce Transparency» keeps the sheet of the app as
// before; «Increase Contrast» gives the strong top edge.

jest.mock("./useGlassMode", () => ({
  ...jest.requireActual("./useGlassMode"),
  useGlassMode: jest.fn(),
}));

type Shadow = { inset?: boolean; offsetY?: number; color?: string };
type Face = ViewStyle & { boxShadow?: Shadow[] };

test("on glass: corners at 28, the rim and its light on top, the face still surface", () => {
  const face = sheetFace("glass") as Face;
  expect(face.borderTopLeftRadius).toBe(radius.card);
  expect(face.borderTopRightRadius).toBe(radius.card);
  expect(radius.card).toBe(28);
  expect(face.backgroundColor).toBe(color.surface);
  expect(face.borderTopWidth).toBe(0);
  const inside = (face.boxShadow ?? []).filter((each) => each.inset);
  expect(inside.map((each) => each.color)).toEqual([glass.rim, glass.rimTop]);
  // The shadow falls up, on what lies behind the sheet.
  const cast = (face.boxShadow ?? []).filter((each) => !each.inset);
  expect(cast).toHaveLength(1);
  expect(cast[0].color).toBe(glass.shadow);
  expect(cast[0].offsetY).toBeLessThan(0);
  // Never yellow.
  const colours = (face.boxShadow ?? []).map((each) => each.color);
  expect(colours).not.toContain(color.accent);
});

test("«Reduce Transparency»: the sheet of the app, one pixel of hairline on top", () => {
  const face = sheetFace("solid") as Face;
  expect(face.borderTopLeftRadius).toBe(radius.card);
  expect(face.backgroundColor).toBe(color.surface);
  expect(face.borderTopWidth).toBe(StyleSheet.hairlineWidth);
  expect(face.borderColor).toBe(color.hairline);
  expect(face.boxShadow).toBeUndefined();
});

test("«Increase Contrast»: the strong top edge", () => {
  const face = sheetFace("contrast") as Face;
  expect(face.borderTopLeftRadius).toBe(radius.card);
  expect(face.backgroundColor).toBe(color.surface);
  expect(face.borderTopWidth).toBe(1);
  expect(face.borderColor).toBe(color.borderStrong);
  expect(face.boxShadow).toBeUndefined();
});

/** The rendered tree as JSON, and every node in it `where` says. */
type Json = {
  type: string;
  props: Record<string, unknown>;
  children: (Json | string)[] | null;
};
function nodes(
  node: Json | string | null | undefined,
  where: (node: Json) => boolean,
): Json[] {
  if (node == null || typeof node === "string") {
    return [];
  }
  const own = where(node) ? [node] : [];
  return [...own, ...(node.children ?? []).flatMap((child) => nodes(child, where))];
}

function face(node: Json): Face {
  return (StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>) ?? {}) as Face;
}

describe.each(["glass", "solid", "contrast"] as const)("%s", (mode: GlassMode) => {
  test("a sheet wears the face over its own layout", async () => {
    jest.mocked(useGlassMode).mockReturnValue(mode);
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <ActivitySheet visible onClose={jest.fn()} testID="sheet">
          <Text>Inside</Text>
        </ActivitySheet>
      </SafeAreaProvider>,
    );
    expect(screen.getByText("Inside")).toBeTruthy();
    const tree = screen.toJSON() as unknown as Json | null;
    const [sheet, ...more] = nodes(
      tree,
      (node) => node.type === "View" && face(node).borderTopLeftRadius === radius.card,
    );
    expect(more).toHaveLength(0);
    const want = sheetFace(mode) as Face;
    const style = face(sheet);
    expect(style.backgroundColor).toBe(color.surface);
    expect(style.borderTopWidth).toBe(want.borderTopWidth);
    expect(style.boxShadow).toEqual(want.boxShadow);
    // Its own layout stays.
    expect(style.padding).toBeGreaterThan(0);
  });
});

// Every sheet from the bottom takes the face after its own style, so the
// face wins and the sheet's padding below stays its own.
const SHEETS = [
  "messages/MessageSheet.tsx",
  "messages/AttachButton.tsx",
  "liveShare/LiveShareButton.tsx",
  "social/ReportMenu.tsx",
  "search/FilterSheet.tsx",
  "social/SuperLikeSheet.tsx",
  "social/DrawingComments.tsx",
  "social/TagPeople.tsx",
  "social/outfit/OutfitTagEditor.tsx",
  "social/outfit/OutfitTagSheet.tsx",
  "feed/PostShareSheet.tsx",
  "feed/StyleProductSheet.tsx",
  "activities/ActivitySheet.tsx",
  "ski/DayResort.tsx",
  "gym/GymIntroSheet.tsx",
  "share/EditVideoSheet.tsx",
];

test.each(SHEETS)("%s wears the sheet's face", (file) => {
  const source = readFileSync(join(__dirname, "..", file), "utf8");
  expect(source).toMatch(/const glassSheet = useSheetFace\(\);/);
  expect(source).toMatch(/styles\.sheet,\s*glassSheet,/);
});
