/**
 * The glass of the Liquid Glass look (TASK-469, ADR-0383): with no blur,
 * what lies under it shows through as it is, so the text and the
 * secondary text on it must keep 4.5:1 over anything — a white or black
 * photo of the Feed, every colour of the map — in every tone, at every step.
 */
import { BRIGHTNESS_STEPS, DEFAULT_TONE, type Tone, TONES } from "./tone";
import { GLASS_VEIL, glass, glassOf, paletteOf } from "./tokens";

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

/** `#RRGGBBAA` laid over the opaque `under`. */
function over(fill: string, under: string): string {
  const alpha = parseInt(fill.slice(7, 9), 16) / 255;
  const channel = (at: number) =>
    Math.round(
      parseInt(fill.slice(at, at + 2), 16) * alpha +
        parseInt(under.slice(at, at + 2), 16) * (1 - alpha),
    )
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

const STEPS = Array.from({ length: BRIGHTNESS_STEPS }, (_, step) => step);
const EVERY = TONES.flatMap((tone) =>
  STEPS.map((step) => [tone, step, { ...DEFAULT_TONE, tone, [tone]: step }] as const),
);

/** What can lie under the bar: a photo's whitest and blackest, and the map. */
function undersOf(tone: Tone, step: number): [string, string][] {
  const map = paletteOf({ ...DEFAULT_TONE, tone, [tone]: step }).map;
  return [
    ["a white photo", "#FFFFFF"],
    ["a black photo", "#000000"],
    ...Object.entries(map).map(([name, hex]): [string, string] => [
      `the map's ${name}`,
      hex,
    ]),
  ];
}

test("with no choice the glass is the dark background at 88 %", () => {
  expect(glass.veil).toBe(GLASS_VEIL);
  expect(glass.fill).toBe("#0B0A08E0");
  expect(glass.tint).toBe("#0B0A08");
});

test.each(EVERY)(
  "%s at step %d: text and secondary text keep 4.5:1 on the glass over anything",
  (tone, step, choice) => {
    const palette = paletteOf(choice);
    const face = glassOf(choice).fill;
    for (const [, under] of undersOf(tone, step)) {
      const seen = over(face, under);
      expect(contrast(palette.text, seen)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.textMuted, seen)).toBeGreaterThanOrEqual(4.5);
    }
  },
);

test.each(EVERY)("%s at step %d: the glass is never yellow", (_tone, _step, choice) => {
  const accent = paletteOf(choice).accent.toUpperCase();
  for (const value of Object.values(glassOf(choice))) {
    if (typeof value === "string") {
      expect(value.slice(0, 7).toUpperCase()).not.toBe(accent);
    }
  }
});

test.each(EVERY)(
  "%s at step %d: every glass colour is #RRGGBB or #RRGGBBAA",
  (_t, _s, choice) => {
    for (const value of Object.values(glassOf(choice))) {
      if (typeof value === "string") {
        expect(value).toMatch(/^#[0-9A-F]{6}([0-9A-F]{2})?$/);
      }
    }
  },
);
