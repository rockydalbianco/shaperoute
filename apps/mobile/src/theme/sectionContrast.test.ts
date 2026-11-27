/**
 * Each section of the app has a colour of its own (TASK-523, ADR-0417): the
 * hero of its page, its rings and the icons of its cards. They must read in
 * every tone at every step of brightness. WCAG 2 contrast, from the tokens
 * themselves.
 */
import { BRIGHTNESS_STEPS, DEFAULT_TONE, type Tone, TONES } from "./tone";
import { type Palette, paletteOf } from "./tokens";

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

function sections(c: Palette): readonly string[] {
  return Object.values(c.section);
}

test("the app has five sections, in the order of its pages", () => {
  for (const [, , c] of EVERY) {
    expect(Object.keys(c.section)).toEqual([
      "draw",
      "profile",
      "explore",
      "feed",
      "messages",
    ]);
  }
});

test.each(EVERY)(
  "%s at step %i: a section's shapes read on the page and on the cards",
  (_tone, _step, c) => {
    // An icon, a ring, a square: a graphic needs 3:1.
    for (const section of sections(c)) {
      for (const under of [c.background, c.surface, c.surfaceRaised]) {
        expect(contrast(section, under)).toBeGreaterThanOrEqual(3);
      }
    }
  },
);

test.each(EVERY.filter(([tone]) => tone === "dark"))(
  "%s at step %i: a section's name reads in its colour",
  (_tone, _step, c) => {
    // In the dark tone a group's name is written in its colour: the 4.5:1
    // of words. The light tone writes it in the text's colour (`ui/tint`).
    for (const section of sections(c)) {
      for (const under of [c.background, c.surface, c.surfaceRaised]) {
        expect(contrast(section, under)).toBeGreaterThanOrEqual(4.5);
      }
    }
  },
);

test("the light tone at its brightest is livelier than the words' 4.5:1 allows", () => {
  // The user's choice of 2026-11-27, «Sì, più vivi»: were these to pass as
  // words on a card again, the light tone would be back to its dull colours.
  const c = at("light", BRIGHTNESS_STEPS - 1);
  for (const section of sections(c)) {
    expect(contrast(section, c.surface)).toBeLessThan(4.5);
  }
});

test.each(EVERY)("%s at step %i: a ring stands out on its track", (_tone, _step, c) => {
  // The part of a ring not yet filled is `border`.
  for (const section of sections(c)) {
    expect(contrast(section, c.border)).toBeGreaterThanOrEqual(3);
  }
});

test.each(EVERY)("%s at step %i: no section is another one", (_tone, _step, c) => {
  expect(new Set(sections(c)).size).toBe(5);
});

test.each(EVERY)(
  "%s at step %i: the yellow, the warning and the calories stay themselves",
  (_tone, _step, c) => {
    // The route is yellow, a warning is coral and the calories are red: no
    // section takes one of them, «Draw» least of all, where all three show.
    for (const section of sections(c)) {
      expect([c.accent, c.warning, c.error, c.energy]).not.toContain(section);
    }
  },
);

test.each(EVERY.filter(([tone]) => tone === "dark"))(
  "%s at step %i: a section that shares a hue has that hue's value",
  (_tone, _step, c) => {
    // One violet, one light blue and one green in the dark tone, each under
    // the name of what it means where it is used. In the light tone the
    // sections are livelier than the colours written as words can be.
    expect(c.section.profile).toBe(c.stretch.moments);
    expect(c.section.explore).toBe(c.stretch.sports);
    expect(c.section.messages).toBe(c.food);
  },
);
