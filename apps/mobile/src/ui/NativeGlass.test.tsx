import { render, screen } from "@testing-library/react-native";
import { requireOptionalNativeModule } from "expo";
import { Platform, StyleSheet, Text, type ViewStyle } from "react-native";

import { color, glass, tone } from "../theme/tokens";
import { glassStyle } from "./Glass";
import { NativeGlass, nativeGlassAvailable, nativeGlassView } from "./NativeGlass";
import { useGlassMode } from "./useGlassMode";

// The real Liquid Glass (TASK-469 part B, ADR-0383): drawn only on an
// iPhone whose app was built with expo-glass-effect and has the API; the
// veiled glass of part A everywhere else, and never an error.

jest.mock("expo", () => ({ requireOptionalNativeModule: jest.fn() }));
jest.mock("./useGlassMode", () => ({
  ...jest.requireActual("./useGlassMode"),
  useGlassMode: jest.fn(),
}));

// The package's own module: it runs when the package is first loaded, so
// the tests of the phones without the glass come first in this file and
// see that it never was.
const mockLoaded = jest.fn();
jest.mock("expo-glass-effect", () => {
  mockLoaded();
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    GlassView: (props: Record<string, unknown>) => <View {...props} />,
  };
});

const native = requireOptionalNativeModule as jest.Mock;
const HAS_GLASS = { isGlassEffectAPIAvailable: true, isLiquidGlassAvailable: true };
const realOS = Platform.OS;

function on(os: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

beforeEach(() => {
  jest.clearAllMocks();
  on("ios");
  jest.mocked(useGlassMode).mockReturnValue("glass");
});

afterAll(() => on(realOS));

function piece() {
  return screen.getByTestId("piece");
}

function face(): ViewStyle {
  return StyleSheet.flatten(piece().props.style) as ViewStyle;
}

async function draw(mode?: "glass" | "solid" | "contrast") {
  await render(
    <NativeGlass testID="piece" corner={20} mode={mode}>
      <Text>Feed</Text>
    </NativeGlass>,
  );
}

test("an app built without expo-glass-effect draws the veil, and never loads it", async () => {
  native.mockReturnValue(null);
  expect(nativeGlassAvailable()).toBe(false);
  expect(nativeGlassView()).toBeNull();
  await draw();
  expect(mockLoaded).not.toHaveBeenCalled();
  expect(piece().props.glassEffectStyle).toBeUndefined();
  expect(face()).toMatchObject({ ...glassStyle("glass"), borderRadius: 20 });
  expect(screen.getByText("Feed")).toBeOnTheScreen();
});

test("a native module that throws when asked is the veil too", async () => {
  native.mockImplementation(() => {
    throw new Error("no such module");
  });
  expect(nativeGlassAvailable()).toBe(false);
  await draw();
  expect(face().backgroundColor).toBe(glass.fill);
});

test.each([
  [
    "an iOS 26 beta without the API",
    { ...HAS_GLASS, isGlassEffectAPIAvailable: false },
  ],
  [
    "an iPhone before iOS 26, or an app not on the new design",
    { ...HAS_GLASS, isLiquidGlassAvailable: false },
  ],
  ["a module that says nothing", {}],
])("%s: the veil", async (_name, module) => {
  native.mockReturnValue(module);
  expect(nativeGlassAvailable()).toBe(false);
  await draw();
  expect(mockLoaded).not.toHaveBeenCalled();
  expect(piece().props.glassEffectStyle).toBeUndefined();
  expect(face().backgroundColor).toBe(glass.fill);
});

test("Android never asks: the veil", async () => {
  on("android");
  native.mockReturnValue(HAS_GLASS);
  expect(nativeGlassAvailable()).toBe(false);
  await draw();
  expect(native).not.toHaveBeenCalled();
  expect(mockLoaded).not.toHaveBeenCalled();
  expect(face().backgroundColor).toBe(glass.fill);
});

test("where the phone has it: the real glass, regular, in the app's tone, with the corners asked", async () => {
  native.mockReturnValue(HAS_GLASS);
  expect(nativeGlassAvailable()).toBe(true);
  await draw();
  expect(native).toHaveBeenCalledWith("ExpoGlassEffect");
  expect(piece().props.glassEffectStyle).toBe("regular");
  expect(piece().props.colorScheme).toBe(tone.tone);
  // Tinted with the tone's own background, so what stands on it stays
  // readable over anything; never the yellow, which is the route's.
  expect(piece().props.tintColor).toBe(glass.realTint);
  expect(piece().props.tintColor).not.toBe(color.accent);
  expect(face().borderRadius).toBe(20);
  // The glass is the phone's: no veil of ours under it.
  expect(face().backgroundColor).toBeUndefined();
  expect(screen.getByText("Feed")).toBeOnTheScreen();
});

test.each([
  ["solid", color.border],
  ["contrast", color.borderStrong],
] as const)(
  "«Reduce Transparency» and «Increase Contrast» stay opaque even with the glass there: %s",
  async (mode, edge) => {
    native.mockReturnValue(HAS_GLASS);
    jest.mocked(useGlassMode).mockReturnValue(mode);
    await draw();
    expect(piece().props.glassEffectStyle).toBeUndefined();
    expect(face().backgroundColor).toBe(color.surface);
    expect(JSON.stringify(face().boxShadow)).toContain(edge);
  },
);

test("a screen that knows the mode decides, over the phone's", async () => {
  native.mockReturnValue(HAS_GLASS);
  await draw("solid");
  expect(piece().props.glassEffectStyle).toBeUndefined();
  expect(face().backgroundColor).toBe(color.surface);
});
