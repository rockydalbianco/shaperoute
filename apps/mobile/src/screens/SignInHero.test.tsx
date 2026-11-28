import { act, render, screen } from "@testing-library/react-native";
import { Animated, StyleSheet } from "react-native";

import { ShapeOutline } from "../game/ShapeOutline";
import { color, radius } from "../theme/tokens";
import { runAnimationsOnJs } from "../ui/animationsOnJs.testing";
import { HEART } from "../ui/outlines";
import { useReduceMotion } from "../ui/useReduceMotion";
import { SIGN_IN_DRAW_MS, SIGN_IN_HEART, SignInHero } from "./SignInHero";

// The yellow card over «Sign up» and «Log in» (TASK-523 part B).

jest.mock("../ui/useReduceMotion");
const reduceMotion = jest.mocked(useReduceMotion);

// The heart's strokes are the game's: here only what it is asked to draw.
jest.mock("../game/ShapeOutline", () => ({ ShapeOutline: jest.fn(() => null) }));
const outline = jest.mocked(ShapeOutline);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** How much of the heart the pen has drawn, as the outline was last told. */
function drawn(): number {
  const { draw } = outline.mock.calls[outline.mock.calls.length - 1][0];
  return (draw as unknown as { __getValue: () => number }).__getValue();
}

const card = () =>
  StyleSheet.flatten(
    screen.getByTestId("hero", { includeHiddenElements: true }).props.style,
  );

beforeEach(() => {
  jest.useFakeTimers();
  runAnimationsOnJs();
  outline.mockClear();
  reduceMotion.mockReturnValue(false);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("the card is the app's yellow, and the heart on it the dark of words on yellow", async () => {
  await render(<SignInHero testID="hero" />);
  expect(card()).toMatchObject({
    backgroundColor: color.accent,
    borderRadius: radius.card,
    overflow: "hidden",
  });
  expect(outline.mock.calls[0][0]).toMatchObject({
    outline: HEART,
    size: SIGN_IN_HEART,
    color: color.onAccent,
  });
  // The same in every tone: neither colour moves with it.
  expect(contrast(color.onAccent, color.accent)).toBeGreaterThanOrEqual(7);
});

test("the halo behind the heart is quieter than the heart", async () => {
  await render(<SignInHero testID="hero" />);
  const face = StyleSheet.flatten(
    screen.getByTestId("hero-halo", { includeHiddenElements: true }).props.style,
  ) as { backgroundColor: string };
  expect(face.backgroundColor).toMatch(/^#[0-9A-F]{6}$/);
  expect(face.backgroundColor).not.toBe(color.accent);
  expect(contrast(color.onAccent, face.backgroundColor)).toBeGreaterThanOrEqual(7);
});

test("the pen draws the heart once, and leaves it whole", async () => {
  const timing = jest.spyOn(Animated, "timing");
  await render(<SignInHero testID="hero" />);
  expect(drawn()).toBe(0);
  await act(() => jest.advanceTimersByTimeAsync(SIGN_IN_DRAW_MS / 2));
  expect(drawn()).toBeGreaterThan(0);
  expect(drawn()).toBeLessThan(1);
  await act(() => jest.advanceTimersByTimeAsync(SIGN_IN_DRAW_MS));
  expect(drawn()).toBe(1);
  await act(() => jest.advanceTimersByTimeAsync(5 * SIGN_IN_DRAW_MS));
  expect(drawn()).toBe(1);
  expect(timing).toHaveBeenCalledTimes(1);
  expect(timing.mock.calls[0][1]).toMatchObject({
    toValue: 1,
    duration: SIGN_IN_DRAW_MS,
    useNativeDriver: true,
  });
});

test("with «Reduce Motion» the heart is whole at once", async () => {
  reduceMotion.mockReturnValue(true);
  const timing = jest.spyOn(Animated, "timing");
  await render(<SignInHero testID="hero" />);
  expect(timing).not.toHaveBeenCalled();
  expect(drawn()).toBe(1);
});

test("it is a picture: screen readers pass it by", async () => {
  await render(<SignInHero testID="hero" />);
  expect(screen.queryByTestId("hero")).toBeNull();
  const hero = screen.getByTestId("hero", { includeHiddenElements: true });
  expect(hero.props.accessibilityElementsHidden).toBe(true);
  expect(hero.props.importantForAccessibility).toBe("no-hide-descendants");
});
