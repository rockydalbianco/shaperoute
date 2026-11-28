import { color, type Palette } from "../theme/tokens";

/**
 * How much of a section's colour is in the veil of its card (TASK-523,
 * ADR-0417): at 12 % the text and the secondary text keep 4.5:1 on the
 * veil and the colour itself 3:1, as its icon needs, in every tone at every
 * step; in the dark tone the colour keeps the 4.5:1 of words too
 * (`tint.test.ts`).
 */
export const TINT_SHARE = 0.12;

/** The least contrast at which a colour is read as words (WCAG 2, AA). */
export const INK_CONTRAST = 4.5;

const HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * `colour` laid over `under` as a veil, as the one opaque colour it makes
 * (TASK-523, ADR-0417): the face of a section's card, the square behind an
 * icon. Both are `#RRGGBB` tokens; `share` is how much of `colour` there is,
 * 0 to 1. Opaque, so a card with a veil hides what is behind it as any card
 * does, and its contrast can be measured.
 */
export function tintOver(colour: string, under: string, share = TINT_SHARE): string {
  if (!HEX.test(colour) || !HEX.test(under)) {
    throw new Error(`tintOver takes #RRGGBB colours, got ${colour} over ${under}`);
  }
  const part = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
  const channel = (at: number) =>
    Math.round(
      parseInt(colour.slice(at, at + 2), 16) * part +
        parseInt(under.slice(at, at + 2), 16) * (1 - part),
    )
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const c = parseInt(hex.slice(at, at + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG 2 contrast of two `#RRGGBB` colours, from 1 to 21. */
export function contrastOf(a: string, b: string): number {
  if (!HEX.test(a) || !HEX.test(b)) {
    throw new Error(`contrastOf takes #RRGGBB colours, got ${a} and ${b}`);
  }
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** What `inkOn` looks at of a tone: where words are written, and its sections. */
type Grounds = Pick<Palette, "background" | "surface" | "section">;

/**
 * The colour to write a section's words in (TASK-523, ADR-0417): `colour`
 * where the tone's sections read as words, `fallback` where they do not.
 * They do when every one of them, and `colour`, keeps `INK_CONTRAST` on the
 * page, on a card and on its own veil. All of them or none: a page never
 * has one group's name in its colour and the next in the text's. So in the
 * dark tone a group's name is in its colour, and in the light tone at its
 * brightest, where the sections are livelier (the user's choice of
 * 2026-11-27), in the text's.
 */
export function inkOn(
  colour: string,
  fallback: string,
  palette: Grounds = color,
): string {
  const reads = [...Object.values(palette.section), colour].every((ink) =>
    [palette.background, palette.surface, tintOver(ink, palette.surface)].every(
      (under) => contrastOf(ink, under) >= INK_CONTRAST,
    ),
  );
  return reads ? colour : fallback;
}
