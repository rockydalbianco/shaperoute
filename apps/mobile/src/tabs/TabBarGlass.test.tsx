import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { color, glass, space } from "../theme/tokens";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";
import {
  type BarTab,
  TAB_BAR_HEIGHT,
  TAB_BAR_INSET,
  TAB_GLASS_HEIGHT,
  TabBar,
  tabBarBand,
  tabBarFloats,
  tabCapsuleX,
  tabGlassLift,
} from "./TabBar";

// The tab bar as a capsule of glass floating over the foot of the app
// (TASK-469, ADR-0383, the user's choice «Capsula»).

jest.mock("../haptics/haptics", () => ({ selectionFeel: jest.fn() }));
jest.mock("../ui/useGlassMode", () => ({
  ...jest.requireActual("../ui/useGlassMode"),
  useGlassMode: jest.fn(),
}));
const glassMode = jest.mocked(useGlassMode);

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
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    GlassView: (props: Record<string, unknown>) => <View {...props} />,
  };
});
const REAL_GLASS = { isGlassEffectAPIAvailable: true, isLiquidGlassAvailable: true };

beforeEach(() => {
  mockGlassModule = null;
});

const TABS: BarTab[] = [
  { title: "Feed", label: "Feed", icon: "house" },
  { title: "Draw", label: "Draw", icon: "pencil" },
  { title: "Explore", label: "Explore", icon: "search" },
  { title: "Messages", label: "Messages", icon: "send", count: 3 },
];

async function bar(mode: GlassMode, bottom = 34) {
  glassMode.mockReturnValue(mode);
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom },
      }}
    >
      <TabBar tabs={TABS} page={2} onTab={() => {}} />
    </SafeAreaProvider>,
  );
}

function styleOf(testID: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as ViewStyle;
}

test("the glass floats inset from the sides, lifted over the home indicator", async () => {
  await bar("glass");
  const face = styleOf("tab-glass");
  expect(face.position).toBe("absolute");
  expect(face.left).toBe(TAB_BAR_INSET);
  expect(face.right).toBe(TAB_BAR_INSET);
  expect(face.height).toBe(TAB_GLASS_HEIGHT);
  expect(face.bottom).toBe(tabGlassLift(34));
  expect(face.backgroundColor).toBe(glass.fill);
});

test("with a home indicator the band is as tall as the bar was: the pages keep their room", async () => {
  await bar("glass", 34);
  expect(styleOf("tab-bar").height).toBe(TAB_BAR_HEIGHT + 34);
  expect(tabBarBand(34)).toBe(TAB_BAR_HEIGHT + 34);
});

test("under the veiled glass the bar keeps its own band, the page's background: no page goes under it", async () => {
  await bar("glass", 34);
  const band = styleOf("tab-bar");
  expect(band.position).toBeUndefined();
  expect(band.backgroundColor).toBe(color.background);
  expect(screen.getByTestId("tab-bar").props.pointerEvents).toBeUndefined();
  expect(tabBarFloats()).toBe(false);
});

test("where the glass is the phone's own, the band floats over the pages with no face: they go on under it", async () => {
  mockGlassModule = REAL_GLASS;
  await bar("glass", 34);
  expect(tabBarFloats()).toBe(true);
  const band = styleOf("tab-bar");
  expect(band.position).toBe("absolute");
  expect(band.bottom).toBe(0);
  expect(band.left).toBe(0);
  expect(band.right).toBe(0);
  expect(band.height).toBe(tabBarBand(34));
  expect(band.backgroundColor).toBeUndefined();
  // Around the glass a touch goes to the page under it.
  expect(screen.getByTestId("tab-bar").props.pointerEvents).toBe("box-none");
});

test("there the bar is the real glass, regular and never tinted, where the veil was", async () => {
  mockGlassModule = REAL_GLASS;
  await bar("glass", 34);
  const piece = screen.getByTestId("tab-glass");
  expect(piece.props.glassEffectStyle).toBe("regular");
  expect(piece.props.tintColor).toBeUndefined();
  const face = styleOf("tab-glass");
  expect(face.backgroundColor).toBeUndefined();
  expect(face.left).toBe(TAB_BAR_INSET);
  expect(face.height).toBe(TAB_GLASS_HEIGHT);
  expect(face.bottom).toBe(tabGlassLift(34));
});

test("«Reduce Transparency» there too: the bar floats, opaque", async () => {
  mockGlassModule = REAL_GLASS;
  await bar("solid", 34);
  expect(styleOf("tab-bar").position).toBe("absolute");
  expect(screen.getByTestId("tab-glass").props.glassEffectStyle).toBeUndefined();
  expect(styleOf("tab-glass").backgroundColor).toBe(color.surface);
});

test("without a home indicator the glass still floats clear of the edge", async () => {
  await bar("glass", 0);
  expect(styleOf("tab-glass").bottom).toBe(space.sm);
  expect(styleOf("tab-bar").height).toBe(TAB_GLASS_HEIGHT + space.sm + space.xs);
  expect(tabBarBand(0)).toBe(TAB_GLASS_HEIGHT + space.sm + space.xs);
});

test("on the glass the capsule of the tab on screen is the text, faint, never yellow", async () => {
  await bar("glass");
  const capsule = styleOf("tab-capsule");
  expect(capsule.backgroundColor).toBe(glass.selected);
  expect(capsule.backgroundColor).not.toBe(color.accent);
});

test("«Reduce Transparency»: the glass is opaque and the capsule as before", async () => {
  await bar("solid");
  expect(styleOf("tab-glass").backgroundColor).toBe(color.surface);
  expect(styleOf("tab-capsule").backgroundColor).toBe(color.surfaceRaised);
});

test("«Increase Contrast»: opaque, with the strong edge", async () => {
  await bar("contrast");
  const shadows = styleOf("tab-glass").boxShadow as unknown as {
    inset?: boolean;
    color?: string;
  }[];
  expect(shadows.find((each) => each.inset)?.color).toBe(color.borderStrong);
});

test("the icons not on screen are the secondary text, 4.5:1 on the glass", async () => {
  await bar("glass");
  const off = StyleSheet.flatten(
    screen.getByTestId("tab-icon-off-Feed").props.style,
  ) as {
    tintColor?: string;
  };
  expect(off.tintColor).toBe(color.textMuted);
});

test("the capsules stand under the tabs of the glass, not of the screen", () => {
  const slot = (390 - 2 * TAB_BAR_INSET) / 4;
  expect(tabCapsuleX(0, 390, 4)).toBeCloseTo((slot - 64) / 2, 5);
  expect(tabCapsuleX(3, 390, 4) - tabCapsuleX(2, 390, 4)).toBeCloseTo(slot, 5);
});
