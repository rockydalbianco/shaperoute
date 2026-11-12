import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text, type ViewStyle } from "react-native";

import { color, glass, radius } from "../theme/tokens";
import { Glass, glassStyle } from "./Glass";

// A piece of glass (TASK-469, ADR-0383): see-through with its rim of light,
// opaque with «Reduce Transparency», with a strong edge with «Increase
// Contrast»; never yellow.

jest.mock("./useGlassMode", () => ({
  ...jest.requireActual("./useGlassMode"),
  useGlassMode: () => "glass",
}));

type Shadow = {
  inset?: boolean;
  color?: string;
  offsetY: number;
  spreadDistance?: number;
};

function shadows(style: ViewStyle): Shadow[] {
  return style.boxShadow as unknown as Shadow[];
}

test("the glass is the veiled background, with a rim brighter on top and a shadow", () => {
  const style = glassStyle("glass");
  expect(style.backgroundColor).toBe(glass.fill);
  const all = shadows(style);
  expect(all.find((each) => !each.inset)?.color).toBe(glass.shadow);
  expect(all.find((each) => each.inset && each.spreadDistance === 1)?.color).toBe(
    glass.rim,
  );
  expect(all.find((each) => each.inset && each.offsetY === 1)?.color).toBe(
    glass.rimTop,
  );
});

test("«Reduce Transparency»: opaque surface with a thin edge", () => {
  const style = glassStyle("solid");
  expect(style.backgroundColor).toBe(color.surface);
  expect(shadows(style).find((each) => each.inset)?.color).toBe(color.border);
});

test("«Increase Contrast»: opaque surface with the strong edge of the controls", () => {
  const style = glassStyle("contrast");
  expect(style.backgroundColor).toBe(color.surface);
  expect(shadows(style).find((each) => each.inset)?.color).toBe(color.borderStrong);
});

test("no mode draws the glass in the route's yellow", () => {
  for (const mode of ["glass", "solid", "contrast"] as const) {
    const style = glassStyle(mode);
    const colours = [
      style.backgroundColor,
      ...shadows(style).map((each) => each.color),
    ];
    for (const each of colours) {
      expect(String(each).slice(0, 7).toUpperCase()).not.toBe(
        color.accent.toUpperCase(),
      );
    }
  }
});

test("a capsule unless told otherwise; it holds what it is given", async () => {
  await render(
    <Glass testID="glass">
      <Text>Inside</Text>
    </Glass>,
  );
  const style = StyleSheet.flatten(
    screen.getByTestId("glass").props.style,
  ) as ViewStyle;
  expect(style.borderRadius).toBe(radius.pill);
  expect(style.backgroundColor).toBe(glass.fill);
  expect(screen.getByText("Inside")).toBeTruthy();
});

test("a screen that knows the mode can set it, and the corners", async () => {
  await render(<Glass testID="glass" mode="contrast" corner={radius.xl} />);
  const style = StyleSheet.flatten(
    screen.getByTestId("glass").props.style,
  ) as ViewStyle;
  expect(style.borderRadius).toBe(radius.xl);
  expect(style.backgroundColor).toBe(color.surface);
});
