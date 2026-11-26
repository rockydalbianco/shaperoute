import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { color, glass as glassColors, radius, tone } from "../theme/tokens";
import { sheetFace } from "./sheetFace";
import { useGlassSheet } from "./SheetGlass";
import { type GlassMode, useGlassMode } from "./useGlassMode";
import { useReduceMotion } from "./useReduceMotion";

// A sheet from the bottom that can be the phone's real glass (TASK-469 B4,
// ADR-0383): it takes its face and what goes behind its content. Where the
// phone has no real glass, the face of part A and nothing behind.

jest.mock("./useGlassMode", () => ({
  ...jest.requireActual("./useGlassMode"),
  useGlassMode: jest.fn(),
}));
jest.mock("./useReduceMotion", () => ({ useReduceMotion: jest.fn() }));

// The phone's own glass (ui/NativeGlass): what its native module says of
// the phone, null where the app was built without it. The other native
// modules are the real ones.
let mockGlassModule: Record<string, boolean> | null = null;
jest.mock("expo", () => {
  const actual = jest.requireActual<typeof import("expo")>("expo");
  return {
    ...actual,
    requireOptionalNativeModule: (name: string) =>
      name === "ExpoGlassEffect"
        ? mockGlassModule
        : actual.requireOptionalNativeModule(name),
  };
});
jest.mock("expo-glass-effect", () => {
  const { View: Plain } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    GlassView: (props: Record<string, unknown>) => <Plain {...props} />,
  };
});
const REAL_GLASS = { isGlassEffectAPIAvailable: true, isLiquidGlassAvailable: true };

beforeEach(() => {
  mockGlassModule = null;
  jest.mocked(useReduceMotion).mockReturnValue(false);
});

function Sheet() {
  const [glassSheet, glassBack] = useGlassSheet();
  return (
    <View
      testID="sheet"
      style={[{ padding: 8, backgroundColor: color.surface }, glassSheet]}
    >
      {glassBack}
      <Text>Inside</Text>
    </View>
  );
}

function faceOf(testID: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style as ViewStyle);
}

test.each(["glass", "solid", "contrast"] as const)(
  "a phone without the real glass, %s: the face of part A, and nothing behind the content",
  async (mode: GlassMode) => {
    jest.mocked(useGlassMode).mockReturnValue(mode);
    await render(<Sheet />);
    expect(faceOf("sheet")).toEqual({ padding: 8, ...sheetFace(mode) });
    expect(screen.queryByTestId("sheet-glass")).toBeNull();
    expect(screen.getByText("Inside")).toBeOnTheScreen();
  },
);

test("where the glass is the phone's own, it fills the sheet behind its content", async () => {
  mockGlassModule = REAL_GLASS;
  jest.mocked(useGlassMode).mockReturnValue("glass");
  await render(<Sheet />);
  const glass = screen.getByTestId("sheet-glass");
  // Regular, in the app's tone, tinted with the tone's own background —
  // the sheets' share, a little more than the bar's — and never the
  // yellow, never in the way of a touch.
  expect(glass.props.glassEffectStyle).toBe("regular");
  expect(glass.props.colorScheme).toBe(tone.tone);
  expect(glass.props.tintColor).toBe(glassColors.realSheetTint);
  expect(glass.props.tintColor).not.toBe(color.accent);
  expect(glass.props.pointerEvents).toBe("none");
  const back = faceOf("sheet-glass");
  expect(back.position).toBe("absolute");
  expect(back.top).toBe(0);
  expect(back.bottom).toBe(0);
  expect(back.borderTopLeftRadius).toBe(radius.card);
  expect(back.borderTopRightRadius).toBe(radius.card);
  // First in the box: behind what the sheet holds.
  expect(screen.getByTestId("sheet").children[0]).toBe(glass);
  expect(screen.getByText("Inside")).toBeOnTheScreen();
});

test("there the sheet's own box has no fill, rim or shadow of ours: the corners only", async () => {
  mockGlassModule = REAL_GLASS;
  jest.mocked(useGlassMode).mockReturnValue("glass");
  await render(<Sheet />);
  const face = faceOf("sheet");
  expect(face.backgroundColor).toBe("transparent");
  expect(face.boxShadow).toBeUndefined();
  expect(face.borderTopWidth).toBe(0);
  expect(face.borderTopLeftRadius).toBe(radius.card);
  expect(face.borderTopRightRadius).toBe(radius.card);
  // Its own layout stays.
  expect(face.padding).toBe(8);
});

test.each(["solid", "contrast"] as const)(
  "%s stays opaque even with the glass there: the face of part A",
  async (mode) => {
    mockGlassModule = REAL_GLASS;
    jest.mocked(useGlassMode).mockReturnValue(mode);
    await render(<Sheet />);
    expect(faceOf("sheet")).toEqual({ padding: 8, ...sheetFace(mode) });
    expect(faceOf("sheet").backgroundColor).toBe(color.surface);
    expect(screen.queryByTestId("sheet-glass")).toBeNull();
  },
);

test("«Reduce Motion»: the sheet fades in by its opacity, under which the phone draws no glass — so the opaque face of part A", async () => {
  mockGlassModule = REAL_GLASS;
  jest.mocked(useGlassMode).mockReturnValue("glass");
  jest.mocked(useReduceMotion).mockReturnValue(true);
  await render(<Sheet />);
  expect(faceOf("sheet")).toEqual({ padding: 8, ...sheetFace("glass") });
  expect(faceOf("sheet").backgroundColor).toBe(color.surface);
  expect(screen.queryByTestId("sheet-glass")).toBeNull();
});

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
