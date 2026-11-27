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

test("with no choice the app is dark at its darkest (ADR-0046), warm (ADR-0293)", () => {
  expect(color).toEqual({
    accent: "#FFD02B",
    onAccent: "#0B0A08",
    background: "#0B0A08",
    surface: "#161411",
    surfaceRaised: "#2C2924",
    border: "#3D3934",
    borderStrong: "#7B746B",
    text: "#F6F3EC",
    textMuted: "#A49D93",
    textFaint: "#908980",
    warning: "#FF7A59",
    error: "#FF6B6B",
    energy: "#FF6363",
    badge: "#E02D2D",
    onBadge: "#FFFFFF",
    energyOnAccent: "#8F1216",
    energyOnScrim: "#FF6363",
    // The tour's dark and the edge of its light (TASK-266).
    scrim: "#0B0A08",
    onScrim: "#FFFFFF",
    startHere: "#4DD2FF",
    you: "#3D9BFF",
    north: "#FF5B4F",
    runDay: "#4DD2FF",
    muscle: "#FF6FB5",
    food: "#4FD08A",
    protein: "#6FA8FF",
    carbs: "#B892FF",
    fat: "#FF8AC4",
    dish: {
      amber: "#5A3D0C",
      tomato: "#5E2218",
      leaf: "#21401F",
      sea: "#143A4A",
      plum: "#40214F",
      sand: "#4A3F2C",
    },
    stretch: {
      body: "#FF8A5C",
      moments: "#A99BFF",
      sports: "#4DD2FF",
      intimacy: "#FF6FB5",
      more: "#4FD08A",
    },
    strava: "#FC5200",
    onStrava: "#FFFFFF",
    ski: { descent: "#FFD02B", lift: "#FF5A4E", onLine: "#0B0A08" },
    // The text at 20 %, for the thin divisions (TASK-339).
    hairline: "#F6F3EC33",
    map: {
      background: "#100F0C",
      water: "#101F29",
      waterLine: "#1D3C4E",
      green: "#141A12",
      builtUp: "#131210",
      building: "#1A1915",
      roadFaint: "#1F1D19",
      roadMinor: "#292722",
      roadMedium: "#34312B",
      roadMajor: "#3F3B34",
      label: "#908980",
      labelHalo: "#100F0C",
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
  // The calories in red (TASK-424 part C3), on everything they are shown on.
  for (const under of [c.background, c.surface, c.surfaceRaised]) {
    expect(contrast(c.energy, under)).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast(c.energyOnAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(c.energyOnScrim, c.scrim)).toBeGreaterThanOrEqual(4.5);
  // A control is seen as one (TASK-086): WCAG's 3:1 for its edge.
  expect(contrast(c.borderStrong, c.background)).toBeGreaterThanOrEqual(3);
  expect(contrast(c.borderStrong, c.surface)).toBeGreaterThanOrEqual(3);
  // The map: place names and «Start here».
  expect(contrast(c.map.label, c.map.labelHalo)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(c.startHere, c.map.background)).toBeGreaterThanOrEqual(3);
  // The runner's ring and cone on the map, the north tip on its button and
  // the line under the page open (TASK-431).
  expect(contrast(c.you, c.map.background)).toBeGreaterThanOrEqual(3);
  expect(contrast(c.you, c.background)).toBeGreaterThanOrEqual(3);
  expect(contrast(c.north, c.surfaceRaised)).toBeGreaterThanOrEqual(3);
  // The «RUN» mark of a run day, bold, on a card and on its chip (TASK-433 C).
  for (const under of [c.surface, c.surfaceRaised]) {
    expect(contrast(c.runDay, under)).toBeGreaterThanOrEqual(3);
  }
  // A muscle lit on the body of an exercise, a graphic (TASK-465).
  for (const under of [c.background, c.surface, c.surfaceRaised]) {
    expect(contrast(c.muscle, under)).toBeGreaterThanOrEqual(3);
  }
  // The five groups of the stretching home (TASK-520): a group's name and
  // its icon are in its colour, so each keeps the 4.5:1 of text.
  for (const group of Object.values(c.stretch)) {
    for (const under of [c.background, c.surface, c.surfaceRaised]) {
      expect(contrast(group, under)).toBeGreaterThanOrEqual(4.5);
    }
  }
  // Text on yellow does not depend on the tone.
  expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(7);
});

test("the stretching groups have five colours, none of them the yellow", () => {
  for (const [, , palette] of EVERY) {
    const groups = Object.values(palette.stretch);
    expect(Object.keys(palette.stretch)).toEqual([
      "body",
      "moments",
      "sports",
      "intimacy",
      "more",
    ]);
    expect(new Set(groups).size).toBe(5);
    expect(groups).not.toContain(palette.accent);
  }
});

test("the dark tone's yellow line reads on its map without a border", () => {
  for (const step of STEPS) {
    const c = at("dark", step);
    // WCAG's 3:1 for a graphic, on the lightest road it runs on.
    expect(contrast(c.accent, c.map.roadMajor)).toBeGreaterThanOrEqual(3);
  }
});
