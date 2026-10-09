/**
 * The tones and their brightness (TASK-263, ADR-0231): with no choice the
 * app keeps its colours of always, and every tone at every step keeps the
 * contrasts the dark one was built on (`docs/UI.md`, «Il tema»).
 */
import { BRIGHTNESS_STEPS, DEFAULT_TONE, type Tone, TONES } from "./tone";
import { color, type Palette, paletteOf, SHADES, statusBarStyle } from "./tokens";

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

test("with no choice the app has the colours it always had (ADR-0046)", () => {
  expect(color).toEqual({
    accent: "#FFD02B",
    onAccent: "#0A0A0B",
    background: "#0A0A0B",
    surface: "#141416",
    surfaceRaised: "#2B2B31",
    border: "#3D3D44",
    borderStrong: "#74747E",
    text: "#F5F5F4",
    textMuted: "#9B9B9F",
    textFaint: "#8A8A90",
    warning: "#FF7A59",
    error: "#FF6B6B",
    badge: "#E02D2D",
    onBadge: "#FFFFFF",
    startHere: "#4DD2FF",
    strava: "#FC5200",
    onStrava: "#FFFFFF",
    map: {
      background: "#0D0E10",
      water: "#101F29",
      waterLine: "#1D3C4E",
      green: "#121A13",
      builtUp: "#101012",
      building: "#17181B",
      roadFaint: "#1C1D21",
      roadMinor: "#26272C",
      roadMedium: "#303238",
      roadMajor: "#3A3D45",
      label: "#8A8A90",
      labelHalo: "#0D0E10",
    },
  });
  expect(statusBarStyle).toBe("light");
});

test("a tone's first and last steps are its darkest and its brightest", () => {
  for (const tone of TONES) {
    expect(at(tone, 0)).toMatchObject(SHADES[tone].darkest);
    expect(at(tone, BRIGHTNESS_STEPS - 1)).toMatchObject(SHADES[tone].brightest);
  }
});

test("each step is brighter than the one before", () => {
  for (const tone of TONES) {
    for (const step of STEPS.slice(1)) {
      const [before, now] = [at(tone, step - 1), at(tone, step)];
      expect(luminance(now.background)).toBeGreaterThan(luminance(before.background));
      expect(luminance(now.map.background)).toBeGreaterThan(
        luminance(before.map.background),
      );
    }
  }
});

test("the yellow, the badge and Strava's colours are the same in every tone", () => {
  for (const [, , palette] of EVERY) {
    expect(palette.accent).toBe(color.accent);
    expect(palette.onAccent).toBe(color.onAccent);
    expect(palette.badge).toBe(color.badge);
    expect(palette.onBadge).toBe(color.onBadge);
    expect(palette.strava).toBe(color.strava);
    expect(palette.onStrava).toBe(color.onStrava);
  }
});

test.each(EVERY)("%s at step %i keeps the contrasts", (_tone, _step, c) => {
  // The text, on everything it is written on.
  for (const under of [c.background, c.surface, c.surfaceRaised]) {
    expect(contrast(c.text, under)).toBeGreaterThanOrEqual(7);
  }
  // Labels and the faintest text, on the background and on a card.
  for (const text of [c.textMuted, c.textFaint, c.warning, c.error]) {
    for (const under of [c.background, c.surface]) {
      expect(contrast(text, under)).toBeGreaterThanOrEqual(4.5);
    }
  }
  // A control is seen as one (TASK-086): WCAG's 3:1 for its edge.
  expect(contrast(c.borderStrong, c.background)).toBeGreaterThanOrEqual(3);
  expect(contrast(c.borderStrong, c.surface)).toBeGreaterThanOrEqual(3);
  // The map: place names and «Start here».
  expect(contrast(c.map.label, c.map.labelHalo)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(c.startHere, c.map.background)).toBeGreaterThanOrEqual(3);
  // Text on yellow does not depend on the tone.
  expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(7);
});

test("the dark tone's yellow line reads on its map without a border", () => {
  for (const step of STEPS) {
    const c = at("dark", step);
    // WCAG's 3:1 for a graphic, on the lightest road it runs on.
    expect(contrast(c.accent, c.map.roadMajor)).toBeGreaterThanOrEqual(3);
  }
});
