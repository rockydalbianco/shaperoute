import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ImageStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SkiTabIcon } from "../skimode/SkiTabIcon";
import { color } from "../theme/tokens";
import { TrainingTabIcon } from "../trainingmode/TrainingTabIcon";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";
import { type BarTab, TabBar } from "./TabBar";

// The icons the ski and training modes draw for their tabs follow the bar's
// rule on the phone's real glass (TASK-469): the icon not on screen is in
// the full text colour, since the faint one does not keep 4.5:1 there.

jest.mock("../haptics/haptics", () => ({ selectionFeel: jest.fn() }));
jest.mock("../ui/useGlassMode", () => ({
  ...jest.requireActual("../ui/useGlassMode"),
  useGlassMode: jest.fn(),
}));
const glassMode = jest.mocked(useGlassMode);

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
  {
    title: "Today",
    label: "Today",
    face: (selected) => <SkiTabIcon name="today" selected={selected} />,
  },
  {
    title: "Days",
    label: "Days",
    face: (selected) => <SkiTabIcon name="days" selected={selected} />,
  },
  {
    title: "Gym",
    label: "Gym",
    face: (selected) => <TrainingTabIcon name="today" selected={selected} />,
  },
];

async function bar(mode: GlassMode) {
  glassMode.mockReturnValue(mode);
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <TabBar tabs={TABS} page={2} onTab={() => {}} />
    </SafeAreaProvider>,
  );
}

function tintOf(testID: string): ImageStyle["tintColor"] {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) as ImageStyle)
    .tintColor;
}

test("on the real glass, the faces' icons not on screen are in the full text colour", async () => {
  mockGlassModule = REAL_GLASS;
  await bar("glass");
  expect(tintOf("ski-tab-today-off")).toBe(color.text);
  expect(tintOf("training-tab-today-off")).toBe(color.text);
  expect(tintOf("ski-tab-days-on")).toBe(color.text);
});

test("without the real glass they stay faint, as before", async () => {
  await bar("glass");
  expect(tintOf("ski-tab-today-off")).toBe(color.textFaint);
  expect(tintOf("training-tab-today-off")).toBe(color.textFaint);
  expect(tintOf("ski-tab-days-on")).toBe(color.text);
});

test("with «Reduce Transparency» or «Increase Contrast» the opaque bar keeps them faint", async () => {
  mockGlassModule = REAL_GLASS;
  for (const mode of ["solid", "contrast"] as const) {
    await bar(mode);
    expect(tintOf("ski-tab-today-off")).toBe(color.textFaint);
    expect(tintOf("training-tab-today-off")).toBe(color.textFaint);
    screen.unmount();
  }
});
