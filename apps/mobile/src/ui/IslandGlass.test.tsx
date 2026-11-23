import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { color, glass, glassOf, tone } from "../theme/tokens";
import { islandFace } from "./Island";
import { type GlassMode, useGlassMode } from "./useGlassMode";
import { useIsland } from "./useIsland";

// The island in the glass look (TASK-469 A7b, ADR-0383, «Capsula»): dark
// glass — the rims of the dark tone's glass and a short shadow — over the
// same dark face, so its words keep their contrast. «Reduce Transparency»
// and «Increase Contrast» keep the dark capsule as before.

jest.mock("./useGlassMode", () => ({
  ...jest.requireActual("./useGlassMode"),
  useGlassMode: jest.fn(),
}));

type Shadow = { inset?: boolean; offsetY?: number; color?: string };
type Face = ViewStyle & { boxShadow?: Shadow[] };

const DARK = glassOf({ ...tone, tone: "dark" });

test("on glass: the rims of the dark glass, in every tone, and a short shadow", () => {
  const face = islandFace("glass") as Face;
  const inside = (face.boxShadow ?? []).filter((each) => each.inset);
  expect(inside.map((each) => each.color)).toEqual([DARK.rim, DARK.rimTop]);
  const cast = (face.boxShadow ?? []).filter((each) => !each.inset);
  expect(cast.map((each) => each.color)).toEqual([glass.shadow]);
  expect(cast[0].offsetY).toBeGreaterThan(0);
  // The light tone's rims are the same island: never its dark edge.
  const light = glassOf({ ...tone, tone: "light" });
  expect(islandFace("glass", DARK).boxShadow).toEqual(face.boxShadow);
  expect(inside.map((each) => each.color)).not.toContain(light.rim);
  // Never yellow, and no new face.
  expect(face.backgroundColor).toBeUndefined();
  expect((face.boxShadow ?? []).map((each) => each.color)).not.toContain(color.accent);
});

test.each(["solid", "contrast"] as const)("%s: the dark capsule as before", (mode) => {
  expect(islandFace(mode)).toEqual({});
});

function Screen() {
  const [island, say] = useIsland();
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={() => say("Sent to Ada_runs.")}>
        <Text>Send to Ada</Text>
      </Pressable>
      {island}
    </View>
  );
}

describe.each(["glass", "solid", "contrast"] as const)("%s", (mode: GlassMode) => {
  test("the island wears its face over the dark capsule", async () => {
    jest.mocked(useGlassMode).mockReturnValue(mode);
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <Screen />
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Send to Ada" }));
    const style = StyleSheet.flatten(screen.getByTestId("island").props.style) as Face;
    expect(style.backgroundColor).toBe(color.scrim);
    expect(style.boxShadow).toEqual((islandFace(mode) as Face).boxShadow);
    const words = StyleSheet.flatten(
      screen.getByTestId("island-words").props.style,
    ) as {
      color?: string;
    };
    expect(words.color).toBe(color.onScrim);
  });
});
