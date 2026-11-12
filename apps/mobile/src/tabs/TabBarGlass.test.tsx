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
});

test("without a home indicator the glass still floats clear of the edge", async () => {
  await bar("glass", 0);
  expect(styleOf("tab-glass").bottom).toBe(space.sm);
  expect(styleOf("tab-bar").height).toBe(TAB_GLASS_HEIGHT + space.sm + space.xs);
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
