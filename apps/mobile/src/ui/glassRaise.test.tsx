import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";

import { CityPicker } from "../explore/ExploreTools";
import { FilterChip } from "../search/FilterChip";
import { color, glass, glassOf, paletteOf } from "../theme/tokens";
import { DEFAULT_TONE } from "../theme/tone";
import { glassRaise } from "./glassRaise";
import { type GlassMode, useGlassMode } from "./useGlassMode";

// The chips on glass (TASK-469 A4a, ADR-0383, the look «Capsula»): they
// stand out of the page as the pill of the segments — a line of light on
// top and a short shadow — and keep their colours, the yellow of a choice
// made included. With «Reduce Transparency» or «Increase Contrast» they are
// flat, as before.

jest.mock("./useGlassMode", () => ({
  ...jest.requireActual("./useGlassMode"),
  useGlassMode: jest.fn(),
}));
const glassMode = jest.mocked(useGlassMode);

type Shadow = {
  inset?: boolean;
  offsetY?: number;
  blurRadius?: number;
  color?: string;
};
type Face = ViewStyle & { boxShadow?: Shadow[] };

function faceOf(element: { props: { style?: unknown } }): Face {
  return StyleSheet.flatten(element.props.style as ViewStyle) as Face;
}

function chip(name: string): Face {
  return faceOf(screen.getByRole("button", { name }));
}

async function cities(mode: GlassMode) {
  glassMode.mockReturnValue(mode);
  await render(<CityPicker apiUrl={null} city={null} onCity={jest.fn()} />);
}

async function filters(mode: GlassMode) {
  glassMode.mockReturnValue(mode);
  await render(
    <>
      <FilterChip label="Run" selected onPress={jest.fn()} />
      <FilterChip label="Bike" selected={false} onPress={jest.fn()} />
    </>,
  );
}

test("on glass: a light line inside on top and a short shadow, nothing else", () => {
  const raise = glassRaise("glass");
  expect(raise.backgroundColor).toBeUndefined();
  const shadows = raise.boxShadow as unknown as Shadow[];
  const cast = shadows.find((each) => !each.inset);
  expect(cast?.color).toBe(glass.shadow);
  expect(cast?.offsetY).toBe(2);
  expect(cast?.blurRadius).toBeLessThanOrEqual(8);
  expect(shadows.find((each) => each.inset)?.color).toBe(glass.rimTop);
});

test.each(["solid", "contrast"] as const)("%s: nothing is added, flat", (mode) => {
  expect(glassRaise(mode)).toEqual({});
});

test("the cities of Explore stand out on glass and keep their faces", async () => {
  await cities("glass");
  const off = chip("New York");
  expect(off.backgroundColor).toBe(color.surfaceRaised);
  expect(off.borderColor).toBe(color.borderStrong);
  expect(off.boxShadow).toEqual(glassRaise("glass").boxShadow);
  // «Near me», on while no city is chosen: the text's colour, raised too.
  const on = chip("Near me");
  expect(on.backgroundColor).toBe(color.text);
  expect(on.boxShadow).toEqual(glassRaise("glass").boxShadow);
});

test("the cities are flat with «Reduce Transparency»", async () => {
  await cities("solid");
  expect(chip("New York").boxShadow).toBeUndefined();
  expect(chip("New York").backgroundColor).toBe(color.surfaceRaised);
});

test("the chips of the search stand out on glass; the one chosen stays yellow", async () => {
  await filters("glass");
  const on = chip("Run");
  const off = chip("Bike");
  expect(on.backgroundColor).toBe(color.accent);
  expect(off.backgroundColor).toBe(color.surface);
  expect(off.borderColor).toBe(color.borderStrong);
  for (const face of [on, off]) {
    expect(face.boxShadow).toEqual(glassRaise("glass").boxShadow);
  }
});

test("the chips of the search are flat with «Increase Contrast»", async () => {
  await filters("contrast");
  expect(chip("Run").boxShadow).toBeUndefined();
  expect(chip("Bike").boxShadow).toBeUndefined();
});

test("in the light tone the raise comes from the light glass, never yellow", () => {
  const choice = { ...DEFAULT_TONE, tone: "light" as const };
  const colors = glassOf(choice);
  const accent = paletteOf(choice).accent.toUpperCase();
  const shadows = glassRaise("glass", colors).boxShadow as unknown as Shadow[];
  expect(shadows.map((each) => each.color)).toEqual([colors.shadow, colors.rimTop]);
  for (const each of shadows) {
    expect(String(each.color).slice(0, 7).toUpperCase()).not.toBe(accent);
  }
});
