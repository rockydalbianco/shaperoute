import { fireEvent, render, screen } from "@testing-library/react-native";
import { ScrollView, StyleSheet, Text, type ViewStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { color, tone } from "../theme/tokens";
import { useGlassMode } from "../ui/useGlassMode";
import { useReduceMotion } from "../ui/useReduceMotion";
import { appHeaderHeight, BAND_FADE_MS, headerFloats } from "./AppHeader";
import { useHeaderScroll, useUnderHeader } from "./headerScroll";
import { type ShellPage, TabShell } from "./TabShell";

// Where the phone draws the real glass, the header floats over the pages
// (TASK-469 B3, ADR-0383): its band is the phone's own glass once the page
// has scrolled, and a page's scroller lets what scrolls up show behind it.
// Each page still starts under the header, laid out as before. Everywhere
// else the header keeps its place over the pages, with the band of part A.

jest.mock("../haptics/haptics", () => ({ selectionFeel: jest.fn() }));
jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: jest.fn() }));
jest.mock("../ui/useGlassMode", () => ({
  ...jest.requireActual("../ui/useGlassMode"),
  useGlassMode: jest.fn(),
}));

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
  jest.mocked(useReduceMotion).mockReturnValue(false);
  jest.mocked(useGlassMode).mockReturnValue("glass");
});

function Page() {
  return (
    <ScrollView
      testID="scroller"
      {...useHeaderScroll()}
      style={[styles.page, useUnderHeader()]}
    >
      <Text>Feed</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ page: { flex: 1 } });

async function shell() {
  const pages: ShellPage[] = [
    { title: "Feed", label: "Feed", icon: "house", render: () => <Page /> },
    { title: "Draw", label: "Draw", icon: "pencil", render: () => <Text>Draw</Text> },
  ];
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <TabShell pages={pages} page={0} onPage={() => {}} />
    </SafeAreaProvider>,
  );
}

function styleOf(testID: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as ViewStyle;
}

function scrollTo(y: number) {
  return { nativeEvent: { contentOffset: { x: 0, y } } };
}

test("under the veiled glass the header keeps its place over the pages, as before", async () => {
  await shell();
  expect(headerFloats()).toBe(false);
  expect(styleOf("app-header").position).toBeUndefined();
  expect(styleOf("tab-page-Feed").top).toBe(0);
  // The band of part A, shown by its opacity.
  expect(styleOf("header-band").opacity).toBe(0);
  expect(screen.getByTestId("header-band").props.glassEffectStyle).toBeUndefined();
  // And a page's scroller cuts at its edge.
  expect(styleOf("scroller").overflow).toBeUndefined();
});

test("where the glass is the phone's own, the header floats over the pages", async () => {
  mockGlassModule = REAL_GLASS;
  await shell();
  expect(headerFloats()).toBe(true);
  const header = styleOf("app-header");
  expect(header.position).toBe("absolute");
  expect(header.top).toBe(0);
  expect(header.left).toBe(0);
  expect(header.right).toBe(0);
  // Over the pages, as it was: its buttons take the finger.
  expect(header.zIndex).toBe(1);
});

test("each page still starts under the floating header: laid out as before", async () => {
  mockGlassModule = REAL_GLASS;
  await shell();
  expect(styleOf("tab-page-Feed").top).toBe(appHeaderHeight(47));
  // Measured, the header's real height.
  await fireEvent(screen.getByTestId("app-header"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 104 } },
  });
  expect(styleOf("tab-page-Feed").top).toBe(104);
});

test("a page's scroller that asks lets what scrolls up show behind the header", async () => {
  mockGlassModule = REAL_GLASS;
  await shell();
  expect(styleOf("scroller").overflow).toBe("visible");
});

test("the band is the phone's glass, off at the top of a page and on once it scrolls", async () => {
  mockGlassModule = REAL_GLASS;
  await shell();
  const band = () => screen.getByTestId("header-band");
  expect(band().props.glassEffectStyle).toEqual({
    style: "none",
    animate: true,
    animationDuration: BAND_FADE_MS / 1000,
  });
  // Never by opacity: at 0 the phone stops drawing the glass.
  expect(styleOf("header-band").opacity).toBeUndefined();
  expect(styleOf("header-band").backgroundColor).toBeUndefined();
  // In the app's tone, never tinted, never in the way of a touch.
  expect(band().props.colorScheme).toBe(tone.tone);
  expect(band().props.tintColor).toBeUndefined();
  expect(band().props.pointerEvents).toBe("none");
  await fireEvent.scroll(screen.getByTestId("scroller"), scrollTo(200));
  expect(band().props.glassEffectStyle).toMatchObject({ style: "regular" });
  await fireEvent.scroll(screen.getByTestId("scroller"), scrollTo(0));
  expect(band().props.glassEffectStyle).toMatchObject({ style: "none" });
});

test("«Reduce Motion»: the glass comes and goes at once", async () => {
  mockGlassModule = REAL_GLASS;
  jest.mocked(useReduceMotion).mockReturnValue(true);
  await shell();
  expect(screen.getByTestId("header-band").props.glassEffectStyle).toMatchObject({
    animate: false,
  });
});

test.each(["solid", "contrast"] as const)(
  "%s: the header floats with the opaque band of part A, no glass of the phone's",
  async (mode) => {
    mockGlassModule = REAL_GLASS;
    jest.mocked(useGlassMode).mockReturnValue(mode);
    jest.mocked(useReduceMotion).mockReturnValue(true);
    await shell();
    expect(styleOf("app-header").position).toBe("absolute");
    expect(screen.getByTestId("header-band").props.glassEffectStyle).toBeUndefined();
    expect(styleOf("header-band").backgroundColor).toBe(color.background);
    expect(styleOf("header-band").opacity).toBe(0);
    await fireEvent.scroll(screen.getByTestId("scroller"), scrollTo(200));
    expect(styleOf("header-band").opacity).toBe(1);
  },
);
