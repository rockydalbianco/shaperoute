/**
 * The veil of a section's card (TASK-523, ADR-0417): the section's colour at
 * `TINT_SHARE` over the card. What is written on it must read in every tone
 * at every step of brightness. WCAG 2 contrast, from the tokens themselves.
 */
import { type Palette, paletteOf } from "../theme/tokens";
import { BRIGHTNESS_STEPS, DEFAULT_TONE, type Tone, TONES } from "../theme/tone";
import { TINT_SHARE, tintOver } from "./tint";

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

test("a veil is the two colours mixed, opaque", () => {
  expect(TINT_SHARE).toBe(0.12);
  expect(tintOver("#FFFFFF", "#000000", 0)).toBe("#000000");
  expect(tintOver("#FFFFFF", "#000000", 1)).toBe("#FFFFFF");
  expect(tintOver("#FFFFFF", "#000000", 0.5)).toBe("#808080");
  expect(tintOver("#ff0000", "#0000ff", 0.5)).toBe("#800080");
  expect(tintOver("#F5A066", "#161411")).toBe("#31251B");
});

test("a share is kept between none of the colour and all of it", () => {
  expect(tintOver("#FFFFFF", "#000000", -2)).toBe("#000000");
  expect(tintOver("#FFFFFF", "#000000", 7)).toBe("#FFFFFF");
  expect(tintOver("#FFFFFF", "#000000", Number.NaN)).toBe("#000000");
});

test("only the tokens' own form is taken", () => {
  expect(() => tintOver("#FFF", "#000000")).toThrow("#RRGGBB");
  expect(() => tintOver("#FFFFFF", "#00000088")).toThrow("#RRGGBB");
  expect(() => tintOver("red", "#000000")).toThrow("#RRGGBB");
});

test.each(EVERY)(
  "%s at step %i: what is written on a section's veil reads",
  (_tone, _step, c) => {
    for (const section of Object.values(c.section)) {
      const veil = tintOver(section, c.surface);
      expect(veil).toMatch(/^#[0-9A-F]{6}$/);
      // The words on the card, and the section's own colour for its name
      // and its icon.
      expect(contrast(c.text, veil)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.textMuted, veil)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(section, veil)).toBeGreaterThanOrEqual(4.5);
    }
  },
);

test.each(EVERY)(
  "%s at step %i: a veil is seen as its section's, not as a plain card",
  (_tone, _step, c) => {
    for (const section of Object.values(c.section)) {
      expect(tintOver(section, c.surface)).not.toBe(c.surface);
    }
  },
);
