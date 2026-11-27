/**
 * What was eaten in «Nutrition» is green (`food`, TASK-489 part H, the
 * user's choice of 2026-11-26: «rosso e verde»): a ring, the columns of the
 * week and a dot beside its number, next to the calories' red of what the
 * body used. It must read on the cards it is drawn on, in every tone at
 * every step of brightness. WCAG 2 contrast, from the tokens themselves.
 */
import { BRIGHTNESS_STEPS, DEFAULT_TONE, type Tone, TONES } from "./tone";
import { color, type Palette, paletteOf } from "./tokens";

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

const STEPS = Array.from({ length: BRIGHTNESS_STEPS }, (_, step) => step);

function at(tone: Tone, step: number): Palette {
  return paletteOf({ ...DEFAULT_TONE, tone, [tone]: step });
}

const EVERY = TONES.flatMap((tone) =>
  STEPS.map((step) => [tone, step, at(tone, step)] as const),
);

test.each(EVERY)("%s at step %i: the green reads on the cards", (_tone, _step, c) => {
  // A graphic needs 3:1; the green keeps the 4.5:1 of text, like the red.
  for (const under of [c.background, c.surface, c.surfaceRaised]) {
    expect(contrast(c.food, under)).toBeGreaterThanOrEqual(4.5);
  }
});

test.each(EVERY)("%s at step %i: a ring stands out on its track", (_tone, _step, c) => {
  // The part of a ring not yet filled is drawn in `border`.
  expect(contrast(c.food, c.border)).toBeGreaterThanOrEqual(3);
  expect(contrast(c.energy, c.border)).toBeGreaterThanOrEqual(3);
});

test.each(EVERY)("%s at step %i: the green is no other colour's", (_tone, _step, c) => {
  // Neither the calories' red nor the route's yellow, each with one meaning.
  expect(c.food).not.toBe(c.energy);
  expect(c.food).not.toBe(c.accent);
});

test("with no choice it is the green of the dark tone at its darkest", () => {
  expect(color.food).toBe("#4FD08A");
});

test("the contrast is the WCAG one", () => {
  expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  expect(contrast(color.food, color.food)).toBeCloseTo(1, 5);
});
