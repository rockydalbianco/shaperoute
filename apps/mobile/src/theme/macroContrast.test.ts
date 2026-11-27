/**
 * Protein, carbohydrates and fat have a colour each in «Nutrition»
 * (TASK-489 part L, ADR-0397): the rings of a recipe and the bars of the
 * diary. The recipes' cards have a tint each. They must read in every tone
 * at every step of brightness. WCAG 2 contrast, from the tokens themselves.
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

function macros(c: Palette): readonly string[] {
  return [c.protein, c.carbs, c.fat];
}

test.each(EVERY)("%s at step %i: the three read on the cards", (_tone, _step, c) => {
  // A graphic needs 3:1; the three keep the 4.5:1 of text, like the green.
  for (const macro of macros(c)) {
    for (const under of [c.background, c.surface, c.surfaceRaised]) {
      expect(contrast(macro, under)).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test.each(EVERY)("%s at step %i: a ring stands out on its track", (_tone, _step, c) => {
  // The part of a ring not yet filled, and a bar's track, are `border`.
  for (const macro of macros(c)) {
    expect(contrast(macro, c.border)).toBeGreaterThanOrEqual(3);
  }
});

test.each(EVERY)("%s at step %i: each colour has one meaning", (_tone, _step, c) => {
  // Neither the route's yellow, nor the calories' red, nor the green of
  // what was eaten; and the three are not one another.
  for (const macro of macros(c)) {
    expect([c.accent, c.energy, c.food]).not.toContain(macro);
  }
  expect(new Set(macros(c)).size).toBe(3);
});

test.each(EVERY)("%s at step %i: the text reads on every cover", (_tone, _step, c) => {
  const tints = Object.values(c.dish);
  expect(tints).toHaveLength(6);
  expect(new Set(tints).size).toBe(tints.length);
  for (const tint of tints) {
    expect(contrast(c.text, tint)).toBeGreaterThanOrEqual(4.5);
  }
});

test("with no choice they are the dark tone's at its darkest", () => {
  expect([color.protein, color.carbs, color.fat]).toEqual([
    "#6FA8FF",
    "#B892FF",
    "#FF8AC4",
  ]);
  expect(color.dish.amber).toBe("#5A3D0C");
});

test("the contrast is the WCAG one", () => {
  expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  expect(contrast(color.protein, color.protein)).toBeCloseTo(1, 5);
});
